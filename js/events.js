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

const _resetBtn = el("reset");
if (_resetBtn) _resetBtn.addEventListener("click", () => {
  // Reset checkboxes to their defaults
  document.querySelectorAll("input[type=checkbox]").forEach((c) => (c.checked = c.defaultChecked));

  // Reset unit selectors to their default values and update dataset.prev
  document.querySelectorAll("select.unit-select").forEach((s) => {
    s.value = s.defaultValue || s.value;
    s.dataset.prev = s.value;
  });

  // For each configured picker, set to clinical default (converted to current unit)
  PICKER_CONFIG.forEach((cfg) => {
    const sel = document.getElementById(cfg.id + "-picker");
    const num = document.getElementById(cfg.id);
    const unitEl = document.getElementById(cfg.id + "-unit");
    const unit = unitEl ? unitEl.value : "si";
    const defaultSI = PICKER_DEFAULTS_SI[cfg.id];
    const displayV = (unit === "si") ? defaultSI : siToDisplay(cfg.id, defaultSI, unit);
    const label = Number(displayV).toFixed(cfg.decimals);

    // Ensure the picker has options for this value, repopulating if needed
    if (sel) {
      populatePicker(cfg);
      if (!Array.from(sel.options).some((o) => o.value === label)) {
        const extra = document.createElement("option");
        extra.value = label;
        extra.textContent = label;
        sel.appendChild(extra);
      }
      sel.value = label;
    }
    if (num && num !== sel) num.value = label;
  });

  // Reset other non-picker inputs to their defaultValue (e.g., SBE)
  document.querySelectorAll("input:not([type=checkbox])").forEach((inp) => {
    if (!inp.id) return;
    const inCfg = PICKER_CONFIG.some((c) => c.id === inp.id);
    if (!inCfg) inp.value = inp.defaultValue || "";
  });

  // HCO3 visibility based on BMP checkbox default
  const _useBmp = document.getElementById("use-bmp-hco3");
  if (_useBmp) {
    const hco3Input = el("hco3");
    const hco3Picker = el("hco3-picker");
    const cfg = PICKER_CONFIG.find((c) => c.id === "hco3");
    if (_useBmp.checked) {
      if (hco3Input) {
        hco3Input.style.display = "none";
        hco3Input.value = "";
        hco3Input.disabled = true;
      }
      if (hco3Picker) {
        hco3Picker.style.display = "inline-block";
        if (cfg) populatePicker(cfg);
      }
    } else {
      if (hco3Input) {
        hco3Input.style.display = "inline-block";
        hco3Input.disabled = false;
        hco3Input.placeholder = "auto";
      }
      if (hco3Picker) hco3Picker.style.display = "none";
    }
  }

  // Clear computed results and recompute
  document.querySelectorAll("dd").forEach((d) => (d.textContent = "\u2014"));
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
  // capture the previous unit before the user changes it so we can convert
  // the displayed picker value correctly from the old unit to the new one.
  s.addEventListener("focus", () => { s.dataset.prev = s.value; });
  s.addEventListener("mousedown", () => { s.dataset.prev = s.value; });

  s.addEventListener("change", () => {
    const ion = s.id.replace("-unit", "");
    const cfg = PICKER_CONFIG.find((c) => c.id === ion);
    const prev = s.dataset.prev || null;
    if (cfg) populatePicker(cfg, prev);
    // update stored prev unit to the new value
    s.dataset.prev = s.value;
    computeAll();
  });
});

// HCO3: toggle between numeric input and picker when the BMP checkbox is used
const _useBmp = document.getElementById("use-bmp-hco3");
if (_useBmp) {
  const toggleHco3 = () => {
    const hco3Input = el("hco3");
    const hco3Picker = el("hco3-picker");
    const cfg = PICKER_CONFIG.find((c) => c.id === "hco3");
    if (_useBmp.checked) {
      if (hco3Input) {
        hco3Input.style.display = "none";
        hco3Input.value = "";
        hco3Input.disabled = true;
      }
      if (hco3Picker) {
        hco3Picker.style.display = "inline-block";
        if (cfg) populatePicker(cfg);
      }
    } else {
      if (hco3Input) {
        hco3Input.style.display = "inline-block";
        hco3Input.disabled = false;
      }
      if (hco3Picker) {
        hco3Picker.style.display = "none";
      }
    }
  };
  _useBmp.addEventListener("change", () => { toggleHco3(); computeAll(); });
  // initialize
  toggleHco3();
}

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
