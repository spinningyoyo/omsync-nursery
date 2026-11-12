"""Where the scene files are, for the studio and for apps that install the nursery (omsync).

Everything here is plain data in the package, so an installed copy and an editable checkout find
the files at the same place:

- JS: the engine (nursery.js) with scenes/ and kit/ beside it. omsync serves this folder at
  /static/vendor/nursery/.
- SCENES_JSON: each scene's id and picker label, in picker order.
- SCENES_CSS: each scene's page tint and sign-in backdrop colours, for the host's CSS build.
"""

from pathlib import Path

ASSETS = Path(__file__).resolve().parent / "assets"
JS = ASSETS / "js"
SCENES_JSON = ASSETS / "scenes.json"
SCENES_CSS = ASSETS / "css" / "scenes.css"
