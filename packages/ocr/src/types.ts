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
 * The single interface an OCR backend must satisfy. Implement this to plug in
 * a cloud OCR API; `@bleepit/ocr/tesseract` implements it for local WASM OCR.
 */
export interface OcrEngine {
  recognize(image: ImageInput): Promise<OcrResult>;
  /** Release engine resources (workers, WASM instances). Optional. */
  terminate?(): Promise<void>;
}

/** A profanity match, plus where it appeared on the page. */
export interface ImageMatch extends Match {
  /**
   * Boxes of every OCR word the match spans — more than one when profanity
   * is split across words, or when OCR breaks a word in two.
   */
  boxes: BBox[];
  /** The OCR words the match spans, in reading order. */
  words: OcrWord[];
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
}

/**
 * Structural type for the bits of `ProfanityChecker` this package uses.
 * Keeps `bleepit` a peer dependency rather than a hard type coupling.
 */
export interface ProfanityCheckerLike {
  find(text: string, limit?: number): Match[];
}
