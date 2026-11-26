# Cast, sprites and the catalogue

Each scene module in `src/nursery/assets/js/scenes/` declares its own cast, sprites and plant
families directly on its default export:

- `META`: `{ id, label, group, density?, tint, backdrop }` — spread onto the default export.
  `uv run nursery scenes` builds `src/nursery/assets/scenes.json` and
  `src/nursery/assets/css/scenes.css` from these metadata blocks.
- `extras = runCast([...], { ... })`: one unified cast list holds both each actor's behaviour
  (`walkerActor`, `followerActor`, `crossingActor`, `circlerActor`) and its metadata (`label`,
  `kind`, `family`, `sprites`, `arrives`, `fixed`, `layer`, `sea`). The scene exports
  `cast: extras.cast` directly — there is no second cast list. The list's order is also the
  drawing order, so a reorder shows in `scripts/scene_records/`.
- `scripts/scene_records/<scene>.json`: what each animal does, how often each drawn thing is drawn
  and which is drawn before which, per theme and width. `sh scripts/check.sh` fails when a scene
  no longer matches; after an intended change, rebuild them with
  `python3 scripts/check_scenes.py --record` and read the diff. A `refactor` commit cannot change
  them.
- `SPRITES`: map of sprite name to `(g, frame) => ...` drawn at x 40 in the 80×60 sprite box. Use
  helpers from `kit/poses.js` (`walk`, `bird`, `butterfly`, `swinging`, `owlPerched`,
  `soarSprites`, `housecatSprites`) for standard poses. The studio shows and edits exactly these
  entries, and `scripts/check_scenes.py` draws every sprite and checks 1-to-1 cast coverage.
- `PLANT_FAMILIES`: map of plant kind to family id, used by the studio's Families view alongside
  each kit module's `export const FAMILY` descriptor.

## Keep them in step

Do this whenever an animal, bird or effect is added, renamed or removed:

1. Update the entry in `runCast([...])` and its draw closure(s) in `SPRITES`.
2. If you added a new animal or tree kind to a kit family, add it to `export const FAMILY` in
   `src/nursery/assets/js/kit/<family>.js` (including `realLength` when it is an adult mammal on
   the scale). The studio's Families view lists anything without a family under "No family yet".
3. If you added a scene or changed `META` (label, group, tint, backdrop), run
   `uv run nursery scenes` so `scenes.json` and `scenes.css` match.
4. Run `sh scripts/check.sh` (which runs Biome `noUndeclaredVariables`, `check_scenes.py`, import
   boundaries, and `nursery scenes --check`).

Plants need no `CAST` entry: the studio and catalogue find them from `generate()` and the `paint`
map.

## On-demand catalogue tables

`uv run nursery catalog --out <dir>` renders each scene in headless Chrome and writes one markdown
table per scene to `<dir>`. It is an on-demand inspection tool, not checked into git.

- **Widths.** Counts come from `generate()` at 90, 160 and 240 px wide (a phone, a laptop and a
  wide monitor) with a fixed seed. A real page uses a random seed, so counts vary a little.
- **First stage.** A plant with `born` value b first shows at stage b + 1, and stage 0 is bare
  soil. An animal's first stage is the first stage at which a 60-second run of that stage, in a
  real Nursery, shows it. Effects the run cannot see take their declared `stage`.
- **Layer.** Plants are far, middle or near (the palettes fade the far rows). Animals and effects
  are drawn in front of the plants (`draw`) or behind them (`drawBack`).
- **Poses.** The names after an animal or effect are its sprites in `SPRITES`, drawn with a
  plausible object: walkers on the ground line, birds at a fixed height.
- **Walkers on load.** A walker comes in from a screen edge when its stage is watered. When a
  scene is loaded, switched or resized, about half the walkers start somewhere on the page
  instead, and a young animal always starts just behind its parent.
- **Not catalogued.** The soil and its turf (`soil()`), and the fountain on the water canvas.
