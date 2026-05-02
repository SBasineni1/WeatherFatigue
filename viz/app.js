/* ═══════════════════════════════════════════════════════════════
   Storm Warning Verification Explorer — Scroll-based App
   ═══════════════════════════════════════════════════════════════ */

// ── State ──
let allReports   = [];
let allAggStats  = [];
let allHeatmap   = null;
let map, markerLayer;
let currentHeatmapWFO = null;

// ── WFO → City name ──
const WFO_NAMES = {
    ABQ: "Albuquerque, NM",    AFG: "Fairbanks, AK",
    AJK: "Juneau, AK",         AKQ: "Wakefield, VA",
    ALY: "Albany, NY",         AMA: "Amarillo, TX",
    APX: "Gaylord, MI",        ARX: "La Crosse, WI",
    BGM: "Binghamton, NY",     BIS: "Bismarck, ND",
    BMX: "Birmingham, AL",     BOI: "Boise, ID",
    BOX: "Boston, MA",         BRO: "Brownsville, TX",
    BTV: "Burlington, VT",     BUF: "Buffalo, NY",
    BYZ: "Billings, MT",       CAE: "Columbia, SC",
    CAR: "Caribou, ME",        CHS: "Charleston, SC",
    CLE: "Cleveland, OH",      CRP: "Corpus Christi, TX",
    CTP: "State College, PA",  CYS: "Cheyenne, WY",
    DDC: "Dodge City, KS",     DLH: "Duluth, MN",
    DMX: "Des Moines, IA",     DTX: "Detroit, MI",
    DVN: "Davenport, IA",      EAX: "Kansas City, MO",
    EKA: "Eureka, CA",         EPZ: "El Paso, TX",
    EWX: "Austin / San Antonio, TX", FFC: "Atlanta, GA",
    FGF: "Fargo, ND",          FGZ: "Flagstaff, AZ",
    FSD: "Sioux Falls, SD",    FWD: "Fort Worth, TX",
    GGW: "Glasgow, MT",        GID: "Hastings, NE",
    GJT: "Grand Junction, CO", GLD: "Goodland, KS",
    GRB: "Green Bay, WI",      GRR: "Grand Rapids, MI",
    GSP: "Greenville, SC",     GUM: "Guam",
    GYX: "Portland, ME",       HFO: "Honolulu, HI",
    HGX: "Houston, TX",        HNX: "Hanford, CA",
    HUN: "Huntsville, AL",     ICT: "Wichita, KS",
    ILM: "Wilmington, NC",     ILN: "Wilmington, OH",
    ILX: "Lincoln, IL",        IND: "Indianapolis, IN",
    IWX: "Fort Wayne, IN",     JAN: "Jackson, MS",
    JAX: "Jacksonville, FL",   JKL: "Jackson, KY",
    KEY: "Key West, FL",       LBF: "North Platte, NE",
    LCH: "Lake Charles, LA",   LIX: "New Orleans, LA",
    LKN: "Elko, NV",           LMK: "Louisville, KY",
    LOT: "Chicago, IL",        LOX: "Los Angeles, CA",
    LSX: "St. Louis, MO",      LUB: "Lubbock, TX",
    LWX: "Washington, DC",     LZK: "Little Rock, AR",
    MAF: "Midland, TX",        MEG: "Memphis, TN",
    MFL: "Miami, FL",          MFR: "Medford, OR",
    MHX: "Morehead City, NC",  MKX: "Milwaukee, WI",
    MLB: "Melbourne, FL",      MOB: "Mobile, AL",
    MPX: "Minneapolis, MN",    MQT: "Marquette, MI",
    MRX: "Knoxville, TN",      MSO: "Missoula, MT",
    MTR: "San Francisco, CA",  OAX: "Omaha, NE",
    OHX: "Nashville, TN",      OKX: "New York, NY",
    OTX: "Spokane, WA",        OUN: "Oklahoma City, OK",
    PAH: "Paducah, KY",        PBZ: "Pittsburgh, PA",
    PDT: "Pendleton, OR",      PHI: "Philadelphia, PA",
    PIH: "Pocatello, ID",      PQR: "Portland, OR",
    PSR: "Phoenix, AZ",        PUB: "Pueblo, CO",
    RAH: "Raleigh, NC",        REV: "Reno, NV",
    RIW: "Riverton, WY",       RLX: "Charleston, WV",
    RNK: "Blacksburg, VA",     SEW: "Seattle, WA",
    SGF: "Springfield, MO",    SGX: "San Diego, CA",
    SHV: "Shreveport, LA",     SJT: "San Angelo, TX",
    SLC: "Salt Lake City, UT", STO: "Sacramento, CA",
    TAE: "Tallahassee, FL",    TBW: "Tampa, FL",
    TFX: "Great Falls, MT",    TOP: "Topeka, KS",
    TSA: "Tulsa, OK",          TWC: "Tucson, AZ",
    UNR: "Rapid City, SD",     VEF: "Las Vegas, NV",
};

// ══════════════════════════════════════════════════════════
// Init
// ══════════════════════════════════════════════════════════

document.addEventListener("DOMContentLoaded", async () => {
    setupScrollReveal();
    initIconArray();
    initScrollIndicator();
    await loadData();
    setupFilterToggles();
    initMap();
    updateMapAndStats();
    initHeatmap();
    initAnalytics();
});

// ══════════════════════════════════════════════════════════
// Fixed Scroll Indicator
// ══════════════════════════════════════════════════════════

function initScrollIndicator() {
    const el = document.getElementById('scrollIndicator');
    if (!el) return;
    window.addEventListener('scroll', () => {
        const nearBottom = window.scrollY + window.innerHeight >= document.body.scrollHeight - 80;
        el.classList.toggle('hidden', nearBottom);
    }, { passive: true });
}

// ══════════════════════════════════════════════════════════
// Icon Array (Accuracy Section)
// ══════════════════════════════════════════════════════════

function initIconArray() {
    const configs = [
        { id: 'iaSvGrid', verified: 63 },
        { id: 'iaToGrid', verified: 25 },
    ];
    configs.forEach(({ id, verified }) => {
        const grid = document.getElementById(id);
        if (!grid) return;
        for (let i = 0; i < 100; i++) {
            const cell = document.createElement('div');
            cell.className = 'ia-cell ' + (i < verified ? 'ia-verified' : 'ia-false');
            // stagger: verified cells pop in first, false alarms after
            cell.style.animationDelay = (i * 9) + 'ms';
            grid.appendChild(cell);
        }
    });
    // Animation is triggered by CSS: .icon-array-wrap.visible .ia-cell { animation: ... }
    // The setupScrollReveal observer adds .visible, no separate observer needed.
}

// ══════════════════════════════════════════════════════════
// Scroll Reveal
// ══════════════════════════════════════════════════════════

function setupScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add("visible");
        });
    }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });
    document.querySelectorAll(".reveal").forEach(el => observer.observe(el));
}

// ══════════════════════════════════════════════════════════
// Data Loading
// ══════════════════════════════════════════════════════════

async function loadData() {
    const [reportsResp, aggResp, heatmapResp] = await Promise.all([
        fetch("data/reports.json"),
        fetch("data/agg_stats.json"),
        fetch("data/heatmap.json"),
    ]);
    allReports  = await reportsResp.json();
    allAggStats = await aggResp.json();
    allHeatmap  = await heatmapResp.json();
}

// ══════════════════════════════════════════════════════════
// Filter Toggles
// ══════════════════════════════════════════════════════════

function setupFilterToggles() {
    document.getElementById("filterWarned").addEventListener("change", updateMapAndStats);
    document.getElementById("filterUnwarned").addEventListener("change", updateMapAndStats);
}

// ══════════════════════════════════════════════════════════
// Map
// ══════════════════════════════════════════════════════════

function initMap() {
    map = L.map("map", {
        zoomControl: true,
        attributionControl: false,
        minZoom: 3,
        maxBounds: [[15, -170], [72, -50]],
        maxBoundsViscosity: 1.0,
    }).setView([38.5, -96.0], 5);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 18,
    }).addTo(map);

    markerLayer = L.layerGroup().addTo(map);
}

function updateMapAndStats() {
    markerLayer.clearLayers();

    const showWarned   = document.getElementById("filterWarned").checked;
    const showUnwarned = document.getElementById("filterUnwarned").checked;

    let filtered = allReports.filter(r =>
        (r.warned && showWarned) || (!r.warned && showUnwarned)
    );

    // Cap for performance
    if (filtered.length > 30000) {
        const step = Math.ceil(filtered.length / 30000);
        filtered = filtered.filter((_, i) => i % step === 0);
    }

    for (const r of filtered.filter(r => !r.warned)) {
        L.circleMarker([r.lat0, r.lon0], {
            radius: 2.5, color: "transparent",
            fillColor: "#E07B5A", fillOpacity: 0.5, weight: 0,
        }).bindPopup(`<b>${r.typetext}</b><br>WFO: ${r.wfo} · ${r.state}<br>Warned: No`)
          .addTo(markerLayer);
    }
    for (const r of filtered.filter(r => r.warned)) {
        L.circleMarker([r.lat0, r.lon0], {
            radius: 2.5, color: "transparent",
            fillColor: "#2E9CCA", fillOpacity: 0.5, weight: 0,
        }).bindPopup(`<b>${r.typetext}</b><br>WFO: ${r.wfo} · ${r.state}<br>Warned: Yes`)
          .addTo(markerLayer);
    }

}

function animateCounter(id, target) {
    const el = document.getElementById(id);
    const duration = 500;
    const start = parseInt(el.textContent.replace(/[,%]/g, "")) || 0;
    const startTime = performance.now();
    function tick(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(start + (target - start) * eased).toLocaleString();
        if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}

// ══════════════════════════════════════════════════════════
// Heatmap — Pudding-style 365 × N-year canvas grid
// ══════════════════════════════════════════════════════════

const HM = {
    CELL_W: 2.6,
    CELL_H: 13,
    GAP_X:  0.6,
    GAP_Y:  2,
    LABEL_Y: 22,   // month-label row height
    LABEL_X: 38,   // year-label column width
    PAD:     8,
};

const MONTH_STARTS = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
const MONTH_NAMES  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function doyToDateStr(doy, year) {
    const d = new Date(year, 0);
    d.setDate(doy);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Sorted entry list (city A–Z) ─────────────────────────

function getWFOEntries() {
    return Object.keys(allHeatmap.heatmap)
        .map(wfo => ({
            wfo,
            city:   WFO_NAMES[wfo] || wfo,
            region: allHeatmap.meta[wfo]?.region || "",
        }))
        .sort((a, b) => a.city.localeCompare(b.city));
}

// ── Init ─────────────────────────────────────────────────

function initHeatmap() {
    if (!allHeatmap) return;
    populateList("");
    setupHmSearch();
    setupHmTooltip();
}

// ── Populate list ────────────────────────────────────────

function populateList(query) {
    const ul = document.getElementById("hmList");
    ul.innerHTML = "";

    const q = query.toLowerCase().trim();
    const entries = getWFOEntries();
    const matches = q
        ? entries.filter(e => e.city.toLowerCase().includes(q) || e.wfo.toLowerCase().includes(q))
        : entries;

    if (matches.length === 0) {
        const li = document.createElement("li");
        li.className = "hm-list-empty";
        li.textContent = "No offices match — try a city name or 3-letter code";
        ul.appendChild(li);
        return;
    }

    matches.forEach(({ wfo, city }) => {
        const li = document.createElement("li");
        if (wfo === currentHeatmapWFO) li.classList.add("selected");

        let cityHtml = escapeHtml(city);
        if (q) {
            const idx = city.toLowerCase().indexOf(q);
            if (idx !== -1) {
                cityHtml = escapeHtml(city.slice(0, idx))
                    + `<mark>${escapeHtml(city.slice(idx, idx + q.length))}</mark>`
                    + escapeHtml(city.slice(idx + q.length));
            }
        }

        li.innerHTML = `<span class="hm-li-city">${cityHtml}</span><span class="hm-li-code">${wfo}</span>`;
        li.addEventListener("click", () => selectWFO(wfo, city));
        ul.appendChild(li);
    });
}

function escapeHtml(s) {
    return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

// ── Search wiring ────────────────────────────────────────

function setupHmSearch() {
    const input   = document.getElementById("hmSearchInput");
    const picker  = document.getElementById("hmPicker");
    const listBox = document.getElementById("hmListBox");
    const clearBtn = document.getElementById("hmClearBtn");

    // Open on focus
    input.addEventListener("focus", () => {
        populateList(input.value);
        picker.classList.add("open");
    });

    // Filter on type
    input.addEventListener("input", () => {
        populateList(input.value);
        picker.classList.add("open");
    });

    // Keyboard nav
    input.addEventListener("keydown", (e) => {
        const items = listBox.querySelectorAll("li:not(.hm-list-empty)");
        const active = listBox.querySelector("li.active");
        if (e.key === "ArrowDown") {
            e.preventDefault();
            const next = active ? active.nextElementSibling : items[0];
            if (next) { active?.classList.remove("active"); next.classList.add("active"); next.scrollIntoView({ block: "nearest" }); }
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            const prev = active ? active.previousElementSibling : items[items.length - 1];
            if (prev) { active?.classList.remove("active"); prev.classList.add("active"); prev.scrollIntoView({ block: "nearest" }); }
        } else if (e.key === "Enter") {
            const a = listBox.querySelector("li.active");
            if (a) a.click();
        } else if (e.key === "Escape") {
            closeList();
        }
    });

    // Clear button
    clearBtn.addEventListener("click", () => {
        input.value = "";
        clearBtn.style.display = "none";
        currentHeatmapWFO = null;
        document.getElementById("hmPanel").style.display = "none";
        document.getElementById("hmStats").style.display = "none";
        document.getElementById("hmEmpty").style.display = "block";
        populateList("");
        picker.classList.add("open");
        input.focus();
    });

    // Close on outside click
    document.addEventListener("click", (e) => {
        if (!picker.contains(e.target)) closeList();
    });
}

function closeList() {
    document.getElementById("hmPicker").classList.remove("open");
}

// ── Select a WFO ─────────────────────────────────────────

function selectWFO(wfo, city) {
    currentHeatmapWFO = wfo;
    const input = document.getElementById("hmSearchInput");
    input.value = city || wfo;
    document.getElementById("hmClearBtn").style.display = "inline-block";
    closeList();
    populateList(""); // refresh selected highlight

    updateHmStats(wfo);
    renderHeatmap(wfo);

    document.getElementById("hmPanel").style.display = "block";
    document.getElementById("hmEmpty").style.display = "none";
    document.getElementById("hmStats").style.display = "flex";
}

// ── Stats ─────────────────────────────────────────────────

function updateHmStats(wfo) {
    const yearData = allHeatmap.heatmap[wfo] || {};
    let total = 0, verified = 0;
    for (const yr of Object.values(yearData))
        for (const day of Object.values(yr)) { total += day.v + day.u; verified += day.v; }
    const rate = total > 0 ? ((verified / total) * 100).toFixed(1) + "%" : "—";
    document.getElementById("hmStatTotal").textContent     = total.toLocaleString();
    document.getElementById("hmStatVerified").textContent  = verified.toLocaleString();
    document.getElementById("hmStatUnverified").textContent = (total - verified).toLocaleString();
    document.getElementById("hmStatRate").textContent      = rate;
}

// ══════════════════════════════════════════════════════════
// Canvas renderer
// ══════════════════════════════════════════════════════════

function renderHeatmap(wfo) {
    const canvas   = document.getElementById("hmCanvas");
    const ctx      = canvas.getContext("2d");
    const yearData = allHeatmap.heatmap[wfo] || {};
    const years    = Object.keys(yearData).sort();

    const totalDays = 366;
    const W = HM.LABEL_X + totalDays * (HM.CELL_W + HM.GAP_X) + HM.PAD;
    const H = HM.LABEL_Y  + years.length   * (HM.CELL_H + HM.GAP_Y) + HM.PAD;

    const dpr = window.devicePixelRatio || 1;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + "px";
    canvas.style.height = H + "px";
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = "#1D1F3E";
    ctx.fillRect(0, 0, W, H);

    // Month labels
    ctx.fillStyle = "#8888a8";
    ctx.font = `600 9px 'Inter', sans-serif`;
    ctx.textAlign = "left";
    MONTH_STARTS.forEach((doy, mi) => {
        const x = HM.LABEL_X + (doy - 1) * (HM.CELL_W + HM.GAP_X);
        ctx.fillText(MONTH_NAMES[mi], x, HM.LABEL_Y - 6);
    });

    // Subtle month lines
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    MONTH_STARTS.forEach(doy => {
        if (doy === 1) return;
        const x = HM.LABEL_X + (doy - 1) * (HM.CELL_W + HM.GAP_X) - 1;
        ctx.beginPath();
        ctx.moveTo(x, HM.LABEL_Y);
        ctx.lineTo(x, H - HM.PAD);
        ctx.stroke();
    });

    // Year rows
    years.forEach((year, yi) => {
        const yTop = HM.LABEL_Y + yi * (HM.CELL_H + HM.GAP_Y);

        ctx.fillStyle = "#8888a8";
        ctx.font = `500 9px 'Inter', sans-serif`;
        ctx.textAlign = "right";
        ctx.fillText(year, HM.LABEL_X - 5, yTop + HM.CELL_H * 0.72);

        const dayMap = yearData[year] || {};

        for (let doy = 1; doy <= totalDays; doy++) {
            const x    = HM.LABEL_X + (doy - 1) * (HM.CELL_W + HM.GAP_X);
            const cell = dayMap[String(doy)];

            if (!cell || cell.v + cell.u === 0) {
                ctx.fillStyle = "rgba(255,255,255,0.04)";
                ctx.fillRect(x, yTop, HM.CELL_W, HM.CELL_H);
                continue;
            }

            const { v, u } = cell;
            const total  = v + u;
            const opacity = Math.min(1.0, 0.45 + Math.log(total + 1) / Math.log(30) * 0.55);

            if (v === 0) {
                ctx.fillStyle = `rgba(224,123,90,${opacity})`;
                ctx.fillRect(x, yTop, HM.CELL_W, HM.CELL_H);
            } else if (u === 0) {
                ctx.fillStyle = `rgba(46,156,202,${opacity})`;
                ctx.fillRect(x, yTop, HM.CELL_W, HM.CELL_H);
            } else {
                const verH = Math.max(1, Math.round(HM.CELL_H * (v / total)));
                const unvH = HM.CELL_H - verH;
                ctx.fillStyle = `rgba(224,123,90,${opacity})`;
                ctx.fillRect(x, yTop, HM.CELL_W, unvH);
                ctx.fillStyle = `rgba(46,156,202,${opacity})`;
                ctx.fillRect(x, yTop + unvH, HM.CELL_W, verH);
            }
        }
    });

    canvas._hmMeta = { years, yearData };
}

// ══════════════════════════════════════════════════════════
// Tooltip
// ══════════════════════════════════════════════════════════

function setupHmTooltip() {
    const canvas  = document.getElementById("hmCanvas");
    const tooltip = document.getElementById("hmTooltip");

    canvas.addEventListener("mousemove", (e) => {
        if (!canvas._hmMeta) return;
        const { years, yearData } = canvas._hmMeta;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        const relX = mx - HM.LABEL_X;
        const relY = my - HM.LABEL_Y;
        if (relX < 0 || relY < 0) { tooltip.style.display = "none"; return; }

        const col = Math.floor(relX / (HM.CELL_W + HM.GAP_X));
        const row = Math.floor(relY / (HM.CELL_H + HM.GAP_Y));
        const doy = col + 1;

        if (doy < 1 || doy > 366 || row < 0 || row >= years.length) {
            tooltip.style.display = "none"; return;
        }

        // Make sure we're inside the cell, not the gap
        const cellX = relX - col * (HM.CELL_W + HM.GAP_X);
        const cellY = relY - row * (HM.CELL_H + HM.GAP_Y);
        if (cellX > HM.CELL_W || cellY > HM.CELL_H) {
            tooltip.style.display = "none"; return;
        }

        const year = years[row];
        const cell = yearData[year]?.[String(doy)];
        const v = cell?.v || 0;
        const u = cell?.u || 0;
        const total = v + u;
        const rate  = total > 0 ? ((v / total) * 100).toFixed(0) + "%" : null;

        tooltip.innerHTML = `
            <div class="hm-tooltip-date">${doyToDateStr(doy, parseInt(year))}, ${year}</div>
            <div class="hm-tooltip-row">
                <span class="hm-tooltip-label">Warnings</span>
                <span class="hm-tooltip-val">${total || "none"}</span>
            </div>
            ${total > 0 ? `
            <div class="hm-tooltip-row">
                <span class="hm-tooltip-label">Verified</span>
                <span class="hm-tooltip-val teal">${v}</span>
            </div>
            <div class="hm-tooltip-row">
                <span class="hm-tooltip-label">Unverified</span>
                <span class="hm-tooltip-val coral">${u}</span>
            </div>
            <div class="hm-tooltip-row">
                <span class="hm-tooltip-label">Rate</span>
                <span class="hm-tooltip-val">${rate}</span>
            </div>` : ""}`;

        const TW = 200, TH = 120;
        let tx = e.clientX + 14;
        let ty = e.clientY - 20;
        if (tx + TW > window.innerWidth  - 8) tx = e.clientX - TW - 14;
        if (ty + TH > window.innerHeight - 8) ty = e.clientY - TH;

        tooltip.style.left    = tx + "px";
        tooltip.style.top     = ty + "px";
        tooltip.style.display = "block";
    });

    canvas.addEventListener("mouseleave", () => { tooltip.style.display = "none"; });
}

// ══════════════════════════════════════════════════════════
// Analytics — 5 new sections
// ══════════════════════════════════════════════════════════

const CHART_DEFAULTS = {
    color: '#AAABB8',
    borderColor: 'rgba(200,208,224,0.06)',
    font: { family: "'Inter', sans-serif", size: 11 },
};

function chartDefaults() {
    if (typeof Chart === 'undefined') return;
    Chart.defaults.color         = CHART_DEFAULTS.color;
    Chart.defaults.borderColor   = CHART_DEFAULTS.borderColor;
    Chart.defaults.font.family   = CHART_DEFAULTS.font.family;
    Chart.defaults.font.size     = CHART_DEFAULTS.font.size;
}

async function initAnalytics() {
    if (typeof Chart === 'undefined') return;
    chartDefaults();
    let analytics;
    try {
        const r = await fetch('data/analytics.json');
        analytics = await r.json();
    } catch(e) { console.warn('analytics.json not found', e); return; }

    buildGeoChart(analytics.geo);
    buildTrendsChart(analytics.trends);
    buildLeadtimeChart(analytics.leadtime);
    buildClusterScatter(analytics.clustering);
    buildTrendsCallouts(analytics.trends);
}

// ── Chart helpers ─────────────────────────────────────────

function baseChartOptions(extraY = {}) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 800, easing: 'easeOutQuart' },
        plugins: { legend: { display: false }, tooltip: { enabled: true,
            backgroundColor: 'rgba(10,10,38,0.95)',
            titleColor: '#2E9CCA',
            bodyColor: '#C8D0E0',
            borderColor: 'rgba(170,171,184,0.25)',
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8,
        }},
        scales: {
            x: { grid: { color: 'rgba(200,208,224,0.06)' }, ticks: { color: '#7B82A8' } },
            y: { grid: { color: 'rgba(200,208,224,0.06)' }, ticks: { color: '#7B82A8' }, ...extraY },
        },
    };
}

// ── 1. Geographic distribution histogram ──────────────────

function buildGeoChart(geo) {
    const el = document.getElementById('chartGeo');
    if (!el || !geo?.length) return;

    // Bin WFOs by verification rate
    const bins = [0,10,20,30,40,50,60,70,80,90,100];
    const labels = bins.slice(0,-1).map((b,i) => `${b}–${bins[i+1]}%`);
    const counts = new Array(bins.length - 1).fill(0);
    geo.forEach(d => {
        const idx = Math.min(Math.floor(d.rate * 10), bins.length - 2);
        counts[idx]++;
    });

    new Chart(el, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                data: counts,
                backgroundColor: counts.map((_, i) => {
                    const pct = (i + 0.5) / (counts.length);
                    const r = Math.round(224 - pct * (224 - 46));
                    const g = Math.round(123 - pct * (123 - 156));
                    const b = Math.round(90  + pct * (202 - 90));
                    return `rgba(${r},${g},${b},0.75)`;
                }),
                borderWidth: 0, borderRadius: 4,
            }],
        },
        options: {
            ...baseChartOptions({ title: { text: 'Offices' } }),
            plugins: {
                ...baseChartOptions().plugins,
                tooltip: {
                    ...baseChartOptions().plugins.tooltip,
                    callbacks: {
                        label: ctx => `${ctx.raw} offices in this range`,
                    },
                },
            },
            scales: {
                x: { grid: { color: 'rgba(200,208,224,0.06)' }, ticks: { color: '#7B82A8', maxRotation: 45 } },
                y: { grid: { color: 'rgba(200,208,224,0.06)' }, ticks: { color: '#7B82A8', stepSize: 1 },
                     title: { display: true, text: 'Number of offices', color: '#7B82A8', font: { size: 10 } } },
            },
        },
    });

    // Top 5 and Bottom 5
    const valid = geo.filter(d => d.total >= 100);
    buildRankList('rankTop',    valid.slice(0, 5),  'teal');
    buildRankList('rankBottom', valid.slice(-5).reverse(), 'coral');
}

function buildRankList(id, items, color) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = items.map((d, i) => `
        <div class="rank-item">
            <span class="rank-num">${i+1}</span>
            <span class="rank-city" title="${d.city}">${d.city}</span>
            <div class="rank-bar">
                <div class="rank-bar-fill" style="width:${d.rate*100}%;background:var(--${color === 'teal' ? 'accent' : 'coral'})"></div>
            </div>
            <span class="rank-pct" style="color:var(--${color === 'teal' ? 'accent' : 'coral'})">${(d.rate*100).toFixed(0)}%</span>
        </div>`).join('');
}

// ── 2. Trends chart ───────────────────────────────────────

function buildTrendsChart(trends) {
    const el = document.getElementById('chartTrends');
    if (!el || !trends) return;

    const years = trends.years.map(String);
    const svRates = trends.SV.rates.map(r => r != null ? +(r * 100).toFixed(1) : null);
    const toRates = trends.TO.rates.map(r => r != null ? +(r * 100).toFixed(1) : null);

    new Chart(el, {
        type: 'line',
        data: {
            labels: years,
            datasets: [
                {
                    label: 'Severe Thunderstorm',
                    data: svRates,
                    borderColor: '#2E9CCA',
                    backgroundColor: 'rgba(46,156,202,0.08)',
                    borderWidth: 2.5,
                    pointRadius: 4,
                    pointBackgroundColor: '#2E9CCA',
                    tension: 0.35,
                    fill: true,
                    spanGaps: true,
                },
                {
                    label: 'Tornado',
                    data: toRates,
                    borderColor: '#E07B5A',
                    backgroundColor: 'rgba(224,123,90,0.08)',
                    borderWidth: 2.5,
                    pointRadius: 4,
                    pointBackgroundColor: '#E07B5A',
                    tension: 0.35,
                    fill: true,
                    spanGaps: true,
                },
            ],
        },
        options: {
            ...baseChartOptions(),
            plugins: {
                ...baseChartOptions().plugins,
                legend: { display: false },
                tooltip: {
                    ...baseChartOptions().plugins.tooltip,
                    callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.raw}%` },
                },
            },
            scales: {
                x: { grid: { color: 'rgba(200,208,224,0.06)' }, ticks: { color: '#7B82A8' } },
                y: { grid: { color: 'rgba(200,208,224,0.06)' }, ticks: { color: '#7B82A8', callback: v => v + '%' },
                     min: 0, max: 100 },
            },
        },
    });
}

function buildTrendsCallouts(trends) {
    if (!trends) return;
    const sv = trends.SV.rates.filter(r => r != null);
    const to = trends.TO.rates.filter(r => r != null);

    const first = trends.SV.rates[0], last = sv[sv.length - 1];
    const delta = ((last - first) * 100).toFixed(1);
    const sign  = delta > 0 ? '+' : '';

    const bestIdx = sv.indexOf(Math.max(...sv));
    const bestYear = trends.years[trends.SV.rates.indexOf(Math.max(...sv))];
    const toAvg = (to.reduce((a,b) => a+b, 0) / to.length * 100).toFixed(1);

    const deltaEl = document.getElementById('trendSVDelta');
    const bestEl  = document.getElementById('trendBestYear');
    const toEl    = document.getElementById('trendTOAvg');
    if (deltaEl) { deltaEl.textContent = `${sign}${delta}pp`; deltaEl.className = `trend-callout-val ${delta > 0 ? 'teal' : 'coral'}`; }
    if (bestEl)  bestEl.textContent = String(bestYear);
    if (toEl)    toEl.textContent   = toAvg + '%';
}

// ── 3. Lead time histogram ────────────────────────────────

function buildLeadtimeChart(leadtime) {
    const el = document.getElementById('chartLeadtime');
    if (!el || !leadtime) return;

    const bins = leadtime.bins;
    const svPct = leadtime.SV.pct;
    const toPct = leadtime.TO.pct;

    new Chart(el, {
        type: 'bar',
        data: {
            labels: bins,
            datasets: [
                { label: 'Severe Thunderstorm', data: svPct,
                  backgroundColor: 'rgba(46,156,202,0.65)', borderWidth: 0, borderRadius: 3 },
                { label: 'Tornado', data: toPct,
                  backgroundColor: 'rgba(224,123,90,0.65)', borderWidth: 0, borderRadius: 3 },
            ],
        },
        options: {
            ...baseChartOptions(),
            plugins: {
                ...baseChartOptions().plugins,
                legend: { display: false },
                tooltip: {
                    ...baseChartOptions().plugins.tooltip,
                    callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.raw}% of verified warnings` },
                },
            },
            scales: {
                x: { grid: { color: 'rgba(200,208,224,0.06)' }, ticks: { color: '#7B82A8' } },
                y: { grid: { color: 'rgba(200,208,224,0.06)' }, ticks: { color: '#7B82A8', callback: v => v + '%' },
                     title: { display: true, text: '% of verified warnings', color: '#7B82A8', font: { size: 10 } } },
            },
        },
    });
}

// ── 4. Clustering cards ───────────────────────────────────

function buildClusterScatter(clustering) {
    const el = document.getElementById('clusterOffices');
    if (!el || !clustering) return;

    el.innerHTML = `
        <div class="panel">
            <div class="panel-header">
                <h3 class="panel-title">False Alarm Rate vs. Max Consecutive Streak</h3>
                <div class="panel-right">
                    <span class="legend-item"><span class="dot coral"></span> High streak (≥14)</span>
                    <span class="legend-item"><span class="dot teal"></span> Lower streak</span>
                    <span class="panel-subtitle" style="margin-left:8px;">Bubble size = avg streak length</span>
                </div>
            </div>
            <div class="chart-container" style="height:380px;">
                <canvas id="chartCluster"></canvas>
            </div>
        </div>`;

    const points = Object.entries(clustering).map(([wfo, c]) => {
        const far = (c.false_total / c.total) * 100;
        return {
            x: far,
            y: c.max_streak,
            r: 5 + (c.avg_streak - 1.5) * 9,
            wfo,
            city: c.city.split(',')[0],
            avg_streak: c.avg_streak,
            far: far.toFixed(1)
        };
    });

    const isHigh = p => p.y >= 14;
    const colors  = points.map(p => isHigh(p) ? 'rgba(224,123,90,0.82)' : 'rgba(46,156,202,0.72)');
    const borders = points.map(p => isHigh(p) ? '#E07B5A' : '#2E9CCA');

    const labelPlugin = {
        id: 'bubbleLabels',
        afterDatasetsDraw(chart) {
            const ctx = chart.ctx;
            chart.data.datasets[0].data.forEach((pt, i) => {
                const elem = chart.getDatasetMeta(0).data[i];
                if (!elem) return;
                const { x, y } = elem.getProps(['x', 'y'], true);
                const radius = elem.options.radius || pt.r;
                ctx.save();
                ctx.font = "600 9px 'Inter', sans-serif";
                ctx.fillStyle = isHigh(pt) ? '#F0A080' : '#7DCCE8';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText(pt.wfo, x, y - radius - 4);
                ctx.restore();
            });
        }
    };

    new Chart(document.getElementById('chartCluster'), {
        type: 'bubble',
        data: {
            datasets: [{
                data: points,
                backgroundColor: colors,
                borderColor: borders,
                borderWidth: 1.5
            }]
        },
        plugins: [labelPlugin],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label(ctx) {
                            const d = ctx.raw;
                            return [
                                `${d.city} (${d.wfo})`,
                                `FAR: ${d.far}%`,
                                `Max streak: ${d.y} in a row`,
                                `Avg streak: ${d.avg_streak}`
                            ];
                        },
                        title: () => ''
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'False Alarm Rate (%)',
                        color: '#AAABB8',
                        font: { size: 11, family: "'Inter', sans-serif" }
                    },
                    min: 25, max: 75,
                    ticks: { color: '#AAABB8', callback: v => v + '%' },
                    grid: { color: 'rgba(170,171,184,0.08)' },
                    border: { color: 'rgba(170,171,184,0.15)' }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Max consecutive false alarms',
                        color: '#AAABB8',
                        font: { size: 11, family: "'Inter', sans-serif" }
                    },
                    min: 6, max: 20,
                    ticks: { color: '#AAABB8', stepSize: 2 },
                    grid: { color: 'rgba(170,171,184,0.08)' },
                    border: { color: 'rgba(170,171,184,0.15)' }
                }
            }
        }
    });
}
