// The review's side panel, on the same ReviewSession as the review screen: what the agent says,
// your choice and notes, the verdict, and removing the proposal. The review is saved beside the
// proposal, where the agent reads it with `nursery proposals`.
import { act } from "../ui/action.js";
import { css, html, LitElement, nothing } from "../ui/lit.js";
import { shared } from "../ui/shared.js";

export class ReviewPanel extends LitElement {
  static properties = { session: { attribute: false }, removing: { state: true } };

  static styles = [
    shared,
    css`
      :host {
        display: block;
        padding: var(--space-4);
      }
      section {
        display: grid;
        gap: var(--space-2);
        margin-bottom: var(--space-5);
      }
      .agent {
        padding: var(--space-3);
        border-radius: var(--radius-md);
        background: var(--surface-2);
        white-space: pre-wrap;
      }
      .error {
        color: var(--danger);
      }
      label.choice {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-2) var(--space-3);
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        cursor: pointer;
      }
      textarea {
        min-height: 110px;
        padding: var(--space-2) var(--space-3);
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        background: var(--surface);
        color: var(--text);
        font: inherit;
        resize: vertical;
      }
      .verdict {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--space-2);
      }
      .saved {
        color: var(--muted);
        font-size: var(--text-sm);
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

  constructor() {
    super();
    this.onChange = () => this.requestUpdate();
  }

  willUpdate(changed) {
    if (changed.has("session")) {
      changed.get("session")?.removeEventListener("change", this.onChange);
      this.session?.addEventListener("change", this.onChange);
      this.removing = false;
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.session?.removeEventListener("change", this.onChange);
  }

  render() {
    const s = this.session;
    if (!s) return html``;
    const p = s.proposal;
    const r = p.review;
    const choose = (title) => () => {
      s.choice = title;
      s.changed();
    };
    return html`
      <section>
        <span class="eyebrow">From the agent</span>
        <div class="agent">${p.spec?.notes ?? "No notes."}</div>
        ${p.warning ? html`<div class="error">${p.warning}</div>` : nothing}
      </section>
      <section>
        <span class="eyebrow">Your choice</span>
        ${s.variants.map(
          (v) => html`<label class="choice"><input type="radio" name="v" .checked=${s.choice === v.title} @change=${choose(v.title)} /> Variant ${v.title}</label>`,
        )}
        <label class="choice"><input type="radio" name="v" .checked=${s.choice === ""} @change=${choose("")} /> None of these</label>
      </section>
      <section>
        <span class="eyebrow">Notes for the agent</span>
        <textarea
          placeholder="What to keep, what to change"
          .value=${s.notes}
          @input=${(e) => {
            s.notes = e.target.value;
          }}
        ></textarea>
        ${s.chosen
          ? html`<button class="btn" @click=${() => act(this, "edit", { sid: p.sid, name: s.chosen.name, f: s.frameOf(s.chosen) })}>
              <n-icon name="pencil"></n-icon>Edit pixels on this frame
            </button>`
          : nothing}
      </section>
      <section class="verdict">
        <button class="btn block" ?disabled=${s.saving} @click=${() => s.verdict("changes")}>
          <n-icon name="message-square"></n-icon>Ask for changes
        </button>
        <button class="btn primary block" ?disabled=${s.saving || !s.chosen} @click=${() => s.verdict("approve")}>
          <n-icon name="check"></n-icon>${s.chosen ? `Approve ${s.chosen.title}` : "Choose to approve"}
        </button>
      </section>
      <section>
        <span class="saved">
          ${r
            ? `You ${r.verdict === "approve" ? `approved ${r.choice}` : "asked for changes"} on ${r.reviewed.slice(0, 16).replace("T", " ")}${
                r.mtime < p.info.mtime ? "; the agent has revised it since." : "."
              }`
            : "Not reviewed yet."}
        </span>
      </section>
      <section>
        ${this.removing
          ? html`<div class="confirm">
              Remove this proposal with its review and pixel edits? The code stays as it is${p.state === "approved"
                ? ", and this approved design is not built yet, so it would be lost"
                : ""}.
              <div class="verdict">
                <button class="btn primary" @click=${this.removeProposal}><n-icon name="trash-2"></n-icon>Remove</button>
                <button class="btn" @click=${() => (this.removing = false)}>Keep it</button>
              </div>
            </div>`
          : html`<button class="btn ghost" @click=${() => (this.removing = true)}><n-icon name="trash-2"></n-icon>Remove proposal</button>`}
      </section>
    `;
  }

  // Not named remove: that is every element's own method, which Lit calls to take the panel off
  // the page.
  removeProposal = async () => {
    await this.session.removeProposal();
    act(this, "close-review");
    act(this, "proposals-changed");
  };
}

customElements.define("review-panel", ReviewPanel);
