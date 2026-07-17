import { readFile } from "node:fs/promises";
import path from "node:path";

import Ajv2020 from "ajv/dist/2020.js";
import type { AnySchema } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, test } from "vitest";

const root = path.resolve(import.meta.dirname, "../..");

async function schema(relativePath: string): Promise<AnySchema> {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8")) as AnySchema;
}

async function validator() {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  ajv.addSchema(await schema("schemas/common.schema.json"));
  return ajv.compile(await schema("schemas/manuscript.schema.json"));
}

function validChapter() {
  return {
    schema_version: "0.1.0",
    id: "CHAPTER-0001",
    document_type: "chapter",
    novel_id: "NOVEL-0001",
    title: "第一章 死亡客户来电",
    volume: 1,
    chapter: 1,
    status: "revised",
    visibility: "reader",
    summary: "死亡核验师接到一个已死亡客户的求救电话。",
    content_version: "0.1.0",
    word_count: 3200,
    previous_chapter_id: null,
    next_chapter_id: "CHAPTER-0002"
  };
}

describe("manuscript chapter schema", () => {
  test("accepts ordered, versioned chapter frontmatter", async () => {
    const validate = await validator();

    expect(validate(validChapter()), JSON.stringify(validate.errors)).toBe(true);
  });

  test("rejects a chapter without a visibility profile", async () => {
    const validate = await validator();
    const chapter = validChapter() as Record<string, unknown>;
    delete chapter.visibility;

    expect(validate(chapter)).toBe(false);
    expect(validate.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ keyword: "required" })
      ])
    );
  });

  test("rejects an impossible chapter number", async () => {
    const validate = await validator();
    const chapter = { ...validChapter(), chapter: 0 };

    expect(validate(chapter)).toBe(false);
    expect(validate.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ instancePath: "/chapter", keyword: "minimum" })
      ])
    );
  });

  test("rejects unknown publication fields", async () => {
    const validate = await validator();
    const chapter = { ...validChapter(), secret_future_twist: "leak" };

    expect(validate(chapter)).toBe(false);
    expect(validate.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ keyword: "additionalProperties" })
      ])
    );
  });
});
