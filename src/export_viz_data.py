"""
Export processed parquet data to lightweight JSON for the web visualization.

Outputs:
  - viz/data/reports.json   (sampled storm reports with region tags)
  - viz/data/agg_stats.json (aggregate stats with region tags)
"""
import json
from pathlib import Path
import pandas as pd
import numpy as np

PROCESSED_DIR = Path(__file__).resolve().parent.parent / "data" / "processed"
VIZ_DATA_DIR = Path(__file__).resolve().parent.parent / "viz" / "data"

# Region mapping based on US Census Bureau regions
REGION_MAP = {
    # NORTHEAST
    "CT": "Northeast", "ME": "Northeast", "MA": "Northeast",
    "NH": "Northeast", "RI": "Northeast", "VT": "Northeast",
    "NJ": "Northeast", "NY": "Northeast", "PA": "Northeast",
    # MIDWEST
    "IL": "Midwest", "IN": "Midwest", "MI": "Midwest",
    "OH": "Midwest", "WI": "Midwest", "IA": "Midwest",
    "KS": "Midwest", "MN": "Midwest", "MO": "Midwest",
    "NE": "Midwest", "ND": "Midwest", "SD": "Midwest",
    # SOUTH
    "DE": "South", "FL": "South", "GA": "South",
    "MD": "South", "NC": "South", "SC": "South",
    "VA": "South", "DC": "South", "WV": "South",
    "AL": "South", "KY": "South", "MS": "South",
    "TN": "South", "AR": "South", "LA": "South",
    "OK": "South", "TX": "South",
    # WEST
    "AZ": "West", "CO": "West", "ID": "West",
    "MT": "West", "NV": "West", "NM": "West",
    "UT": "West", "WY": "West", "AK": "West",
    "CA": "West", "HI": "West", "OR": "West",
    "WA": "West",
}


def export():
    VIZ_DATA_DIR.mkdir(parents=True, exist_ok=True)

    # ── Storm Reports ──
    print("Loading storm reports...")
    reports = pd.read_parquet(PROCESSED_DIR / "storm_reports.parquet")

    # Clean: filter bad lat/lon
    reports = reports[
        (reports["lat0"] > 20) & (reports["lat0"] < 55) &
        (reports["lon0"] > -130) & (reports["lon0"] < -60)
    ].copy()

    # Add region
    reports["region"] = reports["state"].str.strip().map(REGION_MAP)
    reports = reports.dropna(subset=["region"])

    # Sample for performance — take up to 50k reports per region
    dfs = []
    for region, group in reports.groupby("region"):
        n = min(len(group), 50000)
        dfs.append(group.sample(n=n, random_state=42))
    sampled = pd.concat(dfs, ignore_index=True)

    # Select only needed columns and convert
    cols = ["wfo", "state", "lat0", "lon0", "warned", "typetext", "region"]
    out_reports = sampled[cols].copy()
    out_reports["warned"] = out_reports["warned"].astype(bool)
    out_reports["lat0"] = out_reports["lat0"].round(3)
    out_reports["lon0"] = out_reports["lon0"].round(3)

    reports_path = VIZ_DATA_DIR / "reports.json"
    out_reports.to_json(reports_path, orient="records")
    print(f"  → {reports_path} ({len(out_reports)} reports)")

    # ── Aggregate Stats ──
    print("Loading aggregate stats...")
    agg = pd.read_parquet(PROCESSED_DIR / "aggregate_stats.parquet")

    # Map WFO to region via the most common state in reports
    wfo_region = (
        reports.groupby("wfo")["region"]
        .agg(lambda x: x.mode().iloc[0] if len(x.mode()) > 0 else None)
        .to_dict()
    )
    agg["region"] = agg["wfo"].map(wfo_region)
    agg = agg.dropna(subset=["region"])

    # Select columns
    agg_cols = [
        "wfo", "year", "verification_rate", "far", "pod", "csi",
        "events_total", "events_verified", "avg_leadtime_min", "region"
    ]
    out_agg = agg[agg_cols].copy()

    # Replace NaN with null for JSON
    out_agg = out_agg.where(pd.notna(out_agg), None)

    agg_path = VIZ_DATA_DIR / "agg_stats.json"
    out_agg.to_json(agg_path, orient="records", default_handler=str)
    print(f"  → {agg_path} ({len(out_agg)} rows)")

    print("\n✅ Export complete!")


if __name__ == "__main__":
    export()
