"""
Map Employee.function to scheduling role (NURSING / DOCTOR).
Only employees with a planable role are included in the solver.
"""

from typing import Optional

# Employee model used for type hint; actual import in callers to avoid circular deps
ROLE_NURSING = 'NURSING'
ROLE_DOCTOR = 'DOCTOR'

# function (from DB) -> role for solver
FUNCTION_TO_ROLE = {
    'Pflegekraft': ROLE_NURSING,
    'PDL': ROLE_NURSING,
    'Arzt': ROLE_DOCTOR,
    'Honorararzt': ROLE_DOCTOR,
}


def employee_role(employee) -> Optional[str]:
    """
    Return scheduling role for an employee, or None if not planable.

    - Pflegekraft, PDL -> NURSING
    - Arzt, Honorararzt -> DOCTOR
    - Physiotherapie / unknown -> None (excluded from planning)
    """
    if employee is None or not getattr(employee, 'function', None):
        return None
    fn = (employee.function or '').strip()
    return FUNCTION_TO_ROLE.get(fn)
