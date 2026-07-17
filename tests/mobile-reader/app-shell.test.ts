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

    expect(main).toContain('import "./styles.css"');
    for (const label of ["书架", "目录", "Aa", "更多", "搜索", "分享", "夜间", "滚动", "翻页"]) {
      expect(main).toContain(label);
    }
    const toolbarMatch = main.match(/function toolbar\(\): string \{[\s\S]*?\n\}/);
    expect(toolbarMatch?.[0]).toContain('"目录"');
    expect(toolbarMatch?.[0]).toContain('"Aa"');
    expect(toolbarMatch?.[0]).toContain('"更多"');
    expect(toolbarMatch?.[0]).not.toContain('"搜索"');
    expect(toolbarMatch?.[0]).not.toContain('"分享"');
    expect(toolbarMatch?.[0]).not.toContain('"反馈"');
    expect(toolbarMatch?.[0]).not.toContain('"离线"');
    expect(main).not.toContain('data-panel="反馈"');
    expect(main).not.toContain('data-panel="离线"');
    expect(main).toMatch(/(?:错误|失败|无法加载)/);
    expect(main).toMatch(/fetch\s*\(/);
    expect(main).toMatch(/localStorage/);
    expect(main).toMatch(/resolveSelection/);
    expect(main).toMatch(/searchLibrary/);
    expect(main).toMatch(/normalizeSettings/);
    expect(main).toMatch(/addEventListener\s*\(/);
    expect(main).toMatch(/serviceWorker\.register\s*\(/);
    expect(main).not.toContain(".toSvg(");
    expect(main).toContain("lucideIconToSvg");
    expect(main).toContain("reader-topbar-title");
    expect(main).toContain("reader-topbar-book");
  });

  test("opens to the shelf by default and keeps reading position chapter-scoped", async () => {
    const main = await readAppFile("src/main.ts");

    expect(main).toMatch(/hasUrlSelection\(\)\s*\?\s*renderReader\(\)\s*:\s*renderShelf\(\)/);
    expect(main).toContain("chapter.blocks[0]?.id");
    expect(main).toContain("scrollToSelection");
    expect(main).toContain("window.scrollTo({ top: 0, left: 0 })");
    expect(main).toContain("currentBookProgress");
    expect(main).toContain("读到");
    expect(main).toContain("共");
  });

  test("shows chapter numbers without summaries in the table of contents", async () => {
    const main = await readAppFile("src/main.ts");
    const css = await readAppFile("src/styles.css");

    expect(main).toContain("chapterLabel(book, chapter)");
    expect(main).toContain("第 N 章");
    expect(main).toContain("toc-sheet");
    expect(main).toContain("chapter-index");
    expect(main).toContain("currentOpenPanelName");
    expect(main).toMatch(/const openPanelName = currentOpenPanelName\(\)/);
    expect(main).toMatch(/openPanel\(openPanelName\)/);
    expect(main).toContain("data-action=\"previous-chapter\"");
    expect(main).toContain("data-action=\"next-chapter\"");
    expect(main).toContain("turnPage");
    expect(main).toContain("pageStep");
    expect(main).toContain("selectAdjacentChapter");
    expect(main).toContain("pagedWindowContent");
    expect(main).toContain("data-paged-chapter");
    expect(main).toContain("syncPagedSelection");
    expect(main).toContain("scrollToPagedChapter");
    expect(main).toContain("scrollToPagedEnd");
    expect(main).toContain("scrollToPagedAnchor");
    expect(main).toContain("snapPagedScrollLeft");
    expect(main).toContain("syncSelectionFromViewport");
    expect(main).toContain("schedulePagedSelectionSync");
    expect(main).toContain("syncReaderChrome");
    expect(main).toContain('pendingPagedPosition = "end"');
    expect(main).toContain("animateChapterTransition");
    expect(main).toMatch(/scrollToSelection\(chapter: ReaderChapterLike, anchorId: string\)[\s\S]*scrollToPagedAnchor\(anchorId/);
    expect(main).toMatch(/function setReadingMode[\s\S]*syncSelectionFromViewport\(\)/);
    expect(main).toMatch(/function turnPage[\s\S]*snapPagedScrollLeft/);
    const syncPagedMatch = main.match(/function syncPagedSelection[\s\S]*?function syncSelectionFromViewport/);
    expect(syncPagedMatch?.[0]).toContain("syncReaderChrome");
    expect(syncPagedMatch?.[0]).not.toContain("renderReader()");
    const tocMatch = main.match(/function tocContent[\s\S]*?function settingsContent/);
    expect(tocMatch?.[0]).not.toContain("chapter.summary");
    expect(tocMatch?.[0]).not.toContain("muted");
    expect(css).toContain(".toc-sheet");
    expect(css).toContain(".chapter-index");
    expect(css).toContain(".chapter-nav");
    expect(css).toContain('[data-reading-mode="scroll"] .chapter-nav');
  });

  test("keeps the reading surface immersive until the reader taps the content", async () => {
    const main = await readAppFile("src/main.ts");
    const css = await readAppFile("src/styles.css");

    expect(main).toContain("reader-topbar-title");
    expect(main).toContain("reader-page-meta");
    expect(main).toContain('data-controls="hidden"');
    expect(main).toContain('data-action="toggle-controls"');
    expect(main).toContain("toggleControls");
    expect(main).toContain("showControls");
    expect(main).toContain("hideControls");
    expect(main).not.toContain("<p>${escapeHtml(chapter.summary)}</p>");
    expect(main).not.toContain("class=\"eyebrow\"");
    expect(main).not.toContain("${escapeHtml(book.title)} · ${progress}%");
    expect(css).toContain("position: fixed");
    expect(css).toContain(".reader-topbar-title");
    expect(css).toContain(".settings-sheet");
    expect(css).toMatch(/\.reader-shell\[data-controls="hidden"\][\s\S]*\.reader-topbar/);
    expect(css).toMatch(/\.reader-shell\[data-controls="visible"\][\s\S]*\.reader-toolbar/);
    expect(css).not.toContain('padding-top: calc(var(--topbar-height)');
    expect(css).not.toMatch(/\.reader-shell\[data-reading-mode="paged"\]\s+\.reader-topbar-title\s*\{[\s\S]*display:\s*none/i);
    expect(css).not.toContain("backdrop-filter: blur(3px)");
    expect(css).toMatch(/\.panel::backdrop\s*\{[\s\S]*background:\s*transparent/i);
  });

  test("uses concise reader-facing copy instead of implementation explanations", async () => {
    const main = await readAppFile("src/main.ts");

    expect(main).toContain("当前没有可阅读作品。");
    expect(main).toContain("阅读模式");
    expect(main).toContain("滚动");
    expect(main).toContain("翻页");
    expect(main).toContain("分享");
    expect(main).toContain("复制链接");
    expect(main).toContain("搜索");
    expect(main).toContain("夜间");
    expect(main).not.toContain("离线保存");
    expect(main).not.toContain("反馈");
    expect(main).not.toContain("当前 profile 没有可阅读的作品。");
    expect(main).not.toContain("仅显示当前 profile 授权的作品。");
    expect(main).not.toContain("当前访问可阅读的作品。");
    expect(main).not.toContain("分享链接只指向当前书籍、章节和段落锚点。");
    expect(main).not.toContain("阅读器不会在安装时静默缓存正文");
    expect(main).not.toContain("缓存已授权内容");
  });

  test("keeps modal focus recoverable for keyboard users", async () => {
    const main = await readAppFile("src/main.ts");

    expect(main).toContain("lastPanelTrigger");
    expect(main).toMatch(/openPanel\(button\.dataset\.dialog as DialogName,\s*button\)/);
    expect(main).toContain("closeOpenPanels(name)");
    expect(main).toContain("<aside");
    expect(main).toContain("panel.hidden = false");
    expect(main).toContain("panel.dataset.open");
    expect(main).toContain('if (panel.dataset.open === "true")');
    expect(main).toContain('aria-pressed="false"');
    expect(main).toContain('aria-expanded="false"');
    expect(main).not.toContain("showModal()");
    expect(main).not.toContain("panel.show()");
    expect(main).toContain("focusPanel(panel)");
    expect(main).toContain("restorePanelFocus");
    expect(main).toContain("keydown");
    expect(main).toContain('event.key === "Escape"');
  });

  test("clears stale panel state when panels close or the reader rerenders", async () => {
    const main = await readAppFile("src/main.ts");

    expect(main).toContain("resetPanelState");
    expect(main).toMatch(/function renderReader\(\): void \{\s*resetPanelState\(\)/);
    expect(main).toMatch(/function renderShelf\(\): void \{\s*resetPanelState\(\)/);
    expect(main).toMatch(/document\.body\.classList\.remove\("panel-open"\)/);
    expect(main).toMatch(/button\.setAttribute\("aria-pressed", "false"\)/);
    expect(main).toMatch(/function closeOpenPanels\(except\?: DialogName\): void \{[\s\S]*syncPanelLock\(\)/);
  });

  test("supports narrow screens, keyboard focus, reduced motion, and four themes", async () => {
    const css = await readAppFile("src/styles.css");

    expect(css).toMatch(/overflow-x\s*:\s*hidden/i);
    expect(css).toContain(".reader-shell-inner");
    expect(css).toContain("--reader-rail-edge");
    expect(css).toContain("--reader-panel-width");
    expect(css).toContain(".reader-topbar-book");
    expect(css).toContain(".reader-page-meta");
    expect(css).toContain(".paged-chapter-title");
    expect(css).toContain("data-paged-chapter");
    expect(css).toContain(".reader-corner-hint");
    expect(css).toContain('[data-reading-mode="paged"]');
    expect(css).toContain("scrollbar-width: none");
    expect(css).toContain("::-webkit-scrollbar");
    expect(css).toMatch(/\.reader-shell\[data-reading-mode="paged"\]\s*\{[\s\S]*overflow:\s*hidden/i);
    expect(css).toMatch(/\.reader-shell\[data-reading-mode="paged"\]\s+\.chapter-body\s*\{[\s\S]*overflow-y:\s*hidden/i);
    expect(css).toMatch(/\.reader-shell\[data-reading-mode="paged"\]\[data-controls="hidden"\]\s+\.reader-page-meta\s*\{[\s\S]*display:\s*block/i);
    expect(css).toMatch(/\.reader-shell\[data-reading-mode="paged"\]\s+\.chapter-header\s*\{[\s\S]*display:\s*none/i);
    expect(css).toMatch(/\.reader-shell\[data-reading-mode="paged"\]\[data-controls="visible"\]\s+\.reader-topbar\s*\{[\s\S]*background:\s*var\(--bg\)/i);
    expect(css).not.toContain("break-inside: avoid");
    expect(css).toMatch(/\.reader-toolbar span\s*\{[\s\S]*display:\s*none/i);
    expect(css).toMatch(/@media[^\{]*min-width\s*:\s*840px/i);
    expect(css).toMatch(/@media[^\{]*max-width\s*:\s*480px/i);
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

  test("provides a one-click reader launcher for local use", async () => {
    const packageJson = JSON.parse(
      await readFile(path.join(root, "package.json"), "utf8")
    ) as { scripts?: Record<string, string> };
    const launcher = await readFile(path.join(root, "open-reader.cmd"), "utf8");

    expect(packageJson.scripts?.["open:reader"]).toContain("build:reader-app");
    expect(packageJson.scripts?.["open:reader"]).toContain("vite preview");
    expect(packageJson.scripts?.["open:reader"]).toContain("--open");
    expect(launcher).toMatch(/cd \/d "%~dp0"/i);
    expect(launcher).toMatch(/npm\.cmd run open:reader/i);
    expect(launcher).toMatch(/pause/i);
  });
});
