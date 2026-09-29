import type { NormalizeOptions } from "./types.js";

/**
 * Normalization is the key to a language-agnostic matcher:
 * one pass maps every code point to its canonical letter while
 * remembering the original offset (needed for boundaries + censoring).
 *
 * Handles: case folding, diacritics (NFKD), common folds (ß→ss),
 * leet-speak, and drops separators (`f.u-c_k` → `fuck`) so the
 * automaton sees a clean letter stream.
 */

const DIACRITICS_RE = /\p{M}/gu;
const ALNUM_RE = /[\p{L}\p{N}]/u;

/** Unambiguous leet substitutions — always applied. */
const LEET_ALWAYS: Record<string, string> = {
  "0": "o",
  "3": "e",
  "4": "a",
  "5": "s",
  "6": "b",
  "7": "t",
  "8": "b",
  "@": "a",
  $: "s",
  "€": "e",
  "£": "e",
  "¥": "y",
};

/**
 * Ambiguous substitutions (`!` could be punctuation) — only applied
 * between letters/digits so trailing punctuation (`damn!`) still
 * acts as a word boundary instead of gluing an `i` onto the word.
 */
const LEET_CONTEXT: Record<string, string> = {
  "1": "i",
  "!": "i",
  "+": "t",
};

const FOLDS: Record<string, string> = {
  ß: "ss",
  æ: "ae",
  œ: "oe",
  ø: "o",
  đ: "d",
  ł: "l",
  þ: "th",
  ð: "d",
};

export interface NormalizedText {
  /** Canonical letter stream scanned by the automaton. */
  norm: string;
  /** UTF-16 start offset in the original string per norm char. */
  index: number[];
  /** UTF-16 end offset (inclusive) in the original string per norm char. */
  ends: number[];
}

const isWordChar = (ch: string): boolean => ALNUM_RE.test(ch);

export function normalizeText(
  text: string,
  opts: NormalizeOptions = {},
): NormalizedText {
  const leet = opts.leet !== false;
  const strip = opts.stripDiacritics !== false;
  const cps = Array.from(text);

  const out: string[] = [];
  const index: number[] = [];
  const ends: number[] = [];

  let off = 0;
  for (let i = 0; i < cps.length; i++) {
    const raw = cps[i] as string;
    const start = off;
    off += raw.length;

    // Fast path: ASCII alphanumerics skip all Unicode work
    // (toLowerCase / NFKD / regex). This covers the common case.
    if (raw.length === 1) {
      const cc = raw.charCodeAt(0);
      if (cc >= 97 && cc <= 122) {
        out.push(raw);
        index.push(start);
        ends.push(off - 1);
        continue;
      }
      if (cc >= 65 && cc <= 90) {
        out.push(String.fromCharCode(cc + 32));
        index.push(start);
        ends.push(off - 1);
        continue;
      }
      if (cc >= 48 && cc <= 57) {
        let m: string | undefined;
        if (leet) {
          m = LEET_ALWAYS[raw];
          if (m === undefined && LEET_CONTEXT[raw] !== undefined) {
            const prev = i > 0 ? (cps[i - 1] as string) : "";
            const next = i + 1 < cps.length ? (cps[i + 1] as string) : "";
            if (
              prev !== "" &&
              next !== "" &&
              isWordChar(prev) &&
              isWordChar(next)
            ) {
              m = LEET_CONTEXT[raw];
            }
          }
        }
        const letter = m ?? raw;
        out.push(letter);
        index.push(start);
        ends.push(off - 1);
        continue;
      }
    }

    let ch = raw.toLowerCase();
    if (strip) ch = ch.normalize("NFKD").replace(DIACRITICS_RE, "");
    if (ch === "") continue;
    const folded = FOLDS[ch];
    if (folded !== undefined) ch = folded;

    for (const c of ch) {
      let mapped: string | undefined;
      if (leet) {
        mapped = LEET_ALWAYS[c];
        if (mapped === undefined && LEET_CONTEXT[c] !== undefined) {
          const prev = i > 0 ? (cps[i - 1] as string) : "";
          const next = i + 1 < cps.length ? (cps[i + 1] as string) : "";
          if (prev !== "" && next !== "" && isWordChar(prev) && isWordChar(next)) {
            mapped = LEET_CONTEXT[c];
          }
        }
      }
      const letter = mapped ?? c;
      if (isWordChar(letter)) {
        out.push(letter);
        index.push(start);
        ends.push(off - 1);
      }
      // separators are dropped (obfuscation-tolerant) — repeat
      // handling and boundaries are resolved downstream
    }
  }
  return { norm: out.join(""), index, ends };
}

/** Normalize a dictionary word to its canonical form. */
export function normalizePattern(
  word: string,
  opts: NormalizeOptions = {},
): string {
  // Patterns are clean dictionary words: no context-sensitive leet.
  const leet = opts.leet !== false;
  const strip = opts.stripDiacritics !== false;
  let out = "";
  for (const raw of word) {
    let ch = raw.toLowerCase();
    if (strip) ch = ch.normalize("NFKD").replace(DIACRITICS_RE, "");
    if (ch === "") continue;
    const folded = FOLDS[ch];
    if (folded !== undefined) ch = folded;
    for (const c of ch) {
      const m = leet ? LEET_ALWAYS[c] : undefined;
      const letter = m ?? c;
      if (isWordChar(letter)) out += letter;
    }
  }
  return out;
}
