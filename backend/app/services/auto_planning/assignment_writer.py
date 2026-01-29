"""
Write solver assignments to the database (RESPECT vs OVERWRITE).
"""

import logging
from typing import List, Tuple

from app import db
from app.models.scheduling import Assignment

logger = logging.getLogger(__name__)
SOURCE_SOLVER = 'SOLVER'


def write_assignments(
    assignments: List[Tuple[int, int]],
    start_date,
    end_date,
    existing_assignments_handling: str,
) -> int:
    """
    Persist assignments to DB. Each item is (employee_id, shift_instance_id).

    - OVERWRITE: delete all SOLVER assignments in [start_date, end_date], then insert new ones.
    - RESPECT: only insert assignments that are not already present (do not delete existing).
    """
    logger.info('write_assignments: %s assignments, mode=%s', len(assignments), existing_assignments_handling)
    if existing_assignments_handling.lower() == 'overwrite':
        from app.models.scheduling import ShiftInstance
        shift_ids_query = db.session.query(ShiftInstance.id).filter(
            ShiftInstance.date >= start_date,
            ShiftInstance.date <= end_date,
        )
        deleted = db.session.query(Assignment).filter(
            Assignment.source == SOURCE_SOLVER,
            Assignment.shift_instance_id.in_(shift_ids_query),
        ).delete(synchronize_session=False)
        db.session.commit()
        logger.info('write_assignments: deleted %s existing SOLVER assignments in date range', deleted)
    created = 0
    skipped = 0
    for employee_id, shift_instance_id in assignments:
        if existing_assignments_handling.lower() == 'respect':
            existing = Assignment.query.filter_by(
                employee_id=employee_id,
                shift_instance_id=shift_instance_id,
            ).first()
            if existing:
                skipped += 1
                continue
        a = Assignment(
            employee_id=employee_id,
            shift_instance_id=shift_instance_id,
            source=SOURCE_SOLVER,
        )
        db.session.add(a)
        created += 1
    db.session.commit()
    logger.info('write_assignments: created %s, skipped (already exist) %s', created, skipped)
    return created
