"""
Core verification analysis for the Weather Fatigue project.

Computes national and per-WFO verification metrics (FAR, POD, CSI, etc.)
from processed event and aggregate data.
"""
import logging

import numpy as np
import pandas as pd
import geopandas as gpd

from src.config import PROCESSED_DIR

logger = logging.getLogger(__name__)


# ══════════════════════════════════════════════════════════════════════════
# Load Processed Data
# ══════════════════════════════════════════════════════════════════════════

def load_aggregate_stats() -> pd.DataFrame:
    """Load the aggregate stats Parquet file."""
    path = PROCESSED_DIR / "aggregate_stats.parquet"
    return pd.read_parquet(path)


def load_events() -> gpd.GeoDataFrame:
    """Load the warning events Parquet file."""
    path = PROCESSED_DIR / "events.parquet"
    return gpd.read_parquet(path)


def load_storm_reports() -> pd.DataFrame:
    """Load the storm reports Parquet file."""
    path = PROCESSED_DIR / "storm_reports.parquet"
    return pd.read_parquet(path)


# ══════════════════════════════════════════════════════════════════════════
# Event-Level Verification Metrics
# ══════════════════════════════════════════════════════════════════════════

def compute_verification_by_group(
    events: gpd.GeoDataFrame,
    group_cols: list[str],
) -> pd.DataFrame:
    """
    Compute verification metrics grouped by one or more columns.

    Parameters
    ----------
    events : GeoDataFrame
        Warning events with 'verify', 'areaverify', 'parea', etc.
    group_cols : list[str]
        Columns to group by (e.g. ['wfo'], ['phenomena'], ['year']).

    Returns
    -------
    pd.DataFrame
        Grouped metrics: total events, verified, FAR, verification rate,
        mean area verify %, mean polygon area, mean lead time.
    """
    grouped = events.groupby(group_cols, dropna=False)

    result = grouped.agg(
        events_total=("verify", "count"),
        events_verified=("verify", "sum"),
        mean_areaverify=("areaverify", "mean"),
        median_areaverify=("areaverify", "median"),
        mean_parea=("parea", "mean"),
        mean_lead0=("lead0", "mean"),
        mean_perimeter_ratio=("perimeter_ratio", "mean"),
        mean_size_reduction=("size_reduction_pct", "mean"),
    ).reset_index()

    # Compute derived metrics
    result["verification_rate"] = result["events_verified"] / result["events_total"]
    result["far"] = 1 - result["verification_rate"]  # False Alarm Ratio

    return result.sort_values("far", ascending=False)


def national_summary(events: gpd.GeoDataFrame) -> dict:
    """
    Compute a single national summary of verification metrics.
    """
    total = len(events)
    verified = events["verify"].sum()

    return {
        "events_total": total,
        "events_verified": int(verified),
        "verification_rate": verified / total if total > 0 else np.nan,
        "far": 1 - (verified / total) if total > 0 else np.nan,
        "mean_area_verify_pct": events["areaverify"].mean(),
        "median_area_verify_pct": events["areaverify"].median(),
        "mean_polygon_area_sqkm": events["parea"].mean(),
        "mean_leadtime_min": events["lead0"].mean(),
        "mean_perimeter_ratio": events["perimeter_ratio"].mean(),
        "mean_size_reduction_pct": events["size_reduction_pct"].mean(),
    }


def verification_by_wfo(events: gpd.GeoDataFrame) -> pd.DataFrame:
    """Verification metrics grouped by WFO."""
    return compute_verification_by_group(events, ["wfo"])


def verification_by_phenomena(events: gpd.GeoDataFrame) -> pd.DataFrame:
    """Verification metrics grouped by phenomena type."""
    return compute_verification_by_group(events, ["phenomena"])


def verification_by_year(events: gpd.GeoDataFrame) -> pd.DataFrame:
    """Verification metrics grouped by year."""
    return compute_verification_by_group(events, ["year"])


def verification_by_wfo_phenomena(events: gpd.GeoDataFrame) -> pd.DataFrame:
    """Verification metrics grouped by WFO and phenomena."""
    return compute_verification_by_group(events, ["wfo", "phenomena"])


def verification_by_month(events: gpd.GeoDataFrame) -> pd.DataFrame:
    """Verification metrics grouped by month."""
    return compute_verification_by_group(events, ["month"])


def verification_by_season(events: gpd.GeoDataFrame) -> pd.DataFrame:
    """Verification metrics grouped by season."""
    return compute_verification_by_group(events, ["season"])


def verification_by_year_phenomena(events: gpd.GeoDataFrame) -> pd.DataFrame:
    """Verification metrics grouped by year and phenomena."""
    return compute_verification_by_group(events, ["year", "phenomena"])


# ══════════════════════════════════════════════════════════════════════════
# Top/Bottom Rankings
# ══════════════════════════════════════════════════════════════════════════

def top_n_wfos(
    by_wfo: pd.DataFrame,
    metric: str = "far",
    n: int = 10,
    ascending: bool = True,
) -> pd.DataFrame:
    """
    Return top N WFOs by a given metric.
    Default: lowest FAR (best performers).
    """
    min_events = 50  # filter out WFOs with very few events
    filtered = by_wfo[by_wfo["events_total"] >= min_events]
    return filtered.nsmallest(n, metric) if ascending else filtered.nlargest(n, metric)


def worst_n_wfos(by_wfo: pd.DataFrame, metric: str = "far", n: int = 10) -> pd.DataFrame:
    """Return worst N WFOs by FAR (highest false alarm ratio)."""
    return top_n_wfos(by_wfo, metric=metric, n=n, ascending=False)


# ══════════════════════════════════════════════════════════════════════════
# Unwarned Event Analysis
# ══════════════════════════════════════════════════════════════════════════

def unwarned_report_analysis(reports: pd.DataFrame) -> pd.DataFrame:
    """
    Analyze Local Storm Reports that were NOT warned for.
    Group by WFO and report type.
    """
    unwarned = reports[reports["warned"] == False].copy()

    grouped = unwarned.groupby(["wfo", "lsrtype"]).agg(
        unwarned_count=("warned", "count"),
    ).reset_index()

    return grouped.sort_values("unwarned_count", ascending=False)


# ══════════════════════════════════════════════════════════════════════════
# Summary Report
# ══════════════════════════════════════════════════════════════════════════

def print_national_summary(events: gpd.GeoDataFrame):
    """Print a formatted national summary to the console."""
    s = national_summary(events)
    print("\n" + "=" * 60)
    print("  NATIONAL STORM-BASED WARNING VERIFICATION SUMMARY")
    print("=" * 60)
    print(f"  Total Warning Events:      {s['events_total']:,}")
    print(f"  Verified Events:           {s['events_verified']:,}")
    print(f"  Verification Rate:         {s['verification_rate']:.1%}")
    print(f"  False Alarm Ratio:         {s['far']:.1%}")
    print(f"  Mean Area Verified:        {s['mean_area_verify_pct']:.1f}%")
    print(f"  Median Area Verified:      {s['median_area_verify_pct']:.1f}%")
    print(f"  Mean Polygon Size:         {s['mean_polygon_area_sqkm']:.0f} km²")
    print(f"  Mean Lead Time:            {s['mean_leadtime_min']:.0f} min")
    print(f"  Mean Perimeter Ratio:      {s['mean_perimeter_ratio']:.1f}%")
    print(f"  Mean Size Reduction:       {s['mean_size_reduction_pct']:.1f}%")
    print("=" * 60 + "\n")


# ── CLI ──
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")

    events = load_events()
    print_national_summary(events)

    by_phenomena = verification_by_phenomena(events)
    print("\nBy Phenomena Type:")
    print(by_phenomena[["phenomena", "events_total", "verification_rate", "far", "mean_areaverify"]].to_string(index=False))

    by_year = verification_by_year(events)
    print("\nBy Year:")
    print(by_year[["year", "events_total", "verification_rate", "far"]].to_string(index=False))

    by_wfo = verification_by_wfo(events)
    print("\nTop 10 WFOs (lowest FAR):")
    print(top_n_wfos(by_wfo)[["wfo", "events_total", "far", "verification_rate"]].to_string(index=False))

    print("\nBottom 10 WFOs (highest FAR):")
    print(worst_n_wfos(by_wfo)[["wfo", "events_total", "far", "verification_rate"]].to_string(index=False))
