"""`nursery brand`: builds omsync's pixel mascot from its grid, with the standard library only.

The master is assets/brand/mascot-grid.txt. One run writes every brand file, so no copy can drift:

- assets/brand/mascot.svg: the mascot on its grid. The outline and eye use currentColor, and the
  body uses the --mascot-body variable (omsync sets it in its brand.css). The eye blinks with CSS.
- assets/brand/favicon.svg: the mascot on a white 32 x 32 tile, with fixed colours.
- assets/brand/favicon-32.png: the same tile as a PNG, drawn cell for cell.
- studio/app/brand/mark.js: the studio's mark (the mascot's head and trunk, with a Lucide sprout)
  for <n-logo>.
- studio/app/brand/favicon.svg: the same mark on a tile, for the studio's browser tab.

Grid characters: '#' is ink (the outline, the coin and the dollar sign), 'E' is the eye, and '.' is
paper. Paper that touches the grid edge, or that is reached from it through paper, is exterior and
is not drawn. The rest of the paper is body.

    nursery brand            write the files
    nursery brand --check    list the files that are not what the grid builds (exit 1)
"""

import json
import struct
import zlib
from collections import deque
from pathlib import Path

from nursery.assets import FAVICON_PNG, FAVICON_SVG, MASCOT_GRID, MASCOT_SVG
from nursery.paths import APP, ROOT

STUDIO_MARK_JS = APP / "brand" / "mark.js"
STUDIO_FAVICON_SVG = APP / "brand" / "favicon.svg"

COLS, ROWS = 32, 22
INK = "#0b0b0b"  # Sure's black token
BODY = "#d3d7d9"  # the app's --mascot-body variable takes over in the page
TILE_FILL = "#ffffff"
TILE = 32
TILE_RADIUS = 6
# The mascot is as wide as the tile and centred on its height, so it is drawn one cell per pixel.
TILE_ORIGIN = (0, (TILE - ROWS) // 2)
CLOSED_EYE_HEIGHT = 0.3  # the closed eye is a thin line across the middle of the open eye

# The studio's mark: the mascot cropped to its head and trunk (a viewBox in grid cells), with the
# studio's Lucide sprout planted in the trunk.
STUDIO_CROP = "-3.5 -7.5 24 24"
STUDIO_INK = "#1b1b19"  # the favicon's outline, where currentColor cannot follow a theme
STUDIO_GREEN = "#2f7d55"
SPROUT_PLACE = 'transform="translate(-4.600 -8.550) scale(0.55)"'
SPROUT_STROKE = 'fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'
SPROUT_PATHS = (
    '<path d="M7 20h10"/>'
    '<path d="M10 20c5.5-2.5.8-6.4 3-10"/>'
    '<path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2'
    ' 2.8-.5 4.4 0 5.5.8z"/>'
    '<path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>'
)

Kind = str | None  # "ink", "eye", "body", or None for exterior


def read_grid(path: Path) -> list[str]:
    rows = [line for line in path.read_text(encoding="utf-8").splitlines() if line]
    if len(rows) != ROWS or any(len(row) != COLS for row in rows):
        raise ValueError(f"{path} must hold {ROWS} rows of {COLS} characters")
    unknown = {char for row in rows for char in row} - set("#E.")
    if unknown:
        raise ValueError(f"{path} has unknown characters: {sorted(unknown)}")
    return rows


def exterior_cells(rows: list[str]) -> set[tuple[int, int]]:
    """The empty cells that connect to the grid's edge, so the mascot's inside is not among them."""
    exterior: set[tuple[int, int]] = set()
    queue: deque[tuple[int, int]] = deque()
    for y in range(ROWS):
        for x in range(COLS):
            on_edge = x in (0, COLS - 1) or y in (0, ROWS - 1)
            if on_edge and rows[y][x] == ".":
                exterior.add((x, y))
                queue.append((x, y))
    while queue:
        x, y = queue.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            inside = 0 <= nx < COLS and 0 <= ny < ROWS
            if inside and rows[ny][nx] == "." and (nx, ny) not in exterior:
                exterior.add((nx, ny))
                queue.append((nx, ny))
    return exterior


def classify(rows: list[str]) -> list[list[Kind]]:
    exterior = exterior_cells(rows)
    kinds: list[list[Kind]] = []
    for y in range(ROWS):
        line: list[Kind] = []
        for x in range(COLS):
            char = rows[y][x]
            if char == "#":
                line.append("ink")
            elif char == "E":
                line.append("eye")
            elif (x, y) in exterior:
                line.append(None)
            else:
                line.append("body")
        kinds.append(line)
    return kinds


def runs(kinds: list[list[Kind]], wanted: str) -> list[tuple[int, int, int]]:
    """Horizontal runs of one kind, as (x, y, width). Each run is one rectangle in the SVG."""
    found = []
    for y, line in enumerate(kinds):
        x = 0
        while x < COLS:
            if line[x] == wanted:
                start = x
                while x < COLS and line[x] == wanted:
                    x += 1
                found.append((start, y, x - start))
            else:
                x += 1
    return found


def eye_block(kinds: list[list[Kind]]) -> tuple[int, int, int, int]:
    """The eye's bounding box as (x, y, width, height), in cells."""
    cells = [(x, y) for y, line in enumerate(kinds) for x, kind in enumerate(line) if kind == "eye"]
    if not cells:
        raise ValueError("the grid has no eye cells (E)")
    xs = [x for x, _ in cells]
    ys = [y for _, y in cells]
    return min(xs), min(ys), max(xs) - min(xs) + 1, max(ys) - min(ys) + 1


def rect(x: float, y: float, width: float, height: float, extra: str = "") -> str:
    return f'<rect x="{x:g}" y="{y:g}" width="{width:g}" height="{height:g}"{extra}/>'


def layers(kinds: list[list[Kind]], ink: str) -> list[str]:
    """The mascot's four layers as SVG: body, outline, open eye and the closed eye. The outline and
    eye take `ink` as their fill; the body fill is the BODY attribute (CSS may override it)."""
    body = "".join(rect(x, y, w, 1) for x, y, w in runs(kinds, "body"))
    lines = "".join(rect(x, y, w, 1) for x, y, w in runs(kinds, "ink"))
    eye = "".join(rect(x, y, w, 1) for x, y, w in runs(kinds, "eye"))
    x, y, w, h = eye_block(kinds)
    # The closed eye is hidden by its opacity attribute until the CSS blink runs it.
    closed = rect(
        x,
        round(y + h / 2 - CLOSED_EYE_HEIGHT / 2, 3),
        w,
        CLOSED_EYE_HEIGHT,
        ' class="mascot-eye-closed" opacity="0"',
    )
    return [
        f'<g class="mascot-body" fill="{BODY}">{body}</g>',
        f'<g fill="{ink}">{lines}</g>',
        f'<g class="mascot-eye" fill="{ink}">{eye}</g>',
        closed,
    ]


def mascot_svg(kinds: list[list[Kind]]) -> str:
    """The reusable mascot. Colours come from CSS: currentColor and the body variable."""
    parts = "\n".join(layers(kinds, "currentColor"))
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {COLS} {ROWS}" '
        'shape-rendering="crispEdges">\n'
        f"{parts}\n"
        "</svg>\n"
    )


def colour_for(kind: Kind) -> str | None:
    return {"ink": INK, "eye": INK, "body": BODY}.get(kind or "")


def favicon_svg(kinds: list[list[Kind]]) -> str:
    """The favicon: the same cells with fixed colours, on a rounded white tile."""
    ox, oy = TILE_ORIGIN
    parts = [rect(0, 0, TILE, TILE, f' rx="{TILE_RADIUS}" fill="{TILE_FILL}"')]
    for wanted, colour in (("body", BODY), ("ink", INK), ("eye", INK)):
        cells = "".join(rect(x + ox, y + oy, w, 1) for x, y, w in runs(kinds, wanted))
        parts.append(f'<g fill="{colour}">{cells}</g>')
    body = "\n".join(parts)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {TILE} {TILE}" '
        'shape-rendering="crispEdges">\n'
        f"{body}\n"
        "</svg>\n"
    )


def hex_rgb(colour: str) -> tuple[int, int, int]:
    value = int(colour.lstrip("#"), 16)
    return (value >> 16) & 255, (value >> 8) & 255, value & 255


def in_tile(x: int, y: int) -> bool:
    """False in the four corners outside the rounded tile."""
    cx = min(max(x + 0.5, TILE_RADIUS), TILE - TILE_RADIUS)
    cy = min(max(y + 0.5, TILE_RADIUS), TILE - TILE_RADIUS)
    return (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= TILE_RADIUS**2


def favicon_png(kinds: list[list[Kind]]) -> bytes:
    ox, oy = TILE_ORIGIN
    raw = bytearray()
    for y in range(TILE):
        raw.append(0)  # filter type: none
        for x in range(TILE):
            if not in_tile(x, y):
                raw += bytes((0, 0, 0, 0))
                continue
            gx, gy = x - ox, y - oy
            kind = kinds[gy][gx] if 0 <= gx < COLS and 0 <= gy < ROWS else None
            colour = colour_for(kind) or TILE_FILL
            raw += bytes((*hex_rgb(colour), 255))

    def chunk(kind: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(kind + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", crc)

    header = struct.pack(">IIBBBBB", TILE, TILE, 8, 6, 0, 0, 0)  # 8-bit RGBA
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", header)
        + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + chunk(b"IEND", b"")
    )


def studio_mark(kinds: list[list[Kind]]) -> str:
    """The studio's mark, as the inside of an <svg viewBox=STUDIO_CROP>: the outline follows the
    text colour and the sprout the studio's --accent, in either theme."""
    mascot = "".join(layers(kinds, "currentColor"))
    sprout = f'<g class="sprout" {SPROUT_PLACE} {SPROUT_STROKE}>{SPROUT_PATHS}</g>'
    return f'<g shape-rendering="crispEdges">{mascot}</g>{sprout}'


def studio_mark_js(kinds: list[list[Kind]]) -> str:
    return (
        "// Generated by `nursery brand` from assets/brand/mascot-grid.txt. Do not edit.\n"
        "// The Nursery Studio's mark: the mascot cropped to its head and raised trunk, with the\n"
        "// studio's sprout planted in the trunk. <n-logo> draws it.\n"
        f"export const VIEWBOX = {json.dumps(STUDIO_CROP)};\n"
        f"export const MARK = {json.dumps(studio_mark(kinds))};\n"
    )


def studio_favicon(kinds: list[list[Kind]]) -> str:
    """The studio's mark on a tile, with fixed colours, for the browser tab."""
    mascot = "".join(layers(kinds, STUDIO_INK))
    sprout = f'<g stroke="{STUDIO_GREEN}" {SPROUT_PLACE} {SPROUT_STROKE}>{SPROUT_PATHS}</g>'
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28">\n'
        '<rect x="0.5" y="0.5" width="27" height="27" rx="6" fill="#ffffff" stroke="#cfcfc7" '
        'stroke-width="1"/>\n'
        f'<svg x="2" y="2" width="24" height="24" viewBox="{STUDIO_CROP}" overflow="hidden">\n'
        f'<g shape-rendering="crispEdges">{mascot}</g>{sprout}\n'
        "</svg>\n"
        "</svg>\n"
    )


def outputs() -> dict[Path, bytes]:
    """Every brand file the grid builds, by path."""
    kinds = classify(read_grid(MASCOT_GRID))
    return {
        MASCOT_SVG: mascot_svg(kinds).encode(),
        FAVICON_SVG: favicon_svg(kinds).encode(),
        FAVICON_PNG: favicon_png(kinds),
        STUDIO_MARK_JS: studio_mark_js(kinds).encode(),
        STUDIO_FAVICON_SVG: studio_favicon(kinds).encode(),
    }


def stale() -> list[Path]:
    """The brand files that are missing or differ from what the grid builds."""
    return [p for p, data in outputs().items() if not p.is_file() or p.read_bytes() != data]


def main(argv: list[str] | None = None) -> int:
    check = "--check" in (argv or [])
    if check:
        old = stale()
        for path in old:
            print(f"stale: {path.relative_to(ROOT)}")
        if old:
            print("run `uv run nursery brand` to build them from the grid")
        else:
            print("the brand files match the grid")
        return 1 if old else 0
    for path, data in outputs().items():
        changed = not path.is_file() or path.read_bytes() != data
        if changed:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
        print(f"{'wrote' if changed else 'same '} {path.relative_to(ROOT)}")
    return 0
