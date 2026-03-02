"""
Chart visualizations for the Weather Fatigue project.

Time-series, distributions, and ranking plots for verification metrics.
"""
import logging

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker

from src.config import FIGURES_DIR

logger = logging.getLogger(__name__)

# ── Style ─────────────────────────────────────────────────────────────────
plt.rcParams.update({
    "figure.facecolor": "white",
    "axes.facecolor": "#f8f9fa",
    "axes.grid": True,
    "grid.alpha": 0.3,
    "font.family": "sans-serif",
    "font.size": 11,
})

PHENOMENA_COLORS = {
    "TO": "#e74c3c",   # Red for tornado
    "SV": "#f39c12",   # Orange for severe thunderstorm
    "FF": "#3498db",   # Blue for flash flood
    "SQ": "#9b59b6",   # Purple for snow squall
}

PHENOMENA_LABELS = {
    "TO": "Tornado",
    "SV": "Severe T-Storm",
    "FF": "Flash Flood",
    "SQ": "Snow Squall",
}


# ══════════════════════════════════════════════════════════════════════════
# Time-Series Plots
# ══════════════════════════════════════════════════════════════════════════

def timeseries_verification(
    by_year: pd.DataFrame,
    metrics: list[str] | None = None,
    title: str = "National Verification Metrics Over Time",
    save_name: str = "timeseries_verification.png",
) -> plt.Figure:
    """
    Plot verification metrics as a time series by year.

    Parameters
    ----------
    by_year : pd.DataFrame
        Output from verification_by_year(). Must have 'year' column.
    metrics : list[str]
        Columns to plot. Defaults to FAR and verification rate.
    """
    if metrics is None:
        metrics = ["far", "verification_rate"]

    fig, ax = plt.subplots(figsize=(14, 6))

    colors = ["#e74c3c", "#2ecc71", "#3498db", "#f39c12"]
    labels = {
        "far": "False Alarm Ratio",
        "verification_rate": "Verification Rate",
        "mean_areaverify": "Mean Area Verified %",
        "mean_perimeter_ratio": "Mean Perimeter Ratio %",
    }

    for i, metric in enumerate(metrics):
        if metric in by_year.columns:
            ax.plot(
                by_year["year"], by_year[metric],
                marker="o", linewidth=2, markersize=6,
                color=colors[i % len(colors)],
                label=labels.get(metric, metric),
            )

    ax.set_xlabel("Year", fontsize=12)
    ax.set_ylabel("Rate", fontsize=12)
    ax.set_title(title, fontsize=14, fontweight="bold")
    ax.legend(fontsize=11)
    ax.yaxis.set_major_formatter(mticker.PercentFormatter(1.0))

    fig.tight_layout()
    if save_name:
        path = FIGURES_DIR / save_name
        fig.savefig(path, dpi=150, bbox_inches="tight")
        logger.info(f"Saved: {path}")

    return fig


def timeseries_by_phenomena(
    by_year_phenom: pd.DataFrame,
    metric: str = "far",
    title: str | None = None,
    save_name: str = "timeseries_far_by_phenomena.png",
) -> plt.Figure:
    """
    Plot a single metric over time, split by phenomena type.
    """
    if title is None:
        title = f"{metric.upper().replace('_', ' ')} Over Time by Warning Type"

    fig, ax = plt.subplots(figsize=(14, 6))

    for phenom in by_year_phenom["phenomena"].unique():
        subset = by_year_phenom[by_year_phenom["phenomena"] == phenom]
        color = PHENOMENA_COLORS.get(phenom, "#95a5a6")
        label = PHENOMENA_LABELS.get(phenom, phenom)
        ax.plot(
            subset["year"], subset[metric],
            marker="o", linewidth=2, markersize=5,
            color=color, label=label,
        )

    ax.set_xlabel("Year", fontsize=12)
    ax.set_ylabel(metric.replace("_", " ").title(), fontsize=12)
    ax.set_title(title, fontsize=14, fontweight="bold")
    ax.legend(fontsize=11)

    if metric in ("far", "verification_rate"):
        ax.yaxis.set_major_formatter(mticker.PercentFormatter(1.0))

    fig.tight_layout()
    if save_name:
        path = FIGURES_DIR / save_name
        fig.savefig(path, dpi=150, bbox_inches="tight")
        logger.info(f"Saved: {path}")

    return fig


# ══════════════════════════════════════════════════════════════════════════
# Distribution Plots
# ══════════════════════════════════════════════════════════════════════════

def area_verify_distribution(
    events: pd.DataFrame,
    by_phenomena: bool = True,
    save_name: str = "area_verify_distribution.png",
) -> plt.Figure:
    """
    Histogram / KDE of area verification % across all events.
    """
    fig, axes = plt.subplots(1, 2, figsize=(16, 6))

    # Left: histogram
    ax = axes[0]
    if by_phenomena:
        for phenom in events["phenomena"].unique():
            subset = events[events["phenomena"] == phenom]
            values = subset["areaverify"].dropna()
            color = PHENOMENA_COLORS.get(phenom, "#95a5a6")
            label = PHENOMENA_LABELS.get(phenom, phenom)
            ax.hist(values, bins=50, alpha=0.5, color=color, label=label, density=True)
    else:
        ax.hist(events["areaverify"].dropna(), bins=50, alpha=0.7, color="#3498db", density=True)

    ax.set_xlabel("Area Verification %", fontsize=12)
    ax.set_ylabel("Density", fontsize=12)
    ax.set_title("Distribution of Area Verification %", fontsize=13, fontweight="bold")
    ax.legend()

    # Right: boxplot by phenomena
    ax2 = axes[1]
    phenom_data = []
    phenom_labels = []
    for phenom in sorted(events["phenomena"].unique()):
        vals = events[events["phenomena"] == phenom]["areaverify"].dropna()
        if len(vals) > 0:
            phenom_data.append(vals)
            phenom_labels.append(PHENOMENA_LABELS.get(phenom, phenom))

    bp = ax2.boxplot(phenom_data, labels=phenom_labels, patch_artist=True)
    for i, patch in enumerate(bp["boxes"]):
        phenom_code = sorted(events["phenomena"].unique())[i]
        patch.set_facecolor(PHENOMENA_COLORS.get(phenom_code, "#95a5a6"))
        patch.set_alpha(0.6)

    ax2.set_ylabel("Area Verification %", fontsize=12)
    ax2.set_title("Area Verification by Warning Type", fontsize=13, fontweight="bold")

    fig.tight_layout()
    if save_name:
        path = FIGURES_DIR / save_name
        fig.savefig(path, dpi=150, bbox_inches="tight")
        logger.info(f"Saved: {path}")

    return fig


# ══════════════════════════════════════════════════════════════════════════
# Ranking Charts
# ══════════════════════════════════════════════════════════════════════════

def wfo_ranking_bar(
    wfo_stats: pd.DataFrame,
    metric: str = "far",
    n: int = 20,
    ascending: bool = True,
    title: str | None = None,
    save_name: str | None = None,
) -> plt.Figure:
    """
    Horizontal bar chart ranking WFOs by a given metric.
    """
    min_events = 50
    filtered = wfo_stats[wfo_stats["events_total"] >= min_events].copy()

    if ascending:
        subset = filtered.nsmallest(n, metric)
        default_title = f"Top {n} WFOs (Lowest {metric.upper()})"
    else:
        subset = filtered.nlargest(n, metric)
        default_title = f"Bottom {n} WFOs (Highest {metric.upper()})"

    if title is None:
        title = default_title

    fig, ax = plt.subplots(figsize=(10, max(6, n * 0.4)))

    colors = plt.cm.RdYlGn_r(np.linspace(0.2, 0.8, len(subset)))
    if ascending:
        colors = colors[::-1]

    bars = ax.barh(subset["wfo"], subset[metric], color=colors, edgecolor="black", linewidth=0.3)

    ax.set_xlabel(metric.replace("_", " ").title(), fontsize=12)
    ax.set_title(title, fontsize=14, fontweight="bold")
    ax.invert_yaxis()

    if metric in ("far", "verification_rate"):
        ax.xaxis.set_major_formatter(mticker.PercentFormatter(1.0))

    fig.tight_layout()
    if save_name:
        path = FIGURES_DIR / save_name
        fig.savefig(path, dpi=150, bbox_inches="tight")
        logger.info(f"Saved: {path}")

    return fig


def monthly_heatmap(
    events: pd.DataFrame,
    metric: str = "far",
    save_name: str = "monthly_verification_heatmap.png",
) -> plt.Figure:
    """
    Heatmap of a metric by month and year.
    """
    pivot = events.groupby(["year", "month"]).agg(
        events_total=("verify", "count"),
        events_verified=("verify", "sum"),
    ).reset_index()
    pivot["far"] = 1 - (pivot["events_verified"] / pivot["events_total"])
    pivot["verification_rate"] = pivot["events_verified"] / pivot["events_total"]

    matrix = pivot.pivot(index="year", columns="month", values=metric)

    fig, ax = plt.subplots(figsize=(14, 8))
    im = ax.imshow(matrix.values, aspect="auto", cmap="RdYlGn_r", vmin=0, vmax=1)

    ax.set_xticks(range(12))
    ax.set_xticklabels(["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                         "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"])
    ax.set_yticks(range(len(matrix.index)))
    ax.set_yticklabels(matrix.index.astype(int))

    ax.set_xlabel("Month", fontsize=12)
    ax.set_ylabel("Year", fontsize=12)
    ax.set_title(f"{metric.replace('_', ' ').title()} by Month and Year", fontsize=14, fontweight="bold")

    plt.colorbar(im, ax=ax, shrink=0.8, label=metric.replace("_", " ").title())

    fig.tight_layout()
    if save_name:
        path = FIGURES_DIR / save_name
        fig.savefig(path, dpi=150, bbox_inches="tight")
        logger.info(f"Saved: {path}")

    return fig
