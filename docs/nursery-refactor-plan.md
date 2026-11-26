# omsync-nursery refactor: a scene declares its cast

Brief for the agent that implements this. Repository: `../omsync-nursery` (sibling of `omsync`).
Read its `AGENTS.md`, `docs/overview.md` and `.claude/skills/nursery-scene/` before you start.

## The problem in one paragraph

A scene does not say what is in it. Its cast lives inside hand-written per-frame code
(`extras.init/onGrow/update/draw`). Every tool therefore rebuilds that knowledge in its own
hand-kept registry, and ties the registry back to the scene by regex over the scene's source text.
Each new animal or scene adds entries to several registries that only a checklist keeps in step.
The product works; the code does not scale.

## Evidence (measured 2026-11-25)

Adding one animal touches 7 files in 2 languages:

| File | Lines | What it holds about the animal |
|---|---|---|
| `src/nursery/assets/js/scenes/<scene>.js` | 780-1,500 each | behaviour: arrival stage, day/night, timers, drawing |
| `src/nursery/assets/js/kit/<family>.js` + `kit/animals.js` | animals.js 1,751 | look; animals.js is a hub of every family's driver |
| `src/nursery/catalog_elements.py` | 2,104 | label, kind, sprite names, and regexes that must match lines of the scene file |
| `src/nursery/studio/shared/sprites.js` | 1,065 | a hand-written sample state for every sprite name |
| `src/nursery/studio/shared/families.js` | 408 | family membership, `REAL_LENGTH` |
| `src/nursery/verify/actors.js` | 171 | driver function to family/role/member |
| `src/nursery/verify/scale.js` | small | body spec per family/member |

A new scene also needs: an import and `SCENES` entry in `nursery.js`, id/label/group repeated in
`assets/scenes.json`, colours in `assets/css/scenes.css`, and a block in each registry above.

Common behaviour is rewritten per scene. Per scene module: about 9-16 `f.stage >= N` arrival gates,
2-7 `isNight(f)` gates, 8-17 hand-rolled `next`/`every` timers, plus `narrow(f)` phone checks.
`scenes/greatbarrier.js` defines its own `flyBySlot`, a copy of `kit/critters.js` `flyBy`.
Art (palettes, painters) and choreography are mixed in one file.

Tools read source text:
- `catalog.py` finds the `paint:` map with a regex (`paint_kinds`).
- `catalog.py` rewrites each scene's source to export its functions (`exported_copy`,
  `paths.scene_copy`) so the catalogue and studio can draw them (`/copies/<scene>.js`).
- `docs/scenes/*.md` link line numbers, so any scene edit makes them stale and `scripts/check.sh`
  (`docs_fresh`) fails until regenerated: 68 generated-doc file changes in 23 commits this month.

## Target design

A scene is three things: a place, a cast, events. The cast and events are data the scene
declares. A shared cast runner in the kit executes them.

```js
// in a scene module's default export
cast: [
  { id: "fox", label: "red fox", family: "dogs", member: "fox",
    role: "walker", arrives: 5, when: "day", phone: "hide",
    behaviour: wander({ speed: 9 }), poses: ["walk", "pounce"] },
  { id: "manta", label: "reef manta", family: "rays", member: "manta",
    role: "swimmer", arrives: 6, when: "day", event: { every: [25, 45] },
    behaviour: crossing({ speed: 12 }) },
],
```

1. **Family module = single source for a family.** Each family exports one descriptor: members,
   build/spec (`len`), real length, poses, and its draw function. `families.js`, `REAL_LENGTH`,
   `verify/actors.js` and `verify/scale.js` are derived from the descriptors, not hand-kept.
   `kit/animals.js` stops being a hub.
2. **Cast declarations.** Each scene declares its cast and events as data (shape above; the exact
   schema is yours to design, keep it minimal). Sample states for poses live with the declaration
   or the family, so the studio and catalogue draw them without `sprites.js`.
3. **Cast runner in the kit.** Stage arrival, day/night, phone hiding, timed events, crossings
   (flyBy for birds and swimmers alike), and hide-on-threat run once, in the kit. Behaviour that is
   truly a scene's own (Serengeti lion on Pride Rock, the reef octopus inking and jetting) stays a
   behaviour function the declaration references. Do not force unique behaviour into presets.
4. **Tools read declarations at runtime.** The catalogue and studio already load scenes in headless
   Chrome; read `cast`, `paint` and the family descriptors from the imported module. Delete the
   regexes, `exported_copy`/`scene_copy`, `catalog_elements.py`, and most of `sprites.js`.
5. **Built registries.** Generate `scenes.json` and `scenes.css` from the scene modules (id, label,
   group, tint and wash colours declared in the module), with a `--check` like `nursery brand --check`.
   The files and their paths stay the same, so omsync's contract does not change.
6. **Stable generated docs.** No line numbers. A doc changes only when a cast changes.

## Phases

Each phase is shippable on its own and leaves the product unchanged.

| Phase | Work | Done when |
|---|---|---|
| 1 | Family descriptors; derive families.js, REAL_LENGTH, actors.js, scale.js; split animals.js | Studio Families view, `nursery verify`, catalogue tables unchanged |
| 2 | Cast declarations as data (labels, family, poses, arrival, when); tools read them; delete catalog_elements.py, regexes, source rewriting, most of sprites.js | Catalogue tables identical; studio shows every sprite it showed before |
| 3 | Cast runner; move common choreography into the kit, one scene per commit | Per scene: catalogue tables identical, `nursery verify` passes, previews match day and night at 1200x520 and 390x700 |
| 4 | Generate scenes.json and scenes.css from modules, with a check in `scripts/check.sh` | Generated files byte-identical to today's |
| 5 | Rewrite the nursery-scene skill, `docs/overview.md`, the catalogue doc format | Docs describe the current design only |

## Regression oracle

`uv run nursery catalog` runs every scene through stages 0-8, light and dark, with a fixed seed per
scene and theme, and writes deterministic tables (what arrives at which stage, counts at 90/160/240
px, day versus night). Before phase 1, save its output (`--out <dir>`) as the baseline. After every
step, the tables (ignoring line-number columns) must match the baseline exactly. Any difference is a
behaviour change: stop and report it. Also run `uv run nursery verify` and look at
`uv run nursery preview scene <out> <scene> 1200 520 "shots=0,20"` and `390 700`, day and night.

## Rules you must follow (from the repositories)

- Code is the behaviour. Docs are high level, ASD-STE100 style, no restating code, no history.
- Tests are end-to-end only (`tests/e2e/`). Do not add tests unless the owner asks. Update an
  existing test when the behaviour it covers changes.
- `assets/js/` modules import only each other by relative path; a scene imports only `kit/`;
  `garden/` is for hosts only. `python3 scripts/check_js_imports.py` enforces this. Add a rule for
  any new layer you introduce.
- Commit only when the owner asks. Stage explicit paths. Commit messages `type(scope): summary`,
  short, no inventories. Never force-push. Never `git reset --hard`, `git stash`, `--no-verify`.
- Feature commits never touch `CHANGELOG.md`. The release commit writes the version's section,
  one short sentence per item (see AGENTS.md).
- `.nursery/` is the owner's working state: read it, do not change it (except archiving built
  proposals, per the skill).
- What hosts read is the host contract in `docs/overview.md`. Hosts: omsync (installs the package
  from the `release` branch) and Mantle Reef in `../mantle` (reads `../omsync-nursery/src/nursery/assets`
  live from main, no release cycle). A change to the contract changes omsync's host code in the
  same omsync commit as its version range.
- Run `sh scripts/check.sh` and `uv run pytest` before reporting a phase done.

## Owner decisions to ask before you start

1. Keep `docs/scenes/*.md` in the repository (stable, no line numbers), or drop them in favour of
   the studio, which shows the same from the code?
2. Scope: all five phases, or stop after phase 2? Phase 3 removes the real duplication and carries
   the most risk.
3. Pace: report after each phase, or run through and report at the end?

The owner's preferences: smallest stated requirement first, no overengineering, consistency across
hosts, explain each proposal by what is gained or lost before the mechanism, and restate your
reading and wait for "go" before building.
