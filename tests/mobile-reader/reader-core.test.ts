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
      id: "NOVEL-0001",
      title: "死亡账户",
      slug: "death-account",
      status: "drafting",
      chapters: [
        {
          id: "CHAPTER-0001",
          title: "第一章 死亡客户来电",
          volume: 1,
          chapter: 1,
          summary: "系统第一次否认她活着。",
          contentVersion: "0.1.0",
          previousChapterId: null,
          nextChapterId: "CHAPTER-0002",
          blocks: [
            { id: "p-a", kind: "paragraph" as const, text: "死人给她打来电话。" },
            { id: "p-b", kind: "paragraph" as const, text: "门禁随后注销了她。" }
          ]
        },
        {
          id: "CHAPTER-0002",
          title: "第二章",
          volume: 1,
          chapter: 2,
          summary: "她寻找离线证据。",
          contentVersion: "0.1.0",
          previousChapterId: "CHAPTER-0001",
          nextChapterId: null,
          blocks: [
            { id: "p-c", kind: "paragraph" as const, text: "机械表还认得她。" }
          ]
        }
      ]
    },
    {
      id: "NOVEL-0002",
      title: "六百里夜驿",
      slug: "six-hundred-li-night-relay",
      status: "drafting",
      chapters: [
        {
          id: "CHAPTER-0001",
          title: "第一章 死驿发签",
          volume: 1,
          chapter: 1,
          summary: "死去的父亲发出急件。",
          contentVersion: "0.1.0",
          previousChapterId: null,
          nextChapterId: null,
          blocks: [
            { id: "p-d", kind: "paragraph" as const, text: "驿铃在封死的门后响了。" }
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
        { book: "six-hundred-li-night-relay", chapter: "CHAPTER-0001", anchor: "p-d" },
        { bookId: "NOVEL-0001", chapterId: "CHAPTER-0002", anchorId: "p-c" }
      )
    ).toEqual({ bookId: "NOVEL-0002", chapterId: "CHAPTER-0001", anchorId: "p-d" });

    expect(
      resolveSelection(library, { book: "missing", chapter: "missing" }, null)
    ).toEqual({ bookId: "NOVEL-0001", chapterId: "CHAPTER-0001", anchorId: "p-a" });
  });

  test("searches titles, summaries, and body text across books", () => {
    const results = searchLibrary(library, "机械表");

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      bookId: "NOVEL-0001",
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
      novel: "NOVEL-0001",
      chapter: "CHAPTER-0002",
      anchor: "p-c",
      contentVersion: "0.1.0",
      category: "continuity",
      body: "The transition into this paragraph was hard to follow.",
      blocker: false,
      createdAt: "2026-07-16T09:30:00.000Z"
    });

    expect(feedback).toEqual({
      recordType: "reader_feedback",
      novel: "NOVEL-0001",
      chapter: "CHAPTER-0002",
      anchor: "p-c",
      contentVersion: "0.1.0",
      category: "continuity",
      body: "The transition into this paragraph was hard to follow.",
      blocker: false,
      createdAt: "2026-07-16T09:30:00.000Z",
      status: "draft",
      canonEffect: "none"
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
        "death-account",
        "CHAPTER-0002",
        "p-c"
      )
    ).toBe(
      "https://story.example/reader/?book=death-account&chapter=CHAPTER-0002&anchor=p-c"
    );
  });
});
