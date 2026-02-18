/**
 * events.js — UI event wiring (runs on page load).
 *
 * Binds all interactive behaviours: reset button, export, formulas
 * panel toggle, light-mode switch, debounced input recompute, unit
 * selector auto-conversion, picker population, and resize handler.
 *
 * This file should be loaded LAST, after all other modules, because
 * it calls `computeAll()` at the bottom for the initial render.
 *
 * Depends on: helpers.js, units.js, compute.js, export.js, pickers.js
 */

"use strict";

/* ─────────────────────────────────────────────────────────────────────
 *  Reset button
 * ───────────────────────────────────────────────────────────────────── */

el("reset").addEventListener("click", () => {
  document.querySelectorAll("input, select").forEach((elm) => {
    if (elm.type === "checkbox")       elm.checked = elm.defaultChecked;
    else if (elm.tagName === "SELECT") elm.value   = elm.defaultValue;
    else                               elm.value   = elm.defaultValue || "";
  });
  document.querySelectorAll("dd").forEach((d) => (d.textContent = "\u2014"));
  const h = el("hco3");
  if (h) h.placeholder = "auto";
  computeAll();
});

/* ─────────────────────────────────────────────────────────────────────
 *  Export Gamblegram button
 * ───────────────────────────────────────────────────────────────────── */

const _exportBtn = el("export-gg");
if (_exportBtn) _exportBtn.addEventListener("click", exportGamblegramPNG);

/* ─────────────────────────────────────────────────────────────────────
 *  Formulas panel (collapsible)
 * ───────────────────────────────────────────────────────────────────── */

const _formulasPanel = document.getElementById("formulas-panel");
const _toggleBtn     = document.getElementById("toggle-formulas");
const _mhToggleBtn   = document.getElementById("mh-toggle-formulas");

function setFormulasCollapsed(collapsed) {
  if (!_formulasPanel) return;
  _formulasPanel.classList.toggle("collapsed", collapsed);
  if (_toggleBtn) {
    _toggleBtn.textContent = collapsed ? "Show" : "Hide";
    _toggleBtn.setAttribute("aria-expanded", String(!collapsed));
  }
}
if (_toggleBtn) {
  _toggleBtn.addEventListener("click", () =>
    setFormulasCollapsed(!_formulasPanel.classList.contains("collapsed"))
  );
}
if (_mhToggleBtn) {
  _mhToggleBtn.addEventListener("click", () =>
    setFormulasCollapsed(!_formulasPanel.classList.contains("collapsed"))
  );
}

/* ─────────────────────────────────────────────────────────────────────
 *  Light-mode toggle
 * ───────────────────────────────────────────────────────────────────── */

const _lightToggle = el("toggle-light");
if (_lightToggle) {
  _lightToggle.addEventListener("change", (e) =>
    document.body.classList.toggle("light", e.target.checked)
  );
}

/* ─────────────────────────────────────────────────────────────────────
 *  Non-SI toggle → recompute
 * ───────────────────────────────────────────────────────────────────── */

const _nonSi = el("show-non-si");
if (_nonSi) _nonSi.addEventListener("change", computeAll);

/* ─────────────────────────────────────────────────────────────────────
 *  Debounced live recompute on any <input> change
 * ───────────────────────────────────────────────────────────────────── */

let _inputTimer;
document.querySelectorAll("input").forEach((inp) => {
  inp.addEventListener("input", () => {
    clearTimeout(_inputTimer);
    _inputTimer = setTimeout(computeAll, 150);
  });
});

/* ─────────────────────────────────────────────────────────────────────
 *  Unit-selector auto-conversion
 *
 *  When the user switches between mmol/L and mg/dL, convert the
 *  current value so the underlying SI amount stays the same.
 * ───────────────────────────────────────────────────────────────────── */

document.querySelectorAll("select.unit-select").forEach((sel) => {
  sel.dataset.prevUnit = sel.value;

  sel.addEventListener("change", (ev) => {
    const s      = ev.currentTarget;
    const prevU  = s.dataset.prevUnit || "si";
    const newU   = s.value;
    const ionId  = s.id.replace("-unit", "");
    const input  = document.getElementById(ionId);
    const curVal = input ? parseFloat(input.value) : NaN;

    if (Number.isFinite(curVal) && prevU !== newU && input) {
      const si = displayToSI(ionId, curVal, prevU);
      const nv = siToDisplay(ionId, si, newU);
      if (Number.isFinite(nv)) input.value = Math.round(nv * 100) / 100;
    }
    s.dataset.prevUnit = newU;
    computeAll();
  });
});

/* ─────────────────────────────────────────────────────────────────────
 *  Populate pickers on load
 * ───────────────────────────────────────────────────────────────────── */

PICKER_CONFIG.forEach(populatePicker);

// Repopulate a picker when its unit selector changes so the
// option labels match the new unit.
document.querySelectorAll("select.unit-select").forEach((s) => {
  s.addEventListener("change", () => {
    const ion = s.id.replace("-unit", "");
    const cfg = PICKER_CONFIG.find((c) => c.id === ion);
    if (cfg) populatePicker(cfg);
    computeAll();
  });
});

/* ─────────────────────────────────────────────────────────────────────
 *  Window resize → recompute (the SVG measures its container width)
 * ───────────────────────────────────────────────────────────────────── */

let _resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(computeAll, 200);
});

/* ─────────────────────────────────────────────────────────────────────
 *  Initial render
 * ───────────────────────────────────────────────────────────────────── */

computeAll();
