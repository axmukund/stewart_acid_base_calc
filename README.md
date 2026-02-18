# Stewart / Figge — Acid-Base Calculator

A static, single-page web app that implements the **Stewart physicochemical approach** to acid-base analysis using the **Figge / Fencl** weak-acid approximations.

> **Disclaimer** — This tool uses simplified approximations and is **not** validated for clinical decision-making.

## Features

| Feature | Description |
|---------|-------------|
| **Live calculation** | SIDa, SIDe, SIG, and AG update instantly as you type |
| **Gamblegram** | Animated SVG stacked-bar chart of cations vs anions |
| **Unit conversion** | Per-ion SI ↔ mg/dL toggle with auto-conversion |
| **300 DPI export** | Download the Gamblegram as a print-quality PNG |
| **Dark / Light mode** | One-click theme switch via CSS custom properties |
| **Mobile-friendly** | Responsive single-column layout; collapses to phone-sized screens |
| **Formulas panel** | Collapsible LaTeX display of all equations (via MathJax) |
| **Zero dependencies** | Pure HTML + CSS + vanilla JS — no build step required |

## Equations

$$
\text{SID}_a = [\text{Na}^+] + [\text{K}^+] + [\text{iCa}^{2+}] + [\text{Mg}^{2+}] - [\text{Cl}^-] - [\text{Lactate}^-]
$$

$$
A^- \approx \frac{0.123 \times \text{Alb (g/L)}}{1 + 10^{7.08 - \text{pH}}}
\qquad
\text{Pi}^- \approx \frac{0.309 \times [\text{PO}_4] \text{ (mmol/L)}}{1 + 10^{6.8 - \text{pH}}}
$$

$$
\text{SID}_e = [\text{HCO}_3^-] + A^- + \text{Pi}^-
\qquad
\text{SIG} = \text{SID}_a - \text{SID}_e
$$

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

## Project structure

```
├── index.html      ← App shell (inputs, results, Gamblegram, formulas)
├── style.css       ← All visual styling (dark/light, responsive, SVG)
├── app.js          ← Calculation logic, SVG rendering, UI wiring
├── .nojekyll       ← Tells GitHub Pages to skip Jekyll
├── .gitignore
└── README.md
```

## License

MIT
