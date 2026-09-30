// Shared DOM helpers. Kept separate from any one package's section so a new
// package's module can use them without importing that section's demo wiring.

export function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing element #${id}`);
  return el;
}

export function input(id: string): HTMLInputElement {
  return $(id) as HTMLInputElement;
}

export function area(id: string): HTMLTextAreaElement {
  return $(id) as HTMLTextAreaElement;
}

/**
 * Copies, then confirms on the element for a couple of seconds and puts it
 * back. Shared by the code-block buttons and the heading anchors: both write to
 * the clipboard and both have to survive a denied permission without claiming a
 * copy that did not happen.
 */
export function onCopyClick(
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
