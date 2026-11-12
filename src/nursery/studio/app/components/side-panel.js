// The right column. It scrolls on its own, so the centre never moves. Browsing, it holds four
// tabs (Elements, Inbox, Changes, Rules); editing, it holds the palette and Save; reviewing, the
// verdict.
import { act } from "../ui/action.js";
import { css, html, LitElement, nothing } from "../ui/lit.js";
import { shared } from "../ui/shared.js";

const TABS = [
  { id: "elements", label: "Elements", icon: "trees" },
  { id: "inbox", label: "Inbox", icon: "inbox" },
  { id: "changes", label: "Changes", icon: "git-compare" },
  { id: "rules", label: "Rules", icon: "list-checks" },
];

export class SidePanel extends LitElement {
  static properties = {
    mode: {},
    tab: {},
    model: { attribute: false },
    scenes: { attribute: false },
    inbox: { attribute: false },
    selected: {},
    proposal: { attribute: false },
    editor: { attribute: false },
    review: { attribute: false },
    version: { type: Number },
  };

  static styles = [
    shared,
    css`
      :host {
        display: grid;
        grid-template-rows: auto 1fr;
        grid-template-columns: minmax(0, 1fr);
        min-height: 0;
        min-width: 0;
        overflow: hidden;
        border-left: 1px solid var(--border);
        background: var(--surface);
      }
      nav {
        display: flex;
        gap: 2px;
        padding: var(--space-2) var(--space-2) 0;
        border-bottom: 1px solid var(--border);
      }
      nav button {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        height: 36px;
        padding: 0 var(--space-2);
        border: 0;
        border-bottom: 2px solid transparent;
        background: none;
        color: var(--muted);
        font: inherit;
        font-weight: 550;
        cursor: pointer;
      }
      nav button[aria-selected="true"] {
        border-bottom-color: var(--accent);
        color: var(--text);
      }
      nav .badge {
        height: 16px;
        min-width: 16px;
      }
      .scroll {
        min-height: 0;
        overflow-y: auto;
      }
      .mode-head {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        height: 44px;
        padding: 0 var(--space-4);
        border-bottom: 1px solid var(--border);
        font-weight: 600;
      }
    `,
  ];

  render() {
    if (this.mode === "editor") {
      return html`<div class="mode-head"><n-icon name="palette"></n-icon>Palette</div>
        <editor-panel class="scroll" .state=${this.editor}></editor-panel>`;
    }
    if (this.mode === "review") {
      return html`<div class="mode-head"><n-icon name="message-square"></n-icon>Your review</div>
        <review-panel class="scroll" .session=${this.review}></review-panel>`;
    }
    const waiting = (this.inbox ?? []).filter((p) => p.state === "waiting").length;
    return html`
      <nav role="tablist">
        ${TABS.map(
          (
            t,
          ) => html`<button role="tab" aria-selected=${this.tab === t.id} @click=${() => act(this, "tab", { tab: t.id })}>
            <n-icon name=${t.icon}></n-icon>${t.label}
            ${t.id === "inbox" && waiting ? html`<span class="badge count">${waiting}</span>` : nothing}
          </button>`,
        )}
      </nav>
      <div class="scroll">${this.renderTab()}</div>
    `;
  }

  renderTab() {
    switch (this.tab) {
      case "inbox":
        return html`<inbox-panel .version=${this.version} .proposals=${this.inbox} .scenes=${this.scenes} .open=${this.proposal ? `${this.proposal.sid}/${this.proposal.name}` : null}></inbox-panel>`;
      case "changes":
        return html`<changes-panel .model=${this.model} .version=${this.version}></changes-panel>`;
      case "rules":
        return html`<rules-panel .model=${this.model} .version=${this.version}></rules-panel>`;
      default:
        return html`<element-list .model=${this.model} .selected=${this.selected} .version=${this.version}></element-list>`;
    }
  }
}

customElements.define("side-panel", SidePanel);
