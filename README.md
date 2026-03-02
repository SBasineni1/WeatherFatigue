# Weather Fatigue

Analyzing how often NWS storm-based warnings verify across the country, and how county/state lines, geography, and forecast offices affect the shape of polygon warnings.

## Setup

```bash
pip install -r requirements.txt
```

## Quick Start

```bash
# 1. Fetch data for a single WFO/year (e.g., OUN 2023)
python -m src.data_collection --wfos OUN --start-year 2023 --end-year 2023

# 2. Process raw JSON into Parquet
python -m src.data_processing

# 3. Run verification analysis
python -m src.analysis.verification
```

## Data Source

[IEM COW (Storm Based Warning Verification)](https://mesonet.agron.iastate.edu/cow/)
