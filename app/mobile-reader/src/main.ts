import {
  ArrowLeft,
  BookOpen,
  List,
  MoreHorizontal,
  Search,
  Settings,
  Share2,
  X
} from "lucide";

import "./styles.css";

import {
  buildShareUrl,
  normalizeSettings,
  resolveSelection,
  searchLibrary,
  type ReaderBookLike,
  type ReaderChapterLike,
  type ReaderLibraryLike,
  type ReaderSettings,
  type ReadingSelection,
  type SearchResult
} from "./reader-core.js";

type DialogName = "目录" | "搜索" | "分享" | "阅读设置" | "更多";
type ReadingMode = "scroll" | "paged";

interface ReaderAppState {
  library: ReaderLibraryLike | null;
  selection: ReadingSelection | null;
  settings: ReaderSettings;
  readingMode: ReadingMode;
  status: string;
}

const root = document.querySelector<HTMLElement>("#main-content");
const announcer = document.querySelector<HTMLElement>("#announcer");
const storagePrefix = "story-reader";
const appIconSrc = "./icon-192.png?v=4";
const defaultSettings = normalizeSettings({});
let lastPanelTrigger: HTMLElement | null = null;
let pendingPagedPosition: "start" | "end" = "start";
let pagedTurnInFlight = false;
let queuedPagedTurns: Array<-1 | 1> = [];
let pagedTurnAnimation: number | null = null;

const state: ReaderAppState = {
  library: null,
  selection: null,
  settings: loadSettings(),
  readingMode: loadReadingMode(),
  status: "正在打开书架..."
};

if (root === null) {
  throw new Error("Reader root is missing.");
}

applySettings(state.settings);
applyReadingMode(state.readingMode);
void boot();

async function boot(): Promise<void> {
  renderLoading();
  registerServiceWorker();

  try {
    const library = await loadLibrary();
    state.library = library;
    if (library.books.length === 0) {
      renderEmpty();
      return;
    }
    state.selection = resolveSelection(library, readUrlSelection(), loadStoredSelection());
    hasUrlSelection() ? renderReader() : renderShelf();
  } catch (error) {
    renderError(error instanceof Error ? error.message : "无法加载书库。");
  }
}

async function loadLibrary(): Promise<ReaderLibraryLike> {
  const response = await fetch("./library.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`无法加载书库：${response.status}`);
  }
  return (await response.json()) as ReaderLibraryLike;
}

function readUrlSelection(): { book?: string; chapter?: string; anchor?: string } {
  const params = new URLSearchParams(window.location.search);
  return {
    book: params.get("book") ?? undefined,
    chapter: params.get("chapter") ?? undefined,
    anchor: params.get("anchor") ?? undefined
  };
}

function hasUrlSelection(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.has("book") || params.has("chapter") || params.has("anchor");
}

function renderLoading(): void {
  resetPanelState();
  root.innerHTML = `
    <section class="loading-state" aria-live="polite" aria-busy="true">
      <img class="boot-mark" src="${appIconSrc}" alt="" width="64" height="64" />
      <p>${state.status}</p>
    </section>
  `;
}

function renderEmpty(): void {
  resetPanelState();
  root.innerHTML = `
    <section class="empty-state">
      <img class="brand-mark" src="${appIconSrc}" alt="" width="64" height="64" />
      <h1>书架</h1>
      <p>当前没有可阅读作品。</p>
    </section>
  `;
}

function renderError(message: string): void {
  resetPanelState();
  root.innerHTML = `
    <section class="error-state" role="alert">
      <img class="brand-mark" src="${appIconSrc}" alt="" width="64" height="64" />
      <h1>无法加载阅读器</h1>
      <p>${escapeHtml(message)}</p>
      <button class="action-button" data-action="retry">重试</button>
    </section>
  `;
  bind("[data-action='retry']", "click", () => void boot());
}

function renderReader(): void {
  resetPanelState();
  const library = requireLibrary();
  const selection = requireSelection();
  const book = findBook(library, selection.bookId);
  const chapter = findChapter(book, selection.chapterId);
  const label = chapterLabel(book, chapter);
  const previous = chapter.previousChapterId
    ? book.chapters.find((candidate) => candidate.id === chapter.previousChapterId)
    : null;
  const next = chapter.nextChapterId
    ? book.chapters.find((candidate) => candidate.id === chapter.nextChapterId)
    : null;

  root.innerHTML = `
    <section class="reader-shell" data-controls="hidden" data-reading-mode="${state.readingMode}">
      <header class="reader-topbar">
        <button class="icon-button" type="button" title="书架" aria-label="书架" data-action="shelf">${icon(ArrowLeft)}</button>
        <div class="reader-topbar-title">
          <strong>${escapeHtml(`${label} ${chapter.title}`)}</strong>
        </div>
        <div class="reader-topbar-book" title="${escapeHtml(book.title)}">${escapeHtml(book.title)}</div>
      </header>
      <div class="reader-page-meta" aria-hidden="true">${escapeHtml(`${label} ${chapter.title}`)}</div>
      <div class="reader-shell-inner">
        <article>
          <button class="reader-corner-hint" type="button" data-action="toggle-controls" aria-label="显示阅读工具">轻触中心</button>
          <header class="chapter-header">
            <h1>${escapeHtml(`${label} ${chapter.title}`)}</h1>
          </header>
          <div class="chapter-body" data-current-chapter="${escapeHtml(chapter.id)}">
            ${state.readingMode === "paged" ? pagedWindowContent(book, chapter) : chapterBlocksContent(chapter)}
          </div>
          <nav class="chapter-nav" aria-label="章节切换">
            <button class="chapter-link" type="button" data-action="previous-chapter" data-chapter="${previous?.id ?? ""}" ${previous === null ? "disabled" : ""}>上一章</button>
            <button class="chapter-link" type="button" data-action="next-chapter" data-chapter="${next?.id ?? ""}" ${next === null ? "disabled" : ""}>下一章</button>
          </nav>
        </article>
      </div>
      ${toolbar()}
      ${dialog("toc-panel", "目录", tocContent(book, chapter))}
      ${dialog("search-panel", "搜索", searchContent())}
      ${dialog("share-panel", "分享", shareContent(book, chapter, selection))}
      ${dialog("settings-panel", "阅读设置", settingsContent())}
      ${dialog("more-panel", "更多", moreContent())}
    </section>
  `;

  bindReaderEvents();
  queueMicrotask(() => scrollToSelection(chapter, selection.anchorId));
}

function scrollToSelection(chapter: ReaderChapterLike, anchorId: string): void {
  if (state.readingMode === "paged") {
    if (pendingPagedPosition === "end") {
      scrollToPagedChapter(chapter.id, "end");
    } else if (anchorId !== chapter.blocks[0]?.id) {
      scrollToPagedAnchor(anchorId);
    } else {
      scrollToPagedChapter(chapter.id, "start");
    }
    pendingPagedPosition = "start";
    window.scrollTo({ top: 0, left: 0 });
    return;
  }
  if (anchorId === chapter.blocks[0]?.id) {
    window.scrollTo({ top: 0, left: 0 });
    return;
  }
  document.getElementById(anchorId)?.scrollIntoView({ block: "start" });
}

function pagedWindowContent(book: ReaderBookLike, activeChapter: ReaderChapterLike): string {
  return pagedWindowChapters(book, activeChapter)
    .map((chapter) => pagedChapterContent(book, chapter, chapter.id === activeChapter.id))
    .join("");
}

function pagedChapterContent(
  book: ReaderBookLike,
  chapter: ReaderChapterLike,
  active = false
): string {
  const label = chapterLabel(book, chapter);
  return `
    <section class="paged-chapter" data-paged-chapter="${escapeHtml(chapter.id)}" data-active="${active}">
      <span class="paged-marker" data-paged-chapter-start="${escapeHtml(chapter.id)}"></span>
      <h2 class="paged-chapter-title">${escapeHtml(`${label} ${chapter.title}`)}</h2>
      ${chapterBlocksContent(chapter)}
      <span class="paged-marker" data-paged-chapter-end="${escapeHtml(chapter.id)}"></span>
    </section>
  `;
}

function pagedWindowChapters(book: ReaderBookLike, activeChapter: ReaderChapterLike): ReaderChapterLike[] {
  return [activeChapter.previousChapterId, activeChapter.id, activeChapter.nextChapterId]
    .map((chapterId) => (chapterId ? book.chapters.find((chapter) => chapter.id === chapterId) : undefined))
    .filter((chapter): chapter is ReaderChapterLike => chapter !== undefined);
}

function chapterBlocksContent(chapter: ReaderChapterLike): string {
  return chapter.blocks
    .map((block, index) =>
      block.kind === "divider"
        ? `<p id="${escapeHtml(block.id)}" data-anchor-index="${index}" class="divider">＊</p>`
        : `<p id="${escapeHtml(block.id)}" data-anchor-index="${index}">${escapeHtml(block.text)}</p>`
    )
    .join("");
}

function toolbar(): string {
  return `
    <nav class="reader-toolbar" aria-label="阅读工具">
      ${toolButton("目录", List, "目录")}
      ${toolButton("Aa", Settings, "阅读设置")}
      ${toolButton("更多", MoreHorizontal, "更多")}
    </nav>
  `;
}

function toolButton(label: string, Icon: typeof BookOpen, dialogName: DialogName): string {
  return `<button type="button" data-dialog="${dialogName}" aria-label="${label}" title="${label}" aria-pressed="false" aria-expanded="false">${icon(Icon)}<span>${label}</span></button>`;
}

function dialog(id: string, title: DialogName, content: string): string {
  const panelClass =
    title === "目录" ? "panel toc-sheet" : title === "阅读设置" ? "panel settings-sheet" : "panel utility-sheet";
  return `
    <aside id="${id}" class="${panelClass}" data-panel="${title}" hidden>
      <div class="panel-header">
        <h2>${title}</h2>
        <button class="icon-button" type="button" data-close="${title}" aria-label="关闭${title}" title="关闭">${icon(X)}</button>
      </div>
      <div class="panel-body">${content}</div>
    </aside>
  `;
}

function tocContent(book: ReaderBookLike, activeChapter: ReaderChapterLike): string {
  return `
    <ul class="stack-list">
      ${book.chapters
        .map(
          (chapter) => `
            <li>
              <button type="button" data-chapter="${escapeHtml(chapter.id)}" aria-current="${chapter.id === activeChapter.id}">
                <span class="chapter-index">${escapeHtml(chapterLabel(book, chapter))}</span>
                <strong>${escapeHtml(chapter.title)}</strong>
              </button>
            </li>
          `
        )
        .join("")}
    </ul>
  `;
}

function settingsContent(): string {
  return `
    <div class="settings-grid">
      <div class="field">
        <span>阅读模式</span>
        <div class="segmented" data-reading-mode>
          ${modeSegment("scroll", "滚动")}
          ${modeSegment("paged", "翻页")}
        </div>
      </div>
      ${rangeField("font-size", "字号", state.settings.fontSize, 14, 24, 1)}
      ${rangeField("line-height", "行距", state.settings.lineHeight, 1.4, 2.2, 0.1)}
      ${rangeField("measure", "正文宽度", state.settings.measure, 28, 46, 1)}
      <div class="field">
        <span>主题</span>
        <div class="segmented" data-setting="theme">
          ${segment("system", "系统", state.settings.theme)}
          ${segment("paper", "纸白", state.settings.theme)}
          ${segment("sepia", "暖色", state.settings.theme)}
          ${segment("night", "夜间", state.settings.theme)}
        </div>
      </div>
      <div class="field">
        <span>字体</span>
        <div class="segmented" data-setting="fontFamily">
          ${segment("serif", "衬线", state.settings.fontFamily)}
          ${segment("sans", "无衬线", state.settings.fontFamily)}
        </div>
      </div>
    </div>
  `;
}

function searchContent(): string {
  return `
    <div class="field">
      <label for="reader-search">搜索</label>
      <input id="reader-search" type="search" autocomplete="off" />
    </div>
    <p class="inline-status" id="search-status"></p>
    <ul class="search-results" id="search-results"></ul>
  `;
}

function shareContent(
  book: ReaderBookLike,
  chapter: ReaderChapterLike,
  selection: ReadingSelection
): string {
  const shareUrl = buildShareUrl(window.location.href, book.slug, chapter.id, selection.anchorId);
  return `
    <div class="field">
      <label for="share-preview">链接</label>
      <textarea id="share-preview" readonly>${escapeHtml(shareUrl)}</textarea>
    </div>
    <div class="panel-actions">
      <button class="action-button" type="button" data-action="copy-share">复制链接</button>
    </div>
    <p class="inline-status" id="share-status"></p>
  `;
}

function moreContent(): string {
  return `
    <div class="more-grid">
      ${moreButton("搜索", Search)}
      ${moreButton("分享", Share2)}
    </div>
  `;
}

function modeSegment(value: ReadingMode, label: string): string {
  return `<button type="button" data-mode="${value}" aria-pressed="${state.readingMode === value}">${label}</button>`;
}

function moreButton(label: DialogName, Icon: typeof BookOpen): string {
  return `<button type="button" class="more-button" data-dialog="${label}">${icon(Icon)}<span>${label}</span></button>`;
}

function bindReaderEvents(): void {
  bind("[data-action='shelf']", "click", renderShelf);
  bind("[data-action='toggle-controls']", "click", toggleControls);
  bind("article", "click", (event) => {
    const target = event.target as HTMLElement;
    if (target.closest("button, input, select, textarea, .panel") === null) {
      handleReaderTap(event as MouseEvent);
    }
  });
  document.querySelectorAll<HTMLButtonElement>("[data-dialog]").forEach((button) => {
    button.addEventListener("click", () => openPanel(button.dataset.dialog as DialogName, button));
  });
  document.querySelectorAll<HTMLButtonElement>("[data-close]").forEach((button) => {
    button.addEventListener("click", () => closePanel(button.dataset.close as DialogName, true));
  });
  document.querySelectorAll<HTMLElement>(".panel").forEach((panel) => {
    panel.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closePanel(panel.dataset.panel as DialogName, true);
        restorePanelFocus();
      }
    });
  });
  document.querySelectorAll<HTMLButtonElement>("[data-chapter]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.chapter) {
        selectChapter(button.dataset.chapter);
      }
    });
  });
  bind("[data-action='previous-chapter']", "click", (event) => {
    const chapterId = (event.currentTarget as HTMLButtonElement).dataset.chapter;
    if (chapterId) {
      selectChapter(chapterId, undefined, "previous");
    }
  });
  bind("[data-action='next-chapter']", "click", (event) => {
    const chapterId = (event.currentTarget as HTMLButtonElement).dataset.chapter;
    if (chapterId) {
      selectChapter(chapterId, undefined, "next");
    }
  });
  document.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      setReadingMode(button.dataset.mode as ReadingMode);
    });
  });
  bind("#reader-search", "input", updateSearch);
  bind("[data-action='copy-share']", "click", () => void copyShare());
  document.removeEventListener("keydown", handleReaderKeydown);
  document.addEventListener("keydown", handleReaderKeydown);
  bindSettings();
}

function renderShelf(): void {
  resetPanelState();
  const library = requireLibrary();
  window.history.replaceState(null, "", window.location.pathname);
  root.innerHTML = `
    <section class="shelf">
      <header class="app-header">
        <div class="brand">
          <img class="brand-mark" src="${appIconSrc}" alt="" width="48" height="48" />
          <div class="brand-copy"><strong>书架</strong><span>Story OS Reader</span></div>
        </div>
        <span class="status-chip">${library.books.length} 本</span>
      </header>
      <div class="shelf-header">
        <div>
          <h1>书架</h1>
        </div>
      </div>
      <ul class="book-list">
        ${library.books
          .map((book) => {
            const progress = currentBookProgress(book);
            const chapter = progress.chapter;
            return `
              <li class="book-card">
                <div class="book-card-main">
                  <h2>${escapeHtml(book.title)}</h2>
                  <p class="book-meta">读到 ${escapeHtml(chapter === undefined ? "暂无章节" : chapterLabel(book, chapter))} · 共 ${book.chapters.length} 章</p>
                  <p class="book-last">${escapeHtml(chapter?.title ?? "暂无章节")}</p>
                </div>
                <div class="book-card-actions">
                  <button class="action-button" type="button" data-book="${escapeHtml(book.id)}">继续阅读</button>
                </div>
              </li>
            `;
          })
          .join("")}
      </ul>
    </section>
  `;
  document.querySelectorAll<HTMLButtonElement>("[data-book]").forEach((button) => {
    button.addEventListener("click", () => {
      selectBook(button.dataset.book ?? "");
    });
  });
}

function currentBookProgress(book: ReaderBookLike): { chapter: ReaderChapterLike | undefined; index: number } {
  const stored = loadStoredSelection(book.id);
  const index = Math.max(
    0,
    book.chapters.findIndex((candidate) => candidate.id === stored?.chapterId)
  );
  return {
    chapter: book.chapters[index] ?? book.chapters[0],
    index
  };
}

function bindSettings(): void {
  bind("#font-size", "input", (event) => updateSetting({ fontSize: Number((event.target as HTMLInputElement).value) }));
  bind("#line-height", "input", (event) => updateSetting({ lineHeight: Number((event.target as HTMLInputElement).value) }));
  bind("#measure", "input", (event) => updateSetting({ measure: Number((event.target as HTMLInputElement).value) }));
  document.querySelectorAll<HTMLButtonElement>("[data-setting] button").forEach((button) => {
    button.addEventListener("click", () => {
      const setting = button.parentElement?.getAttribute("data-setting");
      updateSetting({ [setting ?? ""]: button.dataset.value });
      renderReader();
      openPanel("阅读设置");
    });
  });
}

function updateSetting(patch: Partial<Record<keyof ReaderSettings, string | number>>): void {
  state.settings = normalizeSettings({ ...state.settings, ...patch });
  localStorage.setItem(`${storagePrefix}:settings`, JSON.stringify(state.settings));
  applySettings(state.settings);
}

function selectBook(bookId: string): void {
  const library = requireLibrary();
  const stored = loadStoredSelection(bookId);
  const book = findBook(library, bookId);
  const chapter = book.chapters.find((candidate) => candidate.id === stored?.chapterId) ?? book.chapters[0];
  state.selection = {
    bookId,
    chapterId: chapter?.id ?? "",
    anchorId: chapter?.blocks[0]?.id ?? "",
    anchorIndex: chapter?.blocks[0] === undefined ? undefined : 0
  };
  saveSelection(state.selection);
  renderReader();
}

function selectChapter(chapterId: string, anchorId?: string, transitionDirection?: "previous" | "next"): void {
  const library = requireLibrary();
  const selection = requireSelection();
  const book = findBook(library, selection.bookId);
  const chapter = findChapter(book, chapterId);
  const openPanelName = currentOpenPanelName();
  state.selection = {
    bookId: book.id,
    chapterId: chapter.id,
    anchorId: anchorId ?? chapter.blocks[0]?.id ?? "",
    anchorIndex: Math.max(
      0,
      chapter.blocks.findIndex((block) => block.id === (anchorId ?? chapter.blocks[0]?.id))
    )
  };
  pendingPagedPosition = "start";
  if (state.readingMode === "paged" && transitionDirection === "previous") {
    pendingPagedPosition = "end";
  }
  saveSelection(state.selection);
  renderReader();
  if (transitionDirection !== undefined) {
    animateChapterTransition(transitionDirection);
  }
  if (openPanelName !== null) {
    openPanel(openPanelName);
  }
}

function scrollToPagedEnd(chapterBody: HTMLElement | null): void {
  const chapterId = chapterBody?.dataset.currentChapter;
  if (!chapterId) {
    return;
  }
  scrollToPagedChapter(chapterId, "end");
}

function scrollToPagedChapter(chapterId: string, position: "start" | "end" = "start"): void {
  const chapterBody = document.querySelector<HTMLElement>(".chapter-body");
  if (chapterBody === null) {
    return;
  }
  const selector = position === "end" ? `[data-paged-chapter-end="${chapterId}"]` : `[data-paged-chapter-start="${chapterId}"]`;
  const marker = chapterBody.querySelector<HTMLElement>(selector);
  const section = chapterBody.querySelector<HTMLElement>(`[data-paged-chapter="${chapterId}"]`);
  const target = marker ?? section;
  if (target === null) {
    return;
  }
  const apply = () => scrollToPagedElement(chapterBody, target);
  apply();
  requestAnimationFrame(apply);
  window.setTimeout(apply, 80);
}

function scrollToPagedAnchor(anchorId: string): void {
  const chapterBody = document.querySelector<HTMLElement>(".chapter-body");
  const target = anchorId ? document.getElementById(anchorId) : null;
  if (chapterBody === null || target === null || !chapterBody.contains(target)) {
    return;
  }
  const apply = () => scrollToPagedElement(chapterBody, target);
  apply();
  requestAnimationFrame(apply);
  window.setTimeout(apply, 80);
}

function scrollToPagedElement(chapterBody: HTMLElement, target: HTMLElement): void {
  const bodyRect = chapterBody.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const rawLeft = targetRect.left - bodyRect.left + chapterBody.scrollLeft;
  const left = snapPagedScrollLeft(chapterBody, rawLeft, "floor");
  const previousScrollBehavior = chapterBody.style.scrollBehavior;
  chapterBody.style.scrollBehavior = "auto";
  chapterBody.scrollTo({ left, top: 0, behavior: "auto" });
  chapterBody.style.scrollBehavior = previousScrollBehavior;
}

function snapPagedScrollLeft(
  chapterBody: HTMLElement,
  left: number,
  mode: "floor" | "nearest" = "nearest"
): number {
  const step = pageStep(chapterBody);
  const maxLeft = Math.max(0, chapterBody.scrollWidth - chapterBody.clientWidth);
  if (step <= 1) {
    return Math.max(0, Math.min(left, maxLeft));
  }
  const page = mode === "floor" ? Math.floor((left + 1) / step) : Math.round(left / step);
  return Math.max(0, Math.min(page * step, maxLeft));
}

function syncPagedSelection(direction: -1 | 1 = 1): void {
  syncSelectionFromViewport();
  syncReaderChrome();
  void direction;
}

function syncReaderChrome(): void {
  const selection = state.selection;
  const library = state.library;
  if (selection === null || library === null) {
    return;
  }
  const book = findBook(library, selection.bookId);
  const chapter = findChapter(book, selection.chapterId);
  const label = `${chapterLabel(book, chapter)} ${chapter.title}`;
  document.querySelector(".reader-topbar-title strong")?.replaceChildren(label);
  const pageMeta = document.querySelector<HTMLElement>(".reader-page-meta");
  if (pageMeta !== null) {
    pageMeta.textContent = label;
  }
  const chapterBody = document.querySelector<HTMLElement>(".chapter-body");
  if (chapterBody !== null) {
    chapterBody.dataset.currentChapter = chapter.id;
    chapterBody.querySelectorAll<HTMLElement>("[data-paged-chapter]").forEach((chapterElement) => {
      chapterElement.dataset.active = String(chapterElement.dataset.pagedChapter === chapter.id);
    });
    ensurePagedChapterBuffer(chapterBody, book, chapter);
  }
}

function syncSelectionFromViewport(): boolean {
  const selection = state.selection;
  if (selection === null) {
    return false;
  }
  const block = state.readingMode === "paged" ? visiblePagedBlock() : visibleScrollBlock();
  const chapterElement = block?.closest<HTMLElement>("[data-paged-chapter]");
  const chapterId = chapterElement?.dataset.pagedChapter ?? selection.chapterId;
  if (block === null || block === undefined) {
    return false;
  }
  const nextSelection = {
    bookId: selection.bookId,
    chapterId,
    anchorId: block.id,
    anchorIndex: Number.parseInt(block.dataset.anchorIndex ?? "0", 10)
  };
  if (
    nextSelection.chapterId === selection.chapterId &&
    nextSelection.anchorId === selection.anchorId
  ) {
    return false;
  }
  state.selection = nextSelection;
  saveSelection(nextSelection);
  return true;
}

function visiblePagedBlock(): HTMLElement | null {
  const chapterBody = document.querySelector<HTMLElement>(".chapter-body");
  if (chapterBody === null) {
    return null;
  }
  const bodyRect = chapterBody.getBoundingClientRect();
  const topBlock = firstVisiblePagedBlock(chapterBody, bodyRect);
  if (topBlock !== null) {
    return topBlock;
  }
  const centerX = bodyRect.left + chapterBody.clientWidth / 2;
  const readingTop = bodyRect.top + Math.min(120, chapterBody.clientHeight * 0.18);
  return nearestVisibleBlock(chapterBody, bodyRect, centerX, readingTop);
}

function firstVisiblePagedBlock(chapterBody: HTMLElement, bodyRect: DOMRect): HTMLElement | null {
  const blocks = Array.from(chapterBody.querySelectorAll<HTMLElement>("p[id]"));
  const visibleBlocks = blocks
    .map((block) => ({ block, rect: block.getBoundingClientRect() }))
    .filter(({ rect }) => {
      const isInViewport =
        rect.right > bodyRect.left &&
        rect.left < bodyRect.right &&
        rect.bottom > bodyRect.top &&
        rect.top < bodyRect.bottom;
      const startsInCurrentPage = rect.left >= bodyRect.left - 2;
      return isInViewport && startsInCurrentPage;
    })
    .sort((left, right) => left.rect.top - right.rect.top || left.rect.left - right.rect.left);
  return visibleBlocks[0]?.block ?? null;
}

function visibleScrollBlock(): HTMLElement | null {
  const chapterBody = document.querySelector<HTMLElement>(".chapter-body");
  if (chapterBody === null) {
    return null;
  }
  const viewport = new DOMRect(0, 0, window.innerWidth, window.innerHeight);
  return nearestVisibleBlock(chapterBody, viewport, window.innerWidth / 2, window.innerHeight * 0.38);
}

function nearestVisibleBlock(
  rootElement: HTMLElement,
  viewport: DOMRect,
  targetX: number,
  targetY: number
): HTMLElement | null {
  const blocks = Array.from(rootElement.querySelectorAll<HTMLElement>("p[id]"));
  return blocks.reduce<HTMLElement | null>((closest, block) => {
    const rect = block.getBoundingClientRect();
    const visible =
      rect.right > viewport.left &&
      rect.left < viewport.right &&
      rect.bottom > viewport.top &&
      rect.top < viewport.bottom;
    if (!visible) {
      return closest;
    }
    if (closest === null) {
      return block;
    }
    const blockDistance = Math.abs(rect.left - targetX) + Math.abs(rect.top - targetY);
    const closestRect = closest.getBoundingClientRect();
    const closestDistance = Math.abs(closestRect.left - targetX) + Math.abs(closestRect.top - targetY);
    return blockDistance < closestDistance ? block : closest;
  }, null);
}

function selectAdjacentChapter(direction: "previous" | "next"): void {
  const library = requireLibrary();
  const selection = requireSelection();
  const book = findBook(library, selection.bookId);
  const chapter = findChapter(book, selection.chapterId);
  const adjacentId = direction === "previous" ? chapter.previousChapterId : chapter.nextChapterId;
  if (adjacentId) {
    selectChapter(adjacentId, undefined, direction);
  }
}

function animateChapterTransition(direction: "previous" | "next"): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }
  const body = document.querySelector<HTMLElement>(".chapter-body");
  if (body === null) {
    return;
  }
  const offset = direction === "next" ? 28 : -28;
  body.animate(
    [
      { opacity: 0.28, transform: `translateX(${offset}px)` },
      { opacity: 1, transform: "translateX(0)" }
    ],
    { duration: 220, easing: "cubic-bezier(0.2, 0, 0, 1)" }
  );
}

function ensurePagedChapterBuffer(
  chapterBody: HTMLElement,
  book: ReaderBookLike,
  activeChapter: ReaderChapterLike
): void {
  const previous = activeChapter.previousChapterId
    ? book.chapters.find((chapter) => chapter.id === activeChapter.previousChapterId)
    : undefined;
  const next = activeChapter.nextChapterId
    ? book.chapters.find((chapter) => chapter.id === activeChapter.nextChapterId)
    : undefined;
  if (previous !== undefined && !hasPagedChapter(chapterBody, previous.id)) {
    insertPagedChapter(chapterBody, book, previous, "before");
  }
  if (next !== undefined && !hasPagedChapter(chapterBody, next.id)) {
    insertPagedChapter(chapterBody, book, next, "after");
  }
}

function hasPagedChapter(chapterBody: HTMLElement, chapterId: string): boolean {
  return chapterBody.querySelector(`[data-paged-chapter="${cssEscape(chapterId)}"]`) !== null;
}

function insertPagedChapter(
  chapterBody: HTMLElement,
  book: ReaderBookLike,
  chapter: ReaderChapterLike,
  position: "before" | "after"
): void {
  const oldScrollWidth = chapterBody.scrollWidth;
  const html = pagedChapterContent(book, chapter);
  if (position === "before") {
    chapterBody.insertAdjacentHTML("afterbegin", html);
    const delta = chapterBody.scrollWidth - oldScrollWidth;
    if (delta > 0) {
      const previousScrollBehavior = chapterBody.style.scrollBehavior;
      chapterBody.style.scrollBehavior = "auto";
      chapterBody.scrollLeft += delta;
      chapterBody.style.scrollBehavior = previousScrollBehavior;
    }
    return;
  }
  chapterBody.insertAdjacentHTML("beforeend", html);
}

function handleReaderTap(event: MouseEvent): void {
  if (state.readingMode !== "paged" || hasOpenPanel()) {
    toggleControls();
    return;
  }
  const selection = window.getSelection();
  if (selection !== null && selection.type === "Range") {
    return;
  }
  const article = event.currentTarget as HTMLElement;
  const rect = article.getBoundingClientRect();
  const offsetX = event.clientX - rect.left;
  if (offsetX < rect.width / 3) {
    turnPage(-1);
    return;
  }
  if (offsetX > (rect.width * 2) / 3) {
    turnPage(1);
    return;
  }
  toggleControls();
}

function handleReaderKeydown(event: KeyboardEvent): void {
  const target = event.target as HTMLElement | null;
  if (target?.closest("input, textarea, select") !== null) {
    return;
  }
  if (event.key === "Escape") {
    hideControls();
    restorePanelFocus();
    return;
  }
  if (state.readingMode !== "paged" || hasOpenPanel()) {
    return;
  }
  if (event.key === "ArrowRight" || event.key === " ") {
    event.preventDefault();
    turnPage(1);
  } else if (event.key === "ArrowLeft") {
    event.preventDefault();
    turnPage(-1);
  }
}

function turnPage(direction: -1 | 1): void {
  if (pagedTurnInFlight) {
    queuedPagedTurns.push(direction);
    queuedPagedTurns = queuedPagedTurns.slice(-8);
    return;
  }
  const chapterBody = document.querySelector<HTMLElement>(".chapter-body");
  if (chapterBody === null) {
    return;
  }
  const selection = state.selection;
  const library = state.library;
  if (selection !== null && library !== null) {
    const book = findBook(library, selection.bookId);
    const chapter = findChapter(book, selection.chapterId);
    ensurePagedChapterBuffer(chapterBody, book, chapter);
  }
  const nextLeft = findPagedTurnTarget(chapterBody, direction);
  if (nextLeft === null) {
    syncPagedSelection(direction);
    return;
  }
  pagedTurnInFlight = true;
  animatePagedScrollTo(chapterBody, nextLeft, () => schedulePagedSelectionSync(direction, nextLeft));
}

function findPagedTurnTarget(chapterBody: HTMLElement, direction: -1 | 1): number | null {
  const step = pageStep(chapterBody);
  const currentLeft = snapPagedScrollLeft(chapterBody, chapterBody.scrollLeft);
  const nextLeft = snapPagedScrollLeft(chapterBody, currentLeft + step * direction);
  if (Math.abs(nextLeft - chapterBody.scrollLeft) < 2) {
    return null;
  }
  return nextLeft;
}

function animatePagedScrollTo(chapterBody: HTMLElement, targetLeft: number, done: () => void): void {
  if (pagedTurnAnimation !== null) {
    cancelAnimationFrame(pagedTurnAnimation);
  }
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const startLeft = chapterBody.scrollLeft;
  const delta = targetLeft - startLeft;
  const previousScrollBehavior = chapterBody.style.scrollBehavior;
  chapterBody.style.scrollBehavior = "auto";
  if (reduceMotion || Math.abs(delta) < 2) {
    chapterBody.scrollTo({ left: targetLeft, top: 0, behavior: "auto" });
    chapterBody.style.scrollBehavior = previousScrollBehavior;
    done();
    return;
  }
  const duration = 220;
  const start = performance.now();
  const tick = (now: number) => {
    const elapsed = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - elapsed, 3);
    chapterBody.scrollLeft = startLeft + delta * eased;
    if (elapsed < 1) {
      pagedTurnAnimation = requestAnimationFrame(tick);
      return;
    }
    chapterBody.scrollTo({ left: targetLeft, top: 0, behavior: "auto" });
    chapterBody.style.scrollBehavior = previousScrollBehavior;
    pagedTurnAnimation = null;
    done();
  };
  pagedTurnAnimation = requestAnimationFrame(tick);
}

function schedulePagedSelectionSync(direction: -1 | 1, targetLeft: number): void {
  const chapterBody = document.querySelector<HTMLElement>(".chapter-body");
  if (chapterBody === null) {
    return;
  }
  let lastLeft = chapterBody.scrollLeft;
  let stableFrames = 0;
  let frames = 0;
  const check = () => {
    frames += 1;
    const currentLeft = chapterBody.scrollLeft;
    if (Math.abs(currentLeft - lastLeft) < 0.5) {
      stableFrames += 1;
    } else {
      stableFrames = 0;
      lastLeft = currentLeft;
    }
    const reachedTarget = Math.abs(currentLeft - targetLeft) < 1;
    if ((reachedTarget && stableFrames >= 2) || frames > 24) {
      if (!reachedTarget) {
        chapterBody.scrollTo({ left: targetLeft, top: 0, behavior: "auto" });
      }
      syncPagedSelection(direction);
      pagedTurnInFlight = false;
      const queuedDirection = queuedPagedTurns.shift() ?? null;
      if (queuedDirection !== null) {
        turnPage(queuedDirection);
      }
      return;
    }
    requestAnimationFrame(check);
  };
  requestAnimationFrame(check);
}

function pageStep(chapterBody = document.querySelector<HTMLElement>(".chapter-body")): number {
  if (chapterBody === null) {
    return 0;
  }
  const styles = window.getComputedStyle(chapterBody);
  const gap = Number.parseFloat(styles.columnGap) || 0;
  return Math.max(1, chapterBody.clientWidth + gap);
}

function hasOpenPanel(): boolean {
  return document.querySelector(".panel[data-open='true']") !== null;
}

function updateSearch(event: Event): void {
  const query = (event.target as HTMLInputElement).value;
  const library = requireLibrary();
  const selection = requireSelection();
  const results = searchLibrary(library, query)
    .filter((result) => result.bookId === selection.bookId)
    .slice(0, 20);
  const list = document.querySelector<HTMLElement>("#search-results");
  if (list === null) {
    return;
  }
  list.innerHTML = results.map(searchResultItem).join("");
  document.querySelectorAll<HTMLButtonElement>("[data-search-result]").forEach((button) => {
    button.addEventListener("click", () => {
      const chapterId = button.dataset.chapter;
      const anchorId = button.dataset.anchor;
      if (chapterId) {
        selectChapter(chapterId, anchorId);
      }
    });
  });
  const trimmed = query.trim();
  setText("#search-status", trimmed.length === 0 ? "" : results.length === 0 ? "没有结果" : `${results.length} 条结果`);
}

function searchResultItem(result: SearchResult): string {
  return `
    <li>
      <button type="button" data-search-result data-chapter="${escapeHtml(result.chapterId)}" data-anchor="${escapeHtml(result.anchorId)}">
        <strong>${escapeHtml(result.chapterTitle)}</strong>
        <span>${escapeHtml(result.snippet)}</span>
      </button>
    </li>
  `;
}

async function copyShare(): Promise<void> {
  const preview = document.querySelector<HTMLTextAreaElement>("#share-preview");
  if (preview === null) {
    return;
  }
  try {
    await navigator.clipboard.writeText(preview.value);
    setText("#share-status", "已复制。");
    announce("已复制。");
  } catch {
    preview.select();
    document.execCommand("copy");
    setText("#share-status", "已复制。");
  }
}

function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator)) {
    return;
  }
  void navigator.serviceWorker.register("./sw.js");
}

function openPanel(name: DialogName, trigger?: HTMLElement): void {
  showControls();
  lastPanelTrigger = trigger ?? lastPanelTrigger;
  const panel = document.querySelector<HTMLElement>(`[data-panel='${name}']`);
  if (panel === null) {
    return;
  }
  if (panel.dataset.open === "true") {
    closePanel(name);
    restorePanelFocus();
    return;
  }
  closeOpenPanels(name);
  panel.hidden = false;
  panel.dataset.open = "true";
  document.body.classList.add("panel-open");
  syncPanelLock();
  focusPanel(panel);
}

function closeOpenPanels(except?: DialogName): void {
  document.querySelectorAll<HTMLElement>(".panel[data-open='true']").forEach((panel) => {
    if (panel.dataset.panel !== except) {
      panel.hidden = true;
      delete panel.dataset.open;
    }
  });
  syncPanelLock();
}

function closePanel(name: DialogName, restoreFocus = false): void {
  const panel = document.querySelector<HTMLElement>(`[data-panel='${name}']`);
  if (panel !== null) {
    panel.hidden = true;
    delete panel.dataset.open;
  }
  syncPanelLock();
  if (restoreFocus) {
    restorePanelFocus();
  }
}

function syncPanelLock(): void {
  const openPanel = document.querySelector<HTMLElement>(".panel[data-open='true']");
  document.body.classList.toggle("panel-open", openPanel !== null);
  document.querySelectorAll<HTMLButtonElement>("[data-dialog]").forEach((button) => {
    const isOpen = button.dataset.dialog === openPanel?.dataset.panel;
    button.setAttribute("aria-pressed", String(isOpen));
    button.setAttribute("aria-expanded", String(isOpen));
  });
}

function resetPanelState(): void {
  document.body.classList.remove("panel-open");
  document.querySelectorAll<HTMLButtonElement>("[data-dialog]").forEach((button) => {
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-expanded", "false");
  });
}

function toggleControls(): void {
  const shell = document.querySelector<HTMLElement>(".reader-shell");
  if (shell?.dataset.controls === "visible") {
    hideControls();
    return;
  }
  showControls();
}

function showControls(): void {
  const shell = document.querySelector<HTMLElement>(".reader-shell");
  if (shell !== null) {
    shell.dataset.controls = "visible";
  }
}

function hideControls(): void {
  closeOpenPanels();
  const shell = document.querySelector<HTMLElement>(".reader-shell");
  if (shell !== null) {
    shell.dataset.controls = "hidden";
  }
}

function setReadingMode(mode: ReadingMode): void {
  const openPanelName = currentOpenPanelName();
  const controlsVisible = document.querySelector<HTMLElement>(".reader-shell")?.dataset.controls === "visible";
  const nextMode = mode === "paged" ? "paged" : "scroll";
  if (nextMode === state.readingMode) {
    return;
  }
  syncSelectionFromViewport();
  state.readingMode = nextMode;
  localStorage.setItem(`${storagePrefix}:reading-mode`, state.readingMode);
  applyReadingMode(state.readingMode);
  pendingPagedPosition = "start";
  renderReader();
  if (controlsVisible) {
    showControls();
  }
  if (openPanelName !== null) {
    openPanel(openPanelName);
  }
}

function currentOpenPanelName(): DialogName | null {
  const panelName = document.querySelector<HTMLElement>(".panel[data-open='true']")?.dataset.panel;
  return panelName === undefined ? null : (panelName as DialogName);
}

function focusPanel(panel: HTMLElement): void {
  queueMicrotask(() => {
    panel.querySelector<HTMLElement>("button, input, select, textarea, [tabindex]:not([tabindex='-1'])")?.focus();
  });
}

function restorePanelFocus(): void {
  queueMicrotask(() => {
    lastPanelTrigger?.focus();
  });
}

function loadReadingMode(): ReadingMode {
  return localStorage.getItem(`${storagePrefix}:reading-mode`) === "paged" ? "paged" : "scroll";
}

function loadSettings(): ReaderSettings {
  try {
    const raw = localStorage.getItem(`${storagePrefix}:settings`);
    return normalizeSettings(raw === null ? defaultSettings : JSON.parse(raw));
  } catch {
    return defaultSettings;
  }
}

function loadStoredSelection(bookId?: string): ReadingSelection | null {
  try {
    const raw = localStorage.getItem(`${storagePrefix}:progress${bookId ? `:${bookId}` : ""}`);
    return raw === null ? null : (JSON.parse(raw) as ReadingSelection);
  } catch {
    return null;
  }
}

function saveSelection(selection: ReadingSelection): void {
  const book = findBook(requireLibrary(), selection.bookId);
  const chapter = findChapter(book, selection.chapterId);
  const anchorIndex = chapter.blocks.findIndex((block) => block.id === selection.anchorId);
  const storedSelection = {
    ...selection,
    anchorIndex: anchorIndex >= 0 ? anchorIndex : selection.anchorIndex
  };
  localStorage.setItem(`${storagePrefix}:progress`, JSON.stringify(storedSelection));
  localStorage.setItem(`${storagePrefix}:progress:${selection.bookId}`, JSON.stringify(storedSelection));
  const anchor = chapter.blocks[anchorIndex] ?? chapter.blocks[0];
  const url = buildShareUrl(window.location.href, book.slug, chapter.id, anchor?.id ?? "");
  window.history.replaceState(null, "", url);
}

function applySettings(settings: ReaderSettings): void {
  document.documentElement.dataset.theme = settings.theme;
  document.documentElement.style.setProperty("--reader-size", `${settings.fontSize}px`);
  document.documentElement.style.setProperty("--reader-leading", String(settings.lineHeight));
  document.documentElement.style.setProperty("--reader-measure", `${settings.measure}rem`);
  document.documentElement.style.setProperty(
    "--reader-font",
    settings.fontFamily === "sans"
      ? 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif'
      : 'ui-serif, "Songti SC", "STSong", serif'
  );
}

function applyReadingMode(mode: ReadingMode): void {
  document.documentElement.dataset.readingMode = mode;
}

function rangeField(id: string, label: string, value: number, min: number, max: number, step: number): string {
  return `
    <div class="field">
      <label for="${id}">${label}</label>
      <input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" />
    </div>
  `;
}

function segment(value: string, label: string, active: string): string {
  return `<button type="button" data-value="${value}" aria-pressed="${value === active}">${label}</button>`;
}

function requireLibrary(): ReaderLibraryLike {
  if (state.library === null) {
    throw new Error("Library has not loaded.");
  }
  return state.library;
}

function requireSelection(): ReadingSelection {
  if (state.selection === null) {
    throw new Error("Selection has not loaded.");
  }
  return state.selection;
}

function findBook(library: ReaderLibraryLike, bookId: string): ReaderBookLike {
  const book = library.books.find((candidate) => candidate.id === bookId);
  if (book === undefined) {
    throw new Error(`Book not found: ${bookId}`);
  }
  return book;
}

function findChapter(book: ReaderBookLike, chapterId: string): ReaderChapterLike {
  const chapter = book.chapters.find((candidate) => candidate.id === chapterId);
  if (chapter === undefined) {
    throw new Error(`Chapter not found: ${chapterId}`);
  }
  return chapter;
}

function chapterLabel(book: ReaderBookLike, chapter: ReaderChapterLike): string {
  const number = chapter.chapter ?? book.chapters.findIndex((candidate) => candidate.id === chapter.id) + 1;
  return Number.isFinite(number) && number > 0 ? `第 ${number} 章` : "第 N 章";
}

function bind(selector: string, eventName: string, listener: EventListener): void {
  document.querySelector(selector)?.addEventListener(eventName, listener);
}

function setText(selector: string, value: string): void {
  const element = document.querySelector<HTMLElement>(selector);
  if (element !== null) {
    element.textContent = value;
  }
}

function announce(value: string): void {
  if (announcer !== null) {
    announcer.textContent = value;
  }
}

function icon(Icon: typeof BookOpen): string {
  return lucideIconToSvg(Icon);
}

function lucideIconToSvg(Icon: typeof BookOpen): string {
  const children = Icon.map(([tag, attrs]) => {
    const serializedAttrs = Object.entries(attrs)
      .map(([name, value]) => `${escapeHtml(name)}="${escapeHtml(String(value))}"`)
      .join(" ");
    return `<${tag} ${serializedAttrs}></${tag}>`;
  }).join("");
  return `<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${children}</svg>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

function cssEscape(value: string): string {
  return "CSS" in window && typeof CSS.escape === "function"
    ? CSS.escape(value)
    : value.replace(/["\\]/g, "\\$&");
}
