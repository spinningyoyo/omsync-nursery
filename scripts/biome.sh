#!/bin/sh
# Runs Biome, the linter and formatter for the JavaScript, CSS and JSON files: sh scripts/biome.sh
# check . | sh scripts/biome.sh check --write .
#
# The standalone Biome binary is pinned below and downloaded once into .tools/ (gitignored). Its
# SHA-256 digest is checked before it runs, so this needs neither Node nor a package.json. To
# upgrade, pick a release at least two weeks old, replace the version and the three digests (each
# release lists them next to its assets), and run `sh scripts/biome.sh check --write .`.
set -eu

BIOME_VERSION="2.6.3" # published 2026-10-24; the newest 2.x release at least two weeks old on 2026-11-11

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TOOLS_DIR="$ROOT/.tools"

case "$(uname -s)-$(uname -m)" in
    Darwin-arm64)
        ASSET="biome-darwin-arm64"
        SHA256="c158900ec63bd10332d34cc1fe6a6a571da5c65a4396087f87a2368111bd7ff7" ;;
    Darwin-x86_64)
        ASSET="biome-darwin-x64"
        SHA256="c06a7b72d313e803f2e77b6eda16e5e57f3cb4f864fc2e2f079da3fc218a34ef" ;;
    Linux-x86_64)
        ASSET="biome-linux-x64"
        SHA256="1e5134625f00231035bfb14c12141cdc8fcab69b8275f354287808bb5d86d3ae" ;;
    *)
        echo "Unsupported platform: $(uname -s) $(uname -m)" >&2
        exit 1 ;;
esac

sha256_of() {
    if command -v sha256sum >/dev/null 2>&1; then
        sha256sum "$1" | awk '{print $1}'
    else
        shasum -a 256 "$1" | awk '{print $1}'
    fi
}

CLI="$TOOLS_DIR/biome-v$BIOME_VERSION"
if [ ! -x "$CLI" ]; then
    mkdir -p "$TOOLS_DIR"
    TMP="$(mktemp "$TOOLS_DIR/download.XXXXXX")"
    trap 'rm -f "$TMP"' EXIT
    curl -fsSL --retry 3 -o "$TMP" \
        "https://github.com/biomejs/biome/releases/download/%40biomejs%2Fbiome%40$BIOME_VERSION/$ASSET"
    actual="$(sha256_of "$TMP")"
    if [ "$actual" != "$SHA256" ]; then
        echo "Checksum mismatch for $ASSET: expected $SHA256, got $actual" >&2
        exit 1
    fi
    chmod +x "$TMP"
    mv "$TMP" "$CLI"
    trap - EXIT
fi

cd "$ROOT"
exec "$CLI" "$@"
