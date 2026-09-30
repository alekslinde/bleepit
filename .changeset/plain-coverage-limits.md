---
"@bleepit/core": patch
"@bleepit/ocr": patch
---

Documented that detection coverage is exactly the wordlists you load: there is
no language detection, so a word absent from a loaded list and from
`customWords` is never flagged. This includes near neighbours of a loaded
language — Portuguese `merda` is not matched by Spanish `mierda`, and Swedish
`skit` is not matched by English `shit`.

No behaviour change; the engine already worked this way. Docs and the package
description now say so plainly instead of implying broader coverage through the
phrase "language-agnostic", which described the matching engine rather than
what the shipped lists detect.

`@bleepit/ocr`'s README also drops a stale `pnpm add @bleepit/ocr bleepit`
install line, which named the pre-rename package rather than the
`@bleepit/core` peer dependency it actually needs.
