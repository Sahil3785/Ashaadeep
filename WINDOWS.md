# Windows staff app

`Asha Deep Staff` is the website's staff dashboard — marks, register, the fee
desk with printed receipts, notices, staff and activity log — packaged as a
Windows program with Electron. It talks to the same Supabase database as the
website and the Android app; the keys in `.env` are built into it.

| | |
|---|---|
| Entry | `desktop/index.html` → `src/desktop/main.jsx` (dashboard + sign-in only, no public pages) |
| Shell | `electron/main.cjs` — one window, links such as WhatsApp open in the normal browser |
| Build | `npm run exe` → `release/dist/AshaDeepStaff-Setup.exe` |
| Publish | GitHub Release `desktop-v<version>` with the installer attached |
| Version | `desktopVersion` in `package.json` — bump it for every release |
| Download | `/app` page on the website, which reads `public/downloads/app-info.json` |

## Building

```bash
npm run exe          # needs .env with the database keys
```

On a Windows PC or an Intel Mac this just works. On an Apple-silicon Mac
without Rosetta, electron-builder's bundled `makensis` (Intel) cannot run;
run `./scripts/build-makensis.sh` once to compile a native one, or install
Rosetta with `softwareupdate --install-rosetta`.

Try it without building an installer: `npm run build:desktop`, then
`npx electron release/app` after one `npm run exe`, or point the shell at the
dev server with `ELECTRON_DEV_URL=http://localhost:3200 npx electron electron/main.cjs`
while `npm run dev:desktop` runs.

## Installing

Run `AshaDeepStaff-Setup.exe`. Because the program is not code-signed yet,
Windows SmartScreen shows "Windows protected your PC" — click **More info →
Run anyway**. To remove the warning, buy a code-signing certificate and add it
to `scripts/build-desktop.mjs` (electron-builder's `win.signtoolOptions`).

## Publishing a new version

1. Bump `desktopVersion` in `package.json`.
2. `npm run exe`
3. Publish the installer as a release (GitHub CLI, signed in once with `gh auth login`):
   ```bash
   gh release create desktop-v1.0.1 release/dist/AshaDeepStaff-Setup.exe \
     --title "Asha Deep Staff for Windows 1.0.1" --notes "What changed"
   ```
4. Commit `public/downloads/app-info.json` (version and size) and push.

The website's download button points at
`https://github.com/Sahil3785/Ashaadeep/releases/latest/download/AshaDeepStaff-Setup.exe`,
which always serves the newest release — the link never changes. Keep the
asset name `AshaDeepStaff-Setup.exe` for that to keep working.
