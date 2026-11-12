// The scene's elements by group, in the side panel. A row opens in place to show every pose in
// day and night, its facts and the line of code that draws it, with the way into the editor. The
// list is filtered as you type. Poses the studio draws that the catalogue's element list does not
// name are grouped last, so nothing goes missing unnoticed.
import { act } from "../ui/action.js";
import { css, html, LitElement, nothing, repeat } from "../ui/lit.js";
import { shared } from "../ui/shared.js";

export class ElementList extends LitElement {
  static properties = {
    model: { attribute: false },
    version: { type: Number },
    selected: {},
    filter: { state: true },
    closed: { state: true },
  };

  static styles = [
    shared,
    css`
      :host {
        display: block;
      }
      .tools {
        position: sticky;
        top: 0;
        z-index: 2;
        display: flex;
        gap: var(--space-2);
        padding: var(--space-3) var(--space-4);
        background: var(--surface);
        border-bottom: 1px solid var(--border);
      }
      .search {
        flex: 1;
        display: flex;
        align-items: center;
        gap: var(--space-2);
        height: 30px;
        padding: 0 var(--space-2);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: var(--surface-2);
        color: var(--muted);
      }
      .search input {
        flex: 1;
        min-width: 0;
        border: 0;
        outline: 0;
        background: transparent;
        color: var(--text);
        font: inherit;
      }
      .notice {
        display: flex;
        gap: var(--space-2);
        margin: var(--space-3) var(--space-4) 0;
        padding: var(--space-2) var(--space-3);
        border-radius: var(--radius-md);
        background: var(--warn-weak);
        color: var(--warn);
        font-size: var(--text-sm);
      }
      .notice.bad {
        background: var(--danger-weak);
        color: var(--danger);
      }
      .group-head {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        width: 100%;
        padding: var(--space-3) var(--space-4) var(--space-1);
        border: 0;
        background: none;
        color: var(--muted);
        font: inherit;
        font-size: var(--text-xs);
        font-weight: 650;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        cursor: pointer;
      }
      .group-head .count {
        color: var(--faint);
      }
      .row {
        display: grid;
        grid-template-columns: 48px 1fr auto;
        align-items: center;
        gap: var(--space-3);
        width: 100%;
        padding: 6px var(--space-4);
        border: 0;
        border-left: 2px solid transparent;
        background: none;
        color: inherit;
        font: inherit;
        text-align: left;
        cursor: pointer;
      }
      .row:hover {
        background: var(--surface-2);
      }
      .row[aria-expanded="true"] {
        border-left-color: var(--accent);
        background: var(--surface-2);
      }
      .thumb {
        display: grid;
        place-items: center;
        width: 48px;
        height: 40px;
        overflow: hidden;
      }
      .name {
        font-weight: 550;
      }
      .facts {
        color: var(--muted);
        font-size: var(--text-sm);
      }
      .detail {
        display: grid;
        gap: var(--space-3);
        padding: var(--space-2) var(--space-4) var(--space-4) calc(var(--space-4) + 2px);
        background: var(--surface-2);
        border-bottom: 1px solid var(--border);
      }
      .poses {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: var(--space-3);
      }
      .pose {
        display: grid;
        gap: 4px;
        justify-items: start;
        padding: 0;
        border: 0;
        background: none;
        color: inherit;
        font: inherit;
        text-align: left;
        cursor: pointer;
      }
      .pose .pair {
        display: flex;
        gap: 4px;
      }
      .pose .caption {
        color: var(--muted);
        font-size: var(--text-sm);
      }
      .source {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: var(--muted);
        word-break: break-all;
      }
      .actions {
        display: flex;
        gap: var(--space-2);
        flex-wrap: wrap;
      }
      .loading {
        padding: var(--space-4);
        color: var(--muted);
      }
    `,
  ];

  constructor() {
    super();
    this.filter = "";
    this.closed = new Set();
  }

  render() {
    if (!this.model) return html`<p class="loading">Drawing the scene…</p>`;
    const match = (item) => !this.filter || item.label.toLowerCase().includes(this.filter.toLowerCase());
    const errors = this.model.errors;
    return html`
      <div class="tools">
        <label class="search">
          <n-icon name="search"></n-icon>
          <input placeholder="Filter elements" .value=${this.filter} @input=${(e) => (this.filter = e.target.value)} />
        </label>
      </div>
      ${
        errors.length
          ? html`<div class="notice bad">
            <n-icon name="circle-alert"></n-icon>
            <div>${errors.length} pose${errors.length > 1 ? "s" : ""} failed to draw: ${errors.join("; ")}</div>
          </div>`
          : nothing
      }
      ${this.model.groups.map((group) => {
        const items = group.items.filter(match);
        if (!items.length) return nothing;
        const open = !this.closed.has(group.id);
        const count = items.reduce((n, i) => n + (group.id === "unlisted" ? i.jobs.length : 1), 0);
        return html`
          <button class="group-head" @click=${() => this.toggle(group.id)}>
            <n-icon name=${open ? "chevron-down" : "chevron-right"} size="14"></n-icon>
            <n-icon name=${group.icon} size="14"></n-icon>
            ${group.title}<span class="count">${count}</span>
          </button>
          ${
            open
              ? repeat(
                  items,
                  (item) => item.id,
                  (item) => this.renderItem(item),
                )
              : nothing
          }
        `;
      })}
    `;
  }

  renderItem(item) {
    const open = this.selected === item.id;
    const first = item.jobs.find((j) => !j.error);
    return html`
      <button class="row" aria-expanded=${open} @click=${() => act(this, "select", { element: open ? null : item.id })}>
        <span class="thumb">${first ? html`<n-sprite .job=${first} fit="40"></n-sprite>` : nothing}</span>
        <span>
          <div class="name">${item.label}</div>
          <div class="facts">${item.jobs.length} pose${item.jobs.length > 1 ? "s" : ""} · ${item.facts[0]}</div>
        </span>
        ${item.family ? html`<span class="chip">${item.family.title}</span>` : nothing}
      </button>
      ${open ? this.renderDetail(item) : nothing}
    `;
  }

  renderDetail(item) {
    const edit = (job) => act(this, "edit", { sid: this.model.sid, name: job.name });
    return html`<div class="detail">
      <div class="poses">
        ${item.jobs.map(
          (job) => html`<button class="pose" title="Edit pixels" @click=${() => edit(job)}>
            <span class="pair">
              <n-sprite .job=${job} fit="72" theme="light"></n-sprite>
              ${job.themes?.includes("dark") ? html`<n-sprite .job=${job} fit="72" theme="dark"></n-sprite>` : nothing}
            </span>
            <span class="caption">
              ${job.title}${job.size ? ` · ${job.size[0]}×${job.size[1]}` : ""}${
                job.frames?.length > 1 ? ` · ${job.frames.length} frames` : ""
              }${job.same ? " · same by day and night" : ""}
            </span>
          </button>`,
        )}
      </div>
      <div class="facts">${item.facts.join(" · ")}</div>
      ${
        item.where
          ? html`<span class="source mono"
            ><n-icon name="code"></n-icon>${item.where.fn ? `${item.where.fn} · ` : ""}${item.where.path}${
              item.where.line ? `:${item.where.line}` : ""
            }</span
          >`
          : nothing
      }
      <div class="actions">
        <button class="btn primary" @click=${() => edit(item.jobs[0])}><n-icon name="pencil"></n-icon>Edit pixels</button>
        ${
          item.family
            ? html`<button class="btn" @click=${() => act(this, "family", { family: item.family.id })}>
              <n-icon name="users"></n-icon>${item.family.title} in every scene
            </button>`
            : nothing
        }
      </div>
    </div>`;
  }

  toggle(id) {
    const closed = new Set(this.closed);
    if (closed.has(id)) closed.delete(id);
    else closed.add(id);
    this.closed = closed;
  }
}

customElements.define("element-list", ElementList);
