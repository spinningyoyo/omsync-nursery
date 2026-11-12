"""The Nursery Studio, started as `nursery studio --no-window` on a free port and used in Chrome.

The studio runs from a throwaway copy of the nursery, so it reads no saved work of the owner's and
nothing a test does can write to it. The tests look, open and close; they do not save an edit.
"""

import itertools
import json
import urllib.request
from typing import Any

import pytest
from conftest import SCENE_IDS, console_problems

from nursery.headless import wait_for

# Finds elements through shadow roots: deep("icons-view .card") is every .card in an <icons-view>.
DEEP = """
window.deep = (selector, start = document) => {
  const collect = (root, sel, out) => {
    out.push(...root.querySelectorAll(sel));
    for (const el of root.querySelectorAll("*")) {
      if (el.shadowRoot) collect(el.shadowRoot, sel, out);
    }
  };
  let roots = [start];
  for (const part of selector.split(" ")) {
    const next = [];
    for (const root of roots) {
      collect(root, part, next);
      if (root.shadowRoot) collect(root.shadowRoot, part, next);
    }
    roots = [...new Set(next)];
  }
  return roots;
};
window.stageText = () => deep("scene-view .stage-slider .value")[0].textContent.trim();
window.clickButton = (where, label, last = false) => {
  const found = deep(`${where} button`).filter((b) => b.textContent.trim() === label);
  const button = last ? found.at(-1) : found[0];
  button.click();
};
"""


def get_json(url: str) -> Any:
    with urllib.request.urlopen(url, timeout=10) as answer:
        return json.load(answer)


_opened = itertools.count()


def open_studio(driver: Any, url: str, scene: str = "meadow") -> None:
    # A new query each time, so Chrome loads the page again and does not just move within it.
    driver.get(f"{url}/?visit={next(_opened)}#{scene}")
    driver.execute_script(DEEP)
    assert wait_for(driver, "deep('scene-view canvas').length >= 2", 20), "the scene never showed"


def show(driver: Any, view: str) -> None:
    driver.execute_script("clickButton('top-bar', arguments[0])", view)


@pytest.fixture
def chrome(driver: Any, studio: str) -> Any:
    console_problems(driver)
    driver.set_window_size(1600, 1000)
    return driver


def test_the_studio_serves_the_mascots_grid_as_32_by_22_cells(studio: str) -> None:
    brand = get_json(f"{studio}/api/brand")
    assert brand["id"] == "brand"
    assert brand["grid"] == "src/nursery/assets/brand/mascot-grid.txt"
    assert len(brand["kinds"]) == 22
    assert {len(row) for row in brand["kinds"]} == {32}
    assert {kind for row in brand["kinds"] for kind in row} == {"ink", "eye", "body", None}
    assert set(brand["palettes"]) == {"light", "dark"}


def test_the_studio_lists_every_scene(studio: str) -> None:
    meta = get_json(f"{studio}/api/meta")
    assert [scene["id"] for scene in meta["scenes"]] == SCENE_IDS
    assert get_json(f"{studio}/api/version")["version"]
    assert get_json(f"{studio}/api/proposals") == {scene: [] for scene in SCENE_IDS}


@pytest.mark.parametrize("scene", SCENE_IDS)
def test_a_scene_page_shows_the_scene_and_its_name(chrome: Any, studio: str, scene: str) -> None:
    open_studio(chrome, studio, scene)
    label = next(s["label"] for s in get_json(f"{studio}/scenes.json") if s["id"] == scene)
    assert chrome.execute_script("return deep('top-bar .where')[0].textContent.trim()") == label
    assert chrome.execute_script("return document.documentElement.dataset.tint") == scene
    ground = chrome.execute_script(
        "const [c] = deep('scene-view canvas'); return [c.width, c.height]"
    )
    assert min(ground) > 0
    assert chrome.execute_script("return deep('scene-rail button').length") == len(SCENE_IDS)
    assert console_problems(chrome) == []


def test_watering_a_scene_raises_its_stage(chrome: Any, studio: str) -> None:
    open_studio(chrome, studio)
    assert chrome.execute_script("return stageText()") == "8/8"  # the studio starts fully grown
    chrome.execute_script(
        "const slider = deep('scene-view .stage-slider input')[0]; slider.value = 3;"
        " slider.dispatchEvent(new Event('input', {bubbles: true}))"
    )
    assert wait_for(chrome, "stageText() === '3/8'", 5)
    chrome.execute_script("clickButton('scene-view', 'Water')")
    assert wait_for(chrome, "stageText() === '4/8'", 5)
    assert console_problems(chrome) == []


def test_the_icons_page_shows_the_scene_icons_and_the_brand(chrome: Any, studio: str) -> None:
    open_studio(chrome, studio)
    show(chrome, "Icons")
    # The mascot's card comes after the scene cards, once the brand has loaded.
    assert wait_for(
        chrome,
        "deep('icons-view .card').length >= 10"
        " && deep('icons-view .card').some((c) => c.textContent.includes('Mascot'))",
        10,
    )
    text = chrome.execute_script(
        "return deep('icons-view .card').map((c) => c.textContent).join(' ')"
    )
    for scene in get_json(f"{studio}/scenes.json"):
        assert scene["label"] in text
    assert "Mascot" in text
    assert "32\u00d722 px" in text
    assert chrome.execute_script("return deep('icons-view .mascot svg').length") >= 1
    assert console_problems(chrome) == []


def test_a_sprite_opens_in_the_pixel_editor(chrome: Any, studio: str) -> None:
    open_studio(chrome, studio)
    show(chrome, "Icons")
    assert wait_for(chrome, "deep('icons-view .card button').length >= 10", 10)
    chrome.execute_script("clickButton('icons-view .card', 'Edit')")
    assert wait_for(chrome, "deep('editor-view').length", 10)
    assert wait_for(chrome, "deep('editor-view canvas').length >= 2", 10)
    sizes = chrome.execute_script(
        "return deep('editor-view canvas').map((c) => [c.width, c.height])"
    )
    assert all(width > 0 and height > 0 for width, height in sizes)
    assert chrome.execute_script("return deep('editor-panel').length") == 1
    assert chrome.execute_script("return deep('editor-view [aria-label=Pencil]').length") == 1
    # Leaving the editor with nothing changed asks no question.
    show(chrome, "Icons")
    assert wait_for(chrome, "!deep('editor-view').length", 10)
    assert console_problems(chrome) == []


def test_the_mascot_opens_in_the_brand_editor_at_32_by_22(chrome: Any, studio: str) -> None:
    open_studio(chrome, studio)
    show(chrome, "Icons")
    assert wait_for(chrome, "deep('icons-view .card button').length >= 11", 10)
    assert wait_for(chrome, "deep('icons-view .brand button').length >= 1", 10)
    chrome.execute_script("clickButton('icons-view .brand', 'Edit')")  # the first card in the brand
    assert wait_for(chrome, "deep('editor-view canvas').length >= 2", 10)
    sizes = chrome.execute_script(
        "return deep('editor-view canvas').map((c) => [c.width, c.height])"
    )
    assert len(sizes) == 2  # day and night, side by side
    for width, height in sizes:
        assert width * 22 == height * 32, sizes
    assert console_problems(chrome) == []
