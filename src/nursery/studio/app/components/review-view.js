// Reviewing a proposal, in the centre, on one ReviewSession: today's sprite it replaces beside
// each variant in day and night, all at one crop and zoom so sizes compare, played at real speed
// with frame steps and slow motion; and the chosen variant over the live scene (its own scene()
// path, or standing centred on the soil line). The verdict is in the side panel.
import { LiveScene } from "../services/live-scene.js";
import { grow, union } from "../services/pixels.js";
import { STATES, tierOf } from "../services/scene-model.js";
import { act } from "../ui/action.js";
import { createRef, css, html, LitElement, nothing, ref } from "../ui/lit.js";
import { shared } from "../ui/shared.js";

const SPEEDS = [0.25, 0.5, 1, 2];

export class ReviewView extends LitElement {
  static properties = { session: { attribute: false }, sceneError: { state: true } };

  static styles = [
    shared,
    css`
      :host {
        display: grid;
        grid-template-rows: auto auto 1fr;
        min-height: 0;
        background: var(--bg);
      }
      .head {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        padding: var(--space-3) var(--space-4);
        border-bottom: 1px solid var(--border);
        background: var(--surface);
      }
      .title {
        font-weight: 650;
        font-size: var(--text-lg);
      }
      .grow {
        flex: 1;
      }
      .variants {
        display: flex;
        gap: var(--space-4);
        justify-content: center;
        padding: var(--space-4);
        flex-wrap: wrap;
      }
      .variant {
        display: grid;
        gap: var(--space-2);
        padding: var(--space-3);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        background: var(--surface);
        color: inherit;
        font: inherit;
        text-align: left;
      }
      button.variant {
        cursor: pointer;
      }
      .variant.chosen {
        border-color: var(--accent);
        box-shadow: 0 0 0 1px var(--accent);
      }
      .variant .pair {
        display: flex;
        gap: var(--space-2);
      }
      .variant .name {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-2);
        font-weight: 600;
      }
      .facts {
        color: var(--muted);
        font-size: var(--text-sm);
      }
      .error {
        color: var(--danger);
      }
      .transport {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        justify-content: center;
        padding-bottom: var(--space-3);
      }
      .scene {
        display: grid;
        grid-template-rows: auto 1fr;
        gap: var(--space-2);
        padding: 0 var(--space-4) var(--space-4);
        min-height: 0;
      }
      .stage {
        display: grid;
        place-items: end center;
        min-height: 0;
        overflow: hidden;
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        background: var(--landing-base);
      }
      .stage canvas {
        image-rendering: pixelated;
      }
    `,
  ];

  stage = createRef();
  out = createRef();

  constructor() {
    super();
    this.onChange = () => this.requestUpdate();
  }

  willUpdate(changed) {
    if (changed.has("session")) {
      changed.get("session")?.removeEventListener("change", this.onChange);
      this.session?.addEventListener("change", this.onChange);
      this.live?.destroy();
      this.live = null;
    }
  }

  connectedCallback() {
    super.connectedCallback();
    let last = performance.now();
    const tick = (now) => {
      this.raf = requestAnimationFrame(tick);
      const s = this.session;
      if (!s) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (s.playing) {
        const before = this.frames();
        s.t += dt * s.speed;
        if (this.frames() !== before) this.requestUpdate();
      }
      this.paintScene();
    };
    this.raf = requestAnimationFrame(tick);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    cancelAnimationFrame(this.raf);
    this.session?.removeEventListener("change", this.onChange);
    this.live?.destroy();
  }

  // Which frame each column shows now, as one string, so a redraw happens only on a new frame.
  frames() {
    const s = this.session;
    return [s.proposal.now, ...s.variants].filter(Boolean).map((j) => s.frameOf(j)).join();
  }

  render() {
    const s = this.session;
    if (!s) return html``;
    const p = s.proposal;
    const spec = p.spec ?? {};
    const st = STATES[p.state];
    const jobs = [...(p.now ? [p.now] : []), ...s.variants];
    // One crop for every column whose box matches, so sizes compare.
    let crop = null;
    const box = jobs.at(-1)?.box;
    for (const job of jobs) if (box && job.box.w === box.w && job.box.h === box.h) crop = union(crop, job.bbox);
    crop = grow(crop ?? { x: 0, y: 0, w: 1, h: 1 }, 2, box ?? { w: 80, h: 60 });
    const zoom = Math.max(2, Math.min(10, Math.floor(160 / Math.max(crop.w, crop.h))));
    const column = (job, label, choosable) => {
      const [w, h] = job.size ?? [0, 0];
      const length = job.proposal ? (job.count > 1 ? `${job.count} frames, ${job.seconds} s` : "still") : `${job.frames.length} frame${job.frames.length > 1 ? "s" : ""}`;
      const chosen = choosable && s.choice === job.title;
      const body = html`
        <div class="name">${label}${chosen ? html`<span class="badge ok">Your choice</span>` : nothing}</div>
        ${job.variant?.notes ? html`<div class="facts">${job.variant.notes}</div>` : nothing}
        <div class="pair">
          ${job.themes.map((t) => html`<n-sprite .job=${job} .crop=${crop} .zoom=${zoom} theme=${t} .f=${s.frameOf(job)}></n-sprite>`)}
        </div>
        <div class="facts">${w}×${h} · ${tierOf(w, h)} · ${length}${job.same ? " · same by day and night" : ""}</div>
      `;
      return choosable
        ? html`<button
            class="variant ${chosen ? "chosen" : ""}"
            @click=${() => {
              s.choice = job.title;
              s.changed();
            }}
          >
            ${body}
          </button>`
        : html`<div class="variant">${body}</div>`;
    };
    return html`
      <div class="head">
        <span class="title">${spec.title ?? p.name}</span>
        <span class="badge ${st.tone}"><n-icon name=${st.icon} size="12"></n-icon>${st.label}</span>
        <span class="muted">${p.name}.js · revision ${spec.revision ?? 1}${spec.author ? ` · ${spec.author}` : ""}</span>
        <span class="grow"></span>
        <button class="btn ghost" @click=${() => act(this, "close-review")}><n-icon name="x"></n-icon>Close</button>
      </div>
      <div>
        ${p.error ? html`<p class="error" style="padding:16px">${p.error}</p>` : nothing}
        ${p.warning ? html`<p class="error" style="padding:0 16px">${p.warning}</p>` : nothing}
        <div class="variants">
          ${p.now ? column(p.now, `Now · ${p.now.title}`, false) : nothing}
          ${p.variants.map((job) =>
            job.error ? html`<div class="variant"><div class="name">Variant ${job.title}</div><div class="error">${job.error}</div></div>` : column(job, `Variant ${job.title}`, true),
          )}
        </div>
        <div class="transport">
          <button class="icon-btn" title="One frame back" @click=${() => s.step(-1)}><n-icon name="step-back"></n-icon></button>
          <button
            class="btn"
            @click=${() => {
              s.playing = !s.playing;
              s.changed();
            }}
          >
            <n-icon name=${s.playing ? "pause" : "play"}></n-icon>${s.playing ? "Pause" : "Play"}
          </button>
          <button class="icon-btn" title="One frame on" @click=${() => s.step(1)}><n-icon name="step-forward"></n-icon></button>
          <div class="seg" role="group" aria-label="Speed">
            ${SPEEDS.map(
              (v) => html`<button
                aria-pressed=${s.speed === v}
                @click=${() => {
                  s.speed = v;
                  s.changed();
                }}
              >
                ${v === 0.25 ? "¼" : v === 0.5 ? "½" : v}×
              </button>`,
            )}
          </div>
          <span class="muted">${s.lead ? `${(s.t % s.lead.seconds).toFixed(2)} s · frame ${s.frameOf(s.lead) + 1} of ${s.lead.count}` : "still"}</span>
        </div>
      </div>
      <div class="scene">
        <span class="eyebrow">${s.chosen ? `Variant ${s.chosen.title} in the scene${s.chosen.variant.scene ? "" : ", centred on the soil"}` : "In the scene"}
          ${this.sceneError ? html`<span class="error">· scene(): ${this.sceneError}</span>` : nothing}</span>
        <div class="stage" ${ref(this.stage)}><canvas ${ref(this.out)}></canvas></div>
      </div>
    `;
  }

  // The live scene drawn into the stage with the chosen variant over it, every frame.
  paintScene() {
    const s = this.session;
    const canvas = this.out.value;
    if (!s || !canvas) return;
    if (!this.live) {
      const ground = document.createElement("canvas");
      const water = document.createElement("canvas");
      this.live = new LiveScene(ground, water, s.model.sid, 8, "laptop");
    }
    const f = this.live.engine;
    if (canvas.width !== f.cols || canvas.height !== f.rows) {
      canvas.width = f.cols;
      canvas.height = f.rows;
    }
    const box = this.stage.value.getBoundingClientRect();
    const zoom = Math.max(1, Math.floor(Math.min(box.width / f.cols, box.height / f.rows)));
    canvas.style.width = `${f.cols * zoom}px`;
    canvas.style.height = `${f.rows * zoom}px`;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, f.cols, f.rows);
    ctx.drawImage(f.ground, 0, 0);
    ctx.drawImage(f.water, 0, 0);
    const job = s.chosen;
    if (!job) return;
    const v = job.variant;
    const seconds = v.sceneSeconds ?? job.seconds;
    const t = seconds > 0 ? Math.floor((s.t % seconds) * job.fps) / job.fps : 0;
    const pal = { ...f.pal.near, ...s.proposal.spec?.palettes?.[f.theme], ...v.palettes?.[f.theme] };
    try {
      if (v.scene) v.scene({ ctx, pal, time: t, groundY: f.groundY, cols: f.cols }, t, f);
      else {
        ctx.save();
        ctx.translate(Math.round(f.cols / 2) - 40, f.groundY - job.box.ground);
        v.draw({ ctx, pal, time: t, groundY: job.box.ground, cols: job.box.w }, t);
        ctx.restore();
      }
      if (this.sceneError) this.sceneError = null;
    } catch (error) {
      const message = String(error?.message ?? error);
      if (this.sceneError !== message) this.sceneError = message;
    }
  }
}

customElements.define("review-view", ReviewView);
