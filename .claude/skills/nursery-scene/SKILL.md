---
name: nursery-scene
description: Design, add, change or review a nursery scene in src/nursery/assets/js/ (scenes/ and kit/): its plants, landmarks, animals, sprites, motion or palette; also applying the user's saved studio edits, and the studio itself.
---

# Nursery scenes

omsync's sign-in page grows a pixel-art scene in eight waterings. A scene is one module in
`src/nursery/assets/js/scenes/`, drawn with the kit in `src/nursery/assets/js/kit/`. The header of
`src/nursery/assets/js/nursery.js` is the scene contract. Before you edit a scene, read its module
end to end.

Which path:

- **The user saved pixel edits**: follow [studio-edits.md](studio-edits.md); no proposal. This
  includes the mascot: its master is `src/nursery/assets/brand/mascot-grid.txt`, the user edits it
  on the studio's Icons page, and `uv run nursery brand` builds every brand file from it. Never
  paste copies.
- **New or changed art**, still or animated: the steps below.
- **The user reviewed a proposal**: [proposals.md](proposals.md), "The loop".

## Steps

1. **Read the request into interpretations.** Write your reading of every ambiguous ask. For a
   named real landmark, species or illustration, fetch a reference image first and copy its
   proportions.
2. **Design against the rules below.** Done when every rule has a one-line verdict for this scene.
3. **Propose in the studio** ([proposals.md](proposals.md)): one variant, the design closest to
   the source (the reference, the park's species list, the book's illustration), with your
   interpretations in `notes`. More variants only when the user asks for choices. Even a small
   tweak to built art is a proposal. Wait for the review before you build, unless the user locked
   the design and said to proceed. Art goes to the studio, never as pictures in chat.
4. **Build** with the kit. Fast checks, while proposing and building: `sh scripts/biome.sh check`,
   `python3 -I scripts/check_js_imports.py`, `python3 scripts/check_scenes.py`,
   `uv run nursery scenes --check`, and
   `uv run nursery preview scene <scratch> <scene> 1200 520 "shots=0,20"` and again at `390 700`.
   Look at every image, day and night. Done when none shows a floating sprite, a perch-less
   percher, a sprite cut at the page edge, or a `console:` line.
5. **Cast and sprites** ([catalogue.md](catalogue.md)): declare each animal, bird or effect once in
   the scene's `runCast([...])` list (exported as `cast: extras.cast`) with its `SPRITES` entries
   (and `FAMILY` in the kit module for a new species or tree). `scripts/check_scenes.py` enforces
   1-to-1 sprite coverage and draws every sprite.
6. **Commit** after the final test (`sh scripts/check.sh`, then `uv run pytest`). Run it once, at
   the end, only when the user says yes, and report any failure with its output. A subagent never
   runs it; it reports "tests not run". A new scene declares `META` (id, label, group, density,
   tint, backdrop), registers in `nursery.js` (import and `SCENES`), and runs `uv run nursery scenes`
   to build `src/nursery/assets/scenes.json` and `src/nursery/assets/css/scenes.css`; the omsync
   contract in `docs/overview.md` says what omsync reads.
7. **Release** only when the user asks. The [Release section of docs/overview.md](../../../docs/overview.md#release)
   has the steps and says which flag to use. Run with `--dry-run` first. A release changes nothing
   in omsync. omsync takes it when its owner runs its upgrade script. To see the art in omsync
   before a release, run `sh scripts/dev-nursery.sh serve` in omsync. When what the user sees
   changes, update the scene paragraph in omsync's `docs/architecture/interface.md`.

## Design rules

- **Signature.** Each scene has a signature landmark, a signature animal and one timed wow event
  every 20–60 s (a geyser, a whale's spout, a stooping hawk, a bugling elk, a croquet stroke). Add
  at least one "nice detail" that rewards someone who knows the place or the book.
- **Feel and density.** Open scenes (desert, beach, savanna) have at most 5 ground animals and 1
  flyer at a time; dense scenes (rainforest, woods) at most 8. Give the young and extras
  `phone: "hide"` to leave them out on a phone.
- **First watering.** Every scene brings one ground animal at stage 1, so the first watering always
  shows an animal by day. Pick the smallest walker the scene has, and do not hide it on a phone.
- **Food chain.** At least one predator, and more prey than predators.
- **Motion mix.** At least one fast mover, slow walkers, one constant ambient layer (mist, leaves,
  dust, fireflies) and the timed event. Every walker has an idle pose and keeps its legs down when
  it stops. Flyers are fly-across (`flyBy`), circling in place (`soarAt`, as the rainforest eagle
  does, never crossing the whole page), or perched (`percher`). A scene's daytime flyers cover a
  slow (up to 14 px/s), a medium (15 to 30) and a fast (31 and up) flyby and one circler.
- **Scale**, in art px at scale 1. An adult's body (its build's `len`, rump to chest) follows its
  real head-and-body length, compressed: **11.3 × metres^0.39 px**, within 15% (at least 2 px either
  way). A 0.5 m cat is 8 px, a 1.2 m wolf 12, a 2 m lion 15, a 6 m elephant 23. Look the length up
  for a new species and add `realLength` to its entry in the family's `FAMILY` descriptor in
  `src/nursery/assets/js/kit/<family>.js` (`kit/families.js` aggregates `REAL_LENGTH`). The young
  scale with their parents; a storybook cast keeps its book's sizes within its own scene. Birds and
  small animals whose builds have no `len` follow the scale by eye until they get one.
- **Poses.** A pose moves the parts and adds none: no pose covers more than 1.25 times the pixels the
  animal covers walking, except one that opens wings or fans a tail. Sitting up, howling and rearing
  change the outline, not the size.
- **Colour.** Ration bright accents (flowers, fruit), hardest in open scenes. Give a white animal a
  grey edge so it shows on the light page. Match the palette's maturity to the place (an ancient
  rainforest is deep and dark green, not pastel).
- **Placement.** Landmarks go through `placeLandmarks`, tall ones with `away` past `CLEARING` so
  they stay out from behind the sign-in card. Plants that grow together are sown with `grove`; rare
  plants get `scatter({ max })`; tall plants are scaled by `clearing(x, cols)`.
- **Accuracy.** Species come from that place's own lists (a park's species list, a regional
  wildlife page), in the right season for the palette. Dark mode is night: day birds stay home
  (`when: "day"`) and night animals (owls, fireflies) come out (`when: "night"`).
- **Style.** Shaded colour, lit from above, and no ink outlines (see Depth); storybook scenes
  follow the public-domain illustrations (Shepard, Tenniel) unless the user has chosen otherwise.
- **Families.** Every animal and tree belongs to a family with one shared design, declared as
  `export const FAMILY` in its kit module and aggregated by `src/nursery/assets/js/kit/families.js`.
  Members differ only in size, colour and the traits the family names: a tiger would be the lion
  without the mane, with its own colour and stripes, and a fox, coyote and wolf are one design at
  three sizes. Refresh a whole family at once, never one member alone. When something has no family,
  add one. Storybook characters are listed with their real family to compare, but keep their book's look.
- **Depth.** Four tones lit from above, laid as areas, never as lines round the shape: a highlight
  on top, the base, a shade lower down, the darkest underneath. Far legs take a darker tone. Night
  darkens the same tones. Every animal, tree and rock casts a soft shadow on the ground. Detail
  comes from better use of today's pixels, never smaller pixels.
- **Built from parts.** An animal is a body, legs, a tail and a head, drawn by its family's build
  in the kit; poses come from moving the parts, never frozen frames. A leg 5 px or taller bends at
  two joints; a shorter one cycles four drawn poses (reaching, under, pushed back, lifted). Every
  leg has a full thigh above a slimmer lower leg and is filled row by row, never joined only at a
  corner. A standing leg is straight, the far legs apart from the near ones. Proportions and gaits
  come from reference photos fetched before drawing. A proposal draws with the kit's build and
  drafts its changes to it, never with a renderer of its own. The user's pixel edits on a built
  animal are kept as touch-ups per pose.
- **Whole bodies.** One connected shape: no gaps, stray pixels or pinholes in any frame. A part
  moves with what it grows from: mane, ears, horns and antlers with the head, a tail with the hips,
  a wing rooted on the shoulder and changing shape through its beat.
- **Walk.** Four beats, the legs a quarter stride apart, each on the ground about two thirds of
  the stride. Steps follow the ground covered (the kit's `stride` clock), so a planted foot holds
  its spot and the pace stays natural, about 1 to 2 strides a second. Fore legs bend forward at the
  wrist, hind legs back at the hock, and legs taper to the paw. The body dips at most a pixel with
  the step, and the tail sways.
- **At rest.** Ease into and out of a stop over about a quarter second. A standing animal breathes,
  blinks and now and then looks about.
- **Plants.** Show how a plant is built: a lit and shaded trunk, visible boughs, and foliage in
  separate clumps with sky between (the Bee Tree, the Scots pine, the sequoia), not a ball or a
  cone on a stick. A conifer ends in a pointed leader or a flat top, never a round blob. A part
  sways with what it grows from.

## Kit

Reach for the kit before writing anything scene-local; each export is documented where it is
defined, so read the file's header and the comment above the function.

- `pixel.js`: placement (`placeLandmarks`, `grove`, `scatter`, `clearing`), drawing (`part`,
  `scaledPart`, `sprite`), and `shadowColour(pal)`, the scene palette's one `groundShadow` that every
  animal, plant and rock casts its ground shadow in.
- `critters.js`: walkers, flyers (`flyBy`, `drift`, `soarAt`, `circlingPair`, `flock`), perchers and their idle
  moves, `rest` (a stopped walker takes one of its poses), `isNight`, `narrow`.
- `runner.js`: cast runner (`runCast`, `walkerActor`, `followerActor`, `crossingActor`,
  `circlerActor`, `drawStep`, `activeFor`, `tickTimer`). It applies each entry's stage
  (`arrives`), day/night (`when`, default "always") and phone (`phone`, default "show") rules to
  both update and draw, and couples walk, settle and rest. The cast list's order is the drawing
  order: the scene's own drawing goes in the list as a `drawStep(id, (g, f) => ..., { back })` at
  the place it is drawn. A `crossingActor` passes on only the options it states, so the kit's
  defaults (`flyByPerch`: odds 0.5, stay [14, 28]) apply to the rest.
- `place.js`: what every family's `...At` driver shares round its pose: `paintAt` (lays a
  build's cells on the page facing `dir`, over its ground shadow), `tonesFor`, `sinceOf`, `ease`,
  `blinkAt`, `breathAt`, `feet`, `stillOf`, `lyingLoop`, `grazingLoop`, `loopAt`.
- `poses.js`: shared sprite-box helpers (`walk`, `bird`, `butterfly`, `swinging`, `owlPerched`,
  `soarSprites`, `housecatSprites`) used by scene `SPRITES` tables.
- `families.js`: aggregates every family's `FAMILY` descriptor into `FAMILIES`, `SCALE`, `scaleOf`,
  `SPECS`, `REAL_LENGTH`, `PREDATORS` and `DRIVERS`.
- `flyers.js`: the birds in the air (`eagleFlyAt`, `circlerAt`, `glideAt`, `hawkAt`, `flyerAt`,
  `kingfisherAt`), the puffins' `nesterAt` and the owls (`owlPerchAt`, `owlFlyAt`).
- `perch.js`: birds coming down to perch (`flyByPerch`, `circlerPerch`, `goHome`) on the spots a
  scene offers (`unhidden`, `blobSpots`), and drawn on their visit (`visitAt`, `smallVisitAt`).
- `body.js` (`drawBody`) and one module per animal family beside it (`bear.js`, `deer.js`,
  `canid.js`, `felid.js` with `felidAt`, `felidPoses` and `HOUSECAT_COATS`, `bovid.js`, `horse.js`,
  `giraffe.js`, `elephant.js`, `pig.js`, `swimmer.js`, `primate.js`, `beast.js`, `groundbird.js`,
  `shell.js`, `longneck.js`, `cast.js`, `wonderland.js`, `fish.js`, `octopus.js`, `insect.js`).
  Each module owns its build, its `...At` driver(s) and its `export const FAMILY` descriptor.
  Extend a family with a new `kind` rather than drawing a scene-local copy.
- `trees.js` and one build file per plant family beside it (`broadleaf.js`, `conifer.js`,
  `widecanopy.js`, `palms.js`, `desert.js`, `reef.js`), each with its `FAMILY` descriptor.
- `plants.js`: `crossFlower`, `meadowFlower`.
- `effects.js`: mist, stars, the Milky Way.

Anything that stands on or reaches into a plant or rock (a percher, a browser, a climber) reads
that build's own geometry (`acaciaGeom`, `joshuaGeom`, `graniteTop`), never a copy of its
formulas, so its feet land in every frame. Create animals in `update`, never in `draw`: the
catalogue steps `update` without drawing.
