import { describe, expect, test } from "vitest";

import {
  buildFeedbackExport,
  buildShareUrl,
  normalizeSettings,
  readingProgress,
  resolveSelection,
  searchLibrary
} from "../../app/mobile-reader/src/reader-core.js";

const library = {
  schemaVersion: "0.1.0" as const,
  profile: "reader" as const,
  books: [
    {
      id: "NOVEL-0003",
      title: "雾醒时分",
      slug: "black-mist-awakening",
      status: "drafting",
      chapters: [
        {
          id: "CHAPTER-0001",
          title: "第一章 黑雾里有脚步声",
          volume: 1,
          chapter: 1,
          summary: "黑雾梦境里第一次出现脚步声。",
          contentVersion: "0.1.0",
          previousChapterId: null,
          nextChapterId: "CHAPTER-0002",
          blocks: [
            { id: "p-a", kind: "paragraph" as const, text: "黑雾里有脚步声。" },
            { id: "p-b", kind: "paragraph" as const, text: "南宫芸儿也听见了。" }
          ]
        },
        {
          id: "CHAPTER-0002",
          title: "第二章 她为什么不信",
          volume: 1,
          chapter: 2,
          summary: "温良试着解释黑雾梦境。",
          contentVersion: "0.1.0",
          previousChapterId: "CHAPTER-0001",
          nextChapterId: null,
          blocks: [
            { id: "p-c", kind: "paragraph" as const, text: "那支笔停在讲台旁边。" }
          ]
        }
      ]
    }
  ]
};

describe("mobile reader core", () => {
  test("URL selection overrides stored progress and invalid values fall back safely", () => {
    expect(
      resolveSelection(
        library,
        { book: "black-mist-awakening", chapter: "CHAPTER-0001", anchor: "p-b" },
        { bookId: "NOVEL-0003", chapterId: "CHAPTER-0002", anchorId: "p-c" }
      )
    ).toEqual({ bookId: "NOVEL-0003", chapterId: "CHAPTER-0001", anchorId: "p-b" });

    expect(
      resolveSelection(library, { book: "missing", chapter: "missing" }, null)
    ).toEqual({ bookId: "NOVEL-0003", chapterId: "CHAPTER-0001", anchorId: "p-a" });
  });

  test("falls back near the stored block index when an old anchor no longer exists", () => {
    expect(
      resolveSelection(library, {}, {
        bookId: "NOVEL-0003",
        chapterId: "CHAPTER-0001",
        anchorId: "p-old-after-text-edit",
        anchorIndex: 1
      })
    ).toEqual({
      bookId: "NOVEL-0003",
      chapterId: "CHAPTER-0001",
      anchorId: "p-b",
      anchorIndex: 1,
      anchorStatus: "missing_fallback"
    });
  });

  test("marks stale stored anchors when falling back to the first block", () => {
    expect(
      resolveSelection(library, {}, {
        bookId: "NOVEL-0003",
        chapterId: "CHAPTER-0001",
        anchorId: "p-deleted"
      })
    ).toEqual({
      bookId: "NOVEL-0003",
      chapterId: "CHAPTER-0001",
      anchorId: "p-a",
      anchorStatus: "missing_fallback"
    });
  });

  test("searches titles, summaries, and body text across books", () => {
    const results = searchLibrary(library, "讲台");

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      bookId: "NOVEL-0003",
      chapterId: "CHAPTER-0002",
      anchorId: "p-c"
    });
    expect(searchLibrary(library, "   ")).toEqual([]);
  });

  test("computes stable block progress", () => {
    const chapter = library.books[0]?.chapters[0];
    expect(chapter).toBeDefined();

    expect(readingProgress(chapter!, "p-a")).toBe(0.5);
    expect(readingProgress(chapter!, "p-b")).toBe(1);
    expect(readingProgress(chapter!, "missing")).toBe(0);
  });

  test("clamps typography settings to comfortable mobile limits", () => {
    expect(
      normalizeSettings({
        fontSize: 99,
        lineHeight: 0.5,
        measure: 200,
        theme: "unknown",
        fontFamily: "unknown"
      })
    ).toEqual({
      fontSize: 24,
      lineHeight: 1.4,
      measure: 46,
      theme: "paper",
      fontFamily: "serif"
    });
  });

  test.each(["system", "paper", "sepia", "night"] as const)(
    "accepts the %s reading theme",
    (theme) => {
      expect(normalizeSettings({ theme, fontFamily: "sans" })).toMatchObject({
        theme,
        fontFamily: "sans"
      });
    }
  );

  test.each(["sans", "serif"] as const)(
    "accepts the %s font family",
    (fontFamily) => {
      expect(normalizeSettings({ fontFamily })).toMatchObject({ fontFamily });
    }
  );

  test("builds a content-free reader feedback draft", () => {
    const feedback = buildFeedbackExport({
      novel: "NOVEL-0003",
      chapter: "CHAPTER-0002",
      anchor: "p-c",
      contentVersion: "0.1.0",
      blockContentHash: "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      category: "continuity",
      body: "The transition into this paragraph was hard to follow.",
      blocker: false,
      createdAt: "2026-07-16T09:30:00.000Z"
    });

    expect(feedback).toEqual({
      schema_version: "0.1.0",
      id: "FB-0000",
      record_type: "reader_feedback",
      owner: { novel_id: "NOVEL-0003" },
      status: "received",
      visibility: "internal",
      reader_profile: "reader",
      submitted_at: "2026-07-16T09:30:00.000Z",
      scope: {
        chapter_ids: ["CHAPTER-0002"],
        allowed_preceding_chapter_ids: [],
        source_revision: "reader-export"
      },
      observations: {
        comprehension: "Reader submitted localized continuity feedback.",
        confusion: ["The transition into this paragraph was hard to follow."],
        interest_loss: [],
        expectations: [],
        emotional_landing: "Not captured in quick reader export.",
        continue_reading: "Not captured in quick reader export."
      },
      evidence_locations: [
        {
          chapter_id: "CHAPTER-0002",
          block_id: "p-c",
          content_version: "0.1.0",
          block_content_hash: "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
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
    });
    expect(feedback).not.toHaveProperty("text");
    expect(feedback).not.toHaveProperty("content");
    expect(feedback).not.toHaveProperty("chapterText");
    expect(feedback).not.toHaveProperty("excerpt");
    expect(feedback).not.toHaveProperty("quote");
  });

  test("builds a shareable deep link without exposing internal paths", () => {
    expect(
      buildShareUrl(
        "https://story.example/reader/",
        "black-mist-awakening",
        "CHAPTER-0002",
        "p-c"
      )
    ).toBe(
      "https://story.example/reader/?book=black-mist-awakening&chapter=CHAPTER-0002&anchor=p-c"
    );
  });
});
