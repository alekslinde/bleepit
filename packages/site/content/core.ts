// The @bleepit/core live demo. Imports the package by name, not by relative
// path into another package's src — the site depends on core as a workspace
// dependency, so the demo exercises the same entry point a user installs.
import { ProfanityChecker } from "@bleepit/core";
import { $, area, input } from "../dom.js";

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

/** Wires the core demo. No-op if the section is absent from the page. */
export function initCoreDemo(): void {
  if (!document.getElementById("demo-input")) return;

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

  readOptions();
  render();
}
