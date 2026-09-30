import { ProfanityChecker } from "../src/index.js";

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing element #${id}`);
  return el;
}

function input(id: string): HTMLInputElement {
  return $(id) as HTMLInputElement;
}

function area(id: string): HTMLTextAreaElement {
  return $(id) as HTMLTextAreaElement;
}

const PRESETS: Record<string, string> = {
  clean:
    "The class discussed the Scunthorpe problem and nobody was offended.",
  profane: "He called me an arse and a douche. Utter bollocks.",
  // Separators, elongation and leet in one line, so the demo shows all three
  // normalization paths rather than claiming them.
  obfuscated: "He called me an a.r.s.e and a d0uchhhhe. Utter b0ll0cks.",
  multilingual: "¡Hostia! Quel bordel! Ach, kacken. Cabrón.",
};

let checker = new ProfanityChecker();

function readOptions(): void {
  const languages = ["en", "es", "fr", "de"].filter((l) => input(`lang-${l}`).checked);
  checker = new ProfanityChecker({
    languages,
    wholeWord: input("opt-whole").checked,
    leet: input("opt-leet").checked,
    stripDiacritics: input("opt-diacritics").checked,
  });
}

function render(): void {
  const text = area("demo-input").value;
  const mask = input("opt-mask").value || "*";
  const t0 = performance.now();
  const matches = checker.find(text);
  const ms = performance.now() - t0;

  const verdict = $("demo-verdict");
  verdict.textContent = matches.length > 0 ? "PROFANE" : "CLEAN";
  verdict.dataset.state = matches.length > 0 ? "bad" : "good";

  $("demo-count").textContent =
    `${matches.length} match${matches.length === 1 ? "" : "es"} · ${ms.toFixed(2)} ms · ${checker.size} patterns`;

  const body = $("demo-rows");
  body.replaceChildren();
  for (const m of matches) {
    const tr = document.createElement("tr");
    for (const cell of [m.word, String(m.start), String(m.end)]) {
      const td = document.createElement("td");
      td.textContent = cell;
      tr.appendChild(td);
    }
    body.appendChild(tr);
  }
  if (matches.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 3;
    td.textContent = "—";
    tr.appendChild(td);
    body.appendChild(tr);
  }

  $("demo-censored").textContent = checker.censor(text, mask[0] ?? "*");
}

for (const [name, text] of Object.entries(PRESETS)) {
  $(`preset-${name}`).addEventListener("click", () => {
    area("demo-input").value = text;
    render();
  });
}

for (const id of [
  "lang-en",
  "lang-es",
  "lang-fr",
  "lang-de",
  "opt-whole",
  "opt-leet",
  "opt-diacritics",
]) {
  input(id).addEventListener("change", () => {
    readOptions();
    render();
  });
}
input("opt-mask").addEventListener("input", render);
area("demo-input").addEventListener("input", render);

// The inline head script has already applied any stored choice; this only
// handles switching it afterwards. Reading the computed state rather than the
// attribute means the first click flips away from the OS preference, instead
// of setting the theme the user is already looking at.
//
// Two buttons carry this — one per nav presentation — so it binds by attribute
// rather than id.
document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
  button.addEventListener("click", (event) => {
    // The mobile copy sits inside the menu's <summary>, where a bare click
    // would also toggle the disclosure. Theme and menu stay independent.
    event.preventDefault();
    const dark = matchMedia("(prefers-color-scheme: dark)").matches;
    const current = document.documentElement.dataset.theme ?? (dark ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("bleepit-theme", next);
    } catch {
      // Private mode — the toggle still works for this page view.
    }
  });
});

// Close the mobile menu once a link is taken. Without this the panel stays open
// over the section it just scrolled to. Same-page anchors do not reload, so
// nothing else would close it.
const navMenu = $("nav-menu") as HTMLDetailsElement;
navMenu.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    navMenu.open = false;
  });
});

// Widening past the breakpoint hides the whole disclosure, but `open` would
// survive it — so a rotate back to portrait would reveal a panel the visitor
// never opened. Collapse it when the inline nav takes over.
const wide = matchMedia("(min-width: 40rem)");
wide.addEventListener("change", (e) => {
  if (e.matches) navMenu.open = false;
});

// Copy-to-clipboard on every code block. Injected rather than written into the
// HTML so the markup stays one <pre> per snippet, and so a visitor without the
// bundle (or without clipboard access) sees plain, selectable code instead of a
// dead button.
if (navigator.clipboard) {
  document.querySelectorAll("pre > code").forEach((code) => {
    const pre = code.parentElement as HTMLPreElement;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "code-copy";
    button.textContent = "Copy";

    let reset: number | undefined;
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(code.textContent ?? "");
      } catch {
        // Denied permission or an insecure context — say nothing rather than
        // claiming a copy that did not happen.
        return;
      }
      button.textContent = "Copied";
      clearTimeout(reset);
      reset = window.setTimeout(() => {
        button.textContent = "Copy";
      }, 2000);
    });

    // The button goes above the block, not over it: a <pre> scrolls
    // horizontally, so anything anchored inside it either scrolls away or sits
    // on top of the code.
    const figure = document.createElement("div");
    figure.className = "code-figure";
    pre.replaceWith(figure);
    figure.append(pre, button);
  });
}

readOptions();
render();
