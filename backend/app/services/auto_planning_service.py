"""
Auto-Planning Service: monthly duty scheduling (on-call and weekend shifts) via OR-Tools CP-SAT.
"""

import logging
from datetime import date
from typing import Any, Dict

from app import db

from .auto_planning import (
    load_planning_context,
    build_model,
    run_solver,
    write_assignments,
)

logger = logging.getLogger(__name__)


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
        penalty_w2: int = 80,
        penalty_w3: int = 60,
        penalty_fairness: int = 50,
        penalty_overplanning: int = 200,
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

    def plan(self, start_date: date, end_date: date) -> Dict[str, Any]:
        """
        Run CP-SAT planning for the given date range (planning month derived from start_date).
        """
        # Optional: sync with Aplano before planning (not yet implemented)
        if self.include_aplano:
            logger.warning('include_aplano is not yet implemented; proceeding without Aplano sync')

        try:
            logger.info('Loading planning context...')
            ctx = load_planning_context(
                start_date=start_date,
                end_date=end_date,
                existing_assignments_handling=self.existing_assignments_handling,
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
