"""
Auto-Planning Service: monthly duty scheduling (on-call and weekend shifts) via OR-Tools CP-SAT.
"""

import logging
import os
import re
from calendar import monthrange
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional, Set, Tuple

from app import db
from app.models.employee import Employee

from .aplano_sync import (
    aplano_user_display_name,
    aplano_workspace_label,
    fetch_aplano_absences_for_month,
    fetch_aplano_shifts_for_month,
    match_employee_by_name,
)

# Wortgrenzen: vermeidet z. B. „aw“ in „raw“, „tag“ in „Tagesklinik“ (substring)
_RE_APLANO_AW = re.compile(r'\baw\b', re.I)
_RE_APLANO_RB = re.compile(r'\brb\b', re.I)
_RE_APLANO_DAY = re.compile(r'\b(tag|tagschicht|day)\b', re.I)
_RE_APLANO_NIGHT = re.compile(r'\b(nacht|nightschicht|night)\b', re.I)
from .auto_planning import (
    load_planning_context,
    build_model,
    run_solver,
    write_assignments,
)

logger = logging.getLogger(__name__)


class AplanoUnavailableError(Exception):
    """Raised when Aplano absences cannot be fetched (API error, not configured, etc.)."""
    pass


class AutoPlanningService:
    """
    Automatic planning of RB and AW assignments using CP-SAT.
    """

    def __init__(
        self,
        existing_assignments_handling: str = 'respect',
        allow_overplanning: bool = False,
        include_aplano: bool = False,
        time_limit_seconds: float = 30.0,
        penalty_w1: int = 100,
        penalty_w2: int = 150,  # Wochenend-Rotation (AW/RB → frei → …) wichtiger als andere weiche Regeln
        penalty_w3: int = 60,
        penalty_fairness: int = 50,
        penalty_overplanning: int = 800,  # Stark: Kapazitäten auch bei Überplanung möglichst einhalten
        penalty_distance_per_km: int = 3,  # Weiche Strafe pro km Wohnort–Tour-Start (AW/Tour Nord/Mitte/Süd)
        bonus_friday_weekend_rb_coupling: int = 60,  # Belohnung wenn gleiche Person Fr RB + Wo RB Nacht
    ):
        self.existing_assignments_handling = existing_assignments_handling
        self.allow_overplanning = allow_overplanning
        self.include_aplano = include_aplano
        self.time_limit_seconds = time_limit_seconds
        self.penalty_w1 = penalty_w1
        self.penalty_w2 = penalty_w2
        self.penalty_w3 = penalty_w3
        self.penalty_fairness = penalty_fairness
        self.penalty_overplanning = penalty_overplanning
        self.penalty_distance_per_km = penalty_distance_per_km
        self.bonus_friday_weekend_rb_coupling = bonus_friday_weekend_rb_coupling

    def _build_absent_dates(self, start_date: date) -> Set[Tuple[int, date]]:
        """Fetch Aplano absences (status=active) for planning range and return (employee_id, date) set."""
        absent_dates: Set[Tuple[int, date]] = set()
        year, month_num = start_date.year, start_date.month
        ctx_start = date(year, month_num, 1)
        if month_num == 1:
            prev_year, prev_month = year - 1, 12
        else:
            prev_year, prev_month = year, month_num - 1
        prev_month_start = date(prev_year, prev_month, 1)
        _, last_day = monthrange(year, month_num)
        ctx_end = date(year, month_num, last_day)
        load_end = ctx_end + timedelta(days=1) if ctx_end.weekday() == 5 else ctx_end
        abs_horizon_start = prev_month_start
        abs_horizon_end = load_end

        try:
            raw_absences: list = []
            raw_absences.extend(fetch_aplano_absences_for_month(prev_month_start))
            raw_absences.extend(fetch_aplano_absences_for_month(ctx_start))
        except Exception as e:
            logger.warning('Failed to fetch Aplano absences: %s', e)
            raise AplanoUnavailableError(str(e)) from e

        employees = list(Employee.query.all())
        for absence in raw_absences:
            if absence.get('status') != 'active':
                continue
            user_name = aplano_user_display_name(absence.get('user'))
            start_str = absence.get('startDate', '')
            end_str = absence.get('endDate', '')
            if not user_name or not start_str or not end_str:
                continue
            try:
                start_d = datetime.strptime(start_str, '%Y-%m-%d').date()
                end_d = datetime.strptime(end_str, '%Y-%m-%d').date()
            except ValueError:
                continue
            eff_start = max(start_d, abs_horizon_start)
            eff_end = min(end_d, abs_horizon_end)
            if eff_start > eff_end:
                continue
            emp = match_employee_by_name(user_name, employees)
            if emp is None:
                continue
            current = eff_start
            while current <= eff_end:
                absent_dates.add((emp.id, current))
                current = date.fromordinal(current.toordinal() + 1)

        logger.info(
            'Aplano absences: %s (employee,date) marks in horizon %s..%s',
            len(absent_dates), abs_horizon_start, abs_horizon_end,
        )

        return absent_dates

    @staticmethod
    def _extract_area_from_workspace(work_space: str) -> Optional[str]:
        ws = (work_space or '').lower()
        if 'nord' in ws:
            return 'Nord'
        if 'süd' in ws or 'sued' in ws:
            return 'Süd'
        if 'mitte' in ws:
            return 'Mitte'
        return None

    @staticmethod
    def _is_doctor_workspace(ws: str) -> bool:
        text = (ws or '').lower()
        # Handle umlauts and common spellings (Ärzte / Aerzte / Arzt / Doctor)
        return any(token in text for token in ('ärzt', 'aerzt', 'arzt', 'doctor', 'doc'))

    def _map_aplano_shift_to_solver_slots(
        self, shift: Dict[str, Any]
    ) -> Tuple[List[Dict[str, Any]], Optional[str]]:
        """
        Map one Aplano shift to solver-like slot descriptors.
        Returns (slots, None) on success, or ([], reason_code) if skipped / unmapped.
        """
        user_name = aplano_user_display_name(shift.get('user'))
        date_str = shift.get('date')
        work_space = aplano_workspace_label(
            shift.get('workSpace') or shift.get('name') or shift.get('title')
        )
        ws = work_space.lower()
        if not user_name:
            return [], 'missing_user'
        if not date_str:
            return [], 'missing_date'
        if not work_space:
            return [], 'missing_workspace'

        try:
            shift_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return [], 'bad_date'

        area = self._extract_area_from_workspace(work_space)

        if _RE_APLANO_AW.search(ws):
            return [{
                'date': shift_date,
                'category': 'AW',
                'role': 'NURSING',
                'time_of_day': 'NONE',
                'area': area,
            }], None

        if not _RE_APLANO_RB.search(ws):
            return [], 'not_aw_or_rb'

        role = 'DOCTOR' if self._is_doctor_workspace(ws) else 'NURSING'
        is_weekend = shift_date.weekday() >= 5
        category = 'RB_WEEKEND' if is_weekend else 'RB_WEEKDAY'

        if role == 'NURSING' and is_weekend:
            if _RE_APLANO_NIGHT.search(ws):
                time_of_day = 'NIGHT'
            elif _RE_APLANO_DAY.search(ws):
                time_of_day = 'DAY'
            else:
                return [], 'weekend_rb_need_tag_or_nacht'
        else:
            time_of_day = 'NONE'

        return [{
            'date': shift_date,
            'category': category,
            'role': role,
            'time_of_day': time_of_day,
            'area': area,
        }], None

    def _build_prev_month_external_assignments(self, start_date: date) -> List[Dict[str, Any]]:
        """
        Build fixed historical assignments from Aplano shifts for previous month.
        """
        year, month_num = start_date.year, start_date.month
        if month_num == 1:
            prev_year, prev_month = year - 1, 12
        else:
            prev_year, prev_month = year, month_num - 1
        prev_month_start = date(prev_year, prev_month, 1)

        try:
            raw_shifts = fetch_aplano_shifts_for_month(prev_month_start)
        except Exception as e:
            logger.warning('Failed to fetch Aplano shifts for previous month: %s', e)
            raise AplanoUnavailableError(str(e)) from e

        employees = list(Employee.query.all())
        out: List[Dict[str, Any]] = []
        skip_reasons: Dict[str, int] = {}
        unmatched_names: Set[str] = set()
        dbg = os.environ.get('PALLIROUTE_APLANO_AUTO_PLAN_DEBUG', '').lower() in (
            '1', 'true', 'yes',
        )

        for shift in raw_shifts:
            user_name = aplano_user_display_name(shift.get('user'))
            ws_label = aplano_workspace_label(
                shift.get('workSpace') or shift.get('name') or shift.get('title')
            )
            mapped_slots, skip = self._map_aplano_shift_to_solver_slots(shift)
            if skip:
                skip_reasons[skip] = skip_reasons.get(skip, 0) + 1
            if dbg or logger.isEnabledFor(logging.DEBUG):
                log_fn = logger.info if dbg else logger.debug
                log_fn(
                    'aplano_prev_month_shift id=%s date=%s user=%r workspace=%r -> slots=%s skip=%r',
                    shift.get('id'),
                    shift.get('date'),
                    user_name,
                    ws_label,
                    mapped_slots,
                    skip,
                )
            if not mapped_slots:
                continue
            emp = match_employee_by_name(user_name, employees)
            if emp is None:
                unmatched_names.add(user_name)
                skip_reasons['unmatched_employee'] = skip_reasons.get('unmatched_employee', 0) + 1
                if dbg or logger.isEnabledFor(logging.DEBUG):
                    log_fn = logger.info if dbg else logger.debug
                    log_fn('aplano_prev_month_shift no Employee match for name=%r', user_name)
                continue
            for mapped in mapped_slots:
                mapped['employee_id'] = emp.id
                out.append(mapped)

        logger.info(
            'Aplano Vormonat-Schichten: %s API-Zeilen -> %s Solver-Slots; '
            'skip=%s; Namen ohne MA-Match=%s%s',
            len(raw_shifts),
            len(out),
            dict(skip_reasons) if skip_reasons else {},
            len(unmatched_names),
            f' ({", ".join(sorted(unmatched_names)[:15])}{"…" if len(unmatched_names) > 15 else ""})'
            if unmatched_names else '',
        )
        return out

    def plan(self, start_date: date, end_date: date) -> Dict[str, Any]:
        """
        Run CP-SAT planning for the given date range (planning month derived from start_date).
        """
        absent_dates: Set[Tuple[int, date]] = set()
        external_fixed_assignments: List[Dict[str, Any]] = []
        if self.include_aplano:
            try:
                absent_dates = self._build_absent_dates(start_date)
                external_fixed_assignments = self._build_prev_month_external_assignments(start_date)
            except AplanoUnavailableError as e:
                result = {
                    'message': 'Aplano ist nicht verfügbar.',
                    'assignments_created': 0,
                    'total_planned': 0,
                    'solver_status': 'ERROR',
                    'objective_value': None,
                    'runtime_seconds': None,
                    'error': 'APLANO_UNAVAILABLE',
                }
                logger.warning('Auto-planning aborted (Aplano unavailable): %s', e)
                return result

        try:
            logger.info('Loading planning context...')
            ctx = load_planning_context(
                start_date=start_date,
                end_date=end_date,
                existing_assignments_handling=self.existing_assignments_handling,
                absent_dates=absent_dates if absent_dates else None,
                external_fixed_assignments=external_fixed_assignments if external_fixed_assignments else None,
            )
        except Exception as e:
            logger.exception('Failed to load planning context')
            result = {
                'message': f'Failed to load planning data: {str(e)}',
                'assignments_created': 0,
                'total_planned': 0,
                'solver_status': 'ERROR',
                'objective_value': None,
                'runtime_seconds': None,
                'error': str(e),
            }
            logger.warning('Auto-planning aborted: %s', result.get('message'))
            return result

        if not ctx.employees:
            result = {
                'message': 'No planable employees (NURSING/DOCTOR) found',
                'assignments_created': 0,
                'total_planned': 0,
                'solver_status': 'SKIPPED',
                'objective_value': None,
                'runtime_seconds': None,
            }
            logger.warning('Auto-planning skipped: %s', result['message'])
            return result
        if not ctx.shifts:
            result = {
                'message': 'No shift instances in date range; generate shift instances first (POST /shift-instances/generate)',
                'assignments_created': 0,
                'total_planned': 0,
                'solver_status': 'SKIPPED',
                'objective_value': None,
                'runtime_seconds': None,
            }
            logger.warning('Auto-planning skipped: %s', result['message'])
            return result

        try:
            logger.info('Building CP-SAT model...')
            planning_model = build_model(
                ctx=ctx,
                allow_overplanning=self.allow_overplanning,
                penalty_w1=self.penalty_w1,
                penalty_w2=self.penalty_w2,
                penalty_w3=self.penalty_w3,
                penalty_fairness=self.penalty_fairness,
                penalty_overplanning=self.penalty_overplanning,
                penalty_distance_per_km=self.penalty_distance_per_km,
                bonus_friday_weekend_rb_coupling=self.bonus_friday_weekend_rb_coupling,
            )
        except Exception as e:
            logger.exception('Failed to build CP-SAT model')
            result = {
                'message': f'Failed to build model: {str(e)}',
                'assignments_created': 0,
                'total_planned': 0,
                'solver_status': 'ERROR',
                'objective_value': None,
                'runtime_seconds': None,
                'error': str(e),
            }
            logger.warning('Auto-planning aborted: %s', result.get('message'))
            return result

        import time
        t0 = time.perf_counter()
        try:
            logger.info('Running solver...')
            status_name, objective_value, assignments = run_solver(
                planning_model,
                time_limit_seconds=self.time_limit_seconds,
            )
        except Exception as e:
            logger.exception('Solver failed')
            result = {
                'message': f'Solver failed: {str(e)}',
                'assignments_created': 0,
                'total_planned': 0,
                'solver_status': 'ERROR',
                'objective_value': None,
                'runtime_seconds': time.perf_counter() - t0,
                'error': str(e),
            }
            logger.warning('Auto-planning aborted: %s', result.get('message'))
            return result
        runtime_seconds = time.perf_counter() - t0

        if status_name == 'INFEASIBLE':
            result = {
                'message': 'No feasible solution found; constraints may be too strict or data inconsistent',
                'assignments_created': 0,
                'total_planned': 0,
                'solver_status': status_name,
                'objective_value': None,
                'runtime_seconds': round(runtime_seconds, 2),
                'error': 'INFEASIBLE',
            }
            logger.warning('Auto-planning: %s', result['message'])
            if self.include_aplano:
                ad = ctx.absent_dates
                pm0, pm1 = ctx.start_date, ctx.end_date
                n_pm = sum(1 for (_, d) in ad if pm0 <= d <= pm1)
                emps_pm = {eid for (eid, d) in ad if pm0 <= d <= pm1}
                logger.warning(
                    'Aplano INFEASIBLE: %s Abwesenheits-Markierungen im Planungsmonat, '
                    '%s betroffene MA-IDs, %s gesamt im Horizont',
                    n_pm, len(emps_pm), len(ad),
                )
            return result
        if status_name not in ('OPTIMAL', 'FEASIBLE'):
            result = {
                'message': f'Solver returned status: {status_name}',
                'assignments_created': 0,
                'total_planned': 0,
                'solver_status': status_name,
                'objective_value': objective_value,
                'runtime_seconds': round(runtime_seconds, 2),
            }
            logger.warning('Auto-planning: %s', result['message'])
            return result

        # Nur den ausgewählten Planungsmonat in die DB schreiben (Vormonat nur zur Bewertung genutzt)
        planning_month_shift_ids = {
            s.id for s in ctx.shifts
            if ctx.start_date <= s.date <= ctx.end_date
        }
        assignments_planning_month = [
            (eid, sid) for (eid, sid) in assignments
            if sid in planning_month_shift_ids
        ]
        logger.info(
            'Solver: %s assignments total, %s shifts in planning month, %s assignments to write',
            len(assignments), len(planning_month_shift_ids), len(assignments_planning_month),
        )
        if len(assignments_planning_month) == 0 and len(assignments) > 0:
            logger.warning(
                'No assignments in planning month (all %s are in previous month?). '
                'Ensure shift instances exist for the selected month (POST /shift-instances/generate).',
                len(assignments),
            )
        if len(planning_month_shift_ids) == 0:
            logger.warning(
                'No shift instances in planning month (%s to %s). Generate them first.',
                ctx.start_date, ctx.end_date,
            )

        try:
            logger.info('Writing assignments to database...')
            assignments_created = write_assignments(
                assignments=assignments_planning_month,
                start_date=ctx.start_date,
                end_date=ctx.end_date,
                existing_assignments_handling=self.existing_assignments_handling,
            )
        except Exception as e:
            logger.exception('Failed to write assignments')
            db.session.rollback()
            result = {
                'message': f'Assignments solved but failed to save: {str(e)}',
                'assignments_created': 0,
                'total_planned': len(assignments_planning_month),
                'solver_status': status_name,
                'objective_value': objective_value,
                'runtime_seconds': round(runtime_seconds, 2),
                'error': str(e),
            }
            logger.warning('Auto-planning aborted: %s', result.get('message'))
            return result

        return {
            'message': 'Planning completed successfully',
            'assignments_created': assignments_created,
            'total_planned': len(assignments_planning_month),
            'solver_status': status_name,
            'objective_value': objective_value,
            'runtime_seconds': round(runtime_seconds, 2),
        }
