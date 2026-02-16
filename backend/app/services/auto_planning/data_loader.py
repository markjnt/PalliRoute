"""
Load all data required for the CP-SAT planning model:
time range (planning month + previous month), shift instances, employees with roles,
employee capacities, and existing assignments (for RESPECT).
"""

from calendar import monthrange
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Dict, List, Optional, Set, Tuple

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
    return _AREA_ALIASES.get(key, s)


def _get_calendar_week(d: date) -> int:
    return d.isocalendar()[1]


@dataclass
class PlanableEmployee:
    """Employee included in the solver with index, role and optional area."""
    index: int
    id: int
    role: str  # NURSING | DOCTOR
    area: Optional[str] = None  # Nord, Süd, Mitte oder None (Stammbereich)


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
            planable.append(PlanableEmployee(index=idx, id=emp.id, role=role, area=area))
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
            planable.append(PlanableEmployee(index=idx, id=emp.id, role=role, area=area))
            employee_id_to_idx[emp.id] = idx
    capacity_max = {eid: capacity_max[eid] for eid in employees_with_capacity}

    # Shift id -> index
    shift_id_to_idx = {s.id: s.index for s in shift_infos}

    # Feste Assignments: Vormonat und Folgetag (z. B. So 1.2.) werden immer respektiert.
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
            # Vormonat oder Folgetag: immer fixieren (nur zum Planen da, nie überschreiben)
            fixed_assignments.add((e_idx, s_idx))
        elif existing_assignments_handling.lower() == 'respect':
            # Planungsmonat: nur bei RESPECT fixieren
            fixed_assignments.add((e_idx, s_idx))

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
