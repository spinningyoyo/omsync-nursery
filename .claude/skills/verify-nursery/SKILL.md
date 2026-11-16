---
name: verify-nursery
description: Run `uv run nursery verify` to check the nursery art against the design rules in the nursery-scene skill (the scale, poses, walk cadence, grounded walkers, perched birds, no day birds at night, no errors, the engine contract), in every scene, light and dark, at both page widths. Use after any change to a scene or kit module, before calling art done, or when asked whether the art still follows the rules.
---

# Verify the nursery

`.claude/skills/nursery-scene/SKILL.md` is the spec. `nursery verify` runs the real engine
(`src/nursery/assets/js/nursery.js`, the scenes and the kit) in headless Chrome under a fake clock
and seeded random numbers, and checks each frame against the rules below. The same code gives the
same findings every time. A rule that passes says only "no counterexample in the scope below".

## Run

    uv run nursery verify                      # every scene, every rule: about 75 s
    uv run nursery verify meadow desert        # some scenes
    uv run nursery verify --rule grounded      # one or more rules (names in the table)
    uv run nursery verify --early 30 --full 60 # seconds watched at stage 1 and at stage 8
    uv run nursery verify --triage             # the owner's marks from the studio

Exit 0 means every rule passed; exit 1 means findings. Each finding prints one line:
`rule: scene theme size (width px) stage N t=Ts: actor says: measured X, limit Y (N frames); detail`.
Under `.nursery/verify/<yyyymmdd-hhmmss>/` (git-ignored) each finding also gets a `.txt` with that
line and a `.png` crop at 8x with the actor boxed in pink (the first 4 findings per rule and job).
The summary lists what was covered, the wall time, and what
is not covered.

Each run also writes `findings.json` beside its evidence, which the studio reads.

Scope: all 10 scenes (`src/nursery/assets/js/scenes/`), light and dark, 1200x520 and 390x700,
seed 1, a clock stepped at 8 frames a second (the engine moves at most 0.05 s of scene time a
frame, so the seconds below are scene time at that pace). One click waters stage 1 and it is watched 30 s;
then one charged watering reaches stage 8 and it is watched 150 s (perching birds come round only
that slowly). Stages 2 to 7 are not watched.

## In the studio

The studio's **Verify** view lists a run's findings grouped by animal and fault, with filters, and
plays any finding again: the same job, seed and clock in a hidden iframe (`verify/replay.html`,
`replay.js` on the harness's `run(job, hooks)`), so the frames are the ones the rule saw. It draws
what the rule measured from the report's `guide` (the ground row, the scenery
under a perched bird's feet). **Run verify** and **This scene** start a run from there.

The owner marks each group (one rule, one animal, one fault, in every scene and run) as real
bug, rule too strict or ignore, with a note, in `.nursery/verify/triage.json`. Read the marks with
`--triage` before acting on findings: fix the art for a real bug, bring the rule back to the owner
for rule too strict, and leave ignored groups alone.

## Doctor

    uv run nursery verify --doctor

Read-only. Starts headless Chrome, loads the engine and every scene, draws a frame and prints
`Chrome and the engine load: 10 scenes (...)`. Anything else, fix that first (Chrome and chromedriver
come from `src/nursery/headless.py`).

## Rules

All in `src/nursery/verify/rules.js`: an object each in `RULES` with name, says, harm, scope, covers
and a `frame`, `finish` or `engine` function. Add a rule by adding an entry. The actors each kit
driver draws are classified in `src/nursery/verify/actors.js`; the scale, predators and open or
dense scenes are tags in `src/nursery/studio/shared/families.js` (`SCALE`, `REAL_LENGTH`,
`PREDATORS`, `OPEN_SCENES`), shared with the studio.

| Rule | Sentence | Harm | Scope and bounds | Covers |
|---|---|---|---|---|
| scale | Every adult's body (its build's `len`) is as long as 11.3 × metres^0.39 px for its real head-and-body length, within 15% (at least 2 px). | Animals out of proportion with each other: the cheetah drawn longer than the lion. | Once per run, on the specs in `verify/scale.js` with a length in `REAL_LENGTH`: cats, dogs, bears, deer, bison, bighorn, zebra, elephants. Not on it: the young, storybook casts, the giraffe (its length is mostly neck), birds and small animals (no `len`). | `families.js` SCALE, REAL_LENGTH; `verify/scale.js`; each build's member specs |
| pose | No pose covers more than 1.25 times the pixels the animal covers walking, except one that opens wings or fans a tail (flap, fly, display). | A pose that grows an animal out of shape or draws a part twice. | Every walker, every frame, against the largest area it covered walking or standing so far in the run. | the drivers in `kit/animals.js` and the builds' rest poses; `harness.js` measure (area) |
| gap | An animal is one piece: every solid pixel touches the rest of its body, at least at a corner. | A part that comes loose: the owl's head lifting a row off its neck. | Every walker, perched bird and flyer, every frame; pieces grouped by side and corner contact; every piece but the largest is loose. Left out: pieces painted entirely in rgba() (sound rings, fading dust) or in a palette colour named for dust, the elk's breath while it bugles and the secretary bird's prey while it stamps. | every kit driver and build; `harness.js` recorder |
| walk-cadence | A walking animal makes 0.5 to 3 strides a second. | Frozen or shuffling legs (Wonderland walkers at 12 a second). | Walkers with a stride clock `w.c` (`critters.js stride()`): Wonderland rabbit, hare, dodo, soldier, roadrunner, turkey, secretary, moa, otter, seal, lion cub, swan. One second of steady walking per sample; a bound or pounce (its own clock) is skipped. Bears, dogs, deer, cats read the ground they cover and have no clock: not covered. | `kit/critters.js` stride, wander; `scenes/*.js` stride calls |
| grounded | A walker's lowest solid pixel is on its ground row (within 1 row) unless it jumps, bounds or climbs, and a shadow lies under it. | Floating or sunken sprites. | Every driver whose role is walker; the ground row is the row above its own soft shadow; `actors.js airborne()` lists the states skipped (pounce, run, leap, hop, lift, climb, fly, and the roll and wallow that rock a zebra or bison on its back). | `kit/animals.js` and the kit drivers, `kit/critters.js` walker |
| perched | A perched bird's foot row rests on solid plant or rock pixels in every frame. | A bird sitting on air. | Birds in perch mode (flyByPerch visits, owls, the Iceland nesters): the scenery is that same frame drawn again without any traced animal; a foot column needs alpha 0.6 or more directly below the foot row. Visits perch rarely, so coverage is the count printed as "Perched-bird frames checked". | `kit/animals.js` visitAt, owlPerchAt, nesterAt, pickSpot, blobSpots; each scene's spots |
| night | In dark mode no day bird is updated or drawn. | Day birds flying about at night. | Dark mode, every scene and frame. Drawn: a traced driver tagged `day: true`. Updated: an `extra` slot holding a bird or an active circler whose name is not an owl, a nester, a tumbleweed, a balloon or bees. | `kit/critters.js` isNight; each scene's update and draw; `actors.js` day |
| no-errors | No console error or exception at any scene, theme, width, stage or time. | A broken sign-in page (a missing import throws while a bird lands). | Everything logged with console.error, thrown in a frame or unhandled, in all runs. | every module the engine imports |
| engine-contract | A click waters one stage, a charged watering grows that many stages (capped at 8), reduced motion grows at once with no particles, the engine follows the page theme each frame, and setScene swaps at the given stage. | The sign-in page stops growing or shows the wrong theme or scene. | Engine alone, every scene and width: 9 clicks; charged levels 1 to 9 from 0, level 6 from 5; reduced motion; light to dark to light; setScene at stage 4; a start at stage 3. Source: `docs/overview.md`. | `nursery.js` Nursery |

Stage 2 (not built): whole-body, density, first-watering, food-chain, flyer-mix, wow-event,
page-edge, ease-at-rest. Not covered either: animals a scene draws without a kit driver, stages 2
to 7, seeds other than 1.

## Evidence

Read the line first: actor, what was measured, the limit. Open the `.png` in
`.nursery/verify/<run>/` to see the box on the art, and the matching `.txt`. Reproduce in
`uv run nursery preview scene OUT SCENE 960 480` (its timing is not seeded, so look for the same
pose, not the same frame). The scene's `docs/scenes/<scene>.md` and the nursery-scene skill's
size table say what was meant.

## Real bug vs. rule or tag error

- Real bug: the art breaks the skill's sentence (a cheetah 46% longer than the scale, an owl whose
  feet have no solid pixel under them). Report it with the counterexample; do not weaken the rule and do
  not change art to silence it unless asked.
- Tag error: a real length in `REAL_LENGTH` is wrong, a spec is mapped to the wrong member in
  `verify/scale.js`, or a driver is classified wrong in `actors.js`. Fix it and say so.
- Rule error: the rule measures something the sentence does not say. Fix the rule only when it is clearly wrong, and say so.
- Measured value looking equal to the limit (0.5 against 0.5 to 3) means rounding; values show two
  decimals.

## Proofs

Each rule was shown failing on a scratch break, then passing after the revert (the finding was
absent from the clean run and present with the break; the file was restored byte for byte).

| Rule | Scratch break | Failing line |
|---|---|---|
| scale | none needed: today's cheetah (`len` 18) is the counterexample | `scale: the kit: cats/cheetah is drawn too long for its size: measured 18 px long, limit 11 to 14 px (the scale gives 12.3 for 1.25 m)` |
| pose | `kit/animals.js` canidAt: each resting pixel also drawn 4 rows higher | `pose: desert light wide (1200 px) stage 8 t=15.45s: canidAt:coyote grows in a pose: measured 180 px of area, limit at most 136 px (1.25 x the 109 px it covers walking)` |
| gap | none needed: today's pronghorn is the counterexample (its horns float a row above its head) | `gap: yellowstone dark phone (390 px) stage 1 t=0.45s: cervidAt:pronghorn comes apart: measured 7 loose pixels, limit none: one piece` |
| walk-cadence | `scenes/wonderland.js`: after `stride(x.rabbit, ...)` add `if (x.rabbit.moving) x.rabbit.c += dt * 12;` | `walk-cadence: wonderland dark phone (390 px) stage 1 t=1.5s: wonderlandRabbitAt:rabbit walks too fast for its legs: measured 13.78 strides a second, limit 0.5 to 3 strides a second` |
| grounded | `kit/animals.js` canidAt: the `lift` its `paintAt` call ends with to `lift + 2` (before: `y - 1 - h - lift` to `y - 3 - h - lift`) | `grounded: desert dark wide (1200 px) stage 8 t=12.45s: canidAt:coyote floats above its shadow: measured 2 rows above its ground, limit within 1 row of the ground row` |
| perched | `scenes/iceland.js`: nester `top` minus 2 rows | `perched: iceland dark wide (1200 px) stage 8 t=14.75s: nesterAt:puffin sits on nothing: measured 0 solid pixels under its feet` |
| night | `scenes/meadow.js` update: `const day = !isNight(f)` to `const day = true` | `night: meadow dark phone (390 px) stage 8 t=12.45s: extra.kingfisher is still updated at night: measured 1 day birds updated, limit none at night` |
| no-errors | `scenes/meadow.js`: remove `isNight` from its import | `no-errors: meadow light wide (1200 px) stage 0 t=0.05s: threw or logged an error: ... ReferenceError: isNight is not defined` |
| engine-contract | `nursery.js` sprinkle: `(power \|\| 1)` to `(power \|\| 2)` | `engine-contract: meadow light wide (1200 px): click 1 from stage 0 returns the stage: measured 2, limit expected 1` |

To redo a proof: copy the file aside, make the change, run `uv run nursery verify --rule NAME`,
compare against a clean run of the same rule, then copy the file back and `cmp` it.

The probe (one `if (g.trace) return g.trace.draw(...)` line at the top of each animal driver, and
`trace: this.trace` in the painter in `nursery.js`) changes no pixel: 40 jobs (10 scenes, light and
dark, both widths, 60 s each with 30 frame hashes) hashed identically with and without those lines.

## Sync commit

Rules last confirmed against `2235c2a` plus the uncommitted Verify view (the perched rule now
draws the scenery of each frame, not once a run; the first run after that change gave the same
402 findings). Move this sha only after you have re-read the rules against the code
they cover (the Covers column) and confirmed they still describe it, and a clean
`uv run nursery verify` shows only the findings you expect.

## Cleanup

Evidence folders under `.nursery/verify/` are git-ignored; delete old runs with
`rm -rf .nursery/verify/2026*` (keep `FINDINGS.md` if you want it). Before you finish, run
`git diff` and make sure no scratch break is left in `src/nursery/assets/js/`.
