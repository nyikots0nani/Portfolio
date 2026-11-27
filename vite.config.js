import { defineConfig } from "vite";

// Vite config for The Tsonani Times.
// - index.html at the project root is the entry point.
// - Everything in /public (photos, project screenshots, CV) is copied to /dist as-is,
//   so paths like "assets/images/nyiko-01.jpg" stay the same after the build.
export default defineConfig({
  base: "./",            // relative URLs: dist/ works on GitHub Pages, Netlify or any sub-folder
  server: { open: true },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
