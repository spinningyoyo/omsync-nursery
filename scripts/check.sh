#!/bin/sh
# The static checks the pre-commit hook runs. Run it before you push: sh scripts/check.sh
# It runs every check, shows all the failures, and exits non-zero if any check failed.
#
# The last step needs Chrome (`nursery catalog` draws each scene headless). Without Chrome it says
# so and is skipped; the other steps still decide the exit status.
cd "$(dirname "$0")/.."

failed=0
step() {
    echo "== $*"
    "$@" || failed=1
}

have_chrome() {
    command -v google-chrome >/dev/null 2>&1 || command -v chromium >/dev/null 2>&1 ||
        command -v chromium-browser >/dev/null 2>&1 ||
        [ -x "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ]
}

# The scene files in docs/scenes/ must be what `nursery catalog` writes from the code now (they link
# to line numbers, so any edit to a scene or the kit can make them stale).
docs_fresh() {
    out="$(mktemp -d)"
    uv run nursery catalog --out "$out" >/dev/null &&
        diff -r -q "$out" docs/scenes ||
        { echo "docs/scenes/ is stale: run uv run nursery catalog and commit the result" >&2; rm -rf "$out"; return 1; }
    rm -rf "$out"
}

step uv run ruff check .
step uv run ruff format --check .
step sh scripts/biome.sh check .
step python3 scripts/check_js_imports.py
step uv run nursery brand --check
if have_chrome; then
    step docs_fresh
else
    echo "== docs_fresh: skipped, no Chrome found (run it where Chrome is installed)"
fi

if [ "$failed" -ne 0 ]; then
    echo "check: failed" >&2
    exit 1
fi
echo "check: passed"
