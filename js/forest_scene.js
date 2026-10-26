// The pixel scene on the sign-in page (layouts/auth.html, controllers/forest_controller.js).
//
// Two canvases are drawn at one art pixel = P CSS pixels and scaled up without smoothing, so the
// scene shares the mascot's pixel size. The ground canvas sits behind the page and holds the soil
// and plants. The water canvas sits in front and holds the fountain. Both are anchored to the
// bottom-left of the viewport, so the soil's top edge lands on a line of the CSS grid
// (styles/landing.css, --landing-cell).
//
// This engine owns growth, soil, water and the frame loop. What grows and who lives there is a
// scene (the modules in forest/). A scene supplies:
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
// Nothing here is stored: a reload plants a new random scene at stage 0.

import { CELL, P, SOIL_ROWS, clamp, fade, rng, smooth } from "./forest/pixel.js";
import desert from "./forest/desert.js";
import hawaii from "./forest/hawaii.js";
import hundredacre from "./forest/hundredacre.js";
import iceland from "./forest/iceland.js";
import meadow from "./forest/meadow.js";
import rainforest from "./forest/rainforest.js";
import serengeti from "./forest/serengeti.js";
import smokies from "./forest/smokies.js";
import wonderland from "./forest/wonderland.js";
import yellowstone from "./forest/yellowstone.js";

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
];
export const MAX_STAGE = 8;
export const WATER_MS = 1000;
export const COOLDOWN_MS = 1200;

const GROW_SECONDS = 1.2;
const GRAVITY = 170; // art pixels per second squared
const FOUNTAIN_RATE = 220; // droplets per second while the fountain runs

function currentTheme() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function palettesFor(scene, theme) {
  const near = scene.palettes[theme];
  const [far, farthest = far] = scene.fade[theme];
  return { near, far: fade(near, far), farthest: fade(near, farthest) };
}

export class Forest {
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

  // Water at a viewport position, the tip of the trunk. Returns the new stage.
  sprinkle(clientX, clientY) {
    const box = this.ground.getBoundingClientRect();
    const x = (clientX - box.left) / P;
    const y = (clientY - box.top) / P;
    if (this.stage < MAX_STAGE) {
      this.stage += 1;
      for (const p of this.plants) {
        const idle = p.shown >= p.target - 1e-6;
        p.target = this.stage;
        if (this.reduced) p.shown = p.target;
        else if (idle) p.wait = 0.7 + Math.abs(p.x - x) * 0.0032;
      }
      this.scene.extras?.onGrow?.(this);
    }
    if (!this.reduced) this.fountain = { x, y: y - 1, start: this.time, carry: 0 };
    this.dirty = true;
    return this.stage;
  }

  tick = (now) => {
    this.raf = requestAnimationFrame(this.tick);
    // The first frame's timestamp can be earlier than the clock read when the forest was made.
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
    this.drawWater();
    const extras = this.scene.extras;
    if (extras && !this.reduced) extras.update?.(this, dt);
    this.clock += dt;
    const busy = moving || wetting || (extras?.busy?.(this) ?? false);
    if (this.dirty || (!this.reduced && this.clock >= (busy ? 1 / 30 : 1 / 8))) {
      this.clock = 0;
      this.dirty = false;
      this.drawForest();
    }
  };

  updatePlants(dt) {
    let moving = false;
    for (const p of this.plants) {
      if (p.shown >= p.target) continue;
      moving = true;
      if (p.wait > 0) p.wait -= dt;
      else p.shown = Math.min(p.target, p.shown + dt / GROW_SECONDS);
    }
    return moving;
  }

  // Moves droplets and splashes. Returns true while any soil is still wet.
  updateWater(dt) {
    const f = this.fountain;
    if (f) {
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

  splash(d) {
    const col = Math.round(d.x);
    for (let x = col - 2; x <= col + 2; x += 1) {
      if (x >= 0 && x < this.cols) this.wet[x] = Math.max(this.wet[x], 1 - Math.abs(x - col) * 0.25);
    }
    for (let i = 0; i < 2; i += 1) {
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

  drawForest() {
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
    const g = { ctx, pal: this.pal.near, time, groundY: this.groundY, cols: this.cols };
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
    for (const p of this.plants) paint(p);
    if (extras?.draw && !this.reduced) {
      g.pal = this.pal.near;
      extras.draw(g, this);
    }
  }
}
