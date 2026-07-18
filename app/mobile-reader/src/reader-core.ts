export type ReaderTheme = "system" | "paper" | "night" | "sepia";
export type ReaderFontFamily = "sans" | "serif";

export interface ReaderBlockLike {
  id: string;
  kind: "paragraph" | "divider";
  text: string;
  contentHash?: string;
}

export interface ReaderChapterLike {
  id: string;
  title: string;
  volume?: number;
  chapter?: number;
  summary: string;
  previousChapterId?: string | null;
  nextChapterId?: string | null;
  contentVersion?: string;
  blocks: ReaderBlockLike[];
}

export interface ReaderBookLike {
  id: string;
  title: string;
  slug: string;
  chapters: ReaderChapterLike[];
}

export interface ReaderLibraryLike {
  books: ReaderBookLike[];
}

export interface ReadingSelection {
  bookId: string;
  chapterId: string;
  anchorId: string;
  anchorIndex?: number;
  anchorStatus?: "missing_fallback";
}

export interface ReaderSettings {
  fontSize: number;
  lineHeight: number;
  measure: number;
  theme: ReaderTheme;
  fontFamily: ReaderFontFamily;
}

export interface FeedbackExportInput {
  novel: string;
  chapter: string;
  anchor: string | null;
  contentVersion: string;
  blockContentHash?: string;
  category: string;
  body: string;
  blocker: boolean;
  createdAt: string;
}

export interface FeedbackExport {
  schema_version: "0.1.0";
  id: "FB-0000";
  record_type: "reader_feedback";
  owner: { novel_id: string };
  status: "received";
  visibility: "internal";
  reader_profile: "reader";
  submitted_at: string;
  scope: {
    chapter_ids: string[];
    allowed_preceding_chapter_ids: string[];
    source_revision: "reader-export";
  };
  observations: {
    comprehension: string;
    confusion: string[];
    interest_loss: string[];
    expectations: string[];
    emotional_landing: string;
    continue_reading: string;
  };
  evidence_locations: Array<{
    chapter_id: string;
    block_id: string;
    content_version: string;
    block_content_hash: string;
  }>;
  suggested_actions: string[];
  linked_review_ids: string[];
  linked_change_request_ids: string[];
  processing: {
    status: "new";
    author_decision_id: null;
    notes: string;
  };
  canon_effect: "none";
}

export interface SearchResult {
  bookId: string;
  bookTitle: string;
  chapterId: string;
  chapterTitle: string;
  anchorId: string;
  snippet: string;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function firstSelection(library: ReaderLibraryLike): ReadingSelection {
  const book = library.books[0];
  const chapter = book?.chapters[0];
  const anchor = chapter?.blocks[0];
  if (book === undefined || chapter === undefined || anchor === undefined) {
    return { bookId: "", chapterId: "", anchorId: "" };
  }
  return { bookId: book.id, chapterId: chapter.id, anchorId: anchor.id };
}

function validSelection(
  library: ReaderLibraryLike,
  bookIdOrSlug: string | undefined,
  chapterId: string | undefined,
  anchorId: string | undefined,
  anchorIndex?: number
): ReadingSelection | null {
  if (bookIdOrSlug === undefined || chapterId === undefined) {
    return null;
  }
  const book = library.books.find(
    (candidate) => candidate.id === bookIdOrSlug || candidate.slug === bookIdOrSlug
  );
  const chapter = book?.chapters.find((candidate) => candidate.id === chapterId);
  if (book === undefined || chapter === undefined || chapter.blocks.length === 0) {
    return null;
  }
  const exactIndex = chapter.blocks.findIndex((candidate) => candidate.id === anchorId);
  const fallbackIndex =
    exactIndex >= 0
      ? exactIndex
      : typeof anchorIndex === "number"
        ? clamp(Math.trunc(anchorIndex), 0, chapter.blocks.length - 1)
        : 0;
  const anchor = chapter.blocks[fallbackIndex];
  const selection: ReadingSelection = {
    bookId: book.id,
    chapterId: chapter.id,
    anchorId: anchor?.id ?? ""
  };
  if (exactIndex < 0 && typeof anchorIndex === "number") {
    selection.anchorIndex = fallbackIndex;
  }
  if (exactIndex < 0 && anchorId !== undefined) {
    selection.anchorStatus = "missing_fallback";
  }
  return selection;
}

export function resolveSelection(
  library: ReaderLibraryLike,
  url: { book?: string; chapter?: string; anchor?: string },
  stored: ReadingSelection | null
): ReadingSelection {
  const fromUrl = validSelection(library, url.book, url.chapter, url.anchor);
  if (fromUrl !== null) {
    return fromUrl;
  }
  if (url.book !== undefined || url.chapter !== undefined) {
    return firstSelection(library);
  }
  const fromStorage = validSelection(
    library,
    stored?.bookId,
    stored?.chapterId,
    stored?.anchorId,
    stored?.anchorIndex
  );
  return fromStorage ?? firstSelection(library);
}

export function searchLibrary(
  library: ReaderLibraryLike,
  rawQuery: string
): SearchResult[] {
  const query = rawQuery.trim().toLocaleLowerCase();
  if (query.length === 0) {
    return [];
  }
  const results: SearchResult[] = [];
  for (const book of library.books) {
    for (const chapter of book.chapters) {
      const titleMatch = `${book.title} ${chapter.title} ${chapter.summary}`
        .toLocaleLowerCase()
        .includes(query);
      const matchingBlocks = chapter.blocks.filter((block) =>
        block.text.toLocaleLowerCase().includes(query)
      );
      const selectedBlocks =
        matchingBlocks.length > 0
          ? matchingBlocks
          : titleMatch && chapter.blocks[0] !== undefined
            ? [chapter.blocks[0]]
            : [];
      for (const block of selectedBlocks) {
        results.push({
          bookId: book.id,
          bookTitle: book.title,
          chapterId: chapter.id,
          chapterTitle: chapter.title,
          anchorId: block.id,
          snippet: block.text.length > 120 ? `${block.text.slice(0, 117)}...` : block.text
        });
      }
    }
  }
  return results;
}

export function readingProgress(
  chapter: ReaderChapterLike,
  anchorId: string
): number {
  const index = chapter.blocks.findIndex((block) => block.id === anchorId);
  return index < 0 || chapter.blocks.length === 0
    ? 0
    : (index + 1) / chapter.blocks.length;
}

export function normalizeSettings(input: {
  fontSize?: number;
  lineHeight?: number;
  measure?: number;
  theme?: string;
  fontFamily?: string;
}): ReaderSettings {
  const theme: ReaderTheme = ["system", "paper", "night", "sepia"].includes(
    input.theme ?? ""
  )
    ? (input.theme as ReaderTheme)
    : "paper";
  const fontFamily: ReaderFontFamily = ["sans", "serif"].includes(
    input.fontFamily ?? ""
  )
    ? (input.fontFamily as ReaderFontFamily)
    : "serif";
  return {
    fontSize: clamp(Number.isFinite(input.fontSize) ? input.fontSize! : 18, 14, 24),
    lineHeight: clamp(
      Number.isFinite(input.lineHeight) ? input.lineHeight! : 1.8,
      1.4,
      2.2
    ),
    measure: clamp(Number.isFinite(input.measure) ? input.measure! : 38, 28, 46),
    theme,
    fontFamily
  };
}

export function buildFeedbackExport(input: FeedbackExportInput): FeedbackExport {
  const fallbackHash = "sha256:0000000000000000000000000000000000000000000000000000000000000000";
  return {
    schema_version: "0.1.0",
    id: "FB-0000",
    record_type: "reader_feedback",
    owner: { novel_id: input.novel },
    status: "received",
    visibility: "internal",
    reader_profile: "reader",
    submitted_at: input.createdAt,
    scope: {
      chapter_ids: [input.chapter],
      allowed_preceding_chapter_ids: [],
      source_revision: "reader-export"
    },
    observations: {
      comprehension: `Reader submitted localized ${input.category} feedback.`,
      confusion: [input.body],
      interest_loss: input.blocker ? [input.body] : [],
      expectations: [],
      emotional_landing: "Not captured in quick reader export.",
      continue_reading: "Not captured in quick reader export."
    },
    evidence_locations: [
      {
        chapter_id: input.chapter,
        block_id: input.anchor ?? "",
        content_version: input.contentVersion,
        block_content_hash: input.blockContentHash ?? fallbackHash
      }
    ],
    suggested_actions: [],
    linked_review_ids: [],
    linked_change_request_ids: [],
    processing: {
      status: "new",
      author_decision_id: null,
      notes: ""
    },
    canon_effect: "none"
  };
}

export function buildShareUrl(
  baseUrl: string,
  bookSlug: string,
  chapterId: string,
  anchorId: string
): string {
  const url = new URL(baseUrl);
  url.searchParams.set("book", bookSlug);
  url.searchParams.set("chapter", chapterId);
  url.searchParams.set("anchor", anchorId);
  return url.toString();
}
