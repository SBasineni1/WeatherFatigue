"""
Central configuration for the Weather Fatigue project.
"""
import os
from pathlib import Path

# ── Project Paths ──────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"
OUTPUT_DIR = PROJECT_ROOT / "outputs"
FIGURES_DIR = OUTPUT_DIR / "figures"
REPORTS_DIR = OUTPUT_DIR / "reports"

# Create directories on import
for d in [RAW_DIR, PROCESSED_DIR, FIGURES_DIR, REPORTS_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# ── IEM COW API ────────────────────────────────────────────────────────────
API_BASE_URL = "https://mesonet.agron.iastate.edu/api/1/cow.json"

# Rate limiting: seconds between API requests
API_DELAY = 1.0

# ── Analysis Parameters ───────────────────────────────────────────────────
# Year range for data collection (inclusive)
START_YEAR = 2008
END_YEAR = 2025

# Phenomena codes
# TO = Tornado, SV = Severe Thunderstorm, FF = Flash Flood, SQ = Snow Squall
PHENOMENA = ["TO", "SV"]
ALL_PHENOMENA = ["TO", "SV", "FF", "SQ"]

# LSR buffer (miles) — default used by IEM COW
LSR_BUFFER = 15

# ── All 122 NWS Weather Forecast Offices ──────────────────────────────────
# Organized by NWS Region
WFO_LIST = [
    # Eastern Region
    "ALY", "BGM", "BOX", "BTV", "BUF", "CAE", "CAR", "CHS", "CLE", "CTP",
    "GSP", "GYX", "ILM", "ILN", "LWX", "MHX", "OKX", "PBZ", "PHI", "RAH",
    "RLX", "RNK", "AKQ",
    # Southern Region
    "ABQ", "AMA", "BMX", "BRO", "CRP", "EPZ", "EWX", "FFC", "FWD", "HGX",
    "HUN", "JAN", "JAX", "KEY", "LCH", "LIX", "LUB", "LZK", "MAF", "MEG",
    "MFL", "MLB", "MOB", "MRX", "OHX", "OUN", "SHV", "SJT", "SJU", "TAE",
    "TBW", "TSA",
    # Central Region
    "APX", "ARX", "BIS", "CYS", "DDC", "DLH", "DMX", "DTX", "DVN", "EAX",
    "FGF", "FSD", "GID", "GJT", "GLD", "GRB", "GRR", "ICT", "ILX", "IND",
    "IWX", "JKL", "LBF", "LMK", "LOT", "LSX", "MKX", "MPX", "MQT", "OAX",
    "PAH", "PUB", "RAP", "RIW", "SGF", "TOP", "UNR",
    # Western Region
    "BOI", "BYZ", "EKA", "FGZ", "GGW", "HNX", "LKN", "LOX", "MFR", "MSO",
    "MTR", "OTX", "PDT", "PIH", "PQR", "PSR", "REV", "SEW", "SGX", "SLC",
    "STO", "TFX", "TWC", "VEF",
    # Alaska Region
    "prior to AFC", "AFG", "AJK",
    # Pacific Region
    "HFO", "GUM",
]

# Cleaned WFO list (remove non-standard entries)
WFO_LIST_CLEAN = [w for w in WFO_LIST if len(w) == 3 and w.isalpha()]
