# Copilot / AI agent instructions — Stewart (Stewart / Figge)

Purpose: help an AI coding agent become productive immediately when editing this repository.

## Quick architecture (big picture) 🔎
- Static single-page app (no build tools). `index.html` loads 8 plain `<script>` tags from `js/` in dependency order — no ES modules, no bundler.
- Data flow: user inputs → `parse()` / `getIonSI()` → `computeAll()` → pure physiology functions (`albuminCharge`, `phosphateCharge`, `hco3FromPHandPco2`) → DOM updates + `renderGamblegram()` SVG.
- Physiology model: full Figge–Fencl v3.0 (16 individual His pKa, N→B transition, 9 anomalous Lys) for albumin charge; triprotic equilibrium (Sendroy & Hastings 1927) for phosphate.
- Gamblegram colours are driven by **CSS custom properties** (`--gg-Na`, `--gg-Cl`, `--gg-Aminus`, `--gg-Pi`, `--gg-Unknown`, etc.) defined in `:root` (dark) and `body.light` (light mode). JS reads them at render-time via `cssColor()` in `gamblegram.js`.
- MathJax v3 is configured via a global `MathJax = { chtml: { displayAlign: 'left' } }` block placed **before** the CDN `<script>` in `index.html`.

## File map & script load order ✏️

| # | File | Purpose | Key exports (globals) |
|---|------|---------|----------------------|
| — | `index.html` | Markup, input fields, formulas panel, references | — |
| — | `style.css` | All styling (dark/light themes, mobile, SVG interactivity) | — |
| 1 | `js/helpers.js` | DOM utilities | `el()`, `parse()` |
| 2 | `js/physiology.js` | Pure math — **no DOM** | `hco3FromPHandPco2()`, `albuminCharge()`, `phosphateCharge()` |
| 3 | `js/units.js` | Unit-conversion constants & helpers | `MG_FACTOR`, `CA_FACTOR`, `LAC_FACTOR`, `PO4_FACTOR`, `getIonSI()`, `displayToSI()`, `siToDisplay()` |
| 4 | `js/gamblegram.js` | SVG Gamblegram rendering, pointer/touch interactivity, tooltips | `renderGamblegram()`, `SVG_LABELS`, `HTML_LABELS` |
| 5 | `js/export.js` | PNG export at 300 DPI | `exportGamblegramPNG()` |
| 6 | `js/compute.js` | Main calculation loop | `computeAll()` |
| 7 | `js/pickers.js` | `<select>` picker population & defaults | `PICKER_CONFIG`, `PICKER_DEFAULTS_SI`, `populatePicker()` |
| 8 | `js/events.js` | All UI event wiring; calls `computeAll()` on load | *(internal only)* |

## Project-specific conventions & gotchas ⚠️
- **Load order matters.** Files are plain scripts sharing globals — a file may only reference functions/constants from files loaded before it (see table above).
- Keep DOM-free logic in `js/physiology.js` — these are the functions suitable for unit-testing.
- `PICKER_CONFIG` and `PICKER_DEFAULTS_SI` live in `js/pickers.js`. Update there when changing ranges/defaults.
 - Note: the `phos` entry was recently tuned to use mg/dL as the default display unit. Display range is 0.0–15.0 mg/dL with 0.1 increments (internal SI ≈ 0–4.85 mmol/L, default ≈ 1.0 mmol/L).
 - The `Reset` button was moved above the Gamblegram; its handler now restores checkbox states, repopulates pickers from `PICKER_DEFAULTS_SI` (converted to the currently selected unit), and repopulates the HCO3 picker where applicable.
- Unit conversions: constants `MG_FACTOR`, `CA_FACTOR`, `LAC_FACTOR`, `PO4_FACTOR` live in `js/units.js`.
- Divalent cations iCa²⁺ and Mg²⁺ are multiplied by 2 (valence correction) in `computeAll()` to convert mmol/L → mEq/L.
- Debounce timings: input debounce = 150 ms (`_inputTimer`), resize debounce = 200 ms (`_resizeTimer`).
- Accessibility: keep `<title>`/`<desc>` inside `#gg-svg` and the tooltip element `#gg-tooltip` when editing visualization.
- Math rendering: MathJax v3 is loaded from CDN. The `MathJax` global config object **must** appear before the CDN script tag (see bottom of `index.html`).
- **Labels**: albumin charge uses `Alb⁻` (not `A⁻`); phosphate charge uses `Phos⁻` (not `Pi⁻`). These labels are defined in `SVG_LABELS` / `HTML_LABELS` in `gamblegram.js` and mirrored in result text in `compute.js`.

## Gamblegram colour palette 🎨
- All colours come from CSS custom properties: `--gg-Na`, `--gg-K`, `--gg-iCa`, `--gg-Mg`, `--gg-Cl`, `--gg-Lactate`, `--gg-HCO3`, `--gg-Aminus` (albumin), `--gg-Pi` (phosphate), `--gg-Unknown` (SIG).
- Dark-mode palette is on `:root`; light-mode overrides are on `body.light`.
- Palette is Okabe–Ito (colour-blind friendly). Unknown/SIG uses neon purple `#B347FF`.
- `cssColor(key, fallback)` in `gamblegram.js` maps JS ion keys (`"Alb"`, `"Phos"`) to CSS-var suffixes (`"Aminus"`, `"Pi"`).

## Gamblegram interactivity 🖱️
- Pointer events (`pointerenter`, `pointerdown`, `pointerleave`) handle mouse + touch.
- Tapping a segment adds `.active`; the SVG gets `.focused`; non-active rects become outlined (CSS `fill-opacity: 0.12`).
- Tapping outside the SVG clears selection via a document-level `pointerdown` listener.
- Keyboard: `focus` / `blur` on each rect for tab navigation.

## How to add a new ion (concrete checklist) ✅
1. Add input/picker element in `index.html` (follow existing ion field pattern).
2. Add config entry to `PICKER_CONFIG` and `PICKER_DEFAULTS_SI` in `js/pickers.js`.
3. Add conversion handling to `getIonSI()` (if mg/dL support required) in `js/units.js`.
4. Read the value in `computeAll()` (`js/compute.js`) and include it in `sidA`/`sidE` calculations.
5. Add the ion to `renderGamblegram()` stacks and legend (`SVG_LABELS` / `HTML_LABELS`) in `js/gamblegram.js`.
6. Add a CSS custom property `--gg-<Name>` in both `:root` and `body.light` blocks in `style.css`.
7. Manually test in browser (see "Running & debugging").

## Running & debugging 🧪
- Local server: `python3 -m http.server 8000` → open `http://localhost:8000` (documented in `README.md`).
- Useful console commands: `computeAll()`, `exportGamblegramPNG()`, `albuminCharge(40, 7.4)` (≈ 11.15 mEq/L).
- No automated tests or bundler present — changes must be validated manually in browser.

## Integration points & external deps 🔗
- MathJax v3 via CDN for LaTeX (formulas panel); configured in `index.html` with `displayAlign: 'left'`.
- No npm / Node or CI configured; deployment is GitHub Pages (push to `main`).
- PNG export uses canvas; browser support may vary (`exportGamblegramPNG`).

## Search anchors / quick-symbols (use these to locate behaviour)
- computeAll, renderGamblegram, albuminCharge, phosphateCharge, hco3FromPHandPco2, getIonSI, PICKER_CONFIG, PICKER_DEFAULTS_SI, exportGamblegramPNG, cssColor, SVG_LABELS, HTML_LABELS

---

If anything in these instructions is unclear or you want me to expand a section (examples, PR checklist, or add runnable unit-test scaffold), tell me which part to refine.