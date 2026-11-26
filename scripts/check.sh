#!/bin/sh
# The static checks the pre-commit hook runs. Run it before you push: sh scripts/check.sh
# It runs every check, shows all the failures, and exits non-zero if any check failed.
cd "$(dirname "$0")/.."

failed=0
step() {
    echo "== $*"
    "$@" || failed=1
}

step uv run ruff check .
step uv run ruff format --check .
step sh scripts/biome.sh check .
step python3 scripts/check_js_imports.py
step python3 scripts/check_scenes.py
step uv run nursery scenes --check

if [ "$failed" -ne 0 ]; then
    echo "check: failed" >&2
    exit 1
fi
echo "check: passed"
