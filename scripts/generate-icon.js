/**
 * Islam Daily — App Icon & Splash Generator
 *
 * Generates:
 *   assets/icon.png            1024×1024  (App Store / Play Store)
 *   assets/adaptive-icon.png   1024×1024  (Android adaptive foreground)
 *   assets/splash.png          1080×1920  (Splash screen)
 *
 * Run: node scripts/generate-icon.js
 * Requires: sharp (already in devDependencies)
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const ASSETS = path.join(__dirname, '..', 'assets');

// ── Colours ──────────────────────────────────────────────────────────────────
const GREEN   = '#0F6E56';
const GOLD    = '#EF9F27';
const WHITE   = '#FFFFFF';

// ── SVG helpers ──────────────────────────────────────────────────────────────

/** Build the crescent + quran + star SVG artwork, centred in a `size` square */
function artworkSvg(size) {
  const cx = size / 2;
  const cy = size / 2;

  // Crescent: two overlapping circles
  const R  = size * 0.30;   // outer circle radius
  const r  = size * 0.24;   // inner circle (cutout)
  const dx = size * 0.09;   // offset of inner circle

  // Quran book below crescent centre
  const bookW = size * 0.24;
  const bookH = size * 0.15;
  const bookX = cx - bookW / 2;
  const bookY = cy + R * 0.35;

  // Star position (upper-right of crescent)
  const starCX = cx + R * 0.82;
  const starCY = cy - R * 0.72;
  const starR  = size * 0.038;

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <!-- Background -->
  <rect width="${size}" height="${size}" fill="${GREEN}"/>

  <!-- Crescent moon (clip-path trick) -->
  <defs>
    <mask id="crescent">
      <circle cx="${cx}" cy="${cy - size * 0.02}" r="${R}" fill="white"/>
      <circle cx="${cx + dx}" cy="${cy - size * 0.02 - size * 0.02}" r="${r}" fill="black"/>
    </mask>
  </defs>
  <circle cx="${cx}" cy="${cy - size * 0.02}" r="${R}" fill="${GOLD}" mask="url(#crescent)"/>

  <!-- 5-point star -->
  <polygon
    points="${star5(starCX, starCY, starR, starR * 0.42)}"
    fill="${WHITE}"
    opacity="0.95"
  />

  <!-- Open Quran book -->
  <!-- Spine -->
  <rect x="${cx - size * 0.008}" y="${bookY - size * 0.01}" width="${size * 0.016}" height="${bookH + size * 0.02}" fill="${GOLD}" rx="${size * 0.004}"/>
  <!-- Left page -->
  <path d="
    M ${cx} ${bookY}
    Q ${bookX + bookW * 0.25} ${bookY - bookH * 0.12} ${bookX} ${bookY + bookH * 0.1}
    L ${bookX} ${bookY + bookH}
    Q ${bookX + bookW * 0.25} ${bookY + bookH * 1.05} ${cx} ${bookY + bookH}
    Z
  " fill="${WHITE}" opacity="0.92"/>
  <!-- Right page -->
  <path d="
    M ${cx} ${bookY}
    Q ${bookX + bookW * 0.75} ${bookY - bookH * 0.12} ${bookX + bookW} ${bookY + bookH * 0.1}
    L ${bookX + bookW} ${bookY + bookH}
    Q ${bookX + bookW * 0.75} ${bookY + bookH * 1.05} ${cx} ${bookY + bookH}
    Z
  " fill="${WHITE}" opacity="0.85"/>
  <!-- Lines on left page -->
  ${pageLines(cx - bookW * 0.38, bookY + bookH * 0.25, bookW * 0.32, 3, size * 0.008, GOLD)}
  <!-- Lines on right page -->
  ${pageLines(cx + bookW * 0.06, bookY + bookH * 0.25, bookW * 0.32, 3, size * 0.008, GOLD)}
</svg>`;
}

/** Generate SVG <line> elements to simulate text lines on a book page */
function pageLines(startX, startY, width, count, gap, color) {
  return Array.from({ length: count }, (_, i) =>
    `<line x1="${startX}" y1="${startY + i * gap * 2.5}" x2="${startX + width}" y2="${startY + i * gap * 2.5}" stroke="${color}" stroke-width="${gap * 0.6}" stroke-linecap="round" opacity="0.7"/>`
  ).join('\n  ');
}

/** Compute polygon points string for a regular 5-point star */
function star5(cx, cy, outerR, innerR) {
  const points = [];
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return points.join(' ');
}

/** Splash SVG: green bg, icon centred, "Islam Daily" text below */
function splashSvg(w, h) {
  const iconSize = Math.min(w, h) * 0.35;
  const cx = w / 2;
  const cy = h * 0.42;

  // Embed the artwork SVG as a nested <svg>
  const inner = artworkSvg(iconSize);
  const innerStripped = inner
    .replace(/<svg[^>]*>/, '')
    .replace(/<\/svg>/, '')
    .replace(/<rect[^/]*\/>/,'');          // remove bg rect from inner

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect width="${w}" height="${h}" fill="${GREEN}"/>

  <!-- Centred icon artwork -->
  <g transform="translate(${cx - iconSize / 2}, ${cy - iconSize / 2})">
    ${innerStripped}
  </g>

  <!-- "Islam Daily" -->
  <text
    x="${cx}" y="${cy + iconSize * 0.65}"
    font-family="serif" font-size="${Math.round(h * 0.042)}" font-weight="bold"
    fill="${WHITE}" text-anchor="middle" letter-spacing="3"
  >ISLAM DAILY</text>

  <!-- Arabic subtitle -->
  <text
    x="${cx}" y="${cy + iconSize * 0.65 + h * 0.052}"
    font-family="serif" font-size="${Math.round(h * 0.028)}"
    fill="${GOLD}" text-anchor="middle" opacity="0.85"
  >إسلام ديلي</text>
</svg>`;
}

// ── Render ────────────────────────────────────────────────────────────────────

async function render(svgString, outPath, width, height) {
  await sharp(Buffer.from(svgString))
    .resize(width, height)
    .png()
    .toFile(outPath);
  console.log(`✓ ${path.relative(process.cwd(), outPath)}  (${width}×${height})`);
}

async function main() {
  // icon.png  1024×1024
  await render(artworkSvg(1024), path.join(ASSETS, 'icon.png'), 1024, 1024);

  // adaptive-icon.png  1024×1024  (same artwork, bg stripped — Expo adds bg)
  await render(artworkSvg(1024), path.join(ASSETS, 'adaptive-icon.png'), 1024, 1024);

  // splash.png  1080×1920
  await render(splashSvg(1080, 1920), path.join(ASSETS, 'splash.png'), 1080, 1920);

  console.log('\nDone! Rebuild your app to see the new icon.');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
