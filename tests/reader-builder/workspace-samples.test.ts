import path from "node:path";

import { describe, expect, test } from "vitest";

import { buildReaderLibrary } from "../../tools/reader-builder/src/build-library.js";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");

describe("workspace reader samples", () => {
  test("builds both registered novels with three reader-visible sample chapters", async () => {
    const library = await buildReaderLibrary(repositoryRoot, { profile: "reader" });

    expect(library.books.map((book) => book.id)).toEqual([
      "NOVEL-0001",
      "NOVEL-0002"
    ]);
    expect(
      library.books.map((book) => ({
        id: book.id,
        chapters: book.chapters.map((chapter) => ({
          id: chapter.id,
          previous: chapter.previousChapterId,
          next: chapter.nextChapterId,
          blocks: chapter.blocks.length
        }))
      }))
    ).toEqual([
      {
        id: "NOVEL-0001",
        chapters: [
          { id: "CHAPTER-0001", previous: null, next: "CHAPTER-0002", blocks: expect.any(Number) },
          { id: "CHAPTER-0002", previous: "CHAPTER-0001", next: "CHAPTER-0003", blocks: expect.any(Number) },
          { id: "CHAPTER-0003", previous: "CHAPTER-0002", next: null, blocks: expect.any(Number) }
        ]
      },
      {
        id: "NOVEL-0002",
        chapters: [
          { id: "CHAPTER-0001", previous: null, next: "CHAPTER-0002", blocks: expect.any(Number) },
          { id: "CHAPTER-0002", previous: "CHAPTER-0001", next: "CHAPTER-0003", blocks: expect.any(Number) },
          { id: "CHAPTER-0003", previous: "CHAPTER-0002", next: null, blocks: expect.any(Number) }
        ]
      }
    ]);

    for (const book of library.books) {
      for (const chapter of book.chapters) {
        expect(chapter.blocks.length).toBeGreaterThanOrEqual(6);
      }
    }
  });
});
