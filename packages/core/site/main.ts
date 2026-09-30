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
$("theme-toggle").addEventListener("click", () => {
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

readOptions();
render();
