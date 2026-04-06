"""
Load all data required for the CP-SAT planning model:
time range (planning month + previous month), shift instances, employees with roles,
employee capacities, and existing assignments (for RESPECT).
"""

from calendar import monthrange
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Any, Dict, List, Optional, Set, Tuple

from app import db
from app.models.employee import Employee
from app.models.scheduling import ShiftInstance, ShiftDefinition, EmployeeCapacity, Assignment

from .roles import employee_role, ROLE_NURSING, ROLE_DOCTOR

# Canonical area names used by shift definitions; employee area may be "Nordkreis" etc.
_AREA_ALIASES = {
    'nord': 'Nord',
    'nordkreis': 'Nord',
    'süd': 'Süd',
    'sued': 'Süd',
    'südkreis': 'Süd',
    'suedkreis': 'Süd',
    'mitte': 'Mitte',
}


def _normalize_area(value: Optional[str]) -> Optional[str]:
    """Normalize area string to canonical form (Nord, Süd, Mitte) for comparison."""
    if not value or not (s := value.strip()):
        return None
    key = s.lower()
    # Unbekannte Gebiete: immer lowercase, damit Vergleiche (z. B. MA vs. Schicht) nicht an der Schreibung scheitern.
    return _AREA_ALIASES.get(key, key)


def _get_calendar_week(d: date) -> int:
    return d.isocalendar()[1]


@dataclass
class PlanableEmployee:
    """Employee included in the solver with index, role, optional area and optional home coordinates."""
    index: int
    id: int
    role: str  # NURSING | DOCTOR
    area: Optional[str] = None  # Nord, Süd, Mitte oder None (Stammbereich)
    latitude: Optional[float] = None  # Wohnort für Distanz zum Tour-Start
    longitude: Optional[float] = None


@dataclass
class ShiftInfo:
    """Shift instance with definition cached for solver."""
    index: int
    id: int
    date: date
    calendar_week: int
    month: str
    category: str
    role: str
    area: str
    time_of_day: str
    is_weekday: bool
    is_weekend: bool


def _shift_slot_key(s: ShiftInfo) -> Tuple[str, str, str]:
    """Category + role + time_of_day — same logical slot type (AW vs RB Tag/Nacht etc.)."""
    return (
        (s.category or '').upper(),
        (s.role or '').upper(),
        (s.time_of_day or '').upper(),
    )


def _pick_single_external_shift(
    candidates: List[int],
    e_idx: int,
    shift_infos: List[ShiftInfo],
    employees: List[PlanableEmployee],
) -> Optional[int]:
    """Pick exactly one shift index when Aplano maps to multiple DB slots (e.g. area unknown)."""
    if not candidates:
        return None
    uniq = sorted(set(candidates), key=lambda i: shift_infos[i].id)
    if len(uniq) == 1:
        return uniq[0]
    emp_area = employees[e_idx].area if 0 <= e_idx < len(employees) else None
    if emp_area:
        emp_key = _normalize_area(emp_area)
        for s_idx in uniq:
            if _normalize_area(shift_infos[s_idx].area) == emp_key:
                return s_idx
    return uniq[0]


@dataclass
class PlanningContext:
    """All input data for one planning run."""
    planning_month: str  # YYYY-MM
    start_date: date
    end_date: date
    prev_month_start: date
    prev_month_end: date
    employees: List[PlanableEmployee] = field(default_factory=list)
    shifts: List[ShiftInfo] = field(default_factory=list)
    # employee_id -> { capacity_type -> max_count } for planning month
    capacity_max: Dict[int, Dict[str, int]] = field(default_factory=dict)
    # fixed (e_idx, s_idx) when existing_assignments_handling == RESPECT
    fixed_assignments: Set[Tuple[int, int]] = field(default_factory=set)
    # employee_id -> e_idx, shift_instance_id -> s_idx
    employee_id_to_idx: Dict[int, int] = field(default_factory=dict)
    shift_id_to_idx: Dict[int, int] = field(default_factory=dict)
    # (employee_id, date) pairs where employee is absent and must not be assigned
    absent_dates: Set[Tuple[int, date]] = field(default_factory=set)


def load_planning_context(
    start_date: date,
    end_date: date,
    existing_assignments_handling: str,
    absent_dates: Optional[Set[Tuple[int, date]]] = None,
    external_fixed_assignments: Optional[List[Dict[str, Any]]] = None,
) -> PlanningContext:
    """
    Load planning context for the given date range.
    Derives planning month from start_date/end_date; includes previous month for W2/W3.
    """
    # Planning month: use start_date month
    planning_month = start_date.strftime('%Y-%m')
    year, month_num = start_date.year, start_date.month
    _, last_day = monthrange(year, month_num)
    ctx_start = date(year, month_num, 1)
    ctx_end = date(year, month_num, last_day)

    # Previous month for weekend rotation / day-night evaluation
    if month_num == 1:
        prev_year, prev_month = year - 1, 12
    else:
        prev_year, prev_month = year, month_num - 1
    _, prev_last = monthrange(prev_year, prev_month)
    prev_month_start = date(prev_year, prev_month, 1)
    prev_month_end = date(prev_year, prev_month, prev_last)

    # Load shift instances: planning month + previous month (with definitions).
    # Wenn der Planungsmonat an einem Samstag endet: Sonntag mit laden, damit H6/H7
    # (gleicher MA für Sa+So / gleiche Tagesart) für das Wochenende greifen.
    load_start = prev_month_start
    load_end = ctx_end
    if ctx_end.weekday() == 5:  # Saturday
        load_end = ctx_end + timedelta(days=1)  # include Sunday
    shift_instances = (
        db.session.query(ShiftInstance)
        .join(ShiftDefinition)
        .filter(ShiftInstance.date >= load_start, ShiftInstance.date <= load_end)
        .order_by(ShiftInstance.date, ShiftInstance.id)
        .all()
    )
    # Eager load shift_definition to avoid lazy load
    shift_infos: List[ShiftInfo] = []
    for i, si in enumerate(shift_instances):
        sd = si.shift_definition
        shift_infos.append(ShiftInfo(
            index=i,
            id=si.id,
            date=si.date,
            calendar_week=si.calendar_week,
            month=si.month,
            category=sd.category,
            role=sd.role,
            area=_normalize_area(sd.area) or sd.area,
            time_of_day=sd.time_of_day,
            is_weekday=sd.is_weekday,
            is_weekend=sd.is_weekend,
        ))

    # Employees with planable role
    all_employees = Employee.query.all()
    planable: List[PlanableEmployee] = []
    employee_id_to_idx: Dict[int, int] = {}
    for emp in all_employees:
        role = employee_role(emp)
        if role in (ROLE_NURSING, ROLE_DOCTOR):
            idx = len(planable)
            area = _normalize_area(getattr(emp, 'area', None))
            planable.append(PlanableEmployee(
                index=idx, id=emp.id, role=role, area=area,
                latitude=getattr(emp, 'latitude', None),
                longitude=getattr(emp, 'longitude', None),
            ))
            employee_id_to_idx[emp.id] = idx

    # Capacity: for planning month only, all 5 types per employee
    capacity_types = [
        'RB_NURSING_WEEKDAY', 'RB_NURSING_WEEKEND', 'RB_DOCTORS_WEEKDAY',
        'RB_DOCTORS_WEEKEND', 'AW_NURSING',
    ]
    capacity_max: Dict[int, Dict[str, int]] = {}
    capacities = EmployeeCapacity.query.filter(
        EmployeeCapacity.employee_id.in_(employee_id_to_idx),
        EmployeeCapacity.capacity_type.in_(capacity_types),
    ).all()
    for cap in capacities:
        if cap.employee_id not in capacity_max:
            capacity_max[cap.employee_id] = {ct: 0 for ct in capacity_types}
        capacity_max[cap.employee_id][cap.capacity_type] = cap.max_count
    for eid in employee_id_to_idx:
        if eid not in capacity_max:
            capacity_max[eid] = {ct: 0 for ct in capacity_types}

    # Mitarbeiter ohne jegliche Kapazität aus Planung ausschließen (gilt mit und ohne Überplanung)
    employees_with_capacity = [
        eid for eid in employee_id_to_idx
        if sum(capacity_max.get(eid, {}).values()) > 0
    ]
    # planable, employee_id_to_idx, capacity_max neu aufbauen
    planable = []
    employee_id_to_idx = {}
    for emp in all_employees:
        if emp.id not in employees_with_capacity:
            continue
        role = employee_role(emp)
        if role in (ROLE_NURSING, ROLE_DOCTOR):
            idx = len(planable)
            area = _normalize_area(getattr(emp, 'area', None))
            planable.append(PlanableEmployee(
                index=idx, id=emp.id, role=role, area=area,
                latitude=getattr(emp, 'latitude', None),
                longitude=getattr(emp, 'longitude', None),
            ))
            employee_id_to_idx[emp.id] = idx
    capacity_max = {eid: capacity_max[eid] for eid in employees_with_capacity}

    # Shift id -> index
    shift_id_to_idx = {s.id: s.index for s in shift_infos}

    # Feste Assignments (nur Solver-Input; nichts wird in der DB überschrieben):
    # - Planungsmonat bei RESPECT: aus DB
    # - Folgetag (z. B. So nach Monatsende): aus DB
    # - Vormonat: aus DB; wenn Aplano-Historie mitmatcht, wird für diesen Tag nur der
    #   Solver-Fix durch den Aplano-Match ersetzt (DB-Zeilen bleiben unverändert).
    # RESPECT/OVERWRITE gilt nur für den ausgewählten Planungsmonat.
    fixed_assignments: Set[Tuple[int, int]] = set()
    existing = (
        db.session.query(Assignment)
        .join(ShiftInstance)
        .filter(
            Assignment.source.in_(['SOLVER', 'MANUAL']),
            ShiftInstance.date >= load_start,
            ShiftInstance.date <= load_end,
        )
        .all()
    )
    for a in existing:
        e_idx = employee_id_to_idx.get(a.employee_id)
        s_idx = shift_id_to_idx.get(a.shift_instance_id)
        if e_idx is None or s_idx is None:
            continue
        shift_date = a.shift_instance.date
        if shift_date < ctx_start or shift_date > ctx_end:
            fixed_assignments.add((e_idx, s_idx))
        elif existing_assignments_handling.lower() == 'respect':
            # Planungsmonat: nur bei RESPECT fixieren
            fixed_assignments.add((e_idx, s_idx))

    if external_fixed_assignments:
        # Lookup für Shift-Matching aus Aplano-Historie:
        # (date, category, role, time_of_day, area?) -> shift indices
        lookup_exact: Dict[Tuple[date, str, str, str, Optional[str]], List[int]] = {}
        lookup_area_agnostic: Dict[Tuple[date, str, str, str], List[int]] = {}
        for s in shift_infos:
            exact_key = (
                s.date,
                (s.category or '').upper(),
                (s.role or '').upper(),
                (s.time_of_day or '').upper(),
                _normalize_area(s.area),
            )
            lookup_exact.setdefault(exact_key, []).append(s.index)
            no_area_key = (
                s.date,
                (s.category or '').upper(),
                (s.role or '').upper(),
                (s.time_of_day or '').upper(),
            )
            lookup_area_agnostic.setdefault(no_area_key, []).append(s.index)

        grouped: Dict[Tuple[int, date], List[Dict[str, Any]]] = defaultdict(list)
        for item in external_fixed_assignments:
            employee_id = item.get('employee_id')
            assign_date = item.get('date')
            if employee_id is None or assign_date is None or assign_date >= ctx_start:
                continue
            grouped[(employee_id, assign_date)].append(item)

        for (employee_id, assign_date), items in grouped.items():
            e_idx = employee_id_to_idx.get(employee_id)
            if e_idx is None:
                continue

            chosen_s_idx: Optional[int] = None
            for item in items:
                category = str(item.get('category', '')).upper()
                role = str(item.get('role', '')).upper()
                time_of_day = str(item.get('time_of_day', '')).upper()
                area = _normalize_area(item.get('area'))

                exact_key = (assign_date, category, role, time_of_day, area)
                candidates = lookup_exact.get(exact_key, [])

                if not candidates:
                    no_area_key = (assign_date, category, role, time_of_day)
                    candidates = lookup_area_agnostic.get(no_area_key, [])

                chosen_s_idx = _pick_single_external_shift(candidates, e_idx, shift_infos, planable)
                if chosen_s_idx is not None:
                    break

            if chosen_s_idx is None:
                continue

            # Nur DB-„Konflikt“ für denselben Schicht-Typ ersetzen (AW vs. RB), nicht den ganzen Tag.
            slot_key = _shift_slot_key(shift_infos[chosen_s_idx])
            to_remove = [
                pair for pair in fixed_assignments
                if pair[0] == e_idx
                and shift_infos[pair[1]].date == assign_date
                and _shift_slot_key(shift_infos[pair[1]]) == slot_key
            ]
            for pair in to_remove:
                fixed_assignments.discard(pair)
            fixed_assignments.add((e_idx, chosen_s_idx))

    ctx = PlanningContext(
        planning_month=planning_month,
        start_date=ctx_start,
        end_date=ctx_end,
        prev_month_start=prev_month_start,
        prev_month_end=prev_month_end,
        employees=planable,
        shifts=shift_infos,
        capacity_max=capacity_max,
        fixed_assignments=fixed_assignments,
        employee_id_to_idx=employee_id_to_idx,
        shift_id_to_idx=shift_id_to_idx,
        absent_dates=absent_dates if absent_dates is not None else set(),
    )
    return ctx
