#!/bin/zsh
# ============================================================
# One-time setup for building the Windows installer on an
# Apple-silicon Mac WITHOUT Rosetta.
#
# electron-builder ships an Intel-only makensis. This compiles
# NSIS 3.04 (the version its stubs match) natively and puts it
# where scripts/build-desktop.mjs looks for it. With Rosetta
# installed (softwareupdate --install-rosetta) none of this is
# needed.
#
#   ./scripts/build-makensis.sh      (run `npm run exe` once first,
#                                     so electron-builder's NSIS is cached)
# ============================================================
set -e
WORK=$(mktemp -d)
DEST="$HOME/Library/Application Support/ashadeep-build/nsis-3.04"
CACHE="$HOME/Library/Caches/electron-builder/nsis/nsis-3.0.4.1"
[ -d "$CACHE" ] || { echo "Run npm run exe once first so $CACHE exists."; exit 1; }

cd "$WORK"
python3 -m venv venv && ./venv/bin/pip -q install "scons==3.1.2"
curl -fsSL -o src.tar.bz2 "https://downloads.sourceforge.net/project/nsis/NSIS%203/3.04/nsis-3.04-src.tar.bz2"
tar -xjf src.tar.bz2 && cd nsis-3.04-src

# NSIS 3.04's build scripts are Python 2; patch the few spots SCons 3 on Python 3 trips over.
grep -rl "has_key" SConstruct SCons | while read f; do perl -pi -e 's/([\w.]+(?:\[[^\]]+\])?)\.has_key\(([^()]+)\)/($2 in $1)/g' "$f"; done
grep -rl "raise [A-Za-z_.]*, " SConstruct SCons | while read f; do perl -pi -e 's/raise ([\w.]+), (.+)$/raise $1($2)/' "$f"; done
perl -pi -e 's/from types import StringType/StringType = str/; s/= (names or )?map\((.*)\)\s*$/= $1list(map($2))\n/; s/for doctype in defenv\[\x27DOCTYPES\x27\]:/for doctype in []:/' SConstruct

../venv/bin/python3 ../venv/bin/scons VERSION=3.04 VER_MAJOR=3 VER_MINOR=4 VER_REVISION=0 VER_BUILD=0 \
  SKIPSTUBS=all SKIPPLUGINS=all SKIPUTILS=all SKIPMISC=all NSIS_CONFIG_CONST_DATA_PATH=no NSIS_MAX_STRLEN=8192 \
  APPEND_CCFLAGS="-Wno-error -Wno-narrowing -Wno-register" makensis

rm -rf "$DEST" && mkdir -p "$(dirname "$DEST")" && cp -R "$CACHE" "$DEST"
cp build/urelease/makensis/makensis "$DEST/mac/makensis"
echo "Native makensis installed: $("$DEST/mac/makensis" -VERSION)"
