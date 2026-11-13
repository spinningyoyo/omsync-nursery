"""The cat family on the host page: each scene but the storybook two has a cat that walks and rests.

These tests read the scene's animal state (`host.nursery.extra`) as well as the canvases, because
which pose a resting cat takes, and which coat a house cat wears, cannot be told apart by pixel
counts alone. The page owns the clock and the random numbers, so each run repeats exactly.
"""

from typing import Any

import pytest
from conftest import Page

# Scene: (the cat's field in the scene's state, its kind, the theme it is out in).
CATS = {
    "meadow": ("cat", "bobcat", "light"),
    "smokies": ("cat", "bobcat", "light"),
    "desert": ("cat", "bobcat", "dark"),
    "yellowstone": ("cat", "cougar", "light"),
    "rainforest": ("cat", "clouded", "light"),
    "hawaii": ("cat", "housecat", "light"),
    "iceland": ("cat", "housecat", "light"),
    "serengeti": ("cheetah", "cheetah", "light"),
}
# What each kind rests in: the big cats do not arch their backs.
RESTS = {
    "bobcat": {"sit", "arch", "lie", "bow"},
    "clouded": {"sit", "arch", "lie", "bow"},
    "housecat": {"sit", "arch", "lie", "bow"},
    "cougar": {"sit", "lie", "bow"},
    "cheetah": {"sit", "lie", "bow"},
}
COATS = {
    "white",
    "silver-tabby",
    "orange-white",
    "siamese",
    "black",
    "ginger",
    "calico",
    "grey",
    "tortie",
    "tuxedo",
    "brown-tabby",
}


def cat(page: Page, field: str) -> dict[str, Any]:
    return page.run(
        "const c = host.nursery.extra[arguments[0]];"
        " return {active: c.active, x: c.x, state: c.state,"
        " pose: c.pose ?? null, pal: c.pal ?? null}",
        field,
    )


def watch(page: Page, field: str, seconds: int) -> list[dict[str, Any]]:
    seen = []
    for _ in range(seconds):
        page.advance(1_000)
        seen.append(cat(page, field))
    return seen


@pytest.mark.parametrize("scene", list(CATS))
def test_each_wild_scene_has_a_cat_that_walks_and_rests_in_its_own_poses(
    page: Page, scene: str
) -> None:
    field, kind, theme = CATS[scene]
    page.make(scene, stage=8, theme=theme)
    seen = watch(page, field, 60)
    assert all(c["active"] for c in seen)
    assert max(c["x"] for c in seen) - min(c["x"] for c in seen) > 5  # it walks
    rests = {c["pose"] for c in seen if c["state"] != "walk"}
    assert rests, "the cat never stopped to rest"
    assert rests <= RESTS[kind]
    # Walking clears the pose, so the next stop picks again.
    assert all(c["pose"] is None for c in seen if c["state"] == "walk")
    assert page.errors() == []


@pytest.mark.parametrize(("scene", "theme"), [("desert", "light"), ("serengeti", "dark")])
def test_a_cat_stays_home_outside_its_hours(page: Page, scene: str, theme: str) -> None:
    field = CATS[scene][0]
    page.make(scene, stage=8, theme=theme)
    seen = watch(page, field, 20)
    assert len({round(c["x"], 3) for c in seen}) == 1  # it does not move while it is away
    assert page.errors() == []


@pytest.mark.parametrize("scene", ["hawaii", "iceland"])
def test_the_house_cat_wears_a_coat_picked_as_the_scene_loads(page: Page, scene: str) -> None:
    coats = set()
    for seed in range(1, 25):
        page.run("host.reseed(arguments[0])", seed)
        page.make(scene, stage=8)
        pal = cat(page, "cat")["pal"]
        assert pal.startswith("housecat-")
        coats.add(pal.removeprefix("housecat-"))
    assert coats <= COATS
    assert len(coats) >= 5
    assert page.errors() == []


@pytest.mark.parametrize("pose", ["sit", "lie", "bow"])
def test_a_resting_cat_draws_on_the_page(page: Page, pose: str) -> None:
    # Two runs alike in everything but where the cheetah rests: on the plain, or off the page. It
    # rests for the whole run in both, so neither run draws a different random number.
    for name, x in (("on", 120), ("off", -200)):
        page.run("host.reseed(7)")
        page.make("serengeti", stage=8)
        page.run(
            "Object.assign(host.nursery.extra.cheetah,"
            " {x: arguments[0], state: 'sit', pose: arguments[1], timer: 1e9})",
            x,
            pose,
        )
        page.advance(2_000)
        page.run("host.keep(arguments[0])", name)
    # The canvas is in art pixels: a resting cheetah covers about 150, a few behind grass in front.
    assert page.run("return host.pixelsDiffering('on', 'off')") > 60
    assert page.errors() == []
