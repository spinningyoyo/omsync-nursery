---
name: forest-scene
description: Design, add or change a sign-in forest scene (src/omsync/web/static/js/forest/): its plants, landmarks, animals, sprites, motion or palette, or the shared animal and placement helpers. Also for reviewing a scene's design.
---

# Forest scenes

The sign-in page grows a pixel-art scene in eight waterings. A scene is one module in
`src/omsync/web/static/js/forest/`; `forest_scene.js` documents the contract (palettes, `mature`,
`paint`, `generate`, `soil`, `extras`). Read the module you are changing end to end before editing.

## Steps

1. **Read the request into a list of interpretations.** For every ambiguous ask, write down your
   reading. For a named real landmark, species or illustration, fetch a reference image first.
2. **Design against the rules below.** Note how the scene stands on each rule, and name what changes.
   Done when every rule has a one-line verdict.
3. **Propose in the studio first.** Write new or redrawn art, stills and animations alike, as a
   proposal (see Proposals below), with your interpretations in its `notes` and one variant: the
   design closest to the source material (the reference image, the park's species, the book's
   illustration). Offer more variants only when the user asks for choices. Check it yourself with
   `forest-studio.py render`, then tell the user it is waiting in the studio. Wait for their review
   before wiring art into a scene, unless they have locked the design and said to proceed. Do not
   show art as pictures in chat.
4. **Build**, reusing the shared toolkit. Then render the scene grown, light and dark, at desktop
   (1200×520) and phone (390×700) widths with `preview.py scene`, and look at each frame. Done when
   no frame shows a floating sprite, a perch-less percher, a sprite cut off at the page edge, or a
   console error.
5. **Catalogue.** Update ELEMENTS in `scripts/forest-catalog.py` and the poses in SPRITES in
   `scripts/forest/sprites.js` (shared with the studio) for every animal and effect whose name,
   regex or sprite changed, then run the catalogue in full into the scratchpad:
   `uv run python scripts/forest-catalog.py --out <scratch>/catalog`, and copy
   `forest-scenes.md` back into `docs/`. It writes no pictures; the forest studio shows them. Never
   pass `--only`: the doc would hold only those scenes. Add every new animal or tree to
   `scripts/forest/families.js`; the studio's "No family yet" filter shows what is missing.
6. **Finish**: `bash scripts/build-css.sh` if a stylesheet changed, update the scene paragraph in
   `docs/architecture/interface.md` when behaviour the user sees changes, then `sh scripts/check.sh`
   and `uv run pytest -q`. A new scene also registers in `forest_scene.js` (import and `SCENES`),
   `layouts/appearance.html`, `styles/tint.css` and `styles/landing.css` (light and dark).

## Design rules

- **Signature.** Each scene has a signature landmark, a signature animal and one timed wow event
  every 20–60 s (a geyser, a whale's spout, a stooping hawk, a bugling elk, a croquet stroke). Add
  at least one "nice detail" that rewards someone who knows the place or the book.
- **Feel and density.** Open scenes (desert, beach, savanna) have at most 5 ground animals and 1
  flyer at a time; dense scenes (rainforest, woods) at most 8. Use `narrow(f)` to leave out the
  young and extras on a phone.
- **Food chain.** At least one predator, and more prey than predators.
- **Motion mix.** At least one fast mover, slow walkers, one constant ambient layer (mist, leaves,
  dust, fireflies) and the timed event. Every walker has an idle pose and keeps its legs down when
  it stops. Flyers are fly-across (`flyBy`), circling in place (`soarAt`, as the rainforest eagle
  does, never crossing the whole page), or perched (`percher`). A scene's daytime flyers cover a
  slow (up to 14 px/s), a medium (15 to 30) and a fast (31 and up) flyby and one circler.
- **Size tiers**, in art px at scale 1. Large animals are compressed and small ones floored so they
  stay readable; no animal is wider than the 32-px mascot. Storybook casts only keep consistent
  within their scene.

  | Tier | Who | Width | Height |
  |---|---|---|---|
  | XS | insects, fireflies, hatchlings | 1–5 | 1–3 |
  | S | rabbits, rodents, crabs, puffins, kingfishers | 7–11 | 5–10 |
  | M | foxes, coyotes, monkeys, otters, turkeys, raptors | 12–17 | 7–12 |
  | L | deer, black bears, wolves, lions, bighorn, swans | 17–23 | 12–17, antlers up to 8 more |
  | XL | elk, moose, bison, grizzlies, Asian elephants | 23–28 | 18–23 |
  | XXL | African elephants, giraffes | 28–31 / 18–22 | 24–27 / 34–38 |

- **Colour.** Ration bright accents (flowers, fruit), hardest in open scenes. Give a white animal a
  grey edge so it shows on the light page. Match the palette's maturity to the place (an ancient
  rainforest is deep and dark green, not pastel).
- **Placement.** Landmarks go through `placeLandmarks`, tall ones with `away` past `CLEARING` so
  they stay out from behind the sign-in card. Plants that grow together are sown with `grove`; rare
  plants get `scatter({ max })`; tall plants are scaled by `clearing(x, cols)`.
- **Accuracy.** Species come from that place's own lists (a park's species list, a regional
  wildlife page), in the right season for the palette. Dark mode is night: day birds stay home
  (`isNight(f)` gates both update and draw) and night animals (owls, fireflies) come out.
- **Style.** Flat colour with one darker shade and no ink outlines; storybook scenes follow the
  public-domain illustrations (Shepard, Tenniel) unless the user has chosen otherwise.
- **Families.** Every animal and tree belongs to a family with one shared design, listed in
  `scripts/forest/families.js`. Members differ only in size, colour and the traits the family names:
  a tiger would be the lion without the mane, with its own colour and stripes, and a fox, coyote and
  wolf are one design at three sizes. Refresh a whole family at once, never one member alone. When
  something has no family, add one. Storybook characters are listed with their real family to
  compare, but keep their book's look.
- **Depth.** Lay the darker shade as areas, not lines: the belly, the throat, the far legs, the
  shaded side of a trunk. The size tiers stand: detail comes from better use of the same pixels.
- **Whole bodies.** A body is one connected shape, with no gap at a neck, tail or shoulder. A wing
  stays rooted on the shoulder and changes shape through its beat; it is never a block that jumps.
  Every walking animal uses the two-frame walk, its diagonal leg pairs lifting in turn (`lifted` in
  `animals.js`).
- **Trees.** Show how the tree is built: a lit and shaded trunk, visible boughs, and foliage in
  separate clumps with sky between them (the Bee Tree, the Scots pine, the sequoia), not a ball or a
  cone on a stick.
  Broadleaf trees use `broadleafTree` and conifers `coniferTree` (`trees.js`). A conifer ends in a
  pointed leader or a flat, round top, never a round blob.

## Shared toolkit

Use these before writing anything scene-local; each is documented where it is defined.

- `pixel.js`: `placeLandmarks`, `grove`, `scatter` (with `keep`, `max`), `clearing`,
  `scaledPart` (edge-rounded scaling, so a young animal's legs still meet its body), `sprite`
  (character grids, with a scale), `part`.
- `critters.js`: `walker`, `wander`, `enter`, `enterBehind`, `follow`, `stroll`, `flyBy` (with
  `margin`), `soarAt` and `soarer` (a bird that circles in one part of the sky), `flock` (a flock's
  members), `percher`, `fidget` and `doing` (a still animal's idle moves), `isNight`, `narrow`.
- `animals.js`: one design per family, a habitat variant chosen by `kind` and palette key `pal`:
  `bearAt` (black, grizzly; `rear`), `canidAt` (red, arctic, coyote, wolf; `sit`, `howl`,
  `pounce`), `cervidAt` (whitetail, elk, reindeer, pronghorn; `sex`; graze, `run` flag, `bugle`), `sheepAt`,
  `elephantAt` (african, asian), `hareAt`, `owlAt` (flying or `perch`, `tufts`), `raptorAt`
  (eagle and eagleSide, hawk, vulture, serpent), `swanAt`, `flamingoAt`, `flyerAt` (roller, kingfisher, tropicbird, puffin, hornbill, jay, bluebird, cardinal, swift). Extend a family with a new `kind`
  rather than drawing a scene-local copy.
- `effects.js`: mist bands.

A percher or a perched prop stands on a plant whose top you can compute from its scale (a painter
helper such as `graniteTop`), so the creature's feet land on the rock in every frame. Animals are
created in `update`, never in `draw`: the catalogue steps `update` without drawing.

## preview.py

`uv run python .claude/skills/forest-scene/preview.py scene OUT SCENES [W H] [QUERY]` renders scenes
with the real engine (QUERY: `shots=0,5`, `themes=light,dark`, `stage=`, `secs=`) and prints which
animals are on the page. `... sheet OUT SPEC.js` renders a sprite sheet; a spec exports `name`,
`items` (`{ label, scene, pal: { light, dark }, draw(g) }`, importing `./js/forest/animals.js` or a
scene module) and optional `per`, `zoom`, `cell`. Write outputs and specs to the session scratchpad.
Sheets are for your own checks; art for the user to review goes in a proposal.

## Studio edits

The user reviews scenes and fixes pixels in `uv run python scripts/forest-studio.py`. When they
say they saved edits:

1. Read each `.forest-studio/<scene>/edits/*.json` and look at the `.png` beside it. A patch lists
   every changed pixel with `dx` and `dy` (the offsets `part()` takes: from x 40 and from the feet
   row under the original's lowest pixel) and the palette keys of its colour before and after.
   `drawnBy` names the painter, and `pose_in_sprites_js` the pose that drew the sprite.
2. Change the drawing code to draw exactly those pixels, with the palette keys, not raw hex.
3. Run `uv run python scripts/forest-studio.py check <scene>` until every edit reads `in code`.
   `differs` lists the wrong pixels and writes pictures to `.forest-studio/<scene>/check/`.
4. Show the user every sprite the check lists as changed since the baseline (other frames, the
   young, poses that share the part), with its picture, and let them decide. Done when every edit
   is in code and the user has seen each moved sprite.

The user clears a scene with Accept in the studio's Changes drawer; never delete `.forest-studio/`
yourself.

## Proposals

A proposal is a module at `.forest-studio/<scene>/proposals/<name>.js` (name: letters, digits, `-`,
`_`). The running studio picks it up within a few seconds and shows it for review: today's sprite
beside each variant in light and dark, animations played, stepped and slowed, and a chosen variant
over the live scene. Import with absolute paths: `/js/forest/animals.js`, `/js/forest/pixel.js`,
and `/copies/<scene>.js` for the scene's own painters and `...At` functions.

```js
import { raptorAt } from "/js/forest/animals.js";
import { rect } from "/js/forest/pixel.js";

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
      // Without it the sprite is drawn at the scene's centre, its box ground on the soil line.
      scene(g, t, f) {
        raptorAt(g, { kind: "hawk", x: f.cols * 0.4 + t * 20, y: f.groundY - 8 - t * 40, dir: 1 });
      },
    },
  ],
};
```

A variant can override `seconds`, `fps` and `palettes`, and give `sceneSeconds` when its scene
sequence runs longer than its sprite loop. `g` is the usual painter group, with the scene's palette
plus the additions.

- `uv run python scripts/forest-studio.py render <scene> <name>` draws it headless, prints each
  variant's size, tier and frames, writes `<name>.sheet.png` beside it, and exits 1 when anything
  fails to draw. Look at the sheet before telling the user.
- `uv run python scripts/forest-studio.py proposals [scene]` prints each proposal's review: the
  chosen variant or a request for changes, the user's notes, whether the proposal changed since,
  and the pixel edits the user saved on its frames (`<name>.edits/`, patches in the same form as
  Studio edits, with `variant` and `frameAt.time`).
- To revise, edit the module in place and raise `revision`; it shows as waiting for review again.
  When a variant is approved, build it into the scene (steps 4 to 6), applying the user's pixel
  edits exactly. Leave the proposal and its review for the user to remove: each proposal has a
  Remove button, and the Proposals section has Clear approved and Clear all.
- A family's proposal draws every member side by side in one box at real size, so the user judges
  the family as a set. It lives in the scene of a member and is named `<family>-family`. Import
  another scene's palettes from `/copies/<scene>.js` (its default export's `palettes`).

The studio's family filter shows one family from every scene side by side at one zoom, with
storybook members in their own section, and "No family yet" lists any animal or bird not in
`families.js`.

The studio's Trigger row fires the live scene's timed events now (fly-bys, the stoop, an
eruption, the next shower) instead of waiting for them; point the user to it when a change is an
event.
