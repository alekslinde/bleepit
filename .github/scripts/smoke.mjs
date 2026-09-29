/**
 * Smoke test against built output.
 *
 * The unit suites run against `src/`, so they cannot catch a broken build:
 * a bad entry point, a mangled export, or a bundler change that drops code.
 * This imports what would actually be published and asserts the headline
 * behavior still holds.
 *
 * Keep it small and obvious. Detailed cases belong in the package suites.
 */
import assert from "node:assert/strict";

import { ProfanityChecker, censor, createChecker, isProfane } from "../../packages/bleepit/dist/index.js";
import { createImageChecker } from "../../packages/ocr/dist/index.js";

// --- bleepit: exports resolve and the core paths work -----------------------

assert.equal(typeof ProfanityChecker, "function", "ProfanityChecker missing");
assert.equal(typeof createChecker, "function", "createChecker missing");

const checker = createChecker();
assert.ok(checker.size > 0, "wordlist did not load");

assert.equal(isProfane("shit"), true, "plain match failed");
assert.equal(isProfane("sh1t"), true, "leet normalization failed");
assert.equal(isProfane("shiiiit"), true, "elongation handling failed");
assert.equal(isProfane("f.u.c.k"), true, "separator stripping failed");
assert.equal(isProfane("the class"), false, "word boundary failed");
assert.equal(censor("you shit"), "you ****", "censor failed");

// Multi-language loading, since lists are a separate entry point.
assert.equal(
  createChecker({ languages: ["en", "fr"] }).isProfane("merde"),
  true,
  "french list did not load",
);

// --- @bleepit/ocr: the adapter works against the real bleepit build ----------

const box = (i) => ({ x0: i * 10, y0: 0, x1: i * 10 + 8, y1: 10 });
const word = (text, i, confidence = 95) => ({ text, bbox: box(i), confidence });
const engine = (words) => ({ recognize: () => Promise.resolve({ words }) });
const IMAGE = new Uint8Array();

const found = await createImageChecker({
  engine: engine([word("you", 0), word("sh1t", 1)]),
}).find(IMAGE);

assert.equal(found.length, 1, "expected exactly one image match");
assert.equal(found[0].word, "shit", "match did not normalize to the list word");
assert.equal(found[0].text, "sh1t", "match did not carry OCR source text");
assert.deepEqual(found[0].boxes, [box(1)], "match mapped to the wrong box");

// Words below the confidence floor must not reach the checker.
assert.equal(
  await createImageChecker({
    engine: engine([word("shit", 0, 30)]),
  }).isProfane(IMAGE),
  false,
  "low-confidence word was not dropped",
);

// Adjacent OCR fragments must not concatenate into a match. bleepit strips
// non-alphanumerics, so any separator between words vanishes — this is the
// regression that per-word scanning exists to prevent.
assert.equal(
  await createImageChecker({
    engine: engine([word("sh", 0), word("it", 1)]),
  }).isProfane(IMAGE),
  false,
  "adjacent fragments concatenated into a false match",
);

// ...unless the caller opts in.
assert.equal(
  await createImageChecker({
    engine: engine([word("sh", 0), word("it", 1)]),
    crossWord: true,
  }).isProfane(IMAGE),
  true,
  "crossWord did not match across boxes",
);

console.log("smoke: built output OK");
