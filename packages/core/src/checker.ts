import { buildAutomaton, search, type Automaton } from "./automaton.js";
import { normalizePattern, normalizeText } from "./normalizer.js";
import type { CheckerOptions, Match, NormalizeOptions } from "./types.js";
import { en } from "./lists/en.js";
import { WORDLISTS } from "./lists/index.js";

const BOUNDARY_RE = /[\p{L}\p{N}]/u;

function charAt(text: string, offset: number): string {
  const cp = text.codePointAt(offset);
  return cp === undefined ? "" : String.fromCodePoint(cp);
}

/**
 * Lightweight, fast, language-agnostic profanity checker.
 *
 * - One O(n) scan per query, independent of dictionary size (Aho-Corasick).
 * - Unicode-aware: case, diacritics, leet-speak, separators (`f.u_c-k`),
 *   and elongations (`fuuuuck`) are normalized before matching.
 * - Isomorphic: no Node APIs — runs in Node, browsers, Deno, Bun, workers.
 *
 * @example
 * ```ts
  * import { ProfanityChecker } from "bleepit";
 *
 * const checker = new ProfanityChecker({ languages: ["en", "es"] });
 * checker.isProfane("What the f.u.c.k?!"); // true
 * checker.censor("You are a b1tch");       // "You are a *****"
 * ```
 */
export class ProfanityChecker {
  private auto: Automaton;
  private originals: string[];
  private whitelist: Set<string>;
  private readonly wholeWord: boolean;
  private readonly normOpts: NormalizeOptions;

  constructor(options: CheckerOptions = {}) {
    const {
      languages = ["en"],
      customWords = [],
      whitelist = [],
      wholeWord = true,
      leet,
      stripDiacritics,
    } = options;
    this.wholeWord = wholeWord;
    this.normOpts = {};
    if (leet !== undefined) this.normOpts.leet = leet;
    if (stripDiacritics !== undefined) {
      this.normOpts.stripDiacritics = stripDiacritics;
    }

    const dict = new Map<string, string>(); // normalized -> display
    const add = (w: string): void => {
      const n = normalizePattern(w, this.normOpts);
      if (n !== "" && !dict.has(n)) dict.set(n, n);
    };
    if (languages.includes("en")) en.forEach(add);
    for (const lang of languages) {
      if (lang === "en") continue;
      const list = WORDLISTS[lang];
      if (list) list.forEach(add);
    }
    customWords.forEach(add);

    this.originals = [...dict.keys()];
    this.auto = buildAutomaton(this.originals);
    this.whitelist = new Set(
      whitelist
        .map((w) => normalizePattern(w, this.normOpts))
        .filter((w) => w !== ""),
    );
  }

  /** Number of normalized patterns in the automaton. */
  get size(): number {
    return this.originals.length;
  }

  /** Fast boolean check. */
  isProfane(text: string): boolean {
    return this.find(text, 1).length > 0;
  }

  /** All matches with original-string offsets. */
  find(text: string, limit = Number.POSITIVE_INFINITY): Match[] {
    if (text === "") return [];
    const { norm, index, ends } = normalizeText(text, this.normOpts);
    if (norm === "") return [];
    const out: Match[] = [];
    const hits = search(
      this.auto,
      norm,
      limit,
      (start, end): boolean => {
        const oStart = index[start] as number;
        const oEnd = ends[end] as number;
        if (this.wholeWord && !this.checkBoundary(text, oStart, oEnd)) {
          return false;
        }
        if (this.whitelist.size > 0 && this.isWhitelisted(text, oStart, oEnd)) {
          return false;
        }
        return true;
      },
    );
    for (const { start, end, pat } of hits) {
      out.push({
        word: this.auto.words[pat] as string,
        start: index[start] as number,
        end: ends[end] as number,
      });
    }
    return out;
  }

  /**
 * Replace profane spans with `mask` (default `*`).
 * Whitespace inside a span is preserved for readability.
 */
  censor(text: string, mask = "*"): string {
    const matches = this.find(text);
    if (matches.length === 0) return text;
    const cps = Array.from(text);
    const offsets: number[] = [];
    let off = 0;
    for (const cp of cps) {
      offsets.push(off);
      off += cp.length;
    }
    const masked = new Array<boolean>(cps.length).fill(false);
    for (const m of matches) {
      for (let i = 0; i < cps.length; i++) {
        const o = offsets[i] as number;
        const w = (cps[i] as string).length;
        if (o >= m.start && o + w - 1 <= m.end && !/\s/.test(cps[i] as string)) {
          masked[i] = true;
        }
      }
    }
    return cps.map((cp, i) => (masked[i] === true ? mask : cp)).join("");
  }

  /** Add words (any language/script) and rebuild the automaton. */
  addWords(words: string[]): void {
    let changed = false;
    for (const w of words) {
      const n = normalizePattern(w, this.normOpts);
      if (n !== "" && !this.originals.includes(n)) {
        this.originals.push(n);
        changed = true;
      }
    }
    if (changed) this.auto = buildAutomaton(this.originals);
  }

  /** Remove words and rebuild the automaton. */
  removeWords(words: string[]): void {
    const drop = new Set(
      words.map((w) => normalizePattern(w, this.normOpts)),
    );
    const kept = this.originals.filter((w) => !drop.has(w));
    if (kept.length !== this.originals.length) {
      this.originals = kept;
      this.auto = buildAutomaton(this.originals);
    }
  }

  private checkBoundary(text: string, start: number, end: number): boolean {
    if (start > 0) {
      const before = charAt(text, start - 1);
      // step back over a low surrogate to read the full code point
      const full =
        start >= 2 &&
        before >= "\udc00" &&
        before <= "\udfff"
          ? text.slice(start - 2, start)
          : before;
      if (BOUNDARY_RE.test(full)) return false;
    }
    if (end + 1 < text.length) {
      const after = charAt(text, end + 1);
      if (BOUNDARY_RE.test(after)) return false;
    }
    return true;
  }

  private isWhitelisted(text: string, start: number, end: number): boolean {
    let s = start;
    while (s > 0 && BOUNDARY_RE.test(charAt(text, s - 1))) s--;
    let e = end;
    while (e + 1 < text.length && BOUNDARY_RE.test(charAt(text, e + 1))) e++;
    const word = normalizeText(text.slice(s, e + 1), this.normOpts).norm;
    return this.whitelist.has(word);
  }
}

/** Create an isolated checker instance. */
export function createChecker(options?: CheckerOptions): ProfanityChecker {
  return new ProfanityChecker(options);
}
