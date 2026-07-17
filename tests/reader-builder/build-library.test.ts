import { cp, mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { stringify } from "yaml";
import { afterEach, describe, expect, test } from "vitest";

import { buildReaderLibrary } from "../../tools/reader-builder/src/build-library.js";
import { createNovel } from "../../tools/scaffolder/src/create-novel.js";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))
  );
});

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), "story-os-reader-"));
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
    cp(path.join(repositoryRoot, "templates"), path.join(root, "templates"), {
      recursive: true
    }),
    cp(path.join(repositoryRoot, "schemas"), path.join(root, "schemas"), {
      recursive: true
    })
  ]);
  const first = await createNovel(root, { title: "First Book", slug: "first-book" });
  const second = await createNovel(root, { title: "Second Book", slug: "second-book" });
  return {
    root,
    firstRoot: path.join(root, first.novelPath),
    secondRoot: path.join(root, second.novelPath)
  };
}

function frontmatter(
  novelId: string,
  id: string,
  chapter: number,
  visibility: "internal" | "editor" | "reader" | "public",
  status: "draft" | "revised" | "locked" | "published" = "revised"
) {
  return {
    schema_version: "0.1.0",
    id,
    document_type: "chapter",
    novel_id: novelId,
    title: `Chapter ${chapter}`,
    volume: 1,
    chapter,
    status,
    visibility,
    summary: `Summary ${chapter}`,
    content_version: "0.1.0",
    word_count: 20,
    previous_chapter_id: null,
    next_chapter_id: null
  };
}

async function writeChapter(
  novelRoot: string,
  data: Record<string, unknown>,
  paragraphs: string[]
) {
  await writeFile(
    path.join(novelRoot, "manuscript", `${String(data.id)}.md`),
    `---\n${stringify(data)}---\n\n# ${String(data.title)}\n\n${paragraphs.join("\n\n")}\n`,
    "utf8"
  );
}

describe("buildReaderLibrary", () => {
  test("builds a multi-book reader library with stable paragraph anchors", async () => {
    const { root, firstRoot, secondRoot } = await fixture();
    await writeChapter(
      firstRoot,
      frontmatter("NOVEL-0001", "CHAPTER-0001", 1, "reader"),
      ["First paragraph.", "Second paragraph."]
    );
    await writeChapter(
      secondRoot,
      frontmatter("NOVEL-0002", "CHAPTER-0001", 1, "public", "published"),
      ["Another book opens here."]
    );

    const library = await buildReaderLibrary(root, { profile: "reader" });

    expect(library.books.map((book) => book.title)).toEqual([
      "First Book",
      "Second Book"
    ]);
    expect(library.books[0]?.chapters[0]?.blocks).toEqual([
      expect.objectContaining({ id: expect.stringMatching(/^p-[a-f0-9]{12}$/), text: "First paragraph." }),
      expect.objectContaining({ id: expect.stringMatching(/^p-[a-f0-9]{12}$/), text: "Second paragraph." })
    ]);
  });

  test("removes higher-sensitivity chapters from reader and public bundles", async () => {
    const { root, firstRoot } = await fixture();
    await writeChapter(
      firstRoot,
      frontmatter("NOVEL-0001", "CHAPTER-0001", 1, "internal"),
      ["INTERNAL TWIST MUST NEVER LEAK"]
    );
    await writeChapter(
      firstRoot,
      frontmatter("NOVEL-0001", "CHAPTER-0002", 2, "reader"),
      ["Reader preview text."]
    );
    await writeChapter(
      firstRoot,
      frontmatter("NOVEL-0001", "CHAPTER-0003", 3, "public", "published"),
      ["Public preview text."]
    );

    const reader = await buildReaderLibrary(root, { profile: "reader" });
    const publicLibrary = await buildReaderLibrary(root, { profile: "public" });
    const readerJson = JSON.stringify(reader);
    const publicJson = JSON.stringify(publicLibrary);

    expect(readerJson).not.toContain("INTERNAL TWIST MUST NEVER LEAK");
    expect(readerJson).toContain("Reader preview text.");
    expect(readerJson).toContain("Public preview text.");
    expect(publicJson).not.toContain("INTERNAL TWIST MUST NEVER LEAK");
    expect(publicJson).not.toContain("Reader preview text.");
    expect(publicJson).toContain("Public preview text.");
  });

  test("does not publish draft chapters even when visibility is public", async () => {
    const { root, firstRoot } = await fixture();
    await writeChapter(
      firstRoot,
      frontmatter("NOVEL-0001", "CHAPTER-0001", 1, "public", "draft"),
      ["Unreviewed draft text."]
    );

    const library = await buildReaderLibrary(root, { profile: "public" });

    expect(JSON.stringify(library)).not.toContain("Unreviewed draft text.");
    expect(library.books).toEqual([]);
  });

  test("refuses to build when Story OS validation fails", async () => {
    const { root, firstRoot } = await fixture();
    await writeChapter(
      firstRoot,
      {
        ...frontmatter("NOVEL-0002", "CHAPTER-0001", 1, "public", "published")
      },
      ["Wrong owner."]
    );

    await expect(
      buildReaderLibrary(root, { profile: "public" })
    ).rejects.toMatchObject({ code: "STORY_VALIDATION_FAILED" });
  });
});
