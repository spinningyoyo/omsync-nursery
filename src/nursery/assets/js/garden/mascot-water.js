// The water inside a held mascot (watering.js). It is drawn in the mascot's own pixel SVG, one grid
// cell per pixel, from the rects of its body group, so water covers body pixels exactly and the
// outline and eyes stay on top. Four paths hold the water in layers that garden.css colours: foam,
// water, the deeper bottom rows, and bubbles. A mascot with no body group gets no water.

import { MAX_STAGE } from "../nursery.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const DEEP_ROWS = 2;

export class MascotWater {
  constructor(svg, { reducedMotion, body = ".body" }) {
    this.reduced = reducedMotion;
    this.cells = [];
    const group = svg?.querySelector(body);
    if (!group) return;
    for (const rect of group.querySelectorAll("rect")) {
      const [x, y, w, h] = ["x", "y", "width", "height"].map((name) => Number(rect.getAttribute(name)));
      for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) this.cells.push([x + i, y + j]);
    }
    if (!this.cells.length) return;
    this.cells.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
    this.top = this.cells[0][1];
    this.bottom = this.cells[this.cells.length - 1][1];
    this.inside = new Set(this.cells.map(([x, y]) => `${x},${y}`));

    const water = document.createElementNS(SVG_NS, "g");
    water.setAttribute("class", "mascot-water");
    this.paths = {};
    for (const layer of ["water", "deep", "foam", "bubble"]) {
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("class", `mascot-water__${layer}`);
      water.append(path);
      this.paths[layer] = path;
    }
    group.after(water);
    this.clear();
  }

  clear() {
    this.level = 0;
    this.slosh = 0;
    this.time = 0;
    this.bubbles = [];
    this.pops = [];
    this.render();
  }

  // Each fill step kicks the surface, then it settles. The kick grows with the step count.
  kick(step) {
    if (!this.reduced) this.slosh = 1.4 + step * 0.22;
  }

  // Advances the surface and the bubbles by dt seconds. rising is true while the mascot fills.
  step(dt, level, rising) {
    // Under reduced motion the level steps by whole eighths instead of gliding.
    this.level = !this.reduced ? level : rising ? Math.floor(level + 1e-6) : Math.ceil(level - 1e-6);
    this.rising = rising;
    if (this.reduced || !this.paths) return;
    this.time += dt;
    this.slosh *= Math.exp(-2.4 * dt);
    if (level <= 0) {
      this.bubbles = [];
      this.pops = [];
      return;
    }
    if (Math.random() < (2 + level * 2.2 + (level >= MAX_STAGE ? 14 : 0)) * dt) this.spawnBubble();
    for (const bubble of this.bubbles) {
      bubble.y -= bubble.speed * dt;
      bubble.x += Math.sin(this.time * 7 + bubble.phase) * 2 * dt;
    }
    this.bubbles = this.bubbles.filter((bubble) => {
      if (bubble.y > this.surfaceAt(Math.round(bubble.x)) + 0.5) return true;
      this.pops.push({
        x: Math.round(bubble.x),
        y: Math.round(this.surfaceAt(Math.round(bubble.x)) - 0.5),
        life: 0.12,
      });
      return false;
    });
    for (const pop of this.pops) pop.life -= dt;
    this.pops = this.pops.filter((pop) => pop.life > 0);
  }

  // Row where the surface lies at column x. The ripple is small and only while filling.
  surfaceAt(x) {
    const base = this.bottom + 1 - (this.level / MAX_STAGE) * (this.bottom + 1 - this.top);
    const ripple = this.rising && !this.reduced ? 0.35 * Math.sin(0.5 * x + this.time * 3) : 0;
    return base + this.slosh * Math.sin(0.6 * x - this.time * 10) + ripple;
  }

  spawnBubble() {
    const floor = this.cells.filter(([, y]) => y >= this.bottom - 2);
    const [x, y] = floor[Math.floor(Math.random() * floor.length)];
    if (this.surfaceAt(x) >= y) return;
    this.bubbles.push({ x, y, speed: 5 + Math.random() * 6 + this.level, phase: Math.random() * 6 });
  }

  render() {
    if (!this.paths) return;
    const runs = { water: "", deep: "", foam: "" };
    if (this.level > 0.01) {
      let run = null;
      const flush = () => {
        if (run) runs[run.layer] += `M${run.x} ${run.y}h${run.w}v1h-${run.w}z`;
        run = null;
      };
      for (const [x, y] of this.cells) {
        const row = Math.ceil(this.surfaceAt(x));
        if (y < row) {
          flush();
          continue;
        }
        const layer = y === row ? "foam" : y > this.bottom - DEEP_ROWS ? "deep" : "water";
        if (run && run.layer === layer && run.y === y && run.x + run.w === x) run.w += 1;
        else {
          flush();
          run = { layer, x, y, w: 1 };
        }
      }
      flush();
    }
    let bubbles = "";
    for (const { x, y } of this.bubbles) {
      const cx = Math.round(x);
      const cy = Math.round(y);
      if (this.inside.has(`${cx},${cy}`) && cy > Math.ceil(this.surfaceAt(cx))) bubbles += `M${cx} ${cy}h1v1h-1z`;
    }
    for (const { x, y } of this.pops) if (this.inside.has(`${x},${y}`)) runs.foam += `M${x} ${y}h1v1h-1z`;
    this.paths.water.setAttribute("d", runs.water);
    this.paths.deep.setAttribute("d", runs.deep);
    this.paths.foam.setAttribute("d", runs.foam);
    this.paths.bubble.setAttribute("d", bubbles);
  }
}
