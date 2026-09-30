import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  treeshake: true,
  minify: true,
  target: "es2020",
  clean: true,
  outDir: "dist",
  external: ["@bleepit/core"],
});
