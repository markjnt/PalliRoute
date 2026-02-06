"""
Build OR-Tools CP-SAT model: variables x(e,s), hard constraints H1–H7, soft constraints W1–W4, objective.
"""

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import timedelta
from typing import Dict, List, Set, Tuple

from ortools.sat.python import cp_model

from .data_loader import PlanningContext, ShiftInfo

# Capacity type -> (category, role, time_of_day filter: None = any)
CAPACITY_SHIFT_FILTER = {
    'RB_NURSING_WEEKDAY': ('RB_WEEKDAY', 'NURSING', 'NONE'),
    'RB_NURSING_WEEKEND': ('RB_WEEKEND', 'NURSING', None),  # DAY+NIGHT together
    'RB_DOCTORS_WEEKDAY': ('RB_WEEKDAY', 'DOCTOR', 'NONE'),
    'RB_DOCTORS_WEEKEND': ('RB_WEEKEND', 'DOCTOR', 'NONE'),
    'AW_NURSING': ('AW', 'NURSING', 'NONE'),
}


@dataclass
class PlanningModel:
    """CP-SAT model plus index structures for solution extraction."""
    model: cp_model.CpModel
    # (e_idx, s_idx) -> IntVar (binary)
    x: Dict[Tuple[int, int], cp_model.IntVar] = field(default_factory=dict)
    # list of (e_idx, s_idx) that have a variable (for iteration)
    pairs: List[Tuple[int, int]] = field(default_factory=list)
    context: PlanningContext = field(default=None)


def _shift_matches_capacity(s: ShiftInfo, cap_type: str) -> bool:
    cat, role, tod = CAPACITY_SHIFT_FILTER[cap_type]
    if s.category != cat or s.role != role:
        return False
    if tod is None:
        return True
    return s.time_of_day == tod


def _get_shifts_for_capacity(shifts: List[ShiftInfo], planning_month: str, cap_type: str) -> List[int]:
    """Return list of shift indices that count toward this capacity in planning month."""
    return [
        s.index for s in shifts
        if s.month == planning_month and _shift_matches_capacity(s, cap_type)
    ]


def _aw_weekend_pairs(shifts: List[ShiftInfo]) -> List[Tuple[int, int]]:
    """Pairs (s_sat_idx, s_sun_idx) for AW NURSING same area, same calendar week."""
    by_week_area: Dict[Tuple[int, str], List[ShiftInfo]] = defaultdict(list)
    for s in shifts:
        if s.category != 'AW' or s.role != 'NURSING':
            continue
        if s.date.weekday() == 5:  # Saturday
            by_week_area[(s.calendar_week, s.area)].append(s)
        elif s.date.weekday() == 6:  # Sunday
            by_week_area[(s.calendar_week, s.area)].append(s)
    pairs: List[Tuple[int, int]] = []
    for (cw, area), lst in by_week_area.items():
        sat_list = [s for s in lst if s.date.weekday() == 5]
        sun_list = [s for s in lst if s.date.weekday() == 6]
        for s_sat in sat_list:
            for s_sun in sun_list:
                pairs.append((s_sat.index, s_sun.index))
    return pairs


def _rb_weekend_sat_sun_pairs(shifts: List[ShiftInfo]) -> List[Tuple[int, int]]:
    """
    Pairs (s_sat_idx, s_sun_idx) for RB_WEEKEND same area, same time_of_day, same calendar week.
    Same rule as AW: if you have Saturday RB you also have Sunday RB (same employee).
    """
    by_week_area_tod: Dict[Tuple[int, str, str], List[ShiftInfo]] = defaultdict(list)
    for s in shifts:
        if s.category != 'RB_WEEKEND' or s.role != 'NURSING':
            continue
        if s.date.weekday() == 5:
            by_week_area_tod[(s.calendar_week, s.area, s.time_of_day)].append(s)
        elif s.date.weekday() == 6:
            by_week_area_tod[(s.calendar_week, s.area, s.time_of_day)].append(s)
    pairs: List[Tuple[int, int]] = []
    for (cw, area, tod), lst in by_week_area_tod.items():
        sat_list = [s for s in lst if s.date.weekday() == 5]
        sun_list = [s for s in lst if s.date.weekday() == 6]
        for s_sat in sat_list:
            for s_sun in sun_list:
                pairs.append((s_sat.index, s_sun.index))
    return pairs


def _rb_nursing_weekend_day_night_pairs(shifts: List[ShiftInfo]) -> List[Tuple[int, int]]:
    """
    Pairs (s_day_idx, s_night_idx) that must not both be assigned to same employee in same weekend.
    For H7: no DAY on one day and NIGHT on the other. So we forbid (sat_day, sun_night) and (sat_night, sun_day).
    Returns list of (s_a_idx, s_b_idx) such that for each e: x[e,s_a] + x[e,s_b] <= 1.
    """
    by_week: Dict[int, List[ShiftInfo]] = defaultdict(list)
    for s in shifts:
        if s.category != 'RB_WEEKEND' or s.role != 'NURSING':
            continue
        by_week[s.calendar_week].append(s)
    pairs: List[Tuple[int, int]] = []
    for cw, lst in by_week.items():
        sat_day = [s for s in lst if s.date.weekday() == 5 and s.time_of_day == 'DAY']
        sat_night = [s for s in lst if s.date.weekday() == 5 and s.time_of_day == 'NIGHT']
        sun_day = [s for s in lst if s.date.weekday() == 6 and s.time_of_day == 'DAY']
        sun_night = [s for s in lst if s.date.weekday() == 6 and s.time_of_day == 'NIGHT']
        for s_sat_d in sat_day:
            for s_sun_n in sun_night:
                pairs.append((s_sat_d.index, s_sun_n.index))
        for s_sat_n in sat_night:
            for s_sun_d in sun_day:
                pairs.append((s_sat_n.index, s_sun_d.index))
    return pairs


def _weekend_then_monday_rb_pairs(shifts: List[ShiftInfo]) -> List[Tuple[List[int], List[int]]]:
    """
    For each weekend (Sat+Sun): (weekend_shift_indices, monday_rb_shift_indices).
    Weekend shifts = AW or RB_WEEKEND on that Sat/Sun. Monday RB = RB_WEEKDAY on the Monday after.
    Used to penalize: employee had weekend duty -> avoid RB on the following Monday (prefer from Tuesday).
    """
    sundays = sorted({s.date for s in shifts if s.date.weekday() == 6})
    result: List[Tuple[List[int], List[int]]] = []
    for sun_date in sundays:
        sat_date = sun_date - timedelta(days=1)
        mon_date = sun_date + timedelta(days=1)
        weekend_indices = [
            s.index for s in shifts
            if s.category in ('AW', 'RB_WEEKEND') and (s.date == sat_date or s.date == sun_date)
        ]
        monday_rb_indices = [
            s.index for s in shifts
            if s.category == 'RB_WEEKDAY' and s.date == mon_date
        ]
        if weekend_indices and monday_rb_indices:
            result.append((weekend_indices, monday_rb_indices))
    return result


def build_model(
    ctx: PlanningContext,
    allow_overplanning: bool,
    penalty_w1: int = 100,
    penalty_w2: int = 80,
    penalty_w3: int = 60,
    penalty_fairness: int = 50,
    penalty_overplanning: int = 200,
    penalty_area_mismatch: int = 40,
    penalty_weekend_then_monday_rb: int = 70,
) -> PlanningModel:
    """
    Build CP-SAT model with variables and all constraints.
    Only planning-month shifts are used for H4 capacity; all shifts (incl. prev month) for H6/H7 and soft.
    """
    model = cp_model.CpModel()
    employees = ctx.employees
    shifts = ctx.shifts
    planning_month = ctx.planning_month
    fixed = ctx.fixed_assignments

    # --- Variables: x[(e_idx, s_idx)] only for compatible (role match); skip if employee absent on shift date ---
    absent_dates = getattr(ctx, 'absent_dates', set())
    x: Dict[Tuple[int, int], cp_model.IntVar] = {}
    for e in employees:
        for s in shifts:
            if e.role != s.role:
                continue
            if (e.id, s.date) in absent_dates:
                continue
            key = (e.index, s.index)
            x[key] = model.NewBoolVar(f'x_{e.index}_{s.index}')
    pairs = list(x.keys())

    # --- H1: Pro Schicht max. 1 Mitarbeiter; bei Overplanning: jede Schicht im Planungsmonat genau 1 ---
    for s_idx in range(len(shifts)):
        vars_s = [x[(e, s_idx)] for (e, s) in pairs if s == s_idx]
        if not vars_s:
            continue
        if allow_overplanning and shifts[s_idx].month == planning_month:
            model.Add(sum(vars_s) == 1)  # Jede Schicht im Monat muss besetzt sein
        else:
            model.Add(sum(vars_s) <= 1)

    # --- H2: Each employee at most one shift per day ---
    for e_idx in range(len(employees)):
        for d in set(s.date for s in shifts):
            vars_ed = [x[(e_idx, s_idx)] for (e_idx_p, s_idx) in pairs if e_idx_p == e_idx and shifts[s_idx].date == d]
            if vars_ed:
                model.Add(sum(vars_ed) <= 1)

    # --- H4: Capacity (planning month only); only for shifts in planning month ---
    if not allow_overplanning:
        for e in employees:
            eid = e.id
            caps = ctx.capacity_max.get(eid, {})
            for cap_type, max_count in caps.items():
                if max_count < 0:
                    continue
                s_indices = _get_shifts_for_capacity(shifts, planning_month, cap_type)
                if not s_indices:
                    continue
                vars_cap = [x[(e.index, s_idx)] for (ei, s_idx) in pairs if ei == e.index and s_idx in s_indices]
                if vars_cap:
                    model.Add(sum(vars_cap) <= max_count)

    # --- H5: Fix existing assignments (RESPECT) ---
    for (e_idx, s_idx) in fixed:
        key = (e_idx, s_idx)
        if key in x:
            model.Add(x[key] == 1)

    # --- H6: AW weekend coupling: same employee for Sat and Sun, same area ---
    aw_pairs = _aw_weekend_pairs(shifts)
    for (s_sat_idx, s_sun_idx) in aw_pairs:
        for e in employees:
            k_sat = (e.index, s_sat_idx)
            k_sun = (e.index, s_sun_idx)
            if k_sat in x and k_sun in x:
                model.Add(x[k_sat] == x[k_sun])

    # --- H6b: RB weekend coupling: same employee for Sat and Sun (same area, same time_of_day) ---
    rb_sat_sun_pairs = _rb_weekend_sat_sun_pairs(shifts)
    for (s_sat_idx, s_sun_idx) in rb_sat_sun_pairs:
        for e in employees:
            k_sat = (e.index, s_sat_idx)
            k_sun = (e.index, s_sun_idx)
            if k_sat in x and k_sun in x:
                model.Add(x[k_sat] == x[k_sun])

    # --- H7: RB nursing weekend: no DAY on one day and NIGHT on the other (same weekend) ---
    forbid_pairs = _rb_nursing_weekend_day_night_pairs(shifts)
    for (s_a, s_b) in forbid_pairs:
        for e in employees:
            ka = (e.index, s_a)
            kb = (e.index, s_b)
            if ka in x and kb in x:
                model.Add(x[ka] + x[kb] <= 1)

    # --- Objective: weighted sum of soft violations ---
    objective_terms: List = []

    # Anreiz, Schichten zu besetzen: stark über Strafen, damit immer alle Schichten
    # gefüllt werden wenn möglich (ohne Kapazität zu überschreiten bei Überplanung AUS)
    fill_bonus = 1000
    for (e_idx, s_idx) in pairs:
        objective_terms.append(-fill_bonus * x[(e_idx, s_idx)])

    # W1: RB weekday per week: prefer at most 1; 2 allowed with penalty
    # Auxiliary: aux[e,w] = 1 if employee e has >= 2 RB_WEEKDAY in week w
    rb_weekday_shifts_by_week: Dict[int, List[int]] = defaultdict(list)
    for s in shifts:
        if s.category == 'RB_WEEKDAY':
            rb_weekday_shifts_by_week[s.calendar_week].append(s.index)
    for e in employees:
        for cw, s_indices in rb_weekday_shifts_by_week.items():
            if len(s_indices) < 2:
                continue
            vars_ew = [x[(e.index, s_idx)] for (ei, s_idx) in pairs if ei == e.index and s_idx in s_indices]
            if len(vars_ew) < 2:
                continue
            # aux = 1 if sum >= 2
            aux = model.NewBoolVar(f'w1_aux_{e.index}_{cw}')
            model.Add(sum(vars_ew) >= 2).OnlyEnforceIf(aux)
            model.Add(sum(vars_ew) <= 1).OnlyEnforceIf(aux.Not())
            objective_terms.append(aux * penalty_w1)

    # W2: Weekend rotation (AW -> free -> RB -> free): penalize same type two weekends in a row
    # We need weekend "type" per employee: 0=free, 1=AW, 2=RB. Then penalize when type[w] == type[w-1] and not free.
    weekend_weeks = sorted(set(s.calendar_week for s in shifts if s.is_weekend))
    if len(weekend_weeks) >= 2:
        for e in employees:
            for i in range(1, len(weekend_weeks)):
                cw_prev, cw_curr = weekend_weeks[i - 1], weekend_weeks[i]
                shifts_prev = [s for s in shifts if s.calendar_week == cw_prev and s.is_weekend]
                shifts_curr = [s for s in shifts if s.calendar_week == cw_curr and s.is_weekend]
                aw_prev = [s.index for s in shifts_prev if s.category == 'AW']
                aw_curr = [s.index for s in shifts_curr if s.category == 'AW']
                rb_prev = [s.index for s in shifts_prev if s.category == 'RB_WEEKEND']
                rb_curr = [s.index for s in shifts_curr if s.category == 'RB_WEEKEND']
                # has_aw_prev = sum x[e,s] for s in aw_prev >= 1
                has_aw_prev = model.NewBoolVar(f'w2_aw_prev_{e.index}_{cw_prev}')
                if aw_prev:
                    vars_aw_prev = [x[(e.index, s)] for (ei, s) in pairs if ei == e.index and s in aw_prev]
                    if vars_aw_prev:
                        model.Add(sum(vars_aw_prev) >= 1).OnlyEnforceIf(has_aw_prev)
                        model.Add(sum(vars_aw_prev) == 0).OnlyEnforceIf(has_aw_prev.Not())
                else:
                    model.Add(has_aw_prev == 0)
                has_aw_curr = model.NewBoolVar(f'w2_aw_curr_{e.index}_{cw_curr}')
                if aw_curr:
                    vars_aw_curr = [x[(e.index, s)] for (ei, s) in pairs if ei == e.index and s in aw_curr]
                    if vars_aw_curr:
                        model.Add(sum(vars_aw_curr) >= 1).OnlyEnforceIf(has_aw_curr)
                        model.Add(sum(vars_aw_curr) == 0).OnlyEnforceIf(has_aw_curr.Not())
                else:
                    model.Add(has_aw_curr == 0)
                has_rb_prev = model.NewBoolVar(f'w2_rb_prev_{e.index}_{cw_prev}')
                if rb_prev:
                    vars_rb_prev = [x[(e.index, s)] for (ei, s) in pairs if ei == e.index and s in rb_prev]
                    if vars_rb_prev:
                        model.Add(sum(vars_rb_prev) >= 1).OnlyEnforceIf(has_rb_prev)
                        model.Add(sum(vars_rb_prev) == 0).OnlyEnforceIf(has_rb_prev.Not())
                else:
                    model.Add(has_rb_prev == 0)
                has_rb_curr = model.NewBoolVar(f'w2_rb_curr_{e.index}_{cw_curr}')
                if rb_curr:
                    vars_rb_curr = [x[(e.index, s)] for (ei, s) in pairs if ei == e.index and s in rb_curr]
                    if vars_rb_curr:
                        model.Add(sum(vars_rb_curr) >= 1).OnlyEnforceIf(has_rb_curr)
                        model.Add(sum(vars_rb_curr) == 0).OnlyEnforceIf(has_rb_curr.Not())
                else:
                    model.Add(has_rb_curr == 0)
                # AND using linear constraints (avoid AddMultiplicationEquality for booleans)
                repeat_aw = model.NewBoolVar(f'w2_repeat_aw_{e.index}_{cw_curr}')
                model.Add(repeat_aw <= has_aw_prev)
                model.Add(repeat_aw <= has_aw_curr)
                model.Add(repeat_aw >= has_aw_prev + has_aw_curr - 1)
                objective_terms.append(repeat_aw * penalty_w2)
                repeat_rb = model.NewBoolVar(f'w2_repeat_rb_{e.index}_{cw_curr}')
                model.Add(repeat_rb <= has_rb_prev)
                model.Add(repeat_rb <= has_rb_curr)
                model.Add(repeat_rb >= has_rb_prev + has_rb_curr - 1)
                objective_terms.append(repeat_rb * penalty_w2)

    # W3: RB nursing weekend Tag/Nacht alternation: penalize same time_of_day two weekends in a row
    rb_nursing_weekends: List[Tuple[int, List[int], List[int]]] = []
    for cw in weekend_weeks:
        day_idxs = [s.index for s in shifts if s.calendar_week == cw and s.category == 'RB_WEEKEND' and s.role == 'NURSING' and s.time_of_day == 'DAY']
        night_idxs = [s.index for s in shifts if s.calendar_week == cw and s.category == 'RB_WEEKEND' and s.role == 'NURSING' and s.time_of_day == 'NIGHT']
        if day_idxs or night_idxs:
            rb_nursing_weekends.append((cw, day_idxs, night_idxs))
    for e in employees:
        for i in range(1, len(rb_nursing_weekends)):
            cw_prev, day_prev, night_prev = rb_nursing_weekends[i - 1]
            cw_curr, day_curr, night_curr = rb_nursing_weekends[i]
            had_day_prev = model.NewBoolVar(f'w3_day_prev_{e.index}_{cw_prev}')
            had_night_prev = model.NewBoolVar(f'w3_night_prev_{e.index}_{cw_prev}')
            if day_prev:
                vd = [x[(e.index, s)] for (ei, s) in pairs if ei == e.index and s in day_prev]
                if vd:
                    model.Add(sum(vd) >= 1).OnlyEnforceIf(had_day_prev)
                    model.Add(sum(vd) == 0).OnlyEnforceIf(had_day_prev.Not())
            else:
                model.Add(had_day_prev == 0)
            if night_prev:
                vn = [x[(e.index, s)] for (ei, s) in pairs if ei == e.index and s in night_prev]
                if vn:
                    model.Add(sum(vn) >= 1).OnlyEnforceIf(had_night_prev)
                    model.Add(sum(vn) == 0).OnlyEnforceIf(had_night_prev.Not())
            else:
                model.Add(had_night_prev == 0)
            has_day_curr = model.NewBoolVar(f'w3_day_curr_{e.index}_{cw_curr}')
            has_night_curr = model.NewBoolVar(f'w3_night_curr_{e.index}_{cw_curr}')
            if day_curr:
                vd = [x[(e.index, s)] for (ei, s) in pairs if ei == e.index and s in day_curr]
                if vd:
                    model.Add(sum(vd) >= 1).OnlyEnforceIf(has_day_curr)
                    model.Add(sum(vd) == 0).OnlyEnforceIf(has_day_curr.Not())
            else:
                model.Add(has_day_curr == 0)
            if night_curr:
                vn = [x[(e.index, s)] for (ei, s) in pairs if ei == e.index and s in night_curr]
                if vn:
                    model.Add(sum(vn) >= 1).OnlyEnforceIf(has_night_curr)
                    model.Add(sum(vn) == 0).OnlyEnforceIf(has_night_curr.Not())
            else:
                model.Add(has_night_curr == 0)
            same_day = model.NewBoolVar(f'w3_same_day_{e.index}_{cw_curr}')
            model.Add(same_day <= had_day_prev)
            model.Add(same_day <= has_day_curr)
            model.Add(same_day >= had_day_prev + has_day_curr - 1)
            objective_terms.append(same_day * penalty_w3)
            same_night = model.NewBoolVar(f'w3_same_night_{e.index}_{cw_curr}')
            model.Add(same_night <= had_night_prev)
            model.Add(same_night <= has_night_curr)
            model.Add(same_night >= had_night_prev + has_night_curr - 1)
            objective_terms.append(same_night * penalty_w3)

    # W4: Fairness — penalize excess over target share of weekend shifts
    planning_shifts = [s for s in shifts if s.month == planning_month and s.is_weekend]
    if planning_shifts and employees:
        total_slots = len(planning_shifts)
        target_approx = total_slots // len(employees) if len(employees) else 0
        for e in employees:
            vars_e = [x[(e.index, s_idx)] for (ei, s_idx) in pairs if ei == e.index and shifts[s_idx].month == planning_month and shifts[s_idx].is_weekend]
            if not vars_e:
                continue
            count_e = sum(vars_e)
            excess = model.NewIntVar(0, max(0, len(vars_e) - target_approx), f'w4_excess_{e.index}')
            model.Add(excess >= count_e - target_approx)
            objective_terms.append(excess * penalty_fairness)

    # W5: If employee had RB or AW weekend, prefer RB unter Woche from Tuesday — penalize RB on Monday after
    weekend_monday_pairs = _weekend_then_monday_rb_pairs(shifts)
    for weekend_indices, monday_rb_indices in weekend_monday_pairs:
        for e in employees:
            vars_weekend = [x[(e.index, s)] for (ei, s) in pairs if ei == e.index and s in weekend_indices]
            vars_monday_rb = [x[(e.index, s)] for (ei, s) in pairs if ei == e.index and s in monday_rb_indices]
            if not vars_weekend or not vars_monday_rb:
                continue
            has_weekend = model.NewBoolVar(f'w5_weekend_{e.index}_{weekend_indices[0]}')
            model.Add(sum(vars_weekend) >= 1).OnlyEnforceIf(has_weekend)
            model.Add(sum(vars_weekend) == 0).OnlyEnforceIf(has_weekend.Not())
            has_monday_rb = model.NewBoolVar(f'w5_mon_rb_{e.index}_{monday_rb_indices[0]}')
            model.Add(sum(vars_monday_rb) >= 1).OnlyEnforceIf(has_monday_rb)
            model.Add(sum(vars_monday_rb) == 0).OnlyEnforceIf(has_monday_rb.Not())
            both = model.NewBoolVar(f'w5_both_{e.index}_{weekend_indices[0]}')
            model.Add(both <= has_weekend)
            model.Add(both <= has_monday_rb)
            model.Add(both >= has_weekend + has_monday_rb - 1)
            objective_terms.append(both * penalty_weekend_then_monday_rb)

    # Area mismatch (soft): prefer matching employee area to shift area (Nord/Süd only).
    # For shifts with area "Mitte" (e.g. AW Mitte) no preference — any employee (Nord/Süd) is fine.
    for (e_idx, s_idx) in pairs:
        emp_area = employees[e_idx].area
        shift_area = shifts[s_idx].area
        if (
            emp_area is not None
            and shift_area
            and shift_area != "Mitte"
            and emp_area != shift_area
        ):
            objective_terms.append(penalty_area_mismatch * x[(e_idx, s_idx)])

    # Overplanning penalty (when allow_overplanning): penalize each assignment above capacity
    if allow_overplanning:
        for e in employees:
            eid = e.id
            caps = ctx.capacity_max.get(eid, {})
            for cap_type, max_count in caps.items():
                if max_count < 0:
                    continue
                s_indices = _get_shifts_for_capacity(shifts, planning_month, cap_type)
                if not s_indices or max_count == 0:
                    continue
                vars_cap = [x[(e.index, s_idx)] for (ei, s_idx) in pairs if ei == e.index and s_idx in s_indices]
                if not vars_cap:
                    continue
                over = model.NewIntVar(0, len(vars_cap), f'over_{e.index}_{cap_type}')
                model.Add(over >= sum(vars_cap) - max_count)
                objective_terms.append(over * penalty_overplanning)

    if objective_terms:
        model.Minimize(sum(objective_terms))
    else:
        model.Minimize(0)

    return PlanningModel(model=model, x=x, pairs=pairs, context=ctx)