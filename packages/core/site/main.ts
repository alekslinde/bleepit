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
let themingOff: number | undefined;

document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
  button.addEventListener("click", () => {
    const dark = matchMedia("(prefers-color-scheme: dark)").matches;
    const current = document.documentElement.dataset.theme ?? (dark ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";

    // Colours only animate while this class is set, so the switch eases but
    // hover and focus stay instant. Removing it after the transition keeps the
    // rule off everything else.
    const root = document.documentElement;
    root.classList.add("theming");
    clearTimeout(themingOff);
    themingOff = window.setTimeout(() => root.classList.remove("theming"), 250);

    root.dataset.theme = next;
    try {
      localStorage.setItem("bleepit-theme", next);
    } catch {
      // Private mode — the toggle still works for this page view.
    }
  });
});

// Copy-to-clipboard on every code block. Injected rather than written into the
// HTML so the markup stays one <pre> per snippet, and so a visitor without the
// bundle (or without clipboard access) sees plain, selectable code instead of a
// dead button.
//
// `text` is read at click time, not now: for the package-manager tabs the
// snippet depends on which tab is selected when the button is pressed.
// Copies, then confirms on the element for a couple of seconds and puts it
// back. Shared by the code-block buttons and the heading anchors: both write to
// the clipboard and both have to survive a denied permission without claiming a
// copy that did not happen.
function onCopyClick(
  el: HTMLElement,
  text: () => string,
  confirm: (copied: boolean) => void,
): void {
  let reset: number | undefined;
  el.addEventListener("click", async (event) => {
    // A heading anchor is a real link, so a modified click (new tab) and the
    // context menu still behave; only a plain click is taken over.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();

    try {
      await navigator.clipboard.writeText(text());
    } catch {
      // Denied permission or an insecure context — say nothing rather than
      // claiming a copy that did not happen.
      return;
    }
    confirm(true);
    clearTimeout(reset);
    reset = window.setTimeout(() => confirm(false), 2000);
  });
}

function copyButton(text: () => string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "code-copy";
  button.textContent = "Copy";
  onCopyClick(button, text, (copied) => {
    button.textContent = copied ? "Copied" : "Copy";
  });
  return button;
}

if (navigator.clipboard) {
  // One button per tab group, copying whichever command is on show. The panels
  // are skipped below so they do not also get one each.
  //
  // The button goes beside the radio group, never inside it: a <button> among
  // the options is announced as one of them, reading as a fifth package
  // manager.
  document.querySelectorAll(".pm-tabs").forEach((tabs) => {
    const group = tabs.querySelector('[role="radiogroup"]');
    if (!group) return;

    const visible = () =>
      Array.from(tabs.querySelectorAll<HTMLPreElement>(".pm-panel")).find(
        (panel) => panel.offsetParent !== null,
      );

    const row = document.createElement("div");
    row.className = "pm-bar";
    group.replaceWith(row);
    row.append(group, copyButton(() => visible()?.textContent ?? ""));
  });

  document.querySelectorAll("pre > code").forEach((code) => {
    const pre = code.parentElement as HTMLPreElement;
    if (pre.classList.contains("pm-panel")) return;

    // The button goes above the block, not over it: a <pre> scrolls
    // horizontally, so anything anchored inside it either scrolls away or sits
    // on top of the code.
    const figure = document.createElement("div");
    figure.className = "code-figure";
    pre.replaceWith(figure);
    figure.append(pre, copyButton(() => code.textContent ?? ""));
  });
}

// A copyable link on every section heading. Injected rather than written into
// the HTML so the markup stays one heading per section, and so a visitor
// without the bundle sees plain headings instead of dead "#" glyphs.
//
// An h2's target is its enclosing <section>, which already carries the id the
// nav links to; an h3 carries its own. A heading with neither is skipped rather
// than given a generated id — a slug derived from the text would change
// whenever the wording did, quietly breaking every link already shared.
document.querySelectorAll<HTMLElement>("main :is(h2, h3)").forEach((heading) => {
  const id = heading.id || heading.closest("section")?.id;
  if (!id) return;

  const link = document.createElement("a");
  link.className = "heading-anchor";
  link.href = `#${id}`;
  link.textContent = "#";
  // The glyph alone reads as punctuation; the label names what the link is for
  // and which heading it belongs to.
  link.setAttribute("aria-label", `Copy link to ${heading.textContent?.trim()}`);

  if (navigator.clipboard) {
    onCopyClick(
      link,
      () => new URL(`#${id}`, location.href).href,
      (copied) => {
        link.textContent = copied ? "✓" : "#";
        link.dataset.copied = String(copied);
        // The address bar follows the copied link, so a reload or a later
        // share from the browser's own UI lands in the same place.
        if (copied) history.replaceState(null, "", `#${id}`);
      },
    );
  }

  heading.appendChild(link);
});

readOptions();
render();
