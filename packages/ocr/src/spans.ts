import type { BBox, OcrWord } from "./types.js";

/**
 * Mapping OCR words to text offsets is the one non-trivial part of this
 * package. The checker works on a flat string and reports UTF-16 offsets into
 * it, so we join the words ourselves and keep the span each one occupies.
 * Matches are then resolved back to words by range overlap.
 *
 * A caveat that shapes the whole design: the separator between joined words
 * is *not* a match boundary. bleepit's normalizer drops every non-alphanumeric
 * character before matching — that is what lets it catch `f.u.c.k` — so a
 * space, newline or pipe between two words vanishes and the letters run
 * together. `"sh"` + `"it"` in adjacent boxes scans as `shit`. No separator
 * character avoids this; only a letter would, and injecting letters would
 * corrupt offsets and invent different false positives.
 *
 * Hence `joinSeparately`, the default, which scans one word at a time so
 * fragments cannot combine. `joinWords` keeps the concatenating behaviour for
 * callers who would rather catch profanity that OCR split across two boxes,
 * and accept the false positives that come with it.
 */

/** A word plus the half-open `[start, end)` range it occupies in the text. */
export interface WordSpan {
  word: OcrWord;
  start: number;
  /** Exclusive, unlike `Match.end` which is inclusive. */
  end: number;
}

export interface JoinedText {
  text: string;
  spans: WordSpan[];
}

const SEPARATOR = " ";

/**
 * One scannable unit: text to match against, and the spans within it.
 * `joinSeparately` yields one per word, `joinWords` a single combined one.
 */
export type Segment = JoinedText;

/**
 * Each word as its own segment, so neighbouring words can never concatenate
 * into a match. Words with empty text are skipped.
 */
export function joinSeparately(words: OcrWord[]): Segment[] {
  const out: Segment[] = [];
  for (const word of words) {
    if (word.text === "") continue;
    out.push({
      text: word.text,
      spans: [{ word, start: 0, end: word.text.length }],
    });
  }
  return out;
}

/**
 * Join words into a single string, recording each word's offset range.
 * Words with empty text are skipped — they would produce zero-width spans
 * that can never overlap a match.
 *
 * Note that this lets adjacent words combine into a match; see the module
 * comment above.
 */
export function joinWords(words: OcrWord[]): JoinedText {
  const spans: WordSpan[] = [];
  const parts: string[] = [];
  let offset = 0;

  for (const word of words) {
    if (word.text === "") continue;
    if (parts.length > 0) {
      parts.push(SEPARATOR);
      offset += SEPARATOR.length;
    }
    const start = offset;
    offset += word.text.length;
    parts.push(word.text);
    spans.push({ word, start, end: offset });
  }

  return { text: parts.join(""), spans };
}

/**
 * Words overlapping the inclusive offset range `[start, end]`.
 *
 * `spans` is sorted and non-overlapping by construction, so this binary
 * searches for the first candidate and walks forward — keeping a page with
 * many words and many matches near O(m log n) rather than O(m·n).
 */
export function wordsInRange(
  spans: WordSpan[],
  start: number,
  end: number,
): OcrWord[] {
  const out: OcrWord[] = [];

  // First span whose end is strictly past `start`, i.e. the first that can
  // overlap. Spans end-exclusive, match range end-inclusive.
  let lo = 0;
  let hi = spans.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((spans[mid] as WordSpan).end <= start) lo = mid + 1;
    else hi = mid;
  }

  for (let i = lo; i < spans.length; i++) {
    const span = spans[i] as WordSpan;
    if (span.start > end) break;
    out.push(span.word);
  }
  return out;
}

/** Smallest box containing every input box, or `null` for an empty list. */
export function mergeBoxes(boxes: BBox[]): BBox | null {
  if (boxes.length === 0) return null;
  const first = boxes[0] as BBox;
  let { x0, y0, x1, y1 } = first;
  for (let i = 1; i < boxes.length; i++) {
    const b = boxes[i] as BBox;
    if (b.x0 < x0) x0 = b.x0;
    if (b.y0 < y0) y0 = b.y0;
    if (b.x1 > x1) x1 = b.x1;
    if (b.y1 > y1) y1 = b.y1;
  }
  return { x0, y0, x1, y1 };
}
