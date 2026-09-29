import type { Match } from "bleepit";

/**
 * Anything an OCR engine can accept. Deliberately wide: this package never
 * decodes images, it just hands the value through to the engine.
 */
export type ImageInput =
  | Uint8Array
  | ArrayBuffer
  | Blob
  | string; // path, data URL, or http(s) URL — engine-dependent

/** Axis-aligned box in pixels, origin top-left. */
export interface BBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** One recognized word with its position on the page. */
export interface OcrWord {
  text: string;
  bbox: BBox;
  /** Engine confidence, 0–100. Words below the threshold are dropped. */
  confidence: number;
}

/**
 * What an engine returns. Only `words` is used for matching — a `text` field
 * is intentionally absent, because this package joins words itself to keep
 * the offset mapping authoritative.
 */
export interface OcrResult {
  words: OcrWord[];
}

/**
 * The single interface an OCR backend must satisfy. Implement it to plug in
 * local WASM OCR or a cloud OCR API — this package ships no engine itself.
 */
export interface OcrEngine {
  recognize(image: ImageInput): Promise<OcrResult>;
  /** Release engine resources (workers, WASM instances). Optional. */
  terminate?(): Promise<void>;
}

/**
 * A profanity match, plus where it appeared on the page.
 *
 * Inherited `start` and `end` are offsets into the scanned segment, not into
 * any page-wide string: by default each OCR word is scanned on its own, so
 * they are offsets within `words[0].text`. Use `boxes` to locate a match on
 * the image and `text` to see what was matched — those are meaningful in
 * both modes.
 */
export interface ImageMatch extends Match {
  /**
   * Boxes of every OCR word the match spans — more than one only when
   * `crossWord` is enabled and a match runs across two boxes.
   */
  boxes: BBox[];
  /** The OCR words the match spans, in reading order. */
  words: OcrWord[];
  /** The source text that matched, as OCR read it (e.g. `"sh1t"`). */
  text: string;
  /** Lowest confidence among the spanned words — a rough match-quality hint. */
  confidence: number;
}

export interface ImageCheckerOptions {
  /** OCR backend. Required — this package ships no engine by default. */
  engine: OcrEngine;
  /**
   * Checker used to scan recognized text. Defaults to a new English
   * `ProfanityChecker`. Pass your own to configure languages or wordlists.
   */
  checker?: ProfanityCheckerLike;
  /**
   * Drop OCR words below this confidence before matching (0–100).
   * Default `60`. Raise it to cut false positives on noisy scans; lower it
   * for clean screenshots where you would rather not miss anything.
   */
  minConfidence?: number;
  /**
   * Allow a match to span more than one OCR word. Default `false`.
   *
   * bleepit strips non-alphanumerics before matching (so `f.u.c.k` is
   * caught), which means the gap between two OCR words disappears and their
   * letters run together — `"sh"` and `"it"` in adjacent boxes would scan as
   * `shit`. Scanning each word alone is therefore the default.
   *
   * Set `true` when OCR splitting one word across boxes is the bigger worry
   * than neighbouring words colliding — noisy scans of stylized type, say.
   * Expect more false positives.
   */
  crossWord?: boolean;
}

/**
 * Structural type for the bits of `ProfanityChecker` this package uses.
 * Keeps `bleepit` a peer dependency rather than a hard type coupling.
 */
export interface ProfanityCheckerLike {
  find(text: string, limit?: number): Match[];
}
