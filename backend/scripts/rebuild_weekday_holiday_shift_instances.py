#!/usr/bin/env python3
"""
One-off: NRW Feiertags-Mo–Fr — alle ShiftInstances an diesen Tagen entfernen
(Zuweisungen zuerst), dann neu anlegen wie POST /shift-instances/generate.

Nach erfolgreichem Lauf löschen (oder aus dem Repo entfernen).

Usage (aus dem Verzeichnis backend/):
  python scripts/rebuild_weekday_holiday_shift_instances.py --dry-run
  python scripts/rebuild_weekday_holiday_shift_instances.py

Optional zusätzlich alle Mo–Fr-Feiertage bestimmter Kalenderjahre (API nötig):
  python scripts/rebuild_weekday_holiday_shift_instances.py --calendar-year 2025 --calendar-year 2026
"""

from __future__ import annotations

import argparse
import os
import sys

# backend/ als Wurzel
_BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND_ROOT not in sys.path:
    sys.path.insert(0, _BACKEND_ROOT)

os.chdir(_BACKEND_ROOT)

from datetime import date  # noqa: E402

from app import create_app, db  # noqa: E402
from app.models.scheduling import Assignment, ShiftDefinition, ShiftInstance  # noqa: E402
from app.services.holiday_service import fetch_holidays_for_year, is_weekday_holiday  # noqa: E402


def get_calendar_week(dt: date) -> int:
    return dt.isocalendar()[1]


def get_month_string(dt: date) -> str:
    return dt.strftime("%Y-%m")


def definitions_for_date(instance_date: date, shift_definitions: list) -> list:
    """Gleiche Regeln wie generate_shift_instances (shift_instances.py)."""
    is_weekday = instance_date.weekday() < 5
    is_weekend = instance_date.weekday() >= 5
    is_public_holiday_weekday = is_weekday_holiday(instance_date)
    out = []
    for shift_def in shift_definitions:
        if is_public_holiday_weekday:
            if shift_def.is_weekday and not shift_def.is_weekend:
                continue
            if not shift_def.is_weekend:
                continue
        elif is_weekday:
            if not shift_def.is_weekday:
                continue
        elif is_weekend:
            if not shift_def.is_weekend:
                continue
        out.append(shift_def)
    return out


def collect_target_dates(calendar_years: list[int]) -> set[date]:
    dates: set[date] = set()

    for (d,) in db.session.query(ShiftInstance.date).distinct():
        if is_weekday_holiday(d):
            dates.add(d)

    for y in calendar_years:
        for hol_date in fetch_holidays_for_year(y):
            if hol_date.weekday() < 5:
                dates.add(hol_date)

    return dates


def rebuild_one_day(instance_date: date, shift_definitions: list, dry_run: bool) -> tuple[int, int]:
    """
    Returns (assignments_deleted, instances_recreated).
    """
    inst_rows = ShiftInstance.query.filter_by(date=instance_date).all()
    ids = [r.id for r in inst_rows]
    n_assign = 0
    if ids:
        n_assign = Assignment.query.filter(Assignment.shift_instance_id.in_(ids)).count()
    if dry_run:
        return (n_assign, len(definitions_for_date(instance_date, shift_definitions)))

    if ids:
        Assignment.query.filter(Assignment.shift_instance_id.in_(ids)).delete(
            synchronize_session=False
        )
        ShiftInstance.query.filter(ShiftInstance.date == instance_date).delete(
            synchronize_session=False
        )
        db.session.flush()

    month = get_month_string(instance_date)
    cw = get_calendar_week(instance_date)
    defs = definitions_for_date(instance_date, shift_definitions)
    for shift_def in defs:
        db.session.add(
            ShiftInstance(
                shift_definition_id=shift_def.id,
                date=instance_date,
                calendar_week=cw,
                month=month,
            )
        )
    db.session.commit()
    return (n_assign, len(defs))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Nur anzeigen, nichts schreiben",
    )
    parser.add_argument(
        "--calendar-year",
        type=int,
        action="append",
        default=[],
        metavar="YYYY",
        help="Alle NRW Mo–Fr-Feiertage dieses Jahres mit einbeziehen (API)",
    )
    args = parser.parse_args()

    app = create_app()
    with app.app_context():
        shift_definitions = ShiftDefinition.query.all()
        if not shift_definitions:
            print("Keine ShiftDefinitions — Abbruch.", file=sys.stderr)
            return 1

        target_dates = collect_target_dates(args.calendar_year)
        if not target_dates:
            print("Keine Zieltermine (keine passenden Instanzen / keine --calendar-year).")
            return 0

        total_a = 0
        total_i = 0
        for d in sorted(target_dates):
            if not is_weekday_holiday(d):
                continue
            a, i = rebuild_one_day(d, shift_definitions, args.dry_run)
            total_a += a
            total_i += i
            print(
                f"{'[DRY] ' if args.dry_run else ''}{d.isoformat()}: "
                f"assignments_deleted={a}, instances_{'to_create' if args.dry_run else 'created'}={i}"
            )

        print(
            f"{'[DRY] ' if args.dry_run else ''}Summe: Zuweisungen gelöscht={total_a}, "
            f"Instanzen {'(würden angelegt)' if args.dry_run else 'neu angelegt'}={total_i}"
        )
        if args.dry_run:
            print("[DRY] Keine Änderungen geschrieben.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
