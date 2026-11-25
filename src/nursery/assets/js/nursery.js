// The pixel scene engine. The host page draws it; what the host reads is the contract in
// docs/overview.md.
//
// Two canvases are drawn at one art pixel = P CSS pixels and scaled up without smoothing, so the
// scene shares the mascot's pixel size. The ground canvas sits behind the page and holds the soil
// and plants. The water canvas sits in front and holds the fountain. Both are anchored to the
// bottom-left of the viewport, so the soil's top edge lands on a line of the CSS grid
// (--landing-cell, which scenes.css sets on :root).
//
// This engine owns growth, soil, water and the frame loop. What grows and who lives there is a
// scene (the modules in scenes/, drawn with kit/). A scene supplies:
//   palettes {light, dark}  near-row colours; each needs the keys soil, line, wet, water and haze
//   fade {light, dark}      how far the far row, then the farthest row, are pulled toward haze
//   mature                  stages a plant of each kind takes to reach full size
//   paint                   a painter per plant kind: (g, plant, size 0..1, baseRow)
//   generate(ctx)           the plants for a page ctx.cols art pixels wide
//   soil(pal, x, y, depth, turf)  the colour of one soil pixel
//   extras (optional)       init, onGrow, busy, update, drawBack (behind the plants, also drawn
//                           under reduced motion, so keep it still then) and draw (animals, in front).
//                           onGrow runs on every watering and once when the scene is sown, with
//                           f.settling true that once, so entering animals may start mid-page
//
// sprinkle(x, y) is one watering: one stage and a short upright fountain (WATER_MS). That plain
// click is level 0, and every charged level builds on it. The optional third argument, level 1..8,
// is a charged release: level stages at once and a fountain that starts as the click's spray and
// opens over releaseMs(level), 1.2 s at level 1 to 2.6 s at level 8, until it wets level eighths
// of the way from the click's reach to the end of the ground (so level 8 wets the whole ground).
// Level 8 ends with jets for FINALE_MS under a mist, a rainbow (a moonbow at night) and, at night,
// fireflies. showMs(level) is the whole show, for a host to wait out before the next sprinkle. The
// bow, mist and fireflies go on the ground canvas, behind the page; the drops stay in front.
// Reduced motion grows the plants and draws none of it.
//
// Probe: `nursery verify` sets nursery.trace to an observer, and each animal driver in the kit then
// starts with `if (g.trace) return g.trace.draw(driver, g, ...its arguments)`, which lets the observer see which
// pixels it drew. On a page trace is undefined, so the line is skipped and nothing is drawn differently.
//
// Nothing here is stored: a reload plants a new random scene at stage 0.

import { CELL, clamp, fade, P, rng, SOIL_ROWS, smooth } from "./kit/pixel.js";
import desert from "./scenes/desert.js";
import greatbarrier from "./scenes/greatbarrier.js";
import hawaii from "./scenes/hawaii.js";
import hundredacre from "./scenes/hundredacre.js";
import iceland from "./scenes/iceland.js";
import meadow from "./scenes/meadow.js";
import rainforest from "./scenes/rainforest.js";
import serengeti from "./scenes/serengeti.js";
import smokies from "./scenes/smokies.js";
import wonderland from "./scenes/wonderland.js";
import yellowstone from "./scenes/yellowstone.js";

export const SCENE_GROUPS = [
  { id: "woods", label: "Woods" },
  { id: "drylands", label: "Drylands" },
  { id: "coastal", label: "Coastal" },
  { id: "underwater", label: "Underwater" },
  { id: "storybook", label: "Storybook" },
];

export const SCENES = [
  meadow,
  rainforest,
  hawaii,
  desert,
  smokies,
  serengeti,
  iceland,
  yellowstone,
  hundredacre,
  wonderland,
  greatbarrier,
];

// Organizes scene plugins into ordered biome groups. Hosts can pass custom `groups`,
// `includeEmpty: true`, or a `filter` predicate to tailor the picker without changing the nursery.
export function groupScenes(scenes = SCENES, { groups = SCENE_GROUPS, includeEmpty = false, filter } = {}) {
  const list = filter ? scenes.filter(filter) : scenes;
  const byId = new Map(groups.map((g) => [g.id, { id: g.id, label: g.label, scenes: [] }]));
  const other = [];
  for (const scene of list) {
    const bucket = byId.get(scene.group);
    if (bucket) bucket.scenes.push(scene);
    else other.push(scene);
  }
  const result = [...byId.values()].filter((g) => includeEmpty || g.scenes.length > 0);
  if (other.length) result.push({ id: "other", label: "Other", scenes: other });
  return result;
}
export const MAX_STAGE = 8;
export const WATER_MS = 1000;
export const COOLDOWN_MS = 1200;
export const FINALE_MS = 1750; // the jets of a level 8 release, after releaseMs(8) and a short pause

const GROW_SECONDS = 1.2;
const GRAVITY = 170; // art pixels per second squared
const FOUNTAIN_RATE = 220; // droplets per second while the fountain runs
const OPEN_RATE = 300; // droplets per second while a charged fountain opens, plus 25 for each level
// The plain click's outermost drop, which is where a charged fountain starts to open. These are the
// angle from vertical and the speed of the click's fastest drop in updateWater.
const CLICK_TILT = 0.28;
const CLICK_SPEED = 112;
const REACH_MIN = 0.08; // the click's reach as a fraction of one side of the ground, at least
const REACH_MAX = 1; // and at most the whole side
const JET_RATE = 640; // droplets per second, all jets together
const JET_DELAY = 0.15; // seconds between the opening and the jets
const MIST_PEAK = 0.32;
const MIST_HEIGHT = 50; // art pixels the mist climbs
const FIREFLIES = 46;
const BOW_BANDS = {
  light: {
    alpha: 0.55,
    colors: ["#ff5e5e", "#ffa24c", "#ffe066", "#7fdc6a", "#5cc4f2", "#6f86ff", "#b07bff"],
  },
  dark: {
    alpha: 0.5,
    colors: ["#ffc4c4", "#ffdcb8", "#fff1b8", "#cdf2c6", "#c2e6fb", "#cbd3ff", "#e3cfff"],
  },
};
const MIST_RGB = { light: [255, 255, 255], dark: [190, 210, 235] };

// A level as a whole number 1..MAX_STAGE, or 0 for the plain watering.
function charge(level) {
  const n = Math.floor(Number(level));
  return n >= 1 ? Math.min(n, MAX_STAGE) : 0;
}

// How long the fountain of a release takes to open, so that a host can drain its water as it runs.
export function releaseMs(level) {
  const n = charge(level);
  return n ? WATER_MS + n * 200 : WATER_MS;
}

// How long a whole release lasts: the opening and, at level 8, the pause and the jets.
export function showMs(level) {
  const n = charge(level);
  return releaseMs(n) + (n === MAX_STAGE ? JET_DELAY * 1000 + FINALE_MS : 0);
}

function freshFx() {
  return { mist: 0, bow: 0, hold: 0, x: 0, flies: [], carry: 0, jetting: false, key: "" };
}

function currentTheme() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function palettesFor(scene, theme) {
  const near = scene.palettes[theme];
  const [far, farthest = far] = scene.fade[theme];
  return { near, far: fade(near, far), farthest: fade(near, farthest) };
}

export class Nursery {
  constructor({ ground, water, reducedMotion, scene, stage = 0 }) {
    this.ground = ground;
    this.water = water;
    this.gctx = ground.getContext("2d");
    this.wctx = water.getContext("2d");
    this.reduced = reducedMotion;
    this.rand = rng(Math.floor(Math.random() * 2 ** 32));
    this.time = 0;
    this.last = performance.now();
    this.clock = 0;
    this.particles = [];
    this.fountain = null;
    this.fx = freshFx();
    this.waterDirty = false;
    this.soil = document.createElement("canvas");
    this.theme = currentTheme();
    this.scene = scene;
    this.pal = palettesFor(scene, this.theme);
    this.stage = stage;
    this.onResize = () => {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => this.resize(), 150);
    };
    window.addEventListener("resize", this.onResize);
    this.resize();
    this.raf = requestAnimationFrame(this.tick);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    clearTimeout(this.resizeTimer);
    window.removeEventListener("resize", this.onResize);
  }

  // Replaces the scene with another one, grown to the given stage.
  setScene(scene, stage = 0) {
    this.scene = scene;
    this.pal = palettesFor(scene, this.theme);
    this.stage = stage;
    this.plant();
  }

  resize() {
    this.cols = Math.ceil(window.innerWidth / P);
    this.rows = Math.ceil(window.innerHeight / P);
    for (const canvas of [this.ground, this.water]) {
      canvas.width = this.cols;
      canvas.height = this.rows;
      canvas.style.width = `${this.cols * P}px`;
      canvas.style.height = `${this.rows * P}px`;
    }
    this.groundY = this.rows - SOIL_ROWS;
    this.wet = new Float32Array(this.cols);
    this.particles = [];
    this.fountain = null;
    this.fx = freshFx();
    this.waterDirty = true;
    this.plant();
  }

  // Sows the scene's plants at the current stage, after a resize or a new scene.
  plant() {
    this.plants = this.scene.generate({ cols: this.cols, rand: this.rand });
    for (const p of this.plants) p.shown = p.target = this.stage;
    this.extra = this.scene.extras?.init(this) ?? null;
    this.settling = true;
    this.scene.extras?.onGrow?.(this);
    this.settling = false;
    this.wet.fill(0);
    this.soilKey = "";
    this.dirty = true;
  }

  // Water at a viewport position, the tip of the trunk. Returns the new stage. Without a level,
  // the plants gain one stage. A level 1..8 gains that many stages and opens a wider fountain.
  sprinkle(clientX, clientY, level) {
    const box = this.ground.getBoundingClientRect();
    const x = (clientX - box.left) / P;
    const y = (clientY - box.top) / P;
    const power = charge(level);
    if (this.stage < MAX_STAGE) {
      const before = this.stage;
      this.stage = Math.min(MAX_STAGE, this.stage + (power || 1));
      for (const p of this.plants) {
        const idle = p.shown >= p.target - 1e-6;
        p.target = this.stage;
        // A charged gain of several stages finishes in two stages' time, not in one time per stage.
        if (this.stage - before > 1) p.pace = Math.max(1, (p.target - p.shown) / 2) / GROW_SECONDS;
        if (this.reduced) p.shown = p.target;
        else if (idle) p.wait = 0.7 + Math.abs(p.x - x) * 0.0032;
      }
      this.scene.extras?.onGrow?.(this);
    }
    if (!this.reduced) this.fountain = { x, y: y - 1, start: this.time, carry: 0, level: power };
    this.dirty = true;
    return this.stage;
  }

  tick = (now) => {
    this.raf = requestAnimationFrame(this.tick);
    // The first frame's timestamp can be earlier than the clock read when the nursery was made.
    const dt = clamp((now - this.last) / 1000, 0, 0.05);
    this.last = now;
    this.time += dt;
    if (this.theme !== currentTheme()) {
      this.theme = currentTheme();
      this.pal = palettesFor(this.scene, this.theme);
      this.soilKey = "";
      this.dirty = true;
    }
    const moving = this.updatePlants(dt);
    const wetting = this.updateWater(dt);
    const glowing = this.updateFx(dt);
    this.drawWater();
    const extras = this.scene.extras;
    if (extras && !this.reduced) extras.update?.(this, dt);
    this.clock += dt;
    const busy = moving || wetting || glowing || (extras?.busy?.(this) ?? false);
    if (this.dirty || (!this.reduced && this.clock >= (busy ? 1 / 30 : 1 / 8))) {
      this.clock = 0;
      this.dirty = false;
      this.drawGround();
    }
  };

  updatePlants(dt) {
    let moving = false;
    for (const p of this.plants) {
      if (p.shown >= p.target) continue;
      moving = true;
      if (p.wait > 0) p.wait -= dt;
      else p.shown = Math.min(p.target, p.shown + (p.pace ? dt * p.pace : dt / GROW_SECONDS));
      if (p.shown >= p.target) p.pace = 0;
    }
    return moving;
  }

  // Moves droplets and splashes. Returns true while any soil is still wet.
  updateWater(dt) {
    const f = this.fountain;
    if (f?.level) {
      this.spray(f, dt);
    } else if (f) {
      const elapsed = (this.time - f.start) / (WATER_MS / 1000);
      if (elapsed >= 1) {
        this.fountain = null;
      } else {
        const envelope = Math.sin(Math.PI * elapsed);
        f.carry += FOUNTAIN_RATE * (0.35 + 0.65 * envelope) * dt;
        while (f.carry >= 1) {
          f.carry -= 1;
          const angle = (this.rand() + this.rand() - 1) * 0.28;
          const speed = (72 + this.rand() * 40) * (0.8 + 0.2 * envelope);
          const roll = this.rand();
          this.particles.push({
            kind: "drop",
            x: f.x + (this.rand() - 0.5) * 1.5,
            y: f.y,
            vx: Math.sin(angle) * speed,
            vy: -Math.cos(angle) * speed,
            tone: roll < 0.2 ? 2 : roll < 0.55 ? 0 : 1,
            life: 1,
          });
        }
      }
    }
    const landed = [];
    for (const d of this.particles) {
      d.vy += GRAVITY * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      if (d.kind === "splash") d.life -= dt * 3.4;
      else if (d.vy > 0 && d.y >= this.groundY + 2) {
        d.life = 0;
        landed.push(d);
      }
    }
    for (const d of landed) this.splash(d);
    this.particles = this.particles.filter((d) => d.life > 0 && d.x > -2 && d.x < this.cols + 2);

    let wetting = false;
    for (let x = 0; x < this.cols; x += 1) {
      if (this.wet[x] > 0) {
        this.wet[x] = Math.max(0, this.wet[x] - dt * 0.3);
        wetting = true;
      }
    }
    return wetting;
  }

  // A charged fountain. It opens from the plain click's reach to level eighths of the way to the
  // end of the ground, then level 8 fires jets. Each drop lands where it is aimed.
  spray(f, dt) {
    const open = releaseMs(f.level) / 1000;
    const end = f.level === MAX_STAGE ? open + JET_DELAY + FINALE_MS / 1000 : open;
    const t = this.time - f.start;
    f.jetting = t >= open + JET_DELAY && t < end;
    if (t >= end) {
      this.fountain = null;
      return;
    }
    if (t < open) {
      f.dist ??= this.clickDistance(f);
      f.carry += (OPEN_RATE + f.level * 25) * dt;
      while (f.carry >= 1) {
        f.carry -= 1;
        const side = this.rand() < 0.5 ? -1 : 1;
        const reach = side < 0 ? f.x : this.cols - f.x;
        // The front grows from the click's reach to level eighths of the way to the ground's end.
        const click = clamp(f.dist / reach, REACH_MIN, REACH_MAX);
        const goal = click + ((1 - click) * f.level) / MAX_STAGE;
        const front = click + (goal - click) * (t / open);
        const share = this.rand() < 0.5 ? front * (0.82 + 0.18 * this.rand()) : front * this.rand();
        const d = Math.max(1.5, share * reach);
        const lean = 0.1 + 0.62 * Math.min(1, d / reach) + (this.rand() - 0.5) * 0.05;
        this.lob(f, side, d, Math.PI / 2 - lean);
      }
    } else if (f.jetting) {
      f.carry += JET_RATE * dt;
      while (f.carry >= 1) {
        f.carry -= 1;
        const side = this.rand() < 0.5 ? -1 : 1;
        const reach = side < 0 ? f.x : this.cols - f.x;
        const k = 1 + Math.floor(this.rand() * MAX_STAGE);
        const d = ((k - 0.5 + (this.rand() - 0.5) * 0.35) / MAX_STAGE) * reach;
        this.lob(f, side, d, 0.75 + (k / MAX_STAGE) * 0.35 + (this.rand() - 0.5) * 0.03);
      }
    }
  }

  // How far from the tip the click's outermost drop lands: the fastest drop at the widest angle,
  // falling from the tip to where the soil begins.
  clickDistance(f) {
    const fall = this.groundY + 2 - f.y;
    const vy = -CLICK_SPEED * Math.cos(CLICK_TILT);
    const seconds = (-vy + Math.sqrt(vy * vy + 2 * GRAVITY * fall)) / GRAVITY;
    return CLICK_SPEED * Math.sin(CLICK_TILT) * seconds;
  }

  // Throws one drop from the trunk tip so that it lands d art pixels to one side. angle is from
  // the horizontal. The tip can be high above the ground; the drop falls to where the soil begins.
  lob(f, side, d, angle) {
    const fall = this.groundY + 2 - f.y;
    const run = 2 * Math.cos(angle) ** 2 * (fall + d * Math.tan(angle));
    const speed = Math.sqrt((GRAVITY * d * d) / run);
    const roll = this.rand();
    this.particles.push({
      kind: "drop",
      charged: true,
      x: f.x,
      y: f.y,
      vx: side * speed * Math.cos(angle),
      vy: -speed * Math.sin(angle),
      tone: roll < 0.2 ? 2 : roll < 0.55 ? 0 : 1,
      life: 1,
    });
  }

  // The finale's mist, rainbow and fireflies. They live on the ground canvas, behind the page.
  // Returns true while any of them still shows.
  updateFx(dt) {
    const fx = this.fx;
    const jetting = this.fountain?.jetting ?? false;
    if (jetting) {
      if (!fx.jetting) fx.x = this.fountain.x;
      fx.mist = Math.min(MIST_PEAK, fx.mist + dt * 0.6);
      fx.bow = Math.min(1, fx.bow + dt * 1.1);
      fx.hold = 2.5;
    } else {
      fx.mist = Math.max(0, fx.mist - dt * 0.12);
      fx.hold -= dt;
      if (fx.hold <= 0) fx.bow = Math.max(0, fx.bow - dt * 0.25);
    }
    fx.jetting = jetting;
    if (this.theme === "dark" && fx.hold > 0 && fx.flies.length < FIREFLIES && this.rand() < 30 * dt) {
      // A firefly rises from a wet column. A dry pick tries again on the next frame.
      const x = Math.floor(this.rand() * this.cols);
      if (this.wet[x] > 0.3) {
        const life = 6 + this.rand() * 6;
        fx.flies.push({ x, y: this.groundY - 1, v: 3 + this.rand() * 6, p: this.rand() * 6, life });
      }
    }
    for (const fly of fx.flies) {
      fly.y -= fly.v * dt;
      fly.x += Math.sin(this.time * 1.3 + fly.p) * 4 * dt;
      fly.life -= dt;
    }
    fx.flies = fx.flies.filter((fly) => fly.life > 0);
    return fx.mist > 0 || fx.bow > 0 || fx.flies.length > 0;
  }

  splash(d) {
    const col = Math.round(d.x);
    for (let x = col - 2; x <= col + 2; x += 1) {
      if (x >= 0 && x < this.cols) this.wet[x] = Math.max(this.wet[x], 1 - Math.abs(x - col) * 0.25);
    }
    // A charged release lands hundreds of drops a second, so most of them make no spray.
    const sprays = d.charged ? (this.rand() < 0.4 ? 1 : 0) : 2;
    for (let i = 0; i < sprays; i += 1) {
      this.particles.push({
        kind: "splash",
        x: d.x,
        y: this.groundY + 1,
        vx: (this.rand() - 0.5) * 40,
        vy: -(10 + this.rand() * 25),
        tone: 1,
        life: 0.5 + this.rand() * 0.4,
      });
    }
  }

  drawWater() {
    if (!this.particles.length && !this.waterDirty) return;
    const ctx = this.wctx;
    ctx.clearRect(0, 0, this.cols, this.rows);
    const { water } = this.pal.near;
    for (const d of this.particles) {
      const x = Math.round(d.x);
      const y = Math.round(d.y);
      ctx.fillStyle = water[d.tone];
      if (d.kind === "splash") {
        ctx.globalAlpha = clamp(d.life, 0, 1);
        ctx.fillRect(x, y, 1, 1);
        ctx.globalAlpha = 1;
      } else if (d.vy > 12) {
        ctx.fillRect(x, y - 1, 1, 2);
      } else {
        ctx.fillRect(x, y, 1, 1);
      }
    }
    this.waterDirty = this.particles.length > 0;
  }

  // The soil is static between stages, so it is drawn once into its own canvas.
  buildSoil(turf) {
    const key = `${this.scene.id}:${this.cols}:${this.theme}:${turf}`;
    if (key === this.soilKey) return;
    this.soilKey = key;
    this.soil.width = this.cols;
    this.soil.height = SOIL_ROWS;
    const ctx = this.soil.getContext("2d");
    const pal = this.pal.near;
    for (let y = 0; y < SOIL_ROWS; y += 1) {
      for (let x = 0; x < this.cols; x += 1) {
        ctx.fillStyle = this.scene.soil(pal, x, y, y / SOIL_ROWS, turf);
        ctx.fillRect(x, y, 1, 1);
      }
    }
    ctx.fillStyle = pal.line;
    for (let x = 0; x < this.cols; x += CELL) ctx.fillRect(x, 0, 1, SOIL_ROWS);
  }

  drawGround() {
    const ctx = this.gctx;
    ctx.clearRect(0, 0, this.cols, this.rows);
    const shown = this.plants.reduce((most, p) => Math.max(most, p.shown), 0);
    this.buildSoil(Math.round(clamp(shown / 3, 0, 1) * 10) / 10);
    ctx.drawImage(this.soil, 0, this.groundY);

    ctx.fillStyle = this.pal.near.wet;
    for (let x = 0; x < this.cols; x += 1) {
      if (this.wet[x] > 0.04) {
        ctx.globalAlpha = this.wet[x] * 0.4;
        ctx.fillRect(x, this.groundY, 1, SOIL_ROWS);
      }
    }
    ctx.globalAlpha = 1;

    const time = this.reduced ? 0 : Math.floor(this.time * 8) / 8;
    // trace is the verification probe (nursery verify): undefined on a page, so nothing changes.
    const g = { ctx, pal: this.pal.near, time, groundY: this.groundY, cols: this.cols, trace: this.trace };
    const extras = this.scene.extras;
    const paint = (p) => {
      const s = smooth(clamp((p.shown - p.born) / this.scene.mature[p.kind], 0, 1));
      if (s <= 0) return;
      g.pal = p.layer < 0 ? this.pal.farthest : p.layer === 0 ? this.pal.far : this.pal.near;
      this.scene.paint[p.kind](g, p, s, this.groundY + (p.layer < 1 ? 1 : p.depth));
    };

    if (extras?.drawBack) {
      g.pal = this.pal.near;
      extras.drawBack(g, this);
    }
    this.drawBow(ctx);
    for (const p of this.plants) paint(p);
    if (extras?.draw && !this.reduced) {
      g.pal = this.pal.near;
      extras.draw(g, this);
    }
    this.drawMist(ctx);
    this.drawFlies(ctx);
  }

  // The rainbow, or at night the moonbow: seven bands, red outermost, in an arc whose centre sits
  // just below the soil line. It is drawn once into its own canvas, and only above the soil.
  drawBow(ctx) {
    const fx = this.fx;
    if (fx.bow <= 0.01) return;
    const { alpha, colors } = BOW_BANDS[this.theme];
    const key = `${this.cols}:${this.groundY}:${this.theme}:${fx.x}`;
    if (fx.bowKey !== key) {
      fx.bowKey = key;
      fx.bowCanvas ??= document.createElement("canvas");
      const canvas = fx.bowCanvas;
      canvas.width = this.cols;
      canvas.height = this.groundY;
      const g = canvas.getContext("2d");
      // The centre lies between pixels, so the apex has no stray pixel.
      const size = Math.max(8, Math.min(Math.round(this.cols * 0.4), this.groundY - 8));
      const cx = Math.floor(fx.x) + 0.5;
      const cy = this.groundY + 4.5;
      const radius = size + 0.25;
      const left = Math.max(0, Math.floor(cx - radius - 1));
      const right = Math.min(this.cols - 1, Math.ceil(cx + radius + 1));
      for (let y = Math.max(0, Math.floor(cy - radius - 1)); y < this.groundY; y += 1) {
        for (let x = left; x <= right; x += 1) {
          const band = Math.floor(radius - Math.hypot(x + 0.5 - cx, y + 0.5 - cy));
          if (band < 0 || band >= colors.length) continue;
          g.fillStyle = colors[band];
          g.fillRect(x, y, 1, 1);
        }
      }
    }
    ctx.globalAlpha = fx.bow * alpha;
    ctx.drawImage(fx.bowCanvas, 0, 0);
    ctx.globalAlpha = 1;
  }

  // A haze that is thickest at the ground by the tip and fades out upward and toward both edges.
  // Its mask is one canvas of soft gradients, so no edge shows.
  drawMist(ctx) {
    const fx = this.fx;
    if (fx.mist <= 0.01) return;
    const key = `${this.cols}:${this.theme}:${fx.x}`;
    if (fx.mistKey !== key) {
      fx.mistKey = key;
      fx.mistCanvas ??= document.createElement("canvas");
      const canvas = fx.mistCanvas;
      canvas.width = this.cols;
      canvas.height = MIST_HEIGHT;
      const g = canvas.getContext("2d");
      const [r, gr, b] = MIST_RGB[this.theme];
      const colour = (a) => `rgba(${r},${gr},${b},${a})`;
      const up = g.createLinearGradient(0, 0, 0, MIST_HEIGHT);
      up.addColorStop(0, colour(0));
      up.addColorStop(0.5, colour(0.3));
      up.addColorStop(1, colour(1));
      g.fillStyle = up;
      g.fillRect(0, 0, this.cols, MIST_HEIGHT);
      const peak = clamp(fx.x / this.cols, 0.02, 0.98);
      const across = g.createLinearGradient(0, 0, this.cols, 0);
      across.addColorStop(0, colour(0));
      across.addColorStop(peak / 2, colour(0.35));
      across.addColorStop(peak, colour(1));
      across.addColorStop(peak + (1 - peak) / 2, colour(0.35));
      across.addColorStop(1, colour(0));
      g.globalCompositeOperation = "destination-in";
      g.fillStyle = across;
      g.fillRect(0, 0, this.cols, MIST_HEIGHT);
    }
    ctx.globalAlpha = fx.mist;
    ctx.drawImage(fx.mistCanvas, 0, this.groundY - MIST_HEIGHT);
    ctx.globalAlpha = 1;
  }

  drawFlies(ctx) {
    for (const fly of this.fx.flies) {
      if (Math.sin(this.time * 5 + fly.p * 3) <= 0) continue;
      const x = Math.round(fly.x);
      const y = Math.round(fly.y);
      ctx.fillStyle = "rgba(220,255,140,0.18)";
      ctx.fillRect(x - 1, y - 1, 3, 3);
      ctx.fillStyle = "#eaff8f";
      ctx.fillRect(x, y, 1, 1);
    }
  }
}
