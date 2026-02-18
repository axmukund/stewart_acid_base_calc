/**
 * compute.js — Main calculation loop (Stewart core).
 *
 * `computeAll()` is the single entry-point called on every input
 * change.  It reads all inputs, runs the Stewart acid-base
 * calculations, writes the results panel and mobile header, and
 * delegates visualisation to `renderGamblegram()`.
 *
 * Depends on: helpers.js, units.js, physiology.js, gamblegram.js
 */

"use strict";

/**
 * Read every input, run the Stewart calculations, update the results
 * panel / mobile-header summary, and re-render the Gamblegram.
 *
 * Called on every input change (debounced via events.js), on reset,
 * and on window resize.
 */
function computeAll() {

  /* ── Read inputs (all converted to mmol/L) ── */
  const Na   = getIonSI("na");
  const K    = getIonSI("k");
  const iCa  = getIonSI("ica");
  const Mg   = getIonSI("mg");
  const Cl   = getIonSI("cl");
  const Lac  = getIonSI("lac");
  const Alb  = parse("alb");           // albumin — g/dL
  const Phos = getIonSI("phos");
  const pH   = parse("ph");
  const pCO2 = parse("pco2");

  /* ── HCO₃ handling ──
   *    By default HCO₃ is derived from the blood-gas (Henderson–
   *    Hasselbalch).  If the user checks "use BMP HCO₃" the field
   *    becomes editable and that value is used instead.            */
  const hco3FromGas =
    Number.isFinite(pH) && Number.isFinite(pCO2)
      ? hco3FromPHandPco2(pH, pCO2) : NaN;

  const hco3El = el("hco3");
  const useBmp =
    document.getElementById("use-bmp-hco3") &&
    document.getElementById("use-bmp-hco3").checked;

  if (hco3El) {
    if (useBmp) {
      hco3El.disabled = false;
    } else {
      hco3El.disabled = true;
      hco3El.value = Number.isFinite(hco3FromGas)
        ? hco3FromGas.toFixed(2) : "";
    }
  }

  let HCO3 = parse("hco3");
  if (!Number.isFinite(HCO3) && Number.isFinite(hco3FromGas)) {
    HCO3 = hco3FromGas;
  }

  /* ── Stewart core (all in mEq/L — divalent cations carry 2× charge) ── */
  const sidA =
    (Na || 0) + (K || 0) + 2 * (iCa || 0) + 2 * (Mg || 0)
    - (Cl || 0) - (Lac || 0);

  // Albumin: g/dL → g/L for the Figge model
  const Alb_gL   = Number.isFinite(Alb) ? Alb * 10 : NaN;
  const albMinus = Number.isFinite(Alb_gL) && Number.isFinite(pH)
    ? albuminCharge(Alb_gL, pH) : 0;
  const piMinus  = Number.isFinite(Phos) && Number.isFinite(pH)
    ? phosphateCharge(Phos, pH) : 0;

  const sidE = (HCO3 || 0) + albMinus + piMinus;
  const sig  = sidA - sidE;
  const ag   = (Na || 0) + (K || 0) - ((Cl || 0) + (HCO3 || 0));

  // Round to one decimal for display
  const sidAR = Math.round(sidA * 10) / 10;
  const sidER = Math.round(sidE * 10) / 10;
  const sigR  = Math.round(sig  * 10) / 10;

  /* ── Write results panel ── */
  el("res-sida").textContent = sidAR.toFixed(1) + " mEq/L";
  el("res-side").textContent = sidER.toFixed(1) + " mEq/L";
  el("res-sig").textContent  = sigR.toFixed(1)  + " mEq/L";
  el("res-ag").textContent   = ag.toFixed(2)    + " mEq/L";

  /* ── Mobile header ── */
  const mhSida = el("mh-sida");
  const mhSide = el("mh-side");
  const mhSig  = el("mh-sig");
  if (mhSida) mhSida.textContent = sidAR.toFixed(1) + " mEq/L";
  if (mhSide) mhSide.textContent = sidER.toFixed(1) + " mEq/L";
  if (mhSig)  mhSig.textContent  = sigR.toFixed(1)  + " mEq/L";

  /* ── Extra result rows (if present) ── */
  const albEl  = el("res-alb");
  const piEl   = el("res-pi");
  const atotEl = el("res-atot");
  if (albEl)  albEl.textContent  = albMinus.toFixed(3) + " mEq/L (A⁻)";
  if (piEl)   piEl.textContent   = piMinus.toFixed(3)  + " mEq/L (Pi⁻)";
  if (atotEl) atotEl.textContent =
    ((0.123 * (Number.isFinite(Alb_gL) ? Alb_gL : 0)) +
     (0.309 * (Phos || 0))).toFixed(3) + " mmol/L (Atot)";

  /* ── Gamblegram HCO₃ choice ── */
  const bmpVal = parse("hco3");
  const ggHCO3 =
    (useBmp && Number.isFinite(bmpVal)) ? bmpVal
    : Number.isFinite(hco3FromGas)      ? hco3FromGas
    :                                     (HCO3 || 0);

  /* ── Render Gamblegram (values in mEq/L = charge equivalents) ── */
  renderGamblegram({
    Na, K,
    iCa: 2 * (iCa || 0),                            // divalent → 2 mEq/mmol
    Mg_mmol: 2 * (Number.isFinite(Mg) ? Mg : 0),    // divalent → 2 mEq/mmol
    Cl, Lac,
    HCO3: ggHCO3,
    albMinus, piMinus,
    sig: sigR,
  });
}
