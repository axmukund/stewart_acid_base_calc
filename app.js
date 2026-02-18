/**
 * Stewart / Figge — Acid-Base Calculator  (static SPA, no dependencies)
 *
 * Implements the Stewart physicochemical approach to acid-base balance
 * using Figge / Fencl approximations for weak-acid charges.
 *
 * Core equations
 * ──────────────
 *   SIDa  = [Na⁺] + [K⁺] + [iCa²⁺] + [Mg²⁺] − [Cl⁻] − [Lactate⁻]
 *   A⁻    ≈ 0.123 × Alb(g/L) / (1 + 10^(7.08 − pH))
 *   Pi⁻   ≈ 0.309 × Phos(mmol/L) / (1 + 10^(6.8  − pH))
 *   Atot  = 0.123 × Alb(g/L) + 0.309 × Phos(mmol/L)
 *   SIDe  = [HCO₃⁻] + A⁻ + Pi⁻
 *   SIG   = SIDa − SIDe
 *   HCO₃⁻ ≈ 0.03 × pCO₂ × 10^(pH − 6.1)       (Henderson–Hasselbalch)
 *
 * DISCLAIMER  Approximations for demonstration only — NOT validated
 *             for clinical decision-making.
 *
 * @file   app.js
 */

"use strict";

/* =====================================================================
 * §1  DOM helpers
 * ===================================================================== */

/** Get a DOM element by its `id` attribute. */
const el = (id) => document.getElementById(id);

/**
 * Parse the numeric value of an `<input>` field.
 * Returns `NaN` (not 0) when the field is empty so callers can
 * distinguish "nothing entered" from a genuine zero.
 */
function parse(id) {
  const v = parseFloat(el(id).value);
  return Number.isFinite(v) ? v : NaN;
}

/* =====================================================================
 * §2  Physiology formulas
 * ===================================================================== */

/**
 * Henderson–Hasselbalch: derive [HCO₃⁻] from pH and pCO₂.
 *   pKa(CO₂/HCO₃) = 6.1,  solubility coefficient α = 0.03
 */
function hco3FromPHandPco2(pH, pCO2) {
  return 0.03 * pCO2 * Math.pow(10, pH - 6.1);
}

/**
 * Figge / Fencl approximation — albumin charge (A⁻).
 * @param {number} albGperL  Albumin in g/L
 * @param {number} pH        Arterial pH
 * @returns {number}         A⁻ in mmol/L
 */
function albuminCharge(albGperL, pH) {
  return 0.123 * albGperL / (1 + Math.pow(10, 7.08 - pH));
}

/**
 * Figge / Fencl approximation — phosphate charge (Pi⁻).
 * @param {number} phos  Phosphate in mmol/L
 * @param {number} pH    Arterial pH
 * @returns {number}     Pi⁻ in mmol/L
 */
function phosphateCharge(phos, pH) {
  return 0.309 * phos / (1 + Math.pow(10, 6.8 - pH));
}

/* =====================================================================
 * §3  Unit-conversion constants
 *
 * Each constant converts  mg/dL  →  mmol/L  by dividing by the
 * molecular weight and multiplying by 10 (dL→L).
 *   factor = 10 / MW
 *
 * BUG FIX:  The old code used inconsistent magic numbers for several
 *           ions (e.g. Lactate used 9.008 in one direction and 8.907
 *           in the other).  Now every conversion uses a single named
 *           constant derived from the correct molecular weight.
 * ===================================================================== */

/** Mg: MW = 24.305 → 10/24.305 ≈ 0.4114 */
const MG_FACTOR  = 10 / 24.305;
/** iCa: MW = 40.08 → 10/40.08 ≈ 0.2495 */
const CA_FACTOR  = 10 / 40.08;
/** Lactate: MW = 89.07 → 10/89.07 ≈ 0.1123 */
const LAC_FACTOR = 10 / 89.07;
/** Phosphate (as P): MW = 30.97 → 10/30.97 ≈ 0.3229 */
const PO4_FACTOR = 10 / 30.97;

/* =====================================================================
 * §4  Unit-conversion helpers
 * ===================================================================== */

/**
 * Convert an input value to SI (mmol/L) using the adjacent unit-select.
 * @param {string} id  Element ID of the `<input>` (e.g. "mg", "ica")
 * @returns {number}   mmol/L, or NaN when the field is empty
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
  return raw;  // already mmol/L (or mEq/L, which equals mmol/L for Na/K/Cl)
}

/**
 * Convert from displayed value → SI (mmol/L).
 * Used during unit-selector change to obtain the SI intermediate.
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

/* =====================================================================
 * §5  computeAll()  — main calculation loop
 * ===================================================================== */

/**
 * Read every input, run the Stewart calculations, update the results
 * panel, the mobile-header summary, and the Gamblegram.
 * Called on every input change (debounced) and on reset.
 */
function computeAll() {

  /* ── read inputs (all converted to mmol/L) ── */
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

  /* ── HCO₃ handling ── */
  const hco3FromGas =
    Number.isFinite(pH) && Number.isFinite(pCO2)
      ? hco3FromPHandPco2(pH, pCO2) : NaN;

  const hco3El = el("hco3");
  const useBmp =
    document.getElementById("use-bmp-hco3") &&
    document.getElementById("use-bmp-hco3").checked;

  if (hco3El) {
    if (useBmp) {
      hco3El.disabled = false;   // let user type a measured BMP HCO₃
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

  /* ── Stewart core ── */
  const sidA =
    (Na || 0) + (K || 0) + (iCa || 0) + (Mg || 0)
    - (Cl || 0) - (Lac || 0);

  // Albumin: g/dL → g/L for Figge formulas
  const Alb_gL   = Number.isFinite(Alb) ? Alb * 10 : NaN;
  const albMinus = Number.isFinite(Alb_gL) && Number.isFinite(pH)
    ? albuminCharge(Alb_gL, pH) : 0;
  const piMinus  = Number.isFinite(Phos)   && Number.isFinite(pH)
    ? phosphateCharge(Phos, pH) : 0;

  const sidE = (HCO3 || 0) + albMinus + piMinus;
  const sig  = sidA - sidE;
  const ag   = (Na || 0) + (K || 0) - ((Cl || 0) + (HCO3 || 0));

  // round SIDa / SIDe / SIG to one decimal
  const sidAR = Math.round(sidA * 10) / 10;
  const sidER = Math.round(sidE * 10) / 10;
  const sigR  = Math.round(sig  * 10) / 10;

  /* ── write results panel ── */
  const showNonSI =
    document.getElementById("show-non-si") &&
    document.getElementById("show-non-si").checked;
  const suffix = (v) =>
    showNonSI ? " (" + v.toFixed(1) + " mEq/L)" : "";

  el("res-sida").textContent = sidAR.toFixed(1) + " mmol/L" + suffix(sidAR);
  el("res-side").textContent = sidER.toFixed(1) + " mmol/L" + suffix(sidER);
  el("res-sig").textContent  = sigR.toFixed(1)  + " mmol/L" + suffix(sigR);
  el("res-ag").textContent   = ag.toFixed(2)    + " mmol/L" + suffix(ag);

  /* ── mobile header ── */
  const mhSida = el("mh-sida");
  const mhSide = el("mh-side");
  const mhSig  = el("mh-sig");
  if (mhSida) mhSida.textContent = sidAR.toFixed(1) + " mmol/L";
  if (mhSide) mhSide.textContent = sidER.toFixed(1) + " mmol/L";
  if (mhSig)  mhSig.textContent  = sigR.toFixed(1)  + " mmol/L";

  /* ── extra result rows (if present) ── */
  const albEl  = el("res-alb");
  const piEl   = el("res-pi");
  const atotEl = el("res-atot");
  if (albEl)  albEl.textContent  = albMinus.toFixed(3) + " mmol/L (A⁻)";
  if (piEl)   piEl.textContent   = piMinus.toFixed(3)  + " mmol/L (Pi⁻)";
  if (atotEl) atotEl.textContent =
    ((0.123 * (Number.isFinite(Alb_gL) ? Alb_gL : 0)) +
     (0.309 * (Phos || 0))).toFixed(3) + " mmol/L (Atot)";

  /* ── Gamblegram HCO₃ choice ── */
  const bmpVal = parse("hco3");
  const ggHCO3 =
    (useBmp && Number.isFinite(bmpVal)) ? bmpVal
    : Number.isFinite(hco3FromGas)      ? hco3FromGas
    :                                     (HCO3 || 0);

  /* ── render ── */
  renderGamblegram({
    Na, K, iCa,
    Mg_mmol: Number.isFinite(Mg) ? Mg : 0,
    Cl, Lac,
    HCO3: ggHCO3,
    albMinus, piMinus,
    sig: sigR,
  });
}

/* =====================================================================
 * §6  renderGamblegram()
 *
 * Builds two stacked-bar SVG columns — cations (left) vs anions
 * (right) — with easeOutCubic animation between states.
 * ===================================================================== */

function renderGamblegram(vals) {
  const svg       = document.getElementById("gg-svg");
  const legend    = document.getElementById("gg-legend");
  const unknownEl = document.getElementById("gg-unknown");
  if (!svg || !legend || !unknownEl) return;

  /* ── snapshot previous bar positions (for animation) ── */
  const prevRects = {};
  svg.querySelectorAll("rect.gg-rect").forEach((r) => {
    const k = r.dataset.key;
    if (k) prevRects[k] = {
      y: parseFloat(r.getAttribute("y")) || 0,
      h: parseFloat(r.getAttribute("height")) || 0,
    };
  });

  /* ── label lookup tables ── */
  const SVG_LABELS = {
    Na:"Na\u207A", K:"K\u207A", iCa:"iCa\u00B2\u207A", Mg:"Mg\u00B2\u207A",
    Cl:"Cl\u207B", Lactate:"Lactate\u207B",
    HCO3:"HCO\u2083\u207B", "A-":"A\u207B", "Pi-":"Pi\u207B",
    Unknown:"Unknown",
  };
  const HTML_LABELS = {
    Na:'Na<sup>+</sup>', K:'K<sup>+</sup>',
    iCa:'iCa<sup>2+</sup>', Mg:'Mg<sup>2+</sup>',
    Cl:'Cl<sup>\u2212</sup>', Lactate:'Lactate<sup>\u2212</sup>',
    HCO3:'HCO<sub>3</sub><sup>\u2212</sup>',
    "A-":'A<sup>\u2212</sup>', "Pi-":'Pi<sup>\u2212</sup>',
    Unknown:"Unknown",
  };
  const svgLabel  = (k) => SVG_LABELS[k] || k;
  const htmlLabel = (k) => HTML_LABELS[k] || k;

  /* ── unpack values ── */
  const Na       = vals.Na       || 0;
  const K        = vals.K        || 0;
  const iCa      = vals.iCa      || 0;
  const Mg_mmol  = vals.Mg_mmol  || 0;
  const Cl       = vals.Cl       || 0;
  const Lac      = vals.Lac      || 0;
  const HCO3     = vals.HCO3     || 0;
  const albMinus = vals.albMinus || 0;
  const piMinus  = vals.piMinus  || 0;
  const sig      = vals.sig      || 0;

  /** Tooltip non-SI helper — returns a string or null. */
  const toNonSI = (k, v) => {
    if (!Number.isFinite(v)) return null;
    switch (k) {
      case "Mg":      return (v / MG_FACTOR).toFixed(2)  + " mg/dL";
      case "iCa":     return (v / CA_FACTOR).toFixed(2)  + " mg/dL";
      case "Pi-":     return (v / PO4_FACTOR).toFixed(2) + " mg/dL";
      case "Lactate": return (v / LAC_FACTOR).toFixed(2) + " mg/dL";
      case "Na": case "K": case "Cl": case "HCO3":
        return v.toFixed(2) + " mEq/L";
      default: return null;
    }
  };

  /* ── cation / anion stacks ── */
  let cations = [
    { k:"Na",  v:Na,      c:"#BFE7FF" },
    { k:"K",   v:K,       c:"#FFE9C9" },
    { k:"iCa", v:iCa,     c:"#DFF7ED" },
    { k:"Mg",  v:Mg_mmol, c:"#E8E9FF" },
  ];
  let anions = [
    { k:"Cl",      v:Cl,       c:"#FFD8DA" },
    { k:"Lactate", v:Lac,      c:"#FFF6D6" },
    { k:"HCO3",    v:HCO3,     c:"#E9FFEA" },
    { k:"A-",      v:albMinus, c:"#F0EAFF" },
    { k:"Pi-",     v:piMinus,  c:"#FFF9DE" },
  ];

  // SIG → "Unknown" segment, placed at top of the appropriate stack
  const UNKNOWN_CLR = "#A78BFA";
  if (sig >  0.0001) anions.push({  k:"Unknown", v:sig,           c:UNKNOWN_CLR });
  if (sig < -0.0001) cations.push({ k:"Unknown", v:Math.abs(sig), c:UNKNOWN_CLR });

  // Sort large → small; keep "Unknown" at top (end of array → drawn last)
  const lift = (arr) => {
    const known   = arr.filter((x) => x.k !== "Unknown").sort((a, b) => (b.v||0) - (a.v||0));
    const unknown = arr.filter((x) => x.k === "Unknown");
    return known.concat(unknown);
  };
  cations = lift(cations);
  anions  = lift(anions);

  /* ── responsive geometry ── */
  const container = document.querySelector(".container");
  const pad = container
    ? parseInt(getComputedStyle(container).paddingLeft, 10) || 22 : 22;
  const W      = container ? Math.max(300, container.clientWidth - pad * 2) : 480;
  const H      = Math.round(W * 0.86);
  const padTop = Math.max(20, Math.round(W * 0.06));
  const barW   = Math.round(Math.max(40, W * 0.30));
  const gap    = Math.max(8, Math.round(W * 0.02));
  const barsW  = 2 * barW + gap;
  const leftX  = Math.round((W - barsW) / 2);
  const rightX = leftX + barW + gap;
  const fSize  = Math.max(10, Math.round(W * 0.028));
  const baseY  = padTop + H;

  const sum      = (a) => a.reduce((s, x) => s + (x.v || 0), 0);
  const totalC   = sum(cations);
  const totalA   = sum(anions);
  const maxStack = Math.max(totalC, totalA, 1);

  /* ── reset SVG (preserve <title> / <desc>) ── */
  const titleTag = svg.querySelector("title");
  const descTag  = svg.querySelector("desc");
  svg.innerHTML =
    (titleTag ? titleTag.outerHTML : "") +
    (descTag  ? descTag.outerHTML  : "");
  svg.setAttribute("viewBox", "0 0 " + W + " " + (H + padTop + 40));
  svg.style.width  = "100%";
  svg.style.height = "auto";

  /* ── target heights / positions ── */
  let y = baseY;
  const cT = cations.map((item) => {
    const h = Math.max(10, (item.v / maxStack) * H);
    y -= h;
    return { item, ty: y, th: h };
  });
  y = baseY;
  const aT = anions.map((item) => {
    const h = Math.max(10, (item.v / maxStack) * H);
    y -= h;
    return { item, ty: y, th: h };
  });

  /* ── create rect + label pairs ── */
  const NS = "http://www.w3.org/2000/svg";
  const anim = [];

  function addSeg(t, x, lx, anchor) {
    const item = t.item;
    const prev = prevRects[item.k];
    const sH   = prev ? Math.max(4, prev.h) : 8;
    const sY   = prev ? prev.y : baseY - sH;

    const rect = document.createElementNS(NS, "rect");
    rect.setAttribute("class", "gg-rect");
    rect.setAttribute("x",      x);
    rect.setAttribute("y",      sY);
    rect.setAttribute("width",  barW);
    rect.setAttribute("height", sH);
    rect.setAttribute("rx",     8);
    rect.setAttribute("fill",   item.c);
    rect.setAttribute("opacity","0.95");
    rect.setAttribute("tabindex","0");
    rect.dataset.key = item.k;
    rect.dataset.val = (item.v || 0).toFixed(2);
    svg.appendChild(rect);

    const text = document.createElementNS(NS, "text");
    text.classList.add("gg-name");
    text.setAttribute("x",                lx);
    text.setAttribute("y",                sY + sH / 2);
    text.setAttribute("dominant-baseline","middle");
    text.setAttribute("text-anchor",      anchor);
    text.setAttribute("font-size",        fSize);
    text.textContent = svgLabel(item.k) + " " + item.v.toFixed(2);
    svg.appendChild(text);

    anim.push({ rect, text, sY, sH, ty: t.ty, th: t.th });
  }

  cT.forEach((t) => addSeg(t, leftX,  leftX - 12,         "end"));
  aT.forEach((t) => addSeg(t, rightX, rightX + barW + 12, "start"));

  // centered SID label
  const rawDiff = totalC - totalA;
  const diff    = Math.abs(rawDiff) < 0.05 ? 0 : rawDiff;
  const sidLbl  = document.createElementNS(NS, "text");
  sidLbl.classList.add("gg-name");
  sidLbl.setAttribute("x",                W / 2);
  sidLbl.setAttribute("y",                padTop + 18);
  sidLbl.setAttribute("dominant-baseline","middle");
  sidLbl.setAttribute("text-anchor",      "middle");
  sidLbl.setAttribute("font-size",        fSize);
  sidLbl.textContent = "SID: " + diff.toFixed(1) + " mmol/L";
  svg.appendChild(sidLbl);

  /* ── unknown label under chart ── */
  if (sig >  0.0001) unknownEl.textContent = "Unknown anions: "  + sig.toFixed(1)           + " mmol/L";
  else if (sig < -0.0001) unknownEl.textContent = "Unknown cations: " + Math.abs(sig).toFixed(1) + " mmol/L";
  else unknownEl.textContent = "Unknown: none";

  /* ── legend ── */
  const seen = new Set();
  const items = anions.concat(cations).filter((x) => {
    if (seen.has(x.k)) return false;
    seen.add(x.k); return true;
  });
  legend.innerHTML = items.map((it) =>
    '<div class="item"><span class="swatch" style="background:' + it.c +
    '"></span><span>' + htmlLabel(it.k) + " \u2014 " +
    it.v.toFixed(2) + " mmol/L</span></div>"
  ).join("");

  /* ── tooltips ── */
  const tooltip = document.getElementById("gg-tooltip");
  if (tooltip) {
    svg.querySelectorAll("rect.gg-rect").forEach((rect) => {
      rect.addEventListener("mouseenter", (e) => showTT(rect, e.clientX, e.clientY));
      rect.addEventListener("mousemove",  (e) => showTT(rect, e.clientX, e.clientY));
      rect.addEventListener("mouseleave", hideTT);
      rect.addEventListener("focus", () => {
        const b = rect.getBoundingClientRect();
        showTT(rect, b.left + 8, b.top);
      });
      rect.addEventListener("blur", hideTT);
      rect.addEventListener("touchstart", (e) => {
        showTT(rect, e.touches[0].clientX, e.touches[0].clientY);
        e.preventDefault();
      });
    });
  }

  /* ── easeOutCubic bar animation ── */
  const DUR = 360;
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  if (window._ggAF) cancelAnimationFrame(window._ggAF);
  const t0 = performance.now();

  function tick(now) {
    const p = Math.min(1, (now - t0) / DUR);
    const e = ease(p);
    anim.forEach((a) => {
      const cy = a.sY + (a.ty - a.sY) * e;
      const ch = a.sH + (a.th - a.sH) * e;
      a.rect.setAttribute("y",      cy);
      a.rect.setAttribute("height", Math.max(1, ch));
      a.text.setAttribute("y",      cy + ch / 2);
    });
    if (p < 1) window._ggAF = requestAnimationFrame(tick);
    else       window._ggAF = null;
  }
  window._ggAF = requestAnimationFrame(tick);

  /* ── tooltip helpers (closure over `tooltip`) ── */
  function showTT(rect, cx, cy) {
    if (!tooltip) return;
    const key = rect.dataset.key;
    const val = parseFloat(rect.dataset.val) || 0;

    // Show original entered unit if it differs from SI
    const ID_MAP = { Na:"na", K:"k", iCa:"ica", Mg:"mg", Cl:"cl", Lactate:"lac", "Pi-":"phos" };
    const mid = ID_MAP[key];
    let extra = "";
    if (mid) {
      const uel = document.getElementById(mid + "-unit");
      const raw = parse(mid);
      if (uel && uel.value !== "si" && Number.isFinite(raw)) {
        const u = uel.value === "mgdl" ? "mg/dL" : uel.value;
        extra = '<div style="margin-top:4px;color:var(--muted)">'
              + raw.toFixed(2) + " " + u + " (entered)</div>";
      }
    }

    const ns = toNonSI(key, val);
    const showNon = document.getElementById("show-non-si") &&
                    document.getElementById("show-non-si").checked;
    const nsLine = (ns && showNon)
      ? '<div style="color:var(--muted);margin-top:4px">\u2248 ' + ns + "</div>"
      : "";

    tooltip.innerHTML =
      "<strong>" + htmlLabel(key) + "</strong>" +
      '<div style="font-weight:700;margin-top:4px">' +
      val.toFixed(2) + " mmol/L</div>" + extra + nsLine;

    const cr = document.querySelector(".container").getBoundingClientRect();
    tooltip.style.left = Math.max(40, Math.min(cx - cr.left, cr.width - 40)) + "px";
    tooltip.style.top  = (cy - cr.top - 10) + "px";
    tooltip.classList.add("visible");
    tooltip.setAttribute("aria-hidden", "false");
  }

  function hideTT() {
    if (!tooltip) return;
    tooltip.classList.remove("visible");
    tooltip.setAttribute("aria-hidden", "true");
  }
}

/* =====================================================================
 * §7  PNG export (300 DPI)
 * ===================================================================== */

/**
 * Clone the SVG, inline styles, rasterise at 300 DPI and
 * trigger a browser download of the resulting PNG.
 */
function exportGamblegramPNG() {
  const svg = document.getElementById("gg-svg");
  if (!svg) return;

  const clone = svg.cloneNode(true);

  // Read the current dynamic font-size from an actual label so
  // the export matches what the user sees on-screen.
  const sampleText = svg.querySelector("text.gg-name");
  const liveFontSize = sampleText
    ? (sampleText.getAttribute("font-size") || "14") + "px"
    : "14px";

  const muted = (getComputedStyle(document.documentElement)
    .getPropertyValue("--muted").trim()) || "#9aa4b2";

  const css =
    "text.gg-name { font: 400 " + liveFontSize + " Inter, system-ui, sans-serif; fill: " + muted + "; }" +
    "text.gg-val  { font: 400 " + liveFontSize + " Inter, system-ui, sans-serif; fill: " + muted + "; }" +
    ".gg-rect { stroke: rgba(0,0,0,0.04); }";

  const styleEl = document.createElementNS("http://www.w3.org/2000/svg", "style");
  styleEl.textContent = css;
  clone.insertBefore(styleEl, clone.firstChild);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

  const svgStr = new XMLSerializer().serializeToString(clone);
  const blob   = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
  const url    = URL.createObjectURL(blob);

  const vb = svg.viewBox.baseVal;
  const w  = (vb && vb.width)  ? vb.width  : 800;
  const h  = (vb && vb.height) ? vb.height : 600;

  const DPI   = 300;
  const ratio = window.devicePixelRatio || 1;
  const scale = (DPI / 96) * ratio;

  const canvas = document.createElement("canvas");
  canvas.width  = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d");

  const img = new Image();
  img.onload = () => {
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    canvas.toBlob((pngBlob) => {
      const a    = document.createElement("a");
      a.href     = URL.createObjectURL(pngBlob);
      a.download = "gamblegram-300dpi.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
    }, "image/png");
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    alert("Export failed \u2014 your browser may not support SVG-to-canvas rendering.");
  };
  img.src = url;
}

/* =====================================================================
 * §8  UI event wiring
 * ===================================================================== */

/* ── Reset: restore every input to its HTML `defaultValue` ── */
el("reset").addEventListener("click", () => {
  document.querySelectorAll("input, select").forEach((elm) => {
    if (elm.type === "checkbox")       elm.checked = elm.defaultChecked;
    else if (elm.tagName === "SELECT") elm.value   = elm.defaultValue;
    else                               elm.value   = elm.defaultValue || "";
  });
  document.querySelectorAll("dd").forEach((d) => (d.textContent = "\u2014"));
  const h = el("hco3"); if (h) h.placeholder = "auto";
  computeAll();
});

/* ── Export button ── */
const _exportBtn = el("export-gg");
if (_exportBtn) _exportBtn.addEventListener("click", exportGamblegramPNG);

/* ── Formulas collapse / expand ── */
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

/* ── Light-mode toggle ── */
const _lightToggle = el("toggle-light");
if (_lightToggle) {
  _lightToggle.addEventListener("change", (e) =>
    document.body.classList.toggle("light", e.target.checked)
  );
}

/* ── Non-SI toggle → recompute ── */
const _nonSi = el("show-non-si");
if (_nonSi) _nonSi.addEventListener("change", computeAll);

/* ── Debounced live recompute on any input ── */
let _inputTimer;
document.querySelectorAll("input").forEach((inp) => {
  inp.addEventListener("input", () => {
    clearTimeout(_inputTimer);
    _inputTimer = setTimeout(computeAll, 150);
  });
});

/* ── Unit-selector auto-conversion ── */
document.querySelectorAll("select.unit-select").forEach((sel) => {
  sel.dataset.prevUnit = sel.value;

  sel.addEventListener("change", (ev) => {
    const s      = ev.currentTarget;
    const prevU  = s.dataset.prevUnit || "si";
    const newU   = s.value;
    const ionId  = s.id.replace("-unit", "");
    const input  = document.getElementById(ionId);
    const curVal = parseFloat(input.value);

    if (Number.isFinite(curVal) && prevU !== newU) {
      const si  = displayToSI(ionId, curVal, prevU);
      const nv  = siToDisplay(ionId, si, newU);
      if (Number.isFinite(nv)) input.value = Math.round(nv * 100) / 100;
    }
    s.dataset.prevUnit = newU;
    computeAll();
  });
});

// Native select pickers: populate and keep pickers in sync with numeric inputs
const PICKER_CONFIG = [
  { id: 'na',   min: 110, max: 160, step: 1,    decimals: 0 },
  // K, Mg and Phos now span 0–10 per your request (picker increments preserved)
  { id: 'k',    min: 0.0, max: 10.0, step: 0.1,  decimals: 1 },
  { id: 'ica',  min: 0.80, max: 1.60, step: 0.01, decimals: 2 },
  { id: 'mg',   min: 0.00, max: 10.00, step: 0.01, decimals: 2 },
  { id: 'cl',   min: 80,  max: 140, step: 1,    decimals: 0 },
  { id: 'lac',  min: 0.0, max: 10.0, step: 0.1, decimals: 1 },
  { id: 'alb',  min: 1.0, max: 6.0, step: 0.1, decimals: 1 },
  { id: 'phos', min: 0.00, max: 10.00, step: 0.1, decimals: 1 },
];

// Clinically typical defaults (SI units: mmol/L except albumin g/dL)
const PICKER_DEFAULTS_SI = {
  na: 140.0,
  k: 4.0,
  ica: 1.20,
  mg: 0.802,    // ≈ 1.95 mg/dL when unit is mg/dL
  cl: 104.0,
  lac: 1.0,
  alb: 4.0,     // albumin (g/dL input is handled separately in parse)
  phos: 1.0
};

function populatePicker(cfg) {
  const sel = document.getElementById(cfg.id + '-picker');
  // `num` may be a hidden/removed numeric input or the picker itself — accept either
  const num = el(cfg.id) || sel;
  if (!sel) return;
  sel.innerHTML = '';
  const steps = Math.round((cfg.max - cfg.min) / cfg.step);
  const unitEl = document.getElementById(cfg.id + '-unit');
  const unit = unitEl ? unitEl.value : 'si';
  for (let i = 0; i <= steps; i++) {
    const vSI = cfg.min + i * cfg.step; // base value in SI
    const displayV = unit === 'si' ? vSI : siToDisplay(cfg.id, vSI, unit);
    const label = Number(displayV).toFixed(cfg.decimals);
    const opt = document.createElement('option');
    opt.value = label; opt.textContent = label;
    sel.appendChild(opt);
  }
  // ensure the picker shows the current numeric/display value (or append it)
  const cur = parse(cfg.id);
  if (Number.isFinite(cur)) {
    const want = Number(cur).toFixed(cfg.decimals);
    if (!Array.from(sel.options).some(o => o.value === want)) {
      const extra = document.createElement('option');
      extra.value = want; extra.textContent = want; sel.appendChild(extra);
    }
    sel.value = want;
  } else {
    // no value entered — use clinically-typical default (SI stored in PICKER_DEFAULTS_SI)
    const defSI = PICKER_DEFAULTS_SI[cfg.id];
    if (defSI !== undefined) {
      const displayDef = (unit === 'si') ? defSI : siToDisplay(cfg.id, defSI, unit);
      const want = Number(displayDef).toFixed(cfg.decimals);
      if (!Array.from(sel.options).some(o => o.value === want)) {
        const extra = document.createElement('option');
        extra.value = want; extra.textContent = want; sel.appendChild(extra);
      }
      sel.value = want;
      // make sure any linked numeric input (if present) also reflects the default
      if (num && num !== sel) num.value = want;
    }
  }

  sel.addEventListener('change', (e) => {
    // if there is still an input element (some ions keep numeric fields), update it;
    // otherwise the picker handles the value itself. Always recompute.
    if (num !== sel) num.value = e.target.value;
    computeAll();
  });

  num.addEventListener('input', () => {
    const v = parseFloat(num.value);
    if (!Number.isFinite(v)) return;
    const s = v.toFixed(cfg.decimals);
    if (!Array.from(sel.options).some(o => o.value === s)) {
      const extra = document.createElement('option');
      extra.value = s; extra.textContent = s; sel.appendChild(extra);
    }
    sel.value = s;
  });
}

// populate all pickers on load
PICKER_CONFIG.forEach(populatePicker);

// when units change, repopulate the matching picker so the scale/labels still match the displayed unit
document.querySelectorAll('select.unit-select').forEach(s => {
  s.addEventListener('change', (ev) => {
    const ion = s.id.replace('-unit','');
    const cfg = PICKER_CONFIG.find(c => c.id === ion);
    if (cfg) populatePicker(cfg);
    computeAll();
  });
});

/* ── BUG FIX: recompute on window resize so the SVG re-measures
   its container width and redraws at the correct proportions. ── */
let _resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(computeAll, 200);
});

/* =====================================================================
 * §9  Initial render
 * ===================================================================== */

computeAll();
