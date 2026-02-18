/**
 * helpers.js — DOM utilities shared across all modules.
 *
 * Provides `el()` for element lookup and `parse()` for reading
 * numeric values from both `<input>` and `<select class="picker">`
 * elements.  Every other JS file depends on these two functions.
 */

"use strict";

/** Get a DOM element by its `id` attribute. */
const el = (id) => document.getElementById(id);

/**
 * Parse the numeric value of an `<input>` or `<select class="picker">`.
 *
 * Falls back to `id + '-picker'` when the plain `<input>` doesn't
 * exist (ion inputs were replaced by native `<select>` pickers).
 *
 * @param   {string} id  Element ID (e.g. "na", "ph", "hco3")
 * @returns {number}     Parsed float, or `NaN` when the field is empty
 *                       (NaN — not 0 — so callers can distinguish "blank" from "zero").
 */
function parse(id) {
  const node = el(id) || el(id + "-picker");
  if (!node) return NaN;
  const v = parseFloat(node.value);
  return Number.isFinite(v) ? v : NaN;
}
