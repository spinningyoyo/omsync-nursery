"""The package as omsync installs it: a wheel built from the source, installed into a new venv.

omsync reads the scene files through `nursery.assets` (see docs/overview.md), so these tests look
at the installed copy, not at the checkout.
"""

import json
import re
import subprocess
import sys
import zipfile
from pathlib import Path
from typing import Any

import pytest
from conftest import SCENE_IDS, TEMPLATE_VERSION, Page, serve_host

pytestmark = pytest.mark.slow

EXPORTS = ["JS", "SCENES_CSS", "SCENES_JSON", "MASCOT_SVG", "FAVICON_SVG", "FAVICON_PNG"]

PROBE = f"""
import importlib.metadata, json, nursery.assets as assets
print(json.dumps({{
    "module": assets.__file__,
    "exports": {{name: str(getattr(assets, name)) for name in {EXPORTS!r}}},
    "requires": importlib.metadata.requires("omsync-nursery"),
    "version": importlib.metadata.version("omsync-nursery"),
}}))
"""


def run(*command: str | Path) -> subprocess.CompletedProcess:
    done = subprocess.run(
        [str(part) for part in command], capture_output=True, text=True, check=False, timeout=600
    )
    assert done.returncode == 0, f"{command}: {done.stdout}\n{done.stderr}"
    return done


@pytest.fixture(scope="module")
def installed(nursery_template: Path, tmp_path_factory: pytest.TempPathFactory) -> dict[str, Any]:
    """Build the wheel in a temporary folder, install it into a temporary venv, and ask the venv."""
    work = tmp_path_factory.mktemp("wheel")
    run("uv", "build", "--wheel", "--out-dir", work / "dist", nursery_template)
    (wheel,) = (work / "dist").glob("omsync_nursery-*.whl")
    run("uv", "venv", "-q", "--python", sys.executable, work / "venv")
    bin_dir = work / "venv" / ("Scripts" if sys.platform == "win32" else "bin")
    run("uv", "pip", "install", "-q", "--python", bin_dir / "python", wheel)
    probe = json.loads(run(bin_dir / "python", "-I", "-c", PROBE).stdout)
    return {**probe, "wheel": wheel, "venv": work / "venv", "bin": bin_dir}


def test_the_wheel_exposes_every_file_that_omsync_reads(installed: dict[str, Any]) -> None:
    assert Path(installed["module"]).is_relative_to(installed["venv"])  # the installed copy
    exports = {name: Path(path) for name, path in installed["exports"].items()}
    assert set(exports) == set(EXPORTS)
    for name, path in exports.items():
        assert path.exists(), f"{name} is missing: {path}"
        assert path.is_relative_to(installed["venv"]), name
    js = exports["JS"]
    assert js.is_dir()
    assert (js / "nursery.js").is_file()
    assert (js / "kit" / "pixel.js").is_file()
    for scene in SCENE_IDS:
        assert (js / "scenes" / f"{scene}.js").is_file()
    for name in EXPORTS[1:]:
        assert exports[name].is_file()
        assert exports[name].stat().st_size > 0
    assert exports["FAVICON_PNG"].read_bytes()[:8] == b"\x89PNG\r\n\x1a\n"
    assert exports["MASCOT_SVG"].read_text(encoding="utf-8").startswith("<svg")
    assert exports["FAVICON_SVG"].read_text(encoding="utf-8").startswith("<svg")
    assert json.loads(exports["SCENES_JSON"].read_text(encoding="utf-8"))


def test_the_wheel_needs_nothing_and_has_the_projects_version(installed: dict[str, Any]) -> None:
    assert installed["requires"] is None
    # The wheel is built from the throwaway repository, whose pyproject.toml holds this version.
    assert installed["version"] == TEMPLATE_VERSION
    names = zipfile.ZipFile(installed["wheel"]).namelist()
    assert not [name for name in names if name.startswith(("tests/", ".nursery/", "docs/"))]


def test_the_installed_command_runs(installed: dict[str, Any]) -> None:
    done = run(installed["bin"] / "nursery", "--help")
    assert "The Nursery Studio and its tools." in done.stdout


def test_the_scene_ids_agree_in_the_json_the_script_and_the_css(
    installed: dict[str, Any], driver: Any
) -> None:
    exports = {name: Path(path) for name, path in installed["exports"].items()}
    scenes = json.loads(exports["SCENES_JSON"].read_text(encoding="utf-8"))
    in_json = [scene["id"] for scene in scenes]
    css = exports["SCENES_CSS"].read_text(encoding="utf-8")
    tints = re.findall(r'\[data-tint="([a-z]+)"\]', css)
    backdrops = re.findall(r'\[data-scene="([a-z]+)"\]', css)

    with serve_host(exports["JS"], exports["SCENES_JSON"], exports["SCENES_CSS"]) as server:
        page = Page(driver, server.origin).open()
        in_script = page.run("return host.engine.SCENES.map((scene) => scene.id)")
        assert page.errors() == []

    assert in_script == in_json  # the same ids in the same (picker) order
    assert in_json == SCENE_IDS
    assert sorted(set(tints)) == sorted(in_json)
    assert sorted(set(backdrops)) == sorted(in_json)
    assert len(tints) == len(set(tints))  # one tint rule for each scene
