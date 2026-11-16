// The live scene: the real engine at a fixed page size instead of the window's, so the studio
// can show a desktop, laptop or phone page in any space.

import { SOIL_ROWS } from "/js/kit/pixel.js";
import { MAX_STAGE, Nursery, SCENES } from "/js/nursery.js";

export const PAGE_SIZES = {
  desktop: { label: "Desktop", icon: "monitor", cols: 300, rows: 130 },
  laptop: { label: "Laptop", icon: "laptop", cols: 240, rows: 125 },
  phone: { label: "Phone", icon: "smartphone", cols: 98, rows: 175 },
};

// The engine sizes itself in its constructor, before a subclass can set fields, so the first
// size is handed over through FixedNursery.next.
class FixedNursery extends Nursery {
  static next = PAGE_SIZES.desktop;

  constructor(options) {
    super(options);
    // The page size is fixed, so a window resize must not replant what is being looked at.
    window.removeEventListener("resize", this.onResize);
  }

  resize() {
    this.size ??= FixedNursery.next;
    [this.cols, this.rows] = [this.size.cols, this.size.rows];
    for (const canvas of [this.ground, this.water]) {
      canvas.width = this.cols;
      canvas.height = this.rows;
    }
    this.groundY = this.rows - SOIL_ROWS;
    this.wet = new Float32Array(this.cols);
    this.particles = [];
    this.fountain = null;
    this.waterDirty = true;
    this.plant();
  }
}

// The scene view's running scene, for panels that read it (the rules check reads its timers).
export const running = { live: null };

export class LiveScene {
  constructor(ground, water, sid, stage = MAX_STAGE, size = "desktop") {
    // FixedNursery stops the engine listening to window resizes: the page size here is fixed.
    const scene = SCENES.find((s) => s.id === sid);
    FixedNursery.next = PAGE_SIZES[size];
    this.engine = new FixedNursery({ ground, water, reducedMotion: false, scene, stage });
    this.paused = false;
  }

  get size() {
    return { cols: this.engine.cols, rows: this.engine.rows };
  }

  setScene(sid, stage = this.engine.stage) {
    this.engine.setScene(
      SCENES.find((s) => s.id === sid),
      stage,
    );
    this.redraw();
  }

  setSize(size) {
    this.engine.size = PAGE_SIZES[size];
    this.engine.resize();
    this.redraw();
  }

  // Grows (or cuts back) to a stage at once, running each stage's arrivals in turn, as
  // watering would.
  setStage(stage) {
    const e = this.engine;
    const from = e.stage;
    for (const p of e.plants) p.shown = p.target = stage;
    for (let s = from + 1; s <= stage; s += 1) {
      e.stage = s;
      e.scene.extras?.onGrow?.(e);
    }
    e.stage = stage;
    e.dirty = true;
    this.redraw();
  }

  water(level) {
    const e = this.engine;
    const box = e.ground.getBoundingClientRect();
    const stage = e.sprinkle(box.left + box.width * 0.5, box.top + box.height * 0.35, level);
    this.redraw();
    return stage;
  }

  replant() {
    this.engine.setScene(this.engine.scene, this.engine.stage);
    this.redraw();
  }

  // The engine draws on its animation frame, which a paused scene has cancelled: draw once so a
  // change shows at once.
  redraw() {
    if (!this.paused) return;
    this.engine.dirty = false;
    this.engine.drawGround();
    this.engine.drawWater();
  }

  pause(paused) {
    this.paused = paused;
    if (paused) cancelAnimationFrame(this.engine.raf);
    else {
      this.engine.last = performance.now();
      this.engine.raf = requestAnimationFrame(this.engine.tick);
    }
  }

  destroy() {
    this.engine.destroy();
  }
}
