import { ProfanityChecker, createChecker } from "./checker.js";
import type { CheckerOptions, Match } from "./types.js";

export { ProfanityChecker, createChecker };
export type { CheckerOptions, Match };
export { LANGUAGES, WORDLISTS } from "./lists/index.js";

/** Shared default instance (English). Prefer `createChecker()` for isolation. */
export const checker = new ProfanityChecker();

/** Fast boolean check with the default instance. */
export function isProfane(text: string): boolean {
  return checker.isProfane(text);
}

/** Find matches with the default instance. */
export function find(text: string): Match[] {
  return checker.find(text);
}

/** Censor with the default instance. */
export function censor(text: string, mask = "*"): string {
  return checker.censor(text, mask);
}

export type { NormalizeOptions } from "./types.js";
