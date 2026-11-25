"""Where the scene files are, for the studio and for the host app that installs the nursery.

Everything here is plain data in the package, so an installed copy and an editable checkout find
the files at the same place:

- JS: the engine (nursery.js) with scenes/, kit/ and garden/ beside it. The host serves this folder.
- SCENES_JSON: each scene's id, picker label and biome group, in picker order.
- SCENES_CSS: each scene's page tint and backdrop colours, for the host's CSS build.
- GARDEN_CSS: the backdrop, mascot, picker and controls that garden/ draws. The host links it.
- MASCOT_SVG, FAVICON_SVG, FAVICON_PNG: the host's pixel mascot and its favicons, built from
  MASCOT_GRID by `nursery brand`. The grid is the master; never edit the built files by hand.
"""

from pathlib import Path

ASSETS = Path(__file__).resolve().parent / "assets"
JS = ASSETS / "js"
SCENES_JSON = ASSETS / "scenes.json"
SCENES_CSS = ASSETS / "css" / "scenes.css"
GARDEN_CSS = ASSETS / "css" / "garden.css"
BRAND = ASSETS / "brand"
MASCOT_GRID = BRAND / "mascot-grid.txt"
MASCOT_SVG = BRAND / "mascot.svg"
FAVICON_SVG = BRAND / "favicon.svg"
FAVICON_PNG = BRAND / "favicon-32.png"
