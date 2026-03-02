"""
Data collection pipeline for the Weather Fatigue project.

Queries the IEM COW API for storm-based warning verification data
across all NWS Weather Forecast Offices, chunked by WFO + year.
Caches raw JSON responses locally to avoid redundant API calls.
"""
import json
import time
import logging
from pathlib import Path
from typing import Optional

import requests
from tqdm import tqdm

from src.config import (
    API_BASE_URL, API_DELAY, RAW_DIR,
    WFO_LIST_CLEAN, PHENOMENA, START_YEAR, END_YEAR, LSR_BUFFER,
)

logger = logging.getLogger(__name__)


def _build_params(
    wfo: str,
    year: int,
    phenomena: list[str],
    lsr_buffer: float = LSR_BUFFER,
) -> dict:
    """Build query parameters for a single IEM COW API request."""
    return {
        "wfo": wfo,
        "begints": f"{year}-01-01T00:00Z",
        "endts": f"{year + 1}-01-01T00:00Z",
        "phenomena": phenomena,
        "lsrbuffer": lsr_buffer,
    }


def _cache_path(wfo: str, year: int, phenomena: list[str]) -> Path:
    """Return the local cache file path for a given query."""
    pheno_str = "_".join(sorted(phenomena))
    return RAW_DIR / f"{wfo}_{year}_{pheno_str}.json"


def fetch_single(
    wfo: str,
    year: int,
    phenomena: list[str] | None = None,
    lsr_buffer: float = LSR_BUFFER,
    force: bool = False,
) -> dict | None:
    """
    Fetch COW data for a single WFO/year combination.

    Parameters
    ----------
    wfo : str
        3-letter WFO identifier (e.g. 'OUN').
    year : int
        Calendar year to query.
    phenomena : list[str], optional
        Phenomena codes to query. Defaults to config.PHENOMENA.
    lsr_buffer : float
        LSR buffer distance in miles.
    force : bool
        If True, skip the cache and re-fetch from the API.

    Returns
    -------
    dict or None
        Parsed JSON response, or None on failure.
    """
    if phenomena is None:
        phenomena = PHENOMENA

    cache = _cache_path(wfo, year, phenomena)

    # Return cached data if available
    if cache.exists() and not force:
        logger.debug(f"Cache hit: {cache.name}")
        with open(cache) as f:
            return json.load(f)

    # Build request
    params = _build_params(wfo, year, phenomena, lsr_buffer)
    logger.info(f"Fetching: WFO={wfo}, Year={year}, Phenomena={phenomena}")

    try:
        resp = requests.get(API_BASE_URL, params=params, timeout=60)
        resp.raise_for_status()
        data = resp.json()

        # Cache the response
        with open(cache, "w") as f:
            json.dump(data, f)

        return data

    except requests.RequestException as e:
        logger.error(f"API error for {wfo}/{year}: {e}")
        return None


def fetch_all(
    wfos: list[str] | None = None,
    years: tuple[int, int] | None = None,
    phenomena: list[str] | None = None,
    force: bool = False,
) -> list[dict]:
    """
    Fetch COW data for multiple WFOs across multiple years.

    Parameters
    ----------
    wfos : list[str], optional
        WFO identifiers. Defaults to all WFOs.
    years : tuple[int, int], optional
        (start_year, end_year) inclusive. Defaults to config range.
    phenomena : list[str], optional
        Phenomena codes. Defaults to config.PHENOMENA.
    force : bool
        If True, re-fetch all data even if cached.

    Returns
    -------
    list[dict]
        List of parsed JSON responses (one per WFO/year combo).
    """
    if wfos is None:
        wfos = WFO_LIST_CLEAN
    if years is None:
        years = (START_YEAR, END_YEAR)
    if phenomena is None:
        phenomena = PHENOMENA

    results = []
    combos = [(wfo, yr) for wfo in wfos for yr in range(years[0], years[1] + 1)]

    for wfo, year in tqdm(combos, desc="Fetching COW data"):
        data = fetch_single(wfo, year, phenomena, force=force)
        if data is not None:
            results.append(data)
        time.sleep(API_DELAY)

    logger.info(f"Fetched {len(results)}/{len(combos)} WFO-year combinations")
    return results


def fetch_national_by_year(
    year: int,
    phenomena: list[str] | None = None,
    force: bool = False,
) -> dict | None:
    """
    Fetch COW data for the entire nation for a single year
    (no WFO filter — returns national aggregate).
    """
    if phenomena is None:
        phenomena = PHENOMENA

    cache = RAW_DIR / f"NATIONAL_{year}_{'_'.join(sorted(phenomena))}.json"

    if cache.exists() and not force:
        with open(cache) as f:
            return json.load(f)

    params = {
        "begints": f"{year}-01-01T00:00Z",
        "endts": f"{year + 1}-01-01T00:00Z",
        "phenomena": phenomena,
        "lsrbuffer": LSR_BUFFER,
    }

    try:
        resp = requests.get(API_BASE_URL, params=params, timeout=120)
        resp.raise_for_status()
        data = resp.json()
        with open(cache, "w") as f:
            json.dump(data, f)
        return data
    except requests.RequestException as e:
        logger.error(f"API error for national/{year}: {e}")
        return None


# ── CLI Entry Point ───────────────────────────────────────────────────────
if __name__ == "__main__":
    import argparse

    logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")

    parser = argparse.ArgumentParser(description="Fetch IEM COW data")
    parser.add_argument("--wfos", nargs="+", default=None, help="WFO codes to fetch")
    parser.add_argument("--start-year", type=int, default=START_YEAR)
    parser.add_argument("--end-year", type=int, default=END_YEAR)
    parser.add_argument("--phenomena", nargs="+", default=PHENOMENA)
    parser.add_argument("--force", action="store_true", help="Re-fetch cached data")
    args = parser.parse_args()

    results = fetch_all(
        wfos=args.wfos,
        years=(args.start_year, args.end_year),
        phenomena=args.phenomena,
        force=args.force,
    )
    print(f"\nDone. Fetched {len(results)} results. Raw data cached in {RAW_DIR}")
