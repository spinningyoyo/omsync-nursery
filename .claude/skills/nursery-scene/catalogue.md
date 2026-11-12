# The catalogue

`docs/scenes/<scene>.md` lists, for one scene, what appears at each stage and every element with
the line of code that draws it. `src/nursery/catalog.py` writes it; never edit it by hand.

## Keep it in step

Do this whenever an animal, bird or effect is added, renamed or removed, or its drawing call
moves:

1. `ELEMENTS[<scene>]` in `src/nursery/catalog.py`: the element's label, kind, sprite names,
   drawing function and the regexes that find where it arrives and is drawn. Each regex must
   match a line of the scene module, or the run stops and names it.
2. `SPRITES.<scene>` in `src/nursery/studio/shared/sprites.js`: one pose per sprite name, drawn
   at x 40 in the 80×60 sprite box. The studio shows and edits exactly these.
3. `src/nursery/studio/shared/families.js`: every new animal or tree joins a family. The studio's
   Families view lists what has none under "No family yet".
4. `uv run nursery catalog`: rebuilds all ten files in place. Done when it prints no `warning:`
   or `sprite error` line.

Plants need no entry: the catalogue finds them from `generate()` and the `paint` map.

## Reading the tables

- **Widths.** Counts come from `generate()` at 90, 160 and 240 px wide (a phone, a laptop and a
  wide monitor) with a fixed seed. A real page uses a random seed, so counts vary a little.
- **First stage.** A plant with `born` value b first shows at stage b + 1, and stage 0 is bare
  soil. An animal's first stage is the first stage at which a 60-second run of that stage, in a
  real Nursery, shows it. Effects the run cannot see take the stage their code gates on.
- **Layer.** Plants are far, middle or near (the palettes fade the far rows). Animals and effects
  are drawn in front of the plants (`draw`) or behind them (`drawBack`).
- **Poses.** The names after an animal or effect are its sprites in the studio, drawn with a
  plausible object: walkers on the ground line, birds at a fixed height. The whale is drawn over
  the sea band it surfaces in. Falling leaves and petals are a hand-placed cluster of the
  one-pixel dots the code draws.
- **Timed effects.** Walker and bird arrivals are random on a real page, so what a visit shows
  varies. The catalogue's run is seeded per scene and theme, so it gives the same table every
  time, but it is one sample: an element that shows on only some visits (the desert snake) takes
  its stage from the code, not from the run.
- **Walkers on load.** A walker comes in from a screen edge when its stage is watered. When a
  scene is loaded, switched or resized, about half the walkers start somewhere on the page
  instead, and a young animal always starts just behind its parent.
- **Not catalogued.** The soil and its turf (`soil()`), and the fountain on the water canvas.
