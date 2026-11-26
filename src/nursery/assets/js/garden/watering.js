// A mascot button that waters the scene. A click waters once: one stage and a short fountain. A
// hold fills the mascot with water (mascot-water.js), one eighth every FILL_STEP_MS. Letting go, or
// the brim after BRIM_MS, waters the scene that many stages at once while the water drains at the
// speed of the spray. Space and Enter hold like a press. The mascot cannot water again until the
// show is over.
//
// The host owns the mascot's look and what a watering means to the page. It passes the button, the
// engine, where the water leaves the mascot (spout) and two callbacks. The button gets these
// classes, which garden.css animates: is-watering (a plain watering), is-shaking and
// is-shaking-hard (each fill step, harder from the fifth), is-brim (full) and is-squinting (eyes
// shut while it waters).

import { COOLDOWN_MS, MAX_STAGE, releaseMs, showMs, WATER_MS } from "../nursery.js";
import { MascotWater } from "./mascot-water.js";

export const FILL_STEP_MS = 500;
const HOLD_MS = FILL_STEP_MS; // a shorter press is a plain watering
const BRIM_MS = 750; // the pause at a full mascot before it lets go on its own
const SHAKE_MS = 320;

const middle = (box) => [box.left + box.width * 0.5, box.top + box.height * 0.45];

export class Watering {
  // spout(box) gives the client point the water leaves from, for the mascot SVG's bounding box.
  // onWater({ stage, before }) runs after each watering, onFill(step) on each fill step.
  constructor({
    button,
    nursery,
    reducedMotion,
    body = ".body",
    spout = middle,
    onWater = () => {},
    onFill = () => {},
  }) {
    Object.assign(this, { button, nursery, reducedMotion, body, spout, onWater, onFill });
    this.readyAt = 0;
    this.mode = "idle"; // idle, holding, brim or draining
    this.hold = null;
    this.longPress = false;
    this.refresh();

    this.listeners = {
      click: () => this.click(),
      pointerdown: (event) => this.press(event),
      pointerup: () => this.letGo(),
      pointercancel: () => this.letGo(),
      keydown: (event) => this.keyDown(event),
      keyup: (event) => this.keyUp(event),
      blur: () => this.endHold(),
      // A long press on a phone would open the context menu, and a drag would lift the sprite.
      contextmenu: (event) => event.preventDefault(),
      dragstart: (event) => event.preventDefault(),
    };
    for (const [type, listener] of Object.entries(this.listeners)) button.addEventListener(type, listener);
  }

  destroy() {
    for (const [type, listener] of Object.entries(this.listeners)) this.button.removeEventListener(type, listener);
    cancelAnimationFrame(this.frames);
    clearTimeout(this.splashTimer);
    clearTimeout(this.shakeTimer);
  }

  // Finds the mascot's SVG again. A host that swaps the SVG (for night, say) calls this after.
  refresh() {
    this.svg = this.button.querySelector("svg");
    this.fill = new MascotWater(this.svg, { reducedMotion: this.reducedMotion, body: this.body });
  }

  // Lets the next watering start at once, as after a reset.
  rest() {
    this.readyAt = 0;
  }

  // A plain watering: one stage and a short fountain.
  water() {
    const now = performance.now();
    if (now < this.readyAt) return;
    this.readyAt = now + COOLDOWN_MS;
    this.sprinkle();
    this.button.classList.add("is-watering");
    clearTimeout(this.splashTimer);
    this.splashTimer = setTimeout(() => this.button.classList.remove("is-watering"), WATER_MS);
  }

  // A click, from a pointer or from assistive technology. A hold that ended in a release already
  // watered, so the click it leaves behind does nothing. A key press never clicks.
  click() {
    if (this.longPress) this.longPress = false;
    else this.water();
  }

  press(event) {
    if (event.button !== 0 || !event.isPrimary) return;
    try {
      this.button.setPointerCapture(event.pointerId);
    } catch {
      // Without capture, the release is still seen when it ends on the mascot.
    }
    // A press that begins while a show is on starts nothing, and its click must not water either.
    this.longPress = !this.startHold("pointer");
  }

  // Space and Enter hold like a press. Their default would click, so it is prevented.
  keyDown(event) {
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    if (!event.repeat) this.startHold("key");
  }

  keyUp(event) {
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    if (this.hold?.source === "key") this.endHold();
  }

  letGo() {
    if (this.hold?.source === "pointer") this.endHold();
  }

  startHold(source) {
    const now = performance.now();
    if (this.mode !== "idle" || now < this.readyAt) return false;
    this.mode = "holding";
    this.hold = { source, start: now, step: 0 };
    this.frameTime = now;
    this.fill.clear();
    this.frames = requestAnimationFrame(this.frame);
    return true;
  }

  // Under HOLD_MS is a plain watering: a key waters now, and a pointer waters by the click that follows.
  endHold() {
    // A release during the brim does not stop the hold, which lets go on its own. A pointer's click
    // that follows must still be swallowed, as after a finished hold. A key never clicks.
    if (this.mode === "brim") {
      if (this.hold?.source === "pointer" && !this.hold.released) {
        this.hold.released = true;
        this.longPress = true;
      }
      return;
    }
    if (this.mode !== "holding") return;
    const held = performance.now() - this.hold.start;
    if (held >= HOLD_MS) {
      const steps = held / FILL_STEP_MS; // the level in eighths, and the drain's starting height
      this.release(Math.min(MAX_STAGE, Math.floor(steps)), steps);
      return;
    }
    const source = this.hold.source;
    cancelAnimationFrame(this.frames);
    this.mode = "idle";
    this.hold = null;
    this.fill.clear();
    if (source === "key") this.water();
  }

  frame = (now) => {
    const dt = Math.max(0, Math.min(0.05, (now - this.frameTime) / 1000));
    this.frameTime = now;
    if (this.mode === "holding") this.fillUp(now, dt);
    else if (this.mode === "brim") {
      if (now >= this.brimUntil) this.release(MAX_STAGE, MAX_STAGE);
      else this.fill.step(dt, MAX_STAGE, true);
    } else if (this.mode === "draining") this.drainDown(now, dt);
    this.fill.render();
    if (this.mode !== "idle") this.frames = requestAnimationFrame(this.frame);
  };

  fillUp(now, dt) {
    const steps = Math.max(0, now - this.hold.start) / FILL_STEP_MS;
    const step = Math.min(MAX_STAGE, Math.floor(steps));
    if (step > this.hold.step) {
      this.hold.step = step;
      this.fill.kick(step);
      this.shake(step);
      this.onFill(step);
    }
    if (steps >= MAX_STAGE) {
      this.mode = "brim";
      this.brimUntil = now + BRIM_MS;
      this.button.classList.add("is-brim", "is-squinting");
      this.fill.step(dt, MAX_STAGE, true);
    } else this.fill.step(dt, steps, true);
  }

  // Lets the water go: the scene grows level stages while the mascot drains over the fountain.
  release(level, held) {
    const now = performance.now();
    const classes = this.button.classList;
    classes.remove("is-shaking", "is-shaking-hard", "is-brim");
    classes.add("is-squinting");
    clearTimeout(this.shakeTimer);
    this.mode = "draining";
    // A pointer released during the brim has already had its click swallowed, so it is not re-armed.
    this.longPress = this.hold.source === "pointer" && !this.hold.released;
    this.hold = null;
    this.drain = { start: now, ms: releaseMs(level), from: Math.min(held, MAX_STAGE) };
    this.readyAt = now + showMs(level);
    this.sprinkle(level);
  }

  drainDown(now, dt) {
    const done = (now - this.drain.start) / this.drain.ms;
    if (done < 1) {
      this.fill.step(dt, this.drain.from * (1 - done), false);
      return;
    }
    this.fill.clear();
    this.button.classList.remove("is-squinting");
    this.mode = "idle";
  }

  shake(step) {
    if (this.reducedMotion) return;
    const classes = this.button.classList;
    classes.remove("is-shaking", "is-shaking-hard");
    void this.button.offsetWidth; // restarts the animation
    classes.add(step >= 5 ? "is-shaking-hard" : "is-shaking");
    clearTimeout(this.shakeTimer);
    this.shakeTimer = setTimeout(() => classes.remove("is-shaking", "is-shaking-hard"), SHAKE_MS);
  }

  // Waters the scene from the spout: one stage, or level stages for a release. The mascot is at
  // rest by now, so the spout is where the sprite is drawn.
  sprinkle(level) {
    const [x, y] = this.spout((this.svg ?? this.button).getBoundingClientRect());
    const before = this.nursery.stage;
    const stage = this.nursery.sprinkle(x, y, level);
    this.onWater({ stage, before });
  }
}
