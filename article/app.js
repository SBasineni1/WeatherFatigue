/* ═══════════════════════════════════════════════════════════════
   Storm Warning Verification Explorer — Scroll-based App
   ═══════════════════════════════════════════════════════════════ */

// ── State ──
let allReports   = [];
let allAggStats  = [];
let allHeatmap   = null;
let map, markerLayer;
let currentHeatmapWFO = null;
let currentHmRange = "all";   // "all" | "10" | "5" | "1"

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
    initProgressBar();
    initHeroParallax();
    setupScrollReveal();
    initIconArray();
    initScrollIndicator();
    await loadData();
    setupFilterToggles();
    initMap();
    updateMapAndStats();
    initMapStats();
    initHeatmap();
    initAnalytics();
});

// ══════════════════════════════════════════════════════════
// Reading progress bar
// ══════════════════════════════════════════════════════════

function initProgressBar() {
    const bar = document.getElementById('progressBar');
    if (!bar) return;
    const update = () => {
        const h = document.documentElement;
        const max = h.scrollHeight - h.clientHeight;
        const pct = max > 0 ? (h.scrollTop || window.scrollY) / max : 0;
        bar.style.transform = `scaleX(${Math.min(1, Math.max(0, pct))})`;
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
}

// ══════════════════════════════════════════════════════════
// Hero parallax (subtle, respects reduced-motion)
// ══════════════════════════════════════════════════════════

function initHeroParallax() {
    const layer = document.getElementById('heroBg');
    if (!layer) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let ticking = false;
    const apply = () => {
        const y = window.scrollY;
        if (y < window.innerHeight * 1.2) {
            layer.style.transform = `translate3d(0, ${y * 0.18}px, 0) scale(1.06)`;
            const hero = document.getElementById('intro');
            if (hero) hero.style.setProperty('--hero-fade', String(Math.max(0, 1 - y / (window.innerHeight * 0.85))));
        }
        ticking = false;
    };
    window.addEventListener('scroll', () => {
        if (!ticking) { requestAnimationFrame(apply); ticking = true; }
    }, { passive: true });
    apply();
}

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

// Count up the map's headline stats once they scroll into view.
function initMapStats() {
    const wrap = document.getElementById("mapStats");
    if (!wrap) return;
    const targets = [
        [document.getElementById("mapStatWarned"), 115924],
        [document.getElementById("mapStatUnwarned"), 84076],
    ];
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;  // leave the real numbers in place

    const countUp = (el, target, dur = 1100) => {
        if (!el) return;
        const start = performance.now();
        const tick = now => {
            const p = Math.min((now - start) / dur, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.round(target * eased).toLocaleString();
            if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    };

    const obs = new IntersectionObserver((entries, o) => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                targets.forEach(([el, t]) => countUp(el, t));
                o.disconnect();
            }
        });
    }, { threshold: 0.5 });
    obs.observe(wrap);
}

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
        preferCanvas: true,            // render the 30k report dots on canvas
        zoomControl: true,
        attributionControl: false,
        minZoom: 4,
        maxBounds: [[20, -128], [52, -64]],   // CONUS only
        maxBoundsViscosity: 1.0,
    }).setView([39.5, -96.0], 4);

    // Dedicated basemap pane that sits *below* the report dots.
    map.createPane("basemap");
    map.getPane("basemap").style.zIndex = 350;

    // Our own basemap: US states drawn from a local TopoJSON — no external tiles.
    fetch("assets/us-states-topo.json")
        .then(r => r.json())
        .then(topo => {
            // Keep only the lower 48 + DC — drop AK, HI, PR and the territories.
            const nonConus = new Set(["02", "15", "60", "66", "69", "72", "78"]);
            const conusGeoms = topo.objects.states.geometries.filter(g => !nonConus.has(g.id));
            const states  = topojson.feature(topo, { type: "GeometryCollection", geometries: conusGeoms });
            const outline = topojson.merge(topo, conusGeoms);   // single CONUS border

            L.geoJSON(states, {
                pane: "basemap",
                interactive: false,
                style: {
                    color: "rgba(27, 26, 24, 0.14)",     // ink state borders
                    weight: 0.6,
                    fillColor: "#FBFAF6",                // clean paper land
                    fillOpacity: 1,
                },
            }).addTo(map);

            L.geoJSON(outline, {
                pane: "basemap",
                interactive: false,
                style: { color: "rgba(27, 26, 24, 0.34)", weight: 1.2, fill: false },
            }).addTo(map);
        })
        .catch(err => console.error("Basemap failed to load:", err));

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
            radius: 2.6, color: "transparent",
            fillColor: "#E07B5A", fillOpacity: 0.6, weight: 0,   // unwarned — coral
        }).bindPopup(`<b>${r.typetext}</b><br>WFO: ${r.wfo} · ${r.state}<br>Warned: No`)
          .addTo(markerLayer);
    }
    for (const r of filtered.filter(r => r.warned)) {
        L.circleMarker([r.lat0, r.lon0], {
            radius: 2.6, color: "transparent",
            fillColor: "#2E9CCA", fillOpacity: 0.6, weight: 0,   // warned — teal
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
    LABEL_Y: 26,   // month-label row height
    LABEL_X: 46,   // year-label column width
    PAD:     10,
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
    setupHmRange();
}

// ── Time-range toggle (All / 10 / 5 / 1 yr) ──────────────
function hmFilterYears(yearData) {
    const all = Object.keys(yearData).sort();
    if (currentHmRange === "all") return all;
    return all.slice(-parseInt(currentHmRange, 10));
}

function setupHmRange() {
    const box = document.getElementById("hmRange");
    if (!box) return;
    box.addEventListener("click", (e) => {
        const btn = e.target.closest(".hm-range-btn");
        if (!btn) return;
        currentHmRange = btn.dataset.range;
        box.querySelectorAll(".hm-range-btn")
           .forEach(b => b.classList.toggle("is-active", b === btn));
        if (currentHeatmapWFO) {
            updateHmStats(currentHeatmapWFO);
            renderHeatmap(currentHeatmapWFO);
        }
    });
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

    document.getElementById("hmPanel").style.display = "block";
    document.getElementById("hmEmpty").style.display = "none";
    document.getElementById("hmStats").style.display = "flex";
    const cap = document.getElementById("hmCapCity");
    if (cap) cap.textContent = city || wfo;

    updateHmStats(wfo);
    renderHeatmap(wfo);   // measure after the panel is visible so it fills the width
}

// ── Stats ─────────────────────────────────────────────────

function updateHmStats(wfo) {
    const yearData = allHeatmap.heatmap[wfo] || {};
    const years = hmFilterYears(yearData);
    let total = 0, verified = 0;
    years.forEach(y => {
        for (const day of Object.values(yearData[y] || {})) { total += day.v + day.u; verified += day.v; }
    });
    const rate = total > 0 ? ((verified / total) * 100).toFixed(1) + "%" : "—";
    document.getElementById("hmStatTotal").textContent     = total.toLocaleString();
    document.getElementById("hmStatVerified").textContent  = verified.toLocaleString();
    document.getElementById("hmStatUnverified").textContent = (total - verified).toLocaleString();
    document.getElementById("hmStatRate").textContent      = rate;

    const sub = document.getElementById("hmCapSub");
    if (sub) {
        const span = years.length === 0 ? ""
            : years[0] === years[years.length - 1] ? ` · ${years[0]}`
            : ` · ${years[0]}–${years[years.length - 1]}`;
        sub.textContent = `Warning days${span}`;
    }
}

// ══════════════════════════════════════════════════════════
// Canvas renderer
// ══════════════════════════════════════════════════════════

function hmRowSize(n) {
    if (n <= 1)  return { ROW_H: 96, RIDGE_H: 82 };
    if (n <= 5)  return { ROW_H: 54, RIDGE_H: 46 };
    if (n <= 10) return { ROW_H: 40, RIDGE_H: 33 };
    return { ROW_H: 30, RIDGE_H: 25 };
}

function renderHeatmap(wfo) {
    const canvas   = document.getElementById("hmCanvas");
    const ctx      = canvas.getContext("2d");
    const yearData = allHeatmap.heatmap[wfo] || {};
    const years    = hmFilterYears(yearData);
    const { ROW_H, RIDGE_H } = hmRowSize(years.length);

    const totalDays = 366;
    // Size to fill the container width — no horizontal scroll.
    const scroll = canvas.parentElement;
    const availW = Math.max(620, (scroll ? scroll.clientWidth : 1080));
    const plotW  = availW - HM.LABEL_X - HM.PAD;
    const step   = plotW / (totalDays - 1);
    const W = availW;
    const H = HM.LABEL_Y + years.length * ROW_H + HM.PAD;

    const dpr = window.devicePixelRatio || 1;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // Peak daily warning count over the *visible* years → ridge height scale
    let maxDaily = 1;
    years.forEach(y => {
        for (const d of Object.values(yearData[y] || {})) maxDaily = Math.max(maxDaily, d.v + d.u);
    });
    const hOf = (n) => n <= 0 ? 0 : Math.sqrt(n / maxDaily) * RIDGE_H;

    const TEAL = "#2E9CCA", CORAL = "#E07B5A", CORAL_LINE = "#C85B39";
    const xOf = (doy) => HM.LABEL_X + (doy - 1) * step;

    // Alternating row bands (readability)
    years.forEach((year, yi) => {
        if (yi % 2 === 0) return;
        const top = HM.LABEL_Y + yi * ROW_H;
        ctx.fillStyle = "rgba(27,26,24,0.022)";
        ctx.fillRect(HM.LABEL_X - 2, top, plotW + 4, ROW_H);
    });

    // Month gridlines + labels
    ctx.font = `600 10px 'Hanken Grotesk', sans-serif`;
    ctx.textBaseline = "alphabetic";
    MONTH_STARTS.forEach((doy, mi) => {
        const x = xOf(doy);
        ctx.strokeStyle = "rgba(27,26,24,0.06)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(Math.round(x) + 0.5, HM.LABEL_Y - 4);
        ctx.lineTo(Math.round(x) + 0.5, H - HM.PAD);
        ctx.stroke();
        ctx.fillStyle = "#6E6A61";
        ctx.textAlign = "left";
        ctx.fillText(MONTH_NAMES[mi], x + 3, HM.LABEL_Y - 9);
    });

    // One area-ridge per year
    years.forEach((year, yi) => {
        const yBase  = HM.LABEL_Y + yi * ROW_H + RIDGE_H + (ROW_H - RIDGE_H) / 2;
        const dayMap = yearData[year] || {};

        // baseline hairline
        ctx.strokeStyle = "rgba(27,26,24,0.12)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(HM.LABEL_X, yBase + 0.5);
        ctx.lineTo(HM.LABEL_X + plotW, yBase + 0.5);
        ctx.stroke();

        // year label
        ctx.fillStyle = "#3B3833";
        ctx.font = `600 11px 'Hanken Grotesk', sans-serif`;
        ctx.textAlign = "right";
        ctx.fillText(year, HM.LABEL_X - 9, yBase - RIDGE_H * 0.12);

        // total envelope = coral, verified share overlaid = teal
        const traceTop = (heightAt) => {
            for (let doy = 1; doy <= totalDays; doy++) {
                const cell = dayMap[String(doy)];
                const t = cell ? cell.v + cell.u : 0;
                ctx.lineTo(xOf(doy), yBase - heightAt(cell, t));
            }
        };
        const fillEnvelope = (heightAt, color) => {
            ctx.beginPath();
            ctx.moveTo(xOf(1), yBase);
            traceTop(heightAt);
            ctx.lineTo(xOf(totalDays), yBase);
            ctx.closePath();
            ctx.fillStyle = color;
            ctx.fill();
        };

        fillEnvelope((cell, t) => hOf(t), CORAL);
        fillEnvelope((cell, t) => t > 0 ? hOf(t) * (cell.v / t) : 0, TEAL);

        // crisp silhouette stroke on the total ridge
        ctx.beginPath();
        ctx.moveTo(xOf(1), yBase);
        traceTop((cell, t) => hOf(t));
        ctx.lineTo(xOf(totalDays), yBase);
        ctx.strokeStyle = "rgba(20,18,16,0.7)";
        ctx.lineWidth = 1;
        ctx.stroke();
    });

    canvas._hmMeta = { years, yearData, step, rowH: ROW_H };
}

// ══════════════════════════════════════════════════════════
// Tooltip
// ══════════════════════════════════════════════════════════

function setupHmTooltip() {
    const canvas  = document.getElementById("hmCanvas");
    const tooltip = document.getElementById("hmTooltip");

    canvas.addEventListener("mousemove", (e) => {
        if (!canvas._hmMeta) return;
        const { years, yearData, step, rowH } = canvas._hmMeta;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        const relX = mx - HM.LABEL_X;
        const relY = my - HM.LABEL_Y;
        if (relX < 0 || relY < 0) { tooltip.style.display = "none"; return; }

        const doy = Math.round(relX / step) + 1;
        const row = Math.floor(relY / rowH);

        if (doy < 1 || doy > 366 || row < 0 || row >= years.length) {
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
    font: { family: "'Hanken Grotesk', sans-serif", size: 11 },
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

    // Bin WFOs by verification rate (no office exceeds 80%, so we stop there)
    const bins = [0,10,20,30,40,50,60,70,80];
    const labels = bins.slice(0,-1).map((b,i) => `${b}–${bins[i+1]}%`);
    const counts = new Array(bins.length - 1).fill(0);
    geo.forEach(d => {
        const idx = Math.min(Math.floor(d.rate * 10), bins.length - 2);
        counts[idx]++;
    });

    // Vertical bar chart — office count per verification-rate band.
    const color = i => {
        const t = i / (counts.length - 1);
        const r = Math.round(230 + t * (28  - 230));   // #E66340 → #1CA0D6
        const g = Math.round(99  + t * (160 - 99));
        const b = Math.round(64  + t * (214 - 64));
        return `rgb(${r},${g},${b})`;
    };
    const maxC = Math.max(...counts);
    const cols = counts.map((c, i) => `
        <div class="vbar-col">
            <span class="vbar-val">${c}</span>
            <div class="vbar-fill" style="--h:${(c / maxC) * 88}%;background:${color(i)};transition-delay:${i * 60}ms"></div>
        </div>`).join('');
    const axis = labels.map(l => `<span class="vbar-label">${l}</span>`).join('');
    el.innerHTML = `<div class="vbars">${cols}</div><div class="vbar-axis">${axis}</div>`;

    // Diverging spectrum: best 5 (teal, right) vs worst 5 (coral, left)
    const valid = geo.filter(d => d.total >= 100);
    buildSpectrum(valid.slice(0, 5), valid.slice(-5).reverse());
}

function buildSpectrum(highest, lowest) {
    const el = document.getElementById('specRows');
    if (!el) return;
    el.innerHTML = highest.map((high, i) => {
        const low = lowest[i];
        const hp = high.rate * 100;
        const lp = low.rate * 100;
        return `
        <div class="spec-row">
            <div class="spec-side spec-low">
                <span class="spec-city">${low.city}</span>
                <span class="spec-pct coral">${lp.toFixed(0)}<span class="spec-pct-sign">%</span></span>
                <div class="spec-track"><div class="spec-fill coral" style="width:${lp}%"></div></div>
            </div>
            <div class="spec-rank">${i + 1}</div>
            <div class="spec-side spec-high">
                <div class="spec-track"><div class="spec-fill teal" style="width:${hp}%"></div></div>
                <span class="spec-pct teal">${hp.toFixed(0)}<span class="spec-pct-sign">%</span></span>
                <span class="spec-city">${high.city}</span>
            </div>
        </div>`;
    }).join('');
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
                    borderColor: '#1CA0D6',
                    backgroundColor: 'rgba(28,160,214,0.10)',
                    borderWidth: 2.5,
                    pointRadius: 3.5,
                    pointBackgroundColor: '#1CA0D6',
                    pointBorderColor: '#FBFAF6',
                    pointBorderWidth: 1.5,
                    tension: 0.35,
                    fill: true,
                    spanGaps: true,
                },
                {
                    label: 'Tornado',
                    data: toRates,
                    borderColor: '#E66340',
                    backgroundColor: 'rgba(230,99,64,0.10)',
                    borderWidth: 2.5,
                    pointRadius: 3.5,
                    pointBackgroundColor: '#E66340',
                    pointBorderColor: '#FBFAF6',
                    pointBorderWidth: 1.5,
                    tension: 0.35,
                    fill: true,
                    spanGaps: true,
                },
            ],
        },
        // Bright, on-paper editorial options
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 800, easing: 'easeOutQuart' },
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#FBFAF6',
                    titleColor: '#1B1A18',
                    bodyColor: '#3B3833',
                    borderColor: 'rgba(27,26,24,0.14)',
                    borderWidth: 1,
                    padding: 12, cornerRadius: 10, displayColors: true, boxPadding: 4,
                    titleFont: { family: 'Hanken Grotesk', size: 13, weight: '600' },
                    bodyFont:  { family: 'Hanken Grotesk', size: 12.5 },
                    callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.raw}%` },
                },
            },
            scales: {
                x: {
                    grid: { display: false },
                    border: { color: 'rgba(27,26,24,0.18)' },
                    ticks: { color: '#3B3833', maxRotation: 0, autoSkip: true, maxTicksLimit: 10, font: { family: 'Newsreader', size: 12.5 } },
                },
                y: {
                    grid: { color: 'rgba(27,26,24,0.07)' },
                    border: { display: false },
                    ticks: { color: '#3B3833', callback: v => v + '%', font: { family: 'Newsreader', size: 12.5 } },
                    min: 0, max: 100,
                },
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
    if (deltaEl) { deltaEl.textContent = `${sign}${delta}pp`; deltaEl.className = `map-stat-num ${delta > 0 ? 'teal' : 'coral'}`; }
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
                  backgroundColor: 'rgb(28,160,214)', hoverBackgroundColor: 'rgb(28,160,214)',   // no color shift on hover
                  borderWidth: 0, borderRadius: 4 },
                { label: 'Tornado', data: toPct,
                  backgroundColor: 'rgb(230,99,64)', hoverBackgroundColor: 'rgb(230,99,64)',     // no color shift on hover
                  borderWidth: 0, borderRadius: 4 },
            ],
        },
        // Bright, on-paper editorial options (matches the geo histogram)
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 800, easing: 'easeOutQuart' },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#FBFAF6',
                    titleColor: '#1B1A18',
                    bodyColor: '#3B3833',
                    borderColor: 'rgba(27,26,24,0.14)',
                    borderWidth: 1,
                    padding: 12, cornerRadius: 10, displayColors: true, boxPadding: 4,
                    titleFont: { family: 'Hanken Grotesk', size: 13, weight: '600' },
                    bodyFont:  { family: 'Hanken Grotesk', size: 12.5 },
                    callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.raw}% of verified warnings` },
                },
            },
            scales: {
                x: {
                    grid: { display: false },
                    border: { color: 'rgba(27,26,24,0.18)' },
                    ticks: { color: '#3B3833', font: { family: 'Newsreader', size: 13, weight: '500' } },
                },
                y: {
                    grace: '6%',
                    grid: { color: 'rgba(27,26,24,0.07)' },
                    border: { display: false },
                    ticks: { color: '#3B3833', callback: v => v + '%', font: { family: 'Newsreader', size: 14, weight: '500' } },
                    title: { display: true, text: '% of verified warnings', color: '#3B3833', font: { family: 'Newsreader', size: 13.5, style: 'italic', weight: '500' } },
                },
            },
        },
    });
}

// ── 4. Clustering cards ───────────────────────────────────

function buildClusterScatter(clustering) {
    const el = document.getElementById('clusterOffices');
    if (!el || !clustering) return;

    el.innerHTML = `
        <figure class="chart-feature">
            <p class="map-kicker">False Alarm Rate Vs. Consecutive False Alarms</p>
            <div class="chart-container" style="height:440px;">
                <canvas id="chartCluster"></canvas>
            </div>
            <div class="cf-legend cf-legend--below">
                <span class="legend-item"><span class="dot coral"></span>High streak (≥14)</span>
                <span class="legend-item"><span class="dot teal"></span>Lower streak</span>
            </div>
        </figure>`;

    const points = Object.entries(clustering).map(([wfo, c]) => {
        const far = (c.false_total / c.total) * 100;
        return {
            x: far,
            y: c.max_streak,
            r: 6 + (c.avg_streak - 1.5) * 8,
            wfo,
            city: c.city.split(',')[0],
            avg_streak: c.avg_streak,
            far: far.toFixed(1),
        };
    });

    const isHigh = p => p.y >= 14;
    const colors  = points.map(p => isHigh(p) ? 'rgba(230,99,64,0.42)' : 'rgba(28,160,214,0.4)');
    const borders = points.map(p => isHigh(p) ? '#E66340' : '#1CA0D6');

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
                ctx.font = "600 11px 'Hanken Grotesk', sans-serif";
                ctx.fillStyle = isHigh(pt) ? '#C85B39' : '#1F7CA3';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText(pt.wfo, x, y - radius - 5);
                ctx.restore();
            });
        }
    };

    // Faint washes framing the two corners
    const zones = {
        id: 'zones',
        beforeDatasetsDraw(chart) {
            const { ctx, chartArea, scales } = chart;
            ctx.save();
            ctx.font = "italic 600 11px 'Newsreader', serif";

            // High FAR · long streaks (top-right) — coral
            const xH = scales.x.getPixelForValue(42);
            const yH = scales.y.getPixelForValue(13);
            ctx.fillStyle = 'rgba(230,99,64,0.06)';
            ctx.fillRect(xH, chartArea.top, chartArea.right - xH, yH - chartArea.top);
            ctx.fillStyle = 'rgba(200,91,57,0.75)';
            ctx.textAlign = 'right';
            ctx.fillText('Long Streaks', chartArea.right - 10, chartArea.top + 16);

            // Low FAR · short streaks (bottom-left) — teal
            const xL = scales.x.getPixelForValue(40);
            const yL = scales.y.getPixelForValue(12);
            ctx.fillStyle = 'rgba(28,160,214,0.06)';
            ctx.fillRect(chartArea.left, yL, xL - chartArea.left, chartArea.bottom - yL);
            ctx.fillStyle = 'rgba(31,124,163,0.8)';
            ctx.textAlign = 'left';
            ctx.fillText('Short Streaks', chartArea.left + 10, chartArea.bottom - 8);

            ctx.restore();
        }
    };

    new Chart(document.getElementById('chartCluster'), {
        type: 'bubble',
        data: { datasets: [{ data: points, backgroundColor: colors, borderColor: borders, borderWidth: 2, hoverBorderWidth: 2 }] },
        plugins: [zones, labelPlugin],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#FBFAF6',
                    titleColor: '#1B1A18',
                    bodyColor: '#3B3833',
                    borderColor: 'rgba(27,26,24,0.14)',
                    borderWidth: 1,
                    padding: 12, cornerRadius: 10, displayColors: false,
                    titleFont: { family: 'Hanken Grotesk', size: 13, weight: '600' },
                    bodyFont:  { family: 'Hanken Grotesk', size: 12.5 },
                    callbacks: {
                        title(items) { return items[0].raw.city + ' (' + items[0].raw.wfo + ')'; },
                        label(ctx) {
                            const d = ctx.raw;
                            return [
                                `False-alarm rate: ${d.far}%`,
                                `Worst streak: ${d.y} in a row`,
                                `Average streak: ${d.avg_streak}`,
                            ];
                        }
                    }
                }
            },
            layout: { padding: { top: 14, right: 10 } },
            scales: {
                x: {
                    title: { display: true, text: 'False alarm rate', color: '#6E6A61',
                             font: { size: 12.5, family: 'Newsreader', style: 'italic' } },
                    min: 25, max: 70,
                    ticks: { color: '#6E6A61', callback: v => v + '%', font: { family: 'Newsreader', size: 12 } },
                    grid: { color: 'rgba(27,26,24,0.06)', borderDash: [2, 4] },
                    border: { color: 'rgba(27,26,24,0.16)' }
                },
                y: {
                    title: { display: true, text: 'Max consecutive false alarms', color: '#6E6A61',
                             font: { size: 12.5, family: 'Newsreader', style: 'italic' } },
                    min: 7, max: 18,
                    ticks: { color: '#6E6A61', stepSize: 2, font: { family: 'Newsreader', size: 12 } },
                    grid: { color: 'rgba(27,26,24,0.06)', borderDash: [2, 4] },
                    border: { color: 'rgba(27,26,24,0.16)' }
                }
            }
        }
    });
}
