"""
Choropleth maps and spatial visualizations for the Weather Fatigue project.

Generates national maps of verification metrics by WFO (County Warning Area).
"""
import logging
from pathlib import Path

import numpy as np
import pandas as pd
import geopandas as gpd
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
from matplotlib.patches import Patch

from src.config import FIGURES_DIR

logger = logging.getLogger(__name__)

# ── CWA Boundaries ────────────────────────────────────────────────────────
# NWS CWA shapefile URL (hosted by NWS)
CWA_SHAPEFILE_URL = "https://www.weather.gov/source/gis/Shapefiles/WSOM/w_05mr24.zip"


def load_cwa_boundaries(shapefile_path: str | None = None) -> gpd.GeoDataFrame:
    """
    Load NWS County Warning Area (CWA) boundaries.

    If no local path is provided, attempts to download from NWS.
    """
    if shapefile_path and Path(shapefile_path).exists():
        return gpd.read_file(shapefile_path)

    logger.info("Downloading CWA boundaries from NWS...")
    try:
        return gpd.read_file(CWA_SHAPEFILE_URL)
    except Exception as e:
        logger.warning(f"Could not download CWA shapefile: {e}")
        logger.info("Falling back to point-based WFO map.")
        return None


def _setup_conus_axes(ax, title: str):
    """Configure axes for a CONUS-focused map."""
    ax.set_xlim(-130, -65)
    ax.set_ylim(23, 52)
    ax.set_title(title, fontsize=16, fontweight="bold", pad=15)
    ax.set_axis_off()


def choropleth_by_wfo(
    wfo_stats: pd.DataFrame,
    metric: str = "far",
    cwa_gdf: gpd.GeoDataFrame | None = None,
    title: str | None = None,
    cmap: str = "RdYlGn_r",
    vmin: float | None = None,
    vmax: float | None = None,
    save_name: str | None = None,
) -> plt.Figure:
    """
    Create a national choropleth map colored by a WFO-level metric.

    Parameters
    ----------
    wfo_stats : pd.DataFrame
        Must have 'wfo' column and the metric column.
    metric : str
        Column name to map (e.g. 'far', 'verification_rate', 'mean_areaverify').
    cwa_gdf : GeoDataFrame, optional
        CWA boundary geometries. If None, creates a point map from lat/lon.
    title : str, optional
        Plot title.
    cmap : str
        Matplotlib colormap name.
    save_name : str, optional
        Filename to save in FIGURES_DIR.
    """
    if title is None:
        titles = {
            "far": "False Alarm Ratio by WFO",
            "verification_rate": "Verification Rate by WFO",
            "mean_areaverify": "Mean Area Verification % by WFO",
            "mean_perimeter_ratio": "Mean Perimeter Ratio by WFO",
        }
        title = titles.get(metric, f"{metric} by WFO")

    fig, ax = plt.subplots(1, 1, figsize=(18, 10))

    if cwa_gdf is not None:
        # Merge stats with CWA geometry
        # Try common WFO column names in CWA shapefiles
        wfo_col = None
        for candidate in ["WFO", "CWA", "SITE_ID", "ID"]:
            if candidate in cwa_gdf.columns:
                wfo_col = candidate
                break

        if wfo_col is None:
            logger.warning("Could not find WFO column in CWA shapefile.")
            return fig

        merged = cwa_gdf.merge(wfo_stats, left_on=wfo_col, right_on="wfo", how="left")

        # Plot base boundaries
        merged.plot(
            ax=ax,
            column=metric,
            cmap=cmap,
            linewidth=0.5,
            edgecolor="black",
            legend=True,
            legend_kwds={
                "label": metric.replace("_", " ").title(),
                "shrink": 0.6,
                "pad": 0.02,
            },
            missing_kwds={"color": "lightgrey", "label": "No Data"},
            vmin=vmin,
            vmax=vmax,
        )
    else:
        # Fallback: point map using WFO centroids from event data
        if "lat0" in wfo_stats.columns and "lon0" in wfo_stats.columns:
            scatter = ax.scatter(
                wfo_stats["lon0"], wfo_stats["lat0"],
                c=wfo_stats[metric],
                cmap=cmap,
                s=80,
                edgecolors="black",
                linewidth=0.5,
                zorder=5,
                vmin=vmin,
                vmax=vmax,
            )
            plt.colorbar(scatter, ax=ax, shrink=0.6, label=metric.replace("_", " ").title())

    _setup_conus_axes(ax, title)

    if save_name:
        path = FIGURES_DIR / save_name
        fig.savefig(path, dpi=150, bbox_inches="tight")
        logger.info(f"Saved: {path}")

    return fig


def far_map(wfo_stats: pd.DataFrame, cwa_gdf=None, **kwargs):
    """National FAR choropleth (red = high FAR = worse)."""
    return choropleth_by_wfo(
        wfo_stats, metric="far", cwa_gdf=cwa_gdf,
        cmap="RdYlGn_r", vmin=0, vmax=1,
        save_name="national_far_map.png", **kwargs,
    )


def verification_rate_map(wfo_stats: pd.DataFrame, cwa_gdf=None, **kwargs):
    """National verification rate choropleth (green = high = better)."""
    return choropleth_by_wfo(
        wfo_stats, metric="verification_rate", cwa_gdf=cwa_gdf,
        cmap="RdYlGn", vmin=0, vmax=1,
        save_name="national_verification_rate_map.png", **kwargs,
    )


def area_verify_map(wfo_stats: pd.DataFrame, cwa_gdf=None, **kwargs):
    """National area verification % choropleth."""
    return choropleth_by_wfo(
        wfo_stats, metric="mean_areaverify", cwa_gdf=cwa_gdf,
        cmap="YlOrRd", vmin=0, vmax=100,
        save_name="national_area_verify_map.png", **kwargs,
    )


def perimeter_ratio_map(wfo_stats: pd.DataFrame, cwa_gdf=None, **kwargs):
    """National perimeter ratio choropleth."""
    return choropleth_by_wfo(
        wfo_stats, metric="mean_perimeter_ratio", cwa_gdf=cwa_gdf,
        cmap="PuBuGn", vmin=0, vmax=100,
        save_name="national_perimeter_ratio_map.png", **kwargs,
    )


# ── Event-Level Heatmap ──────────────────────────────────────────────────

def event_heatmap(
    events: gpd.GeoDataFrame,
    verified_only: bool = False,
    false_alarms_only: bool = False,
    title: str | None = None,
    save_name: str | None = None,
) -> plt.Figure:
    """
    Plot a point density heatmap of warning event centroids.

    Parameters
    ----------
    events : GeoDataFrame
        Warning events with lat0, lon0.
    verified_only : bool
        Only plot verified events.
    false_alarms_only : bool
        Only plot false alarm events.
    """
    subset = events.copy()
    if verified_only:
        subset = subset[subset["verify"] == True]
        title = title or "Verified Warning Events"
    elif false_alarms_only:
        subset = subset[subset["verify"] == False]
        title = title or "False Alarm Warning Events"
    else:
        title = title or "All Warning Events"

    fig, ax = plt.subplots(1, 1, figsize=(18, 10))

    ax.hexbin(
        subset["lon0"], subset["lat0"],
        gridsize=80,
        cmap="YlOrRd",
        mincnt=1,
        alpha=0.8,
    )

    _setup_conus_axes(ax, title)

    if save_name:
        path = FIGURES_DIR / save_name
        fig.savefig(path, dpi=150, bbox_inches="tight")
        logger.info(f"Saved: {path}")

    return fig
