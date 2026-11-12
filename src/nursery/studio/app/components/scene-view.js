// The live scene: the real engine on the sign-in page's backdrop (the scene's washes from
// css/scenes.css under a grid), filling the centre at the largest whole-number zoom, with its
// controls below. It never scrolls away; everything else happens in the side panel.
import { MAX_STAGE } from "/js/nursery.js";
import { fire, onPage, timers, until } from "../services/events.js";
import { LiveScene, PAGE_SIZES, running } from "../services/live-scene.js";
import { createRef, css, html, LitElement, ref } from "../ui/lit.js";
import { shared } from "../ui/shared.js";

export class SceneView extends LitElement {
  static properties = {
    sid: {},
    stage: { state: true },
    size: { state: true },
    paused: { state: true },
    onPage: { state: true },
    triggers: { state: true },
  };

  static styles = [
    shared,
    css`
      :host {
        display: grid;
        grid-template-rows: 1fr auto;
        min-height: 0;
        background: var(--bg);
      }
      .viewport {
        position: relative;
        display: grid;
        place-items: end center;
        min-height: 0;
        overflow: hidden;
      }
      .backdrop {
        position: absolute;
        inset: 0;
        background: var(--landing-base, #fff);
      }
      .backdrop .wash {
        position: absolute;
        inset: -8%;
        background:
          radial-gradient(52% 58% at 100% 0%, var(--landing-green) 0%, transparent 72%),
          radial-gradient(42% 46% at 0% 42%, var(--landing-peach) 0%, transparent 74%),
          radial-gradient(60% 34% at 58% 72%, var(--landing-blush) 0%, transparent 76%),
          radial-gradient(34% 30% at 0% 100%, var(--landing-green-soft) 0%, transparent 72%);
      }
      .backdrop .grid {
        position: absolute;
        inset: 0;
        background-image:
          linear-gradient(to right, var(--landing-line) 0 2px, transparent 2px),
          linear-gradient(to bottom, var(--landing-line) 0 2px, transparent 2px);
        background-size: var(--cell) var(--cell);
        background-position: 0 100%;
      }
      .stage {
        position: relative;
        cursor: pointer;
      }
      .stage canvas {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        image-rendering: pixelated;
      }
      .controls {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
        padding: var(--space-3) var(--space-4);
        border-top: 1px solid var(--border);
        background: var(--surface);
      }
      .row {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        flex-wrap: wrap;
      }
      .stage-slider {
        display: inline-flex;
        align-items: center;
        gap: var(--space-2);
        min-width: 240px;
        font-weight: 500;
      }
      input[type="range"] {
        flex: 1;
        accent-color: var(--accent);
      }
      .value {
        min-width: 3ch;
        font-variant-numeric: tabular-nums;
      }
      .sep {
        width: 1px;
        height: 20px;
        margin: 0 var(--space-1);
        background: var(--border);
      }
      .grow {
        flex: 1;
      }
      .label {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-width: 86px;
        color: var(--muted);
        font-size: var(--text-sm);
        font-weight: 500;
      }
    `,
  ];

  viewport = createRef();
  stageBox = createRef();
  groundCanvas = createRef();
  waterCanvas = createRef();

  constructor() {
    super();
    this.stage = MAX_STAGE;
    this.size = "desktop";
    this.paused = false;
    this.onPage = [];
    this.triggers = [];
  }

  render() {
    return html`
      <div class="viewport" ${ref(this.viewport)}>
        <div class="backdrop"><div class="wash"></div><div class="grid"></div></div>
        <div class="stage" ${ref(this.stageBox)} @click=${this.water} title="Click to water">
          <canvas ${ref(this.groundCanvas)}></canvas><canvas ${ref(this.waterCanvas)}></canvas>
        </div>
      </div>
      <div class="controls">
        <div class="row">
          <label class="stage-slider">
            Stage
            <input
              type="range"
              min="0"
              max=${MAX_STAGE}
              .value=${String(this.stage)}
              @input=${(e) => this.setStage(Number(e.target.value))}
            />
            <span class="value">${this.stage}/${MAX_STAGE}</span>
          </label>
          <button class="btn" @click=${this.water}><n-icon name="droplets"></n-icon>Water</button>
          <button class="btn" @click=${() => this.live.replant()}>
            <n-icon name="rotate-ccw"></n-icon>Replant
          </button>
          <button class="icon-btn" title=${this.paused ? "Play" : "Pause"} @click=${this.togglePause}>
            <n-icon name=${this.paused ? "play" : "pause"}></n-icon>
          </button>
          <div class="grow"></div>
          <div class="seg" role="group" aria-label="Page size">
            ${Object.entries(PAGE_SIZES).map(
              ([id, s]) => html`<button aria-pressed=${this.size === id} @click=${() => this.setSize(id)}>
                <n-icon name=${s.icon}></n-icon>${s.label}
              </button>`,
            )}
          </div>
        </div>
        <div class="row">
          <span class="label"><n-icon name="zap"></n-icon>Trigger</span>
          ${this.triggers.length
            ? this.triggers.map(
                (t) => html`<button
                  class="chip"
                  title="Fire now (it still waits for its stage, night, or its animal)"
                  @click=${() => fire(this.live.engine, t.label)}
                >
                  ${t.label} · ${t.when}
                </button>`,
              )
            : html`<span class="muted">no timed events</span>`}
        </div>
        <div class="row">
          <span class="label"><n-icon name="eye"></n-icon>On the page</span>
          ${this.onPage.length
            ? this.onPage.map((name) => html`<span class="chip">${name}</span>`)
            : html`<span class="muted">nothing yet</span>`}
        </div>
      </div>
    `;
  }

  firstUpdated() {
    this.live = new LiveScene(this.groundCanvas.value, this.waterCanvas.value, this.sid, this.stage, this.size);
    this.fit();
    this.observer = new ResizeObserver(() => this.fit());
    this.observer.observe(this.viewport.value);
    running.live = this.live;
    // What is on the page and when each timed event fires, twice a second.
    this.ticker = setInterval(() => {
      const engine = this.live.engine;
      this.onPage = onPage(engine);
      this.triggers = timers(engine).map((t) => ({ label: t.label, when: until(engine, t) }));
    }, 500);
  }

  updated(changed) {
    if (changed.has("sid") && changed.get("sid") !== undefined && this.live) {
      this.live.setScene(this.sid, this.stage);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearInterval(this.ticker);
    if (running.live === this.live) running.live = null;
    this.observer?.disconnect();
    this.live?.destroy();
  }

  // The largest whole-number zoom that fits the viewport, so every art pixel stays square.
  fit() {
    const box = this.viewport.value.getBoundingClientRect();
    const { cols, rows } = this.live.size;
    const zoom = Math.max(1, Math.floor(Math.min(box.width / cols, box.height / rows)));
    const stage = this.stageBox.value;
    stage.style.width = `${cols * zoom}px`;
    stage.style.height = `${rows * zoom}px`;
    this.style.setProperty("--cell", `${16 * zoom}px`);
  }

  setStage(stage) {
    this.stage = stage;
    this.live.setStage(stage);
  }

  setSize(size) {
    this.size = size;
    this.live.setSize(size);
    this.fit();
  }

  water() {
    this.stage = this.live.water();
  }

  togglePause() {
    this.paused = !this.paused;
    this.live.pause(this.paused);
  }
}

customElements.define("scene-view", SceneView);
