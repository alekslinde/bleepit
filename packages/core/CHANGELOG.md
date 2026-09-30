# @bleepit/core

## 0.2.0

### Minor Changes

- a91af1b: Renamed the checker package from `bleepit` to `@bleepit/core`, so both published
  packages now live under the `@bleepit` scope.
  
  **Migration:** replace the dependency and update imports.
  
  ```diff
  -import { ProfanityChecker } from "bleepit";
  -import { es } from "bleepit/lists";
  +import { ProfanityChecker } from "@bleepit/core";
  +import { es } from "@bleepit/core/lists";
  ```
  
  ```bash
  npm uninstall bleepit && npm i @bleepit/core
  ```
  
  The API is unchanged — only the package name moves. `bleepit` on npm is
  deprecated with a pointer here; it keeps working but will not receive updates.
  
  `@bleepit/ocr` bumps alongside it because its peer dependency now names
  `@bleepit/core`.

### Patch Changes

- fcce79c: Add repository, homepage and bugs metadata so npm links back to the source, and declare a supported Node range. Publishes now carry a provenance attestation tying each tarball to the commit and workflow run that built it.
