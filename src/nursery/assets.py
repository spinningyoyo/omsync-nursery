"""Where the scene files are, for the studio and for the host app that installs the nursery.

Everything here is plain data in the package, so an installed copy and an editable checkout find
the files at the same place:

- JS: the engine (nursery.js) with scenes/ and kit/ beside it. The host serves this folder.
- SCENES_JSON: each scene's id and picker label, in picker order.
- SCENES_CSS: each scene's page tint and backdrop colours, for the host's CSS build.
- MASCOT_SVG, FAVICON_SVG, FAVICON_PNG: the host's pixel mascot and its favicons, built from
  MASCOT_GRID by `nursery brand`. The grid is the master; never edit the built files by hand.
"""

from pathlib import Path

ASSETS = Path(__file__).resolve().parent / "assets"
JS = ASSETS / "js"
SCENES_JSON = ASSETS / "scenes.json"
SCENES_CSS = ASSETS / "css" / "scenes.css"
BRAND = ASSETS / "brand"
MASCOT_GRID = BRAND / "mascot-grid.txt"
MASCOT_SVG = BRAND / "mascot.svg"
FAVICON_SVG = BRAND / "favicon.svg"
FAVICON_PNG = BRAND / "favicon-32.png"
