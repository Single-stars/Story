import {
  ArrowLeft,
  BookOpen,
  Download,
  List,
  MessageSquare,
  Moon,
  Search,
  Settings,
  Share2,
  X
} from "lucide";

import {
  buildFeedbackExport,
  buildShareUrl,
  normalizeSettings,
  readingProgress,
  resolveSelection,
  searchLibrary,
  type ReaderBookLike,
  type ReaderChapterLike,
  type ReaderLibraryLike,
  type ReaderSettings,
  type ReadingSelection
} from "./reader-core.js";

type DialogName = "目录" | "搜索" | "阅读设置" | "分享" | "反馈" | "离线";

interface ReaderAppState {
  library: ReaderLibraryLike | null;
  selection: ReadingSelection | null;
  settings: ReaderSettings;
  status: string;
  cached: boolean;
}

const root = document.querySelector<HTMLElement>("#main-content");
const announcer = document.querySelector<HTMLElement>("#announcer");
const storagePrefix = "story-reader";
const defaultSettings = normalizeSettings({});

const state: ReaderAppState = {
  library: null,
  selection: null,
  settings: loadSettings(),
  status: "正在打开书架...",
  cached: false
};

if (root === null) {
  throw new Error("Reader root is missing.");
}

applySettings(state.settings);
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
    saveSelection(state.selection);
    renderReader();
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

function renderLoading(): void {
  root.innerHTML = `
    <section class="loading-state" aria-live="polite" aria-busy="true">
      <img class="boot-mark" src="./icon-192.png" alt="" width="64" height="64" />
      <p>${state.status}</p>
    </section>
  `;
}

function renderEmpty(): void {
  root.innerHTML = `
    <section class="empty-state">
      <img class="brand-mark" src="./icon-192.png" alt="" width="64" height="64" />
      <h1>书架</h1>
      <p>当前 profile 没有可阅读的作品。</p>
    </section>
  `;
}

function renderError(message: string): void {
  root.innerHTML = `
    <section class="error-state" role="alert">
      <img class="brand-mark" src="./icon-192.png" alt="" width="64" height="64" />
      <h1>无法加载阅读器</h1>
      <p>${escapeHtml(message)}</p>
      <button class="action-button" data-action="retry">重试</button>
    </section>
  `;
  bind("[data-action='retry']", "click", () => void boot());
}

function renderReader(): void {
  const library = requireLibrary();
  const selection = requireSelection();
  const book = findBook(library, selection.bookId);
  const chapter = findChapter(book, selection.chapterId);
  const progress = Math.round(readingProgress(chapter, selection.anchorId) * 100);
  const previous = chapter.previousChapterId
    ? book.chapters.find((candidate) => candidate.id === chapter.previousChapterId)
    : null;
  const next = chapter.nextChapterId
    ? book.chapters.find((candidate) => candidate.id === chapter.nextChapterId)
    : null;

  root.innerHTML = `
    <section class="reader-shell">
      <header class="reader-topbar">
        <button class="icon-button" type="button" title="书架" aria-label="书架" data-action="shelf">${icon(ArrowLeft)}</button>
        <div class="reader-title">
          <strong>${escapeHtml(book.title)}</strong>
          <span>${escapeHtml(chapter.title)}</span>
        </div>
        <span class="status-chip optional">${state.cached ? "已缓存" : "在线"}</span>
      </header>
      <article>
        <header class="chapter-header">
          <p class="eyebrow">${escapeHtml(book.title)} · ${progress}%</p>
          <h1>${escapeHtml(chapter.title)}</h1>
          <p>${escapeHtml(chapter.summary)}</p>
        </header>
        <div class="chapter-body">
          ${chapter.blocks
            .map((block) =>
              block.kind === "divider"
                ? `<p id="${escapeHtml(block.id)}" class="divider">＊</p>`
                : `<p id="${escapeHtml(block.id)}">${escapeHtml(block.text)}</p>`
            )
            .join("")}
        </div>
        <nav class="chapter-nav" aria-label="章节导航">
          <button class="chapter-link" type="button" data-chapter="${previous?.id ?? ""}" ${previous === null ? "disabled" : ""}>上一章</button>
          <button class="chapter-link" type="button" data-chapter="${next?.id ?? ""}" ${next === null ? "disabled" : ""}>下一章</button>
        </nav>
      </article>
      ${toolbar()}
      ${dialog("toc-panel", "目录", tocContent(book, chapter))}
      ${dialog("search-panel", "搜索", searchContent())}
      ${dialog("settings-panel", "阅读设置", settingsContent())}
      ${dialog("share-panel", "分享", shareContent(book, chapter, selection))}
      ${dialog("feedback-panel", "反馈", feedbackContent(book, chapter, selection))}
      ${dialog("offline-panel", "离线", offlineContent())}
    </section>
  `;

  bindReaderEvents();
  queueMicrotask(() => document.getElementById(selection.anchorId)?.scrollIntoView({ block: "start" }));
}

function toolbar(): string {
  return `
    <nav class="reader-toolbar" aria-label="阅读工具">
      ${toolButton("目录", List)}
      ${toolButton("搜索", Search)}
      ${toolButton("阅读设置", Settings)}
      ${toolButton("分享", Share2)}
      ${toolButton("反馈", MessageSquare)}
      ${toolButton("离线", Download)}
    </nav>
  `;
}

function toolButton(label: DialogName, Icon: typeof BookOpen): string {
  return `<button type="button" data-dialog="${label}" aria-label="${label}" title="${label}">${icon(Icon)}<span>${label}</span></button>`;
}

function dialog(id: string, title: DialogName, content: string): string {
  return `
    <dialog id="${id}" class="panel" data-panel="${title}">
      <div class="panel-header">
        <h2>${title}</h2>
        <button class="icon-button" type="button" data-close="${title}" aria-label="关闭${title}" title="关闭">${icon(X)}</button>
      </div>
      <div class="panel-body">${content}</div>
    </dialog>
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
                <strong>${escapeHtml(chapter.title)}</strong><br />
                <span class="muted">${escapeHtml(chapter.summary)}</span>
              </button>
            </li>
          `
        )
        .join("")}
    </ul>
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

function settingsContent(): string {
  return `
    <div class="settings-grid">
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

function shareContent(
  book: ReaderBookLike,
  chapter: ReaderChapterLike,
  selection: ReadingSelection
): string {
  const shareUrl = buildShareUrl(window.location.href, book.slug, chapter.id, selection.anchorId);
  return `
    <p class="muted">分享链接只指向当前书籍、章节和段落锚点。</p>
    <div class="field">
      <label for="share-preview">预览</label>
      <textarea id="share-preview" readonly>${escapeHtml(shareUrl)}</textarea>
    </div>
    <div class="panel-actions">
      <button class="action-button" type="button" data-action="confirm-share">确认分享</button>
      <button class="action-button secondary" type="button" data-action="copy-share">复制链接</button>
    </div>
    <p class="inline-status" id="share-status"></p>
  `;
}

function feedbackContent(
  book: ReaderBookLike,
  chapter: ReaderChapterLike,
  selection: ReadingSelection
): string {
  const draft = localStorage.getItem(`${storagePrefix}:feedback`) ?? "";
  return `
    <form class="feedback-form" id="feedback-form">
      <div class="field">
        <label for="feedback-category">类型</label>
        <select id="feedback-category">
          <option value="confusion">看不懂</option>
          <option value="continuity">连续性</option>
          <option value="pace">节奏</option>
          <option value="emotion">情绪</option>
        </select>
      </div>
      <div class="field">
        <label for="feedback-body">反馈</label>
        <textarea id="feedback-body">${escapeHtml(draft)}</textarea>
      </div>
      <label><input id="feedback-blocker" type="checkbox" /> 阻碍继续阅读</label>
      <div class="panel-actions">
        <button class="action-button" type="submit">导出 JSON</button>
      </div>
      <p class="inline-status" id="feedback-status" data-book="${escapeHtml(book.id)}" data-chapter="${escapeHtml(chapter.id)}" data-anchor="${escapeHtml(selection.anchorId)}"></p>
    </form>
  `;
}

function offlineContent(): string {
  return `
    <p class="muted">离线缓存需要手动确认，阅读器不会在安装时静默缓存正文。</p>
    <button class="action-button" type="button" data-action="cache-library">缓存已授权内容</button>
    <p class="inline-status" id="offline-status"></p>
  `;
}

function bindReaderEvents(): void {
  bind("[data-action='shelf']", "click", renderShelf);
  document.querySelectorAll<HTMLButtonElement>("[data-dialog]").forEach((button) => {
    button.addEventListener("click", () => openPanel(button.dataset.dialog as DialogName));
  });
  document.querySelectorAll<HTMLButtonElement>("[data-close]").forEach((button) => {
    button.addEventListener("click", () => closePanel(button.dataset.close as DialogName));
  });
  document.querySelectorAll<HTMLButtonElement>("[data-chapter]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.chapter) {
        selectChapter(button.dataset.chapter);
      }
    });
  });
  bind("#reader-search", "input", updateSearch);
  bind("[data-action='confirm-share']", "click", shareCurrent);
  bind("[data-action='copy-share']", "click", copyShare);
  bind("#feedback-form", "submit", exportFeedback);
  bind("#feedback-body", "input", (event) => {
    localStorage.setItem(`${storagePrefix}:feedback`, (event.target as HTMLTextAreaElement).value);
  });
  bind("[data-action='cache-library']", "click", cacheLibrary);
  bindSettings();
}

function renderShelf(): void {
  const library = requireLibrary();
  root.innerHTML = `
    <section class="shelf">
      <header class="app-header">
        <div class="brand">
          <img class="brand-mark" src="./icon-192.png" alt="" width="48" height="48" />
          <div class="brand-copy"><strong>书架</strong><span>Story OS Reader</span></div>
        </div>
        <span class="status-chip">${library.books.length} 本</span>
      </header>
      <div class="shelf-header">
        <div>
          <h1>书架</h1>
          <p>仅显示当前 profile 授权的作品。</p>
        </div>
      </div>
      <ul class="book-list">
        ${library.books
          .map((book) => {
            const stored = loadStoredSelection(book.id);
            const chapter = book.chapters.find((candidate) => candidate.id === stored?.chapterId) ?? book.chapters[0];
            return `
              <li class="book-card">
                <div class="book-card-main">
                  <h2>${escapeHtml(book.title)}</h2>
                  <p class="book-meta">${book.chapters.length} 章 · ${escapeHtml(chapter?.title ?? "暂无章节")}</p>
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

function updateSearch(event: Event): void {
  const input = event.target as HTMLInputElement;
  const library = requireLibrary();
  const selection = requireSelection();
  const currentBook = findBook(library, selection.bookId);
  const results = searchLibrary({ books: [currentBook] }, input.value);
  const list = document.querySelector<HTMLElement>("#search-results");
  const status = document.querySelector<HTMLElement>("#search-status");
  if (list === null || status === null) {
    return;
  }
  status.textContent = results.length === 0 ? "没有结果" : `${results.length} 个结果`;
  list.innerHTML = results
    .map(
      (result) => `
        <li>
          <button type="button" data-chapter="${escapeHtml(result.chapterId)}" data-anchor="${escapeHtml(result.anchorId)}">
            <strong>${escapeHtml(result.chapterTitle)}</strong><br />
            <span class="muted">${escapeHtml(result.snippet)}</span>
          </button>
        </li>
      `
    )
    .join("");
  list.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
    button.addEventListener("click", () => selectChapter(button.dataset.chapter ?? "", button.dataset.anchor));
  });
}

function selectBook(bookId: string): void {
  const library = requireLibrary();
  const stored = loadStoredSelection(bookId);
  const book = findBook(library, bookId);
  const chapter = book.chapters.find((candidate) => candidate.id === stored?.chapterId) ?? book.chapters[0];
  const anchor = chapter?.blocks.find((block) => block.id === stored?.anchorId) ?? chapter?.blocks[0];
  state.selection = {
    bookId,
    chapterId: chapter?.id ?? "",
    anchorId: anchor?.id ?? ""
  };
  saveSelection(state.selection);
  renderReader();
}

function selectChapter(chapterId: string, anchorId?: string): void {
  const library = requireLibrary();
  const selection = requireSelection();
  const book = findBook(library, selection.bookId);
  const chapter = findChapter(book, chapterId);
  state.selection = {
    bookId: book.id,
    chapterId: chapter.id,
    anchorId: anchorId ?? chapter.blocks[0]?.id ?? ""
  };
  saveSelection(state.selection);
  renderReader();
}

async function shareCurrent(): Promise<void> {
  const shareText = (document.querySelector<HTMLTextAreaElement>("#share-preview")?.value ?? "").trim();
  try {
    if ("share" in navigator) {
      await navigator.share({ title: document.title, url: shareText });
    } else {
      await navigator.clipboard.writeText(shareText);
    }
    setText("#share-status", "已准备分享。");
  } catch {
    setText("#share-status", "分享失败，可复制链接。");
  }
}

async function copyShare(): Promise<void> {
  const shareText = (document.querySelector<HTMLTextAreaElement>("#share-preview")?.value ?? "").trim();
  await navigator.clipboard.writeText(shareText);
  setText("#share-status", "已复制。");
}

function exportFeedback(event: Event): void {
  event.preventDefault();
  const selection = requireSelection();
  const library = requireLibrary();
  const book = findBook(library, selection.bookId);
  const chapter = findChapter(book, selection.chapterId);
  const body = document.querySelector<HTMLTextAreaElement>("#feedback-body")?.value ?? "";
  const category = document.querySelector<HTMLSelectElement>("#feedback-category")?.value ?? "confusion";
  const blocker = document.querySelector<HTMLInputElement>("#feedback-blocker")?.checked ?? false;
  const feedback = buildFeedbackExport({
    novel: book.id,
    chapter: chapter.id,
    anchor: selection.anchorId,
    contentVersion: "contentVersion" in chapter ? String(chapter.contentVersion) : "unknown",
    category,
    body,
    blocker,
    createdAt: new Date().toISOString()
  });
  downloadJson(`feedback-${book.id}-${chapter.id}.json`, feedback);
  localStorage.setItem(`${storagePrefix}:feedback`, body);
  setText("#feedback-status", "反馈 JSON 已导出。");
}

function cacheLibrary(): void {
  const controller = navigator.serviceWorker?.controller;
  if (controller === undefined || controller === null) {
    setText("#offline-status", "离线缓存失败：Service Worker 尚未接管。");
    return;
  }
  controller.postMessage({ type: "CACHE_LIBRARY" });
  setText("#offline-status", "正在缓存...");
}

function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator)) {
    return;
  }
  void navigator.serviceWorker.register("./sw.js");
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type !== "CACHE_LIBRARY_RESULT") {
      return;
    }
    state.cached = Boolean(event.data.ok);
    setText("#offline-status", event.data.ok ? "已缓存授权书库。" : `离线缓存失败：${event.data.message}`);
    announce(event.data.ok ? "离线缓存完成。" : "离线缓存失败。");
  });
}

function openPanel(name: DialogName): void {
  document.querySelector<HTMLDialogElement>(`[data-panel='${name}']`)?.showModal();
}

function closePanel(name: DialogName): void {
  document.querySelector<HTMLDialogElement>(`[data-panel='${name}']`)?.close();
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
  localStorage.setItem(`${storagePrefix}:progress`, JSON.stringify(selection));
  localStorage.setItem(`${storagePrefix}:progress:${selection.bookId}`, JSON.stringify(selection));
  const book = findBook(requireLibrary(), selection.bookId);
  const chapter = findChapter(book, selection.chapterId);
  const anchor = chapter.blocks.find((block) => block.id === selection.anchorId) ?? chapter.blocks[0];
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
  return Icon.toSvg({ "aria-hidden": "true", focusable: "false" });
}

function downloadJson(filename: string, value: unknown): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
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
