# Windows staff app

`Asha Deep Staff` is the website's staff dashboard — marks, register, the fee
desk with printed receipts, notices, staff and activity log — packaged as a
Windows program with Electron. It talks to the same Supabase database as the
website and the Android app; the keys in `.env` are built into it.

| | |
|---|---|
| Entry | `desktop/index.html` → `src/desktop/main.jsx` (dashboard + sign-in only, no public pages) |
| Shell | `electron/main.cjs` — one window, links such as WhatsApp open in the normal browser |
| Build | `npm run exe` → `downloads/windows/AshaDeepStaff-Setup.exe` |
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

## Where the installer lives

At ~80 MB it is kept out of the website deployment: it is committed under
`downloads/windows/` and the download button links to it on GitHub. Every new
version adds to the repository's size, so once releases become regular, move
it to GitHub Releases and change `DOWNLOAD_URL` in `scripts/build-desktop.mjs`.
