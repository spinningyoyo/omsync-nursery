# Changelog

This file lists the changes that matter to a person who installs the package or uses the studio.
It does not list changes to the linters, the checks, the tests or the CI. Git history has them.

The format follows [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/). The version
numbers follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html). The "omsync contract"
in [docs/overview.md](docs/overview.md) is the public interface. Each entry that changes it starts
with "Contract change".

## [Unreleased]

## [0.2.1] - 2026-11-17

### Added

- The Nursery Studio's Verify view checks scenes against the design rules and replays failures frame by frame.

### Changed

- The whole cast comes to life: every animal, bird, insect and tree in every scene has been
  redrawn on revised design rules, with shading lit from above, soft ground shadows, natural walks,
  and animals that breathe, blink, rest and play between moves.
- The Nursery Studio is quicker to open and review proposals in.

## [0.2.0] - 2026-11-13

### Added

- The package owns omsync's pixel mascot. `nursery.assets` exports `MASCOT_SVG`, `FAVICON_SVG` and
  `FAVICON_PNG`. omsync can serve the three files from the package, with no copy.
- `nursery brand` builds the three files and the studio's mark from the mascot's grid.
  `nursery brand --check` lists the files that the grid does not build.
- The Icons page of the studio shows the mascot with an Edit button. A saved mascot edit works like
  a saved scene edit.
- The package declares its licence (AGPL-3.0-only), its author and its project links. The licences
  of Lit and Lucide, which the studio vendors, ship in the package.
- Each wildlife scene has a cat. The Serengeti has a cheetah by day, Yellowstone a cougar and Khao
  Sok a clouded leopard. Yosemite and the Smokies have a bobcat, and Joshua Tree has a pale bobcat
  at night. Waikiki and Iceland have a house cat in one of eleven coats, picked when the scene
  loads. A cat that stops sits, lies down or stretches. A smaller cat can also arch its back. Phones
  do not show the cats.
- The studio's pixel editor zooms. Use + and - (or Ctrl or ⌘ with the wheel), and 0 to fit the
  sprite. Zoomed in, the day and night panes scroll together. Hold Space and drag to pan.

### Changed

- Contract change: omsync must serve the mascot and the favicons from the package, and widen its
  version range to accept the release that carries this change (0.2.0).
- `nursery release` stops when a brand file is not what the grid builds.
- The Serengeti lion walks and rests through the cat family's painter. He sits, lies down and
  stretches on his ledge. His tail no longer flicks while he sits.

## [0.1.1] - 2026-11-11

### Added

- Charged watering. `sprinkle(clientX, clientY, level)` takes an optional `level` from 1 to 8. The
  plants gain that many stages. The fountain starts as the click's spray and opens wider as it
  runs. At level 8, the fountain ends with jets, a mist and a rainbow. At night it shows a moonbow
  and fireflies. Without a level, `sprinkle` works as before.
- The engine exports `releaseMs`, `showMs` and `FINALE_MS`, so that a host can keep time with a
  release.

### Changed

- Each scene brings one ground animal at the first watering, and phones show it too.

## [0.1.0] - 2026-11-11

### Added

- The first release. It has ten scenes: Yosemite Meadows, Thailand Khao Sok Rainforest, Waikiki
  Beach, Joshua Tree Desert, Great Smoky Mountains, Serengeti Savanna, Icelandic Lava Field,
  Yellowstone, Hundred Acre Wood and Wonderland.
- The `omsync-nursery` package, with the engine and the scene files. `nursery.assets` gives their
  location: `JS`, `SCENES_JSON` and `SCENES_CSS`.
- The Nursery Studio and the `nursery` command. The studio shows each scene and sprite, edits
  pixels and reviews new art.
- Releases on the `release` branch, tagged `vX.Y.Z` and raised by semantic version. While the major
  version is 0, a contract change raises the minor version.
- `scenes.css` sets `--landing-cell`, the size of one backdrop grid cell, so that omsync does not
  need to know the art's pixel size.

[Unreleased]: https://github.com/spinningyoyo/omsync-nursery/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/spinningyoyo/omsync-nursery/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/spinningyoyo/omsync-nursery/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/spinningyoyo/omsync-nursery/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/spinningyoyo/omsync-nursery/releases/tag/v0.1.0
