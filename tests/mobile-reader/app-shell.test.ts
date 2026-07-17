import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { describe, expect, test } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

async function readAppFile(relativePath: string): Promise<string> {
  return readFile(path.join(root, "app/mobile-reader", relativePath), "utf8");
}

describe("mobile reader app shell", () => {
  test("declares an installable standalone web app manifest", async () => {
    const manifestText = await readAppFile("public/manifest.webmanifest");
    const manifest = JSON.parse(manifestText) as Record<string, unknown>;

    expect(manifest.display).toBe("standalone");
    expect(manifest.name).toEqual(expect.any(String));
    expect((manifest.name as string).trim().length).toBeGreaterThan(0);
    expect(manifest.start_url).toEqual(expect.stringMatching(/^(?:\.\/|\/)/));
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          src: expect.stringMatching(/\.(?:png|webp)$/),
          sizes: expect.stringMatching(/^(?:\d+x\d+|any)$/),
          type: expect.stringMatching(/^image\//)
        })
      ])
    );
  });

  test("ships concrete PNG app icons referenced by the manifest", async () => {
    for (const iconName of ["icon-192.png", "icon-512.png"]) {
      const icon = await stat(path.join(root, "app/mobile-reader/public", iconName));

      expect(icon.isFile()).toBe(true);
      expect(icon.size).toBeGreaterThan(1024);
    }
  });

  test("provides a semantic HTML entry point with a skip link", async () => {
    const html = await readAppFile("index.html");

    expect(html).toMatch(/<a\b[^>]*href=["']#main-content["'][^>]*>/i);
    expect(html).toMatch(/<main\b[^>]*id=["']main-content["'][^>]*>/i);
    expect(html).toMatch(
      /<script\b(?=[^>]*type=["']module["'])(?=[^>]*src=["'](?:\.\/|\/)?src\/main\.ts["'])[^>]*>/i
    );
  });

  test("wires the core reading flows and recoverable states", async () => {
    const main = await readAppFile("src/main.ts");

    for (const label of ["书架", "目录", "搜索", "阅读设置", "反馈", "离线"]) {
      expect(main).toContain(label);
    }
    expect(main).toMatch(/(?:错误|失败|无法加载)/);
    expect(main).toMatch(/fetch\s*\(/);
    expect(main).toMatch(/localStorage/);
    expect(main).toMatch(/resolveSelection/);
    expect(main).toMatch(/searchLibrary/);
    expect(main).toMatch(/normalizeSettings/);
    expect(main).toMatch(/buildFeedbackExport/);
    expect(main).toMatch(/addEventListener\s*\(/);
    expect(main).toMatch(/serviceWorker\.register\s*\(/);
  });

  test("supports narrow screens, keyboard focus, reduced motion, and four themes", async () => {
    const css = await readAppFile("src/styles.css");

    expect(css).toMatch(/@media[^\{]*max-width\s*:\s*320px/i);
    expect(css).toContain(":focus-visible");
    expect(css).toMatch(/prefers-reduced-motion\s*:\s*reduce/i);
    for (const theme of ["system", "paper", "sepia", "night"]) {
      expect(css).toMatch(new RegExp(`(?:data-theme|theme)[^\\n\\r\\{]*${theme}`, "i"));
    }
  });

  test("uses a versioned service worker cache lifecycle", async () => {
    const serviceWorker = await readAppFile("public/sw.js");

    expect(serviceWorker).toMatch(/(?:CACHE|cache)[^\n\r=]*=\s*["'`][^"'`]*(?:v|version)[-_]?\d+/);
    for (const eventName of ["install", "activate", "fetch"]) {
      expect(serviceWorker).toMatch(
        new RegExp(`addEventListener\\s*\\(\\s*["']${eventName}["']`)
      );
    }
  });

  test("has a Vite build that injects generated reader data without making it a source file", async () => {
    const packageJson = JSON.parse(
      await readFile(path.join(root, "package.json"), "utf8")
    ) as { scripts?: Record<string, string> };
    const viteConfig = await readFile(
      path.join(root, "app/mobile-reader/vite.config.ts"),
      "utf8"
    );

    expect(packageJson.scripts?.["build:reader-app"]).toContain("build:reader-data");
    expect(packageJson.scripts?.["build:reader-app"]).toContain(".generated/reader/library.json");
    expect(packageJson.scripts?.["build:reader-app"]).toContain("vite build");
    expect(viteConfig).toContain("app/mobile-reader");
    expect(viteConfig).toContain(".generated/reader/library.json");
    expect(viteConfig).toContain("this.emitFile");
    expect(viteConfig).toContain("library.json");
  });
});
