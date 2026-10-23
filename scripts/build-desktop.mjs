#!/usr/bin/env node
/* ============================================================
   Builds the Windows installer for the staff app.

      npm run exe

   1. vite builds the staff dashboard into dist-desktop/
   2. it is staged in release/app/ with a tiny package.json, so
      none of the website's or Android's packages end up inside
      the Windows program
   3. electron-builder makes release/dist/AshaDeepStaff-Setup.exe,
      which is published as a GitHub Release (see the end of the run)

   Building on a Mac: electron-builder normally edits the .exe's
   icon with a Windows tool run under Wine. That step is switched
   off and done here in plain JavaScript (resedit) instead, so no
   Wine is needed.
   ============================================================ */
import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, writeFileSync, readFileSync, statSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { build, Platform } from 'electron-builder';
import * as ResEdit from 'resedit';
import { join } from 'node:path';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

// Apple-silicon Macs without Rosetta cannot run electron-builder's bundled
// (Intel) makensis. scripts/build-makensis.sh compiles a native one here.
const nativeNsis = join(homedir(), 'Library/Application Support/ashadeep-build/nsis-3.04');
if (process.platform === 'darwin' && existsSync(join(nativeNsis, 'mac/makensis'))) {
  process.env.ELECTRON_BUILDER_NSIS_DIR = nativeNsis;
}
const version = pkg.desktopVersion;
const run = (cmd) => execSync(cmd, { stdio: 'inherit' });

run('npx vite build --config vite.config.desktop.js');

rmSync('release', { recursive: true, force: true });
mkdirSync('release/app', { recursive: true });
cpSync('dist-desktop', 'release/app/dist-desktop', { recursive: true });
cpSync('electron', 'release/app/electron', { recursive: true });
writeFileSync('release/app/package.json', JSON.stringify({
  name: 'ashadeep-staff', productName: 'Asha Deep Staff', version,
  description: 'Staff dashboard for Asha Deep Adarsh High School', author: 'Asha Deep Adarsh High School',
  main: 'electron/main.cjs',
}, null, 2));

await build({
  targets: Platform.WINDOWS.createTarget(['nsis'], 1 /* x64 */),
  config: {
    appId: 'in.ashadeepadarsh.staff',
    productName: 'Asha Deep Staff',
    copyright: 'Asha Deep Adarsh High School',
    electronVersion: pkg.devDependencies.electron.replace(/^[^\d]*/, ''),
    directories: { app: 'release/app', output: 'release/dist' },
    files: ['**/*'],
    asar: true,
    compression: 'maximum',
    win: { icon: 'electron/icon.ico', target: 'nsis', signAndEditExecutable: false },
    afterPack: async ({ appOutDir }) => brandExe(join(appOutDir, 'Asha Deep Staff.exe')),
    nsis: {
      oneClick: false,
      perMachine: false,
      allowToChangeInstallationDirectory: true,
      createDesktopShortcut: true,
      createStartMenuShortcut: true,
      shortcutName: 'Asha Deep Staff',
      artifactName: 'AshaDeepStaff-Setup.${ext}',
    },
  },
});

/* School icon and name on the program file itself (Task Manager, shortcuts). */
function brandExe(file) {
  const exe = ResEdit.NtExecutable.from(readFileSync(file));
  const res = ResEdit.NtExecutableResource.from(exe);
  const icon = ResEdit.Data.IconFile.from(readFileSync('electron/icon.ico'));
  const group = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries)[0];
  ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries, group.id, group.lang, icon.icons.map(i => i.data));
  const vi = ResEdit.Resource.VersionInfo.fromEntries(res.entries)[0];
  const [a, b, c] = version.split('.').map(Number);
  vi.setFileVersion(a, b, c, 0, 1033);
  vi.setProductVersion(a, b, c, 0, 1033);
  vi.setStringValues({ lang: 1033, codepage: 1200 }, {
    ProductName: 'Asha Deep Staff', FileDescription: 'Asha Deep Staff', CompanyName: 'Asha Deep Adarsh High School',
    LegalCopyright: 'Asha Deep Adarsh High School', OriginalFilename: 'Asha Deep Staff.exe', InternalName: 'Asha Deep Staff',
  });
  vi.outputToResourceEntries(res.entries);
  res.outputResource(exe);
  writeFileSync(file, Buffer.from(exe.generate()));
}

// The installer (~80 MB) is published as a GitHub Release asset, not committed
// and not shipped with the website. This link always points at the newest
// release, so the website never needs changing when a new version goes up.
const DOWNLOAD_URL = 'https://github.com/Sahil3785/Ashaadeep/releases/latest/download/AshaDeepStaff-Setup.exe';
const sizeMB = Math.round(statSync('release/dist/AshaDeepStaff-Setup.exe').size / 1048576 * 10) / 10;

const infoPath = 'public/downloads/app-info.json';
const info = JSON.parse(readFileSync(infoPath, 'utf8'));
info.windows = {
  name: 'Asha Deep Staff for Windows', version, file: DOWNLOAD_URL, sizeMB,
  minWindows: '10', releasedOn: new Date().toISOString().slice(0, 10),
};
writeFileSync(infoPath, JSON.stringify(info, null, 2) + '\n');
console.log(`
Windows installer ready: release/dist/AshaDeepStaff-Setup.exe (${sizeMB} MB)

Publish it (needs the GitHub CLI, signed in once with  gh auth login):
  gh release create desktop-v${version} release/dist/AshaDeepStaff-Setup.exe \\
     --title "Asha Deep Staff for Windows ${version}" --notes "Windows staff app ${version}"
Then commit public/downloads/app-info.json and push.
`);
