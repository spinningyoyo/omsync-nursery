# Proposals

A proposal is a module at `.nursery/<scene>/proposals/<name>.js` (name: letters, digits, `-`,
`_`). The running studio picks it up within a few seconds and shows it in the Inbox: the
current sprite beside each variant in day and night, played, stepped and slowed, and the chosen
variant over the live scene. Import with absolute paths: `/js/kit/animals.js`, `/js/kit/pixel.js`, and
`/copies/<scene>.js` for the scene's own painters and `...At` functions.

```js
import { raptorAt } from "/js/kit/animals.js";

export default {
  title: "Hawk climbs back after a stoop",
  revision: 1, // raise it with every revision you post
  author: "your session name",
  notes: "How you read the ask, and why this design is closest to the source.",
  replaces: "desert-hawk-stoop", // optional: a studio sprite name, shown as Now
  palettes: { light: { puff: "#d8c8a8" }, dark: { puff: "#6a5a48" } }, // optional additions
  box: { w: 80, h: 60, ground: 46 }, // optional; the default sprite box
  seconds: 1.5, // animation length; leave out for a still
  fps: 8, // frames per second, also the frames the user can edit
  variants: [
    {
      name: "A",
      notes: "Flaps on every other frame.",
      // Draws at time t in the sprite box: x 40 is the pose x, walkers' feet stand on row 53.
      draw(g, t) {
        raptorAt(g, { kind: "hawk", x: 40, y: 30 - t * 6, dir: 1 }, { bank: Math.floor(t * 8) % 2 === 0 });
      },
      // Optional: the sequence in the live scene's coordinates (f.cols, f.groundY, f.plants).
      // Without it the sprite stands at the scene's centre, its box ground on the soil line.
      scene(g, t, f) {
        raptorAt(g, { kind: "hawk", x: f.cols * 0.4 + t * 20, y: f.groundY - 8 - t * 40, dir: 1 });
      },
    },
  ],
};
```

A variant can override `seconds`, `fps` and `palettes`, and give `sceneSeconds` when its scene
sequence runs longer than its sprite loop. `g` is the usual painter group, with the scene's
palette plus the additions.

A family's proposal draws every member side by side in one box at real size, so the user judges
the family as a set. It lives in the scene of a member and is named `<family>-family`; import
another scene's palettes from `/copies/<scene>.js` (its default export's `palettes`).

## The loop

1. Post the module, then `uv run nursery render <scene> <name>`: it prints each variant's size,
   tier and frames, writes `<name>.sheet.png` beside the module, and exits 1 when anything fails
   to draw. Look at the sheet, then tell the user the proposal is waiting in the studio.
2. When the user says they reviewed it, `uv run nursery proposals <scene>` prints the verdict (the
   chosen variant, or changes asked), their notes, whether the module changed since, and any
   pixel edits they saved on its frames.
3. Changes asked: edit the module in place and raise `revision`; it shows as waiting again.
4. Approved: build the chosen variant into the scene (SKILL.md steps 4 to 6), applying the user's
   pixel edits on its frames exactly ([studio-edits.md](studio-edits.md)). The Inbox then shows it
   as built; the user removes it there.

For a timed event, point the user to the scene view's Trigger row, which fires it now.
