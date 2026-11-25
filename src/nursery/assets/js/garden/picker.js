// The scene picker. ScenePicker draws the scenes into its own element inside a host element, one
// row per biome group under its name, each scene as its pixel icon with its name on hover or focus. ScenePopover is a
// button that shows the current scene and opens a ScenePicker beside it. garden.css styles both.
//
// The picker only shows and reports the choice. The host decides what a choice does and where it is
// saved: onChoose(scene) runs when a scene is picked, and mark(id) shows which one is current.

import { iconSvg } from "../kit/pixel.js";
import { groupScenes, SCENES } from "../nursery.js";

const sceneIcon = (scene) => iconSvg(scene.icon.grid, scene.icon.colours);

let made = 0;
const uniqueId = (prefix) => `${prefix}-${++made}`;

export class ScenePicker {
  // groups and filter go to groupScenes, so a host can reorder the groups or leave scenes out.
  constructor(host, { current, onChoose, groups, filter }) {
    this.root = document.createElement("div");
    this.root.className = "nursery-picker";
    this.root.append(
      ...groupScenes(SCENES, { groups, filter }).map((group) => {
        const section = document.createElement("div");
        section.className = "nursery-picker__group";
        section.setAttribute("role", "group");
        const label = document.createElement("p");
        label.className = "nursery-picker__label";
        label.id = uniqueId("nursery-picker");
        label.textContent = group.label;
        section.setAttribute("aria-labelledby", label.id);
        const row = document.createElement("div");
        row.className = "nursery-picker__row";
        row.append(...group.scenes.map((scene) => this.choice(scene)));
        section.append(label, row);
        return section;
      }),
    );
    host.append(this.root);
    this.onClick = (event) => {
      const button = event.target.closest("[data-scene-id]");
      const scene = button && SCENES.find((s) => s.id === button.dataset.sceneId);
      if (scene) onChoose(scene);
    };
    this.root.addEventListener("click", this.onClick);
    this.mark(current);
  }

  choice(scene) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "nursery-button";
    button.dataset.sceneId = scene.id;
    button.dataset.tip = scene.label;
    button.setAttribute("aria-label", scene.label);
    button.innerHTML = sceneIcon(scene);
    return button;
  }

  mark(id) {
    for (const button of this.root.querySelectorAll("[data-scene-id]")) {
      button.setAttribute("aria-pressed", String(button.dataset.sceneId === id));
    }
  }

  destroy() {
    this.root.removeEventListener("click", this.onClick);
    this.root.remove();
  }
}

// The popover is the browser's own (the popover attribute): Escape, a click outside and focus
// return come with it. It opens below the button, aligned to whichever side of the page the button
// is on, and closes when a scene is picked or the page scrolls.
export class ScenePopover {
  constructor(root, { current, onChoose, groups, filter }) {
    this.root = root;
    const id = uniqueId("nursery-popover");
    this.trigger = document.createElement("button");
    this.trigger.type = "button";
    this.trigger.className = "nursery-button nursery-button--trigger";
    this.trigger.setAttribute("popovertarget", id);
    this.trigger.setAttribute("aria-expanded", "false");
    this.panel = document.createElement("div");
    this.panel.id = id;
    this.panel.className = "nursery-panel nursery-popover";
    this.panel.setAttribute("popover", "auto");
    this.panel.setAttribute("aria-label", "Scenes");
    this.root.replaceChildren(this.trigger, this.panel);

    this.picker = new ScenePicker(this.panel, {
      current,
      groups,
      filter,
      onChoose: (scene) => {
        this.panel.hidePopover();
        onChoose(scene);
      },
    });
    this.onBeforeToggle = (event) => {
      if (event.newState === "open") this.place();
    };
    this.onToggle = (event) => {
      const open = event.newState === "open";
      this.trigger.setAttribute("aria-expanded", String(open));
      if (open) window.addEventListener("scroll", this.onScroll, { passive: true });
      else window.removeEventListener("scroll", this.onScroll);
    };
    this.onScroll = () => this.panel.hidePopover();
    this.panel.addEventListener("beforetoggle", this.onBeforeToggle);
    this.panel.addEventListener("toggle", this.onToggle);
    this.mark(current);
  }

  // Placed before it shows, so it never flashes elsewhere. Anchoring by the near edge needs no
  // measure of the panel; its width is capped to the room on that side and to --nursery-panel-max.
  place() {
    const box = this.trigger.getBoundingClientRect();
    const gap = 8;
    const edge = 12;
    const style = this.panel.style;
    style.top = `${box.bottom + gap}px`;
    if (box.left + box.width / 2 > window.innerWidth / 2) {
      style.left = "auto";
      style.right = `${window.innerWidth - box.right}px`;
      style.maxWidth = `min(${box.right - edge}px, var(--nursery-panel-max))`;
      this.panel.dataset.align = "end";
    } else {
      style.right = "auto";
      style.left = `${box.left}px`;
      style.maxWidth = `min(${window.innerWidth - box.left - edge}px, var(--nursery-panel-max))`;
      this.panel.dataset.align = "start";
    }
  }

  mark(id) {
    this.picker.mark(id);
    const scene = SCENES.find((s) => s.id === id);
    if (!scene) return;
    this.trigger.innerHTML = sceneIcon(scene);
    this.trigger.dataset.tip = scene.label;
    this.trigger.setAttribute("aria-label", `Scene: ${scene.label}`);
  }

  destroy() {
    this.panel.removeEventListener("beforetoggle", this.onBeforeToggle);
    this.panel.removeEventListener("toggle", this.onToggle);
    window.removeEventListener("scroll", this.onScroll);
    this.picker.destroy();
    this.root.replaceChildren();
  }
}
