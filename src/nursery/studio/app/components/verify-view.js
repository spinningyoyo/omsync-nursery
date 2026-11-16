// The Verify view, in the centre: the runs of `nursery verify` (pick one, or start a new one), and
// the finding picked in the side panel played again frame by frame, zoomed on the animal, with
// what the rule measured drawn over it: the box, the tier's limit, the ground row, the scenery
// under a perched bird's feet. Frames where the rule failed are marked on the strip. The owner's
// triage mark (real bug, rule too strict, ignore) applies to the whole group, in every scene.

import {
  actorName,
  onPage,
  RULES,
  ruleLabel,
  sceneLabel,
  sizeLabel,
  themeLabel,
  VERDICTS,
  verdictOf,
} from "../services/verify-session.js";
import { act } from "../ui/action.js";
import { createRef, css, html, LitElement, nothing, ref } from "../ui/lit.js";
import { shared } from "../ui/shared.js";

const SPEEDS = [0.25, 0.5, 1];
const PAD = 12; // art px around the animal in the close-up
const INK = {
  actor: "#ff2d95",
  limit: "#f0a020",
  ground: "#21b36b",
  wrong: "rgb(230 40 40 / 0.45)",
  short: "rgb(240 160 32 / 0.35)",
  other: "rgb(140 140 140 / 0.7)",
};
const BACKDROP = { light: "#f7f6f2", dark: "#000000" };

export class VerifyView extends LitElement {
  static properties = {
    session: { attribute: false },
    sid: {},
    playing: { state: true },
    speed: { state: true },
    whole: { state: true },
    notes: { state: true },
  };

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
        flex-wrap: wrap;
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
      select {
        height: 30px;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: var(--surface);
        color: var(--text);
        font: inherit;
        padding: 0 6px;
      }
      .progress {
        display: inline-flex;
        align-items: center;
        gap: var(--space-2);
        color: var(--muted);
        font-size: var(--text-sm);
      }
      .bar {
        width: 120px;
        height: 6px;
        border-radius: 3px;
        background: var(--surface-2);
        overflow: hidden;
      }
      .bar > div {
        height: 100%;
        background: var(--accent);
        transition: width 0.3s;
      }
      .note {
        padding: var(--space-2) var(--space-4);
        font-size: var(--text-sm);
        background: var(--warn-weak);
        color: var(--warn);
        border-bottom: 1px solid var(--border);
      }
      .note.danger {
        background: var(--danger-weak);
        color: var(--danger);
      }
      .body {
        min-height: 0;
        overflow: auto;
        padding: var(--space-4);
      }
      .finding {
        display: grid;
        grid-template-rows: auto auto minmax(220px, 1fr) auto auto auto;
        gap: var(--space-3);
        height: 100%;
        min-height: 0;
      }
      .say {
        font-weight: 650;
        font-size: var(--text-lg);
      }
      .facts {
        color: var(--muted);
        font-size: var(--text-sm);
      }
      .facts b {
        color: var(--text);
        font-weight: 600;
      }
      .controls {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--space-2);
      }
      .stage {
        position: relative;
        display: grid;
        place-items: center;
        min-height: 0;
        overflow: hidden;
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        background: var(--surface-2);
      }
      .stage canvas {
        image-rendering: pixelated;
      }
      .stage .wait {
        color: var(--muted);
        text-align: center;
        padding: var(--space-4);
      }
      .strip {
        display: flex;
        gap: 2px;
        align-items: stretch;
        height: 22px;
      }
      .strip button {
        flex: 1;
        min-width: 4px;
        padding: 0;
        border: 0;
        border-radius: 2px;
        background: var(--surface-2);
        cursor: pointer;
      }
      .strip button.hit {
        background: var(--danger);
        opacity: 0.75;
      }
      .strip button.moment {
        box-shadow: inset 0 -3px 0 var(--accent);
      }
      .strip button[aria-current="true"] {
        outline: 2px solid var(--text);
        outline-offset: 1px;
        opacity: 1;
      }
      .readout {
        font-family: var(--mono);
        font-size: var(--text-sm);
        color: var(--muted);
        min-height: 1.4em;
      }
      .readout .bad {
        color: var(--danger);
        font-weight: 600;
      }
      .readout .good {
        color: var(--ok);
      }
      .legend {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-3);
        font-size: var(--text-xs);
        color: var(--muted);
      }
      .legend i {
        display: inline-block;
        width: 14px;
        height: 3px;
        margin-right: 4px;
        vertical-align: middle;
      }
      .triage {
        display: grid;
        gap: var(--space-2);
        padding: var(--space-3);
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        background: var(--surface);
      }
      .triage .row {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
        align-items: center;
      }
      .triage input {
        flex: 1;
        min-width: 200px;
        height: 30px;
        padding: 0 var(--space-2);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: var(--bg);
        color: var(--text);
        font: inherit;
      }
      .btn[aria-pressed="true"].danger {
        background: var(--danger-weak);
        border-color: var(--danger);
        color: var(--danger);
      }
      .btn[aria-pressed="true"].warn {
        background: var(--warn-weak);
        border-color: var(--warn);
        color: var(--warn);
      }
      .btn[aria-pressed="true"].muted {
        background: var(--surface-2);
        border-color: var(--border-strong);
      }
      .cards {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: var(--space-3);
        margin: var(--space-3) 0 var(--space-4);
      }
      .card {
        display: grid;
        gap: 4px;
        padding: var(--space-3);
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        background: var(--surface);
        color: inherit;
        font: inherit;
        text-align: left;
        cursor: pointer;
      }
      .card:hover {
        border-color: var(--border-strong);
      }
      .card .n {
        font-size: 22px;
        font-weight: 650;
        font-variant-numeric: tabular-nums;
      }
      .card.pass .n {
        color: var(--ok);
      }
      .card .s {
        color: var(--muted);
        font-size: var(--text-sm);
      }
      .scope {
        color: var(--muted);
        font-size: var(--text-sm);
        max-width: 80ch;
      }
      .scope p {
        margin: 0 0 var(--space-2);
      }
      pre {
        white-space: pre-wrap;
        font-family: var(--mono);
        font-size: var(--text-sm);
        padding: var(--space-3);
        border-radius: var(--radius-md);
        background: var(--surface);
        border: 1px solid var(--border);
      }
    `,
  ];

  stage = createRef();
  out = createRef();

  constructor() {
    super();
    this.playing = false;
    this.speed = 0.5;
    this.whole = false;
    this.notes = null;
    this.onChange = () => this.requestUpdate();
  }

  willUpdate(changed) {
    if (changed.has("session")) {
      changed.get("session")?.removeEventListener("change", this.onChange);
      this.session?.addEventListener("change", this.onChange);
    }
    // A new finding starts paused on its moment, with its group's saved notes.
    const uid = this.session?.selected ?? null;
    if (uid !== this.shown) {
      this.shown = uid;
      this.playing = false;
      this.notes = null;
    }
  }

  connectedCallback() {
    super.connectedCallback();
    let last = performance.now();
    let carry = 0;
    const tick = (now) => {
      this.raf = requestAnimationFrame(tick);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const r = this.entry();
      if (!this.playing || r?.state !== "ready" || !r.frames.length) return;
      // Frames are as far apart as the engine's own step (it moves at most 0.05 s a frame), so 1×
      // plays at the page's real pace.
      const gap = r.frames.length > 1 ? r.frames[1].t - r.frames[0].t : 0.05;
      carry += (dt / Math.max(0.01, gap)) * this.speed;
      if (carry < 1) return;
      const n = Math.floor(carry);
      carry -= n;
      r.index = (r.index + n) % r.frames.length;
      this.requestUpdate();
    };
    this.raf = requestAnimationFrame(tick);
    this.resize = new ResizeObserver(() => this.paint());
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    cancelAnimationFrame(this.raf);
    this.resize?.disconnect();
    this.session?.removeEventListener("change", this.onChange);
  }

  firstUpdated() {
    this.session?.loaded || this.session?.load();
  }

  updated() {
    if (this.stage.value && this.observed !== this.stage.value) {
      this.observed = this.stage.value;
      this.resize.observe(this.stage.value);
    }
    this.paint();
  }

  entry() {
    const f = this.session?.finding;
    return f ? this.session.replayOf(f) : null;
  }

  // ---- The page ----------------------------------------------------------------------------------

  render() {
    const s = this.session;
    if (!s) return html``;
    return html`
      ${this.renderHead()}
      <div>
        ${s.error ? html`<div class="note danger">${s.error}</div>` : nothing}
        ${
          s.stale
            ? html`<div class="note">The code changed since this run. A replay plays today's code, so it may not match the finding; run verify again for findings that match.</div>`
            : nothing
        }
      </div>
      <div class="body">${s.finding ? this.renderFinding(s.finding) : this.renderOverview()}</div>
    `;
  }

  renderHead() {
    const s = this.session;
    const st = s.status;
    const running = st?.running;
    const share = st?.total ? Math.round((st.done / st.total) * 100) : 0;
    return html`
      <div class="head">
        <span class="title">Verify</span>
        ${
          s.runs.length
            ? html`<select aria-label="Run" @change=${(e) => s.show(e.target.value)}>
              ${s.runs.map(
                (r) => html`<option value=${r.id} ?selected=${s.run?.id === r.id}>
                  ${r.started.replace("T", " ").slice(0, 16)} · ${r.count} findings${r.rules.length < 7 ? ` · ${r.rules.join(", ")}` : ""}${r.scenes.length < 10 ? ` · ${r.scenes.map(sceneLabel).join(", ")}` : ""}
                </option>`,
              )}
            </select>`
            : nothing
        }
        ${s.run ? html`<span class="muted">${s.run.seconds} s · seed ${s.run.seed}</span>` : nothing}
        ${s.finding ? html`<button class="btn ghost" @click=${() => this.back()}><n-icon name="layout-grid"></n-icon>Overview</button>` : nothing}
        <span class="grow"></span>
        ${
          running
            ? html`<span class="progress">
              <span class="bar"><div style="width:${share}%"></div></span>
              ${st.total ? `${st.done} of ${st.total} jobs` : "Starting Chrome…"}
            </span>`
            : st?.exit != null && st.exit > 1
              ? html`<span class="progress" style="color:var(--danger)" title=${(st.lines ?? []).join("\n")}>The last run failed</span>`
              : nothing
        }
        <button class="btn" ?disabled=${running} title="Run every rule on ${sceneLabel(this.sid)} only" @click=${() => s.start([this.sid])}>
          <n-icon name="play"></n-icon>This scene
        </button>
        <button class="btn primary" ?disabled=${running} title="Run every rule on every scene (about a minute)" @click=${() => s.start([])}>
          <n-icon name="scan-search"></n-icon>Run verify
        </button>
      </div>
    `;
  }

  back() {
    const s = this.session;
    s.selected = null;
    s.changed();
  }

  renderOverview() {
    const s = this.session;
    if (!s.loaded) return html`<p class="muted">Loading…</p>`;
    if (!s.run)
      return html`<p class="muted">No verify run with findings the studio can read yet. Press Run verify: it plays every scene, day and night, at both widths, and checks each frame against the design rules.</p>`;
    const counts = {};
    for (const f of s.run.findings) counts[f.rule] = (counts[f.rule] ?? 0) + 1;
    const groups = new Set(s.run.findings.map((f) => f.group));
    const marked = [...groups].filter((g) => s.triage[g]).length;
    return html`
      <div class="say">${s.run.findings.length ? `${s.run.findings.length} findings in ${groups.size} groups` : "Every rule passes"}</div>
      <div class="facts">${marked} of ${groups.size} groups marked. Pick a finding on the right to play it back, or a rule below to list only its findings.</div>
      <div class="cards">
        ${RULES.filter((r) => s.run.rules.includes(r.id)).map(
          (r) => html`<button
            class="card ${counts[r.id] ? "" : "pass"}"
            @click=${() => s.setFilter("rule", counts[r.id] ? r.id : null)}
          >
            <span class="eyebrow">${r.label}</span>
            <span class="n">${counts[r.id] ?? "Pass"}</span>
            <span class="s">${r.says}</span>
          </button>`,
        )}
      </div>
      <div class="scope">${s.run.scope.map((line) => html`<p>${line}</p>`)}</div>
    `;
  }

  renderFinding(f) {
    const s = this.session;
    const g = s.group;
    const r = s.replayOf(f);
    const span =
      f.count > 1
        ? ` on ${f.count} frames, first at ${f.time} s, last at ${f.last} s`
        : f.time != null
          ? ` at ${f.time} s`
          : "";
    return html`
      <div class="finding">
        <div>
          <div class="eyebrow">${ruleLabel(f.rule)}</div>
          <div class="say">${actorName(f.actor)} ${f.says}</div>
          <div class="facts">
            ${sceneLabel(f.scene)} · ${themeLabel(f.theme)} · ${sizeLabel(f.size)} (${f.width} px)${f.stage != null ? ` · stage ${f.stage}` : ""} ·
            measured <b>${f.value} ${f.unit}</b> · limit <b>${f.limit}</b>${span}
            ${f.actor ? html`<span class="muted"> · ${f.actor}</span>` : nothing}
          </div>
        </div>
        ${s.replayable(f) ? this.renderControls(f, r) : html`<div></div>`}
        ${s.replayable(f) ? this.renderStage(r) : html`<pre>${f.detail ?? f.says}</pre>`}
        ${s.replayable(f) && r?.state === "ready" ? this.renderStrip(r) : html`<div></div>`}
        ${s.replayable(f) && r?.state === "ready" ? this.renderReadout(f, r) : html`<div></div>`}
        ${g ? this.renderTriage(g) : nothing}
      </div>
    `;
  }

  renderControls(f, r) {
    const s = this.session;
    const ready = r?.state === "ready";
    const step = (n) => {
      if (!ready) return;
      this.playing = false;
      r.index = (r.index + n + r.frames.length) % r.frames.length;
      this.requestUpdate();
    };
    return html`
      <div class="controls">
        <div class="seg" role="group" aria-label="Moment">
          <button aria-pressed=${s.moment === "first"} title="The first frame the rule failed" @click=${() => s.setMoment("first")}>First time</button>
          <button aria-pressed=${s.moment === "worst"} ?disabled=${f.worst == null} title="The frame with the worst measurement" @click=${() => s.setMoment("worst")}>Worst</button>
        </div>
        <div class="seg" role="group" aria-label="Zoom">
          <button aria-pressed=${!this.whole} @click=${() => (this.whole = false)}><n-icon name="zoom-in"></n-icon>Close-up</button>
          <button aria-pressed=${this.whole} @click=${() => (this.whole = true)}><n-icon name="image"></n-icon>Whole scene</button>
        </div>
        <button class="icon-btn" title="One frame back" ?disabled=${!ready} @click=${() => step(-1)}><n-icon name="step-back"></n-icon></button>
        <button class="btn" ?disabled=${!ready} @click=${() => (this.playing = !this.playing)}>
          <n-icon name=${this.playing ? "pause" : "play"}></n-icon>${this.playing ? "Pause" : "Play"}
        </button>
        <button class="icon-btn" title="One frame on" ?disabled=${!ready} @click=${() => step(1)}><n-icon name="step-forward"></n-icon></button>
        <div class="seg" role="group" aria-label="Speed">
          ${SPEEDS.map(
            (v) =>
              html`<button aria-pressed=${this.speed === v} @click=${() => (this.speed = v)}>${v === 0.25 ? "¼" : v === 0.5 ? "½" : v}×</button>`,
          )}
        </div>
        <button class="btn ghost" title="Open this scene in the studio's Scene view" @click=${() => {
          act(this, "scene", { sid: f.scene });
          act(this, "view", { view: "scene" });
        }}>
          <n-icon name="link"></n-icon>Open scene
        </button>
      </div>
    `;
  }

  renderStage(r) {
    let body = nothing;
    if (!r || r.state === "running") {
      const t = r?.progress ?? 0;
      body = html`<div class="wait">Playing the job again up to ${r ? r.at.toFixed(2) : "…"} s of page time…<br />
        <span class="muted">${t.toFixed(0)} s so far (same seed and clock as the run)</span></div>`;
    } else if (r.state === "failed") {
      body = html`<div class="wait" style="color:var(--danger)">The replay failed: ${r.error}</div>`;
    }
    const warn =
      r?.state === "ready" && !r.hits
        ? html`<div class="note" style="position:absolute;top:0;left:0;right:0">The rule did not fail in these frames of the replay. The code may have changed since the run; run verify again.</div>`
        : nothing;
    return html`<div class="stage" ${ref(this.stage)}>
      ${warn}${body}<canvas ${ref(this.out)} ?hidden=${r?.state !== "ready"}></canvas>
    </div>`;
  }

  renderStrip(r) {
    return html`
      <div>
        <div class="strip" role="group" aria-label="Frames">
          ${r.frames.map(
            (fr, i) => html`<button
              class="${fr.hit ? "hit" : ""} ${Math.abs(fr.t - r.at) < 0.07 ? "moment" : ""}"
              aria-current=${i === r.index}
              title="${fr.t.toFixed(2)} s${fr.hit ? " · fails" : ""}"
              @click=${() => {
                this.playing = false;
                r.index = i;
                this.requestUpdate();
              }}
            ></button>`,
          )}
        </div>
        <div class="legend" style="margin-top:6px">
          <span><i style="background:var(--danger)"></i>frame fails</span>
          <span><i style="background:var(--accent)"></i>the moment picked</span>
          <span><i style="background:${INK.actor}"></i>the animal (solid when failing)</span>
          ${this.legendFor(this.session.finding?.rule)}
          <span><i style="background:${INK.other}"></i>other animals</span>
        </div>
      </div>
    `;
  }

  legendFor(rule) {
    if (rule === "gap") return html`<span><i style="background:#ff3b3b"></i>loose pixels</span>`;
    if (rule === "grounded")
      return html`<span><i style="background:${INK.ground}"></i>its ground row (above its shadow)</span><span><i style="background:${INK.wrong}"></i>gap under its feet</span>`;
    if (rule === "perched")
      return html`<span><i style="background:${INK.ground}"></i>solid under a foot</span><span><i style="background:${INK.wrong}"></i>air under a foot</span>`;
    return nothing;
  }

  renderReadout(f, r) {
    const fr = r.frames[r.index];
    if (!fr) return html`<div class="readout"></div>`;
    const d = this.targetDraw(r, fr);
    const bits = [`t ${fr.t.toFixed(2)} s`, `stage ${fr.stage}`, `frame ${r.index + 1} of ${r.frames.length}`];
    if (d && !onPage(d.box, r.width, r.height)) bits.push("off the page on this frame");
    if (d?.state) bits.push(`pose ${d.state}`);
    if (d) bits.push(`${d.box.w}×${d.box.h} px`);
    if (d?.c != null) bits.push(`stride clock ${d.c.toFixed(2)}`);
    if (f.rule === "grounded" && d?.box.shadowRow != null)
      bits.push(`feet row ${d.box.footRow}, ground row ${d.box.shadowRow - 1}`);
    const verdict = fr.hit
      ? html`<span class="bad">fails: ${fr.hit.value} ${fr.hit.unit}${fr.hit.guide?.window ? ` over the last ${fr.hit.guide.window.toFixed(2)} s` : ""}</span>`
      : d
        ? html`<span class="good">passes on this frame</span>`
        : html`<span>the animal is not drawn on this frame</span>`;
    return html`<div class="readout">${bits.join(" · ")} · ${verdict}</div>`;
  }

  renderTriage(g) {
    const s = this.session;
    const mark = g.mark;
    const notes = this.notes ?? mark?.notes ?? "";
    const save = (verdict) => s.mark(g.key, verdict, notes);
    return html`
      <div class="triage">
        <div class="row">
          <b>Your call</b>
          <span class="muted">on ${actorName(g.actor)} ${g.says}: ${g.findings.length} findings in ${g.scenes.length} scene${g.scenes.length > 1 ? "s" : ""}, kept for later runs</span>
        </div>
        <div class="row">
          ${VERDICTS.map(
            (
              v,
            ) => html`<button class="btn ${v.tone}" aria-pressed=${mark?.verdict === v.id} @click=${() => save(mark?.verdict === v.id ? null : v.id)}>
              <n-icon name=${v.icon}></n-icon>${v.label}
            </button>`,
          )}
          <input
            placeholder="A note for the agent (what is wrong, or why the rule is too strict)"
            .value=${notes}
            @input=${(e) => (this.notes = e.target.value)}
            @keydown=${(e) => e.key === "Enter" && mark && save(mark.verdict)}
          />
          ${mark && this.notes != null && this.notes !== (mark.notes ?? "") ? html`<button class="btn" @click=${() => save(mark.verdict)}><n-icon name="save"></n-icon>Save note</button>` : nothing}
        </div>
        ${mark ? html`<div class="muted" style="font-size:var(--text-sm)">Marked ${verdictOf(mark.verdict)?.label.toLowerCase()}${mark.at ? ` on ${mark.at.replace("T", " ").slice(0, 16)}` : ""}. Agents read it with <code>uv run nursery verify --triage</code>.</div>` : nothing}
      </div>
    `;
  }

  // ---- The picture -------------------------------------------------------------------------------

  // The finding's animal on a frame: the draw the rule reported, or the same track.
  targetDraw(r, fr) {
    const box = fr.hit?.box;
    if (box) {
      const same = fr.draws.find(
        (d) => d.box.x0 === box.x0 && d.box.y0 === box.y0 && d.box.x1 === box.x1 && d.box.y1 === box.y1,
      );
      if (same) return same;
    }
    return fr.draws.find((d) => r.track.has(d.id)) ?? null;
  }

  // The close-up follows the animal: a fixed size from its largest box (and shadow) in the
  // replay, padded, centred sideways on where it is this frame (or was last seen) and held still
  // up and down, so the ground does not jump. Or the whole frame.
  cropOf(r) {
    const whole = { x: 0, y: 0, w: r.width, h: r.height };
    if (this.whole) return whole;
    let bw = 0;
    let y0 = Infinity;
    let y1 = -Infinity;
    let at = null;
    r.frames.forEach((fr, i) => {
      const d = this.targetDraw(r, fr);
      const b = d?.box ?? fr.hit?.box;
      if (!b || !onPage(b, r.width, r.height)) return;
      bw = Math.max(bw, b.x1 - b.x0 + 1);
      y0 = Math.min(y0, b.y0);
      y1 = Math.max(y1, b.y1, d?.box.shadowRow ?? b.y1);
      if (i <= r.index || at === null) at = b; // the latest box up to this frame
    });
    if (!at) return whole;
    const w = Math.min(r.width, Math.max(56, bw + PAD * 4));
    const h = Math.min(r.height, Math.max(36, y1 - y0 + 1 + PAD * 2));
    const cx = (at.x0 + at.x1) / 2;
    const x = Math.max(0, Math.min(r.width - w, Math.round(cx - w / 2)));
    const y = Math.max(0, Math.min(r.height - h, Math.round((y0 + y1) / 2 - h / 2)));
    return { x, y, w, h };
  }

  paint() {
    const canvas = this.out.value;
    const stage = this.stage.value;
    const f = this.session?.finding;
    const r = this.entry();
    if (!canvas || !stage || !f || r?.state !== "ready" || !r.frames.length) return;
    const fr = r.frames[r.index];
    const crop = this.cropOf(r);
    const room = stage.getBoundingClientRect();
    const Z = Math.max(1, Math.min(24, Math.floor(Math.min((room.width - 16) / crop.w, (room.height - 16) / crop.h))));
    const dpr = window.devicePixelRatio || 1;
    const W = crop.w * Z;
    const H = crop.h * Z;
    if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = BACKDROP[f.theme] ?? BACKDROP.light;
    ctx.fillRect(0, 0, W, H);
    this.scratch ??= document.createElement("canvas");
    const art = this.scratch;
    if (art.width !== fr.image.width || art.height !== fr.image.height) {
      art.width = fr.image.width;
      art.height = fr.image.height;
    }
    art.getContext("2d").putImageData(fr.image, 0, 0);
    ctx.drawImage(art, crop.x, crop.y, crop.w, crop.h, 0, 0, W, H);

    const X = (x) => (x - crop.x) * Z;
    const Y = (y) => (y - crop.y) * Z;
    const target = this.targetDraw(r, fr);
    // Other animals, faint.
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1;
    ctx.strokeStyle = INK.other;
    for (const d of fr.draws) {
      if (d === target) continue;
      ctx.strokeRect(X(d.box.x0) + 0.5, Y(d.box.y0) + 0.5, d.box.w * Z - 1, d.box.h * Z - 1);
    }
    ctx.setLineDash([]);
    const box =
      target?.box ??
      (fr.hit?.box && { ...fr.hit.box, w: fr.hit.box.x1 - fr.hit.box.x0 + 1, h: fr.hit.box.y1 - fr.hit.box.y0 + 1 });
    if (box) this.paintGuides(ctx, f, fr, box, X, Y, Z);
    if (box) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = INK.actor;
      if (!fr.hit) ctx.setLineDash([6, 4]);
      ctx.strokeRect(X(box.x0) - 1, Y(box.y0) - 1, box.w * Z + 2, box.h * Z + 2);
      ctx.setLineDash([]);
    }
  }

  // What the rule measured, drawn on the frame: the ground row, or the scenery under a perched
  // bird's feet, from the rule's report on a failing frame or the animal's own box on a passing one.
  paintGuides(ctx, f, fr, box, X, Y, Z) {
    // Loose pieces (gap).
    if (f.rule === "gap") {
      const guide = fr.hit?.guide;
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#ff3b3b";
      for (const [x, y] of guide?.pixels ?? []) ctx.strokeRect(X(x) - 1, Y(y) - 1, Z + 2, Z + 2);
    }
    const room = ctx.canvas.width / (window.devicePixelRatio || 1);
    const label = (text, at, y, color) => {
      ctx.font = "600 11px ui-sans-serif, system-ui, sans-serif";
      const w = ctx.measureText(text).width + 8;
      const x = Math.max(2, Math.min(room - w - 2, at)); // kept on the canvas
      y = Math.max(16, y);
      ctx.fillStyle = "rgb(0 0 0 / 0.65)";
      ctx.fillRect(x, y - 14, w, 16);
      ctx.fillStyle = color;
      ctx.fillText(text, x + 4, y - 2);
    };
    if (f.rule === "grounded") {
      const shadow = fr.hit?.guide?.shadowRow ?? box.shadowRow;
      if (shadow == null) {
        label("no shadow", X(box.x0), Y(box.y1 + 1) + 18, INK.actor);
        return;
      }
      const ground = shadow - 1;
      const foot = box.footRow ?? box.y1;
      if (ground - foot > 1 || foot - ground > 1) {
        ctx.fillStyle = INK.wrong;
        const a = Math.min(foot, ground) + 1;
        const b = Math.max(foot, ground) + 1;
        ctx.fillRect(X(box.x0), Y(a), box.w * Z, (b - a) * Z);
      }
      ctx.lineWidth = 2;
      ctx.strokeStyle = INK.ground;
      ctx.beginPath();
      ctx.moveTo(X(box.x0) - 4 * Z, Y(ground + 1));
      ctx.lineTo(X(box.x1 + 1) + 4 * Z, Y(ground + 1));
      ctx.stroke();
      const off = ground - foot;
      label(
        off > 1 ? `${off} rows above its ground` : off < -1 ? `${-off} rows below its ground` : "on its ground",
        X(box.x1 + 1) + 4 * Z + 4,
        Y(ground + 1) + 6,
        INK.ground,
      );
    }
    if (f.rule === "perched" && fr.hit?.guide?.columns) {
      const { columns, under, footRow } = fr.hit.guide;
      columns.forEach((x, i) => {
        ctx.fillStyle = under[i] ? "rgb(33 179 107 / 0.6)" : INK.wrong;
        ctx.fillRect(X(x), Y(footRow + 1), Z, Z);
        ctx.lineWidth = 1;
        ctx.strokeStyle = under[i] ? INK.ground : "#e62828";
        ctx.strokeRect(X(x) + 0.5, Y(footRow + 1) + 0.5, Z - 1, Z - 1);
      });
      label("nothing solid under its feet", X(box.x0), Y(footRow + 2) + 18, "#ff6b6b");
    }
  }
}

customElements.define("verify-view", VerifyView);
