import { cp, mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { stringify } from "yaml";
import { describe, expect, test } from "vitest";

import { validateWorkspace } from "../../tools/validator/src/validate-workspace.js";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");

function workspaceManifest() {
  return {
    schema_version: "0.1.0",
    workspace_id: "WORKSPACE-0001",
    name: "Test Workspace",
    description: "A validator fixture.",
    locale: {
      interface_language: "zh-CN",
      writing_language: "zh-CN",
      machine_field_language: "en",
      timezone: "Asia/Shanghai"
    },
    repository: {
      provider: "local",
      url: "https://example.com/story.git",
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
      structure_lenses: ["scene-sequel"]
    },
    active_novel_id: null as string | null,
    novels: [] as Array<Record<string, unknown>>,
    universes: [] as Array<Record<string, unknown>>,
    series: [] as Array<Record<string, unknown>>,
    id_counters: { universe: 0, series: 0, novel: 0 },
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
  };
}

function novelManifest(id = "NOVEL-0001", title = "Fixture Novel") {
  return {
    schema_version: "0.1.0",
    novel_id: id,
    title,
    slug: "fixture-novel",
    status: "planning",
    language: "zh-CN",
    genre: {
      primary: "悬疑",
      secondary: [],
      target_readers: "测试读者",
      promises: ["建立明确悬念"]
    },
    premise: {
      status: "proposed",
      logline: "A fixture premise.",
      theme_question: "What is true?",
      core_conflict: "The validator must distinguish valid and invalid data."
    },
    structure: {
      lenses: ["scene-sequel"],
      intended_length_words: 80000,
      volumes: 1
    },
    dependencies: { universe_refs: [], series_id: null },
    current_focus: { volume: 1, chapter: 1, scene_id: null, note: "" },
    paths: {
      canon: "canon",
      narrative: "narrative",
      manuscript: "manuscript",
      research: "research",
      decisions: "decisions",
      feedback: "feedback",
      reports: "reports"
    },
    sharing: { default_profile: "internal", allow_offline_reader: false }
  };
}

function fact(id: string, ownerNovelId = "NOVEL-0001") {
  return {
    schema_version: "0.1.0",
    id,
    entity_type: "fact",
    owner: { novel_id: ownerNovelId },
    status: "proposed",
    visibility: "internal",
    name: `Fact ${id}`,
    summary: "Fixture fact.",
    tags: [],
    statement: "The fixture exists.",
    confidence: 1,
    evidence: []
  };
}

async function createFixture() {
  const root = await mkdtemp(path.join(tmpdir(), "story-os-validator-"));
  await mkdir(path.join(root, "workspace"), { recursive: true });
  await cp(path.join(repositoryRoot, "schemas"), path.join(root, "schemas"), {
    recursive: true
  });
  await writeFile(
    path.join(root, "workspace", "manifest.yaml"),
    stringify(workspaceManifest()),
    "utf8"
  );
  return root;
}

async function registerNovel(root: string, id = "NOVEL-0001") {
  const manifest = workspaceManifest();
  const relativePath = `${id}-fixture-novel`;
  manifest.novels.push({
    id,
    title: "Fixture Novel",
    path: `novels/${relativePath}`,
    status: "planning"
  });
  manifest.id_counters.novel = 1;
  await writeFile(
    path.join(root, "workspace", "manifest.yaml"),
    stringify(manifest),
    "utf8"
  );
  const novelRoot = path.join(root, "novels", relativePath);
  await mkdir(path.join(novelRoot, "canon", "facts"), { recursive: true });
  await mkdir(path.join(novelRoot, "narrative"), { recursive: true });
  await writeFile(
    path.join(novelRoot, "manifest.yaml"),
    stringify(novelManifest(id)),
    "utf8"
  );
  return novelRoot;
}

describe("validateWorkspace", () => {
  test("accepts the current empty multi-novel workspace", async () => {
    const report = await validateWorkspace(repositoryRoot);

    expect(report.errors).toEqual([]);
    expect(report.ok).toBe(true);
  });

  test("rejects an active novel that is not registered", async () => {
    const root = await createFixture();
    const manifest = workspaceManifest();
    manifest.active_novel_id = "NOVEL-0009";
    await writeFile(
      path.join(root, "workspace", "manifest.yaml"),
      stringify(manifest),
      "utf8"
    );

    const report = await validateWorkspace(root);

    expect(report.ok).toBe(false);
    expect(report.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "ACTIVE_NOVEL_NOT_REGISTERED" })
      ])
    );
  });

  test("reports a missing registered novel directory", async () => {
    const root = await createFixture();
    const manifest = workspaceManifest();
    manifest.novels.push({
      id: "NOVEL-0001",
      title: "Missing",
      path: "novels/NOVEL-0001-missing",
      status: "planning"
    });
    await writeFile(
      path.join(root, "workspace", "manifest.yaml"),
      stringify(manifest),
      "utf8"
    );

    const report = await validateWorkspace(root);

    expect(report.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "NOVEL_DIRECTORY_MISSING" })
      ])
    );
  });

  test("detects duplicate entity ids across files", async () => {
    const root = await createFixture();
    const novelRoot = await registerNovel(root);
    await writeFile(
      path.join(novelRoot, "canon", "facts", "FACT-0001-a.yaml"),
      stringify(fact("FACT-0001")),
      "utf8"
    );
    await writeFile(
      path.join(novelRoot, "canon", "facts", "FACT-0001-b.yaml"),
      stringify(fact("FACT-0001")),
      "utf8"
    );

    const report = await validateWorkspace(root);

    expect(report.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "DUPLICATE_ENTITY_ID", entityId: "FACT-0001" })
      ])
    );
  });

  test("detects entity ownership that crosses a novel boundary", async () => {
    const root = await createFixture();
    const novelRoot = await registerNovel(root);
    await writeFile(
      path.join(novelRoot, "canon", "facts", "FACT-0001.yaml"),
      stringify(fact("FACT-0001", "NOVEL-0002")),
      "utf8"
    );

    const report = await validateWorkspace(root);

    expect(report.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "ENTITY_OWNER_MISMATCH", entityId: "FACT-0001" })
      ])
    );
  });

  test("allows independent novels to reuse local entity ids", async () => {
    const root = await createFixture();
    const firstNovelRoot = await registerNovel(root, "NOVEL-0001");
    const manifest = workspaceManifest();
    manifest.novels.push(
      {
        id: "NOVEL-0001",
        title: "Fixture Novel One",
        path: "novels/NOVEL-0001-fixture-novel",
        status: "planning"
      },
      {
        id: "NOVEL-0002",
        title: "Fixture Novel Two",
        path: "novels/NOVEL-0002-fixture-novel",
        status: "planning"
      }
    );
    manifest.id_counters.novel = 2;
    await writeFile(
      path.join(root, "workspace", "manifest.yaml"),
      stringify(manifest),
      "utf8"
    );

    const secondNovelRoot = path.join(root, "novels", "NOVEL-0002-fixture-novel");
    await mkdir(path.join(secondNovelRoot, "canon", "facts"), { recursive: true });
    await mkdir(path.join(secondNovelRoot, "narrative"), { recursive: true });
    await writeFile(
      path.join(secondNovelRoot, "manifest.yaml"),
      stringify(novelManifest("NOVEL-0002", "Fixture Novel Two")),
      "utf8"
    );
    await writeFile(
      path.join(firstNovelRoot, "canon", "facts", "FACT-0001.yaml"),
      stringify(fact("FACT-0001", "NOVEL-0001")),
      "utf8"
    );
    await writeFile(
      path.join(secondNovelRoot, "canon", "facts", "FACT-0001.yaml"),
      stringify(fact("FACT-0001", "NOVEL-0002")),
      "utf8"
    );

    const report = await validateWorkspace(root);

    expect(report.errors).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "DUPLICATE_ENTITY_ID" })
      ])
    );
    expect(report.ok).toBe(true);
  });
});
