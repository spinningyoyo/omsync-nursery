"""Render forest scenes or a sprite sheet with the real engine in headless Chrome.

    uv run python .claude/skills/forest-scene/preview.py scene OUT SCENE[,SCENE] [W H] [QUERY]
    uv run python .claude/skills/forest-scene/preview.py sheet OUT SPEC.js

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
import sys
import tempfile
import threading
import time
from pathlib import Path

from selenium import webdriver

HERE = Path(__file__).resolve().parent
JS = HERE.parents[2] / "src" / "omsync" / "web" / "static" / "js"


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def collect(driver):
    for _ in range(600):
        result = driver.execute_script("return window.result || null")
        if result:
            return result
        time.sleep(0.1)
    raise SystemExit("the page never finished (a syntax error in a module?)")


def main():
    mode, out = sys.argv[1], Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    site = Path(tempfile.mkdtemp())
    (site / "js").symlink_to(JS)
    for name in ("scene.html", "sheet.html"):
        shutil.copy(HERE / name, site / name)
    if mode == "sheet":
        shutil.copy(Path(sys.argv[3]), site / "spec.js")
    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(Quiet, directory=str(site))
    )
    threading.Thread(target=server.serve_forever, daemon=True).start()
    options = webdriver.ChromeOptions()
    options.add_argument("--headless=new")
    options.add_argument("--force-device-scale-factor=1")
    driver = webdriver.Chrome(options=options)
    base = f"http://127.0.0.1:{server.server_port}"
    try:
        if mode == "sheet":
            driver.get(f"{base}/sheet.html?spec=spec.js")
            pages = [collect(driver)]
        else:
            w, h = (int(sys.argv[4]), int(sys.argv[5])) if len(sys.argv) > 5 else (960, 480)
            query = sys.argv[6] if len(sys.argv) > 6 else ""
            driver.set_window_size(w, h)
            inner = driver.execute_script("return [innerWidth, innerHeight]")
            driver.set_window_size(2 * w - inner[0], 2 * h - inner[1])
            pages = []
            for scene in sys.argv[3].split(","):
                driver.get(f"{base}/scene.html?scene={scene}&{query}")
                pages.append(collect(driver))
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


if __name__ == "__main__":
    main()
