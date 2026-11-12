// <nursery-app>: the studio's shell and its only owner of state. The layout is fixed: a bar on
// top, the scene rail on the left, the centre (one view at a time, never scrolled away) and the
// side panel on the right, which scrolls on its own. Children send actions (ui/action.js); this
// turns them into state and passes it back down.
//
// It owns the scene's model (services/scene-model.js), the editing and review sessions, every
// scene's proposals for the inbox, and keeping current: when the code on disk changes it reloads
// itself where you were (or waits while you have unsaved edits), and when an agent posts or
// revises a proposal it reads it again.
import { api } from "../services/api.js";
import { EditorSession } from "../services/editor-session.js";
import { ReviewSession } from "../services/review-session.js";
import { SceneModel, SCENES, sceneById } from "../services/scene-model.js";
import { watch } from "../services/watch.js";
import { css, html, LitElement } from "../ui/lit.js";
import { shared } from "../ui/shared.js";

const recall = (store, key, fallback) => {
  try {
    return JSON.parse(store.getItem(`nursery-${key}`)) ?? fallback;
  } catch {
    return fallback;
  }
};
const keep = (store, key, value) => {
  try {
    store.setItem(`nursery-${key}`, JSON.stringify(value));
  } catch {
    // Storage blocked: the choice lasts for this page.
  }
};

// Actions that leave the editor, so wait on the unsaved-edits choice while it holds edits.
const EXITS = new Set(["close-editor", "scene", "view", "tab", "family", "review", "reload"]);

export class NurseryApp extends LitElement {
  static properties = {
    sid: { state: true },
    model: { state: true },
    view: { state: true }, // scene | board | family | icons | editor | review
    tab: { state: true }, // elements | inbox | changes | rules
    theme: { state: true },
    selected: { state: true },
    editor: { state: true },
    review: { state: true },
    family: { state: true },
    inbox: { state: true },
    stale: { state: true },
    version: { state: true },
    pending: { state: true }, // an exit from a dirty editor, waiting on the unsaved-edits choice
  };

  static styles = [
    shared,
    css`
      :host {
        display: grid;
        grid-template-rows: var(--bar-height) 1fr;
        height: 100vh;
        overflow: hidden;
      }
      .body {
        display: grid;
        grid-template-columns: var(--rail-width) minmax(0, 1fr) var(--panel-width);
        overflow: hidden;
        min-height: 0;
      }
      .center {
        display: grid;
        min-height: 0;
        min-width: 0;
      }
      .center > * {
        min-height: 0;
      }
      .loading {
        display: grid;
        place-items: center;
        color: var(--muted);
      }
    `,
  ];

  constructor() {
    super();
    // Where you were before a reload: kept for this tab only.
    const was = recall(sessionStorage, "where", {});
    const known = (sid) => SCENES.some((s) => s.id === sid);
    this.sid = known(location.hash.slice(1)) ? location.hash.slice(1) : known(was.sid) ? was.sid : recall(localStorage, "scene", SCENES[0].id);
    if (!known(this.sid)) this.sid = SCENES[0].id;
    this.view = ["scene", "board", "family", "icons"].includes(was.view) ? was.view : "scene";
    this.tab = was.tab ?? "elements";
    this.selected = was.selected ?? null;
    this.family = was.family ?? "dogs";
    this.reopen = was.edit ?? (was.review ? { review: was.review } : null);
    this.theme = recall(localStorage, "theme", matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    this.version = 0;
    this.addEventListener("studio-action", (e) => this.handle(e.detail));
    // Closing or reloading the window with unsaved edits asks first. The app's own reload() is
    // reached only once nothing is at stake, so it switches the guard off.
    this.onUnload = (e) => {
      if (this.reloading || !this.editor?.dirty()) return;
      e.preventDefault();
      e.returnValue = "";
    };
  }

  connectedCallback() {
    super.connectedCallback();
    this.watcher = watch({
      onCode: () => {
        if (this.editor?.dirty()) this.stale = true;
        else this.reload();
      },
      onProposals: () => this.loadInbox(),
    });
    this.loadInbox();
    window.addEventListener("beforeunload", this.onUnload);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("beforeunload", this.onUnload);
    clearInterval(this.watcher);
  }

  willUpdate(changed) {
    document.documentElement.dataset.theme = this.theme;
    // The scene's backdrop and tint colours (css/scenes.css) key on these attributes; custom
    // properties inherit into every component's shadow root.
    document.body.dataset.scene = this.sid;
    document.documentElement.dataset.tint = this.sid;
    if (changed.has("sid")) {
      history.replaceState(null, "", `#${this.sid}`);
      keep(localStorage, "scene", this.sid);
      this.loadModel();
    }
  }

  async loadModel() {
    const sid = this.sid;
    if (this.model?.sid !== sid) this.model = null;
    const model = await SceneModel.load(sid);
    if (this.sid !== sid) return;
    this.model = model;
    if (this.reopen) {
      const again = this.reopen;
      this.reopen = null;
      if (again.review) this.handle({ type: "review", ...again.review });
      else this.handle({ type: "edit", ...again });
    }
  }

  // Every scene's proposals, for the inbox and the rail's counts: each scene with any is loaded
  // and its saved work read again.
  async loadInbox() {
    let all;
    try {
      all = await api("GET", "/api/proposals");
    } catch {
      return;
    }
    const list = [];
    for (const [sid, proposals] of Object.entries(all)) {
      if (!proposals.length && sid !== this.sid) continue;
      const model = await SceneModel.load(sid);
      await model.refresh();
      list.push(...model.proposals);
    }
    this.inbox = list;
    if (this.review) {
      const now = this.review.model.proposals.find((p) => p.name === this.review.proposal.name);
      if (now && now !== this.review.proposal && !this.review.saving) {
        this.review.proposal = now;
        this.review.changed();
      }
    }
    this.version += 1;
  }

  // Reloads the page where you are, so new code shows.
  reload() {
    this.reloading = true;
    keep(sessionStorage, "where", {
      sid: this.sid,
      view: this.view === "editor" ? this.editorReturn() : this.view === "review" ? (this.back ?? "scene") : this.view,
      tab: this.tab,
      selected: this.selected,
      family: this.family,
      edit: this.view === "editor" ? { sid: this.editor.model.sid, name: this.editor.job.name, f: this.editor.f } : null,
      review: this.view === "review" ? { sid: this.review.model.sid, proposal: this.review.proposal.name } : null,
    });
    location.reload();
  }

  // The view the editor goes back to: where it was opened from, or the review it came from.
  editorReturn() {
    if (this.editorBack === "review") return this.review ? "review" : (this.back ?? "scene");
    return this.editorBack ?? "scene";
  }

  // The one place that decides whether an exit from the editor may happen now. With unsaved edits
  // it waits in `pending`, the editor view shows its bar, and the choice arrives as "leave-editor".
  async handle(a) {
    if (a.type === "leave-editor") {
      const next = this.pending;
      this.pending = null;
      if (a.choice === "go" && next) await this.perform(next);
      return;
    }
    if (this.editor?.dirty() && EXITS.has(a.type)) {
      this.pending = a;
      return;
    }
    this.pending = null;
    await this.perform(a);
  }

  async perform(a) {
    switch (a.type) {
      case "scene":
        this.leaveEditor();
        this.sid = a.sid;
        this.selected = null;
        if (["editor", "review", "icons"].includes(this.view)) this.view = "scene";
        break;
      case "view":
        this.leaveEditor();
        this.view = a.view;
        break;
      case "tab":
        this.tab = a.tab;
        if (this.view === "editor") this.view = this.leaveEditor();
        else if (this.view === "review") this.view = this.back ?? "scene";
        break;
      case "theme":
        this.theme = a.theme;
        keep(localStorage, "theme", a.theme);
        break;
      case "select":
        this.selected = a.element;
        this.tab = "elements";
        break;
      case "edit": {
        const model = await SceneModel.load(a.sid ?? this.sid);
        const job = model.jobs.get(a.name);
        if (!job || job.error) return;
        // The editor returns to where it was opened from: a view, or a review.
        if (this.view !== "editor") this.editorBack = this.view;
        this.pending = null;
        // The mascot is not a scene: the scene on show stays where it is.
        if (sceneById(model.sid)) this.sid = model.sid;
        this.editor = new EditorSession(model, job, { theme: a.theme, f: a.f });
        this.view = "editor";
        break;
      }
      case "close-editor":
        this.view = this.leaveEditor();
        break;
      case "saved":
        if (this.editor?.job.proposal) this.loadInbox();
        this.version += 1;
        break;
      case "family":
        this.leaveEditor();
        this.family = a.family;
        this.view = "family";
        break;
      case "review": {
        const model = await SceneModel.load(a.sid);
        const proposal = model.proposals.find((p) => p.name === a.proposal);
        if (!proposal) return;
        if (this.view !== "review" && this.view !== "editor") this.back = this.view;
        this.editor = null;
        this.sid = model.sid;
        this.review = new ReviewSession(model, proposal);
        this.view = "review";
        break;
      }
      case "close-review":
        this.review = null;
        this.view = this.back ?? "scene";
        this.tab = "inbox";
        break;
      case "proposals-changed":
        await this.loadInbox();
        break;
      case "reload":
        this.reload();
        break;
    }
    // Code changed on disk while the editor held unsaved edits: now it is closed, show it.
    if (this.stale && !this.editor && EXITS.has(a.type) && a.type !== "reload") this.reload();
  }

  // Clears the editor session, whichever way it was left, and says where the editor goes back to.
  leaveEditor() {
    const back = this.editorReturn();
    this.editor = null;
    return back;
  }

  render() {
    const scene = SCENES.find((s) => s.id === this.sid);
    const waiting = (this.inbox ?? []).filter((p) => p.state === "waiting");
    const counts = {};
    for (const p of waiting) counts[p.sid] = (counts[p.sid] ?? 0) + 1;
    const mode = this.view === "editor" || this.view === "review" ? this.view : "browse";
    return html`
      <top-bar .view=${this.view} .heading=${scene.label} .theme=${this.theme} .inbox=${waiting.length} .stale=${this.stale}></top-bar>
      <div class="body">
        <scene-rail .scenes=${SCENES} .sid=${this.sid} .waiting=${counts}></scene-rail>
        <main class="center">${this.renderCenter()}</main>
        <side-panel
          .mode=${mode}
          .tab=${this.tab}
          .model=${this.model}
          .scenes=${SCENES}
          .inbox=${this.inbox}
          .selected=${this.selected}
          .proposal=${this.review?.proposal}
          .editor=${this.editor}
          .review=${this.review}
          .version=${this.version}
        ></side-panel>
      </div>
    `;
  }

  renderCenter() {
    switch (this.view) {
      case "board":
        return this.model
          ? html`<board-view .model=${this.model} .selected=${this.selected}></board-view>`
          : html`<div class="loading">Drawing the scene…</div>`;
      case "family":
        return html`<family-view .family=${this.family}></family-view>`;
      case "icons":
        return html`<icons-view .sid=${this.sid}></icons-view>`;
      case "editor":
        return html`<editor-view .session=${this.editor} .leaving=${Boolean(this.pending)}></editor-view>`;
      case "review":
        return html`<review-view .session=${this.review}></review-view>`;
      default:
        return html`<scene-view .sid=${this.sid}></scene-view>`;
    }
  }
}

customElements.define("nursery-app", NurseryApp);
