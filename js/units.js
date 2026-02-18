/**
 * units.js — Unit-conversion constants and helper functions.
 *
 * Converts between SI (mmol/L) and conventional (mg/dL) units for
 * ions that support dual-unit display (Mg, iCa, Lactate, Phosphate).
 *
 * Each conversion factor = 10 / MW, which converts mg/dL → mmol/L:
 *   mmol/L = (mg/dL) × (10 / MW)
 *
 * Depends on: helpers.js (parse)
 */

"use strict";

/* ─────────────────────────────────────────────────────────────────────
 *  Conversion factors  (mg/dL → mmol/L)
 * ───────────────────────────────────────────────────────────────────── */

/** Mg²⁺ : MW = 24.305 g/mol */
const MG_FACTOR  = 10 / 24.305;

/** iCa²⁺ : MW = 40.08 g/mol */
const CA_FACTOR  = 10 / 40.08;

/** Lactate⁻ : MW = 89.07 g/mol (C₃H₅O₃⁻) */
const LAC_FACTOR = 10 / 89.07;

/** Phosphate (as P) : MW = 30.97 g/mol */
const PO4_FACTOR = 10 / 30.97;

/* ─────────────────────────────────────────────────────────────────────
 *  Conversion helpers
 * ───────────────────────────────────────────────────────────────────── */

/**
 * Read an ion input and return its value in SI (mmol/L).
 *
 * Looks at the adjacent `<select class="unit-select">` to decide
 * whether the raw value needs conversion from mg/dL.
 *
 * @param {string} id  Element ID (e.g. "mg", "ica", "lac", "phos")
 * @returns {number}   Value in mmol/L, or `NaN` when the field is empty.
 */
function getIonSI(id) {
  const raw = parse(id);
  if (!Number.isFinite(raw)) return NaN;
  const unitEl = document.getElementById(id + "-unit");
  const unit   = unitEl ? unitEl.value : "si";
  if (unit === "mgdl") {
    switch (id) {
      case "mg":   return raw * MG_FACTOR;
      case "ica":  return raw * CA_FACTOR;
      case "lac":  return raw * LAC_FACTOR;
      case "phos": return raw * PO4_FACTOR;
    }
  }
  return raw; // already mmol/L (or mEq/L ≡ mmol/L for monovalent Na/K/Cl)
}

/**
 * Convert a displayed value → SI (mmol/L).
 *
 * Used when the unit selector changes to compute the SI intermediate
 * before re-displaying in the new unit.
 *
 * @param {string} id     Ion ID
 * @param {number} value  The number currently shown to the user
 * @param {string} unit   "si" or "mgdl"
 * @returns {number}      Value in mmol/L
 */
function displayToSI(id, value, unit) {
  if (!Number.isFinite(value)) return NaN;
  if (unit === "mgdl") {
    switch (id) {
      case "mg":   return value * MG_FACTOR;
      case "ica":  return value * CA_FACTOR;
      case "lac":  return value * LAC_FACTOR;
      case "phos": return value * PO4_FACTOR;
    }
  }
  return value;
}

/**
 * Convert from SI (mmol/L) → display unit.
 * Inverse of `displayToSI`.
 */
function siToDisplay(id, si, unit) {
  if (!Number.isFinite(si)) return NaN;
  if (unit === "mgdl") {
    switch (id) {
      case "mg":   return si / MG_FACTOR;
      case "ica":  return si / CA_FACTOR;
      case "lac":  return si / LAC_FACTOR;
      case "phos": return si / PO4_FACTOR;
    }
  }
  return si;
}
