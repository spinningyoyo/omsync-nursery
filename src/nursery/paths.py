"""Where the nursery's files live: the scene files inside the package (nursery.assets), and the
docs and the studio's saved work beside it in the repository checkout the studio runs from."""

import json
from pathlib import Path

from nursery.assets import JS as JS_DIR
from nursery.assets import SCENES_CSS, SCENES_JSON

ROOT = Path(__file__).resolve().parents[2]
SCENES_DIR = JS_DIR / "scenes"  # one module per scene
KIT_DIR = JS_DIR / "kit"  # the shared toolkit the scenes draw with
CSS_DIR = SCENES_CSS.parent
DOCS = ROOT / "docs"
STORE = ROOT / ".nursery"  # the studio's edits, proposals and reviews; git ignores it
STUDIO = Path(__file__).resolve().parent / "studio"
APP = STUDIO / "app"  # the studio's page: Lit components, served at / and /app/
SHARED = STUDIO / "shared"  # the poses and families, shared by the studio and the catalogue


def scene_ids() -> tuple[str, ...]:
    """The scenes in picker order (scenes.json, which omsync reads too)."""
    return tuple(scene["id"] for scene in json.loads(SCENES_JSON.read_text()))


def module_path(name: str) -> Path:
    """A scene module or a kit module, by its name without .js."""
    scene = SCENES_DIR / f"{name}.js"
    return scene if scene.is_file() else KIT_DIR / f"{name}.js"


def scene_copy(text: str) -> str:
    """A scene module's imports rewritten for a copy served from /copies/ beside /js/."""
    return text.replace('from "../kit/', 'from "../js/kit/').replace(
        'from "./', 'from "../js/scenes/'
    )
