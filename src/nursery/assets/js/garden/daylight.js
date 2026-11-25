// Day and night for the host page, after load. The choice is light, dark or auto, and the rule is
// early.js's, which the host loads in <head>. The engine and the scene colours read the result from
// data-theme on <html> ("dark" is night). The choice is on <html data-theme-choice> and in
// localStorage under the host's key.

export const CLOCK_MS = 60_000; // how often auto looks at the clock

function early() {
  if (!window.nurseryEarly) throw new Error("load garden/early.js in <head> before garden/daylight.js");
  return window.nurseryEarly;
}

export class Daylight {
  constructor({ key }) {
    this.key = key;
  }

  choice() {
    const choice = document.documentElement.dataset.themeChoice;
    return early().CHOICES.includes(choice) ? choice : "auto";
  }

  // Returns true when the page changed between day and night.
  choose(choice) {
    document.documentElement.dataset.themeChoice = choice;
    try {
      localStorage.setItem(this.key, choice);
    } catch {
      // Storage is blocked: the choice lasts for this page.
    }
    return this.apply();
  }

  // Returns true when the page changed between day and night.
  apply() {
    const theme = early().isNight(this.choice()) ? "dark" : "light";
    const root = document.documentElement;
    if (root.getAttribute("data-theme") === theme) return false;
    root.setAttribute("data-theme", theme);
    return true;
  }

  // Applies the clock every CLOCK_MS, and calls onChange when day turns to night or back.
  start(onChange = () => {}) {
    this.stop();
    this.clock = setInterval(() => {
      if (this.apply()) onChange();
    }, CLOCK_MS);
  }

  stop() {
    clearInterval(this.clock);
  }
}
