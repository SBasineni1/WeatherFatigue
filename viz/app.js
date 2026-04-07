/* ═══════════════════════════════════════════════════════════════
   Storm Warning Verification Explorer — Scroll-based App
   ═══════════════════════════════════════════════════════════════ */

// ── State ──
let allReports = [];
let allAggStats = [];
let allHeatmap = null;
let currentRegion = "all";
let currentHeatmapWFO = null;
let map, markerLayer;
let verificationChart = null;

// ── WFO → City name mapping ──
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
    EWX: "Austin/San Antonio, TX", FFC: "Atlanta, GA",
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

const REGION_LABELS = {
    all: "All United States",
    Northeast: "Northeast",
    South: "South",
    Midwest: "Midwest",
    West: "West",
};

const REGION_VIEWS = {
    all:       { center: [38.5, -96.0], zoom: 5 },
    Northeast: { center: [42.5, -74.0], zoom: 6 },
    South:     { center: [33.0, -88.0], zoom: 5 },
    Midwest:   { center: [42.0, -93.0], zoom: 5 },
    West:      { center: [42.0, -115.0], zoom: 5 },
};

// ── Init ──
document.addEventListener("DOMContentLoaded", async () => {
    setupScrollReveal();
    await loadData();
    setupDropdown();
    setupFilterToggles();
    initMap();
    updateAll();
    initHeatmap();
});

// ══════════════════════════════════════════════════════════
// Scroll Reveal
// ══════════════════════════════════════════════════════════

function setupScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("visible");
            }
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
    allReports = await reportsResp.json();
    allAggStats = await aggResp.json();
    allHeatmap = await heatmapResp.json();
}

// ══════════════════════════════════════════════════════════
// Dropdown
// ══════════════════════════════════════════════════════════

function setupDropdown() {
    const container = document.getElementById("customSelect");
    const btn = document.getElementById("selectBtn");
    const list = document.getElementById("selectDropdown");

    btn.addEventListener("click", (e) => {
        e.stopPropagation();
        container.classList.toggle("open");
    });

    list.querySelectorAll("li").forEach(li => {
        li.addEventListener("click", () => {
            const region = li.dataset.region;
            currentRegion = region;

            list.querySelectorAll("li").forEach(l => l.classList.remove("selected"));
            li.classList.add("selected");
            container.classList.remove("open");

            const icon = li.dataset.icon || "🇺🇸";
            document.querySelector("#selectBtn .select-icon").textContent = icon;
            document.querySelector("#selectBtn .select-text").textContent = li.textContent;

            updateAll();
        });
    });

    document.addEventListener("click", () => container.classList.remove("open"));
}

// ══════════════════════════════════════════════════════════
// Filter Toggles
// ══════════════════════════════════════════════════════════

function setupFilterToggles() {
    document.getElementById("filterWarned").addEventListener("change", updateMap);
    document.getElementById("filterUnwarned").addEventListener("change", updateMap);
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

function updateMap() {
    markerLayer.clearLayers();

    const showWarned = document.getElementById("filterWarned").checked;
    const showUnwarned = document.getElementById("filterUnwarned").checked;

    let filtered = getFilteredReports();
    filtered = filtered.filter(r =>
        (r.warned && showWarned) || (!r.warned && showUnwarned)
    );

    // Cap for performance
    if (filtered.length > 30000) {
        const step = Math.ceil(filtered.length / 30000);
        filtered = filtered.filter((_, i) => i % step === 0);
    }

    const unwarned = filtered.filter(r => !r.warned);
    const warned = filtered.filter(r => r.warned);

    for (const r of unwarned) {
        L.circleMarker([r.lat0, r.lon0], {
            radius: 2.5, color: "transparent",
            fillColor: "#ff6b6b", fillOpacity: 0.5, weight: 0,
        }).bindPopup(`<b>${r.typetext}</b><br>WFO: ${r.wfo} · ${r.state}<br>Warned: No`)
          .addTo(markerLayer);
    }

    for (const r of warned) {
        L.circleMarker([r.lat0, r.lon0], {
            radius: 2.5, color: "transparent",
            fillColor: "#4ecdc4", fillOpacity: 0.5, weight: 0,
        }).bindPopup(`<b>${r.typetext}</b><br>WFO: ${r.wfo} · ${r.state}<br>Warned: Yes`)
          .addTo(markerLayer);
    }

    const view = REGION_VIEWS[currentRegion] || REGION_VIEWS.all;
    map.flyTo(view.center, view.zoom, { duration: 1.0 });
}

// ══════════════════════════════════════════════════════════
// Stats
// ══════════════════════════════════════════════════════════

function updateStats() {
    const reports = getFilteredReports();
    const warned = reports.filter(r => r.warned);
    const unwarned = reports.filter(r => !r.warned);
    const wfos = new Set(reports.map(r => r.wfo));
    const agg = getFilteredAgg();

    const rates = agg.filter(r => r.verification_rate != null).map(r => r.verification_rate);
    const avgRate = rates.length > 0
        ? ((rates.reduce((a, b) => a + b, 0) / rates.length) * 100).toFixed(1)
        : "—";

    animateCounter("pillReports", reports.length);
    animateCounter("pillWarned", warned.length);
    animateCounter("pillUnwarned", unwarned.length);
    animateCounter("pillWFOs", wfos.size);

    const rateEl = document.getElementById("pillRate");
    rateEl.textContent = avgRate === "—" ? "—" : avgRate + "%";
}

function animateCounter(id, target) {
    const el = document.getElementById(id);
    const duration = 500;
    const start = parseInt(el.textContent.replace(/[,%]/g, "")) || 0;
    const startTime = performance.now();

    function tick(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(start + (target - start) * eased);
        el.textContent = current.toLocaleString();
        if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}

// ══════════════════════════════════════════════════════════
// Chart
// ══════════════════════════════════════════════════════════

function updateChart() {
    const agg = getFilteredAgg();

    const wfoMap = {};
    for (const row of agg) {
        if (row.verification_rate == null) continue;
        if (!wfoMap[row.wfo]) wfoMap[row.wfo] = { sum: 0, count: 0 };
        wfoMap[row.wfo].sum += row.verification_rate;
        wfoMap[row.wfo].count += 1;
    }

    const wfoData = Object.entries(wfoMap)
        .map(([wfo, d]) => ({ wfo, rate: d.sum / d.count }))
        .sort((a, b) => b.rate - a.rate);

    const labels = wfoData.map(d => d.wfo);
    const values = wfoData.map(d => (d.rate * 100).toFixed(1));
    const colors = wfoData.map(d => {
        if (d.rate >= 0.6) return "rgba(78, 205, 196, 0.8)";
        if (d.rate >= 0.4) return "rgba(255, 217, 61, 0.8)";
        return "rgba(255, 107, 107, 0.8)";
    });

    const ctx = document.getElementById("verificationChart").getContext("2d");
    if (verificationChart) verificationChart.destroy();

    const chartHeight = Math.max(300, labels.length * 24);
    ctx.canvas.style.height = chartHeight + "px";
    ctx.canvas.height = chartHeight;

    verificationChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Avg Verification Rate (%)",
                data: values,
                backgroundColor: colors,
                borderColor: colors.map(c => c.replace("0.8", "1")),
                borderWidth: 1,
                borderRadius: 3,
            }],
        },
        options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 800, easing: "easeOutQuart" },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: { label: (c) => `${c.parsed.x}% verified` },
                    backgroundColor: "rgba(10,10,26,0.9)",
                    titleColor: "#e8e8f0",
                    bodyColor: "#e8e8f0",
                    borderColor: "rgba(78,205,196,0.3)",
                    borderWidth: 1,
                },
            },
            scales: {
                x: {
                    min: 0, max: 100,
                    title: { display: true, text: "Verification Rate (%)", color: "#8888a8", font: { size: 11 } },
                    ticks: { color: "#8888a8" },
                    grid: { color: "rgba(255,255,255,0.04)" },
                },
                y: {
                    ticks: { color: "#e8e8f0", font: { size: 11 } },
                    grid: { display: false },
                },
            },
        },
    });
}

// ══════════════════════════════════════════════════════════
// Filters
// ══════════════════════════════════════════════════════════

function getFilteredReports() {
    if (currentRegion === "all") return allReports;
    return allReports.filter(r => r.region === currentRegion);
}

function getFilteredAgg() {
    if (currentRegion === "all") return allAggStats;
    return allAggStats.filter(r => r.region === currentRegion);
}

// ══════════════════════════════════════════════════════════
// Update All
// ══════════════════════════════════════════════════════════

function updateAll() {
    updateStats();
    updateMap();
    updateChart();
}

// ══════════════════════════════════════════════════════════
// Heatmap — Pudding-style 365 × N-year grid
// ══════════════════════════════════════════════════════════

// Canvas layout constants
const HM = {
    CELL_W: 2.6,
    CELL_H: 13,
    GAP_X: 0.6,
    GAP_Y: 2,
    LABEL_Y: 22,   // height of month-label row at top
    LABEL_X: 38,   // width of year-label column on left
    PADDING: 8,    // extra right/bottom padding
};

// Month boundaries (DOY, non-leap) for labels
const MONTH_STARTS = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
const MONTH_NAMES  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Day-of-year → approximate date string (ignores leap years for display)
function doyToDateStr(doy, year) {
    const d = new Date(year, 0);
    d.setDate(doy);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function initHeatmap() {
    if (!allHeatmap) return;
    buildHmDropdown();
    setupHmSearch();
    setupHmCanvasTooltip();
}

// ── Build dropdown items from WFO list ──────────────────

function buildHmDropdown(filter = "") {
    const ul = document.getElementById("hmDropdown");
    ul.innerHTML = "";

    const q = filter.toLowerCase().trim();

    // Build list sorted by city name
    const entries = Object.keys(allHeatmap.heatmap).map(wfo => ({
        wfo,
        city:   WFO_NAMES[wfo] || wfo,
        region: allHeatmap.meta[wfo]?.region || "",
    }));

    // Sort alphabetically by city name
    entries.sort((a, b) => a.city.localeCompare(b.city));

    const matches = q
        ? entries.filter(e =>
            e.city.toLowerCase().includes(q) ||
            e.wfo.toLowerCase().includes(q) ||
            e.region.toLowerCase().includes(q))
        : entries;

    if (matches.length === 0) {
        const li = document.createElement("li");
        li.className = "hm-dropdown-empty";
        li.textContent = "No offices found";
        ul.appendChild(li);
        return;
    }

    matches.forEach(({ wfo, city, region }) => {
        const li = document.createElement("li");
        if (wfo === currentHeatmapWFO) li.classList.add("selected");

        // Highlight matched portion in city name
        let cityHtml = city;
        if (q) {
            const idx = city.toLowerCase().indexOf(q);
            if (idx !== -1) {
                cityHtml = city.slice(0, idx)
                    + `<mark>${city.slice(idx, idx + q.length)}</mark>`
                    + city.slice(idx + q.length);
            }
        }

        li.innerHTML = `
            <span class="hm-dropdown-city">${cityHtml}</span>
            <span class="hm-dropdown-code">${wfo}</span>`;
        li.addEventListener("click", () => selectHmWFO(wfo));
        ul.appendChild(li);
    });
}

// ── Search input wiring ──────────────────────────────────

function setupHmSearch() {
    const input = document.getElementById("hmSearchInput");
    const wrap  = document.getElementById("hmSelectWrap");
    const ul    = document.getElementById("hmDropdown");

    input.addEventListener("focus", () => {
        ul.classList.add("open");
        wrap.classList.add("focused");
        buildHmDropdown(input.value);
    });

    input.addEventListener("input", () => {
        buildHmDropdown(input.value);
        ul.classList.add("open");
    });

    // Keyboard nav
    input.addEventListener("keydown", (e) => {
        const items = ul.querySelectorAll("li:not(.hm-dropdown-empty)");
        const active = ul.querySelector("li.active");
        if (e.key === "ArrowDown") {
            e.preventDefault();
            const next = active ? active.nextElementSibling : items[0];
            if (next) { active?.classList.remove("active"); next.classList.add("active"); next.scrollIntoView({ block: "nearest" }); }
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            const prev = active ? active.previousElementSibling : items[items.length - 1];
            if (prev) { active?.classList.remove("active"); prev.classList.add("active"); prev.scrollIntoView({ block: "nearest" }); }
        } else if (e.key === "Enter") {
            const a = ul.querySelector("li.active");
            if (a) a.click();
        } else if (e.key === "Escape") {
            closeHmDropdown();
        }
    });

    document.addEventListener("click", (e) => {
        if (!wrap.contains(e.target)) closeHmDropdown();
    });
}

function closeHmDropdown() {
    document.getElementById("hmDropdown").classList.remove("open");
    document.getElementById("hmSelectWrap").classList.remove("focused");
}

// ── Select a WFO and render ──────────────────────────────

function selectHmWFO(wfo) {
    currentHeatmapWFO = wfo;
    const city = WFO_NAMES[wfo] || wfo;
    const input = document.getElementById("hmSearchInput");
    const badge = document.getElementById("hmSelectedBadge");

    input.value = city || wfo;
    badge.textContent = wfo;
    badge.classList.add("visible");
    closeHmDropdown();
    buildHmDropdown("");

    updateHmStats(wfo);
    renderHeatmap(wfo);

    document.getElementById("hmPanel").style.display = "block";
    document.getElementById("hmEmpty").style.display = "none";
    document.getElementById("hmStats").style.display = "flex";
}

// ── Summary stats ────────────────────────────────────────

function updateHmStats(wfo) {
    const yearData = allHeatmap.heatmap[wfo] || {};
    let total = 0, verified = 0;
    for (const yr of Object.values(yearData)) {
        for (const day of Object.values(yr)) {
            total    += day.v + day.u;
            verified += day.v;
        }
    }
    const unverified = total - verified;
    const rate = total > 0 ? ((verified / total) * 100).toFixed(1) : "—";

    document.getElementById("hmStatTotal").textContent     = total.toLocaleString();
    document.getElementById("hmStatVerified").textContent  = verified.toLocaleString();
    document.getElementById("hmStatUnverified").textContent = unverified.toLocaleString();
    document.getElementById("hmStatRate").textContent      = rate !== "—" ? rate + "%" : "—";
}

// ── Canvas renderer ──────────────────────────────────────

function renderHeatmap(wfo) {
    const canvas = document.getElementById("hmCanvas");
    const ctx    = canvas.getContext("2d");
    const yearData = allHeatmap.heatmap[wfo] || {};
    const years    = Object.keys(yearData).sort();

    const totalDays = 366;
    const W = HM.LABEL_X + totalDays * (HM.CELL_W + HM.GAP_X) + HM.PADDING;
    const H = HM.LABEL_Y  + years.length   * (HM.CELL_H + HM.GAP_Y) + HM.PADDING;

    // Set actual pixel dimensions (crisp on HiDPI)
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + "px";
    canvas.style.height = H + "px";
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = "#0d0d22";
    ctx.fillRect(0, 0, W, H);

    // ── Month labels ────────────────────────────────────
    ctx.fillStyle = "#8888a8";
    ctx.font = `600 9px 'Inter', sans-serif`;
    ctx.textAlign = "left";
    MONTH_STARTS.forEach((doy, mi) => {
        const x = HM.LABEL_X + (doy - 1) * (HM.CELL_W + HM.GAP_X);
        ctx.fillText(MONTH_NAMES[mi], x, HM.LABEL_Y - 6);
    });

    // Subtle month separator lines
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    MONTH_STARTS.forEach(doy => {
        if (doy === 1) return;
        const x = HM.LABEL_X + (doy - 1) * (HM.CELL_W + HM.GAP_X) - 1;
        ctx.beginPath();
        ctx.moveTo(x, HM.LABEL_Y);
        ctx.lineTo(x, H - HM.PADDING);
        ctx.stroke();
    });

    // ── Year rows ───────────────────────────────────────
    years.forEach((year, yi) => {
        const yTop = HM.LABEL_Y + yi * (HM.CELL_H + HM.GAP_Y);

        // Year label
        ctx.fillStyle = "#8888a8";
        ctx.font = `500 9px 'Inter', sans-serif`;
        ctx.textAlign = "right";
        ctx.fillText(year, HM.LABEL_X - 5, yTop + HM.CELL_H * 0.72);

        const dayMap = yearData[year] || {};

        for (let doy = 1; doy <= totalDays; doy++) {
            const x = HM.LABEL_X + (doy - 1) * (HM.CELL_W + HM.GAP_X);
            const cell = dayMap[String(doy)];

            if (!cell) {
                // No events — faint placeholder
                ctx.fillStyle = "rgba(255,255,255,0.04)";
                ctx.fillRect(x, yTop, HM.CELL_W, HM.CELL_H);
                continue;
            }

            const { v, u } = cell;
            const total = v + u;
            if (total === 0) {
                ctx.fillStyle = "rgba(255,255,255,0.04)";
                ctx.fillRect(x, yTop, HM.CELL_W, HM.CELL_H);
                continue;
            }

            // Opacity scaled by log(total), clamped 0.45–1.0
            const opacity = Math.min(1.0, 0.45 + Math.log(total + 1) / Math.log(30) * 0.55);

            if (v === 0) {
                // All unverified — coral
                ctx.fillStyle = `rgba(255,107,107,${opacity})`;
                ctx.fillRect(x, yTop, HM.CELL_W, HM.CELL_H);
            } else if (u === 0) {
                // All verified — teal
                ctx.fillStyle = `rgba(78,205,196,${opacity})`;
                ctx.fillRect(x, yTop, HM.CELL_W, HM.CELL_H);
            } else {
                // Mixed — split: unverified (coral) top, verified (teal) bottom
                const verifiedH   = Math.max(1, Math.round(HM.CELL_H * (v / total)));
                const unverifiedH = HM.CELL_H - verifiedH;

                ctx.fillStyle = `rgba(255,107,107,${opacity})`;
                ctx.fillRect(x, yTop, HM.CELL_W, unverifiedH);

                ctx.fillStyle = `rgba(78,205,196,${opacity})`;
                ctx.fillRect(x, yTop + unverifiedH, HM.CELL_W, verifiedH);
            }
        }
    });

    // Store layout info for tooltip hit-testing
    canvas._hmMeta = { years, yearData, W, H };
}

// ── Tooltip hit-testing on canvas ───────────────────────

function setupHmCanvasTooltip() {
    const canvas  = document.getElementById("hmCanvas");
    const tooltip = document.getElementById("hmTooltip");

    canvas.addEventListener("mousemove", (e) => {
        if (!canvas._hmMeta) return;
        const { years, yearData } = canvas._hmMeta;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        // Figure out which cell
        const relX = mx - HM.LABEL_X;
        const relY = my - HM.LABEL_Y;
        if (relX < 0 || relY < 0) { tooltip.style.display = "none"; return; }

        const colF = relX / (HM.CELL_W + HM.GAP_X);
        const rowF = relY / (HM.CELL_H + HM.GAP_Y);
        const doy = Math.floor(colF) + 1;
        const yi  = Math.floor(rowF);

        if (doy < 1 || doy > 366 || yi < 0 || yi >= years.length) {
            tooltip.style.display = "none";
            return;
        }

        // Check we're inside the cell, not in the gap
        const cellLocalX = relX - Math.floor(colF) * (HM.CELL_W + HM.GAP_X);
        const cellLocalY = relY - Math.floor(rowF) * (HM.CELL_H + HM.GAP_Y);
        if (cellLocalX > HM.CELL_W || cellLocalY > HM.CELL_H) {
            tooltip.style.display = "none";
            return;
        }

        const year = years[yi];
        const cell = yearData[year]?.[String(doy)];
        const dateStr = doyToDateStr(doy, parseInt(year));

        const v = cell?.v || 0;
        const u = cell?.u || 0;
        const total = v + u;
        const rate = total > 0 ? ((v / total) * 100).toFixed(0) + "%" : "—";

        tooltip.innerHTML = `
            <div class="hm-tooltip-date">${dateStr}, ${year}</div>
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
                <span class="hm-tooltip-label">Verify rate</span>
                <span class="hm-tooltip-val">${rate}</span>
            </div>` : ""}`;

        // Position tooltip avoiding viewport edges
        const TW = 200, TH = 110;
        let tx = e.clientX + 14;
        let ty = e.clientY - 20;
        if (tx + TW > window.innerWidth - 8)  tx = e.clientX - TW - 14;
        if (ty + TH > window.innerHeight - 8) ty = e.clientY - TH;

        tooltip.style.left    = tx + "px";
        tooltip.style.top     = ty + "px";
        tooltip.style.display = "block";
    });

    canvas.addEventListener("mouseleave", () => {
        tooltip.style.display = "none";
    });
}
