import path from "node:path";

import { describe, expect, test } from "vitest";

import { buildReaderLibrary } from "../../tools/reader-builder/src/build-library.js";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");

describe("workspace reader samples", () => {
  test("builds all registered novels for the reader-visible launch bundle", async () => {
    const library = await buildReaderLibrary(repositoryRoot, { profile: "reader" });

    expect(library.books.map((book) => book.id)).toEqual([
      "NOVEL-0001",
      "NOVEL-0002",
      "NOVEL-0003"
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
      },
      {
        id: "NOVEL-0003",
        chapters: [
          { id: "CHAPTER-0001", previous: null, next: "CHAPTER-0002", blocks: expect.any(Number) },
          { id: "CHAPTER-0002", previous: "CHAPTER-0001", next: "CHAPTER-0003", blocks: expect.any(Number) },
          { id: "CHAPTER-0003", previous: "CHAPTER-0002", next: "CHAPTER-0004", blocks: expect.any(Number) },
          { id: "CHAPTER-0004", previous: "CHAPTER-0003", next: "CHAPTER-0005", blocks: expect.any(Number) },
          { id: "CHAPTER-0005", previous: "CHAPTER-0004", next: "CHAPTER-0006", blocks: expect.any(Number) },
          { id: "CHAPTER-0006", previous: "CHAPTER-0005", next: "CHAPTER-0007", blocks: expect.any(Number) },
          { id: "CHAPTER-0007", previous: "CHAPTER-0006", next: "CHAPTER-0008", blocks: expect.any(Number) },
          { id: "CHAPTER-0008", previous: "CHAPTER-0007", next: "CHAPTER-0009", blocks: expect.any(Number) },
          { id: "CHAPTER-0009", previous: "CHAPTER-0008", next: "CHAPTER-0010", blocks: expect.any(Number) },
          { id: "CHAPTER-0010", previous: "CHAPTER-0009", next: "CHAPTER-0011", blocks: expect.any(Number) },
          { id: "CHAPTER-0011", previous: "CHAPTER-0010", next: "CHAPTER-0012", blocks: expect.any(Number) },
          { id: "CHAPTER-0012", previous: "CHAPTER-0011", next: null, blocks: expect.any(Number) }
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
