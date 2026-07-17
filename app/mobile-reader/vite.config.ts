import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, type Plugin } from "vite";

const configDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(configDir, "../..");
const appRoot = path.resolve(repositoryRoot, "app/mobile-reader");
const generatedLibrary = path.resolve(repositoryRoot, ".generated/reader/library.json");
const outputDir = path.resolve(repositoryRoot, ".generated/mobile-reader");

function readerLibraryPlugin(): Plugin {
  return {
    name: "story-os-reader-library",
    configureServer(server) {
      server.middlewares.use("/library.json", async (_request, response) => {
        try {
          const source = await readFile(generatedLibrary, "utf8");
          response.setHeader("content-type", "application/json; charset=utf-8");
          response.end(source);
        } catch {
          response.statusCode = 404;
          response.end(
            JSON.stringify({
              error: "Run npm run build:reader-data before opening the reader app."
            })
          );
        }
      });
    },
    async generateBundle() {
      const source = await readFile(generatedLibrary, "utf8");
      this.emitFile({
        type: "asset",
        fileName: "library.json",
        source
      });
    }
  };
}

export default defineConfig({
  root: appRoot,
  publicDir: "public",
  plugins: [readerLibraryPlugin()],
  build: {
    outDir: outputDir,
    emptyOutDir: true
  }
});
