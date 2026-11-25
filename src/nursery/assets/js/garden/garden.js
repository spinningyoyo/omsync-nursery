// A garden: the engine drawing one scene, the memory of each scene's growth, and, when the host has
// one, the mascot that waters it. The garden keeps these in step. A watering saves the new stage, a
// new scene comes back as grown as it was left, and a reset starts the scene on show over at stage 0
// and lets the next watering start at once. A bloom element, when given, greens with the stage.
//
// The host draws the rest and reacts in onChange({ scene, stage, before, cause, stageShown }).
// cause is "start", "water", "choose" or "reset"; stageShown is the getter below.

import { MAX_STAGE, Nursery, SCENES } from "../nursery.js";
import { Watering } from "./watering.js";

export class Garden {
  // mascot is { button, spout, body } (see watering.js), or nothing for a garden that is only shown.
  constructor({ ground, water, bloom, sceneId, memory, reducedMotion, mascot, onChange = () => {}, onFill }) {
    this.memory = memory;
    this.bloom = bloom;
    this.onChange = onChange;
    this.touched = false;
    const scene = SCENES.find((s) => s.id === sceneId) ?? SCENES[0];
    this.nursery = new Nursery({ ground, water, reducedMotion, scene, stage: memory.stage(scene.id) });
    if (mascot) {
      this.watering = new Watering({
        ...mascot,
        nursery: this.nursery,
        reducedMotion,
        onFill,
        onWater: ({ stage, before }) => this.watered(stage, before),
      });
    }
    this.report("start", this.stage);
  }

  get scene() {
    return this.nursery.scene;
  }

  get stage() {
    return this.nursery.stage;
  }

  // Whether a host that shows the stage shows it: once the scene has been watered or reset, or when
  // it was already grown.
  get stageShown() {
    return this.touched || this.stage >= 1;
  }

  // Shows another scene, as grown as it was left. Returns false when it is already on show.
  choose(scene) {
    if (scene.id === this.scene.id) return false;
    const before = this.stage;
    this.nursery.setScene(scene, this.memory.stage(scene.id));
    this.memory.saveScene(scene.id);
    this.report("choose", before);
    return true;
  }

  // Starts the scene on show over, as a new layout at stage 0, and forgets how far it had grown.
  reset() {
    const before = this.stage;
    this.nursery.setScene(this.scene, 0);
    this.memory.saveStage(this.scene.id, 0);
    this.watering?.rest();
    this.touched = true;
    this.report("reset", before);
  }

  // Finds the mascot's SVG again, after the host swapped it.
  refreshMascot() {
    this.watering?.refresh();
  }

  watered(stage, before) {
    if (stage !== before) this.memory.saveStage(this.scene.id, stage);
    this.touched = true;
    this.report("water", before);
  }

  report(cause, before) {
    const stage = this.stage;
    if (this.bloom) this.bloom.style.opacity = String(stage / MAX_STAGE);
    this.onChange({ scene: this.scene, stage, before, cause, stageShown: this.stageShown });
  }

  destroy() {
    this.watering?.destroy();
    this.nursery.destroy();
  }
}
