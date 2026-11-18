"""`nursery brand`: the mascot's grid builds the mascot, the favicons and the studio's mark."""

import re
import struct
import zlib
from pathlib import Path

from conftest import nursery_cli

BRAND = Path("src/nursery/assets/brand")
GRID = BRAND / "mascot-grid.txt"
BUILT = [
    BRAND / "mascot.svg",
    BRAND / "favicon.svg",
    BRAND / "favicon-32.png",
    Path("src/nursery/studio/app/brand/mark.js"),
    Path("src/nursery/studio/app/brand/favicon.svg"),
]


def png_pixels(data: bytes) -> tuple[int, int, list[list[tuple[int, int, int, int]]]]:
    """Width, height and the 8-bit RGBA pixels of a PNG that `nursery brand` writes (no filters)."""
    assert data[:8] == b"\x89PNG\r\n\x1a\n"
    chunks, at = {}, 8
    while at < len(data):
        (size,) = struct.unpack(">I", data[at : at + 4])
        kind = data[at + 4 : at + 8]
        body = data[at + 8 : at + 8 + size]
        assert (
            zlib.crc32(kind + body) == struct.unpack(">I", data[at + 8 + size : at + 12 + size])[0]
        )
        chunks[kind] = chunks.get(kind, b"") + body
        at += 12 + size
    width, height, depth, colour, *_ = struct.unpack(">IIBBBBB", chunks[b"IHDR"])
    assert (depth, colour) == (8, 6)
    raw = zlib.decompress(chunks[b"IDAT"])
    stride = 1 + width * 4
    rows = []
    for y in range(height):
        row = raw[y * stride : (y + 1) * stride]
        assert row[0] == 0
        rows.append([tuple(row[1 + x * 4 : 5 + x * 4]) for x in range(width)])
    return width, height, rows


def test_the_brand_files_of_the_repository_match_the_grid(repo: Path) -> None:
    done = nursery_cli(repo, "brand", "--check")
    assert done.returncode == 0, done.stdout + done.stderr
    assert "match the grid" in done.stdout
    assert "stale" not in done.stdout


def test_the_built_files_have_the_mascots_size_and_colours(repo: Path) -> None:
    mascot = (repo / BUILT[0]).read_text(encoding="utf-8")
    assert 'viewBox="0 0 32 22"' in mascot
    assert "currentColor" in mascot  # the outline follows the page's text colour
    assert "--mascot-body" not in mascot  # the body colour is a fill that the host's CSS replaces
    assert 'class="mascot-body"' in mascot
    assert 'class="mascot-eye-closed"' in mascot

    favicon = (repo / BUILT[1]).read_text(encoding="utf-8")
    assert 'viewBox="0 0 32 32"' in favicon
    assert "currentColor" not in favicon  # a favicon has no page colours to follow

    width, height, rows = png_pixels((repo / BUILT[2]).read_bytes())
    assert (width, height) == (32, 32)
    assert rows[0][0][3] == 0  # the tile's corner is rounded away
    assert rows[16][16][3] == 255
    colours = {pixel for row in rows for pixel in row}
    assert (0x0B, 0x0B, 0x0B, 255) in colours  # the outline
    assert (0xD3, 0xD7, 0xD9, 255) in colours  # the body
    assert (255, 255, 255, 255) in colours  # the tile
    # The PNG is the same picture as the SVG, cell for cell: one body cell in the grid is one here.
    grid = [line for line in (repo / GRID).read_text(encoding="utf-8").splitlines() if line]
    inks = sum(line.count("#") + line.count("E") for line in grid)
    assert sum(1 for row in rows for pixel in row if pixel[:3] == (0x0B, 0x0B, 0x0B)) == inks


def test_a_changed_grid_makes_the_check_fail_and_brand_fixes_it(repo: Path) -> None:
    grid = (repo / GRID).read_text(encoding="utf-8")
    first_ink = grid.index("#")
    (repo / GRID).write_text(grid[:first_ink] + "." + grid[first_ink + 1 :], encoding="utf-8")
    before = {path: (repo / path).read_bytes() for path in BUILT}

    stale = nursery_cli(repo, "brand", "--check")
    assert stale.returncode == 1
    for path in BUILT:
        assert f"stale: {path}" in stale.stdout
    assert "run `uv run nursery brand`" in stale.stdout
    assert {path: (repo / path).read_bytes() for path in BUILT} == before  # --check changes nothing

    built = nursery_cli(repo, "brand")
    assert built.returncode == 0, built.stderr
    for path in BUILT:
        assert f"wrote {path}" in built.stdout
        assert (repo / path).read_bytes() != before[path]

    assert nursery_cli(repo, "brand", "--check").returncode == 0
    again = nursery_cli(repo, "brand")
    assert again.returncode == 0
    assert "wrote" not in again.stdout  # nothing left to write
    assert again.stdout.count("same ") == len(BUILT)


def test_a_hand_edited_or_missing_brand_file_is_stale(repo: Path) -> None:
    original = (repo / BUILT[0]).read_bytes()
    (repo / BUILT[0]).write_text("<svg/>", encoding="utf-8")
    (repo / BUILT[2]).unlink()
    done = nursery_cli(repo, "brand", "--check")
    assert done.returncode == 1
    assert f"stale: {BUILT[0]}" in done.stdout
    assert f"stale: {BUILT[2]}" in done.stdout
    assert f"stale: {BUILT[1]}" not in done.stdout

    assert nursery_cli(repo, "brand").returncode == 0
    assert (repo / BUILT[0]).read_bytes() == original
    assert (repo / BUILT[2]).is_file()


def test_the_closed_eye_is_a_thin_line_across_the_open_eye(repo: Path) -> None:
    mascot = (repo / BUILT[0]).read_text(encoding="utf-8")
    eye = re.findall(
        r'<rect x="(\d+)" y="(\d+)" width="(\d+)" height="1"/>', mascot.split("mascot-eye")[1]
    )
    xs = [int(x) for x, _, _ in eye]
    ys = [int(y) for _, y, _ in eye]
    closed = re.search(
        r'<rect x="(\d+)" y="([\d.]+)" width="(\d+)" height="([\d.]+)"'
        r' class="mascot-eye-closed" opacity="0"/>',
        mascot,
    )
    assert closed
    x, y, width, height = (float(g) for g in closed.groups())
    assert x == min(xs)
    assert width == max(xs) + 1 - min(xs)
    assert height == 0.3
    assert min(ys) < y < max(ys) + 1  # inside the open eye's rows


def test_a_grid_of_the_wrong_size_or_with_unknown_cells_is_refused(repo: Path) -> None:
    grid = (repo / GRID).read_text(encoding="utf-8")
    for broken, reason in (
        (grid.replace("\n", "", 1)[:-40], "must hold 22 rows of 32 characters"),
        (grid.replace("#", "x", 1), "unknown characters"),
        (grid.replace("E", "."), "no eye cells"),
    ):
        (repo / GRID).write_text(broken, encoding="utf-8")
        done = nursery_cli(repo, "brand", "--check")
        assert done.returncode != 0
        assert reason in done.stderr
