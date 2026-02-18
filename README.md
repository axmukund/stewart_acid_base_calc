# Stewart / Figge — Acid-Base Calculator

A static, single-page web app that implements the **Stewart physicochemical approach** to acid-base analysis using the **Figge / Fencl** weak-acid approximations.

> **Disclaimer** — This tool uses simplified approximations and is **not** validated for clinical decision-making.

## Features

| Feature | Description |
|---------|-------------|
| **Live calculation** | SIDa, SIDe, SIG and AG update instantly as you change inputs |
| **Interactive Gamblegram** | Animated SVG stacked‑bar — hover/tap highlights a single region while others become outlined |
| **Unit conversion** | Per‑ion SI ↔ mg/dL toggle with automatic conversion |
| **300 DPI export** | Export the Gamblegram as a print‑quality PNG |
| **Accessible palette** | Okabe–Ito (color‑blind friendly); unknown ion uses a neon purple accent |
| **Modular codebase** | Split into small JS modules in `js/` (no build step required) |
| **Formulas panel** | Collapsible LaTeX (MathJax v3) with left‑aligned display |
| **Mobile & accessibility** | Responsive layout; picker ranges extended (Alb 0–6 g/L, iCa 0–2 mmol/L, Cl 60–150 mmol/L) |

## Equations (key)

$$
\mathrm{SID}_a = [\mathrm{Na}^+] + [\mathrm{K}^+] + 2[\mathrm{Ca}^{2+}] + 2[\mathrm{Mg}^{2+}] - [\mathrm{Cl}^-] - [\mathrm{Lactate}^-]
$$

$$
\mathrm{SID}_e = [\mathrm{HCO}_3^-] + \mathrm{Alb}^- + \mathrm{Phos}^-
\qquad
\mathrm{SIG} = \mathrm{SID}_a - \mathrm{SID}_e
$$

(Full formulas are available inside the app's collapsible **Formulas used** panel.)

## Running locally

No build tools needed — just serve the directory over HTTP:

```bash
# Python 3
python3 -m http.server 8000

# then open http://localhost:8000
```

## Deploying to GitHub Pages

1. **Create a repository** on GitHub (public or private).

2. **Push your code:**
   ```bash
   git init
   git add .
   git commit -m "initial commit"
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```

3. **Enable GitHub Pages:**
   - Go to **Settings → Pages**
   - Source: **Deploy from a branch**
   - Branch: **main** / **/ (root)**
   - Click **Save**

4. **Wait ~60 seconds** — your site will be live at:
   ```
   https://<you>.github.io/<repo>/
   ```

The `.nojekyll` file in this repo tells GitHub Pages to serve the files directly (no Jekyll processing).

## File map & project structure

```
├── index.html      ← App shell (inputs, results, Gamblegram, formulas)
├── style.css       ← All visual styling (dark/light, responsive, SVG)
├── js/             ← modular JS files (load order matters — see below)
│   ├── helpers.js
│   ├── physiology.js
│   ├── units.js
│   ├── gamblegram.js
│   ├── export.js
│   ├── compute.js
│   ├── pickers.js
│   │── events.js
├── .nojekyll       ← Tells GitHub Pages to skip Jekyll
├── .gitignore
└── README.md
```

See the `js/` files in the repository for a short description and the required load order.

## License

MIT
