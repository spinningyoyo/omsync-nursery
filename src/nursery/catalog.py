"""Catalogue the pixel-art scenes: run every scene through stages 0-8 and check all sprites.

    uv run nursery catalog [--only ID,ID] [--out DIR]

The page (catalog_page/index.html and catalog.js) loads the scene modules directly in headless
Chrome, samples each scene at 90, 160 and 240 px wide, draws every plant kind, species and cast
sprite to check that it draws, and runs a real Nursery seeded with a fixed seed per scene and theme
through stages 0 to 8 in light and dark. Pass `--out DIR` to write stable (line-number-free)
markdown tables for regression comparison.
"""

import argparse
import contextlib
import json
import os
import shutil
import signal
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from nursery.headless import new_driver, wait_for
from nursery.paths import JS_DIR, ROOT, SHARED, module_path, scene_labels

SPRITES_JS = SHARED / "sprites.js"
PAGE_DIR = Path(__file__).resolve().parent / "catalog_page"
SCENE_LABELS = scene_labels()
SCENE_IDS = tuple(SCENE_LABELS)
LAYER_ORDER = ("far", "middle", "near")
VIEWPORT = (960, 480)  # 240 x 120 art pixels at P = 4


@dataclass
class Run:
    scene_ids: tuple[str, ...] = SCENE_IDS
    scenes_dir: Path | None = None
    narrowed: bool = False


RUN = Run()


def free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def start_server(site: Path, port: int, log_path: Path) -> subprocess.Popen:
    """Serve the temporary site in its own process group. Stopped by its pid, never by name."""
    with log_path.open("w", encoding="utf-8") as log:
        return subprocess.Popen(
            [sys.executable, "-m", "http.server", str(port), "--bind", "127.0.0.1"],
            cwd=site,
            stdout=log,
            stderr=subprocess.STDOUT,
            start_new_session=True,
        )


def wait_for_server(proc: subprocess.Popen, url: str, timeout: float = 30) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if proc.poll() is not None:
            raise RuntimeError("http.server exited early")
        try:
            with urllib.request.urlopen(url, timeout=2) as response:
                if response.status == 200:
                    return
        except OSError:
            pass
        time.sleep(0.2)
    raise RuntimeError(f"http.server did not answer {url}")


def stop_server(proc: subprocess.Popen) -> None:
    with contextlib.suppress(ProcessLookupError):
        os.killpg(proc.pid, signal.SIGTERM)
    try:
        proc.wait(timeout=20)
    except subprocess.TimeoutExpired:
        os.killpg(proc.pid, signal.SIGKILL)
        proc.wait()


def set_viewport(driver: Any, width: int, height: int) -> None:
    driver.set_window_size(width, height)
    inner = driver.execute_script("return [window.innerWidth, window.innerHeight]")
    if inner != [width, height]:
        driver.set_window_size(width + (width - inner[0]), height + (height - inner[1]))


def describe(text: str) -> str:
    header = []
    for line in text.splitlines():
        if not line.startswith("//"):
            break
        header.append(line[2:].strip())
    return " ".join(header).split(". ")[0].rstrip(".") + "."


def layers_text(layers: list[str]) -> str:
    return " / ".join(name for name in LAYER_ORDER if name in layers)


def counts_text(counts: dict[str, int]) -> str:
    return " / ".join(str(counts.get(str(cols), 0)) for cols in (90, 160, 240))


def first_text(stat: list[int]) -> str:
    low, high = stat
    return str(low) if low == high else f"{low}-{high}"


def poses(sid: str, stems: list[str], drawn: set[str]) -> str:
    return ", ".join(
        f"`{stem}`" + ("" if f"{sid}-{stem}" in drawn else " (not drawn)") for stem in stems
    )


def first_stage_text(el: dict, data: dict) -> str:
    presence = el.get("presence") or []
    if presence:
        seen = [(data["presence"][key], key) for key in presence if key in data["presence"]]
        if not seen:
            return "never in the run"
        return ", ".join(f"{stage} (`{key}`)" for stage, key in seen)
    return str(el.get("arrives", 0))


def count_text(el: dict) -> str:
    if el.get("fixed"):
        return el["fixed"]
    presence = el.get("presence") or []
    if presence:
        n = len(presence)
        return f"{n} instance" + ("" if n == 1 else "s")
    return "1"


def timeline_rows(data: dict) -> list[str]:
    stages: dict[int, dict[str, list[str]]] = {
        s: {"plants": [], "animals": [], "effects": []} for s in range(9)
    }
    for kind, stat in data["inventory"].items():
        stages[stat["first"][0]]["plants"].append(kind)
    for el in data["cast"]:
        bucket = "effects" if el["kind"] == "effect" else "animals"
        presence = el.get("presence") or []
        if presence:
            for key in presence:
                if key in data["presence"]:
                    stages[data["presence"][key]][bucket].append(f"{el['label']} (`{key}`)")
        elif el.get("sea"):
            sea_rows = int(el["sea"])
            for s in (1, 2, 3):
                ease = min(1.0, s / 3) ** 2 * (3 - 2 * min(1.0, s / 3))
                stages[s]["effects"].append(f"sea to {round(ease * sea_rows)} rows")
        else:
            stages[el.get("arrives", 0)][bucket].append(el["label"])
    rows = []
    for s, parts in stages.items():
        plants = ", ".join(parts["plants"]) or ("none (bare soil)" if s == 0 else "none")
        animals = ", ".join(parts["animals"]) or "none"
        effects = ", ".join(parts["effects"]) or "none"
        rows.append(f"| {s} | {plants} | {animals} | {effects} |")
    return rows


def scene_markdown(sid: str, data: dict) -> str:
    text = module_path(sid).read_text(encoding="utf-8")
    drawn = set(data["drawn"])
    out = [
        f"# {SCENE_LABELS[sid]}",
        "",
        f"{describe(text)} Source: `src/nursery/assets/js/scenes/{sid}.js`.",
        "",
        "## Stage timeline",
        "",
        "| Stage | New plants | New animals | Effects |",
        "| --- | --- | --- | --- |",
        *timeline_rows(data),
        "",
        "## Elements",
        "",
        "| Element | Kind | First stage | Count at 90 / 160 / 240 px | Layer |",
        "| --- | --- | --- | --- | --- |",
    ]
    for kind, stat in sorted(data["inventory"].items()):
        out.append(
            f"| **{kind}** | plant | {first_text(stat['first'])} | "
            f"{counts_text(stat['counts'])} | {layers_text(stat['layers'])} |"
        )
        for species, sub in sorted(stat["species"].items()):
            out.append(
                f"| &nbsp;&nbsp;{kind}: {species} | plant | {first_text(sub['first'])} | "
                f"{counts_text(sub['counts'])} | {layers_text(sub['layers'])} |"
            )
    for el in data["cast"]:
        stems = el.get("sprites") or []
        layer = el.get("layer", "in front of the plants")
        out.append(
            f"| {el['label']} ({poses(sid, stems, drawn)}) | {el['kind']} | "
            f"{first_stage_text(el, data)} | {count_text(el)} (any width) | {layer} |"
        )
    out.append("")
    if data["errors"]:
        out.append("Not drawn: " + "; ".join(data["errors"]) + ".")
        out.append("")
    return "\n".join(out).rstrip() + "\n"


def write_scene_files(result: dict) -> None:
    if RUN.scenes_dir is None:
        return
    files = {
        RUN.scenes_dir / f"{sid}.md": scene_markdown(sid, result["scenes"][sid])
        for sid in RUN.scene_ids
    }
    RUN.scenes_dir.mkdir(parents=True, exist_ok=True)
    for path, content in files.items():
        path.write_text(content, encoding="utf-8")
        print(f"catalogue written to {shown(path)}")
    if not RUN.narrowed:
        for path in sorted(RUN.scenes_dir.glob("*.md")):
            if path not in files:
                path.unlink()
                print(f"removed stale {shown(path)}")


def check_names(result: dict) -> None:
    for sid in RUN.scene_ids:
        data = result["scenes"][sid]
        drawn = set(data["drawn"])
        for el in data["cast"]:
            for stem in el.get("sprites") or []:
                name = f"{sid}-{stem}"
                if name not in drawn:
                    print(f"warning: {name} was not drawn ({el['label']})", file=sys.stderr)
        for kind in data["inventory"]:
            if f"{sid}-{kind}" not in drawn:
                print(f"warning: {sid}-{kind} was not drawn", file=sys.stderr)


def run_page(base: str) -> dict:
    driver = new_driver(hide_scrollbars=True)
    try:
        set_viewport(driver, *VIEWPORT)
        query = f"?ids={','.join(RUN.scene_ids)}" if RUN.narrowed else ""
        driver.get(f"{base}/index.html{query}")
        status = wait_for(driver, "window.__status !== 'running' && window.__status", 900, 1)
        if status != "done":
            raise RuntimeError(f"catalogue page failed: {status}")
        viewport = driver.execute_script("return [window.innerWidth, window.innerHeight]")
        if list(viewport) != list(VIEWPORT):
            raise RuntimeError(f"viewport was {viewport}, expected {list(VIEWPORT)}")
        return json.loads(driver.execute_script("return JSON.stringify(window.__result)"))
    finally:
        driver.quit()


def shown(path: Path) -> Path:
    try:
        return path.relative_to(ROOT)
    except ValueError:
        return path


def parse_args(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="nursery catalog", description="Catalogue the scenes.")
    parser.add_argument("--only", help="scene ids to run, comma-separated (default: all)")
    parser.add_argument("--out", type=Path, help="write scene tables to DIR/<id>.md")
    args = parser.parse_args(argv)
    if args.only:
        ids = tuple(args.only.split(","))
        unknown = [sid for sid in ids if sid not in SCENE_IDS]
        if unknown:
            parser.error(f"unknown scene ids: {', '.join(unknown)}")
        RUN.scene_ids = ids
        RUN.narrowed = True
    if args.out:
        RUN.scenes_dir = args.out.resolve()


def main(argv: list[str] | None = None) -> None:
    parse_args(argv)
    tmp = Path(tempfile.mkdtemp(prefix="nursery-catalog-"))
    site = tmp / "site"
    site.mkdir()
    (site / "js").symlink_to(JS_DIR)
    shutil.copy(SPRITES_JS, site / "sprites.js")
    shutil.copy(PAGE_DIR / "index.html", site / "index.html")
    shutil.copy(PAGE_DIR / "catalog.js", site / "catalog.js")
    port = free_port()
    base = f"http://127.0.0.1:{port}"
    log_path = tmp / "http.log"
    server = start_server(site, port, log_path)
    try:
        wait_for_server(server, f"{base}/index.html")
        print("Running the catalogue page in headless Chrome.")
        result = run_page(base)
    finally:
        stop_server(server)
        shutil.rmtree(tmp, ignore_errors=True)
    for sid in RUN.scene_ids:
        data = result["scenes"][sid]
        print(
            f"{sid}: stage-0 pixels above soil (light, dark): "
            f"{data['soil']['light'][0]}, {data['soil']['dark'][0]}"
        )
        print(f"  first stages seen: {data['presence']}")
        for error in data["errors"]:
            print(f"  sprite error: {error}")
    check_names(result)
    write_scene_files(result)
