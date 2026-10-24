#!/usr/bin/env bash
# Rebuild @flexible-graphrag/angular-ui from a local Flexible GraphRAG checkout and use it here -- for trying
# unreleased library changes. A normal build just uses the published package (app/package.json).
# Windows: install-local-lib.bat.
#
#   scripts/install-local-lib.sh
#
# FG_UI (the checkout's flexible-graphrag-ui/frontend-angular) defaults to a ../flexible-graphrag (or
# ../../newdev3/flexible-graphrag) checkout next to this repository; set it for any other layout.
#
# The tarball goes to two places:
# - docker/lib/: the image's Dockerfile installs it over the npm version, so an image build (the deployment's
#   scripts/build-kg-spaces-nuxeo.sh, or docker build) uses it. Older tarballs there are removed.
# - app/node_modules, for `npm start` (ng serve): installed with --no-save, so app/package.json and its lock
#   stay on the published version (the image's `npm ci` needs them to agree). A later `npm install` or
#   `npm ci` in app/ puts the published version back: run this again after one.
#
# The cache clear is not optional: the library version doesn't change between dev packs, so the Angular CLI
# would keep serving the previously compiled copy from app/.angular/cache, and library changes would seem
# to have no effect.
set -euo pipefail

HERE="$(cd "$(dirname "$0")/.." && pwd)"
if [ -z "${FG_UI:-}" ]; then
  for fg in "$HERE/../flexible-graphrag" "$HERE/../../newdev3/flexible-graphrag"; do
    if [ -d "$fg/flexible-graphrag-ui/frontend-angular" ]; then FG_UI="$fg/flexible-graphrag-ui/frontend-angular"; break; fi
  done
fi
[ -n "${FG_UI:-}" ] && [ -d "$FG_UI" ] || { echo "Flexible GraphRAG checkout not found: set FG_UI" >&2; exit 2; }

echo "==> building + packing the library in $FG_UI"
( cd "$FG_UI" && npm run pack:lib )

TARBALL=$(ls -t "$FG_UI"/dist/flexible-graphrag-angular-ui-*.tgz | head -1)
echo "==> $(basename "$TARBALL") into docker/lib/ (image builds)"
rm -f "$HERE"/docker/lib/flexible-graphrag-angular-ui-*.tgz
cp "$TARBALL" "$HERE/docker/lib/"

echo "==> installing it into app/ (npm start), without changing package.json"
( cd "$HERE/app" && npm install "$TARBALL" --no-save --no-audit --no-fund )

echo "==> clearing the Angular CLI cache (see note above)"
rm -rf "$HERE/app/.angular/cache"

echo "done - restart npm start in app/, or rebuild the image (the deployment's scripts/build-kg-spaces-nuxeo.sh)"
