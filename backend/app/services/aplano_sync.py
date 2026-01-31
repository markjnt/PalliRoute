import requests
from datetime import datetime, date
from typing import List, Dict, Optional
from app import db
from app.models.employee import Employee
from app.models.employee_planning import EmployeePlanning
from config import Config

def fetch_aplano_shifts(calendar_week: int) -> List[Dict]:
    """
    Fetch shifts from Aplano API for a given calendar week
    
    Args:
        calendar_week: Calendar week number
        
    Returns:
        List of shift dictionaries from Aplano API
        
    Raises:
        Exception: If API request fails
    """
    if not Config.APLANO_API_KEY:
        raise Exception("APLANO_API_KEY not configured")
    
    # Calculate from/to dates for the calendar week
    current_year = datetime.now().year
    
    # Get Monday (start of week) and Sunday (end of week) for the calendar week
    monday_date = date.fromisocalendar(current_year, calendar_week, 1)
    sunday_date = date.fromisocalendar(current_year, calendar_week, 7)
    
    # Format dates as YYYY-MM-DD for API
    from_date = monday_date.strftime('%Y-%m-%d')
    to_date = sunday_date.strftime('%Y-%m-%d')
    
    url = f"{Config.APLANO_API_BASE_URL}/shifts"
    params = {
        'expand': 'true',
        'from': from_date,
        'to': to_date
    }
    headers = {
        'accept': 'application/json',
        'Authorization': f'Bearer {Config.APLANO_API_KEY}'
    }
    
    try:
        response = requests.get(url, params=params, headers=headers, timeout=30)
        response.raise_for_status()
        
        data = response.json()
        return data.get('data', [])
        
    except requests.exceptions.RequestException as e:
        raise Exception(f"Aplano API request failed: {str(e)}")
    except Exception as e:
        raise Exception(f"Error processing Aplano data: {str(e)}")


def fetch_aplano_absences(calendar_week: int) -> List[Dict]:
    """
    Fetch absences from Aplano API for a given calendar week
    
    Args:
        calendar_week: Calendar week number
        
    Returns:
        List of absence dictionaries from Aplano API
        
    Raises:
        Exception: If API request fails
    """
    if not Config.APLANO_API_KEY:
        raise Exception("APLANO_API_KEY not configured")
    
    # Calculate Monday (first day of week) for the calendar week
    current_year = datetime.now().year
    monday_date = date.fromisocalendar(current_year, calendar_week, 1)
    
    # Format date as YYYY-MM-DD for API (first day of week)
    week_date = monday_date.strftime('%Y-%m-%d')
    
    url = f"{Config.APLANO_API_BASE_URL}/absences"
    params = {
        'expand': 'true',
        'week': week_date
    }
    headers = {
        'accept': 'application/json',
        'Authorization': f'Bearer {Config.APLANO_API_KEY}'
    }
    
    try:
        response = requests.get(url, params=params, headers=headers, timeout=30)
        response.raise_for_status()
        
        data = response.json()
        return data.get('data', [])
        
    except requests.exceptions.RequestException as e:
        raise Exception(f"Aplano API request failed: {str(e)}")
    except Exception as e:
        raise Exception(f"Error processing Aplano data: {str(e)}")


def fetch_aplano_absences_for_month(month_start_date: date) -> List[Dict]:
    """
    Fetch absences from Aplano API for a given month (start date of month).

    Args:
        month_start_date: First day of the month (e.g. date(2025, 1, 1))

    Returns:
        List of absence dictionaries from Aplano API (user, startDate, endDate, type, status)

    Raises:
        Exception: If API request fails
    """
    if not Config.APLANO_API_KEY:
        raise Exception("APLANO_API_KEY not configured")

    month_str = month_start_date.strftime('%Y-%m-%d')
    url = f"{Config.APLANO_API_BASE_URL}/absences"
    params = {
        'expand': 'true',
        'month': month_str,
    }
    headers = {
        'accept': 'application/json',
        'Authorization': f'Bearer {Config.APLANO_API_KEY}',
    }

    try:
        response = requests.get(url, params=params, headers=headers, timeout=30)
        response.raise_for_status()
        data = response.json()
        return data.get('data', [])
    except requests.exceptions.RequestException as e:
        raise Exception(f"Aplano API request failed: {str(e)}")
    except Exception as e:
        raise Exception(f"Error processing Aplano data: {str(e)}")


def match_employee_by_name(aplano_user_name: str, employees: List[Employee]) -> Optional[Employee]:
    """
    Match Aplano user name to Employee record by comparing full names
    
    Args:
        aplano_user_name: User name from Aplano (e.g., "Xenia Matjuchin")
        employees: List of Employee objects
        
    Returns:
        Matching Employee object or None if no match found
    """
    for employee in employees:
        full_name = f"{employee.first_name} {employee.last_name}"
        if full_name == aplano_user_name:
            return employee
    return None


def date_to_weekday_string(date_str: str) -> str:
    """
    Convert Aplano date string to weekday string used in database
    
    Args:
        date_str: Date string in format 'YYYY-MM-DD'
        
    Returns:
        Weekday string (monday, tuesday, etc.)
    """
    date_obj = datetime.strptime(date_str, '%Y-%m-%d')
    weekday_num = date_obj.weekday()  # 0=Monday, 6=Sunday
    
    weekday_map = {
        0: 'monday',
        1: 'tuesday', 
        2: 'wednesday',
        3: 'thursday',
        4: 'friday',
        5: 'saturday',
        6: 'sunday'
    }
    
    return weekday_map[weekday_num]


def sync_employee_planning(calendar_week: int) -> bool:
    """
    Sync employee planning with Aplano shift data
    
    Args:
        calendar_week: Calendar week number to sync
        
    Returns:
        True if sync successful, False otherwise
    """
    try:
        if not getattr(Config, 'APLANO_API_KEY', None):
            print(f"[sync_employee_planning] APLANO_API_KEY not configured - skipping sync for KW {calendar_week}")
            return True

        # Fetch shifts and absences from Aplano
        shifts = fetch_aplano_shifts(calendar_week)
        absences = fetch_aplano_absences(calendar_week)
        
        employees = Employee.query.all()
        
        # Group shifts by employee and date (multiple shifts per day possible)
        employee_shifts = {}
        for shift in shifts:
            user_name = shift.get('user', '')
            shift_date = shift.get('date', '')
            work_space = shift.get('workSpace', '')
            
            if not user_name or not shift_date:
                continue
                
            # Check if workSpace contains "RB" (absence indicator)
            is_absent = 'RB' in work_space
            
            if user_name not in employee_shifts:
                employee_shifts[user_name] = {}
            
            if shift_date not in employee_shifts[user_name]:
                employee_shifts[user_name][shift_date] = []
            
            employee_shifts[user_name][shift_date].append({
                'is_absent': is_absent,
                'work_space': work_space
            })
        
        # Group absences by employee and date range
        employee_absences = {}
        for absence in absences:
            user_name = absence.get('user', '')
            start_date_str = absence.get('startDate', '')
            end_date_str = absence.get('endDate', '')
            absence_type = absence.get('type', '')
            status = absence.get('status', '')
            
            if not user_name or not start_date_str or not end_date_str or status != 'active':
                continue
            
            # Parse dates
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            except ValueError:
                continue
            
            # Get week boundaries
            current_year = datetime.now().year
            week_start = date.fromisocalendar(current_year, calendar_week, 1)
            week_end = date.fromisocalendar(current_year, calendar_week, 7)
            
            # Clamp dates to week boundaries
            effective_start = max(start_date, week_start)
            effective_end = min(end_date, week_end)
            
            if user_name not in employee_absences:
                employee_absences[user_name] = {}
            
            # Add absence for each day in the effective range
            current_date = effective_start
            while current_date <= effective_end:
                date_str = current_date.strftime('%Y-%m-%d')
                employee_absences[user_name][date_str] = absence_type
                current_date = date.fromordinal(current_date.toordinal() + 1)
        
        # Get existing planning entries for this week
        existing_entries = EmployeePlanning.query.filter_by(calendar_week=calendar_week).all()
        existing_entries_map = {}
        for entry in existing_entries:
            key = f"{entry.employee_id}_{entry.weekday}"
            existing_entries_map[key] = entry
        
        # Update or create planning entries
        weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        new_entries = []
        
        for employee in employees:
            # Get employee's shifts and absences for this week
            employee_name = f"{employee.first_name} {employee.last_name}"
            shifts_for_employee = employee_shifts.get(employee_name, {})
            absences_for_employee = employee_absences.get(employee_name, {})
            
            for weekday in weekdays:
                # Calculate the date for this weekday in the calendar week
                weekday_num = weekdays.index(weekday) + 1  # 1=Monday, 7=Sunday
                weekday_date = date.fromisocalendar(datetime.now().year, calendar_week, weekday_num)
                date_str = weekday_date.strftime('%Y-%m-%d')
                
                # Check if employee has absence on this date
                absence_type = absences_for_employee.get(date_str)
                
                if absence_type:
                    # Employee has absence - not available with custom text
                    available = False
                    custom_text = absence_type
                else:
                    # Check if employee has shifts on this date
                    shifts_for_date = shifts_for_employee.get(date_str, [])
                    
                    if shifts_for_date:
                        # Check if at least one shift has a valid tour/AW and is not absent (no RB)
                        available_shift = None
                        custom_text = None
                        is_weekend = weekday in ['saturday', 'sunday']
                        
                        for shift_info in shifts_for_date:
                            # Skip if shift has RB (absent)
                            if shift_info['is_absent']:
                                continue
                            
                            work_space_value = shift_info.get('work_space', '')
                            
                            # Check for valid tour/AW based on weekday
                            if is_weekend:
                                # Weekend: check if AW is present, then check for Nord, Süd, or Mitte
                                if 'AW' in work_space_value:
                                    if 'Nord' in work_space_value:
                                        available_shift = shift_info
                                        custom_text = 'AW Nord'
                                        break
                                    elif 'Süd' in work_space_value:
                                        available_shift = shift_info
                                        custom_text = 'AW Süd'
                                        break
                                    elif 'Mitte' in work_space_value:
                                        available_shift = shift_info
                                        custom_text = 'AW Mitte'
                                        break
                            else:
                                # Weekday: check for Tour Nord or Tour Süd
                                if 'Tour Nord' in work_space_value:
                                    available_shift = shift_info
                                    custom_text = 'Tour Nord'
                                    break
                                elif 'Tour Süd' in work_space_value:
                                    available_shift = shift_info
                                    custom_text = 'Tour Süd'
                                    break
                        
                        available = available_shift is not None
                    else:
                        # No shift - employee is absent
                        available = False
                        custom_text = None
                
                # Check if entry already exists
                key = f"{employee.id}_{weekday}"
                existing_entry = existing_entries_map.get(key)
                
                if existing_entry:
                    # Update existing entry (preserve replacement_id)
                    existing_entry.available = available
                    existing_entry.custom_text = custom_text
                    # replacement_id stays unchanged
                else:
                    # Create new entry
                    new_entry = EmployeePlanning(
                        employee_id=employee.id,
                        weekday=weekday,
                        available=available,
                        custom_text=custom_text,
                        replacement_id=None,  # New entries start without replacement
                        calendar_week=calendar_week
                    )
                    new_entries.append(new_entry)
        
        # Add new entries to session
        if new_entries:
            db.session.add_all(new_entries)
        
        db.session.commit()
        
        return True
        
    except Exception as e:
        db.session.rollback()
        print(f"[sync_employee_planning] Error while syncing calendar week {calendar_week}: {e}")
        return False
