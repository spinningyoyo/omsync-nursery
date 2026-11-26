// The rules `nursery verify` checks the art against, one entry each. A rule is an object:
//
//   name     what `--rule` calls it
//   says     the rule in one plain sentence
//   harm     what goes wrong on the page when it is broken
//   scope    what the rule looks at, and its bounds
//   covers   the files and functions it depends on, so a change there sends the next agent here
//   frame    (ctx) called after every simulated frame with that frame's draws; it reports a fault
//            with ctx.run.report(rule, key, { actor, value, unit, limit, says, detail, box, guide });
//            guide holds the numbers the studio's replay draws (a limit line, the ground row)
//   finish   ({ run, job, errors }) called once when a job's run is over
//   engine   async ({ job, step, viewport, SIZES }) -> findings, for rules about the engine itself
//            rather than the art, which run in their own job
//   static   () -> findings, for rules about the kit's specs alone, run once in their own job
//
// A draw (ctx.draws) is { driver, family, role, member, young, day, state, actor, args, box, rects,
// id, prev } where box is the solid pixels' { x0, y0, x1, y1, w, h, footRow, shadowRow }. To add a
// rule, add an entry to RULES; nothing else needs to change.

import { REAL_LENGTH, SCALE, SPECS, scaleOf } from "../js/kit/families.js";
import { P } from "../js/kit/pixel.js";
import { MAX_STAGE, Nursery, SCENES } from "../js/nursery.js";
import { airborne } from "./actors.js";

const CADENCE = [0.5, 3]; // strides a second
const CADENCE_WINDOW = 1; // seconds of steady walking each measure covers
const GROUND_TOLERANCE = 1; // rows
const POSE_GROWTH = 1.25; // a pose may cover at most this much more area than the animal walking
const SPREAD = new Set(["flap", "fly", "display"]); // poses that open wings or fan a tail

const rowTop = (box) => ({ x0: box.x0, y0: box.y0, x1: box.x1, y1: box.y1 });
const label = (d) => `${d.driver}:${d.member}`;

const scale = {
  name: "scale",
  says: `Every adult's body is drawn as long as the scale gives for its real head-and-body length: ${SCALE.a} x metres^${SCALE.k} px, within ${SCALE.tolerance * 100}% (at least ${SCALE.least} px either way).`,
  harm: "Animals out of proportion with each other: the cheetah drawn longer than the lion, the bears a size too big.",
  scope:
    "Each adult build in kit/families.js with a real length in REAL_LENGTH: the cats, dogs, bears, deer, bison and bighorn, zebra and elephants. It reads the spec's body length (len), so it holds in every pose. Not on the scale: the young, the storybook cast, the giraffe, and the birds and small animals whose builds have no body length.",
  covers: ["kit/families.js SCALE, REAL_LENGTH, SPECS", "each build's member specs (len)"],
  static() {
    const found = [];
    for (const [key, spec] of Object.entries(SPECS)) {
      const metres = REAL_LENGTH[key];
      if (!spec || metres == null) continue;
      const { target, low, high } = scaleOf(metres);
      if (spec.len >= low && spec.len <= high) continue;
      const long = spec.len > high;
      found.push({
        key: `scale|${key}`,
        rule: "scale",
        scene: "kit",
        theme: "light",
        size: "wide",
        width: null,
        stage: null,
        time: null,
        count: 1,
        actor: key,
        value: spec.len,
        unit: "px long",
        limit: `${Math.ceil(low)} to ${Math.floor(high)} px (the scale gives ${target.toFixed(1)} for ${metres} m)`,
        says: long ? "is drawn too long for its size" : "is drawn too short for its size",
        detail: `${Math.round((spec.len / target - 1) * 100)}% off the scale; its build's len is ${spec.len} px`,
      });
    }
    return found;
  },
};

const pose = {
  name: "pose",
  says: `A pose moves the animal's parts and adds none: no pose covers more than ${POSE_GROWTH} times the pixels the animal covers walking, except one that opens wings or fans a tail.`,
  harm: "A pose that stretches or grows the animal out of shape, a part drawn bigger or twice.",
  scope: `Every walker in every scene, theme, width, stage and frame, against the largest area it has covered walking or standing so far in the run (a pose before it first walks is not checked). Area is its solid pixels, each counted once. Poses that open wings or fan a tail (${[...SPREAD].join(", ")}) are left out.`,
  covers: [
    "kit/<family>.js drivers and the builds' rest poses (sit, lie, howl, rear, ...)",
    "harness.js measure (area)",
  ],
  frame({ draws, run }) {
    run.walking ??= new Map();
    for (const d of draws) {
      if (d.role !== "walker" || !d.box || !d.actor) continue;
      const a = d.actor;
      const who = `${label(d)}${d.young ? ":young" : ""}${a.kind ? `:${a.kind}` : ""}`;
      const walked = run.walking.get(who);
      if ((a.state === "walk" && a.moving !== false) || a.pose === "stand" || a.state === "stand") {
        run.walking.set(who, Math.max(walked ?? 0, d.box.area));
        continue;
      }
      const what = a.pose ?? d.state ?? a.state ?? "";
      if (!walked || SPREAD.has(what)) continue;
      const bound = Math.floor(walked * POSE_GROWTH);
      if (d.box.area <= bound) continue;
      run.report("pose", label(d), {
        actor: label(d),
        value: d.box.area,
        extreme: "max",
        unit: "px of area",
        limit: `at most ${bound} px (${POSE_GROWTH} x the ${walked} px it covers walking)`,
        says: "grows in a pose",
        detail: what,
        box: rowTop(d.box),
      });
    }
  },
};

// The solid pixels of a draw, by "x,y", with the fill each was painted in.
function pixelsOf(d) {
  const on = new Map();
  for (const r of d.rects) {
    if (r.alpha < 0.6 || r.w <= 0 || r.h <= 0) continue;
    for (let i = 0; i < r.w; i += 1) for (let j = 0; j < r.h; j += 1) on.set(`${r.x + i},${r.y + j}`, r.style);
  }
  return on;
}
const N8 = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];
const cell = (k) => k.split(",").map(Number);
const BODY_ROLES = new Set(["walker", "perched", "flyer"]);
// Poses that draw something apart from the body in a solid colour: the bugling elk's breath, the
// secretary bird's prey on the ground, and basking effects. Other effects are told apart by their colour:
// painted in rgba() (sound rings, fading dust) or in a palette colour named for dust (the wallowing bison's).
const EFFECT_POSES = new Set(["bugle", "stamp", "bask"]);
const dustColours = (pal) =>
  new Set(
    Object.entries(pal ?? {})
      .filter(([k, v]) => /dust/i.test(k) && typeof v === "string")
      .map(([, v]) => v.toLowerCase()),
  );

const gap = {
  name: "gap",
  says: "An animal is one piece: every solid pixel touches the rest of its body, at least at a corner.",
  harm: "A part that comes loose: the owl's head lifting a row off its neck as it turns.",
  scope:
    "Every walker, perched bird and flyer in every scene, theme, width, stage and frame. Its solid pixels (alpha 0.6 or more) are grouped into pieces that touch side or corner; every piece but the largest is loose. Effects drawn apart on purpose are left out: a piece painted entirely in rgba() colours (sound rings, fading dust) or in a palette colour named for dust, the elk's breath while it bugles and the secretary bird's prey while it stamps.",
  covers: ["every kit driver and build", "harness.js recorder (rects and their fills)"],
  frame({ draws, run, nursery }) {
    const dust = dustColours(nursery.pal?.near);
    for (const d of draws) {
      if (!d.box || !BODY_ROLES.has(d.role)) continue;
      const what = d.actor?.pose ?? d.actor?.state ?? d.state ?? "";
      if (EFFECT_POSES.has(what) || EFFECT_POSES.has(d.actor?.state) || EFFECT_POSES.has(d.actor?.mode)) continue;
      const on = pixelsOf(d);
      const seen = new Set();
      const pieces = [];
      for (const k of on.keys()) {
        if (seen.has(k)) continue;
        const piece = [k];
        seen.add(k);
        for (let i = 0; i < piece.length; i += 1) {
          const [x, y] = cell(piece[i]);
          for (const [a, b] of N8) {
            const q = `${x + a},${y + b}`;
            if (on.has(q) && !seen.has(q)) {
              seen.add(q);
              piece.push(q);
            }
          }
        }
        const effect = (q) => String(on.get(q)).startsWith("rgba(") || dust.has(String(on.get(q)).toLowerCase());
        if (!piece.every(effect)) pieces.push(piece);
      }
      if (pieces.length < 2) continue;
      pieces.sort((a, b) => b.length - a.length);
      const loose = pieces.slice(1).flat().map(cell);
      run.report("gap", label(d), {
        actor: label(d),
        value: loose.length,
        extreme: "max",
        unit: "loose pixels",
        limit: "none: one piece",
        says: "comes apart",
        detail: `${what} ${pieces.length - 1} loose piece${pieces.length > 2 ? "s" : ""} of ${pieces
          .slice(1)
          .map((p) => p.length)
          .join(", ")} px`.trim(),
        box: rowTop(d.box),
        guide: { pixels: loose },
      });
    }
  },
};

const walkCadence = {
  name: "walk-cadence",
  says: "A walking animal makes 0.5 to 3 strides a second.",
  harm: "Shuffling or frozen legs: the Wonderland walkers cycling their legs 12 times a second.",
  scope:
    "Walkers that keep a stride clock (w.c, critters.js stride()): the Wonderland rabbit, hare, dodo and soldier, the roadrunner, turkey, secretary bird, moa, otter, seal, lion cub and swan. Measured over each second of steady walking (state walk, the walker moving), in every scene, theme, width and stage. Walkers whose legs read the ground they cover (bears, dogs, deer, cats, ...) have no clock to read and are not covered.",
  covers: [
    "kit/critters.js stride, wander",
    "scenes/wonderland.js update (stride calls), kit/wonderland.js leg poses",
    "scenes/serengeti.js, hawaii.js, rainforest.js, desert.js, smokies.js, iceland.js, yellowstone.js (stride calls)",
  ],
  frame({ draws, run, nursery }) {
    run.cadence ??= new Map();
    const seen = new Set();
    for (const d of draws) {
      const a = d.actor;
      if (d.role !== "walker" || typeof a?.c !== "number") continue;
      seen.add(d.id);
      // A bound or a pounce drives its legs by its own clock, not the stride clock.
      const steady = a.state === "walk" && a.moving && d.prev && !airborne(a);
      const w = run.cadence.get(d.id);
      if (!steady) {
        run.cadence.delete(d.id);
        continue;
      }
      if (!w) {
        run.cadence.set(d.id, { t: nursery.time, c: a.c });
        continue;
      }
      if (nursery.time - w.t < CADENCE_WINDOW) continue;
      const rate = (a.c - w.c) / (nursery.time - w.t);
      run.cadence.set(d.id, { t: nursery.time, c: a.c });
      if (rate >= CADENCE[0] && rate <= CADENCE[1]) continue;
      run.report("walk-cadence", `${label(d)}:${rate > CADENCE[1] ? "fast" : "slow"}`, {
        actor: label(d),
        value: Math.round(rate * 100) / 100,
        extreme: rate > CADENCE[1] ? "max" : "min",
        unit: "strides a second",
        limit: `${CADENCE[0]} to ${CADENCE[1]} strides a second`,
        says: rate > CADENCE[1] ? "walks too fast for its legs" : "walks too slowly for its legs",
        detail: `x ${Math.round(a.x)}`,
        box: d.box && rowTop(d.box),
        guide: { rate, low: CADENCE[0], high: CADENCE[1], window: nursery.time - w.t },
      });
    }
    for (const id of run.cadence.keys()) if (!seen.has(id)) run.cadence.delete(id);
  },
};

const HOPPERS = new Set(["rabbit", "jackrabbit", "roo", "tigger", "hare", "dodo", "soldier"]);

const grounded = {
  name: "grounded",
  says: "A walker's lowest solid pixel is on its ground row (within 1 row) unless it is in a jump, bound or climb state, and a shadow lies under it.",
  harm: "Floating sprites.",
  scope:
    "Every walker (role walker in actors.js) in every scene, theme, width, stage and frame. The ground row is the row above the lowest row of the driver's own soft shadow. States that leave the ground (a pounce, a run's bound, a climb, a lift, flight) are skipped; actors.js airborne() lists them.",
  covers: ["kit/<family>.js drivers and their shadows", "kit/critters.js walker", "actors.js airborne"],
  frame({ draws, run }) {
    for (const d of draws) {
      if (d.role !== "walker" || !d.box || airborne(d.actor)) continue;
      const where = `${d.actor?.pose ?? d.state ?? ""} x ${Math.round(d.actor?.x ?? 0)}`;
      if (d.box.shadowRow === null) {
        run.report("grounded", `${label(d)}:shadow`, {
          actor: label(d),
          value: 0,
          unit: "shadow rows",
          limit: "a shadow under it",
          says: "has no shadow under it",
          detail: where,
          box: rowTop(d.box),
        });
        continue;
      }
      const ground = d.box.shadowRow - 1;
      const off = ground - d.box.footRow;
      if (Math.abs(off) <= GROUND_TOLERANCE || (HOPPERS.has(d.member) && off > 0)) continue;
      run.report("grounded", `${label(d)}:${off > 0 ? "floats" : "sinks"}`, {
        actor: label(d),
        value: Math.abs(off),
        extreme: "max",
        unit: off > 0 ? "rows above its ground" : "rows below its ground",
        limit: `within ${GROUND_TOLERANCE} row of the ground row`,
        says: off > 0 ? "floats above its shadow" : "sinks below its shadow",
        detail: where,
        box: rowTop(d.box),
        guide: { groundRow: ground, footRow: d.box.footRow, shadowRow: d.box.shadowRow, shadowX: d.box.shadowX },
      });
    }
  },
};

const perched = {
  name: "perched",
  says: "A perched bird's foot row rests on solid plant or rock pixels directly beneath it, in every frame.",
  harm: "Perch-less perchers: a bird sitting on empty air.",
  scope:
    "Every bird in its perch mode (role perched: flyByPerch visits, the desert and smokies owls, the Hundred Acre owl, the Iceland puffin nesters) in every scene, theme, width, stage and frame. The scenery is the same frame drawn again with every traced animal left out; the pixel under at least one foot column must be solid (alpha 0.6 or more) on the row below the foot row.",
  covers: [
    "kit/perch.js visitAt, smallVisitAt, flyByPerch, pickSpot, blobSpots",
    "kit/flyers.js owlPerchAt, nesterAt",
    "the plants' own geometry the perches read (acaciaGeom, joshuaGeom, graniteTop, sequoiaTop, ...)",
  ],
  frame({ draws, run }) {
    for (const d of draws) {
      if (d.role !== "perched" || !d.box) continue;
      run.stats.perched = (run.stats.perched ?? 0) + 1;
      const columns = [];
      for (const r of d.rects)
        if (r.alpha >= 0.6 && r.y + r.h - 1 === d.box.footRow) for (let x = r.x; x < r.x + r.w; x += 1) columns.push(x);
      if (!columns.length) continue;
      const scenery = run.getScenery();
      const under = columns.map((x) => scenery.opaqueAt(x, d.box.footRow + 1));
      if (under.some(Boolean)) continue;
      run.report("perched", label(d), {
        actor: label(d),
        value: 0,
        unit: "solid pixels under its feet",
        limit: "solid scenery on the row under its feet",
        says: "sits on nothing",
        detail: `feet at row ${d.box.footRow}, columns ${Math.min(...columns)} to ${Math.max(...columns)}`,
        box: rowTop(d.box),
        guide: { footRow: d.box.footRow, columns, under },
      });
    }
  },
};

// Birds that belong to the night: the owls. Their slots are not day birds.
const NIGHT_SLOT = /owl|nest/i;
// flyBy slots that carry something that is not a bird: a tumbleweed, a balloon, a swarm of bees, a flock of playing cards.
const NOT_A_BIRD = /tumble|balloon|bees|flock/i;
const SOAR_SLOT = /soar|circl/i;

const night = {
  name: "night",
  says: "In dark mode no day bird is updated or drawn.",
  harm: "Day birds flying about at night.",
  scope:
    "Dark mode in every scene, width, stage and frame. Drawn: any traced day bird (actors.js day: true) in a draw. Updated: a bird slot in the scene's extras (an object with a bird field) holding a bird, or a circling slot that is active, when its name is not an owl's or a nester's.",
  covers: ["kit/critters.js isNight", "each scene's update and draw (isNight gates)", "actors.js day"],
  frame({ draws, run, job, nursery }) {
    if (job.theme !== "dark") return;
    for (const d of draws) {
      if (!d.day || !d.box) continue;
      run.report("night", `drawn:${label(d)}`, {
        actor: label(d),
        value: 1,
        unit: "day birds drawn",
        limit: "none at night",
        says: "is drawn at night",
        detail: d.state ?? "",
        box: rowTop(d.box),
      });
    }
    for (const [name, slot] of Object.entries(nursery.extra ?? {})) {
      if (!slot || typeof slot !== "object" || NIGHT_SLOT.test(name) || NOT_A_BIRD.test(name)) continue;
      if (slot.when === "night" || slot.when === "always") continue;
      const alive = ("bird" in slot && slot.bird) || (SOAR_SLOT.test(name) && slot.active === true);
      if (!alive) continue;
      run.report("night", `updated:${name}`, {
        actor: `extra.${name}`,
        value: 1,
        unit: "day birds updated",
        limit: "none at night",
        says: "is still updated at night",
        detail: `extra.${name}`,
      });
    }
  },
};

const noErrors = {
  name: "no-errors",
  says: "No console error or exception at any scene, theme, page width, stage or time.",
  harm: "A broken sign-in page: the vulture import that threw while a vulture landed.",
  scope:
    "Everything the page logs with console.error, throws in a frame, or leaves unhandled, in every job (the art runs and the engine runs). A message is one finding with a count.",
  covers: ["every module the engine imports", "nursery.js tick"],
  finish({ run, errors }) {
    for (const e of errors) {
      run.report("no-errors", e.text.slice(0, 200), {
        actor: null,
        value: 1,
        unit: "errors",
        limit: "none",
        says: "threw or logged an error",
        detail: e.text.slice(0, 600),
        at: e,
      });
    }
  },
};

// ---- The omsync contract (docs/overview.md), checked on the engine itself -------------------------

function plantsAt(nursery, stage) {
  return nursery.plants.every((p) => p.shown === stage && p.target === stage);
}

function click(nursery) {
  return nursery.sprinkle((nursery.cols / 2) * P, (nursery.groundY - 30) * P);
}

function makeNursery(scene, size, { reduced = false, stage = 0, theme = "light" } = {}) {
  document.documentElement.dataset.theme = theme;
  const [w, h] = size;
  Object.defineProperty(window, "innerWidth", { value: w, configurable: true });
  Object.defineProperty(window, "innerHeight", { value: h, configurable: true });
  return new Nursery({
    ground: document.createElement("canvas"),
    water: document.createElement("canvas"),
    reducedMotion: reduced,
    scene,
    stage,
  });
}

const engineContract = {
  name: "engine-contract",
  says: "Each click waters one stage, a charged watering grows that many stages (capped at 8), reduced motion grows at once with no particles, the engine follows the page theme on each frame, and setScene swaps at the given stage.",
  harm: "omsync's sign-in page stops growing, or shows the wrong theme or scene.",
  scope:
    "Every scene at both page sizes, on the engine alone: 9 plain clicks from stage 0; charged levels 1 to 9 from stage 0 and level 6 from stage 5; reduced motion with a charged level; light to dark to light on a running engine; setScene to the next scene at stage 4; a new engine started at stage 3.",
  covers: ["nursery.js Nursery (sprinkle, tick, setScene, plant, constructor)", "docs/overview.md contract"],
  async engine({ job, step, SIZES }) {
    const found = [];
    const scene = SCENES.find((s) => s.id === job.scene);
    const other = SCENES[(SCENES.indexOf(scene) + 1) % SCENES.length];
    const size = SIZES[job.size];
    const fail = (what, value, limit) =>
      found.push({
        rule: "engine-contract",
        scene: job.scene,
        theme: "light",
        size: job.size,
        width: size[0],
        stage: null,
        time: null,
        count: 1,
        actor: null,
        value,
        unit: "",
        limit,
        says: what,
        detail: null,
      });
    const expect = (what, got, want) => {
      if (got !== want) fail(what, String(got), `expected ${want}`);
    };

    let n = makeNursery(scene, size);
    for (let i = 1; i <= 9; i += 1) {
      const stage = click(n);
      expect(`click ${i} from stage ${i - 1} returns the stage`, stage, Math.min(i, MAX_STAGE));
      expect(`click ${i} leaves the engine's stage`, n.stage, Math.min(i, MAX_STAGE));
      if (!n.plants.every((p) => p.target === n.stage))
        fail(`click ${i} sets every plant's target to the stage`, "differs", `target ${n.stage}`);
    }
    n.destroy();

    for (let level = 1; level <= 9; level += 1) {
      n = makeNursery(scene, size);
      expect(
        `a charged watering of level ${level} from stage 0 grows`,
        n.sprinkle(0, 0, level),
        Math.min(level, MAX_STAGE),
      );
      n.destroy();
    }
    n = makeNursery(scene, size, { stage: 5 });
    expect("a charged watering of level 6 from stage 5 stops at 8", n.sprinkle(0, 0, 6), MAX_STAGE);
    n.destroy();

    n = makeNursery(scene, size, { reduced: true });
    expect("reduced motion, a charged watering of level 3 grows", n.sprinkle(0, 0, 3), 3);
    if (!plantsAt(n, 3)) fail("reduced motion grows the plants at once", "not grown", "shown equals target");
    for (let i = 0; i < 12; i += 1) step();
    if (n.fountain || n.particles.length)
      fail("reduced motion leaves no fountain or particles", `${n.particles.length} particles`, "none");
    n.destroy();

    n = makeNursery(scene, size);
    for (let i = 0; i < 3; i += 1) step();
    document.documentElement.dataset.theme = "dark";
    step();
    expect(
      "the engine follows the page to dark on the next frame",
      n.pal.near.soil[0] === scene.palettes.dark.soil[0],
      true,
    );
    document.documentElement.dataset.theme = "light";
    step();
    expect(
      "the engine follows the page back to light on the next frame",
      n.pal.near.soil[0] === scene.palettes.light.soil[0],
      true,
    );
    n.setScene(other, 4);
    expect("setScene swaps the scene", n.scene === other, true);
    expect("setScene grows to the given stage", n.stage, 4);
    if (!(n.plants.length && plantsAt(n, 4)))
      fail("setScene plants the new scene at the given stage", "not planted", "every plant shown at 4");
    for (let i = 0; i < 6; i += 1) step();
    n.destroy();

    n = makeNursery(scene, size, { stage: 3 });
    if (!(n.plants.length && plantsAt(n, 3)))
      fail("a new engine starts at the given stage", "not grown", "every plant shown at 3");
    n.destroy();
    return found;
  },
};

export const RULES = [scale, pose, gap, walkCadence, grounded, perched, night, noErrors, engineContract];
