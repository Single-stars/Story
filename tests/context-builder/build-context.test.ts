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

async function writeWorkpack(novelRoot: string, novelId: string) {
  const directory = path.join(novelRoot, "reports", "workpacks");
  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, "CHRUN-0001.yaml"),
    stringify({
      schema_version: "0.1.0",
      id: "CHRUN-0001",
      record_type: "chapter_workpack",
      owner: { novel_id: novelId },
      status: "planned",
      visibility: "internal",
      canon_effect: "proposal_only",
      chapter_id: "CHAPTER-0001",
      target_word_count: { min: 3000, target: 3500, max: 4200 },
      scene_ids: ["SCN-0001"],
      required_context: {
        style_profile_ids: ["STYLE-0001"],
        canon_ids: [],
        narrative_ids: ["SCN-0001"],
        manuscript_chapter_ids: [],
        decision_ids: []
      },
      required_reviews: {
        continuity: { required: false, review_ids: [] },
        developmental_edit: { required: false, review_ids: [] },
        reader_test: { required: false, review_ids: [] },
        line_edit: { required: false, review_ids: [] }
      },
      continuity_contract: {
        world_state: "Context builder must load this workpack by id.",
        capability_scope: "No unapproved capability may be invented.",
        character_knowledge: "Use only recorded character knowledge.",
        relationship_state: "Relationship changes need a cause.",
        foreshadowing_plan: "Track planted and paid-off clues.",
        reader_exposure: {
          allowed: ["Only current chapter signals."],
          forbidden: ["No future reveal."]
        }
      },
      quality_gates: {
        word_count_defined: true,
        scene_contracts_locked: true,
        capability_scope_checked: true,
        character_roster_named: true,
        relationship_changes_motivated: true,
        plot_causality_checked: true,
        foreshadowing_status_checked: true,
        reader_exposure_limited: true,
        prose_quality_review_planned: true
      },
      resume_brief: "Resume from the durable workpack, not chat memory."
    }),
    "utf8"
  );
}

async function writeScene(novelRoot: string, novelId: string) {
  const directory = path.join(novelRoot, "narrative", "scenes");
  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, "SCN-0001.yaml"),
    stringify({
      schema_version: "0.1.0",
      id: "SCN-0001",
      entity_type: "scene",
      owner: { novel_id: novelId },
      status: "approved",
      visibility: "internal",
      title: "Context scene",
      summary: "Scene dependency must be available to the context builder."
    }),
    "utf8"
  );
}

async function writeWorkpackWithDependencies(novelRoot: string, novelId: string) {
  const directory = path.join(novelRoot, "reports", "workpacks");
  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, "CHRUN-0002.yaml"),
    stringify({
      schema_version: "0.1.0",
      id: "CHRUN-0002",
      record_type: "chapter_workpack",
      owner: { novel_id: novelId },
      status: "planned",
      visibility: "internal",
      canon_effect: "proposal_only",
      chapter_id: "CHAPTER-0001",
      required_context: {
        style_profile_ids: ["STYLE-0001"],
        canon_ids: [],
        narrative_ids: [],
        manuscript_chapter_ids: ["CHAPTER-0001"],
        decision_ids: ["DEC-0001"]
      },
      required_reviews: {
        continuity: { required: true, review_ids: ["REVIEW-0001"] },
        developmental_edit: { required: false, review_ids: [] },
        reader_test: { required: false, review_ids: [] },
        line_edit: { required: false, review_ids: [] }
      },
      memory_contract: {
        must_load_ids: ["STYLE-0001"],
        must_update_after_draft: [],
        forbidden_shortcuts: []
      },
      resume_brief: "Dependent workpack must pull durable context."
    }),
    "utf8"
  );
}

async function writeChapter(novelRoot: string, novelId: string) {
  const directory = path.join(novelRoot, "manuscript");
  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, "CHAPTER-0001.md"),
    [
      "---",
      "schema_version: 0.1.0",
      "id: CHAPTER-0001",
      `novel_id: ${novelId}`,
      "title: Context Chapter",
      "---",
      "",
      "Manuscript body must be loaded from the workpack dependency."
    ].join("\n"),
    "utf8"
  );
}

async function writeDecision(novelRoot: string) {
  const directory = path.join(novelRoot, "decisions");
  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, "DEC-0001.yaml"),
    stringify({
      id: "DEC-0001",
      decision: "The drafting baseline depends on this author decision."
    }),
    "utf8"
  );
}

async function writeReview(novelRoot: string, novelId: string) {
  const directory = path.join(novelRoot, "reports", "reviews");
  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, "REVIEW-0001.yaml"),
    stringify({
      schema_version: "0.1.0",
      id: "REVIEW-0001",
      record_type: "review_record",
      owner: { novel_id: novelId },
      status: "reviewed",
      visibility: "internal",
      canon_effect: "proposal_only",
      review_type: "continuity",
      scope: {
        novel_id: novelId,
        chapter_ids: ["CHAPTER-0001"],
        entity_ids: [],
        manuscript_paths: ["manuscript/CHAPTER-0001.md"]
      },
      source_version: {
        baseline_label: "fixture",
        content_hash: "sha256:0000000000000000000000000000000000000000000000000000000000000000",
        reviewed_at: "2026-07-18T00:00:00.000Z"
      },
      coverage: { checked: ["chapter"], gaps: [] },
      findings: [],
      conclusion: { verdict: "pass", summary: "Continuity dependency loaded.", blockers: [] },
      author_decision: { status: "accepted", decided_by: "author", decided_at: null, notes: "" },
      reverification: { status: "not_required", review_id: null, notes: "" },
      resume_brief: "Review dependency must be loaded."
    }),
    "utf8"
  );
}

async function writeWorkpackWithReviewGate(
  novelRoot: string,
  novelId: string,
  gate: {
    required: boolean;
    reviewIds: string[];
    reviewType?: "continuity" | "developmental_edit" | "reader_test" | "line_edit";
  }
) {
  const directory = path.join(novelRoot, "reports", "workpacks");
  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, "CHRUN-0003.yaml"),
    stringify({
      schema_version: "0.1.0",
      id: "CHRUN-0003",
      record_type: "chapter_workpack",
      owner: { novel_id: novelId },
      status: "planned",
      visibility: "internal",
      canon_effect: "proposal_only",
      chapter_id: "CHAPTER-0001",
      required_context: {
        style_profile_ids: ["STYLE-0001"],
        canon_ids: [],
        narrative_ids: [],
        manuscript_chapter_ids: [],
        decision_ids: []
      },
      required_reviews: {
        continuity: {
          required: gate.reviewType === undefined || gate.reviewType === "continuity"
            ? gate.required
            : false,
          review_ids:
            gate.reviewType === undefined || gate.reviewType === "continuity"
              ? gate.reviewIds
              : []
        },
        developmental_edit: {
          required: gate.reviewType === "developmental_edit" ? gate.required : false,
          review_ids: gate.reviewType === "developmental_edit" ? gate.reviewIds : []
        },
        reader_test: {
          required: gate.reviewType === "reader_test" ? gate.required : false,
          review_ids: gate.reviewType === "reader_test" ? gate.reviewIds : []
        },
        line_edit: {
          required: gate.reviewType === "line_edit" ? gate.required : false,
          review_ids: gate.reviewType === "line_edit" ? gate.reviewIds : []
        }
      },
      resume_brief: "Review gate fixture."
    }),
    "utf8"
  );
}

async function writeReviewVariant(
  novelRoot: string,
  novelId: string,
  options: {
    id?: string;
    ownerNovelId?: string;
    scopeNovelId?: string;
    chapterIds?: string[];
    reviewType?: "continuity" | "developmental_edit" | "reader_test" | "line_edit";
  } = {}
) {
  const directory = path.join(novelRoot, "reports", "reviews");
  await mkdir(directory, { recursive: true });
  const id = options.id ?? "REVIEW-0001";
  await writeFile(
    path.join(directory, `${id}.yaml`),
    stringify({
      schema_version: "0.1.0",
      id,
      record_type: "review_record",
      owner: { novel_id: options.ownerNovelId ?? novelId },
      status: "reviewed",
      visibility: "internal",
      canon_effect: "proposal_only",
      review_type: options.reviewType ?? "continuity",
      scope: {
        novel_id: options.scopeNovelId ?? novelId,
        chapter_ids: options.chapterIds ?? ["CHAPTER-0001"],
        entity_ids: [],
        manuscript_paths: ["manuscript/CHAPTER-0001.md"]
      },
      source_version: {
        baseline_label: "fixture",
        content_hash: "sha256:1111111111111111111111111111111111111111111111111111111111111111",
        reviewed_at: "2026-07-18T00:00:00.000Z"
      },
      coverage: { checked: ["chapter"], gaps: [] },
      findings: [],
      conclusion: { verdict: "pass", summary: "Review variant loaded.", blockers: [] },
      author_decision: { status: "pending", decision_id: null, notes: "" },
      reverification: { status: "not_required", required_review_ids: [], notes: "" },
      resume_brief: "Review variant must be loaded."
    }),
    "utf8"
  );
}

async function writeStyleProfile(novelRoot: string, novelId: string) {
  const directory = path.join(novelRoot, "reports", "style");
  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, "STYLE-0001.yaml"),
    stringify({
      schema_version: "0.1.0",
      id: "STYLE-0001",
      record_type: "prose_style_profile",
      owner: { novel_id: novelId },
      status: "planned",
      visibility: "internal",
      canon_effect: "proposal_only",
      scope: {
        novel_id: novelId,
        applies_to_chapter_ids: ["CHAPTER-0001"],
        source_skill_refs: ["novel-line-edit", "shuorenhua"]
      },
      style_contract: {
        positive_targets: ["Write action, perception, choice, and consequence before explanation."],
        protected_items: ["Do not drift facts, capability limits, or reader exposure."],
        forbidden_patterns: ["No false insight skeletons."],
        pov_and_distance: ["Use only the approved POV knowledge."],
        dialogue_rules: ["Dialogue must carry goal, pressure, or relationship position."],
        imagery_rules: ["Imagery must change action, knowledge, relationship, or foreshadowing."]
      },
      prose_gates: {
        hard: ["No prose polish while continuity blockers remain."],
        soft: ["Reduce abstract summary density."]
      },
      revision_protocol: {
        order: ["continuity", "character", "paragraph causality", "line edit"],
        line_edit_strength: "standard",
        reread_checks: ["Fidelity first.", "Residual AI patterns second."]
      },
      quality_gates: {
        protected_items_declared: true
      },
      resume_brief: "Style memory must load before rewrite."
    }),
    "utf8"
  );
}

async function writeRestructurePlan(novelRoot: string, novelId: string) {
  const directory = path.join(novelRoot, "reports", "restructure");
  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, "RESTRUCT-0001.yaml"),
    stringify({
      schema_version: "0.1.0",
      id: "RESTRUCT-0001",
      record_type: "volume_restructure_plan",
      owner: { novel_id: novelId },
      status: "planned",
      visibility: "internal",
      canon_effect: "proposal_only",
      scope: {
        novel_id: novelId,
        volume: 1,
        from: "opening",
        to: "return to dream world",
        replaces_chapter_ids: ["CHAPTER-0001"]
      },
      source_constraints: {
        world_layers: ["Dream world is normal; real world is decayed."],
        capability_timeline: ["No object control before fusion."],
        reader_exposure: ["No early high-level organization truth."],
        relationship_pacing: ["Slow-burn relationship only."]
      },
      phase_plan: [
        {
          phase_id: "P1",
          chapter_slots: ["CHAPTER-0001"],
          world_layer: "dream world",
          function: "Open pressure and school texture.",
          entry_pressure: "The protagonist must function after a black-mist dream.",
          decisive_change: "Footsteps become a concrete question.",
          exit_hook: "The next occurrence cannot be dismissed.",
          required_cast: ["protagonist", "named classmate"],
          foreshadowing: ["footsteps"]
        }
      ],
      character_roster_policy: ["Recurring dialogue roles need a name and first-look signal."],
      memory_contract: {
        must_load_ids: ["STYLE-0001"],
        must_update_after_draft: ["chapter workpack", "scene contracts"],
        forbidden_shortcuts: ["Do not map old chapters directly to new ones."]
      },
      quality_gates: {
        prose_profile_linked: true
      },
      resume_brief: "Restructure memory must load before drafting."
    }),
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

  test("loads chapter workpacks by id for resumable drafting context", async () => {
    const { root, firstRoot } = await fixture();
    await writeWorkpack(firstRoot, "NOVEL-0001");
    await writeScene(firstRoot, "NOVEL-0001");
    await writeStyleProfile(firstRoot, "NOVEL-0001");

    const result = await buildContext(root, {
      novelId: "NOVEL-0001",
      entityIds: ["CHRUN-0001"],
      maxChars: 12000
    });

    expect(result.content).toContain("chapter_workpack");
    expect(result.content).toContain("Resume from the durable workpack");
    expect(result.content).toContain("Style memory must load before rewrite");
    expect(result.missingEntityIds).toEqual([]);
  });

  test("recursively loads required context from chapter workpacks", async () => {
    const { root, firstRoot } = await fixture();
    await writeWorkpackWithDependencies(firstRoot, "NOVEL-0001");
    await writeChapter(firstRoot, "NOVEL-0001");
    await writeDecision(firstRoot);
    await writeReview(firstRoot, "NOVEL-0001");
    await writeStyleProfile(firstRoot, "NOVEL-0001");

    const result = await buildContext(root, {
      novelId: "NOVEL-0001",
      entityIds: ["CHRUN-0002"],
      maxChars: 30000
    });

    expect(result.content).toContain("Dependent workpack must pull durable context");
    expect(result.content).toContain("Manuscript body must be loaded");
    expect(result.content).toContain("author decision");
    expect(result.content).toContain("Review dependency must be loaded");
    expect(result.content).toContain("Style memory must load before rewrite");
    expect(result.missingEntityIds).toEqual([]);
    expect(result.sourceDetails.map((source) => source.status)).toEqual(
      expect.arrayContaining(["complete"])
    );
    expect(
      result.sourceDetails.every((source) => source.sha256.startsWith("sha256:"))
    ).toBe(true);
  });

  test("fails when a required review gate has no review ids", async () => {
    const { root, firstRoot } = await fixture();
    await writeWorkpackWithReviewGate(firstRoot, "NOVEL-0001", {
      required: true,
      reviewIds: []
    });

    await expect(
      buildContext(root, {
        novelId: "NOVEL-0001",
        entityIds: ["CHRUN-0003"],
        maxChars: 12000
      })
    ).rejects.toMatchObject({ code: "REQUIRED_REVIEW_MISSING" });
  });

  test("fails when a required review id is missing from the selected novel", async () => {
    const { root, firstRoot, secondRoot } = await fixture();
    await writeWorkpackWithReviewGate(firstRoot, "NOVEL-0001", {
      required: true,
      reviewIds: ["REVIEW-0001"]
    });
    await writeReviewVariant(secondRoot, "NOVEL-0002", { id: "REVIEW-0001" });

    await expect(
      buildContext(root, {
        novelId: "NOVEL-0001",
        entityIds: ["CHRUN-0003"],
        maxChars: 12000
      })
    ).rejects.toMatchObject({ code: "REQUIRED_REVIEW_NOT_FOUND" });
  });

  test("fails when a required review does not match the gate and chapter scope", async () => {
    const { root, firstRoot } = await fixture();
    await writeWorkpackWithReviewGate(firstRoot, "NOVEL-0001", {
      required: true,
      reviewIds: ["REVIEW-0001"]
    });
    await writeReviewVariant(firstRoot, "NOVEL-0001", {
      id: "REVIEW-0001",
      reviewType: "reader_test",
      chapterIds: ["CHAPTER-0002"]
    });

    await expect(
      buildContext(root, {
        novelId: "NOVEL-0001",
        entityIds: ["CHRUN-0003"],
        maxChars: 12000
      })
    ).rejects.toMatchObject({ code: "REQUIRED_REVIEW_TYPE_MISMATCH" });
  });

  test("degrades instead of failing when an optional review id is missing", async () => {
    const { root, firstRoot } = await fixture();
    await writeStyleProfile(firstRoot, "NOVEL-0001");
    await writeWorkpackWithReviewGate(firstRoot, "NOVEL-0001", {
      required: false,
      reviewType: "line_edit",
      reviewIds: ["REVIEW-9999"]
    });

    const result = await buildContext(root, {
      novelId: "NOVEL-0001",
      entityIds: ["CHRUN-0003"],
      maxChars: 12000
    });

    expect(result.content).toContain("Review gate fixture");
    expect(result.missingEntityIds).toEqual([]);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "OPTIONAL_REVIEW_NOT_FOUND",
          id: "REVIEW-9999"
        })
      ])
    );
  });

  test("loads style profiles and restructure plans by id", async () => {
    const { root, firstRoot } = await fixture();
    await writeStyleProfile(firstRoot, "NOVEL-0001");
    await writeRestructurePlan(firstRoot, "NOVEL-0001");

    const result = await buildContext(root, {
      novelId: "NOVEL-0001",
      entityIds: ["STYLE-0001", "RESTRUCT-0001"],
      maxChars: 20000
    });

    expect(result.content).toContain("prose_style_profile");
    expect(result.content).toContain("Style memory must load before rewrite");
    expect(result.content).toContain("volume_restructure_plan");
    expect(result.content).toContain("Restructure memory must load before drafting");
    expect(result.missingEntityIds).toEqual([]);
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
    expect(first.content).not.toContain("x".repeat(100));
    expect(first.sourceDetails.some((source) => source.status === "truncated")).toBe(true);
  });
});
