"""The Nursery Studio's server and its headless commands (see nursery.cli for the commands).

The studio draws every plant, animal, bird and effect of a scene from the repository's modules,
in light and dark and in each animation frame, beside the live scene. Clicking a sprite opens the
pixel editor. Saving an edit writes a patch to .nursery/<scene>/edits/ (git ignores it):
<name>.json lists every changed pixel with its palette keys, and <name>.png shows the original,
the edit and the changed pixels. The drawing code is then changed to match the patch. The first
save in a scene also records a baseline of all its sprites, so the studio can show which other
sprites a code change moved.

`check` loads the studio in headless Chrome and compares each saved edit with what the code draws
now: waiting (the code still draws the original), in code (it draws the edit exactly) or differs,
with the pixels that differ. It also lists sprites that changed since the baseline without an
edit, and writes a picture of each problem to .nursery/<scene>/check/.

Agents propose new or changed art as a module in .nursery/<scene>/proposals/<name>.js (the
nursery-scene skill documents its shape). The studio notices it within a few seconds and shows it
for review. The user's choice and notes are saved as <name>.review.json, and pixel edits on a
proposal frame in <name>.edits/. `render` draws a proposal headless into <name>.sheet.png for its
author to check, and `proposals` prints the reviews and edits.

Pages are served with no caching, so a reload shows the code as it is on disk. The modules come
from js/; the scene copies (painters exported) and the poses in studio/shared/sprites.js are shared
with nursery.catalog.
"""

import base64
import errno
import hashlib
import http.server
import importlib
import json
import re
import shutil
import subprocess
import threading
import time
from pathlib import Path
from urllib.parse import urlparse

from nursery import brand, catalog, catalog_elements
from nursery.headless import studio_result
from nursery.launcher import open_app
from nursery.paths import (
    APP,
    BRAND_DIR,
    CSS_DIR,
    JS_DIR,
    ROOT,
    SCENES_JSON,
    SHARED,
    STORE,
    STUDIO,
    module_path,
)

NAME = re.compile(r"^[\w.-]+$")
PROPOSAL = re.compile(r"^[\w-]+$")
TYPES = {
    ".js": "text/javascript",
    ".html": "text/html",
    ".json": "application/json",
    ".css": "text/css",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".txt": "text/plain; charset=utf-8",
}


def scene_module(sid: str) -> str:
    """The scene module with its imports rewritten and its painters and animals exported."""
    if sid not in catalog.SCENE_IDS:
        raise KeyError(sid)
    text = module_path(sid).read_text()
    return catalog.exported_copy(text)


def head_file(path: Path) -> str | None:
    """A file as it is in the last commit, or None when it is new or git is missing."""
    try:
        done = subprocess.run(
            ["git", "-C", str(ROOT), "show", f"HEAD:{path.relative_to(ROOT).as_posix()}"],
            capture_output=True,
            check=True,
        )
    except (OSError, subprocess.CalledProcessError, ValueError):
        return None
    return done.stdout.decode()


def head_scene_module(sid: str) -> str | None:
    """The scene module as last committed, rewritten and exported like scene_module."""
    if sid not in catalog.SCENE_IDS:
        raise KeyError(sid)
    text = head_file(module_path(sid))
    if text is None:
        return None
    return catalog.exported_copy(text)


def version() -> str:
    """A fingerprint of the code the studio draws and runs, so an open studio can reload itself
    when any of it changes on disk."""
    digest = hashlib.sha256()
    code = Path(catalog.__file__).parent
    watched = [JS_DIR, CSS_DIR, BRAND_DIR, STUDIO, SCENES_JSON, *code.glob("catalog*")]
    for root in watched:
        files = [root] if root.is_file() else sorted(root.rglob("*"))
        for path in files:
            if path.is_file() and "__pycache__" not in path.parts:
                digest.update(f"{path}:{path.stat().st_mtime_ns}".encode())
    return digest.hexdigest()[:16]


def where(path: Path, pattern: str) -> dict | None:
    """The first line of a module that matches, as a path from the repository root and a line."""
    lines = catalog.find_lines(path.read_text(), pattern)
    if not lines:
        return None
    return {"path": str(path.relative_to(ROOT)), "line": lines[0]}


def meta() -> dict:
    """The scenes, each element's label, kind, sprites and drawing function, and each painter."""
    # The catalogue is read afresh each time, so a studio that reloaded after a change sees an
    # element list that changed after the server started.
    importlib.reload(catalog_elements)
    importlib.reload(catalog)
    scenes = []
    for sid in catalog.SCENE_IDS:
        path = module_path(sid)
        text = path.read_text()
        elements = []
        for el in catalog_elements.ELEMENTS[sid]:
            module = module_path(el.module) if el.module else path
            found = None
            if el.fn:
                found = where(module, rf"^(export )?function {el.fn}\(")
            if not found and el.draw:
                found = where(path, el.draw[0])
            elements.append(
                {
                    "label": el.label,
                    "kind": el.kind,
                    "sprites": list(el.sprites),
                    "fn": el.fn,
                    "layer": el.layer,
                    "where": found,
                }
            )
        painters = {}
        for kind, fn in catalog.paint_kinds(text).items():
            painters[kind] = {"fn": fn, "where": where(path, rf"^function {fn}\(")}
        scenes.append(
            {
                "id": sid,
                "path": str(path.relative_to(ROOT)),
                "elements": elements,
                "painters": painters,
            }
        )
    return {"scenes": scenes}


def scene_dir(sid: str) -> Path:
    """A scene's folder in .nursery. The mascot has one too, though it is not a scene. This and
    check() are the server's two places that single the mascot out; /api/brand serves the rest."""
    if sid != brand.BRAND_ID and sid not in catalog.SCENE_IDS:
        raise KeyError(sid)
    return STORE / sid


def read_edits(folder: Path) -> list[dict]:
    return [json.loads(p.read_text()) for p in sorted(folder.glob("*.json"))]


def proposals(sid: str, with_edits: bool) -> list[dict]:
    """A scene's proposals: name, modified time, the review if any, and the pixel edits."""
    folder = scene_dir(sid) / "proposals"
    out = []
    for path in sorted(folder.glob("*.js")):
        if not PROPOSAL.match(path.stem):
            continue
        review = folder / f"{path.stem}.review.json"
        edits = read_edits(folder / f"{path.stem}.edits")
        out.append(
            {
                "name": path.stem,
                "mtime": path.stat().st_mtime,
                "review": json.loads(review.read_text()) if review.exists() else None,
                "edits": edits if with_edits else len(edits),
            }
        )
    return out


def saved(sid: str) -> dict:
    """A scene's saved edits, its baseline if it has one, and its proposals."""
    folder = scene_dir(sid)
    baseline = folder / "baseline.json"
    base = json.loads(baseline.read_text()) if baseline.exists() else None
    return {
        "edits": read_edits(folder / "edits"),
        "baseline": base,
        "proposals": proposals(sid, with_edits=True),
    }


def write_png(path: Path, data_url: str) -> None:
    path.write_bytes(base64.b64decode(data_url.split(",", 1)[1]))


def save_edit(folder: Path, name: str, patch: dict) -> None:
    """Writes the patch without its picture, and the picture beside it."""
    folder.mkdir(parents=True, exist_ok=True)
    picture = patch.pop("picture", None)
    (folder / f"{name}.json").write_text(json.dumps(patch, indent=1) + "\n")
    if picture:
        write_png(folder / f"{name}.png", picture)


def drop_edit(folder: Path, name: str) -> None:
    for suffix in (".json", ".png"):
        (folder / f"{name}{suffix}").unlink(missing_ok=True)


def drop_proposal(sid: str, name: str) -> None:
    """Removes a proposal with its review, sheet and pixel edits."""
    folder = scene_dir(sid) / "proposals"
    for suffix in (".js", ".review.json", ".sheet.png"):
        (folder / f"{name}{suffix}").unlink(missing_ok=True)
    shutil.rmtree(folder / f"{name}.edits", ignore_errors=True)


def edit_folder(parts: list[str]) -> tuple[Path, str] | None:
    """The folder and file name an edit route names: /api/edit/SCENE/NAME for a scene sprite, or
    /api/proposal-edit/SCENE/PROPOSAL/NAME for a proposal frame."""
    if len(parts) == 4 and parts[:2] == ["api", "edit"] and NAME.match(parts[3]):
        return scene_dir(parts[2]) / "edits", parts[3]
    if (
        len(parts) == 5
        and parts[:2] == ["api", "proposal-edit"]
        and PROPOSAL.match(parts[3])
        and NAME.match(parts[4])
    ):
        return scene_dir(parts[2]) / "proposals" / f"{parts[3]}.edits", parts[4]
    return None


class Studio(http.server.BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def send(self, status: int, body: bytes = b"", kind: str = "application/json") -> None:
        self.send_response(status)
        self.send_header("Content-Type", kind)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def send_json(self, value) -> None:
        self.send(200, json.dumps(value).encode())

    def send_file(self, path: Path, base: Path) -> None:
        path = path.resolve()
        if not path.is_relative_to(base.resolve()) or not path.is_file():
            self.send(404)
            return
        self.send(200, path.read_bytes(), TYPES.get(path.suffix, "application/octet-stream"))

    def send_head(self, parts: list[str]) -> None:
        """The last commit's code, for showing what changed since: /head/js/... and
        /head/copies/SCENE.js. A file that is new since the commit is a 404. /head/sprites.js is
        today's poses, whose relative imports then load the committed kit, so a pose is drawn
        the same way by both versions of the code."""
        if parts == ["sprites.js"]:
            self.send_file(SHARED / "sprites.js", SHARED)
            return
        if parts[:1] == ["copies"] and len(parts) == 2 and parts[1].endswith(".js"):
            text = head_scene_module(parts[1][:-3])
        elif parts[:1] == ["js"] and parts[1:]:
            path = JS_DIR.joinpath(*parts[1:]).resolve()
            text = head_file(path) if path.is_relative_to(JS_DIR.resolve()) else None
        else:
            text = None
        if text is None:
            self.send(404)
        else:
            self.send(200, text.encode(), TYPES[".js"])

    def body(self):
        length = int(self.headers.get("Content-Length", 0))
        return json.loads(self.rfile.read(length)) if length else None

    def route(self) -> list[str]:
        return [part for part in urlparse(self.path).path.split("/") if part]

    def local(self) -> bool:
        """True when the request names this machine. The server listens on 127.0.0.1 only, but a
        web page can still reach it through DNS rebinding: its own host name then resolves to
        127.0.0.1, and the Host header keeps that name. So a request for any other host is
        refused."""
        host = (self.headers.get("Host") or "").rsplit(":", 1)[0]
        if host in ("127.0.0.1", "localhost"):
            return True
        self.send(403)
        return False

    def send_static(self, parts: list[str]) -> bool:
        """Answer a request for one of the studio's own files; False when the path is not one."""
        if not parts:
            self.send_file(APP / "index.html", APP)
        elif parts[0] == "js":
            self.send_file(JS_DIR.joinpath(*parts[1:]), JS_DIR)
        elif parts[0] == "css":
            self.send_file(CSS_DIR.joinpath(*parts[1:]), CSS_DIR)
        elif parts[0] == "app":
            self.send_file(APP.joinpath(*parts[1:]) if parts[1:] else APP / "index.html", APP)
        elif len(parts) == 2 and parts[0] == "brand":
            self.send_file(BRAND_DIR / parts[1], BRAND_DIR)
        elif parts == ["scenes.json"]:
            self.send_file(SCENES_JSON, ROOT)
        else:
            return False
        return True

    def send_api(self, parts: list[str]) -> bool:
        """Answer a request for the studio's data; False when the path is not one."""
        if parts == ["api", "version"]:
            self.send_json({"version": version()})
        elif parts == ["api", "meta"]:
            self.send_json(meta())
        elif parts == ["api", "brand"]:
            self.send_json(brand.studio_data())
        elif len(parts) == 3 and parts[:2] == ["api", "scene"]:
            self.send_json(saved(parts[2]))
        elif parts == ["api", "proposals"]:
            self.send_json({sid: proposals(sid, False) for sid in catalog.SCENE_IDS})
        else:
            return False
        return True

    def do_GET(self):
        if not self.local():
            return
        parts = self.route()
        try:
            if self.send_static(parts) or self.send_api(parts):
                return
            if parts[0] == "head":
                self.send_head(parts[1:])
            elif parts[0] == "copies" and len(parts) == 2 and parts[1].endswith(".js"):
                self.send(200, scene_module(parts[1][:-3]).encode(), TYPES[".js"])
            elif len(parts) == 3 and parts[0] == "proposals" and parts[2].endswith(".js"):
                folder = scene_dir(parts[1]) / "proposals"
                self.send_file(folder / parts[2], folder)
            elif len(parts) == 1:
                self.send_file(SHARED / parts[0], SHARED)
            else:
                self.send(404)
        except (KeyError, FileNotFoundError):
            self.send(404)

    def do_PUT(self):
        if not self.local():
            return
        parts = self.route()
        try:
            if target := edit_folder(parts):
                save_edit(*target, self.body())
            elif len(parts) == 4 and parts[:2] == ["api", "review"] and PROPOSAL.match(parts[3]):
                folder = scene_dir(parts[2]) / "proposals"
                review = json.dumps(self.body(), indent=1) + "\n"
                (folder / f"{parts[3]}.review.json").write_text(review)
            elif len(parts) == 3 and parts[:2] == ["api", "baseline"]:
                folder = scene_dir(parts[2])
                folder.mkdir(parents=True, exist_ok=True)
                (folder / "baseline.json").write_text(json.dumps(self.body()))
            else:
                self.send(404)
                return
        except KeyError:
            self.send(404)
            return
        self.send(204)

    def do_DELETE(self):
        if not self.local():
            return
        parts = self.route()
        try:
            if target := edit_folder(parts):
                drop_edit(*target)
            elif len(parts) == 4 and parts[:2] == ["api", "proposal"] and PROPOSAL.match(parts[3]):
                drop_proposal(parts[2], parts[3])
            elif len(parts) == 3 and parts[:2] == ["api", "edits"]:
                # Accept and clear: the edits, the baseline and the check's pictures. A scene's
                # proposals and reviews live beside them and are kept.
                folder = scene_dir(parts[2])
                shutil.rmtree(folder / "edits", ignore_errors=True)
                shutil.rmtree(folder / "check", ignore_errors=True)
                (folder / "baseline.json").unlink(missing_ok=True)
            else:
                self.send(404)
                return
        except KeyError:
            self.send(404)
            return
        self.send(204)


def start(port: int) -> http.server.ThreadingHTTPServer:
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), Studio)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


def serve(port: int, window: bool) -> None:
    """Serves the studio until Ctrl-C, opened in its own app window unless window is False."""
    try:
        server = start(port)
    except OSError as error:
        if error.errno != errno.EADDRINUSE:
            raise
        raise SystemExit(
            f"nursery: port {port} is already in use. "
            "Stop the other studio, or pick another with --port."
        ) from None
    url = f"http://127.0.0.1:{server.server_port}/"
    print(f"Nursery Studio at {url} (Ctrl-C to stop). Your work is saved to {STORE}.")
    if window:
        open_app(url)
    try:
        while True:
            time.sleep(3600)
    except KeyboardInterrupt:
        server.shutdown()


def print_problem(folder: Path, item: dict) -> None:
    for i, picture in enumerate(item.pop("pictures", [])):
        folder.mkdir(parents=True, exist_ok=True)
        path = folder / f"{item['key'].replace('|', '.')}{'' if i == 0 else f'.{i}'}.png"
        write_png(path, picture)
        print(f"    picture: {path.relative_to(ROOT)}")
    for px in item.get("pixels", []):
        print(
            f"    ({px['x']}, {px['y']}) dx {px['dx']:+d} dy {px['dy']:+d}: "
            f"want {px['want']} got {px['got']}"
        )


def check(only: str | None) -> int:
    """Runs the studio's check page headless and prints each edit's state. Returns the exit code."""
    every = (*catalog.SCENE_IDS, brand.BRAND_ID)
    sids = [only] if only else [s for s in every if (STORE / s / "edits").is_dir()]
    if only and only not in every:
        raise SystemExit(f"unknown scene {only!r}")
    if not sids:
        print("No saved edits.")
        return 0
    result = studio_result(f"check={','.join(sids)}")
    failed = False
    for sid, scene in result["scenes"].items():
        folder = STORE / sid / "check"
        shutil.rmtree(folder, ignore_errors=True)
        print(f"{sid}:")
        for item in scene["edits"]:
            note = f" at {item['count']} px" if item["status"] == "differs" else ""
            print(f"  {item['key']}: {item['status']}{note}")
            failed |= item["status"] == "differs"
            print_problem(folder, item)
        for item in scene["ripples"]:
            print(f"  {item['key']}: changed since the baseline at {item['count']} px, no edit")
            print_problem(folder, item)
        for error in scene["errors"]:
            print(f"  error: {error}")
    return 1 if failed else 0


def render(sid: str, name: str) -> int:
    """Draws a proposal headless into <name>.sheet.png and prints its variants. Returns the exit
    code: 1 when the proposal or a variant fails to draw."""
    if sid not in catalog.SCENE_IDS:
        raise SystemExit(f"unknown scene {sid!r}")
    if not (STORE / sid / "proposals" / f"{name}.js").is_file():
        raise SystemExit(f"no proposal at .nursery/{sid}/proposals/{name}.js")
    result = studio_result(f"render={sid}/{name}")
    for variant in result.get("variants", []):
        w, h = variant["size"]
        motion = (
            f"{variant['frames']} frames, {variant['seconds']} s"
            if variant["frames"] > 1
            else "still"
        )
        print(f"  {variant['name']}: {w}x{h} ({variant['tier']}), {motion}")
    if result.get("sheet"):
        path = STORE / sid / "proposals" / f"{name}.sheet.png"
        write_png(path, result["sheet"])
        print(f"  sheet: {path.relative_to(ROOT)}")
    for error in result["errors"]:
        print(f"  error: {error}")
    return 1 if result["errors"] else 0


def list_proposals(only: str | None) -> None:
    """Prints each proposal's review state, the user's notes and the pixel edits on its frames."""
    for sid in [only] if only else catalog.SCENE_IDS:
        for p in proposals(sid, with_edits=True):
            review = p["review"]
            if not review:
                state = "waiting for review"
            else:
                verdict = (
                    f"approved {review['choice']}"
                    if review["verdict"] == "approve"
                    else "changes asked"
                )
                stale = (
                    " (the proposal changed after this review)"
                    if review["mtime"] < p["mtime"]
                    else ""
                )
                state = f"{verdict}, revision {review.get('revision', 1)}{stale}"
            print(f"{sid}/{p['name']}: {state}")
            if review and review.get("notes"):
                print(f"  notes: {review['notes']}")
            folder = STORE / sid / "proposals" / f"{p['name']}.edits"
            for edit in p["edits"]:
                file = folder / f"{edit['key'].replace('|', '.')}.json"
                print(f"  pixel edit: {len(edit['pixels'])} px, {file.relative_to(ROOT)}")
