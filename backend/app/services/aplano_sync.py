import calendar
import re
import unicodedata
from collections import defaultdict
import requests
from datetime import datetime, date
from typing import Any, List, Dict, Optional
from app import db
from app.models.employee import Employee
from app.models.employee_planning import EmployeePlanning
from config import Config


def aplano_user_display_name(user: Any) -> str:
    """Normalize ``user`` (string or expanded object) for name matching."""
    if user is None:
        return ''
    if isinstance(user, str):
        return user.strip()
    if isinstance(user, dict):
        n = user.get('name')
        if isinstance(n, str) and n.strip():
            return n.strip()
        fn = user.get('firstName') or user.get('first_name') or ''
        ln = user.get('lastName') or user.get('last_name') or ''
        if fn or ln:
            return f'{str(fn).strip()} {str(ln).strip()}'.strip()
        for key in ('displayName', 'fullName', 'label'):
            v = user.get(key)
            if isinstance(v, str) and v.strip():
                return v.strip()
        return ''
    if isinstance(user, list) and user:
        return aplano_user_display_name(user[0])
    return ''


def aplano_workspace_label(work_space: Any) -> str:
    """Readable workspace / Schichtname; never ``str(dict)`` (false AW/RB matches)."""
    if work_space is None or work_space == '':
        return ''
    if isinstance(work_space, str):
        return work_space.strip()
    if isinstance(work_space, dict):
        for key in ('name', 'title', 'label', 'displayName', 'code'):
            v = work_space.get(key)
            if isinstance(v, str) and v.strip():
                return v.strip()
        nested = work_space.get('workspace') or work_space.get('workSpace')
        if nested is not None and nested is not work_space:
            return aplano_workspace_label(nested)
        return ''
    if isinstance(work_space, list) and work_space:
        return aplano_workspace_label(work_space[0])
    return ''


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


def fetch_aplano_shifts_for_month(month_start_date: date) -> List[Dict]:
    """
    Fetch shifts from Aplano API for a given month (start date of month).

    One request with ``from``/``to`` over the full month (``month=`` is not supported on ``/shifts``).

    Args:
        month_start_date: First day of the month (e.g. date(2025, 1, 1))

    Returns:
        List of shift dictionaries from Aplano API.

    Raises:
        Exception: If API request fails
    """
    if not Config.APLANO_API_KEY:
        raise Exception("APLANO_API_KEY not configured")

    y, m = month_start_date.year, month_start_date.month
    month_end = date(y, m, calendar.monthrange(y, m)[1])

    url = f"{Config.APLANO_API_BASE_URL}/shifts"
    params = {
        'expand': 'true',
        'from': month_start_date.strftime('%Y-%m-%d'),
        'to': month_end.strftime('%Y-%m-%d'),
    }
    headers = {
        'accept': 'application/json',
        'Authorization': f'Bearer {Config.APLANO_API_KEY}',
    }

    try:
        response = requests.get(url, params=params, headers=headers, timeout=60)
        response.raise_for_status()
        data = response.json()
        return data.get('data', [])
    except requests.exceptions.RequestException as e:
        raise Exception(f"Aplano API request failed: {str(e)}")
    except Exception as e:
        raise Exception(f"Error processing Aplano data: {str(e)}")


def _normalize_person_name_key(name: str) -> str:
    """Stable key for comparison: Unicode-normalize, collapse space, case-insensitive."""
    if not name or not (s := str(name).strip()):
        return ''
    s = unicodedata.normalize('NFKC', s)
    s = re.sub(r'\s+', ' ', s)
    return s.casefold()


def _unique_employee(candidates: List[Employee]) -> Optional[Employee]:
    if not candidates:
        return None
    ids = {e.id for e in candidates}
    if len(ids) != 1:
        return None
    return candidates[0]


def _aplano_last_name_matches_db(
    aplano_last_key: str, db_last_key: str
) -> bool:
    """
    Aplano oft nur erster Nachnamensteil: ``Zimmermann`` soll zu DB-``Zimmermann-Hall`` passen.
    Beide Argumente bereits ``_normalize_person_name_key``-normalisiert.
    """
    if not aplano_last_key or not db_last_key:
        return False
    if db_last_key == aplano_last_key:
        return True
    first_seg = db_last_key.split('-', 1)[0]
    return bool(first_seg) and first_seg == aplano_last_key


def match_employee_by_name(aplano_user_name: str, employees: List[Employee]) -> Optional[Employee]:
    """
    Match Aplano (or similar) display name to an Employee.

    Same rules as used for KW-Planung / Aplano-Sync: exact name, normalized full name,
    Bindestrich-Nachnamen (Aplano ``… Zimmermann`` → DB ``… Zimmermann-Hall``),
    ``Employee.alias`` (Komma/Semikolon), ``Nachname, Vorname``, zwei Wörter vertauscht.
    """
    raw = (aplano_user_name or '').strip()
    if not raw:
        return None

    for employee in employees:
        full_name = f'{employee.first_name} {employee.last_name}'
        if full_name == raw:
            return employee

    n_aplano = _normalize_person_name_key(raw)
    if not n_aplano:
        return None

    hits = [
        e for e in employees
        if _normalize_person_name_key(f'{e.first_name} {e.last_name}') == n_aplano
    ]
    u = _unique_employee(hits)
    if u is not None:
        return u

    # Voller Name mit verkürztem Nachnamen aus Aplano: „Marion Zimmermann“ → DB „Marion Zimmermann-Hall“
    hits = []
    for e in employees:
        if '-' not in (e.last_name or ''):
            continue
        first_ln = e.last_name.split('-', 1)[0].strip()
        syn = _normalize_person_name_key(f'{e.first_name} {first_ln}')
        if syn == n_aplano:
            hits.append(e)
    u = _unique_employee(hits)
    if u is not None:
        return u

    alias_hits: List[Employee] = []
    for e in employees:
        if not e.alias:
            continue
        for part in re.split(r'[,;]', e.alias):
            if _normalize_person_name_key(part) == n_aplano:
                alias_hits.append(e)
                break
    u = _unique_employee(alias_hits)
    if u is not None:
        return u

    if ',' in raw:
        left, right = [p.strip() for p in raw.split(',', 1)]
        if left and right:
            nl, nr = _normalize_person_name_key(left), _normalize_person_name_key(right)
            hits = [
                e for e in employees
                if _normalize_person_name_key(e.first_name) == nr
                and _aplano_last_name_matches_db(nl, _normalize_person_name_key(e.last_name))
            ]
            u = _unique_employee(hits)
            if u is not None:
                return u

    parts = raw.split()
    if len(parts) == 2:
        a = _normalize_person_name_key(parts[0])
        b = _normalize_person_name_key(parts[1])
        hits = []
        for e in employees:
            fn = _normalize_person_name_key(e.first_name)
            ln = _normalize_person_name_key(e.last_name)
            if (a == fn and b == ln) or (a == ln and b == fn):
                hits.append(e)
        u = _unique_employee(hits)
        if u is not None:
            return u

        hits = []
        for e in employees:
            fn = _normalize_person_name_key(e.first_name)
            ln = _normalize_person_name_key(e.last_name)
            if a == fn and _aplano_last_name_matches_db(b, ln):
                hits.append(e)
        u = _unique_employee(hits)
        if u is not None:
            return u

        hits = []
        for e in employees:
            fn = _normalize_person_name_key(e.first_name)
            ln = _normalize_person_name_key(e.last_name)
            if b == fn and _aplano_last_name_matches_db(a, ln):
                hits.append(e)
        u = _unique_employee(hits)
        if u is not None:
            return u

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
        
        employees = list(Employee.query.all())

        # Nach Mitarbeiter-ID (gleiche Logik wie match_employee_by_name — konsistent zur Übersicht)
        shifts_by_eid: Dict[int, Dict[str, List[Dict]]] = defaultdict(lambda: defaultdict(list))
        for shift in shifts:
            user_name = aplano_user_display_name(shift.get('user'))
            shift_date = shift.get('date', '')
            ws_label = aplano_workspace_label(shift.get('workSpace'))

            if not user_name or not shift_date:
                continue

            emp = match_employee_by_name(user_name, employees)
            if emp is None:
                continue

            is_absent = 'RB' in ws_label.upper()
            shifts_by_eid[emp.id][shift_date].append({
                'is_absent': is_absent,
                'work_space': ws_label,
            })

        absences_by_eid: Dict[int, Dict[str, str]] = defaultdict(dict)
        for absence in absences:
            user_name = aplano_user_display_name(absence.get('user'))
            start_date_str = absence.get('startDate', '')
            end_date_str = absence.get('endDate', '')
            absence_type = absence.get('type', '')
            status = absence.get('status', '')

            if not user_name or not start_date_str or not end_date_str or status != 'active':
                continue

            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            except ValueError:
                continue

            emp = match_employee_by_name(user_name, employees)
            if emp is None:
                continue

            current_year = datetime.now().year
            week_start = date.fromisocalendar(current_year, calendar_week, 1)
            week_end = date.fromisocalendar(current_year, calendar_week, 7)

            effective_start = max(start_date, week_start)
            effective_end = min(end_date, week_end)

            current_date = effective_start
            while current_date <= effective_end:
                date_str = current_date.strftime('%Y-%m-%d')
                absences_by_eid[emp.id][date_str] = absence_type
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
            shifts_for_employee = dict(shifts_by_eid.get(employee.id, {}))
            absences_for_employee = dict(absences_by_eid.get(employee.id, {}))
            
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
