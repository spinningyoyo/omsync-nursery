"""Where the nursery's files live: the scene files inside the package (nursery.assets), and the
docs and the studio's saved work beside it in the repository checkout the studio runs from."""

import json
from pathlib import Path

from nursery.assets import BRAND, SCENES_CSS, SCENES_JSON
from nursery.assets import JS as JS_DIR

ROOT = Path(__file__).resolve().parents[2]
if not (ROOT / "pyproject.toml").is_file():
    # Only an editable checkout has the docs and the working folder beside the package.
    raise SystemExit("nursery: the studio and its tools run from a checkout of omsync-nursery")
SCENES_DIR = JS_DIR / "scenes"  # one module per scene
KIT_DIR = JS_DIR / "kit"  # the shared toolkit the scenes draw with
CSS_DIR = SCENES_CSS.parent
BRAND_DIR = BRAND  # the mascot's grid, and the files built from it
DOCS = ROOT / "docs"
STORE = ROOT / ".nursery"  # the studio's edits, proposals and reviews; git ignores it
STUDIO = Path(__file__).resolve().parent / "studio"
APP = STUDIO / "app"  # the studio's page: Lit components, served at / and /app/
SHARED = STUDIO / "shared"  # the poses and families, shared by the studio and the catalogue


def scene_labels() -> dict[str, str]:
    """Each scene's label by id, from scenes.json: the picker label, and the catalogue's title."""
    return {
        scene["id"]: scene["label"] for scene in json.loads(SCENES_JSON.read_text(encoding="utf-8"))
    }


def module_path(name: str) -> Path:
    """A scene module or a kit module, by its name without .js."""
    scene = SCENES_DIR / f"{name}.js"
    return scene if scene.is_file() else KIT_DIR / f"{name}.js"
