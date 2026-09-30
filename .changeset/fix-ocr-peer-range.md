---
"@bleepit/ocr": patch
---

Fixed an unusable `peerDependencies` range in 0.2.1, which shipped the literal
`workspace:^` instead of a semver range and made the package impossible to
install (`EUNSUPPORTEDPROTOCOL`). 0.2.1 is deprecated in favour of this release.
