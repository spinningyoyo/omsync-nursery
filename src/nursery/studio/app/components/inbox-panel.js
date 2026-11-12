// Every proposal from every scene in one place, by state: waiting for you (new, or revised since
// your review), changes asked, approved but not built yet, and built (the code now draws the
// chosen variant). Approved-not-built is its own state, so clearing built proposals never loses
// a design that is not in the code yet.
import { removeProposals } from "../services/review.js";
import { SceneModel, STATES } from "../services/scene-model.js";
import { act } from "../ui/action.js";
import { css, html, LitElement, nothing } from "../ui/lit.js";
import { shared } from "../ui/shared.js";

const ORDER = ["waiting", "changes", "approved", "built"];

export class InboxPanel extends LitElement {
  static properties = {
    proposals: { attribute: false },
    scenes: { attribute: false },
    open: {},
    version: { type: Number },
  };

  static styles = [
    shared,
    css`
      :host {
        display: block;
        padding-bottom: var(--space-4);
      }
      h3 {
        margin: var(--space-4) var(--space-4) var(--space-2);
      }
      .card {
        display: grid;
        grid-template-columns: 56px 1fr;
        gap: var(--space-3);
        width: calc(100% - 2 * var(--space-4));
        margin: 0 var(--space-4) var(--space-2);
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
      .card[aria-current="true"] {
        border-color: var(--accent);
        box-shadow: 0 0 0 1px var(--accent);
      }
      .title {
        font-weight: 600;
      }
      .meta {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;
        margin-top: 4px;
        color: var(--muted);
        font-size: var(--text-sm);
      }
      .error {
        color: var(--danger);
        font-size: var(--text-sm);
      }
      .empty {
        padding: var(--space-4);
        color: var(--muted);
      }
      .footer {
        display: flex;
        gap: var(--space-2);
        padding: var(--space-2) var(--space-4);
      }
    `,
  ];

  render() {
    const list = this.proposals;
    if (!list) return html`<p class="empty">Reading the proposals…</p>`;
    if (!list.length) {
      return html`<p class="empty">
        No proposals. Agents post new or changed art here for your review (the nursery-scene skill
        documents how).
      </p>`;
    }
    const label = (sid) => this.scenes?.find((s) => s.id === sid)?.label ?? sid;
    const built = list.filter((p) => p.state === "built");
    return html`
      ${ORDER.map((state) => {
        const items = list.filter((p) => p.state === state);
        if (!items.length) return nothing;
        const s = STATES[state];
        return html`
          <h3 class="eyebrow">${s.label} · ${items.length}</h3>
          ${items.map((p) => {
            const lead = p.variants.find((v) => !v.error);
            const revised = p.review && p.review.mtime < p.info.mtime;
            return html`<button
              class="card"
              aria-current=${this.open === `${p.sid}/${p.name}`}
              @click=${() => act(this, "review", { sid: p.sid, proposal: p.name })}
            >
              ${lead ? html`<n-sprite .job=${lead} fit="48"></n-sprite>` : html`<span></span>`}
              <span>
                <div class="title">${p.spec?.title ?? p.name}</div>
                <div class="meta">
                  <span class="badge ${s.tone}"><n-icon name=${s.icon} size="12"></n-icon>${revised ? "Revised" : s.label}</span>
                  ${label(p.sid)} · rev ${p.spec?.revision ?? 1} · ${p.variants.length} variant${p.variants.length > 1 ? "s" : ""}
                </div>
                ${p.error ? html`<div class="error">${p.error}</div>` : nothing}
              </span>
            </button>`;
          })}
        `;
      })}
      ${
        built.length
          ? html`<div class="footer">
            <button class="btn" @click=${() => this.clearBuilt(built)}><n-icon name="trash-2"></n-icon>Clear ${built.length} built</button>
          </div>`
          : nothing
      }
    `;
  }

  // Built proposals are in the code already, so clearing them loses nothing.
  async clearBuilt(built) {
    const bySid = Object.groupBy(built, (p) => p.sid);
    for (const [sid, list] of Object.entries(bySid)) await removeProposals(await SceneModel.load(sid), list);
    act(this, "proposals-changed");
  }
}

customElements.define("inbox-panel", InboxPanel);
