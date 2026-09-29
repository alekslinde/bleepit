import { ProfanityChecker } from "bleepit";
import { joinWords, mergeBoxes, wordsInRange } from "./spans.js";
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
 * runtime dependencies and you choose what to pay for — local WASM OCR via
 * `@bleepit/ocr/tesseract`, or your own adapter over a cloud OCR API.
 *
 * @example
 * ```ts
 * import { createImageChecker } from "@bleepit/ocr";
 * import { tesseract } from "@bleepit/ocr/tesseract";
 *
 * const ic = createImageChecker({ engine: tesseract({ langs: ["eng"] }) });
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

  constructor(options: ImageCheckerOptions) {
    this.engine = options.engine;
    this.checker = options.checker ?? new ProfanityChecker();
    this.minConfidence = options.minConfidence ?? DEFAULT_MIN_CONFIDENCE;
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
    const usable = words.filter((w) => w.confidence >= this.minConfidence);
    const { text, spans } = joinWords(usable);
    if (text === "") return [];

    const matches =
      limit === undefined
        ? this.checker.find(text)
        : this.checker.find(text, limit);

    const out: ImageMatch[] = [];
    for (const m of matches) {
      const spanned = wordsInRange(spans, m.start, m.end);
      out.push({
        ...m,
        words: spanned,
        boxes: spanned.map((w) => w.bbox),
        confidence: spanned.reduce(
          (lowest, w) => Math.min(lowest, w.confidence),
          Number.POSITIVE_INFINITY,
        ),
      });
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
