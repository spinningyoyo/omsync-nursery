"""Render scenes or a sprite sheet with the real engine in headless Chrome.

    uv run nursery preview scene OUT SCENE[,SCENE] [W H] [QUERY]
    uv run nursery preview sheet OUT SPEC.js

`scene` grows each scene to stage 8 (QUERY: stage=, secs=, shots=0,5 extra seconds per frame,
themes=light,dark, zoom=) and writes OUT/<scene>-<theme>-<shot>.png, printing which animals are
active. `sheet` imports SPEC.js (exports name, items [{label, scene, pal?, draw(g)}], optional per,
zoom, cell) and writes OUT/<name>-light.png and -dark.png. Each run serves a temporary site whose
js/ links to the repository's modules.
"""

import base64
import functools
import http.server
import shutil
import tempfile
import threading
from pathlib import Path

from nursery.headless import new_driver, wait_for
from nursery.paths import JS_DIR as JS

HERE = Path(__file__).resolve().parent


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def collect(driver):
    result = wait_for(driver, "window.result", timeout=60)
    if result is None:
        raise SystemExit("the page never finished (a syntax error in a module?)")
    return result


def load_sheet(driver, base: str) -> list:
    driver.get(f"{base}/sheet.html?spec=spec.js")
    return [collect(driver)]


def load_scenes(driver, base: str, argv: list[str]) -> list:
    """Size the window so the page's viewport is exactly the asked size, then draw each scene."""
    w, h = (int(argv[3]), int(argv[4])) if len(argv) > 4 else (960, 480)
    query = argv[5] if len(argv) > 5 else ""
    driver.set_window_size(w, h)
    inner = driver.execute_script("return [innerWidth, innerHeight]")
    driver.set_window_size(2 * w - inner[0], 2 * h - inner[1])
    pages = []
    for scene in argv[2].split(","):
        driver.get(f"{base}/scene.html?scene={scene}&{query}")
        pages.append(collect(driver))
    return pages


def main(argv: list[str]) -> None:
    if len(argv) < 3 or argv[0] not in ("scene", "sheet"):
        raise SystemExit(__doc__)
    mode, out = argv[0], Path(argv[1])
    out.mkdir(parents=True, exist_ok=True)
    site = Path(tempfile.mkdtemp())
    (site / "js").symlink_to(JS)
    for name in ("scene.html", "sheet.html"):
        shutil.copy(HERE / name, site / name)
    if mode == "sheet":
        shutil.copy(Path(argv[2]), site / "spec.js")
    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(Quiet, directory=str(site))
    )
    threading.Thread(target=server.serve_forever, daemon=True).start()
    driver = new_driver()
    base = f"http://127.0.0.1:{server.server_port}"
    try:
        pages = load_sheet(driver, base) if mode == "sheet" else load_scenes(driver, base, argv)
        for result in pages:
            if isinstance(result, dict):
                raise SystemExit(result["error"])
            for item in result:
                (out / f"{item['name']}.png").write_bytes(
                    base64.b64decode(item["url"].split(",", 1)[1])
                )
                print(item["name"], item.get("probe", ""))
        for entry in driver.get_log("browser"):
            if entry["level"] == "SEVERE" and "favicon" not in entry["message"]:
                print("console:", entry["message"][:300])
    finally:
        driver.quit()
        server.shutdown()
        shutil.rmtree(site)
