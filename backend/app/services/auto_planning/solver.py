"""
Run CP-SAT solver and extract assignment list from solution.
"""

from typing import List, Optional, Tuple

from ortools.sat.python import cp_model

from .model_builder import PlanningModel


def run_solver(
    planning_model: PlanningModel,
    time_limit_seconds: Optional[float] = 30.0,
) -> Tuple[str, float, List[Tuple[int, int]]]:
    """
    Solve the model and return (status, objective_value, list of (employee_id, shift_instance_id)).

    Status: OPTIMAL, FEASIBLE, INFEASIBLE, MODEL_INVALID, UNKNOWN.
    Assignments are (context.employees[e_idx].id, context.shifts[s_idx].id) for each x[e,s]=1.
    """
    solver = cp_model.CpSolver()
    if time_limit_seconds is not None and time_limit_seconds > 0:
        solver.parameters.max_time_in_seconds = time_limit_seconds
    status = solver.Solve(planning_model.model)
    status_name = solver.StatusName(status)
    objective_value = float(solver.ObjectiveValue()) if status in (cp_model.OPTIMAL, cp_model.FEASIBLE) else 0.0
    assignments: List[Tuple[int, int]] = []
    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        ctx = planning_model.context
        for (e_idx, s_idx) in planning_model.pairs:
            if solver.Value(planning_model.x[(e_idx, s_idx)]) == 1:
                employee_id = ctx.employees[e_idx].id
                shift_instance_id = ctx.shifts[s_idx].id
                assignments.append((employee_id, shift_instance_id))
    return status_name, objective_value, assignments
