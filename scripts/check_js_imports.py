"""Checks the import boundaries of the JavaScript the nursery installs into omsync.

The rules, from AGENTS.md and the layout of src/nursery/assets/js/:

1. A module under assets/js/ imports only modules under assets/js/, by relative path, so the
   package stays self-contained. No bare names, no URLs.
2. A scene (js/scenes/) imports only kit/ modules. It does not import another scene.
3. A kit module (js/kit/) imports only other kit modules.

Run from anywhere: python3 scripts/check_js_imports.py. It needs only the standard library.
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JS = ROOT / "src" / "nursery" / "assets" / "js"

BLOCK_COMMENT = re.compile(r"/\*.*?\*/", re.DOTALL)
LINE_COMMENT = re.compile(r"^\s*//.*$", re.MULTILINE)
FROM = re.compile(r"""^\s*(?:import|export)\b[^;'"]*?\bfrom\s*(["'])([^"']+)\1""", re.MULTILINE)
SIDE_EFFECT = re.compile(r"""^\s*import\s*(["'])([^"']+)\1""", re.MULTILINE)
DYNAMIC = re.compile(r"""\bimport\s*\(\s*(["'])([^"']+)\1\s*\)""")
DYNAMIC_ANY = re.compile(r"\bimport\s*\(")


def specifiers(text: str) -> tuple[list[str], int]:
    """The module paths a file imports, and how many dynamic imports have no literal path."""
    text = LINE_COMMENT.sub("", BLOCK_COMMENT.sub("", text))
    found = [m.group(2) for m in [*FROM.finditer(text), *SIDE_EFFECT.finditer(text)]]
    literal = [m.group(2) for m in DYNAMIC.finditer(text)]
    return found + literal, len(DYNAMIC_ANY.findall(text)) - len(literal)


def problems_in(path: Path) -> list[str]:
    rel = path.relative_to(JS).as_posix()
    found, unreadable = specifiers(path.read_text(encoding="utf-8"))
    problems = []
    if unreadable:
        problems.append(
            f"{rel}: {unreadable} dynamic import(s) with a computed path; use a literal"
        )
    for spec in found:
        if not spec.startswith("."):
            problems.append(f"{rel}: imports {spec!r}; assets/js/ modules import only each other")
            continue
        target = (path.parent / spec).resolve()
        if not target.is_relative_to(JS):
            problems.append(f"{rel}: imports {spec!r}, which is outside src/nursery/assets/js/")
            continue
        if not target.is_file():
            problems.append(f"{rel}: imports {spec!r}, which does not exist")
            continue
        problems += layer_problems(rel, target.relative_to(JS).as_posix(), spec)
    return problems


def layer_problems(rel: str, target: str, spec: str) -> list[str]:
    if rel.startswith("scenes/") and not target.startswith("kit/"):
        return [f"{rel}: imports {spec!r}; a scene imports only kit/ modules, not {target}"]
    if rel.startswith("kit/") and not target.startswith("kit/"):
        return [f"{rel}: imports {spec!r}; a kit module imports only other kit modules"]
    return []


def main() -> int:
    files = sorted(JS.rglob("*.js"))
    if not files:
        print(f"check_js_imports: no JavaScript found under {JS}", file=sys.stderr)
        return 1
    problems = [p for path in files for p in problems_in(path)]
    for problem in problems:
        print(f"import boundary: {problem}", file=sys.stderr)
    if problems:
        return 1
    print(f"import boundaries hold in {len(files)} modules under assets/js/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
