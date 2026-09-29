---
"@bleepit/ocr": minor
---

Add `@bleepit/ocr`: profanity detection for images.

OCRs an image, scans the recognized text with a `ProfanityChecker`, and reports
each match with the bounding boxes it came from. The OCR engine is injected
rather than bundled, so the package keeps zero runtime dependencies and callers
choose between local WASM OCR and a cloud API.

- `isProfane` / `find` / `redact`, plus `findInWords` for pre-OCR'd input
- `minConfidence` (default 60) drops low-confidence words before matching
