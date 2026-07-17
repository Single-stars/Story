import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import Ajv2020 from "ajv/dist/2020.js";
import type { AnySchema } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, test } from "vitest";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

async function loadSchema(relativePath: string): Promise<AnySchema> {
  return JSON.parse(
    await readFile(path.join(repositoryRoot, relativePath), "utf8")
  ) as AnySchema;
}

async function createValidator() {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  ajv.addSchema(await loadSchema("schemas/common.schema.json"));
  return ajv.compile(await loadSchema("schemas/novel-manifest.schema.json"));
}

function validManifest(): Record<string, unknown> {
  return {
    schema_version: "0.1.0",
    novel_id: "NOVEL-0001",
    title: "死亡账户",
    slug: "death-account",
    status: "planning",
    language: "zh-CN",
    genre: {
      primary: "科技悬疑",
      secondary: ["近未来惊悚"],
      target_readers: "偏爱高概念都市悬疑的成年读者",
      promises: ["前三章建立不可逆身份危机", "谜题答案遵守已声明规则"]
    },
    premise: {
      status: "proposed",
      logline: "死亡核验师发现全城记录都证明她已经死亡。",
      theme_question: "当制度定义了人的存在，身体还能证明什么？",
      core_conflict: "她必须在身份被彻底注销前证明自己活着。"
    },
    structure: {
      lenses: ["snowflake", "scene-sequel"],
      intended_length_words: 180000,
      volumes: 1
    },
    dependencies: {
      universe_refs: [],
      series_id: null
    },
    current_focus: {
      volume: 1,
      chapter: 1,
      scene_id: null,
      note: "Build the opening proof chain."
    },
    paths: {
      canon: "canon",
      narrative: "narrative",
      manuscript: "manuscript",
      research: "research",
      decisions: "decisions",
      feedback: "feedback",
      reports: "reports"
    },
    sharing: {
      default_profile: "internal",
      allow_offline_reader: false
    }
  };
}

describe("novel manifest schema", () => {
  test("accepts a complete novel manifest", async () => {
    const validate = await createValidator();
    const manifest = validManifest();

    expect(validate(manifest), JSON.stringify(validate.errors)).toBe(true);
  });

  test("requires at least one concrete genre promise", async () => {
    const validate = await createValidator();
    const manifest = validManifest();
    (manifest.genre as Record<string, unknown>).promises = [];

    expect(validate(manifest)).toBe(false);
    expect(validate.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          instancePath: "/genre/promises",
          keyword: "minItems"
        })
      ])
    );
  });

  test("rejects an invalid series id", async () => {
    const validate = await createValidator();
    const manifest = validManifest();
    (manifest.dependencies as Record<string, unknown>).series_id = "SERIES-one";

    expect(validate(manifest)).toBe(false);
    expect(validate.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          instancePath: "/dependencies/series_id",
          keyword: "pattern"
        })
      ])
    );
  });

  test("rejects AI-ready canon as the initial premise status", async () => {
    const validate = await createValidator();
    const manifest = validManifest();
    (manifest.premise as Record<string, unknown>).status = "canon";

    expect(validate(manifest)).toBe(false);
    expect(validate.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          instancePath: "/premise/status",
          keyword: "enum"
        })
      ])
    );
  });
});
