(function () {
  const LS_COSTUME = "halloween-night-costumes-v1";
  const LS_CANDY = "halloween-night-candy-v1";
  const data = window.__HALLOWEEN__ || {};
  const views = ["tonight", "costumes", "candy", "route", "about"];

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (_) { return fallback; }
  }
  function saveJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (_) {}
  }

  /* --- costumes state --- */
  function defaultCostumeState() {
    const out = { char: {}, vic: {} };
    const c = (data.costumes || {});
    ["char", "vic"].forEach((who) => {
      const items = (c[who] && c[who].items) || [];
      items.forEach((it) => { out[who][it.id] = !!it.done; });
    });
    return out;
  }
  let costumeState = Object.assign(defaultCostumeState(), loadJSON(LS_COSTUME, {}));
  ["char", "vic"].forEach((who) => {
    costumeState[who] = Object.assign(defaultCostumeState()[who], costumeState[who] || {});
  });

  /* --- candy state --- */
  function defaultCandy() {
    return (data.candy || []).map((c) => ({
      id: c.id, name: c.name, emoji: c.emoji || "🍬",
      inStock: Number(c.inStock) || 0, given: Number(c.given) || 0
    }));
  }
  let candy = loadJSON(LS_CANDY, null);
  if (!Array.isArray(candy) || !candy.length) candy = defaultCandy();
  else {
    const base = defaultCandy();
    candy = base.map((b) => {
      const prev = candy.find((x) => x.id === b.id);
      return prev ? Object.assign({}, b, { inStock: prev.inStock, given: prev.given }) : b;
    });
  }
  function persistCandy() { saveJSON(LS_CANDY, candy); }
  function persistCostume() { saveJSON(LS_COSTUME, costumeState); }

  /* --- sunset --- */
  const sunsetInfo = data.sunset || {};
  let sunsetLocal = sunsetInfo.localET || sunsetInfo.exampleFallback || "6:05 PM ET";
  let sunsetSource = sunsetInfo.source || "EXAMPLE";
  let sunsetDate = null;

  function parseSunsetET(label) {
    // "6:08 PM ET" on 2026-10-31 America/New_York
    const m = String(label).match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!m) return null;
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    const ap = m[3].toUpperCase();
    if (ap === "PM" && h < 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    // Build as local box time (America/New_York)
    const d = new Date(2026, 9, 31, h, min, 0, 0);
    return d;
  }

  async function resolveSunset() {
    const lat = (data.coords && data.coords.lat) || 39.0596;
    const lon = (data.coords && data.coords.lon) || -76.6477;
    try {
      const url = `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lon}&date=2026-10-31&formatted=0`;
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const j = await res.json();
      if (j.status !== "OK" || !j.results || !j.results.sunset) throw new Error("bad payload");
      const utc = new Date(j.results.sunset);
      sunsetDate = utc;
      const et = utc.toLocaleTimeString("en-US", {
        timeZone: "America/New_York", hour: "numeric", minute: "2-digit", hour12: true
      });
      sunsetLocal = et + " ET";
      sunsetSource = "sunrise-sunset.org (live)";
      // Prefer embedded if close
      if (sunsetInfo.localET) {
        sunsetLocal = sunsetInfo.localET;
        sunsetSource = "sunrise-sunset.org (embedded " + sunsetInfo.utc + ")";
        sunsetDate = parseSunsetET(sunsetInfo.localET) || utc;
      }
    } catch (err) {
      sunsetLocal = sunsetInfo.exampleFallback || "6:05 PM ET";
      sunsetSource = "EXAMPLE fallback (API unavailable)";
      sunsetDate = parseSunsetET(sunsetLocal);
      console.warn("sunset fetch failed", err);
    }
    updateSunsetUI();
    tickCountdown();
  }

  function updateSunsetUI() {
    const pill = $("#sunsetPill");
    if (pill) pill.textContent = "Sunset " + sunsetLocal;
    const foot = $("#footSunset");
    if (foot) foot.textContent = "Sunset " + sunsetLocal + " · " + sunsetSource;
    const sub = $("#countdownSub");
    if (sub) sub.textContent = sunsetLocal + " · " + sunsetSource;
  }

  function tickCountdown() {
    const el = $("#countdownValue");
    if (!el) return;
    const target = sunsetDate || parseSunsetET(sunsetLocal);
    if (!target) { el.textContent = "—"; return; }
    const now = new Date();
    // If viewing after Oct 31 2026 or for demo before, show relative to event date wall-clock
    let diff = target - now;
    // If more than ~40 days away, show days+hms to event; if past event day sunset, show "Past"
    if (diff < 0) {
      el.textContent = "Past";
      return;
    }
    const days = Math.floor(diff / 86400000);
    diff -= days * 86400000;
    const hrs = Math.floor(diff / 3600000);
    diff -= hrs * 3600000;
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff - mins * 60000) / 1000);
    if (days > 0) {
      el.textContent = days + "d " + String(hrs).padStart(2, "0") + ":" +
        String(mins).padStart(2, "0") + ":" + String(secs).padStart(2, "0");
    } else {
      el.textContent = String(hrs).padStart(2, "0") + ":" +
        String(mins).padStart(2, "0") + ":" + String(secs).padStart(2, "0");
    }
  }

  /* --- tabs --- */
  function showView(name) {
    if (!views.includes(name)) name = "tonight";
    $$(".tab").forEach((t) => {
      const on = t.dataset.view === name;
      t.classList.toggle("active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    });
    $$(".view").forEach((v) => v.classList.toggle("active", v.id === "view-" + name));
    if (location.hash.replace(/^#/, "") !== name) {
      history.replaceState(null, "", "#" + name);
    }
  }
  function fromHash() {
    const h = (location.hash || "#tonight").replace(/^#/, "") || "tonight";
    showView(h);
  }

  /* --- render --- */
  function doneCount(who) {
    const items = (data.costumes && data.costumes[who] && data.costumes[who].items) || [];
    let n = 0;
    items.forEach((it) => { if (costumeState[who][it.id]) n++; });
    return { done: n, total: items.length };
  }

  function renderStats() {
    const root = $("#statRow");
    if (!root) return;
    const ch = doneCount("char");
    const vi = doneCount("vic");
    const left = candy.reduce((s, c) => s + Math.max(0, c.inStock - c.given), 0);
    const given = candy.reduce((s, c) => s + (c.given || 0), 0);
    root.innerHTML = [
      { b: sunsetLocal, s: "Sunset (" + (sunsetSource.indexOf("EXAMPLE") >= 0 ? "EXAMPLE" : "approx") + ")" },
      { b: ch.done + "/" + ch.total, s: "Char checklist" },
      { b: vi.done + "/" + vi.total, s: "Vic checklist" },
      { b: String(left), s: "Candy left · " + given + " given" }
    ].map((x) => `<div class="stat"><b>${x.b}</b><span>${x.s}</span></div>`).join("");
  }

  function renderTips() {
    const ul = $("#tipsList");
    if (!ul) return;
    ul.innerHTML = (data.tips || []).map((t) => `<li>${escapeHtml(t)}</li>`).join("");
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[c]);
  }

  function renderCostumes() {
    const root = $("#costumeRoot");
    if (!root) return;
    const c = data.costumes || {};
    root.innerHTML = ["char", "vic"].map((who) => {
      const person = c[who] || {};
      const items = person.items || [];
      const rows = items.map((it) => {
        const checked = !!costumeState[who][it.id];
        return `<label class="check-item${checked ? " done" : ""}">
          <input type="checkbox" data-who="${who}" data-id="${it.id}" ${checked ? "checked" : ""}>
          <span><label>${escapeHtml(it.label)}</label></span>
        </label>`;
      }).join("");
      return `<div class="costume-card">
        <h3>${escapeHtml(person.emoji || "")} ${escapeHtml(person.name || who)}</h3>
        <p class="sub">${escapeHtml(person.ageNote || "")} · EXAMPLE items</p>
        ${rows}
      </div>`;
    }).join("");
    root.querySelectorAll("input[type=checkbox]").forEach((inp) => {
      inp.addEventListener("change", () => {
        const who = inp.dataset.who;
        const id = inp.dataset.id;
        costumeState[who][id] = inp.checked;
        persistCostume();
        renderCostumes();
        renderStats();
        renderPrint();
      });
    });
  }

  function renderCandy() {
    const root = $("#candyRoot");
    if (!root) return;
    root.innerHTML = candy.map((c) => {
      const left = Math.max(0, c.inStock - c.given);
      return `<div class="candy-row" data-id="${c.id}">
        <div>
          <h4>${escapeHtml(c.emoji)} ${escapeHtml(c.name)}</h4>
          <div class="candy-meta">In stock ${c.inStock} · Given ${c.given} · Left ${left}</div>
        </div>
        <div class="candy-controls">
          <button type="button" data-act="give" title="Hand out one">− give</button>
          <span class="candy-count">${left}</span>
          <button type="button" data-act="ungive" title="Undo give">+ undo</button>
          <button type="button" data-act="add" title="Add stock">+ stock</button>
        </div>
      </div>`;
    }).join("");
    root.querySelectorAll(".candy-row").forEach((row) => {
      const id = row.dataset.id;
      const item = candy.find((x) => x.id === id);
      row.querySelectorAll("button").forEach((btn) => {
        btn.addEventListener("click", () => {
          const act = btn.dataset.act;
          if (act === "give" && item.given < item.inStock) item.given += 1;
          if (act === "ungive" && item.given > 0) item.given -= 1;
          if (act === "add") item.inStock += 1;
          persistCandy();
          renderCandy();
          renderStats();
          renderPrint();
        });
      });
    });
  }

  function renderRoute() {
    const r = data.route || {};
    const title = $("#routeTitle");
    const disc = $("#routeDisclaimer");
    const root = $("#routeRoot");
    if (title) title.textContent = r.label || "EXAMPLE route";
    if (disc) disc.textContent = r.disclaimer || "";
    if (!root) return;
    root.innerHTML = (r.stops || []).map((s) =>
      `<li><strong>${escapeHtml(s.name)}</strong><span>${escapeHtml(s.note || "")}${s.example ? " · EXAMPLE" : ""}</span></li>`
    ).join("");
  }

  function renderPrint() {
    const body = $("#printBody");
    if (!body) return;
    const c = data.costumes || {};
    function list(who) {
      const items = (c[who] && c[who].items) || [];
      return items.map((it) => {
        const mark = costumeState[who][it.id] ? "☑" : "☐";
        return `<li>${mark} ${escapeHtml(it.label)}</li>`;
      }).join("");
    }
    const candyLines = candy.map((x) =>
      `<li>${escapeHtml(x.emoji)} ${escapeHtml(x.name)} — left ${Math.max(0, x.inStock - x.given)} (in ${x.inStock} / out ${x.given})</li>`
    ).join("");
    body.innerHTML = `
      <div class="print-col"><h4>Char</h4><ul>${list("char")}</ul></div>
      <div class="print-col"><h4>Vic</h4><ul>${list("vic")}</ul></div>
      <div class="print-col"><h4>Candy</h4><ul>${candyLines}</ul></div>
      <p class="hint">Sunset ${escapeHtml(sunsetLocal)} · ${escapeHtml(sunsetSource)}</p>`;
  }

  /* --- wire --- */
  $$(".tab").forEach((t) => t.addEventListener("click", () => showView(t.dataset.view)));
  window.addEventListener("hashchange", fromHash);

  const btnPrint = $("#btnPrint");
  const btnDoPrint = $("#btnDoPrint");
  function doPrint() {
    showView("about");
    setTimeout(() => window.print(), 80);
  }
  if (btnPrint) btnPrint.addEventListener("click", doPrint);
  if (btnDoPrint) btnDoPrint.addEventListener("click", doPrint);

  const btnResetC = $("#btnResetCostumes");
  if (btnResetC) btnResetC.addEventListener("click", () => {
    costumeState = defaultCostumeState();
    persistCostume();
    renderCostumes();
    renderStats();
    renderPrint();
  });
  const btnResetCandy = $("#btnResetCandy");
  if (btnResetCandy) btnResetCandy.addEventListener("click", () => {
    candy = defaultCandy();
    persistCandy();
    renderCandy();
    renderStats();
    renderPrint();
  });
  const btnExport = $("#btnExport");
  if (btnExport) btnExport.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify({ costumes: costumeState, candy }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "halloween-night-export.json";
    a.click();
    URL.revokeObjectURL(a.href);
  });

  if ($("#datePill") && data.dateLabel) $("#datePill").textContent = "Fri Oct 31 2026";

  // Prefer embedded sunset immediately
  if (sunsetInfo.localET) {
    sunsetLocal = sunsetInfo.localET;
    sunsetSource = "sunrise-sunset.org (embedded)";
    sunsetDate = parseSunsetET(sunsetLocal);
  } else {
    sunsetLocal = sunsetInfo.exampleFallback || "6:05 PM ET";
    sunsetSource = "EXAMPLE";
    sunsetDate = parseSunsetET(sunsetLocal);
  }
  updateSunsetUI();
  renderTips();
  renderCostumes();
  renderCandy();
  renderRoute();
  renderStats();
  renderPrint();
  fromHash();
  tickCountdown();
  setInterval(tickCountdown, 1000);
  resolveSunset();
})();
