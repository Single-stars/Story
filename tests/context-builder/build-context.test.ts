import { cp, mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { stringify } from "yaml";
import { afterEach, describe, expect, test } from "vitest";

import { buildContext } from "../../tools/context-builder/src/build-context.js";
import { createNovel } from "../../tools/scaffolder/src/create-novel.js";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))
  );
});

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), "story-os-context-"));
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
  const first = await createNovel(root, { title: "First Novel", slug: "first-novel" });
  const second = await createNovel(root, { title: "Second Novel", slug: "second-novel" });
  return {
    root,
    firstRoot: path.join(root, first.novelPath),
    secondRoot: path.join(root, second.novelPath)
  };
}

function fact(novelId: string, statement: string) {
  return {
    schema_version: "0.1.0",
    id: "FACT-0001",
    entity_type: "fact",
    owner: { novel_id: novelId },
    status: "proposed",
    visibility: "internal",
    name: "Context fact",
    summary: statement,
    tags: [],
    statement,
    confidence: 1,
    evidence: []
  };
}

async function writeFact(novelRoot: string, novelId: string, statement: string) {
  const directory = path.join(novelRoot, "canon", "facts");
  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, "FACT-0001.yaml"),
    stringify(fact(novelId, statement)),
    "utf8"
  );
}

describe("buildContext", () => {
  test("loads only the selected novel even when local entity ids repeat", async () => {
    const { root, firstRoot, secondRoot } = await fixture();
    await writeFact(firstRoot, "NOVEL-0001", "Only the first novel knows this truth.");
    await writeFact(secondRoot, "NOVEL-0002", "Second novel secret must stay isolated.");

    const result = await buildContext(root, {
      novelId: "NOVEL-0001",
      entityIds: ["FACT-0001"],
      maxChars: 12000
    });

    expect(result.novelId).toBe("NOVEL-0001");
    expect(result.content).toContain("First Novel");
    expect(result.content).toContain("Only the first novel knows this truth.");
    expect(result.content).not.toContain("Second Novel");
    expect(result.content).not.toContain("Second novel secret must stay isolated.");
    expect(result.missingEntityIds).toEqual([]);
    expect(result.sources.every((source) => source.startsWith("novels/NOVEL-0001-"))).toBe(true);
  });

  test("reports missing ids without searching another novel", async () => {
    const { root, secondRoot } = await fixture();
    await writeFact(secondRoot, "NOVEL-0002", "Exists only in the second novel.");

    const result = await buildContext(root, {
      novelId: "NOVEL-0001",
      entityIds: ["FACT-0001"],
      maxChars: 12000
    });

    expect(result.missingEntityIds).toEqual(["FACT-0001"]);
    expect(result.content).not.toContain("Exists only in the second novel.");
  });

  test("rejects an unregistered novel id", async () => {
    const { root } = await fixture();

    await expect(
      buildContext(root, {
        novelId: "NOVEL-9999",
        entityIds: [],
        maxChars: 12000
      })
    ).rejects.toMatchObject({ code: "UNKNOWN_NOVEL" });
  });

  test("is deterministic and never exceeds its character budget", async () => {
    const { root, firstRoot } = await fixture();
    await writeFact(firstRoot, "NOVEL-0001", "x".repeat(6000));
    const options = {
      novelId: "NOVEL-0001",
      entityIds: ["FACT-0001"],
      maxChars: 2200
    };

    const first = await buildContext(root, options);
    const second = await buildContext(root, options);

    expect(first).toEqual(second);
    expect(first.content.length).toBeLessThanOrEqual(options.maxChars);
    expect(first.truncated).toBe(true);
  });
});
