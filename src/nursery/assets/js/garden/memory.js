// What a host remembers about its garden in the browser: the scene last picked, and how far each
// scene has grown. The host names the two localStorage keys, so two hosts on one origin keep their
// own gardens. Storage can be blocked (a private window, site data cleared); then nothing is kept
// past the page, and every read gives the default.

import { MAX_STAGE } from "../nursery.js";

function read(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage is blocked: the value lasts for this page.
  }
}

export class GardenMemory {
  constructor({ sceneKey, growthKey }) {
    this.sceneKey = sceneKey;
    this.growthKey = growthKey;
  }

  scene() {
    return read(this.sceneKey);
  }

  saveScene(id) {
    write(this.sceneKey, id);
  }

  // The stage a scene was left at, as a whole number from 0 to MAX_STAGE.
  stage(id) {
    const stage = Math.round(Number(this.growth()[id]) || 0);
    return Math.min(MAX_STAGE, Math.max(0, stage));
  }

  saveStage(id, stage) {
    write(this.growthKey, JSON.stringify({ ...this.growth(), [id]: stage }));
  }

  growth() {
    try {
      const growth = JSON.parse(read(this.growthKey));
      return growth && typeof growth === "object" ? growth : {};
    } catch {
      return {};
    }
  }
}
