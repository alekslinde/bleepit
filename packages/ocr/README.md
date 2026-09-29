# @bleepit/ocr

Profanity detection for images. OCR the page, scan the recognized text with
[bleepit](https://www.npmjs.com/package/bleepit), and get back each match with
the bounding boxes it came from.

Zero runtime dependencies — you bring the OCR engine.

```bash
pnpm add @bleepit/ocr bleepit
```

## Usage

```ts
import { createChecker } from "bleepit";
import { createImageChecker } from "@bleepit/ocr";

const ic = createImageChecker({
  engine: myOcrEngine,
  checker: createChecker({ languages: ["en", "es"] }),
});

await ic.isProfane(image); // boolean
await ic.find(image); // ImageMatch[] — word, text, boxes, confidence
await ic.redact(image); // BBox[] — one merged box per match
```

## Word fragments and the `crossWord` tradeoff

bleepit strips non-alphanumerics before matching — that is what catches
`f.u.c.k`. The consequence for OCR is that **any gap between two recognized
words disappears**, so `"sh"` and `"it"` in adjacent boxes would scan as one
word. No separator character avoids this; only a letter would, and injecting
letters corrupts offsets.

So each OCR word is scanned on its own by default. Neighbouring words cannot
collide, at the cost of missing profanity that OCR split across two boxes.
Flip it when a split word is the likelier failure:

```ts
createImageChecker({ engine, crossWord: true });
```

Expect more false positives in that mode — it is the right choice for noisy
scans of stylized type, and the wrong one for dense screenshots of prose.

## Bring your own engine

An engine is any object with a `recognize` method returning positioned words:

```ts
interface OcrEngine {
  recognize(image: ImageInput): Promise<{ words: OcrWord[] }>;
  terminate?(): Promise<void>;
}

interface OcrWord {
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  confidence: number; // 0–100
}
```

That is the whole contract. Adapting a cloud OCR API means mapping its response
into that shape.

This package never decodes, resizes, or preprocesses images — it passes the
input straight to the engine. It also does not draw redactions: `redact()`
returns geometry, because rasterizing needs a canvas or an image library, and
that dependency is yours to choose.

If OCR already runs elsewhere in your pipeline, skip the engine round-trip:

```ts
ic.findInWords(words); // synchronous, same ImageMatch[]
```

## Accuracy

**OCR output is noisier than typed text, and this raises false positives.**
bleepit normalizes leet-speak, mapping `1`→`i` and `0`→`o`. OCR makes the same
confusions, so the normalizer silently repairs a lot of recognition error —
`sh1t` still matches. The cost is that OCR garbage also normalizes *toward*
dictionary words, and flags that would never fire on typed input.

`minConfidence` (default `60`) is the main lever. Raise it for photographs and
scans; lower it for clean screenshots where a miss costs more than a false
positive. Tune it against images that look like yours — the right value depends
on your engine and your inputs, not on a general default.

Two limits worth stating plainly:

- **Text only.** This finds profane *words* in an image. It does not detect
  offensive imagery, gestures, or symbols — that is an image classifier, and a
  different problem with different failure modes.
- **A miss is not a guarantee.** Stylized type, low contrast, curved text, and
  handwriting all defeat OCR. Treat a clean result as "nothing recognized,"
  not "nothing there."

## License

Apache-2.0
