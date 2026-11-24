import { defineConfig } from "vitest/config";

// BASE_PATH is set by the GitHub Pages workflow (e.g. "/pong-ts-p5/").
export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  // p5 alone is ~1 MB minified; that is expected for this app.
  build: { chunkSizeWarningLimit: 1500 },
  test: { include: ["tests/**/*.test.ts"] },
});
