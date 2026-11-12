"""The engine as omsync uses it: the package's files on a host page, driven through `sprinkle`.

The page (host.html) owns the clock and the random numbers, so a run of seconds takes milliseconds
and repeats exactly. What the tests read is what a user sees (the two canvases) and what omsync
reads (`stage`). The one other thing they read is the engine's `fountain` field, to learn when the
spray ends, because the contract has no signal for that.
"""

import pytest
from conftest import SCENE_IDS, Page

SETTLE_MS = 12_000  # long enough for every plant to finish growing and for the finale to fade
CLICK_Y = 400  # a click this far from the top of the page; the soil is below it


def sprinkle(page: Page, level: int | None = None, x: float | None = None) -> int:
    """Water as the host does: `sprinkle(x, y)` for a click, with a `level` when charged."""
    return page.run(
        """
        const [level, x] = arguments;
        const at = x ?? innerWidth / 2;
        return level === null ? host.nursery.sprinkle(at, arguments[2])
                              : host.nursery.sprinkle(at, arguments[2], level);
        """,
        level,
        x,
        CLICK_Y,
    )


def ground_pixels(page: Page) -> int:
    """How much of the ground canvas is drawn: soil, plants and animals."""
    return page.run("return host.covered('ground')")


def water_pixels(page: Page) -> int:
    return page.run("return host.covered('water')")


def wetted(page: Page, scene: str, level: int | None, x: float | None = None) -> list[int]:
    """The soil columns that one watering wets, on a fully grown scene (so nothing else changes)."""
    page.make(scene, stage=8)
    page.advance(300)
    page.run("host.keepDryRow()")
    sprinkle(page, level, x)
    return page.run("return host.wetColumns(arguments[0])", 9_000)


# ---- Growth --------------------------------------------------------------------------------------

SEED = 5


def keep_scenes_born_at(page: Page, scene: str, stages: tuple[int, ...]) -> None:
    """Keep a picture of the scene made at each stage, from the same seed (so with the same plants)
    and the same time to settle."""
    for stage in stages:
        page.run("host.reseed(arguments[0])", SEED)
        page.make(scene, stage=stage)
        page.advance(SETTLE_MS)
        page.run("host.keep(`born${arguments[0]}`)", stage)


def assert_grown_like_born_at(page: Page, kept: str, stage: int, *, closer: float = 2) -> None:
    """The picture kept as `kept` is much nearer to the scene made at `stage` than the bare one.

    A scene made at a stage has its plants full-grown at once. A watered scene that has finished
    growing has the same plants, and differs from it only in the animals, which wander by chance. A
    scene whose plants stopped short, or never grew, differs from it about as much as the bare one.
    """
    to_bare = page.run("return host.pixelsDiffering(`born${arguments[0]}`, 'born0')", stage)
    to_born = page.run(
        "return host.pixelsDiffering(arguments[0], `born${arguments[1]}`)", kept, stage
    )
    assert to_born * closer < to_bare, (to_born, to_bare)


@pytest.mark.parametrize("scene", SCENE_IDS)
def test_clicks_grow_a_scene_from_zero_to_eight(page: Page, scene: str) -> None:
    page.run("host.reseed(arguments[0])", SEED)
    assert page.make(scene) == 0
    for expected in range(1, 9):
        assert sprinkle(page) == expected  # a click waters one stage
        assert water_pixels(page) == 0  # nothing falls until the next frame
        page.advance(300)
        assert water_pixels(page) > 0  # the fountain runs
        page.advance(3_500)
        if expected == 4:
            page.run("host.keep('half')")
    assert sprinkle(page) == 8  # the last stage is the end
    assert page.run("return host.nursery.stage") == 8
    page.advance(SETTLE_MS)
    assert water_pixels(page) == 0  # every drop has landed and every splash has faded
    page.run("host.keep('grown')")
    assert page.errors() == []
    keep_scenes_born_at(page, scene, (0, 4, 8))
    # Eight waterings let the animals wander off differently, so this is a coarser check than the
    # charged one below: the scene must be nearer to the grown one than to the bare one.
    assert_grown_like_born_at(page, "half", 4, closer=1)
    assert_grown_like_born_at(page, "grown", 8, closer=1)


@pytest.mark.parametrize("scene", SCENE_IDS)
def test_a_charged_watering_grows_that_many_stages(page: Page, scene: str) -> None:
    for level in (1, 4, 8):
        page.run("host.reseed(arguments[0])", SEED)
        page.make(scene)
        assert sprinkle(page, level) == level
        assert page.run("return host.nursery.stage") == level
        page.advance(SETTLE_MS)
        page.run("host.keep(`watered${arguments[0]}`)", level)
        assert page.errors() == []
    keep_scenes_born_at(page, scene, (0, 4, 8))
    for level in (4, 8):
        assert_grown_like_born_at(page, f"watered{level}", level)

    page.make(scene, stage=2)
    assert sprinkle(page, 4) == 6
    page.make(scene, stage=6)
    assert sprinkle(page, 4) == 8  # capped at the last stage
    assert sprinkle(page, 8) == 8  # and a full scene stays full
    page.advance(SETTLE_MS)
    assert page.errors() == []


def test_a_charged_watering_ignores_a_level_outside_one_to_eight(page: Page) -> None:
    page.make("meadow")
    assert sprinkle(page, 0) == 1  # level 0 is the plain click
    assert sprinkle(page, 99) == 8  # 99 is capped at 8, and 1 + 8 stops at the last stage
    page.make("meadow")
    assert sprinkle(page, 2.9) == 2  # a level is a whole number
    page.make("meadow")
    assert sprinkle(page, -3) == 1  # a level below one is the plain click
    assert page.errors() == []


# ---- The fountain --------------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("level", "documented_ms"),
    [(None, 1000), (1, 1200), (4, 1800), (8, 4500)],
)
def test_the_fountain_runs_for_the_whole_show(
    page: Page, level: int | None, documented_ms: int
) -> None:
    show_ms = page.run(
        "return arguments[0] === null ? host.engine.showMs() : host.engine.showMs(arguments[0])",
        level,
    )
    assert show_ms == documented_ms  # what omsync waits for before the next watering

    page.make("meadow", stage=8)  # fully grown, so only the fountain moves
    sprinkle(page, level)
    page.advance(show_ms - 100)
    assert page.run("return host.fountainOn()")
    page.advance(200)
    assert not page.run("return host.fountainOn()")
    page.advance(SETTLE_MS)
    assert water_pixels(page) == 0
    assert page.errors() == []


@pytest.mark.parametrize("scene", SCENE_IDS)
def test_level_one_lands_at_least_as_far_as_a_click(page: Page, scene: str) -> None:
    click = wetted(page, scene, None)
    one = wetted(page, scene, 1)
    assert click, "a click wets some soil, in a colour that shows against it"
    assert min(one) <= min(click)
    assert max(one) >= max(click)
    assert len(one) > len(click)


@pytest.mark.parametrize("fraction", [0.12, 0.88])
def test_level_one_reaches_both_sides_of_an_off_centre_click(page: Page, fraction: float) -> None:
    x = page.run("return innerWidth") * fraction
    click = wetted(page, "meadow", None, x)
    one = wetted(page, "meadow", 1, x)
    assert min(one) <= min(click)
    assert max(one) >= max(click)
    assert len(one) > len(click)
    assert page.errors() == []


@pytest.mark.parametrize("scene", ["meadow", "hawaii", "wonderland"])
def test_each_level_reaches_farther_and_level_eight_wets_the_whole_ground(
    page: Page, scene: str
) -> None:
    reach = {level: wetted(page, scene, level) for level in (1, 4, 8)}
    assert min(reach[4]) < min(reach[1])
    assert max(reach[4]) > max(reach[1])
    cols = page.run("return host.groundSize().cols")
    assert len(reach[8]) >= 0.97 * cols
    assert len(reach[1]) < len(reach[4]) < len(reach[8])


def test_level_eight_ends_with_a_bow_and_a_mist_on_the_ground_canvas(page: Page) -> None:
    page.make("meadow", stage=8)
    page.advance(300)
    quiet = page.run("return host.fingerprint('ground')")
    sprinkle(page, 8)
    page.advance(3_500)  # inside the jets
    assert page.run("return host.fingerprint('ground')") != quiet
    assert page.run("return host.fountainOn()")
    page.advance(SETTLE_MS)
    assert not page.run("return host.fountainOn()")
    assert page.errors() == []


# ---- Reduced motion ------------------------------------------------------------------------------


@pytest.mark.parametrize("scene", SCENE_IDS)
def test_reduced_motion_grows_instantly_with_no_particles(page: Page, scene: str) -> None:
    page.make(scene, reduced=True)
    page.advance(200)
    before = ground_pixels(page)
    still = page.run("return host.fingerprint('ground')")

    assert sprinkle(page, 4) == 4
    page.advance(34)  # two frames
    soon = page.run("return host.fingerprint('ground')")
    assert soon != still
    assert ground_pixels(page) > before
    for ms in (100, 600, 1_500, 4_000):
        assert water_pixels(page) == 0
        page.advance(ms)
    assert page.run("return host.fingerprint('ground')") == soon  # grown already; nothing moves

    assert sprinkle(page, 8) == 8
    assert sprinkle(page) == 8
    for _ in range(10):
        page.advance(500)
        assert water_pixels(page) == 0
    assert not page.run("return host.fountainOn()")
    assert page.errors() == []


def test_normal_motion_takes_time_to_grow(page: Page) -> None:
    page.make("meadow")
    page.advance(200)
    sprinkle(page, 4)
    page.advance(34)
    soon = page.run("return host.fingerprint('ground')")
    page.advance(SETTLE_MS)
    assert page.run("return host.fingerprint('ground')") != soon


# ---- What else the host calls --------------------------------------------------------------------


@pytest.mark.parametrize("scene", SCENE_IDS)
def test_the_engine_follows_the_page_theme_on_each_frame(page: Page, scene: str) -> None:
    page.make(scene, stage=8)
    page.advance(500)
    day = page.run("return host.fingerprint('ground')")
    page.run("document.documentElement.dataset.theme = 'dark'")
    page.advance(100)
    night = page.run("return host.fingerprint('ground')")
    assert night != day
    page.run("document.documentElement.dataset.theme = 'light'")
    page.advance(500)
    assert page.run("return host.fingerprint('ground')") != night
    assert page.errors() == []


@pytest.mark.parametrize("scene", SCENE_IDS[1:])
def test_set_scene_swaps_the_scene_at_the_given_stage(page: Page, scene: str) -> None:
    page.make("meadow", stage=2)
    page.advance(500)
    before = page.run("return host.fingerprint('ground')")
    page.run(
        "const next = host.engine.SCENES.find((s) => s.id === arguments[0]);"
        " host.nursery.setScene(next, 5)",
        scene,
    )
    assert page.run("return host.nursery.stage") == 5
    page.advance(500)
    assert page.run("return host.fingerprint('ground')") != before
    assert sprinkle(page) == 6
    assert page.errors() == []


def test_destroy_stops_the_engine(page: Page) -> None:
    page.make("meadow", stage=8)
    page.advance(300)
    page.run("host.nursery.destroy()")
    still = page.run("return host.fingerprint('ground')")
    page.advance(5_000)
    assert page.run("return host.fingerprint('ground')") == still


# ---- Real time -----------------------------------------------------------------------------------


def test_the_engine_runs_on_the_browsers_own_frames(driver, host_server) -> None:
    """One run with no fake clock, so the real requestAnimationFrame loop is covered too."""
    from conftest import Page as HostPage

    from nursery.headless import wait_for

    page = HostPage(driver, host_server.origin).open(clock="real")
    page.make("meadow", stage=1)
    start = ground_pixels(page)
    assert sprinkle(page, 1) == 2
    assert wait_for(driver, "host.fountainOn()", 2)
    assert wait_for(driver, "!host.fountainOn()", 5)
    assert wait_for(driver, f"host.covered('ground') > {start + 100}", 8)
    assert page.errors() == []
