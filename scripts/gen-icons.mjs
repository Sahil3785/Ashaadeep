#!/usr/bin/env node
/* ============================================================
   Generates every Android launcher icon from one SVG.

      node scripts/gen-icons.mjs

   Android needs two separate things:

   • mipmap-<density> ic_launcher.png — the LEGACY icon, used on Android
     7.1 and older. A plain square image.
   • ic_launcher_foreground + a background colour —
     the ADAPTIVE icon, used on Android 8.0 and newer. The
     launcher masks it into whatever shape the phone uses, and
     only the middle 72 of 108 dp is guaranteed visible.

   Capacitor scaffolds both with its own placeholder art, so both
   have to be replaced or the default shows through on some
   devices and the school crest on others.
   ============================================================ */

import sharp from 'sharp';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const RES = 'android/app/src/main/res';
const svg = readFileSync('scripts/assets/app-icon.svg');

// Legacy square icon, 48dp at each density.
const LEGACY = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };

// Adaptive foreground, 108dp at each density. The artwork is drawn at 62% and
// centred so it sits inside the 72dp safe zone no launcher mask will crop.
const ADAPTIVE = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };

const log = [];

for (const [density, size] of Object.entries(LEGACY)) {
  const dir = join(RES, `mipmap-${density}`);
  mkdirSync(dir, { recursive: true });

  const png = await sharp(svg, { density: 600 })
    .resize(size, size, { fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toBuffer();

  writeFileSync(join(dir, 'ic_launcher.png'), png);
  writeFileSync(join(dir, 'ic_launcher_round.png'), png);  // the launcher masks it
  log.push(`mipmap-${density}/ic_launcher.png  ${size}×${size}`);
}

// The crest is drawn once at high resolution and trimmed to its own bounds, so
// the tassel sticking out to the right cannot push the composition off-centre.
const crestMaster = await sharp(await bareCrest(), { density: 600 })
  .resize(1024, 1024, { fit: 'inside' })
  .trim()                        // crop away the transparent margin
  .png()
  .toBuffer();

for (const [density, size] of Object.entries(ADAPTIVE)) {
  const dir = join(RES, `mipmap-${density}`);
  mkdirSync(dir, { recursive: true });

  // Keep the artwork inside the 72-of-108dp safe zone every launcher mask
  // respects, with a little margin so a circular mask never clips the tassel.
  const inner = Math.round(size * 0.58);

  const art = await sharp(crestMaster)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  const png = await sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: art, gravity: 'centre' }])   // centred, whatever its shape
    .png({ compressionLevel: 9 })
    .toBuffer();

  writeFileSync(join(dir, 'ic_launcher_foreground.png'), png);
  log.push(`mipmap-${density}/ic_launcher_foreground.png  ${size}×${size} (art ${inner}, centred)`);
}

/* The crest with no background plate — the adaptive foreground layer must be
   transparent outside the artwork, or the launcher's mask shows a visible box. */
async function bareCrest() {
  return Buffer.from(
    readFileSync('scripts/assets/app-icon.svg')
      .toString()
      .replace('<rect width="512" height="512" fill="url(#bg)"/>', '')
      .replace('<rect width="512" height="512" fill="url(#glow)"/>', '')
  );
}

console.log('Generated:');
log.forEach(l => console.log('  ' + l));
