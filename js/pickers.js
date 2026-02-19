/**
 * pickers.js — Native <select> picker population and defaults.
 *
 * Each ion input uses a `<select class="picker">` instead of a
 * numeric slider.  This file defines the picker ranges, step sizes,
 * clinical defaults, and the logic to populate / repopulate picker
 * options (e.g. when units change from mmol/L → mg/dL).
 *
 * Depends on: helpers.js (el, parse), units.js (displayToSI, siToDisplay)
 */

"use strict";

/* ─────────────────────────────────────────────────────────────────────
 *  Picker range configuration
 * ───────────────────────────────────────────────────────────────────── */

const PICKER_CONFIG = [
  { id: "na",   min: 110,  max: 160,   step: 1,    decimals: 0 },
  { id: "k",    min: 0.0,  max: 10.0,  step: 0.1,  decimals: 1 },
  { id: "ica",  min: 0.00, max: 2.00,  step: 0.01, decimals: 2 },
  { id: "mg",   min: 0.00, max: 10.00, step: 0.01, decimals: 2 },
  { id: "cl",   min: 60,   max: 150,   step: 1,    decimals: 0 },
  { id: "lac",  min: 0.0,  max: 10.0,  step: 0.1,  decimals: 1 },
  { id: "alb",  min: 0.0,  max: 6.0,   step: 0.1,  decimals: 1 },
  { id: "phos", min: 0.00, max: 10.00, step: 0.1,  decimals: 1 },
  { id: "ph",   min: 6.80, max: 8.00,  step: 0.01, decimals: 2 },
  { id: "pco2", min: 0,    max: 200,   step: 1,    decimals: 0 },
];

/* ─────────────────────────────────────────────────────────────────────
 *  Clinically typical defaults (SI units)
 *
 *  All values are mmol/L except albumin which is g/dL.
 *  Mg default is the ionised fraction (≈ 60 % of total serum Mg).
 * ───────────────────────────────────────────────────────────────────── */

const PICKER_DEFAULTS_SI = {
  na:   140.0,
  k:    4.0,
  ica:  1.20,
  mg:   0.50,    // ionised Mg (≈ 60 % of total serum ≈ 0.85)
  cl:   104.0,
  lac:  1.0,
  alb:  4.0,     // g/dL
  phos: 1.0,
  ph:   7.40,
  pco2: 40.0,
};

/* ─────────────────────────────────────────────────────────────────────
 *  populatePicker()
 * ───────────────────────────────────────────────────────────────────── */

/**
 * Build or rebuild the `<option>` list for one ion picker.
 *
 * On first call the picker is empty (`sel.value === ""`), so NaN
 * is detected and the clinical default from `PICKER_DEFAULTS_SI` is
 * used.  On subsequent calls (e.g. after a unit-selector change) the
 * current SI value is preserved and re-displayed in the new unit.
 *
 * @param {Object} cfg  One entry from `PICKER_CONFIG`.
 */
function populatePicker(cfg) {
  const sel = document.getElementById(cfg.id + "-picker");
  const num = el(cfg.id) || sel; // fall back to picker if numeric input is absent
  if (!sel) return;

  // Snapshot current display-value BEFORE clearing so we can restore
  // it on unit-change repopulation.
  const unitEl   = document.getElementById(cfg.id + "-unit");
  const unit     = unitEl ? unitEl.value : "si";
  const prevDisp = parseFloat(sel.value);
  const prevSI   = Number.isFinite(prevDisp)
    ? displayToSI(cfg.id, prevDisp, unit) : NaN;

  // Use the preserved SI value if available, otherwise fall back to
  // the clinical default.
  const targetSI = Number.isFinite(prevSI) ? prevSI : PICKER_DEFAULTS_SI[cfg.id];

  // Rebuild <option> list
  sel.innerHTML = "";
  const steps = Math.round((cfg.max - cfg.min) / cfg.step);
  for (let i = 0; i <= steps; i++) {
    const vSI      = cfg.min + i * cfg.step;
    const displayV = (unit === "si") ? vSI : siToDisplay(cfg.id, vSI, unit);
    const label    = Number(displayV).toFixed(cfg.decimals);
    const opt      = document.createElement("option");
    opt.value       = label;
    opt.textContent = label;
    sel.appendChild(opt);
  }

  // Apply target value; append an extra <option> if it falls outside
  // the configured range.
  if (targetSI !== undefined && Number.isFinite(targetSI)) {
    const displayTarget = (unit === "si") ? targetSI : siToDisplay(cfg.id, targetSI, unit);
    const want = Number(displayTarget).toFixed(cfg.decimals);
    if (!Array.from(sel.options).some((o) => o.value === want)) {
      const extra       = document.createElement("option");
      extra.value       = want;
      extra.textContent = want;
      sel.appendChild(extra);
    }
    sel.value = want;
    if (num && num !== sel) num.value = want;
  }

  // Keep picker ↔ numeric input in sync
  sel.addEventListener("change", (e) => {
    if (num !== sel) num.value = e.target.value;
    computeAll();
  });

  num.addEventListener("input", () => {
    const v = parseFloat(num.value);
    if (!Number.isFinite(v)) return;
    const s = v.toFixed(cfg.decimals);
    if (!Array.from(sel.options).some((o) => o.value === s)) {
      const extra       = document.createElement("option");
      extra.value       = s;
      extra.textContent = s;
      sel.appendChild(extra);
    }
    sel.value = s;
  });
}
