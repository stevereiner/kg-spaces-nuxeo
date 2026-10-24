#!/usr/bin/env sh
# Build the Web UI add-on bundle: dist/kg-spaces-nuxeo-addon-<version>.jar (needs a JDK's jar tool).
# Install: copy it into the Nuxeo server's nxserver/bundles/ and restart Nuxeo.
set -eu

here="$(cd "$(dirname "$0")" && pwd)"
version="$(sed -n 's/^Bundle-Version: *//p' "$here/MANIFEST.MF" | tr -d '\r')"
mkdir -p "$here/dist"
out="$here/dist/kg-spaces-nuxeo-addon-$version.jar"
rm -f "$out"
jar cfm "$out" "$here/MANIFEST.MF" -C "$here/src" .
echo "Built $out"
