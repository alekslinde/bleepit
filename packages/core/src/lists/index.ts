import { de } from "./de.js";
import { en } from "./en.js";
import { es } from "./es.js";
import { fr } from "./fr.js";

/**
 * Built-in wordlists by language code.
 * Import individual lists for minimal bundles:
 * `import { es } from "@bleepit/core/lists"`.
 */
export const WORDLISTS: Record<string, string[]> = { en, es, fr, de };

export { de, en, es, fr };

/** Language codes shipped with the library. */
export const LANGUAGES = Object.keys(WORDLISTS);
