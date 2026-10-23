#!/usr/bin/env node
/* ============================================================
   The Windows staff app, built for this Mac — for trying it out
   without a Windows PC. Same code, same database.

      node scripts/build-desktop-mac.mjs

   Run `npm run exe` first (it builds and stages release/app/).
   Installs "Asha Deep Staff.app" into ~/Applications.
   ============================================================ */
import { build, Platform } from 'electron-builder';
import { execSync } from 'node:child_process';
import { cpSync, rmSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
await build({
  targets: Platform.MAC.createTarget(['dir'], 3 /* arm64 */),
  config: {
    appId: 'in.ashadeepadarsh.staff',
    productName: 'Asha Deep Staff',
    electronVersion: pkg.devDependencies.electron.replace(/^[^\d]*/, ''),
    directories: { app: 'release/app', output: 'release/mac' },
    files: ['**/*'],
    mac: { icon: 'electron/icon.png', identity: null, target: 'dir' },
  },
});

const app = 'release/mac/mac-arm64/Asha Deep Staff.app';
// Unsigned apps will not launch on Apple silicon; a local ad-hoc signature is enough.
execSync(`codesign --force --deep --sign - "${app}"`, { stdio: 'inherit' });
const dest = join(homedir(), 'Applications', 'Asha Deep Staff.app');
rmSync(dest, { recursive: true, force: true });
cpSync(app, dest, { recursive: true, verbatimSymlinks: true });
console.log(`\nInstalled: ${dest}\n`);
