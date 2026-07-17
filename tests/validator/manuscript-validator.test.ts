import { cp, mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { stringify } from "yaml";
import { afterEach, describe, expect, test } from "vitest";

import { createNovel } from "../../tools/scaffolder/src/create-novel.js";
import { validateWorkspace } from "../../tools/validator/src/validate-workspace.js";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))
  );
});

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), "story-os-manuscript-"));
  roots.push(root);
  await mkdir(path.join(root, "workspace"), { recursive: true });
  await writeFile(
    path.join(root, "workspace", "manifest.yaml"),
    stringify({
      schema_version: "0.1.0",
      workspace_id: "WORKSPACE-0001",
      name: "Story OS Workspace",
      description: "Multi-novel, file-first fiction development workspace.",
      locale: {
        interface_language: "zh-CN",
        writing_language: "zh-CN",
        machine_field_language: "en",
        timezone: "Asia/Shanghai"
      },
      repository: {
        provider: "github",
        url: "https://github.com/Single-stars/Story.git",
        default_branch: "main"
      },
      authority: {
        canon_approver: "author",
        ai_may_promote_canon: false,
        feedback_may_edit_canon: false
      },
      defaults: {
        visibility: "internal",
        novel_status: "planning",
        canon_status: "proposed",
        reader_profile: "internal",
        structure_lenses: [
          "snowflake",
          "want-need-wound-lie",
          "scene-sequel",
          "story-grid-five-commandments"
        ]
      },
      active_novel_id: null,
      novels: [],
      universes: [],
      series: [],
      id_counters: {
        universe: 0,
        series: 0,
        novel: 0
      },
      paths: {
        novels: "novels",
        universes: "universes",
        series: "workspace/series",
        schemas: "schemas",
        templates: "templates",
        skills: ".agents/skills",
        generated: ".generated"
      },
      validation: {
        required_before_commit: true,
        required_before_publish: true,
        block_publish_on_error: true
      },
      sharing: {
        default_posture: "private",
        profiles: ["internal", "editor", "reader", "public"]
      }
    }),
    "utf8"
  );
  await Promise.all([
    cp(path.join(repositoryRoot, "schemas"), path.join(root, "schemas"), {
      recursive: true
    }),
    cp(path.join(repositoryRoot, "templates"), path.join(root, "templates"), {
      recursive: true
    })
  ]);
  const novel = await createNovel(root, {
    title: "Fixture Novel",
    slug: "fixture-novel"
  });
  return { root, novelRoot: path.join(root, novel.novelPath) };
}

function chapter(
  id: string,
  order: number,
  overrides: Record<string, unknown> = {}
) {
  return {
    schema_version: "0.1.0",
    id,
    document_type: "chapter",
    novel_id: "NOVEL-0001",
    title: `Chapter ${order}`,
    volume: 1,
    chapter: order,
    status: "revised",
    visibility: "reader",
    summary: `Summary ${order}.`,
    content_version: "0.1.0",
    word_count: 12,
    previous_chapter_id: null,
    next_chapter_id: null,
    ...overrides
  };
}

async function writeChapter(
  novelRoot: string,
  fileName: string,
  frontmatter: Record<string, unknown>
) {
  await writeFile(
    path.join(novelRoot, "manuscript", fileName),
    `---\n${stringify(frontmatter)}---\n\n# ${String(frontmatter.title)}\n\nChapter body.\n`,
    "utf8"
  );
}

describe("workspace manuscript validation", () => {
  test("accepts a valid chapter document", async () => {
    const { root, novelRoot } = await fixture();
    await writeChapter(novelRoot, "chapter-0001.md", chapter("CHAPTER-0001", 1));

    const report = await validateWorkspace(root);

    expect(report.errors).toEqual([]);
    expect(report.ok).toBe(true);
    expect(report.stats.chapters).toBe(1);
  });

  test("rejects a chapter owned by another novel", async () => {
    const { root, novelRoot } = await fixture();
    await writeChapter(
      novelRoot,
      "chapter-0001.md",
      chapter("CHAPTER-0001", 1, { novel_id: "NOVEL-0002" })
    );

    const report = await validateWorkspace(root);

    expect(report.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "CHAPTER_NOVEL_MISMATCH" })
      ])
    );
  });

  test("rejects duplicate chapter ids and narrative positions", async () => {
    const { root, novelRoot } = await fixture();
    await writeChapter(novelRoot, "chapter-a.md", chapter("CHAPTER-0001", 1));
    await writeChapter(novelRoot, "chapter-b.md", chapter("CHAPTER-0001", 1));

    const report = await validateWorkspace(root);
    const codes = report.errors.map((issue) => issue.code);

    expect(codes).toContain("DUPLICATE_CHAPTER_ID");
    expect(codes).toContain("DUPLICATE_CHAPTER_POSITION");
  });

  test("rejects a chapter link that does not exist", async () => {
    const { root, novelRoot } = await fixture();
    await writeChapter(
      novelRoot,
      "chapter-0001.md",
      chapter("CHAPTER-0001", 1, { next_chapter_id: "CHAPTER-0002" })
    );

    const report = await validateWorkspace(root);

    expect(report.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "CHAPTER_LINK_NOT_FOUND" })
      ])
    );
  });
});
