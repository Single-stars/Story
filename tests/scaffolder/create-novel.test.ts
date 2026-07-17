import {
  cp,
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parse, stringify } from "yaml";
import { afterEach, describe, expect, test } from "vitest";

import { createNovel } from "../../tools/scaffolder/src/create-novel.js";
import { validateWorkspace } from "../../tools/validator/src/validate-workspace.js";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

const standardNovelDirectories = [
  "canon",
  "narrative",
  "manuscript",
  "research",
  "decisions",
  "feedback",
  "reports"
] as const;

interface WorkspaceManifest {
  active_novel_id: string | null;
  novels: Array<{
    id: string;
    title: string;
    path: string;
    status: string;
  }>;
  id_counters: {
    universe: number;
    series: number;
    novel: number;
  };
}

interface NovelManifest {
  novel_id: string;
  title: string;
  slug: string;
  status: string;
  paths: Record<string, string>;
}

const fixtureRoots = new Set<string>();

afterEach(async () => {
  await Promise.all(
    [...fixtureRoots].map((root) => rm(root, { recursive: true, force: true }))
  );
  fixtureRoots.clear();
});

async function createWorkspaceFixture(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "story-os-scaffolder-"));
  fixtureRoots.add(root);

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

  return root;
}

async function readYaml<T>(filePath: string): Promise<T> {
  return parse(await readFile(filePath, "utf8")) as T;
}

async function listNovelDirectories(root: string): Promise<string[]> {
  try {
    return (await readdir(path.join(root, "novels"))).sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

describe("createNovel", () => {
  test("allocates the next permanent novel id and returns a stable result", async () => {
    const root = await createWorkspaceFixture();

    const result = await createNovel(root, { title: "Night Relay" });

    expect(result).toEqual({
      novelId: "NOVEL-0001",
      slug: "night-relay",
      novelPath: "novels/NOVEL-0001-night-relay",
      manifestPath: "novels/NOVEL-0001-night-relay/manifest.yaml"
    });
  });

  test("generates a legal slug, valid manifest, and all standard subdirectories", async () => {
    const root = await createWorkspaceFixture();

    const result = await createNovel(root, { title: "Night Relay: After Dark!" });
    const novelRoot = path.join(root, result.novelPath);
    const manifest = await readYaml<NovelManifest>(
      path.join(root, result.manifestPath)
    );

    expect(result.slug).toBe("night-relay-after-dark");
    expect(result.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(manifest).toMatchObject({
      novel_id: "NOVEL-0001",
      title: "Night Relay: After Dark!",
      slug: "night-relay-after-dark",
      status: "planning",
      paths: {
        canon: "canon",
        narrative: "narrative",
        manuscript: "manuscript",
        research: "research",
        decisions: "decisions",
        feedback: "feedback",
        reports: "reports"
      }
    });

    for (const directory of standardNovelDirectories) {
      expect((await stat(path.join(novelRoot, directory))).isDirectory()).toBe(true);
    }

    const validation = await validateWorkspace(root);
    expect(validation.errors).toEqual([]);
    expect(validation.ok).toBe(true);
  });

  test("accepts an explicit readable slug for a non-Latin title", async () => {
    const root = await createWorkspaceFixture();

    const result = await createNovel(root, {
      title: "死亡账户",
      slug: "death-account"
    });
    const manifest = await readYaml<NovelManifest>(
      path.join(root, result.manifestPath)
    );

    expect(result.slug).toBe("death-account");
    expect(result.novelPath).toBe("novels/NOVEL-0001-death-account");
    expect(manifest.title).toBe("死亡账户");
    expect(manifest.slug).toBe("death-account");
  });

  test("registers the novel, advances the counter, and makes it active", async () => {
    const root = await createWorkspaceFixture();

    await createNovel(root, { title: "Night Relay" });
    const workspace = await readYaml<WorkspaceManifest>(
      path.join(root, "workspace", "manifest.yaml")
    );

    expect(workspace.id_counters.novel).toBe(1);
    expect(workspace.active_novel_id).toBe("NOVEL-0001");
    expect(workspace.novels).toEqual([
      {
        id: "NOVEL-0001",
        title: "Night Relay",
        path: "novels/NOVEL-0001-night-relay",
        status: "planning"
      }
    ]);
  });

  test("creates a second novel without changing the first novel", async () => {
    const root = await createWorkspaceFixture();
    const first = await createNovel(root, { title: "Night Relay" });
    const firstManifestPath = path.join(root, first.manifestPath);
    const firstManifestBefore = await readFile(firstManifestPath, "utf8");
    const firstEntriesBefore = await readdir(path.join(root, first.novelPath));

    const second = await createNovel(root, { title: "Paper City" });

    expect(second).toEqual({
      novelId: "NOVEL-0002",
      slug: "paper-city",
      novelPath: "novels/NOVEL-0002-paper-city",
      manifestPath: "novels/NOVEL-0002-paper-city/manifest.yaml"
    });
    expect(await readFile(firstManifestPath, "utf8")).toBe(firstManifestBefore);
    expect((await readdir(path.join(root, first.novelPath))).sort()).toEqual(
      firstEntriesBefore.sort()
    );

    const firstManifest = await readYaml<NovelManifest>(firstManifestPath);
    const secondManifest = await readYaml<NovelManifest>(
      path.join(root, second.manifestPath)
    );
    expect(firstManifest).toMatchObject({
      novel_id: "NOVEL-0001",
      slug: "night-relay"
    });
    expect(secondManifest).toMatchObject({
      novel_id: "NOVEL-0002",
      slug: "paper-city"
    });

    const workspace = await readYaml<WorkspaceManifest>(
      path.join(root, "workspace", "manifest.yaml")
    );
    expect(workspace.id_counters.novel).toBe(2);
    expect(workspace.active_novel_id).toBe("NOVEL-0002");
    expect(workspace.novels.map(({ id }) => id)).toEqual([
      "NOVEL-0001",
      "NOVEL-0002"
    ]);
  });

  test("rejects a duplicate slug without changing workspace or novel files", async () => {
    const root = await createWorkspaceFixture();
    await createNovel(root, { title: "Night Relay" });
    const workspacePath = path.join(root, "workspace", "manifest.yaml");
    const workspaceBefore = await readFile(workspacePath, "utf8");
    const novelDirectoriesBefore = await listNovelDirectories(root);

    await expect(createNovel(root, { title: "Night Relay" })).rejects.toMatchObject({
      code: "DUPLICATE_NOVEL_SLUG"
    });

    expect(await readFile(workspacePath, "utf8")).toBe(workspaceBefore);
    expect(await listNovelDirectories(root)).toEqual(novelDirectoriesBefore);
  });

  test("rejects an empty title without leaving a partial novel", async () => {
    const root = await createWorkspaceFixture();
    const workspacePath = path.join(root, "workspace", "manifest.yaml");
    const workspaceBefore = await readFile(workspacePath, "utf8");

    await expect(createNovel(root, { title: "   " })).rejects.toMatchObject({
      code: "INVALID_NOVEL_TITLE"
    });

    expect(await readFile(workspacePath, "utf8")).toBe(workspaceBefore);
    expect(await listNovelDirectories(root)).toEqual([]);
  });

  test("rejects an invalid explicit slug without changing the workspace", async () => {
    const root = await createWorkspaceFixture();
    const workspacePath = path.join(root, "workspace", "manifest.yaml");
    const workspaceBefore = await readFile(workspacePath, "utf8");

    await expect(
      createNovel(root, { title: "死亡账户", slug: "死亡账户" })
    ).rejects.toMatchObject({ code: "INVALID_NOVEL_SLUG" });

    expect(await readFile(workspacePath, "utf8")).toBe(workspaceBefore);
    expect(await listNovelDirectories(root)).toEqual([]);
  });
});
