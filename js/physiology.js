/**
 * physiology.js — Pure physiology / chemistry calculation functions.
 *
 * No DOM access — these are pure functions of their numeric arguments.
 *
 * Contents:
 *   1. hco3FromPHandPco2()  — Henderson–Hasselbalch
 *   2. albuminCharge()      — Full Figge–Fencl v3.0 multi-proton albumin model
 *   3. phosphateCharge()    — Triprotic phosphate equilibrium
 *
 * References:
 *   [1] Figge J, Mydosh T, Fencl V. "Serum proteins and acid-base
 *       equilibria: a follow-up." J Lab Clin Med. 1992;120(5):713-719.
 *   [2] Figge J. figge-fencl.org model v3.0 (2003–2013), archived at
 *       web.archive.org/web/20160327122156/http://figge-fencl.org/model.html
 *   [3] Sendroy J Jr, Hastings AB. "Studies of the solubility of
 *       calcium salts. III." J Biol Chem. 1927;71:797-823.
 *       (Phosphoric acid apparent dissociation constants for plasma, 37 °C)
 *   [4] Henderson–Hasselbalch equation; pKa(CO₂/HCO₃⁻) = 6.1,
 *       CO₂ solubility coefficient α = 0.0307 mmol/L/mmHg at 37 °C.
 */

"use strict";

/* ─────────────────────────────────────────────────────────────────────
 *  Henderson–Hasselbalch
 * ───────────────────────────────────────────────────────────────────── */

/**
 * Derive [HCO₃⁻] from pH and pCO₂ via the Henderson–Hasselbalch
 * equation.
 *
 *   [HCO₃⁻] = α · pCO₂ · 10^(pH − pKa)
 *
 * where α = 0.03 mmol/L/mmHg and pKa = 6.1 at 37 °C.
 *
 * @param {number} pH   Arterial pH
 * @param {number} pCO2 Arterial pCO₂ in mmHg
 * @returns {number}    [HCO₃⁻] in mmol/L
 */
function hco3FromPHandPco2(pH, pCO2) {
  return 0.03 * pCO2 * Math.pow(10, pH - 6.1);
}

/* ─────────────────────────────────────────────────────────────────────
 *  Figge–Fencl v3.0 albumin charge model
 * ───────────────────────────────────────────────────────────────────── */

/**
 * Full Figge–Fencl v3.0 albumin charge model.
 *
 * Treats human serum albumin (MW = 66 500 Da) as a macro-ion with
 * individual pKa values for every ionisable amino-acid residue,
 * fitted to potentiometric titration data.  Histidine pKa values
 * (His 1–13) were determined by ¹H-NMR spectroscopy; His 14–16
 * were assigned or optimised.
 *
 * Residue inventory per albumin molecule:
 *   Basic (+)  : 16 His (individual pKa), 59 Lys (7 sub-groups),
 *                24 Arg (pKa 12.5), 1 α-NH₂ (pKa 8.0)
 *   Acidic (−) : 98 Asp+Glu (pKa 3.9), 1 α-COOH (pKa 3.1),
 *                1 Cys (pKa 8.5), 18 Tyr (pKa 11.7)
 *
 * The N→B conformational transition (Figge v3.0) shifts the pKa
 * of 5 domain-1 histidines down by up to 0.4 pH units as the
 * protein transitions from the N-form to the B-form above pH ≈ 6.9.
 *
 * At pH 7.40, Alb 4.0 g/dL (40 g/L) → A⁻ ≈ 11.2 mEq/L.
 *
 * @param {number} albGperL  Albumin concentration in g/L
 * @param {number} pH        Arterial pH
 * @returns {number}         A⁻ in mEq/L (positive = net negative charge)
 */
function albuminCharge(albGperL, pH) {
  const albMM = albGperL / 66.5; // g/L → mmol/L

  /* ── N→B conformational transition (affects domain-1 His 1–5) ── */
  const NB = 0.4 * (1 - 1 / (1 + Math.pow(10, pH - 6.9)));

  /* ── 16 histidine residues — individual pKa at 37 °C ──
   *    His 1–5 : domain 1 — pKa shifted down by NB
   *    His 6–16: remaining domains — no shift                    */
  const HIS_NB = [7.12, 7.22, 7.10, 7.49, 7.01];
  const HIS_STD = [
    7.31, 6.75, 6.36, 4.85, 5.76, // His 6–10  (NMR)
    6.17, 6.73, 5.82,             // His 11–13 (NMR)
    5.10, 6.70, 6.20,             // His 14–16 (fit / assigned)
  ];

  let his = 0;
  for (let i = 0; i < HIS_NB.length; i++)
    his += 1 / (1 + Math.pow(10, pH - (HIS_NB[i] - NB)));
  for (let i = 0; i < HIS_STD.length; i++)
    his += 1 / (1 + Math.pow(10, pH - HIS_STD[i]));

  /* ── 59 lysine residues — 7 sub-groups ──
   *    9 "low-titrating" Lys in 5 anomalous groups (buried / shifted),
   *    plus 50 normal Lys with textbook pKa ≈ 10.3                    */
  const lys =
      2 / (1 + Math.pow(10, pH - 5.800))   // group N1 (2 residues)
    + 2 / (1 + Math.pow(10, pH - 6.150))   // group N2 (2 residues)
    + 2 / (1 + Math.pow(10, pH - 7.510))   // group N3 (2 residues)
    + 2 / (1 + Math.pow(10, pH - 7.685))   // group N4 (2 residues)
    + 1 / (1 + Math.pow(10, pH - 7.860))   // group N5 (1 residue)
   + 50 / (1 + Math.pow(10, pH - 10.30));  // group N7 (50 normal)

  /* ── Other basic groups ── */
  const arg = 24 / (1 + Math.pow(10, pH - 12.5)); // 24 arginine
  const nh2 =  1 / (1 + Math.pow(10, pH - 8.0));  // α-amino terminus

  /* ── Acidic groups (contribute negative charge when deprotonated) ── */
  const acooh  =  -1 / (1 + Math.pow(10, 3.1 - pH));  // α-COOH
  const aspGlu = -98 / (1 + Math.pow(10, 3.9 - pH));  // 36 Asp + 62 Glu
  const cys    =  -1 / (1 + Math.pow(10, 8.5 - pH));  // Cys-34 free thiol
  const tyr    = -18 / (1 + Math.pow(10, 11.7 - pH)); // 18 tyrosine

  /* ── Net charge per mol → mEq/L ── */
  const netPerMol = his + lys + arg + nh2 + acooh + aspGlu + cys + tyr;
  return -albMM * netPerMol; // positive = mEq/L of net anionic charge
}

/* ─────────────────────────────────────────────────────────────────────
 *  Triprotic phosphate equilibrium
 * ───────────────────────────────────────────────────────────────────── */

/**
 * Average negative charge per mmol of total inorganic phosphate,
 * computed from the full triprotic equilibrium:
 *
 *   H₃PO₄  ⇌  H₂PO₄⁻  ⇌  HPO₄²⁻  ⇌  PO₄³⁻
 *
 * pKa values (apparent, plasma 37 °C) from Sendroy & Hastings (1927):
 *   pKa₁ = 1.915    pKa₂ = 6.66    pKa₃ = 11.78
 *
 * At pH 7.40, Phos 1.0 mmol/L → Pi⁻ ≈ 1.85 mEq/L.
 *
 * @param {number} phos  Total phosphate in mmol/L
 * @param {number} pH    Arterial pH
 * @returns {number}     Pi⁻ in mEq/L
 */
function phosphateCharge(phos, pH) {
  const K1 = Math.pow(10, -1.915);
  const K2 = Math.pow(10, -6.66);
  const K3 = Math.pow(10, -11.78);
  const H  = Math.pow(10, -pH);

  const d = H * H * H + K1 * H * H + K1 * K2 * H + K1 * K2 * K3;
  const z = (K1 * H * H + 2 * K1 * K2 * H + 3 * K1 * K2 * K3) / d;
  return phos * z;
}
