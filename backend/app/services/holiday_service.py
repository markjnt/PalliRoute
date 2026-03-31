"""
NRW public holidays via feiertage-api.de (cached per year).
"""

from __future__ import annotations

import logging
from datetime import date, datetime
from typing import Dict, Optional

import requests

from config import Config

logger = logging.getLogger(__name__)

# year -> date -> holiday name
_year_cache: Dict[int, Dict[date, str]] = {}


def _api_base() -> str:
    base = getattr(Config, "HOLIDAY_API_BASE_URL", None) or "https://feiertage-api.de/api/"
    return base.rstrip("/") + "/"


def _state_code() -> str:
    return getattr(Config, "HOLIDAY_STATE", None) or "NW"


def fetch_holidays_for_year(year: int, timeout: float = 10.0) -> Dict[date, str]:
    """
    Load NRW holidays for calendar year from API. Successful parses are cached in memory.

    Transient failures (network, timeout, HTTP error) are not cached so the next call retries.
    Callers see an empty mapping for that request only; avoid permanently treating holidays as
    absent after one failed fetch.
    """
    if year in _year_cache:
        return _year_cache[year]

    url = f"{_api_base()}?jahr={year}&nur_land={_state_code()}"
    try:
        resp = requests.get(url, timeout=timeout)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        logger.warning("Holiday API request failed for year %s: %s", year, e)
        return {}

    out: Dict[date, str] = {}
    if not isinstance(data, dict):
        logger.warning(
            "Holiday API returned unexpected JSON type for year %s: %s",
            year,
            type(data).__name__,
        )
        return out

    for name, payload in data.items():
        if not isinstance(payload, dict):
            continue
        ds = payload.get("datum")
        if not ds:
            continue
        try:
            parts = str(ds).split("-")
            if len(parts) == 3:
                y, m, d = int(parts[0]), int(parts[1]), int(parts[2])
                out[date(y, m, d)] = str(name)
        except (ValueError, TypeError):
            continue

    _year_cache[year] = out
    return out


def clear_holiday_cache() -> None:
    """Clear in-memory cache (e.g. for tests)."""
    _year_cache.clear()


def holiday_name_for_date(d: date) -> Optional[str]:
    """Return German holiday name if d is a public holiday in NRW, else None."""
    holidays = fetch_holidays_for_year(d.year)
    return holidays.get(d)


def is_holiday(d: date) -> bool:
    """True if d is an NRW public holiday (any weekday)."""
    return holiday_name_for_date(d) is not None


def is_weekday_holiday(d: date) -> bool:
    """True if d is Monday–Friday and an NRW public holiday."""
    if d.weekday() >= 5:
        return False
    return is_holiday(d)


def date_for_iso_week_and_weekday(calendar_week: int, english_weekday: str, year: int) -> date:
    """
    Map ISO calendar week + english weekday string to a concrete date.
    english_weekday: monday..sunday
    """
    wd_map = {
        "monday": 1,
        "tuesday": 2,
        "wednesday": 3,
        "thursday": 4,
        "friday": 5,
        "saturday": 6,
        "sunday": 7,
    }
    iso_d = wd_map.get(english_weekday.lower())
    if iso_d is None:
        raise ValueError(f"Unknown weekday: {english_weekday}")
    return date.fromisocalendar(year, calendar_week, iso_d)


def default_planning_year() -> int:
    """Calendar year used elsewhere in the app (e.g. route_utils)."""
    return datetime.now().year


def is_aw_area_assignment_day(calendar_week: Optional[int], english_weekday: str) -> bool:
    """
    True if tours use AW-style area assignment (Nord/Mitte/Süd): Saturday/Sunday or
    NRW public holiday on Monday–Friday for the date from ISO week + weekday.
    """
    wd = (english_weekday or "").lower()
    if wd in ("saturday", "sunday"):
        return True
    if wd not in ("monday", "tuesday", "wednesday", "thursday", "friday"):
        return False
    if calendar_week is None:
        return False
    try:
        d = date_for_iso_week_and_weekday(calendar_week, wd, default_planning_year())
        return is_weekday_holiday(d)
    except ValueError:
        return False
