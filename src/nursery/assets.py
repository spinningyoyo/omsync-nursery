"""Where the scene files are, for the studio and for host apps that install the nursery.

Everything here is plain data in the package, so an installed copy and an editable checkout find
the files at the same place:

- JS: the engine (nursery.js) with scenes/, kit/ and garden/ beside it. The host serves this folder.
- SCENES_JSON: each scene's id, picker label and biome group, in picker order.
- SCENES_CSS: each scene's page tint and backdrop colours, for the host's CSS build.
- GARDEN_CSS: the backdrop, mascot, picker and controls that garden/ draws. The host links it.
"""

from pathlib import Path

ASSETS = Path(__file__).resolve().parent / "assets"
JS = ASSETS / "js"
SCENES_JSON = ASSETS / "scenes.json"
SCENES_CSS = ASSETS / "css" / "scenes.css"
GARDEN_CSS = ASSETS / "css" / "garden.css"
