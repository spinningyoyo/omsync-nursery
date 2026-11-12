// What changed in this scene, so nothing reaches it unseen:
// - your saved pixel edits, each waiting for the code, in code, or differing from it;
// - sprites that moved since the first edit was saved, without an edit of their own;
// - art the code draws differently from the last commit, such as a change made without a
//   proposal.
// Each shows before and after. Accept and clear forgets the edits and baseline; proposals and
// reviews stay.
import { acceptAndClear, discardEdit } from "../services/edits.js";
import { bounds, differences, grow, union } from "../services/pixels.js";
import { strip } from "../services/scene-model.js";
import { act } from "../ui/action.js";
import { css, html, LitElement, nothing } from "../ui/lit.js";
import { shared } from "../ui/shared.js";

const TONE = {
  "in code": ["ok", "circle-check"],
  waiting: ["waiting", "clock"],
  differs: ["bad", "circle-alert"],
  missing: ["bad", "circle-alert"],
};

export class ChangesPanel extends LitElement {
  static properties = {
    model: { attribute: false },
    version: { type: Number },
    head: { state: true },
    asking: { state: true },
  };

  static styles = [
    shared,
    css`
      :host {
        display: block;
        padding: var(--space-3) var(--space-4) var(--space-4);
      }
      h3 {
        margin: var(--space-4) 0 var(--space-2);
      }
      .item {
        display: grid;
        gap: 6px;
        padding: var(--space-3);
        margin-bottom: var(--space-2);
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        background: var(--surface);
      }
      .line {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-2);
      }
      .name {
        font-weight: 600;
      }
      .ba {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        color: var(--muted);
        font-size: var(--text-sm);
      }
      .actions {
        display: flex;
        gap: var(--space-2);
      }
      .empty {
        color: var(--muted);
      }
      .confirm {
        display: grid;
        gap: var(--space-2);
        padding: var(--space-3);
        border-radius: var(--radius-md);
        background: var(--warn-weak);
      }
    `,
  ];

  willUpdate(changed) {
    if (changed.has("model") && this.model) {
      this.head = null;
      const model = this.model;
      model.headChanges().then((head) => {
        if (this.model === model) this.head = head;
      });
    }
  }

  // Before and after of one render, cropped to both, at one zoom.
  pair(before, after) {
    const crop = grow(union(bounds(before), bounds(after)) ?? { x: 0, y: 0, w: 1, h: 1 }, 1, { w: before.width, h: before.height });
    return html`<span class="ba">
      ${before ? html`<n-sprite .image=${before} .crop=${crop} fit="64"></n-sprite>` : nothing}
      <n-icon name="chevron-right"></n-icon>
      <n-sprite .image=${after} .crop=${crop} fit="64"></n-sprite>
    </span>`;
  }

  render() {
    const m = this.model;
    if (!m) return html``;
    const edits = [...m.edits.values()];
    const ripples = m.ripples();
    const title = (key) => {
      const [name, theme, f] = key.split("|");
      return `${strip(m.sid, name)} · ${theme === "light" ? "day" : "night"} · frame ${f}`;
    };
    return html`
      <span class="eyebrow">Your pixel edits</span>
      ${edits.length
        ? edits.map((edit) => {
            const state = m.editState(edit);
            const [tone, icon] = TONE[state];
            const [name, theme, f] = edit.key.split("|");
            return html`<div class="item">
              <div class="line">
                <span class="name">${title(edit.key)}</span>
                <span class="badge ${tone}"><n-icon name=${icon} size="12"></n-icon>${state}</span>
              </div>
              ${this.pair(edit.originalImg, edit.targetImg)}
              <span class="muted">${edit.pixels.length} px · saved ${edit.saved.slice(0, 16).replace("T", " ")}</span>
              <div class="actions">
                ${m.jobs.has(name)
                  ? html`<button class="btn" @click=${() => act(this, "edit", { sid: m.sid, name, theme, f: Number(f) })}>
                      <n-icon name="pencil"></n-icon>Open
                    </button>`
                  : nothing}
                <button class="btn ghost" @click=${() => this.discard(edit.key)}><n-icon name="trash-2"></n-icon>Discard</button>
              </div>
            </div>`;
          })
        : html`<p class="empty">No saved edits in this scene.</p>`}
      ${ripples.length
        ? html`<h3 class="eyebrow">Moved without an edit</h3>
            <p class="muted">These changed since your first edit here was saved. Check each one is wanted.</p>
            ${ripples.map(
              (r) => html`<div class="item">
                <div class="line">
                  <span class="name">${title(r.key)}</span>
                  <span class="badge info">${differences(r.before, r.now).length} px</span>
                </div>
                ${this.pair(r.before, r.now)}
              </div>`,
            )}`
        : nothing}
      <h3 class="eyebrow">Changed in code since the last commit</h3>
      ${this.head == null
        ? html`<p class="muted">Comparing with the last commit…</p>`
        : this.head.length
          ? this.head.map(
              (c) => html`<div class="item">
                <div class="line">
                  <span class="name">${c.job.title} · ${c.theme === "light" ? "day" : "night"} · frame ${c.f}</span>
                  <span class="badge bad">${differences(c.before, c.now).length} px</span>
                </div>
                ${this.pair(c.before, c.now)}
              </div>`,
            )
          : html`<p class="empty">The code draws this scene as the last commit does.</p>`}
      ${m.baseline || edits.length
        ? this.asking
          ? html`<div class="confirm">
              Forget this scene's edits and baseline? The code stays as it is, and proposals and reviews are kept.
              <div class="actions">
                <button class="btn primary" @click=${this.accept}><n-icon name="check"></n-icon>Accept and clear</button>
                <button class="btn" @click=${() => (this.asking = false)}>Keep them</button>
              </div>
            </div>`
          : html`<div class="actions" style="margin-top:12px">
              <button class="btn primary" @click=${() => (this.asking = true)}><n-icon name="check"></n-icon>Accept and clear</button>
            </div>`
        : nothing}
    `;
  }

  async discard(key) {
    await discardEdit(this.model, key);
    this.requestUpdate();
  }

  accept = async () => {
    await acceptAndClear(this.model);
    this.asking = false;
    this.requestUpdate();
  };
}

customElements.define("changes-panel", ChangesPanel);
