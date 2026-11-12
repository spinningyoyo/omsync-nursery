"""`nursery preview scene`: the real engine in headless Chrome, drawn to pictures by the command."""

import ast
import struct
from pathlib import Path

import pytest
from conftest import SCENE_IDS, nursery_cli

pytestmark = pytest.mark.browser

# Each scene brings one ground animal at its first watering (see the nursery-scene skill), by the
# name that the preview's probe gives it.
GROUND_ANIMAL = {
    "meadow": "rabbit",  # the cottontail
    "rainforest": "otters",
    "hawaii": "crabs",  # the ghost crab
    "desert": "rabbit",  # the jackrabbit
    "smokies": "groundhog",
    "serengeti": "secretary",  # the secretary bird
    "iceland": "fox",  # the arctic fox
    "yellowstone": "pronghorn",
    "hundredacre": "rabbit",
    "wonderland": "rabbit",  # the White Rabbit
}


def probes(output: str) -> dict[str, dict]:
    """The probe on each line of the command's output: `<scene>-<theme>-<shot> {...}`."""
    found = {}
    for line in output.splitlines():
        name, _, probe = line.partition(" ")
        if name.count("-") == 2 and probe.startswith("{"):
            found[name] = ast.literal_eval(probe)
    return found


def is_active(value: object) -> bool:
    """The probe shows an idle animal as "-" (or "" or False) and an active one by its place."""
    if isinstance(value, str):
        return any(part not in ("", "-") for part in value.split(","))
    return value is not None and value is not False  # 0 is a place, not "idle"


def test_every_scene_has_a_ground_animal_at_the_first_watering_by_day(
    repo: Path, tmp_path: Path
) -> None:
    assert set(GROUND_ANIMAL) == set(SCENE_IDS)
    done = nursery_cli(
        repo, "preview", "scene", str(tmp_path / "out"), ",".join(SCENE_IDS), "960", "480",
        "stage=1&secs=2&themes=light",
    )  # fmt: skip
    assert done.returncode == 0, done.stderr
    assert "console:" not in done.stdout, done.stdout  # no severe console message
    found = probes(done.stdout)
    for scene in SCENE_IDS:
        probe = found[f"{scene}-light-0"]
        assert is_active(probe[GROUND_ANIMAL[scene]]), f"{scene}: {probe}"


def test_preview_draws_a_picture_of_each_scene_and_theme(repo: Path, tmp_path: Path) -> None:
    out = tmp_path / "out"
    done = nursery_cli(
        repo, "preview", "scene", str(out), "meadow,desert", "640", "320", "stage=8&secs=1"
    )
    assert done.returncode == 0, done.stderr
    names = sorted(path.name for path in out.glob("*.png"))
    assert names == [f"{s}-{t}-0.png" for s in ("desert", "meadow") for t in ("dark", "light")]
    # The picture is the size of the page in art pixels (4 px each) times the zoom of 4.
    png = (out / "meadow-light-0.png").read_bytes()
    assert png[:8] == b"\x89PNG\r\n\x1a\n"
    width, height = struct.unpack(">II", png[16:24])
    assert (width, height) == (640 // 4 * 4, 320 // 4 * 4)
    assert (out / "meadow-dark-0.png").read_bytes() != png


def test_preview_says_what_it_needs(repo: Path, tmp_path: Path) -> None:
    done = nursery_cli(repo, "preview", "scene")
    assert done.returncode != 0
    assert "nursery preview scene" in done.stderr + done.stdout


def test_preview_reports_an_unknown_scene(repo: Path, tmp_path: Path) -> None:
    done = nursery_cli(repo, "preview", "scene", str(tmp_path / "out"), "nowhere")
    assert done.returncode != 0
