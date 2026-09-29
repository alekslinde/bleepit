import { ProfanityChecker } from "bleepit";
import {
  joinSeparately,
  joinWords,
  mergeBoxes,
  wordsInRange,
  type Segment,
} from "./spans.js";
import type {
  BBox,
  ImageCheckerOptions,
  ImageInput,
  ImageMatch,
  OcrEngine,
  OcrWord,
  ProfanityCheckerLike,
} from "./types.js";

const DEFAULT_MIN_CONFIDENCE = 60;

/**
 * Profanity detection for images: OCR the page, scan the recognized text with
 * a `ProfanityChecker`, and report each match with the boxes it came from.
 *
 * The OCR engine is injected rather than bundled, so this package keeps zero
 * runtime dependencies and you choose what to pay for — local WASM OCR or a
 * cloud OCR API, behind the same two-method {@link OcrEngine} interface.
 *
 * @example
 * ```ts
 * import { createImageChecker } from "@bleepit/ocr";
 *
 * const ic = createImageChecker({ engine: myOcrEngine });
 * const matches = await ic.find(screenshot);
 * ```
 *
 * OCR output is noisier than typed text, and bleepit's leet normalization
 * (`1`→`i`, `0`→`o`) repairs some OCR confusions but also pulls garbage
 * toward dictionary words. `minConfidence` is the main lever against the
 * false positives that follow.
 */
export class ImageProfanityChecker {
  private readonly engine: OcrEngine;
  private readonly checker: ProfanityCheckerLike;
  private readonly minConfidence: number;
  private readonly crossWord: boolean;

  constructor(options: ImageCheckerOptions) {
    this.engine = options.engine;
    this.checker = options.checker ?? new ProfanityChecker();
    this.minConfidence = options.minConfidence ?? DEFAULT_MIN_CONFIDENCE;
    this.crossWord = options.crossWord ?? false;
  }

  /** Fast boolean check. Still pays for a full OCR pass. */
  async isProfane(image: ImageInput): Promise<boolean> {
    const matches = await this.find(image, 1);
    return matches.length > 0;
  }

  /** All matches, each carrying the OCR words and boxes it spans. */
  async find(image: ImageInput, limit?: number): Promise<ImageMatch[]> {
    const { words } = await this.engine.recognize(image);
    return this.findInWords(words, limit);
  }

  /**
   * Match against words you already have. Use this when OCR runs elsewhere
   * (a queue, a cache, a different process) to avoid recognizing twice.
   */
  findInWords(words: OcrWord[], limit?: number): ImageMatch[] {
    if (limit !== undefined && limit <= 0) return [];
    const cap = limit ?? Number.POSITIVE_INFINITY;

    const usable = words.filter((w) => w.confidence >= this.minConfidence);
    const segments: Segment[] = this.crossWord
      ? [joinWords(usable)]
      : joinSeparately(usable);

    const out: ImageMatch[] = [];
    for (const { text, spans } of segments) {
      if (text === "") continue;
      // Each segment carries its own offsets; ask only for what is still
      // needed so an early segment cannot overshoot the overall limit.
      for (const m of this.checker.find(text, cap - out.length)) {
        const spanned = wordsInRange(spans, m.start, m.end);
        out.push({
          ...m,
          words: spanned,
          boxes: spanned.map((w) => w.bbox),
          text: text.slice(m.start, m.end + 1),
          confidence:
            spanned.length === 0
              ? 0
              : spanned.reduce(
                  (lowest, w) => Math.min(lowest, w.confidence),
                  Number.POSITIVE_INFINITY,
                ),
        });
      }
      if (out.length >= cap) break;
    }
    return out;
  }

  /**
   * Boxes to cover in order to hide every match — one merged box per match,
   * so a match split across words yields a single redaction.
   *
   * This returns geometry and does not draw anything: rasterizing needs a
   * canvas or an image library, which is the caller's dependency to choose.
   */
  async redact(image: ImageInput): Promise<BBox[]> {
    const matches = await this.find(image);
    const boxes: BBox[] = [];
    for (const m of matches) {
      const merged = mergeBoxes(m.boxes);
      if (merged !== null) boxes.push(merged);
    }
    return boxes;
  }

  /** Release engine resources, if the engine holds any. */
  async terminate(): Promise<void> {
    await this.engine.terminate?.();
  }
}

/** Create an image checker. */
export function createImageChecker(
  options: ImageCheckerOptions,
): ImageProfanityChecker {
  return new ImageProfanityChecker(options);
}
