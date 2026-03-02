"""
Data processing pipeline for the Weather Fatigue project.

Parses raw IEM COW JSON responses into structured pandas/geopandas
DataFrames, and saves processed data as Parquet files.
"""
import json
import logging
from pathlib import Path

import numpy as np
import pandas as pd
import geopandas as gpd
from shapely.geometry import shape

from src.config import RAW_DIR, PROCESSED_DIR

logger = logging.getLogger(__name__)


# ══════════════════════════════════════════════════════════════════════════
# Aggregate Stats (one row per WFO / year)
# ══════════════════════════════════════════════════════════════════════════

def parse_aggregate_stats(data: dict) -> dict:
    """
    Extract the top-level aggregate stats from a single COW API response.

    Returns a flat dictionary with WFO, year, and all aggregate metrics.
    """
    stats = data.get("stats", {})
    params = data.get("params", {})

    # Identify the WFO from params (may be a list)
    wfos = params.get("wfo", [])
    wfo = wfos[0] if isinstance(wfos, list) and len(wfos) == 1 else ",".join(wfos) if wfos else "NATIONAL"

    # Parse year from begints
    begints = params.get("begints", "")
    year = int(begints[:4]) if begints else None

    return {
        "wfo": wfo,
        "year": year,
        "phenomena": ",".join(params.get("phenomena", [])),
        "events_total": stats.get("events_total", 0),
        "events_verified": stats.get("events_verified", 0),
        "verification_rate": (
            stats["events_verified"] / stats["events_total"]
            if stats.get("events_total", 0) > 0 else np.nan
        ),
        "far": stats.get("FAR[1]", np.nan),
        "pod": stats.get("POD[1]", np.nan),
        "csi": stats.get("CSI[1]", np.nan),
        "area_verify_pct": stats.get("area_verify%", np.nan),
        "shared_border_pct": stats.get("shared_border%", np.nan),
        "size_poly_vs_county_pct": stats.get("size_poly_vs_county[%s]", np.nan),
        "avg_size_sqkm": stats.get("avg_size[sq km]", np.nan),
        "avg_leadtime_min": stats.get("avg_leadtime[min]", np.nan),
        "max_leadtime_min": stats.get("max_leadtime[min]", np.nan),
        "min_leadtime_min": stats.get("min_leadtime[min]", np.nan),
        "reports_total": stats.get("reports_total", 0),
        "unwarned_reports": stats.get("unwarned_reports", 0),
        "tdq_stormreports": stats.get("tdq_stormreports", 0),
    }


def build_aggregate_df(raw_data_list: list[dict]) -> pd.DataFrame:
    """
    Build a DataFrame of aggregate stats from multiple API responses.

    Parameters
    ----------
    raw_data_list : list[dict]
        List of parsed JSON responses from the COW API.

    Returns
    -------
    pd.DataFrame
        One row per WFO/year combination with aggregate stats.
    """
    rows = [parse_aggregate_stats(d) for d in raw_data_list]
    df = pd.DataFrame(rows)

    # Type conversions
    numeric_cols = [
        "events_total", "events_verified", "verification_rate",
        "far", "pod", "csi", "area_verify_pct", "shared_border_pct",
        "size_poly_vs_county_pct", "avg_size_sqkm", "avg_leadtime_min",
        "max_leadtime_min", "min_leadtime_min", "reports_total",
        "unwarned_reports", "tdq_stormreports",
    ]
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    return df


# ══════════════════════════════════════════════════════════════════════════
# Per-Event Data (one row per warning polygon)
# ══════════════════════════════════════════════════════════════════════════

def parse_events(data: dict) -> list[dict]:
    """
    Extract individual warning events from a COW API response.

    Each event becomes a flat dictionary with properties and geometry.
    """
    events_geojson = data.get("events", {})
    features = events_geojson.get("features", [])
    rows = []

    for feat in features:
        props = feat.get("properties", {})
        geom = feat.get("geometry")

        row = {
            "event_id": feat.get("id", ""),
            "wfo": props.get("wfo", ""),
            "phenomena": props.get("phenomena", ""),
            "significance": props.get("significance", ""),
            "eventid": props.get("eventid"),
            "year": props.get("year"),
            "issue": props.get("issue"),
            "expire": props.get("expire"),
            "verify": props.get("verify", False),
            "parea": props.get("parea", np.nan),
            "carea": props.get("carea", np.nan),
            "areaverify": props.get("areaverify", np.nan),
            "perimeter": props.get("perimeter", np.nan),
            "sharedborder": props.get("sharedborder", np.nan),
            "lat0": props.get("lat0", np.nan),
            "lon0": props.get("lon0", np.nan),
            "lead0": props.get("lead0", np.nan),
            "hailtag": props.get("hailtag", np.nan),
            "windtag": props.get("windtag", np.nan),
            "status": props.get("status", ""),
            "fcster": props.get("fcster", ""),
            "ugc_codes": props.get("ar_ugc", []),
            "ugc_names": props.get("ar_ugcname", []),
            "stormreports": props.get("stormreports", ""),
        }

        # Compute derived fields
        if row["parea"] and row["carea"] and row["carea"] > 0:
            row["size_reduction_pct"] = (row["carea"] - row["parea"]) / row["carea"] * 100
        else:
            row["size_reduction_pct"] = np.nan

        if row["perimeter"] and row["perimeter"] > 0 and row["sharedborder"] is not None:
            row["perimeter_ratio"] = row["sharedborder"] / row["perimeter"] * 100
        else:
            row["perimeter_ratio"] = np.nan

        # Geometry
        if geom:
            try:
                row["geometry"] = shape(geom)
            except Exception:
                row["geometry"] = None
        else:
            row["geometry"] = None

        rows.append(row)

    return rows


def build_events_gdf(raw_data_list: list[dict]) -> gpd.GeoDataFrame:
    """
    Build a GeoDataFrame of individual warning events from multiple
    API responses.

    Parameters
    ----------
    raw_data_list : list[dict]
        List of parsed JSON responses.

    Returns
    -------
    gpd.GeoDataFrame
        One row per warning event with geometry.
    """
    all_rows = []
    for data in raw_data_list:
        all_rows.extend(parse_events(data))

    gdf = gpd.GeoDataFrame(all_rows, geometry="geometry", crs="EPSG:4326")

    # Parse datetime columns
    for col in ["issue", "expire"]:
        if col in gdf.columns:
            gdf[col] = pd.to_datetime(gdf[col], errors="coerce", utc=True)

    # Add month/season columns for temporal analysis
    if "issue" in gdf.columns:
        gdf["month"] = gdf["issue"].dt.month
        gdf["season"] = gdf["month"].map(
            {12: "DJF", 1: "DJF", 2: "DJF",
             3: "MAM", 4: "MAM", 5: "MAM",
             6: "JJA", 7: "JJA", 8: "JJA",
             9: "SON", 10: "SON", 11: "SON"}
        )

    logger.info(f"Built events GeoDataFrame: {len(gdf)} events")
    return gdf


# ══════════════════════════════════════════════════════════════════════════
# Storm Reports (LSRs)
# ══════════════════════════════════════════════════════════════════════════

def parse_storm_reports(data: dict) -> list[dict]:
    """Extract Local Storm Reports (LSRs) from a COW API response."""
    reports_geojson = data.get("stormreports", {})
    features = reports_geojson.get("features", [])
    rows = []

    for feat in features:
        props = feat.get("properties", {})
        rows.append({
            "report_id": feat.get("id"),
            "wfo": props.get("wfo", ""),
            "lsrtype": props.get("lsrtype", ""),
            "typetext": props.get("typetext", ""),
            "magnitude": props.get("magnitude", np.nan),
            "city": props.get("city", ""),
            "county": props.get("county", ""),
            "state": props.get("state", ""),
            "lat0": props.get("lat0", np.nan),
            "lon0": props.get("lon0", np.nan),
            "valid": props.get("valid"),
            "warned": props.get("warned", False),
            "leadtime": props.get("leadtime", np.nan),
            "remark": props.get("remark", ""),
            "source": props.get("source", ""),
            "tdq": props.get("tdq", False),
        })

    return rows


def build_reports_df(raw_data_list: list[dict]) -> pd.DataFrame:
    """Build a DataFrame of storm reports from multiple API responses."""
    all_rows = []
    for data in raw_data_list:
        all_rows.extend(parse_storm_reports(data))

    df = pd.DataFrame(all_rows)
    if "valid" in df.columns:
        df["valid"] = pd.to_datetime(df["valid"], errors="coerce", utc=True)
    return df


# ══════════════════════════════════════════════════════════════════════════
# Pipeline: Load from cache → Process → Save
# ══════════════════════════════════════════════════════════════════════════

def load_raw_jsons(directory: Path | None = None) -> list[dict]:
    """Load all cached JSON files from the raw data directory."""
    if directory is None:
        directory = RAW_DIR

    files = sorted(directory.glob("*.json"))
    logger.info(f"Loading {len(files)} raw JSON files from {directory}")

    results = []
    for f in files:
        with open(f) as fh:
            results.append(json.load(fh))
    return results


def run_processing_pipeline(raw_dir: Path | None = None):
    """
    Full processing pipeline: load raw JSONs, build DataFrames, save Parquet.

    Outputs:
        - data/processed/aggregate_stats.parquet
        - data/processed/events.parquet
        - data/processed/storm_reports.parquet
    """
    raw_data = load_raw_jsons(raw_dir)

    if not raw_data:
        logger.warning("No raw data found. Run data_collection first.")
        return

    # Aggregate stats
    agg_df = build_aggregate_df(raw_data)
    agg_path = PROCESSED_DIR / "aggregate_stats.parquet"
    agg_df.to_parquet(agg_path, index=False)
    logger.info(f"Saved aggregate stats: {agg_path} ({len(agg_df)} rows)")

    # Events
    events_gdf = build_events_gdf(raw_data)
    events_path = PROCESSED_DIR / "events.parquet"
    events_gdf.to_parquet(events_path, index=False)
    logger.info(f"Saved events: {events_path} ({len(events_gdf)} rows)")

    # Storm reports
    reports_df = build_reports_df(raw_data)
    reports_path = PROCESSED_DIR / "storm_reports.parquet"
    reports_df.to_parquet(reports_path, index=False)
    logger.info(f"Saved storm reports: {reports_path} ({len(reports_df)} rows)")

    print(f"\n✅ Processing complete:")
    print(f"   Aggregate stats: {len(agg_df)} WFO-year rows")
    print(f"   Warning events:  {len(events_gdf)} polygons")
    print(f"   Storm reports:   {len(reports_df)} LSRs")


# ── CLI ──
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
    run_processing_pipeline()
