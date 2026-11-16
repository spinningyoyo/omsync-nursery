// The Nursery Studio. Run headless (?check= or ?render=, for `nursery check` and `nursery render`)
// it does its job and leaves the result in window.__result; otherwise it registers every
// component and the shell takes over.
import { runHeadless } from "./services/headless.js";

if (!(await runHeadless(new URLSearchParams(location.search)))) {
  await Promise.all([
    import("./ui/n-icon.js"),
    import("./ui/n-logo.js"),
    import("./ui/n-sprite.js"),
    import("./components/top-bar.js"),
    import("./components/scene-rail.js"),
    import("./components/scene-view.js"),
    import("./components/board-view.js"),
    import("./components/family-view.js"),
    import("./components/icons-view.js"),
    import("./components/frame-strip.js"),
    import("./components/editor-view.js"),
    import("./components/editor-panel.js"),
    import("./components/review-view.js"),
    import("./components/review-panel.js"),
    import("./components/element-list.js"),
    import("./components/inbox-panel.js"),
    import("./components/changes-panel.js"),
    import("./components/rules-panel.js"),
    import("./components/verify-view.js"),
    import("./components/verify-panel.js"),
    import("./components/side-panel.js"),
  ]);
  await import("./components/nursery-app.js");
  document.body.append(document.createElement("nursery-app"));
}
