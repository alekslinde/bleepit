---
"@bleepit/core": minor
"@bleepit/ocr": minor
---

Renamed the checker package from `bleepit` to `@bleepit/core`, so both published
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
