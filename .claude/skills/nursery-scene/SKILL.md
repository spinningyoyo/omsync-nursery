---
name: nursery-scene
description: Design, add, change or review a nursery scene in src/nursery/assets/js/ (scenes/ and kit/): its plants, landmarks, animals, sprites, motion or palette; also applying the user's saved studio edits, and the studio itself.
---

# Nursery scenes

omsync's sign-in page grows a pixel-art scene in eight waterings. A scene is one module in
`src/nursery/assets/js/scenes/`, drawn with the kit in `src/nursery/assets/js/kit/`. The header of
`src/nursery/assets/js/nursery.js` is the scene contract. Before you edit a scene, read its module
end to end and its `docs/scenes/<scene>.md`.

Which path:

- **The user saved pixel edits**: follow [studio-edits.md](studio-edits.md); no proposal.
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
4. **Build** with the kit. Then `uv run nursery preview scene <scratch> <scene> 1200 520
   "shots=0,20"` and again at `390 700`, and look at every image, day and night. Done when no
   frame shows a floating sprite, a perch-less percher, a sprite cut at the page edge, or a
   `console:` line.
5. **Catalogue** ([catalogue.md](catalogue.md)): `ELEMENTS`, `SPRITES` and `families.js` in step,
   then `uv run nursery catalog`.
6. **Commit** here. A new scene also registers in `nursery.js` (import and `SCENES`),
   `src/nursery/assets/scenes.json` (id and picker label, in picker order) and
   `src/nursery/assets/css/scenes.css` (tint and backdrop washes, day and night); the omsync
   contract in `docs/overview.md` says what omsync reads.
7. **Release** only when the user asks: `uv run nursery release --patch` for a new scene or an art
   fix, or `--minor` for a change to the omsync contract (while the major version is 0). Add
   `--dry-run` first. The first release of a version needs no flag. A release changes nothing in
   omsync. omsync takes it when its owner runs its upgrade script. To see the art in omsync before
   a release, run `sh scripts/dev-nursery.sh serve` in omsync. When what the user sees changes,
   update the scene paragraph in omsync's `docs/architecture/interface.md`.

## Design rules

- **Signature.** Each scene has a signature landmark, a signature animal and one timed wow event
  every 20–60 s (a geyser, a whale's spout, a stooping hawk, a bugling elk, a croquet stroke). Add
  at least one "nice detail" that rewards someone who knows the place or the book.
- **Feel and density.** Open scenes (desert, beach, savanna) have at most 5 ground animals and 1
  flyer at a time; dense scenes (rainforest, woods) at most 8. Use `narrow(f)` to leave out the
  young and extras on a phone.
- **First watering.** Every scene brings one ground animal at stage 1, so the first watering always
  shows an animal by day. Pick the smallest walker the scene has, and keep it out of `narrow(f)` so
  phones show it too.
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
  `src/nursery/studio/shared/families.js`. Members differ only in size, colour and the traits the family names:
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

## Kit

Reach for the kit before writing anything scene-local; each export is documented where it is
defined, so read the file's header and the comment above the function.

- `pixel.js`: placement (`placeLandmarks`, `grove`, `scatter`, `clearing`) and drawing (`part`,
  `scaledPart`, `sprite`).
- `critters.js`: walkers, flyers (`flyBy`, `drift`, `soarAt`, `flock`), perchers and their idle
  moves, `isNight`, `narrow`.
- `animals.js`: one design per family, a habitat variant chosen by `kind`. Extend a family with a
  new `kind` rather than drawing a scene-local copy.
- `trees.js`: `broadleafTree`, `coniferTree`.
- `effects.js`: mist, stars, the Milky Way.

A percher stands on a plant whose top you compute from its scale (a painter helper such as
`graniteTop`), so its feet land on the rock in every frame. Create animals in `update`, never in
`draw`: the catalogue steps `update` without drawing.
