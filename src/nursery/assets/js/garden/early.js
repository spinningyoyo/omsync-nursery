// The garden's first-paint script, and the one place that holds the day and night rule. A host
// loads it as a classic script in <head>, without defer or type="module", so it runs before the
// page is drawn and before any module. It defines window.nurseryEarly:
//
//   isNight(choice, hour)    true for "dark", and for "auto" from NIGHT_FROM to NIGHT_UNTIL
//   theme(key)               sets data-theme and data-theme-choice on <html> from the saved choice
//   scene(key, ids, { first })  the saved scene id if it is one of ids. Else ids[0], or a random id,
//                            saved under key, when first is "random".
//
// daylight.js applies the same rule after load, through isNight.
(() => {
  const NIGHT_FROM = 17;
  const NIGHT_UNTIL = 7;
  const CHOICES = ["light", "dark", "auto"];

  function read(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Storage is blocked: the value lasts for this page.
    }
  }

  const early = {
    CHOICES,

    isNight(choice, hour = new Date().getHours()) {
      return choice === "dark" || (choice === "auto" && (hour >= NIGHT_FROM || hour < NIGHT_UNTIL));
    },

    theme(key) {
      const saved = read(key);
      const choice = CHOICES.includes(saved) ? saved : "auto";
      document.documentElement.setAttribute("data-theme", early.isNight(choice) ? "dark" : "light");
      document.documentElement.dataset.themeChoice = choice;
    },

    scene(key, ids, { first = "first" } = {}) {
      const saved = read(key);
      if (ids.includes(saved)) return saved;
      if (first !== "random") return ids[0];
      const id = ids[Math.floor(Math.random() * ids.length)];
      write(key, id);
      return id;
    },
  };

  window.nurseryEarly = early;
})();
