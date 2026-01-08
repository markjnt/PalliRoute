from datetime import date, timedelta, datetime
from typing import List, Dict, Optional, Tuple
from app import db
from app.models.employee import Employee
from app.models.oncall_assignment import OnCallAssignment, DutyType
from calendar import monthrange


class AutoPlanningService:
    """Service for automatic planning of RB and AW assignments"""
    
    # Duty types mapping
    RB_NURSING_WEEKDAY = 'rb_nursing_weekday'
    RB_NURSING_WEEKEND_DAY = 'rb_nursing_weekend_day'
    RB_NURSING_WEEKEND_NIGHT = 'rb_nursing_weekend_night'
    RB_DOCTORS_WEEKDAY = 'rb_doctors_weekday'
    RB_DOCTORS_WEEKEND = 'rb_doctors_weekend'
    AW_NURSING = 'aw_nursing'
    
    # Areas
    AREAS = ['Nord', 'Süd', 'Mitte']
    
    def __init__(self, existing_assignments_handling: str = 'respect', allow_overplanning: bool = False):
        """
        Initialize the planning service
        
        Args:
            existing_assignments_handling: 'respect' to keep existing, 'overwrite' to replace
            allow_overplanning: If True, ignore capacity limits
        """
        self.existing_assignments_handling = existing_assignments_handling
        self.allow_overplanning = allow_overplanning
    
    def plan(self, start_date: date, end_date: date) -> Dict[str, any]:
        """
        Main planning method
        
        Args:
            start_date: Start date for planning
            end_date: End date for planning
            
        Returns:
            Dict with planning results
        """
        # Get all dates in range
        dates = self._get_dates_in_range(start_date, end_date)
        
        # Get all employees
        employees = Employee.query.all()
        
        # Separate employees by function
        nursing_employees = [e for e in employees if e.function in ['Pflegekraft', 'PDL']]
        doctor_employees = [e for e in employees if e.function in ['Arzt', 'Honorararzt']]
        
        # Get existing assignments
        existing_assignments = self._get_existing_assignments(start_date, end_date)
        
        # Plan weekday RB assignments
        weekday_assignments = self._plan_weekday_rb(dates, nursing_employees, doctor_employees, existing_assignments)
        
        # Plan weekend assignments (AW and RB)
        weekend_assignments = self._plan_weekend_assignments(dates, nursing_employees, doctor_employees, existing_assignments)
        
        # Combine all assignments
        all_assignments = weekday_assignments + weekend_assignments
        
        # Save assignments to database
        saved_count = self._save_assignments(all_assignments, existing_assignments)
        
        return {
            'message': 'Planning completed',
            'assignments_created': saved_count,
            'total_planned': len(all_assignments)
        }
    
    def _get_dates_in_range(self, start_date: date, end_date: date) -> List[date]:
        """Get all dates in the given range"""
        dates = []
        current = start_date
        while current <= end_date:
            dates.append(current)
            current += timedelta(days=1)
        return dates
    
    def _get_existing_assignments(self, start_date: date, end_date: date) -> Dict[str, OnCallAssignment]:
        """Get existing assignments in date range, keyed by date_dutytype_area"""
        assignments = OnCallAssignment.query.filter(
            OnCallAssignment.date >= start_date,
            OnCallAssignment.date <= end_date
        ).all()
        
        result = {}
        for assignment in assignments:
            key = f"{assignment.date}_{assignment.duty_type}_{assignment.area or ''}"
            result[key] = assignment
        return result
    
    def _is_weekend(self, date_obj: date) -> bool:
        """Check if date is a weekend (Saturday or Sunday)"""
        return date_obj.weekday() >= 5  # 5 = Saturday, 6 = Sunday
    
    def _is_weekday(self, date_obj: date) -> bool:
        """Check if date is a weekday (Monday to Friday)"""
        return date_obj.weekday() < 5
    
    def _get_calendar_week(self, date_obj: date) -> int:
        """Get ISO calendar week number"""
        return date_obj.isocalendar()[1]
    
    def _plan_weekday_rb(self, dates: List[date], nursing_employees: List[Employee], 
                         doctor_employees: List[Employee], existing_assignments: Dict) -> List[Dict]:
        """Plan weekday RB assignments (Monday to Friday)"""
        assignments = []
        weekday_dates = [d for d in dates if self._is_weekday(d)]
        
        if not weekday_dates:
            return assignments
        
        # Group dates by calendar week
        dates_by_week = {}
        for d in weekday_dates:
            week = self._get_calendar_week(d)
            if week not in dates_by_week:
                dates_by_week[week] = []
            dates_by_week[week].append(d)
        
        # Plan for each week
        for week, week_dates in dates_by_week.items():
            # Plan nursing RB
            nursing_assignments = self._plan_weekday_rb_for_group(
                week_dates, nursing_employees, self.RB_NURSING_WEEKDAY, existing_assignments
            )
            assignments.extend(nursing_assignments)
            
            # Plan doctor RB
            doctor_assignments = self._plan_weekday_rb_for_group(
                week_dates, doctor_employees, self.RB_DOCTORS_WEEKDAY, existing_assignments
            )
            assignments.extend(doctor_assignments)
        
        return assignments
    
    def _plan_weekday_rb_for_group(self, dates: List[date], employees: List[Employee], 
                                    duty_type: str, existing_assignments: Dict) -> List[Dict]:
        """Plan weekday RB for a specific group (nursing or doctors)"""
        assignments = []
        
        # Get employees with capacity for this duty type
        available_employees = self._get_employees_with_capacity(employees, duty_type, dates)
        
        # Group dates by area (Nord/Süd)
        dates_by_area = {'Nord': [], 'Süd': []}
        for d in dates:
            # For now, assign to both areas - will be refined based on employee area
            dates_by_area['Nord'].append(d)
            dates_by_area['Süd'].append(d)
        
        # Plan for each area
        for area, area_dates in dates_by_area.items():
            # Get employees for this area (prefer area match, then others)
            area_employees = [e for e in available_employees if e.area == area]
            other_employees = [e for e in available_employees if e.area != area]
            prioritized_employees = area_employees + other_employees
            
            # Track assignments per employee per week
            employee_assignments = {emp.id: [] for emp in prioritized_employees}
            
            # Plan up to 2 RB per employee per week, non-consecutive
            for date_obj in area_dates:
                # Check if already assigned
                key = f"{date_obj}_{duty_type}_{area}"
                if key in existing_assignments:
                    if self.existing_assignments_handling == 'respect':
                        continue  # Skip if respecting existing
                    # Otherwise overwrite
                
                # Find available employee
                employee = self._find_available_employee_for_weekday_rb(
                    prioritized_employees, date_obj, employee_assignments, duty_type, area, existing_assignments
                )
                
                if employee:
                    assignments.append({
                        'employee_id': employee.id,
                        'date': date_obj,
                        'duty_type': duty_type,
                        'area': area,
                        'calendar_week': self._get_calendar_week(date_obj)
                    })
                    employee_assignments[employee.id].append(date_obj)
        
        return assignments
    
    def _find_available_employee_for_weekday_rb(self, employees: List[Employee], date_obj: date,
                                                employee_assignments: Dict, duty_type: str, area: str,
                                                existing_assignments: Dict) -> Optional[Employee]:
        """Find an available employee for weekday RB assignment"""
        for employee in employees:
            # Check capacity
            if not self.allow_overplanning:
                capacity = self._get_employee_capacity(employee, duty_type)
                current_count = len(employee_assignments[employee.id])
                if capacity and current_count >= capacity:
                    continue
            
            # Check if already has assignment on this date
            key = f"{date_obj}_{duty_type}_{area}"
            if key in existing_assignments:
                existing = existing_assignments[key]
                if existing.employee_id == employee.id and self.existing_assignments_handling == 'respect':
                    continue
            
            # Check non-consecutive rule: no assignment on previous or next day
            prev_date = date_obj - timedelta(days=1)
            next_date = date_obj + timedelta(days=1)
            
            has_prev = prev_date in employee_assignments[employee.id]
            has_next = next_date in employee_assignments[employee.id]
            
            if has_prev or has_next:
                continue
            
            # Check max 2 per week
            week = self._get_calendar_week(date_obj)
            week_assignments = [d for d in employee_assignments[employee.id] 
                              if self._get_calendar_week(d) == week]
            if len(week_assignments) >= 2:
                continue
            
            return employee
        
        return None
    
    def _plan_weekend_assignments(self, dates: List[date], nursing_employees: List[Employee],
                                  doctor_employees: List[Employee], existing_assignments: Dict) -> List[Dict]:
        """Plan weekend assignments (AW and RB)"""
        assignments = []
        weekend_dates = [d for d in dates if self._is_weekend(d)]
        
        if not weekend_dates:
            return assignments
        
        # Group weekends (Saturday-Sunday pairs)
        weekend_pairs = self._group_weekend_pairs(weekend_dates)
        
        # Get historical assignments for alternating pattern
        historical_assignments = self._get_historical_weekend_assignments(dates[0] if dates else date.today())
        
        # Plan AW first (always Saturday + Sunday together)
        aw_assignments = self._plan_weekend_aw(weekend_pairs, nursing_employees, existing_assignments, historical_assignments)
        assignments.extend(aw_assignments)
        
        # Plan weekend RB (considering AW assignments)
        rb_assignments = self._plan_weekend_rb(weekend_pairs, nursing_employees, doctor_employees, 
                                              existing_assignments, aw_assignments, historical_assignments)
        assignments.extend(rb_assignments)
        
        return assignments
    
    def _group_weekend_pairs(self, weekend_dates: List[date]) -> List[Tuple[date, date]]:
        """Group weekend dates into Saturday-Sunday pairs"""
        pairs = []
        sorted_dates = sorted(weekend_dates)
        
        i = 0
        while i < len(sorted_dates):
            if sorted_dates[i].weekday() == 5:  # Saturday
                if i + 1 < len(sorted_dates) and sorted_dates[i + 1].weekday() == 6:  # Sunday
                    pairs.append((sorted_dates[i], sorted_dates[i + 1]))
                    i += 2
                else:
                    # Saturday without Sunday (shouldn't happen in normal planning)
                    i += 1
            else:
                i += 1
        
        return pairs
    
    def _get_historical_weekend_assignments(self, start_date: date) -> Dict:
        """Get weekend assignments from previous weeks/months for alternating pattern (cross-month)"""
        # Look back 8 weeks (2 months) to ensure we capture pattern across month boundaries
        lookback_start = start_date - timedelta(weeks=8)
        
        assignments = OnCallAssignment.query.filter(
            OnCallAssignment.date >= lookback_start,
            OnCallAssignment.date < start_date,
            OnCallAssignment.duty_type.in_([self.AW_NURSING, self.RB_NURSING_WEEKEND_DAY, 
                                            self.RB_NURSING_WEEKEND_NIGHT, self.RB_DOCTORS_WEEKEND])
        ).order_by(OnCallAssignment.date.desc()).all()
        
        # Group by employee and date (not just week) to track chronological order across months
        # Store as list of (date, duty_type) tuples, sorted by date
        result = {}
        for assignment in assignments:
            employee_id = assignment.employee_id
            if employee_id not in result:
                result[employee_id] = []
            # Determine assignment type
            if assignment.duty_type == self.AW_NURSING:
                assign_type = 'AW'
            elif assignment.duty_type in [self.RB_NURSING_WEEKEND_DAY, self.RB_NURSING_WEEKEND_NIGHT, self.RB_DOCTORS_WEEKEND]:
                assign_type = 'RB'
            else:
                continue
            result[employee_id].append((assignment.date, assign_type))
        
        # Sort by date (most recent first)
        for employee_id in result:
            result[employee_id].sort(key=lambda x: x[0], reverse=True)
        
        return result
    
    def _plan_weekend_aw(self, weekend_pairs: List[Tuple[date, date]], employees: List[Employee],
                        existing_assignments: Dict, historical_assignments: Dict) -> List[Dict]:
        """Plan AW assignments (always Saturday + Sunday together)"""
        assignments = []
        
        available_employees = self._get_employees_with_capacity(employees, self.AW_NURSING, 
                                                                 [pair[0] for pair in weekend_pairs])
        
        # Plan for each area
        for area in ['Nord', 'Mitte', 'Süd']:
            area_employees = [e for e in available_employees if e.area == area]
            other_employees = [e for e in available_employees if e.area != area]
            prioritized_employees = area_employees + other_employees
            
            # Track assignments per employee for alternating pattern (store dates, not weeks)
            employee_weekend_history = {emp.id: [] for emp in prioritized_employees}
            
            for saturday, sunday in weekend_pairs:
                week = self._get_calendar_week(saturday)
                
                # Check if already assigned
                sat_key = f"{saturday}_{self.AW_NURSING}_{area}"
                sun_key = f"{sunday}_{self.AW_NURSING}_{area}"
                
                if sat_key in existing_assignments or sun_key in existing_assignments:
                    if self.existing_assignments_handling == 'respect':
                        continue
                
                # Find employee following alternating pattern (AW, frei, RB, frei, ...)
                employee = self._find_employee_for_weekend_aw(
                    prioritized_employees, saturday, sunday, area, employee_weekend_history,
                    existing_assignments, historical_assignments
                )
                
                if employee:
                    # Assign both Saturday and Sunday
                    assignments.append({
                        'employee_id': employee.id,
                        'date': saturday,
                        'duty_type': self.AW_NURSING,
                        'area': area,
                        'calendar_week': week
                    })
                    assignments.append({
                        'employee_id': employee.id,
                        'date': sunday,
                        'duty_type': self.AW_NURSING,
                        'area': area,
                        'calendar_week': week
                    })
                    # Store date instead of week for cross-month tracking
                    employee_weekend_history[employee.id].append((saturday, 'AW'))
        
        return assignments
    
    def _find_employee_for_weekend_aw(self, employees: List[Employee], saturday: date, sunday: date,
                                     area: str, employee_weekend_history: Dict, existing_assignments: Dict,
                                     historical_assignments: Dict) -> Optional[Employee]:
        """Find employee for AW assignment following alternating pattern"""
        week = self._get_calendar_week(saturday)
        
        for employee in employees:
            # Check capacity
            if not self.allow_overplanning:
                capacity = self._get_employee_capacity(employee, self.AW_NURSING)
                if capacity:
                    # Count AW assignments in this month
                    month_start = date(saturday.year, saturday.month, 1)
                    month_end = date(saturday.year, saturday.month, monthrange(saturday.year, saturday.month)[1])
                    existing_aw = OnCallAssignment.query.filter(
                        OnCallAssignment.employee_id == employee.id,
                        OnCallAssignment.duty_type == self.AW_NURSING,
                        OnCallAssignment.date >= month_start,
                        OnCallAssignment.date <= month_end
                    ).count()
                    if existing_aw >= capacity:
                        continue
            
            # Check if employee has RB on this weekend (AW and RB not simultaneously)
            has_rb = self._employee_has_weekend_rb(employee.id, saturday, sunday, existing_assignments)
            if has_rb:
                continue
            
            # Check alternating pattern: should alternate AW, frei, RB, frei, ...
            # Get last assignment type for this employee (cross-month aware)
            last_type = self._get_last_weekend_assignment_type(employee.id, saturday, employee_weekend_history, historical_assignments)
            
            # If last was AW, skip (should be frei or RB next)
            if last_type == 'AW':
                continue
            
            return employee
        
        # If no employee found with perfect pattern, use first available
        for employee in employees:
            has_rb = self._employee_has_weekend_rb(employee.id, saturday, sunday, existing_assignments)
            if not has_rb:
                return employee
        
        return None
    
    def _plan_weekend_rb(self, weekend_pairs: List[Tuple[date, date]], nursing_employees: List[Employee],
                        doctor_employees: List[Employee], existing_assignments: Dict, aw_assignments: List[Dict],
                        historical_assignments: Dict) -> List[Dict]:
        """Plan weekend RB assignments"""
        assignments = []
        
        # Create set of employees with AW on each weekend
        aw_by_weekend = {}
        for aw in aw_assignments:
            week = aw['calendar_week']
            if week not in aw_by_weekend:
                aw_by_weekend[week] = set()
            aw_by_weekend[week].add(aw['employee_id'])
        
        # Plan nursing weekend RB
        nursing_assignments = self._plan_weekend_rb_nursing(
            weekend_pairs, nursing_employees, existing_assignments, aw_by_weekend, historical_assignments
        )
        assignments.extend(nursing_assignments)
        
        # Plan doctor weekend RB
        doctor_assignments = self._plan_weekend_rb_doctors(
            weekend_pairs, doctor_employees, existing_assignments, aw_by_weekend, historical_assignments
        )
        assignments.extend(doctor_assignments)
        
        return assignments
    
    def _plan_weekend_rb_nursing(self, weekend_pairs: List[Tuple[date, date]], employees: List[Employee],
                                existing_assignments: Dict, aw_by_weekend: Dict, historical_assignments: Dict) -> List[Dict]:
        """Plan weekend RB for nursing staff (with day/night rules)"""
        assignments = []
        
        available_employees = self._get_employees_with_capacity(employees, self.RB_NURSING_WEEKEND_DAY,
                                                                 [pair[0] for pair in weekend_pairs])
        
        # Track assignments per employee
        employee_weekend_history = {emp.id: [] for emp in available_employees}
        
        for saturday, sunday in weekend_pairs:
            week = self._get_calendar_week(saturday)
            
            # Plan for each area
            for area in ['Nord', 'Süd']:
                area_employees = [e for e in available_employees if e.area == area]
                other_employees = [e for e in available_employees if e.area != area]
                prioritized_employees = area_employees + other_employees
                
                # Plan day and night shifts
                # Rule: No night after day within same weekend
                # Prefer: day-day or night-night, alternating for balance
                
                # Check if day shift needed
                sat_day_key = f"{saturday}_{self.RB_NURSING_WEEKEND_DAY}_{area}"
                sun_day_key = f"{sunday}_{self.RB_NURSING_WEEKEND_DAY}_{area}"
                
                # Check if night shift needed
                sat_night_key = f"{saturday}_{self.RB_NURSING_WEEKEND_NIGHT}_{area}"
                sun_night_key = f"{sunday}_{self.RB_NURSING_WEEKEND_NIGHT}_{area}"
                
                # Plan day shifts (both days same employee preferred)
                if sat_day_key not in existing_assignments or self.existing_assignments_handling == 'overwrite':
                    day_employee = self._find_employee_for_weekend_rb_nursing(
                        prioritized_employees, saturday, sunday, area, 'day', 
                        employee_weekend_history, existing_assignments, aw_by_weekend, week, historical_assignments
                    )
                    if day_employee:
                        assignments.append({
                            'employee_id': day_employee.id,
                            'date': saturday,
                            'duty_type': self.RB_NURSING_WEEKEND_DAY,
                            'area': area,
                            'calendar_week': week
                        })
                        assignments.append({
                            'employee_id': day_employee.id,
                            'date': sunday,
                            'duty_type': self.RB_NURSING_WEEKEND_DAY,
                            'area': area,
                            'calendar_week': week
                        })
                        employee_weekend_history[day_employee.id].append((saturday, 'RB_DAY'))
                
                # Plan night shifts (both days same employee preferred, but not if day shift was assigned)
                if sat_night_key not in existing_assignments or self.existing_assignments_handling == 'overwrite':
                    night_employee = self._find_employee_for_weekend_rb_nursing(
                        prioritized_employees, saturday, sunday, area, 'night',
                        employee_weekend_history, existing_assignments, aw_by_weekend, week, historical_assignments
                    )
                    if night_employee:
                        assignments.append({
                            'employee_id': night_employee.id,
                            'date': saturday,
                            'duty_type': self.RB_NURSING_WEEKEND_NIGHT,
                            'area': area,
                            'calendar_week': week
                        })
                        assignments.append({
                            'employee_id': night_employee.id,
                            'date': sunday,
                            'duty_type': self.RB_NURSING_WEEKEND_NIGHT,
                            'area': area,
                            'calendar_week': week
                        })
                        employee_weekend_history[night_employee.id].append((saturday, 'RB_NIGHT'))
        
        return assignments
    
    def _find_employee_for_weekend_rb_nursing(self, employees: List[Employee], saturday: date, sunday: date,
                                            area: str, shift_type: str, employee_weekend_history: Dict,
                                            existing_assignments: Dict, aw_by_weekend: Dict, week: int,
                                            historical_assignments: Dict) -> Optional[Employee]:
        """Find employee for weekend RB nursing shift"""
        for employee in employees:
            # Check if has AW this weekend
            if week in aw_by_weekend and employee.id in aw_by_weekend[week]:
                continue
            
            # Check capacity
            if not self.allow_overplanning:
                capacity = self._get_employee_capacity(employee, self.RB_NURSING_WEEKEND_DAY)
                if capacity:
                    # Count weekend RB assignments this month
                    month_start = date(saturday.year, saturday.month, 1)
                    month_end = date(saturday.year, saturday.month, monthrange(saturday.year, saturday.month)[1])
                    existing_rb = OnCallAssignment.query.filter(
                        OnCallAssignment.employee_id == employee.id,
                        OnCallAssignment.duty_type.in_([self.RB_NURSING_WEEKEND_DAY, self.RB_NURSING_WEEKEND_NIGHT]),
                        OnCallAssignment.date >= month_start,
                        OnCallAssignment.date <= month_end
                    ).count()
                    if existing_rb >= capacity:
                        continue
            
            # Check alternating pattern (cross-month aware)
            last_type = self._get_last_weekend_assignment_type(employee.id, saturday, employee_weekend_history, historical_assignments)
            if last_type == 'RB':
                continue  # Should be frei or AW next
            
            return employee
        
        # Fallback: first available
        for employee in employees:
            if week not in aw_by_weekend or employee.id not in aw_by_weekend[week]:
                return employee
        
        return None
    
    def _plan_weekend_rb_doctors(self, weekend_pairs: List[Tuple[date, date]], employees: List[Employee],
                                existing_assignments: Dict, aw_by_weekend: Dict, historical_assignments: Dict) -> List[Dict]:
        """Plan weekend RB for doctors"""
        assignments = []
        
        available_employees = self._get_employees_with_capacity(employees, self.RB_DOCTORS_WEEKEND,
                                                                 [pair[0] for pair in weekend_pairs])
        
        employee_weekend_history = {emp.id: [] for emp in available_employees}
        
        for saturday, sunday in weekend_pairs:
            week = self._get_calendar_week(saturday)
            
            for area in ['Nord', 'Süd']:
                area_employees = [e for e in available_employees if e.area == area]
                other_employees = [e for e in available_employees if e.area != area]
                prioritized_employees = area_employees + other_employees
                
                sat_key = f"{saturday}_{self.RB_DOCTORS_WEEKEND}_{area}"
                sun_key = f"{sunday}_{self.RB_DOCTORS_WEEKEND}_{area}"
                
                if (sat_key not in existing_assignments or self.existing_assignments_handling == 'overwrite') and \
                   (sun_key not in existing_assignments or self.existing_assignments_handling == 'overwrite'):
                    
                    employee = self._find_employee_for_weekend_rb_doctors(
                        prioritized_employees, saturday, sunday, area, employee_weekend_history,
                        existing_assignments, aw_by_weekend, week, historical_assignments
                    )
                    
                    if employee:
                        assignments.append({
                            'employee_id': employee.id,
                            'date': saturday,
                            'duty_type': self.RB_DOCTORS_WEEKEND,
                            'area': area,
                            'calendar_week': week
                        })
                        assignments.append({
                            'employee_id': employee.id,
                            'date': sunday,
                            'duty_type': self.RB_DOCTORS_WEEKEND,
                            'area': area,
                            'calendar_week': week
                        })
                        employee_weekend_history[employee.id].append((saturday, 'RB'))
        
        return assignments
    
    def _find_employee_for_weekend_rb_doctors(self, employees: List[Employee], saturday: date, sunday: date,
                                             area: str, employee_weekend_history: Dict, existing_assignments: Dict,
                                             aw_by_weekend: Dict, week: int, historical_assignments: Dict) -> Optional[Employee]:
        """Find employee for weekend RB doctors"""
        for employee in employees:
            if week in aw_by_weekend and employee.id in aw_by_weekend[week]:
                continue
            
            if not self.allow_overplanning:
                capacity = self._get_employee_capacity(employee, self.RB_DOCTORS_WEEKEND)
                if capacity:
                    month_start = date(saturday.year, saturday.month, 1)
                    month_end = date(saturday.year, saturday.month, monthrange(saturday.year, saturday.month)[1])
                    existing_rb = OnCallAssignment.query.filter(
                        OnCallAssignment.employee_id == employee.id,
                        OnCallAssignment.duty_type == self.RB_DOCTORS_WEEKEND,
                        OnCallAssignment.date >= month_start,
                        OnCallAssignment.date <= month_end
                    ).count()
                    if existing_rb >= capacity:
                        continue
            
            last_type = self._get_last_weekend_assignment_type(employee.id, saturday, employee_weekend_history, historical_assignments)
            if last_type == 'RB':
                continue
            
            return employee
        
        for employee in employees:
            if week not in aw_by_weekend or employee.id not in aw_by_weekend[week]:
                return employee
        
        return None
    
    def _get_employees_with_capacity(self, employees: List[Employee], duty_type: str, dates: List[date]) -> List[Employee]:
        """Get employees who have capacity for the given duty type"""
        result = []
        for employee in employees:
            capacity = self._get_employee_capacity(employee, duty_type)
            if capacity is not None and capacity > 0:
                result.append(employee)
        return result
    
    def _get_employee_capacity(self, employee: Employee, duty_type: str) -> Optional[int]:
        """Get capacity for employee for given duty type"""
        if duty_type == self.RB_NURSING_WEEKDAY:
            return employee.oncall_nursing_weekday
        elif duty_type in [self.RB_NURSING_WEEKEND_DAY, self.RB_NURSING_WEEKEND_NIGHT]:
            return employee.oncall_nursing_weekend
        elif duty_type == self.RB_DOCTORS_WEEKDAY:
            return employee.oncall_doctors_weekday
        elif duty_type == self.RB_DOCTORS_WEEKEND:
            return employee.oncall_doctors_weekend
        elif duty_type == self.AW_NURSING:
            return employee.weekend_services_nursing
        return None
    
    def _employee_has_weekend_rb(self, employee_id: int, saturday: date, sunday: date, existing_assignments: Dict) -> bool:
        """Check if employee has RB assignment on this weekend"""
        for area in ['Nord', 'Süd']:
            for duty_type in [self.RB_NURSING_WEEKEND_DAY, self.RB_NURSING_WEEKEND_NIGHT, self.RB_DOCTORS_WEEKEND]:
                sat_key = f"{saturday}_{duty_type}_{area}"
                sun_key = f"{sunday}_{duty_type}_{area}"
                if sat_key in existing_assignments and existing_assignments[sat_key].employee_id == employee_id:
                    return True
                if sun_key in existing_assignments and existing_assignments[sun_key].employee_id == employee_id:
                    return True
        return False
    
    def _get_last_weekend_assignment_type(self, employee_id: int, current_date: date, 
                                         employee_weekend_history: Dict, historical_assignments: Dict) -> Optional[str]:
        """Get last weekend assignment type for employee (for alternating pattern, cross-month aware)"""
        # Combine current planning and historical assignments
        all_assignments = []
        
        # Add current planning (from this planning run)
        if employee_id in employee_weekend_history:
            for assign_date, assign_type in employee_weekend_history[employee_id]:
                if assign_date < current_date:
                    all_assignments.append((assign_date, assign_type))
        
        # Add historical assignments (from database, cross-month)
        if employee_id in historical_assignments:
            for assign_date, assign_type in historical_assignments[employee_id]:
                if assign_date < current_date:
                    all_assignments.append((assign_date, assign_type))
        
        # Sort by date (most recent first)
        all_assignments.sort(key=lambda x: x[0], reverse=True)
        
        # Find the most recent weekend assignment before current_date
        # Group by weekend (Saturday-Sunday pair)
        weekend_assignments = {}
        for assign_date, assign_type in all_assignments:
            # Find the Saturday of this weekend
            days_since_saturday = (assign_date.weekday() - 5) % 7
            if assign_date.weekday() == 6:  # Sunday
                saturday = assign_date - timedelta(days=1)
            elif assign_date.weekday() == 5:  # Saturday
                saturday = assign_date
            else:
                continue  # Not a weekend
            
            if saturday not in weekend_assignments:
                weekend_assignments[saturday] = assign_type
        
        # Get the most recent weekend assignment
        if weekend_assignments:
            most_recent_weekend = max(weekend_assignments.keys())
            if most_recent_weekend < current_date:
                return weekend_assignments[most_recent_weekend]
        
        return None
    
    def _save_assignments(self, assignments: List[Dict], existing_assignments: Dict) -> int:
        """Save assignments to database"""
        saved_count = 0
        
        for assignment_data in assignments:
            key = f"{assignment_data['date']}_{assignment_data['duty_type']}_{assignment_data.get('area', '')}"
            
            if key in existing_assignments:
                if self.existing_assignments_handling == 'respect':
                    continue  # Skip existing
                # Update existing
                existing = existing_assignments[key]
                existing.employee_id = assignment_data['employee_id']
                existing.calendar_week = assignment_data['calendar_week']
                existing.updated_at = datetime.utcnow()
            else:
                # Create new
                assignment = OnCallAssignment(
                    employee_id=assignment_data['employee_id'],
                    date=assignment_data['date'],
                    duty_type=assignment_data['duty_type'],
                    area=assignment_data.get('area'),
                    calendar_week=assignment_data['calendar_week']
                )
                db.session.add(assignment)
            
            saved_count += 1
        
        db.session.commit()
        return saved_count
