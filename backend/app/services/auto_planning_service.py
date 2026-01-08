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
        """Plan weekday RB assignments (Monday to Friday) - optimized: one employee per day"""
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
            # Track which employees are already assigned per day (one assignment per day per employee)
            employees_assigned_per_day = {}  # key: date -> set of employee_ids
            
            # Track assignments per employee for this week (for max 2 per week and non-consecutive rules)
            # IMPORTANT: Count both nursing and doctor RB together
            employee_week_assignments = {}  # employee_id -> list of dates in this week (from this planning session)
            
            # Get all required shifts per day: (date, duty_type, area, function_type)
            required_shifts = []
            for date_obj in week_dates:
                # Check existing assignments first
                for area in ['Nord', 'Süd']:
                    # Nursing RB
                    nursing_key = f"{date_obj}_{self.RB_NURSING_WEEKDAY}_{area}"
                    if nursing_key not in existing_assignments or self.existing_assignments_handling == 'overwrite':
                        required_shifts.append((date_obj, self.RB_NURSING_WEEKDAY, area, 'nursing'))
                    
                    # Doctor RB
                    doctor_key = f"{date_obj}_{self.RB_DOCTORS_WEEKDAY}_{area}"
                    if doctor_key not in existing_assignments or self.existing_assignments_handling == 'overwrite':
                        required_shifts.append((date_obj, self.RB_DOCTORS_WEEKDAY, area, 'doctor'))
            
            # Plan each required shift with rotation (prefer employees with fewer assignments)
            for date_obj, duty_type, area, function_type in required_shifts:
                # Skip if employee already assigned for this day
                if date_obj not in employees_assigned_per_day:
                    employees_assigned_per_day[date_obj] = set()
                
                # Get appropriate employee pool
                if function_type == 'nursing':
                    all_employees = nursing_employees
                else:
                    all_employees = doctor_employees
                
                # ROTATION: Sort employees by number of assignments this week (prefer those with fewer)
                # This ensures we rotate through employees instead of filling one completely
                def get_week_assignment_count(emp):
                    # Count both nursing and doctor RB together for this week
                    count = len(employee_week_assignments.get(emp.id, []))
                    # Also count existing assignments from DB (both nursing and doctor RB)
                    existing_count = 0
                    for key, assignment in existing_assignments.items():
                        if (assignment.employee_id == emp.id and 
                            self._get_calendar_week(assignment.date) == week and
                            assignment.duty_type in [self.RB_NURSING_WEEKDAY, self.RB_DOCTORS_WEEKDAY]):
                            existing_count += 1
                    return count + existing_count
                
                # Sort by assignment count (fewer first) for rotation
                all_employees_sorted = sorted(all_employees, key=get_week_assignment_count)
                
                # Split employees by capacity and area, maintaining rotation order
                employees_with_capacity = []
                employees_without_capacity = []
                for emp in all_employees_sorted:
                    capacity = self._get_employee_capacity(emp, duty_type)
                    if capacity and capacity > 0:
                        employees_with_capacity.append(emp)
                    elif self.allow_overplanning:
                        employees_without_capacity.append(emp)
                
                # Prioritize by area match - first try own area, then other areas
                # Maintain rotation order (sorted by assignment count)
                area_employees_with_cap = [e for e in employees_with_capacity if e.area == area]
                other_employees_with_cap = [e for e in employees_with_capacity if e.area != area]
                area_employees_without_cap = [e for e in employees_without_capacity if e.area == area]
                other_employees_without_cap = [e for e in employees_without_capacity if e.area != area]
                
                # Try own area with capacity first (with rotation)
                employee = None
                if area_employees_with_cap:
                    employee = self._find_employee_for_weekday_shift(
                        area_employees_with_cap, date_obj, duty_type, area, week,
                        employees_assigned_per_day[date_obj], existing_assignments, employee_week_assignments
                    )
                
                # If no employee found in own area with capacity, try other areas with capacity
                if not employee and other_employees_with_cap:
                    employee = self._find_employee_for_weekday_shift(
                        other_employees_with_cap, date_obj, duty_type, area, week,
                        employees_assigned_per_day[date_obj], existing_assignments, employee_week_assignments
                    )
                
                # Only if overplanning is allowed and no employee with capacity found, try without capacity
                if not employee and self.allow_overplanning:
                    if area_employees_without_cap:
                        employee = self._find_employee_for_weekday_shift(
                            area_employees_without_cap, date_obj, duty_type, area, week,
                            employees_assigned_per_day[date_obj], existing_assignments, employee_week_assignments
                        )
                    if not employee and other_employees_without_cap:
                        employee = self._find_employee_for_weekday_shift(
                            other_employees_without_cap, date_obj, duty_type, area, week,
                            employees_assigned_per_day[date_obj], existing_assignments, employee_week_assignments
                        )
                
                if employee:
                    assignments.append({
                        'employee_id': employee.id,
                        'date': date_obj,
                        'duty_type': duty_type,
                        'area': area,
                        'calendar_week': week
                    })
                    employees_assigned_per_day[date_obj].add(employee.id)
                    # Track assignment for this employee in this week
                    if employee.id not in employee_week_assignments:
                        employee_week_assignments[employee.id] = []
                    employee_week_assignments[employee.id].append(date_obj)
        
        return assignments
    
    def _find_employee_for_weekday_shift(self, employees: List[Employee], date_obj: date, 
                                        duty_type: str, area: str, week: int,
                                        already_assigned_employee_ids: set, existing_assignments: Dict,
                                        employee_week_assignments: Dict) -> Optional[Employee]:
        """Find employee for a weekday shift - optimized version (one employee per day)
        Prefers employees with 0 assignments, then 1, then 2 (max 2 per week, both nursing and doctor RB count together)"""
        # Get existing assignments for this week to count (from database)
        # IMPORTANT: Count both nursing and doctor RB together
        existing_week_assignments = {}  # employee_id -> list of dates in this week from database
        for emp in employees:
            week_assignments = []
            for key, assignment in existing_assignments.items():
                if (assignment.employee_id == emp.id and 
                    self._get_calendar_week(assignment.date) == week and
                    assignment.duty_type in [self.RB_NURSING_WEEKDAY, self.RB_DOCTORS_WEEKDAY]):
                    week_assignments.append(assignment.date)
            existing_week_assignments[emp.id] = week_assignments
        
        # Sort employees by assignment count (prefer 0, then 1, then 2) for rotation
        def get_total_count(emp):
            existing_count = len(existing_week_assignments.get(emp.id, []))
            planned_count = len(employee_week_assignments.get(emp.id, []))
            return existing_count + planned_count
        
        # Sort by assignment count (fewer first) - this ensures rotation
        employees_sorted = sorted(employees, key=get_total_count)
        
        for employee in employees_sorted:
            # Skip if already assigned this day
            if employee.id in already_assigned_employee_ids:
                continue
            
            # Check if already has assignment on this date in database
            if self._employee_has_any_assignment_on_date(employee.id, date_obj, existing_assignments):
                continue
            
            # NEW RULE: If Monday and employee had weekend assignment (AW or RB), skip (first RB on Tuesday)
            if date_obj.weekday() == 0:  # Monday
                prev_saturday = date_obj - timedelta(days=2)
                prev_sunday = date_obj - timedelta(days=1)
                if (self._employee_has_any_assignment_on_date(employee.id, prev_saturday, existing_assignments) or
                    self._employee_has_any_assignment_on_date(employee.id, prev_sunday, existing_assignments)):
                    continue  # Skip Monday if weekend had assignment
            
            # Check capacity - skip if at capacity (unless overplanning is allowed and handled at higher level)
            capacity = self._get_employee_capacity(employee, duty_type)
            if capacity:
                # Count assignments this week (existing from DB + planned in this session)
                existing_count = len(existing_week_assignments.get(employee.id, []))
                planned_count = len(employee_week_assignments.get(employee.id, []))
                if existing_count + planned_count >= capacity:
                    # Skip if overplanning is not allowed
                    if not self.allow_overplanning:
                        continue
                    # If overplanning is allowed, this employee is already at capacity
                    # We'll only use them if all employees with capacity are at capacity
                    # This is handled by the calling function trying employees with capacity first
                    continue
            
            # NEW RULE: If Monday and employee had weekend assignment (AW or RB), skip
            if date_obj.weekday() == 0:  # Monday
                prev_saturday = date_obj - timedelta(days=2)
                prev_sunday = date_obj - timedelta(days=1)
                if (self._employee_has_any_assignment_on_date(employee.id, prev_saturday, existing_assignments) or
                    self._employee_has_any_assignment_on_date(employee.id, prev_sunday, existing_assignments)):
                    continue  # Skip Monday if weekend had assignment
            
            # Check non-consecutive rule: no assignment on previous or next day
            prev_date = date_obj - timedelta(days=1)
            next_date = date_obj + timedelta(days=1)
            
            # Check in existing assignments (database)
            has_prev = self._employee_has_any_assignment_on_date(employee.id, prev_date, existing_assignments)
            has_next = self._employee_has_any_assignment_on_date(employee.id, next_date, existing_assignments)
            
            # Also check in planned assignments for this week (from current planning session)
            planned_dates = employee_week_assignments.get(employee.id, [])
            if prev_date in planned_dates or next_date in planned_dates:
                has_prev = True
                has_next = True
            
            if has_prev or has_next:
                continue
            
            # Check max 2 per week (count existing from DB + planned in this session)
            # IMPORTANT: Count both nursing and doctor RB together (not separately)
            existing_week_count = len(existing_week_assignments.get(employee.id, []))
            planned_week_count = len(employee_week_assignments.get(employee.id, []))
            total_count = existing_week_count + planned_week_count
            
            # Max 2 per week
            if total_count >= 2:
                continue
            
            # PREFER only 1 shift per week: if employee already has 1, only assign if no employee with 0 available
            # This is handled by sorting employees by assignment count above
            # Employees with 0 assignments will be tried first, then those with 1
            
            # Check if respecting existing assignment for this specific duty_type/area
            key = f"{date_obj}_{duty_type}_{area}"
            if key in existing_assignments:
                existing = existing_assignments[key]
                if existing.employee_id == employee.id and self.existing_assignments_handling == 'respect':
                    continue
            
            return employee
        
        return None
    
    def _employee_has_any_assignment_on_date(self, employee_id: int, date_obj: date, existing_assignments: Dict) -> bool:
        """Check if employee has ANY assignment (any duty_type, any area) on this date"""
        for key, assignment in existing_assignments.items():
            if assignment.date == date_obj and assignment.employee_id == employee_id:
                return True
        return False
    
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
        
        # Track all weekend assignments being created to prevent double-booking
        all_planned_weekend_assignments = {}  # key: (date, employee_id) -> True
        
        # Plan AW first (always Saturday + Sunday together)
        aw_assignments = self._plan_weekend_aw(weekend_pairs, nursing_employees, existing_assignments, historical_assignments, all_planned_weekend_assignments)
        assignments.extend(aw_assignments)
        # Track AW assignments
        for assignment in aw_assignments:
            all_planned_weekend_assignments[(assignment['date'], assignment['employee_id'])] = True
        
        # Plan weekend RB (considering AW assignments and already planned assignments)
        rb_assignments = self._plan_weekend_rb(weekend_pairs, nursing_employees, doctor_employees, 
                                              existing_assignments, aw_assignments, historical_assignments, all_planned_weekend_assignments)
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
        # Store as list of (date, duty_type, shift_type) tuples, sorted by date
        # shift_type: 'AW', 'RB_DAY', 'RB_NIGHT' - all AW/RB assignments count, not just one per weekend
        result = {}
        for assignment in assignments:
            employee_id = assignment.employee_id
            if employee_id not in result:
                result[employee_id] = []
            # Determine assignment type - all assignments count, not grouped by weekend
            if assignment.duty_type == self.AW_NURSING:
                assign_type = 'AW'
                shift_type = 'AW'
            elif assignment.duty_type == self.RB_NURSING_WEEKEND_DAY:
                assign_type = 'RB'
                shift_type = 'RB_DAY'
            elif assignment.duty_type == self.RB_NURSING_WEEKEND_NIGHT:
                assign_type = 'RB'
                shift_type = 'RB_NIGHT'
            elif assignment.duty_type == self.RB_DOCTORS_WEEKEND:
                assign_type = 'RB'
                shift_type = 'RB'  # Doctors don't have day/night distinction
            else:
                continue
            result[employee_id].append((assignment.date, assign_type, shift_type))
        
        # Sort by date (most recent first)
        for employee_id in result:
            result[employee_id].sort(key=lambda x: x[0], reverse=True)
        
        return result
    
    def _plan_weekend_aw(self, weekend_pairs: List[Tuple[date, date]], employees: List[Employee],
                        existing_assignments: Dict, historical_assignments: Dict, all_planned_weekend_assignments: Dict) -> List[Dict]:
        """Plan AW assignments (always Saturday + Sunday together)
        IMPORTANT: All AW assignments (Nord, Mitte, Süd) count together for the alternating pattern"""
        assignments = []
        
        available_employees = self._get_employees_with_capacity(employees, self.AW_NURSING, 
                                                                 [pair[0] for pair in weekend_pairs])
        
        # Track assignments per employee for alternating pattern (ALL areas together, not per area)
        # This ensures that AW Nord, Mitte, and Süd all count together
        employee_weekend_history = {emp.id: [] for emp in available_employees}
        
        # Plan for each area
        for area in ['Nord', 'Mitte', 'Süd']:
            # For Mitte, both Nord and Süd employees can do it (no employees with area 'Mitte' exist)
            if area == 'Mitte':
                area_employees = [e for e in available_employees if e.area in ['Nord', 'Süd']]
                other_employees = []  # No employees with area 'Mitte' exist
            else:
                area_employees = [e for e in available_employees if e.area == area]
                other_employees = [e for e in available_employees if e.area != area and e.area != 'Mitte']
            
            for saturday, sunday in weekend_pairs:
                week = self._get_calendar_week(saturday)
                
                # Check if already assigned
                sat_key = f"{saturday}_{self.AW_NURSING}_{area}"
                sun_key = f"{sunday}_{self.AW_NURSING}_{area}"
                
                if sat_key in existing_assignments or sun_key in existing_assignments:
                    if self.existing_assignments_handling == 'respect':
                        continue
                
                # Try own area first, then other areas
                employee = None
                if area_employees:
                    employee = self._find_employee_for_weekend_aw(
                        area_employees, saturday, sunday, area, employee_weekend_history,
                        existing_assignments, historical_assignments, all_planned_weekend_assignments
                    )
                
                # If no employee found in own area, try other areas
                if not employee and other_employees:
                    employee = self._find_employee_for_weekend_aw(
                        other_employees, saturday, sunday, area, employee_weekend_history,
                        existing_assignments, historical_assignments, all_planned_weekend_assignments
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
                    # Store both dates for cross-month tracking (all AW assignments count together, regardless of area)
                    employee_weekend_history[employee.id].append((saturday, 'AW'))
                    employee_weekend_history[employee.id].append((sunday, 'AW'))
                    # Mark as assigned
                    all_planned_weekend_assignments[(saturday, employee.id)] = True
                    all_planned_weekend_assignments[(sunday, employee.id)] = True
        
        return assignments
    
    def _find_employee_for_weekend_aw(self, employees: List[Employee], saturday: date, sunday: date,
                                     area: str, employee_weekend_history: Dict, existing_assignments: Dict,
                                     historical_assignments: Dict, all_planned_weekend_assignments: Dict) -> Optional[Employee]:
        """Find employee for AW assignment following alternating pattern"""
        week = self._get_calendar_week(saturday)
        
        for employee in employees:
            # Check if employee already has ANY assignment on Saturday or Sunday (only one assignment per day)
            if (saturday, employee.id) in all_planned_weekend_assignments or \
               (sunday, employee.id) in all_planned_weekend_assignments:
                continue
            
            # Check existing assignments in database
            if self._employee_has_any_assignment_on_date(employee.id, saturday, existing_assignments) or \
               self._employee_has_any_assignment_on_date(employee.id, sunday, existing_assignments):
                continue
            
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
            
            # NEW RULE: If previous week had a shift (weekday RB), then weekend must be free
            prev_week_start = saturday - timedelta(days=7)
            prev_week_end = saturday - timedelta(days=1)
            if self._employee_had_shift_in_week(employee.id, prev_week_start, prev_week_end, existing_assignments):
                continue  # Skip - previous week had a shift, weekend must be free
            
            # ALTERNATING RULE: AW → frei → RB → frei → AW → frei → RB → ...
            # Get last weekend assignment type for this employee (cross-month aware)
            # IMPORTANT: All AW assignments (Nord, Mitte, Süd) count together
            last_type = self._get_last_weekend_assignment_type(employee.id, saturday, employee_weekend_history, historical_assignments)
            
            # Get the date of the last weekend assignment
            last_weekend_date = self._get_last_weekend_assignment_date(employee.id, saturday, employee_weekend_history, historical_assignments)
            
            # If there was a previous assignment (AW or RB), check the pattern
            if last_type and last_weekend_date:
                # Calculate weeks between last assignment and current weekend
                weeks_between = (saturday - last_weekend_date).days / 7
                
                # Must have at least 1 free weekend (2 weeks) between assignments
                if weeks_between < 2:
                    continue  # Skip - not enough free weekends between
                
                # If last was AW, next must be RB (not AW again)
                if last_type == 'AW':
                    continue  # Skip - last was AW, next should be RB, not AW
                
                # If last was RB and weeks_between == 2, then this should be AW (not RB)
                # But we're planning AW, so this is correct - continue
            elif not last_type or not last_weekend_date:
                # No recent assignment - check what was two weeks before to determine pattern
                two_weeks_before = saturday - timedelta(days=14)
                two_weeks_type = self._get_weekend_assignment_type_at_date(employee.id, two_weeks_before, historical_assignments)
                
                # If two weeks before was AW, then this should be RB (but we're planning AW, so skip)
                if two_weeks_type == 'AW':
                    continue  # Two weeks before was AW, so this should be RB, not AW
                
                # If two weeks before was RB, then this should be AW (correct, continue)
                # If two weeks before was nothing, we can assign AW
            
            return employee
        
        # If no employee found with perfect pattern, use first available
        for employee in employees:
            has_rb = self._employee_has_weekend_rb(employee.id, saturday, sunday, existing_assignments)
            if not has_rb:
                return employee
        
        return None
    
    def _plan_weekend_rb(self, weekend_pairs: List[Tuple[date, date]], nursing_employees: List[Employee],
                        doctor_employees: List[Employee], existing_assignments: Dict, aw_assignments: List[Dict],
                        historical_assignments: Dict, all_planned_weekend_assignments: Dict) -> List[Dict]:
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
            weekend_pairs, nursing_employees, existing_assignments, aw_by_weekend, historical_assignments, all_planned_weekend_assignments
        )
        assignments.extend(nursing_assignments)
        # Track nursing RB assignments
        for assignment in nursing_assignments:
            all_planned_weekend_assignments[(assignment['date'], assignment['employee_id'])] = True
        
        # Plan doctor weekend RB
        doctor_assignments = self._plan_weekend_rb_doctors(
            weekend_pairs, doctor_employees, existing_assignments, aw_by_weekend, historical_assignments, all_planned_weekend_assignments
        )
        assignments.extend(doctor_assignments)
        
        return assignments
    
    def _plan_weekend_rb_nursing(self, weekend_pairs: List[Tuple[date, date]], employees: List[Employee],
                                existing_assignments: Dict, aw_by_weekend: Dict, historical_assignments: Dict,
                                all_planned_weekend_assignments: Dict) -> List[Dict]:
        """Plan weekend RB for nursing staff (with day/night rules)"""
        assignments = []
        
        available_employees = self._get_employees_with_capacity(employees, self.RB_NURSING_WEEKEND_DAY,
                                                                 [pair[0] for pair in weekend_pairs])
        
        # Track assignments per employee
        employee_weekend_history = {emp.id: [] for emp in available_employees}
        
        # Track planned RB shifts for this weekend to check day/night conflicts
        planned_rb_shifts = {}  # key: (date, employee_id) -> 'day' or 'night'
        
        for saturday, sunday in weekend_pairs:
            week = self._get_calendar_week(saturday)
            
            # Plan for each area
            for area in ['Nord', 'Süd']:
                area_employees = [e for e in available_employees if e.area == area]
                other_employees = [e for e in available_employees if e.area != area]
                
                # Plan day and night shifts
                # Rule: No night after day within same weekend (and vice versa)
                # Prefer: day-day or night-night, alternating for balance
                
                # Check if day shift needed
                sat_day_key = f"{saturday}_{self.RB_NURSING_WEEKEND_DAY}_{area}"
                sun_day_key = f"{sunday}_{self.RB_NURSING_WEEKEND_DAY}_{area}"
                
                # Check if night shift needed
                sat_night_key = f"{saturday}_{self.RB_NURSING_WEEKEND_NIGHT}_{area}"
                sun_night_key = f"{sunday}_{self.RB_NURSING_WEEKEND_NIGHT}_{area}"
                
                # Plan day shifts (both days same employee preferred)
                if sat_day_key not in existing_assignments or self.existing_assignments_handling == 'overwrite':
                    day_employee = None
                    # Try own area first
                    if area_employees:
                        day_employee = self._find_employee_for_weekend_rb_nursing(
                            area_employees, saturday, sunday, area, 'day', 
                            employee_weekend_history, existing_assignments, aw_by_weekend, week, historical_assignments,
                            all_planned_weekend_assignments, planned_rb_shifts
                        )
                    # If no employee found in own area, try other areas
                    if not day_employee and other_employees:
                        day_employee = self._find_employee_for_weekend_rb_nursing(
                            other_employees, saturday, sunday, area, 'day', 
                            employee_weekend_history, existing_assignments, aw_by_weekend, week, historical_assignments,
                            all_planned_weekend_assignments, planned_rb_shifts
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
                        # Store both dates for cross-month tracking (all RB assignments count)
                        employee_weekend_history[day_employee.id].append((saturday, 'RB', 'RB_DAY'))
                        employee_weekend_history[day_employee.id].append((sunday, 'RB', 'RB_DAY'))
                        # Mark as assigned
                        all_planned_weekend_assignments[(saturday, day_employee.id)] = True
                        all_planned_weekend_assignments[(sunday, day_employee.id)] = True
                        # Track shift type
                        planned_rb_shifts[(saturday, day_employee.id)] = 'day'
                        planned_rb_shifts[(sunday, day_employee.id)] = 'day'
                
                # Plan night shifts (both days same employee preferred, but not if day shift was assigned)
                if sat_night_key not in existing_assignments or self.existing_assignments_handling == 'overwrite':
                    night_employee = None
                    # Try own area first
                    if area_employees:
                        night_employee = self._find_employee_for_weekend_rb_nursing(
                            area_employees, saturday, sunday, area, 'night',
                            employee_weekend_history, existing_assignments, aw_by_weekend, week, historical_assignments,
                            all_planned_weekend_assignments, planned_rb_shifts
                        )
                    # If no employee found in own area, try other areas
                    if not night_employee and other_employees:
                        night_employee = self._find_employee_for_weekend_rb_nursing(
                            other_employees, saturday, sunday, area, 'night',
                            employee_weekend_history, existing_assignments, aw_by_weekend, week, historical_assignments,
                            all_planned_weekend_assignments, planned_rb_shifts
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
                        # Store both dates for cross-month tracking (all RB assignments count)
                        employee_weekend_history[night_employee.id].append((saturday, 'RB', 'RB_NIGHT'))
                        employee_weekend_history[night_employee.id].append((sunday, 'RB', 'RB_NIGHT'))
                        # Mark as assigned
                        all_planned_weekend_assignments[(saturday, night_employee.id)] = True
                        all_planned_weekend_assignments[(sunday, night_employee.id)] = True
                        # Track shift type
                        planned_rb_shifts[(saturday, night_employee.id)] = 'night'
                        planned_rb_shifts[(sunday, night_employee.id)] = 'night'
        
        return assignments
    
    def _find_employee_for_weekend_rb_nursing(self, employees: List[Employee], saturday: date, sunday: date,
                                            area: str, shift_type: str, employee_weekend_history: Dict,
                                            existing_assignments: Dict, aw_by_weekend: Dict, week: int,
                                            historical_assignments: Dict, all_planned_weekend_assignments: Dict,
                                            planned_rb_shifts: Dict) -> Optional[Employee]:
        """Find employee for weekend RB nursing shift"""
        for employee in employees:
            # Check if employee already has ANY assignment on Saturday or Sunday (only one assignment per day)
            if (saturday, employee.id) in all_planned_weekend_assignments or \
               (sunday, employee.id) in all_planned_weekend_assignments:
                continue
            
            # Check existing assignments in database
            if self._employee_has_any_assignment_on_date(employee.id, saturday, existing_assignments) or \
               self._employee_has_any_assignment_on_date(employee.id, sunday, existing_assignments):
                continue
            
            # Check if has AW this weekend
            if week in aw_by_weekend and employee.id in aw_by_weekend[week]:
                continue
            
            # Rule: No night shift after day shift within same weekend (and vice versa)
            # Check if employee already has opposite shift type (day/night) on Saturday or Sunday
            if shift_type == 'day':
                # Check for existing night shifts in database
                sat_night_key = f"{saturday}_{self.RB_NURSING_WEEKEND_NIGHT}_{area}"
                sun_night_key = f"{sunday}_{self.RB_NURSING_WEEKEND_NIGHT}_{area}"
                if sat_night_key in existing_assignments and existing_assignments[sat_night_key].employee_id == employee.id:
                    continue
                if sun_night_key in existing_assignments and existing_assignments[sun_night_key].employee_id == employee.id:
                    continue
                # Check for planned night shifts in this session
                if planned_rb_shifts.get((saturday, employee.id)) == 'night' or \
                   planned_rb_shifts.get((sunday, employee.id)) == 'night':
                    continue
            elif shift_type == 'night':
                # Check for existing day shifts in database
                sat_day_key = f"{saturday}_{self.RB_NURSING_WEEKEND_DAY}_{area}"
                sun_day_key = f"{sunday}_{self.RB_NURSING_WEEKEND_DAY}_{area}"
                if sat_day_key in existing_assignments and existing_assignments[sat_day_key].employee_id == employee.id:
                    continue
                if sun_day_key in existing_assignments and existing_assignments[sun_day_key].employee_id == employee.id:
                    continue
                # Check for planned day shifts in this session
                if planned_rb_shifts.get((saturday, employee.id)) == 'day' or \
                   planned_rb_shifts.get((sunday, employee.id)) == 'day':
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
            
            # ALTERNATING RULE: AW → frei → RB → frei → AW → frei → RB → ...
            # Get last weekend assignment type for this employee (cross-month aware)
            last_type = self._get_last_weekend_assignment_type(employee.id, saturday, employee_weekend_history, historical_assignments)
            
            # Get the date of the last weekend assignment
            last_weekend_date = self._get_last_weekend_assignment_date(employee.id, saturday, employee_weekend_history, historical_assignments)
            
            # If there was a previous assignment (AW or RB), check the pattern
            if last_type and last_weekend_date:
                # Calculate weeks between last assignment and current weekend
                weeks_between = (saturday - last_weekend_date).days / 7
                
                # Must have at least 1 free weekend (2 weeks) between assignments
                if weeks_between < 2:
                    continue  # Skip - not enough free weekends between
                
                # If last was RB, next must be AW (not RB again)
                if last_type == 'RB':
                    continue  # Skip - last was RB, next should be AW, not RB
                
                # If last was AW and weeks_between == 2, then this should be RB (correct, continue)
            elif not last_type or not last_weekend_date:
                # No recent assignment - check what was two weeks before to determine pattern
                two_weeks_before = saturday - timedelta(days=14)
                two_weeks_type = self._get_weekend_assignment_type_at_date(employee.id, two_weeks_before, historical_assignments)
                
                # If two weeks before was RB, then this should be AW (but we're planning RB, so skip)
                if two_weeks_type == 'RB':
                    continue  # Two weeks before was RB, so this should be AW, not RB
                
                # If two weeks before was AW, then this should be RB (correct, continue)
                # If two weeks before was nothing, we can assign RB
            
            # For RB: Check if we should alternate between day and night
            # Get last RB shift type (day or night) for this employee
            last_rb_shift = self._get_last_rb_shift_type(employee.id, saturday, employee_weekend_history, historical_assignments)
            if last_rb_shift:
                # If last RB was day, next should be night (or vice versa)
                if shift_type == 'day' and last_rb_shift == 'RB_DAY':
                    continue  # Last was day, should be night next
                elif shift_type == 'night' and last_rb_shift == 'RB_NIGHT':
                    continue  # Last was night, should be day next
            
            return employee
        
        # Fallback: first available
        for employee in employees:
            if week not in aw_by_weekend or employee.id not in aw_by_weekend[week]:
                return employee
        
        return None
    
    def _plan_weekend_rb_doctors(self, weekend_pairs: List[Tuple[date, date]], employees: List[Employee],
                                existing_assignments: Dict, aw_by_weekend: Dict, historical_assignments: Dict,
                                all_planned_weekend_assignments: Dict) -> List[Dict]:
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
                
                sat_key = f"{saturday}_{self.RB_DOCTORS_WEEKEND}_{area}"
                sun_key = f"{sunday}_{self.RB_DOCTORS_WEEKEND}_{area}"
                
                if (sat_key not in existing_assignments or self.existing_assignments_handling == 'overwrite') and \
                   (sun_key not in existing_assignments or self.existing_assignments_handling == 'overwrite'):
                    
                    # Try own area first
                    employee = None
                    if area_employees:
                        employee = self._find_employee_for_weekend_rb_doctors(
                            area_employees, saturday, sunday, area, employee_weekend_history,
                            existing_assignments, aw_by_weekend, week, historical_assignments, all_planned_weekend_assignments
                        )
                    # If no employee found in own area, try other areas
                    if not employee and other_employees:
                        employee = self._find_employee_for_weekend_rb_doctors(
                            other_employees, saturday, sunday, area, employee_weekend_history,
                            existing_assignments, aw_by_weekend, week, historical_assignments, all_planned_weekend_assignments
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
                        # Store both dates for cross-month tracking (all RB assignments count)
                        employee_weekend_history[employee.id].append((saturday, 'RB', 'RB'))
                        employee_weekend_history[employee.id].append((sunday, 'RB', 'RB'))
                        # Mark as assigned
                        all_planned_weekend_assignments[(saturday, employee.id)] = True
                        all_planned_weekend_assignments[(sunday, employee.id)] = True
        
        return assignments
    
    def _find_employee_for_weekend_rb_doctors(self, employees: List[Employee], saturday: date, sunday: date,
                                             area: str, employee_weekend_history: Dict, existing_assignments: Dict,
                                             aw_by_weekend: Dict, week: int, historical_assignments: Dict,
                                             all_planned_weekend_assignments: Dict) -> Optional[Employee]:
        """Find employee for weekend RB doctors"""
        for employee in employees:
            # Check if employee already has ANY assignment on Saturday or Sunday (only one assignment per day)
            if (saturday, employee.id) in all_planned_weekend_assignments or \
               (sunday, employee.id) in all_planned_weekend_assignments:
                continue
            
            # Check existing assignments in database
            if self._employee_has_any_assignment_on_date(employee.id, saturday, existing_assignments) or \
               self._employee_has_any_assignment_on_date(employee.id, sunday, existing_assignments):
                continue
            
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
            
            # ALTERNATING RULE: AW → frei → RB → frei → AW → frei → RB → ...
            # Get last weekend assignment type for this employee (cross-month aware)
            last_type = self._get_last_weekend_assignment_type(employee.id, saturday, employee_weekend_history, historical_assignments)
            
            # Get the date of the last weekend assignment
            last_weekend_date = self._get_last_weekend_assignment_date(employee.id, saturday, employee_weekend_history, historical_assignments)
            
            # If there was a previous assignment (AW or RB), check the pattern
            if last_type and last_weekend_date:
                # Calculate weeks between last assignment and current weekend
                weeks_between = (saturday - last_weekend_date).days / 7
                
                # Must have at least 1 free weekend (2 weeks) between assignments
                if weeks_between < 2:
                    continue  # Skip - not enough free weekends between
                
                # If last was RB, next must be AW (not RB again)
                if last_type == 'RB':
                    continue  # Skip - last was RB, next should be AW, not RB
                
                # If last was AW and weeks_between == 2, then this should be RB (correct, continue)
            elif not last_type or not last_weekend_date:
                # No recent assignment - check what was two weeks before to determine pattern
                two_weeks_before = saturday - timedelta(days=14)
                two_weeks_type = self._get_weekend_assignment_type_at_date(employee.id, two_weeks_before, historical_assignments)
                
                # If two weeks before was RB, then this should be AW (but we're planning RB, so skip)
                if two_weeks_type == 'RB':
                    continue  # Two weeks before was RB, so this should be AW, not RB
                
                # If two weeks before was AW, then this should be RB (correct, continue)
                # If two weeks before was nothing, we can assign RB
            
            return employee
        
        for employee in employees:
            if week not in aw_by_weekend or employee.id not in aw_by_weekend[week]:
                return employee
        
        return None
    
    def _get_last_rb_shift_type(self, employee_id: int, current_date: date, 
                                employee_weekend_history: Dict, historical_assignments: Dict) -> Optional[str]:
        """Get last RB shift type (RB_DAY or RB_NIGHT) for employee, for alternating day/night pattern"""
        # Combine current planning and historical assignments
        all_assignments = []
        
        # Add current planning (from this planning run)
        if employee_id in employee_weekend_history:
            for assign_data in employee_weekend_history[employee_id]:
                if len(assign_data) == 3:
                    assign_date, assign_type, shift_type = assign_data
                    if assign_date < current_date and assign_type == 'RB' and shift_type in ['RB_DAY', 'RB_NIGHT']:
                        all_assignments.append((assign_date, shift_type))
        
        # Add historical assignments (from database, cross-month)
        if employee_id in historical_assignments:
            for assign_data in historical_assignments[employee_id]:
                if len(assign_data) == 3:
                    assign_date, assign_type, shift_type = assign_data
                    if assign_date < current_date and assign_type == 'RB' and shift_type in ['RB_DAY', 'RB_NIGHT']:
                        all_assignments.append((assign_date, shift_type))
        
        # Sort by date (most recent first)
        all_assignments.sort(key=lambda x: x[0], reverse=True)
        
        # Find the most recent RB shift before current_date
        for assign_date, shift_type in all_assignments:
            # Only consider weekend dates
            if assign_date.weekday() in [5, 6]:  # Saturday or Sunday
                return shift_type
        
        return None
    
    def _employee_had_shift_in_week(self, employee_id: int, week_start: date, week_end: date, existing_assignments: Dict) -> bool:
        """Check if employee had any shift (weekday RB) in the given week"""
        for key, assignment in existing_assignments.items():
            if (assignment.employee_id == employee_id and
                week_start <= assignment.date <= week_end and
                assignment.duty_type in [self.RB_NURSING_WEEKDAY, self.RB_DOCTORS_WEEKDAY]):
                return True
        return False
    
    def _get_weekend_assignment_type_at_date(self, employee_id: int, target_date: date, historical_assignments: Dict) -> Optional[str]:
        """Get assignment type (AW or RB) for the weekend containing target_date"""
        # Find the Saturday of the weekend containing target_date
        if target_date.weekday() == 6:  # Sunday
            saturday = target_date - timedelta(days=1)
        elif target_date.weekday() == 5:  # Saturday
            saturday = target_date
        else:
            # Not a weekend, find the previous Saturday
            days_since_saturday = (target_date.weekday() - 5) % 7
            saturday = target_date - timedelta(days=days_since_saturday)
        
        # Check historical assignments for this weekend
        if employee_id in historical_assignments:
            for assign_data in historical_assignments[employee_id]:
                if len(assign_data) >= 2:
                    assign_date = assign_data[0]
                    assign_type = assign_data[1]
                    # Check if this assignment is in the same weekend
                    if assign_date.weekday() in [5, 6]:  # Saturday or Sunday
                        assign_saturday = assign_date if assign_date.weekday() == 5 else assign_date - timedelta(days=1)
                        if assign_saturday == saturday:
                            return assign_type
        return None
    
    def _get_employees_with_capacity(self, employees: List[Employee], duty_type: str, dates: List[date]) -> List[Employee]:
        """Get employees who have capacity for the given duty type (or all if overplanning is allowed)"""
        if self.allow_overplanning:
            # If overplanning is allowed, return all employees regardless of capacity
            return employees
        
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
        """Get last weekend assignment type for employee (for alternating pattern, cross-month aware)
        Returns: 'AW', 'RB', or None. All AW/RB assignments count, not just one per weekend."""
        # Combine current planning and historical assignments
        all_assignments = []
        
        # Add current planning (from this planning run)
        if employee_id in employee_weekend_history:
            for assign_data in employee_weekend_history[employee_id]:
                if len(assign_data) == 2:
                    assign_date, assign_type = assign_data
                    if assign_date < current_date:
                        all_assignments.append((assign_date, assign_type))
                elif len(assign_data) == 3:
                    assign_date, assign_type, shift_type = assign_data
                    if assign_date < current_date:
                        all_assignments.append((assign_date, assign_type, shift_type))
        
        # Add historical assignments (from database, cross-month)
        if employee_id in historical_assignments:
            for assign_data in historical_assignments[employee_id]:
                if len(assign_data) == 2:
                    assign_date, assign_type = assign_data
                    if assign_date < current_date:
                        all_assignments.append((assign_date, assign_type))
                elif len(assign_data) == 3:
                    assign_date, assign_type, shift_type = assign_data
                    if assign_date < current_date:
                        all_assignments.append((assign_date, assign_type, shift_type))
        
        # Sort by date (most recent first)
        all_assignments.sort(key=lambda x: x[0], reverse=True)
        
        # Find the most recent weekend assignment before current_date
        # Group by weekend (Saturday-Sunday pair) to get the last weekend with an assignment
        weekend_assignments = {}
        for assign_data in all_assignments:
            assign_date = assign_data[0]
            # Only consider weekend dates
            if assign_date.weekday() in [5, 6]:  # Saturday or Sunday
                # Get the Saturday of this weekend
                if assign_date.weekday() == 6:  # Sunday
                    saturday = assign_date - timedelta(days=1)
                else:  # Saturday
                    saturday = assign_date
                
                # Store the assignment type for this weekend (only one per weekend)
                if saturday not in weekend_assignments:
                    assign_type = assign_data[1]
                    weekend_assignments[saturday] = assign_type
        
        # Get the most recent weekend assignment
        if weekend_assignments:
            most_recent_weekend = max(weekend_assignments.keys())
            if most_recent_weekend < current_date:
                return weekend_assignments[most_recent_weekend]
        
        return None
    
    def _get_last_weekend_assignment_date(self, employee_id: int, current_date: date, 
                                         employee_weekend_history: Dict, historical_assignments: Dict) -> Optional[date]:
        """Get the date (Saturday) of the last weekend assignment for employee"""
        # Combine current planning and historical assignments
        all_assignments = []
        
        # Add current planning (from this planning run)
        if employee_id in employee_weekend_history:
            for assign_data in employee_weekend_history[employee_id]:
                if len(assign_data) >= 2:
                    assign_date = assign_data[0]
                    if assign_date < current_date:
                        all_assignments.append(assign_date)
        
        # Add historical assignments (from database, cross-month)
        if employee_id in historical_assignments:
            for assign_data in historical_assignments[employee_id]:
                if len(assign_data) >= 2:
                    assign_date = assign_data[0]
                    if assign_date < current_date:
                        all_assignments.append(assign_date)
        
        # Sort by date (most recent first)
        all_assignments.sort(reverse=True)
        
        # Find the most recent weekend assignment before current_date
        # Group by weekend (Saturday-Sunday pair) to get the last weekend with an assignment
        weekend_dates = set()
        for assign_date in all_assignments:
            # Only consider weekend dates
            if assign_date.weekday() in [5, 6]:  # Saturday or Sunday
                # Get the Saturday of this weekend
                if assign_date.weekday() == 6:  # Sunday
                    saturday = assign_date - timedelta(days=1)
                else:  # Saturday
                    saturday = assign_date
                weekend_dates.add(saturday)
        
        # Get the most recent weekend assignment
        if weekend_dates:
            most_recent_weekend = max(weekend_dates)
            if most_recent_weekend < current_date:
                return most_recent_weekend
        
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
