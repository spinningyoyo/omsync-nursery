// <n-sprite .job theme f zoom fit>: one render of a job (a pose drawn by the scene's code) at a
// whole-number zoom, on a day (checker) or night background. .image draws a given ImageData
// instead, with .crop; fit="W" picks the largest zoom that keeps it W px or less. `bare` drops
// the frame, for laying a sprite over a scene.
import { bounds, drawZoomed, grow } from "../services/pixels.js";
import { createRef, css, html, LitElement, ref } from "./lit.js";
import { shared } from "./shared.js";

export class NSprite extends LitElement {
  static properties = {
    job: { attribute: false },
    image: { attribute: false },
    crop: { attribute: false },
    theme: {},
    f: { type: Number },
    zoom: { type: Number },
    fit: { type: Number },
    bare: { type: Boolean },
    rev: { type: Number }, // set when .image is edited in place, to redraw it
  };

  static styles = [
    shared,
    css`
      :host {
        display: inline-flex;
      }
      .frame {
        display: grid;
        place-items: center;
        padding: 6px;
        border-radius: var(--radius-sm);
        border: 1px solid var(--border);
      }
      .frame.bare {
        padding: 0;
        border: 0;
        background: none;
      }
      canvas {
        display: block;
      }
      .error {
        color: var(--danger);
        font-size: var(--text-xs);
      }
    `,
  ];

  canvas = createRef();

  constructor() {
    super();
    this.theme = "light";
    this.zoom = 3;
  }

  get img() {
    if (this.image) return this.image;
    const job = this.job;
    // A proposal not yet drawn in full shows its frame 0 (a thumbnail needs no more).
    if (job?.lazy && !this.f) return job.first.get(this.theme) ?? job.first.get("light");
    if (!job?.renders) return null;
    // A sprite that looks the same by day and night keeps only its day render.
    const theme = job.themes?.includes(this.theme) ? this.theme : "light";
    return job.renders.get(`${theme}|${this.f ?? job.frames[0]}`) ?? null;
  }

  render() {
    if (this.job?.error) return html`<span class="error" title=${this.job.error}>does not draw</span>`;
    const bg = this.bare ? "bare" : this.theme === "dark" ? "night" : "checker";
    return html`<div class="frame ${bg}"><canvas class="pixels" ${ref(this.canvas)}></canvas></div>`;
  }

  updated() {
    const img = this.img;
    const canvas = this.canvas.value;
    if (!img || !canvas) return;
    const box = { w: img.width, h: img.height };
    const crop =
      this.crop ?? grow((this.job?.lazy ? null : this.job?.bbox) ?? bounds(img) ?? { x: 0, y: 0, w: 1, h: 1 }, 1, box);
    const zoom = this.fit ? Math.max(1, Math.floor(this.fit / Math.max(crop.w, crop.h / 1.4))) : this.zoom;
    canvas.width = crop.w * zoom;
    canvas.height = crop.h * zoom;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawZoomed(ctx, img, crop, zoom, null, 0, 0, this.image != null);
  }
}

customElements.define("n-sprite", NSprite);
