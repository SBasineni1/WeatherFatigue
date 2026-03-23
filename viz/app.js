/* ═══════════════════════════════════════════════════════════════
   Storm Warning Verification Explorer — Scroll-based App
   ═══════════════════════════════════════════════════════════════ */

// ── State ──
let allReports = [];
let allAggStats = [];
let currentRegion = "all";
let map, markerLayer;
let verificationChart = null;

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
    const [reportsResp, aggResp] = await Promise.all([
        fetch("data/reports.json"),
        fetch("data/agg_stats.json"),
    ]);
    allReports = await reportsResp.json();
    allAggStats = await aggResp.json();
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
