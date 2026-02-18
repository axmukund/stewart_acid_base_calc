/**
 * export.js — Gamblegram PNG export (300 DPI).
 *
 * Clones the live SVG, inlines computed styles, rasterises via
 * <canvas> at 300 DPI, and triggers a browser download.
 *
 * Depends on: (none — reads the SVG element directly)
 */

"use strict";

/**
 * Export the current Gamblegram as a high-resolution PNG.
 *
 * The exported image matches the on-screen appearance by reading
 * the live font-size from an SVG label and inlining it as a
 * <style> element before serialisation.
 */
function exportGamblegramPNG() {
  const svg = document.getElementById("gg-svg");
  if (!svg) return;

  const clone = svg.cloneNode(true);

  // Read the dynamic font-size from an actual label so the export
  // matches the current viewport width.
  const sampleText   = svg.querySelector("text.gg-name");
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

  const canvas  = document.createElement("canvas");
  canvas.width  = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx     = canvas.getContext("2d");

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
