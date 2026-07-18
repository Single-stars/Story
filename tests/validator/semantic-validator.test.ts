import { cp, mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { stringify } from "yaml";
import { afterEach, describe, expect, test } from "vitest";

import {
  validateWorkspace,
  type ValidationReport
} from "../../tools/validator/src/validate-workspace.js";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const temporaryRoots: string[] = [];

interface UniverseRegistration {
  id: string;
  name: string;
  path: string;
  version: string;
}

interface UniverseReference {
  universe_id: string;
  version: string;
}

interface FixtureOptions {
  universeRegistrations?: UniverseRegistration[];
  universeRefs?: UniverseReference[];
}

interface Fixture {
  root: string;
  novelRoot: string;
  writeCanon(entity: Record<string, unknown>): Promise<void>;
  writeNarrative(entity: Record<string, unknown>): Promise<void>;
  writeNarrativeDocument(fileName: string, document: Record<string, unknown>): Promise<void>;
  writeWorkpack(workpack: Record<string, unknown>): Promise<void>;
  writeStyle(record: Record<string, unknown>): Promise<void>;
  writeRestructure(record: Record<string, unknown>): Promise<void>;
  writeReview(record: Record<string, unknown>): Promise<void>;
  writeFeedback(record: Record<string, unknown>): Promise<void>;
  writeChapter(chapter: Record<string, unknown>, content?: string): Promise<void>;
  writeOutline(outline: Record<string, unknown>): Promise<void>;
}

afterEach(async () => {
  const roots = temporaryRoots.splice(0);
  await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
});

function workspaceManifest(universes: UniverseRegistration[] = []) {
  return {
    schema_version: "0.1.0",
    workspace_id: "WORKSPACE-0001",
    name: "Semantic Validator Fixture",
    description: "An isolated workspace for semantic validation tests.",
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
    active_novel_id: "NOVEL-0001",
    novels: [
      {
        id: "NOVEL-0001",
        title: "Semantic Fixture Novel",
        path: "novels/NOVEL-0001-semantic-fixture",
        status: "planning"
      }
    ],
    universes,
    series: [],
    id_counters: { universe: universes.length, series: 0, novel: 1 },
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

function novelManifest(universeRefs: UniverseReference[] = []) {
  return {
    schema_version: "0.1.0",
    novel_id: "NOVEL-0001",
    title: "Semantic Fixture Novel",
    slug: "semantic-fixture",
    status: "planning",
    language: "zh-CN",
    genre: {
      primary: "悬疑",
      secondary: [],
      target_readers: "语义验证测试读者",
      promises: ["所有跨实体状态都保持可验证"]
    },
    premise: {
      status: "proposed",
      logline: "A fixture exposes semantic continuity errors.",
      theme_question: "Can state remain consistent?",
      core_conflict: "The fixture contains exactly one intended semantic violation."
    },
    structure: {
      lenses: ["scene-sequel"],
      intended_length_words: 80000,
      volumes: 1
    },
    dependencies: { universe_refs: universeRefs, series_id: null },
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

async function createFixture(options: FixtureOptions = {}): Promise<Fixture> {
  const root = await mkdtemp(path.join(tmpdir(), "story-os-semantic-"));
  temporaryRoots.push(root);

  const novelRoot = path.join(root, "novels", "NOVEL-0001-semantic-fixture");
  const canonRoot = path.join(novelRoot, "canon", "fixtures");
  const narrativeRoot = path.join(novelRoot, "narrative", "fixtures");
  const workpackRoot = path.join(novelRoot, "reports", "workpacks");
  const styleRoot = path.join(novelRoot, "reports", "style");
  const restructureRoot = path.join(novelRoot, "reports", "restructure");
  const reviewRoot = path.join(novelRoot, "reports", "reviews");
  const feedbackRoot = path.join(novelRoot, "feedback", "inbox");
  const manuscriptRoot = path.join(novelRoot, "manuscript");

  await cp(path.join(repositoryRoot, "schemas"), path.join(root, "schemas"), {
    recursive: true
  });
  await mkdir(path.join(root, "workspace"), { recursive: true });
  await mkdir(canonRoot, { recursive: true });
  await mkdir(narrativeRoot, { recursive: true });
  await mkdir(workpackRoot, { recursive: true });
  await mkdir(styleRoot, { recursive: true });
  await mkdir(restructureRoot, { recursive: true });
  await mkdir(reviewRoot, { recursive: true });
  await mkdir(feedbackRoot, { recursive: true });
  await mkdir(manuscriptRoot, { recursive: true });

  await writeFile(
    path.join(root, "workspace", "manifest.yaml"),
    stringify(workspaceManifest(options.universeRegistrations)),
    "utf8"
  );
  await writeFile(
    path.join(novelRoot, "manifest.yaml"),
    stringify(novelManifest(options.universeRefs)),
    "utf8"
  );

  for (const universe of options.universeRegistrations ?? []) {
    await mkdir(path.join(root, universe.path), { recursive: true });
  }

  async function writeEntity(
    directory: string,
    entity: Record<string, unknown>
  ): Promise<void> {
    await writeFile(
      path.join(directory, `${String(entity.id)}.yaml`),
      stringify(entity),
      "utf8"
    );
  }

  return {
    root,
    novelRoot,
    writeCanon: (entity) => writeEntity(canonRoot, entity),
    writeNarrative: (entity) => writeEntity(narrativeRoot, entity),
    writeNarrativeDocument: async (fileName, document) => {
      await writeFile(
        path.join(novelRoot, "narrative", fileName),
        stringify(document),
        "utf8"
      );
    },
    writeWorkpack: (workpack) => writeEntity(workpackRoot, workpack),
    writeStyle: (record) => writeEntity(styleRoot, record),
    writeRestructure: (record) => writeEntity(restructureRoot, record),
    writeReview: (record) => writeEntity(reviewRoot, record),
    writeFeedback: (record) => writeEntity(feedbackRoot, record),
    writeChapter: async (chapter, content = "Chapter body.") => {
      await writeFile(
        path.join(manuscriptRoot, `${String(chapter.id)}.md`),
        `---\n${stringify(chapter)}---\n\n${content}\n`,
        "utf8"
      );
    },
    writeOutline: async (outline) => {
      await writeFile(
        path.join(novelRoot, "narrative", "outline.yaml"),
        stringify(outline),
        "utf8"
      );
    }
  };
}

function base(id: string, entityType: string) {
  return {
    schema_version: "0.1.0",
    id,
    entity_type: entityType,
    owner: { novel_id: "NOVEL-0001" },
    status: "proposed",
    visibility: "internal",
    name: `${entityType} ${id}`,
    summary: `Semantic fixture for ${id}.`,
    tags: []
  };
}

function character(id: string) {
  return {
    ...base(id, "character"),
    aliases: [],
    psychology: {
      want: "Reach the immediate goal.",
      need: "Accept the necessary change.",
      wound: "A prior failure shapes current choices.",
      lie: "Control prevents every loss."
    },
    voice: {
      vocabulary: [],
      syntax: "Short declarative sentences.",
      notices_first: "Changes in time and location.",
      avoids: []
    },
    capabilities: [],
    limits: ["Cannot be in two locations at the same story time."],
    secrets: [],
    first_scene_id: null
  };
}

function location(id: string) {
  return {
    ...base(id, "location"),
    aliases: [],
    parent_location_id: null,
    sensory_palette: [],
    constraints: []
  };
}

function item(id: string, holderId: string, locationId: string) {
  return {
    ...base(id, "item"),
    current_holder_id: holderId,
    current_location_id: locationId,
    state: "intact",
    significance: "Tracks exclusive possession."
  };
}

function fact(id: string) {
  return {
    ...base(id, "fact"),
    statement: "The access code opens the archive.",
    confidence: 1,
    evidence: []
  };
}

function knowledge(id: string, learnedInSceneId: string) {
  return {
    ...base(id, "knowledge"),
    character_id: "CHAR-0001",
    fact_id: "FACT-0001",
    knowledge_state: "verified",
    learned_at_event_id: null,
    learned_in_scene_id: learnedInSceneId,
    source_character_id: null,
    confidence: 1
  };
}

function event(
  id: string,
  locationId: string,
  participants: string[],
  storyTime = "2041-05-13T10:00:00+08:00"
): Record<string, unknown> {
  return {
    ...base(id, "event"),
    story_time: { value: storyTime, precision: "second" },
    participants,
    location_id: locationId,
    caused_by_event_ids: [],
    consequence_event_ids: [],
    facts_established: []
  };
}

function scene(
  id: string,
  order: number,
  options: {
    locationId?: string;
    eventIds?: string[];
    knowledgeChanges?: string[];
    foreshadowingIds?: string[];
  } = {}
): Record<string, unknown> {
  return {
    ...base(id, "scene"),
    narrative_order: { volume: 1, chapter: 1, scene: order },
    pov_character_id: "CHAR-0001",
    location_id: options.locationId ?? "LOC-0001",
    event_ids: options.eventIds ?? [],
    cast_character_ids: ["CHAR-0001"],
    entry_state: "The character needs to act.",
    structure: {
      goal: "Reach the next verified fact.",
      conflict: "The available records disagree.",
      turning_point: "A trace changes the working theory.",
      crisis: "Trust the trace or investigate its source.",
      climax: "The character investigates the source.",
      resolution: "The earlier theory is no longer sufficient.",
      exit_hook: "A more dangerous inconsistency appears."
    },
    exit_state: "The character has a narrower but riskier next action.",
    knowledge_changes: options.knowledgeChanges ?? [],
    relationship_changes: [],
    foreshadowing_ids: options.foreshadowingIds ?? []
  };
}

function foreshadowing(id: string, payoffSceneId: string | null) {
  return {
    ...base(id, "foreshadowing"),
    foreshadow_state: "paid_off",
    planted_scene_id: "SCN-0001",
    reader_sees: "A key is missing one tooth.",
    true_meaning: "The key identifies the hidden archive.",
    intended_payoff: "The damaged key opens the archive at the midpoint.",
    actual_payoff_scene_id: payoffSceneId,
    abandon_reason: null
  };
}

function expectErrorCode(report: ValidationReport, code: string): void {
  expect(report.ok).toBe(false);
  expect(report.errors.map((issue) => issue.code)).toContain(code);
}

function workpack(id: string, sceneIds = ["SCN-0001"]): Record<string, unknown> {
  return {
    schema_version: "0.1.0",
    id,
    record_type: "chapter_workpack",
    owner: { novel_id: "NOVEL-0001" },
    status: "planned",
    visibility: "internal",
    canon_effect: "proposal_only",
    chapter_id: "CHAPTER-0001",
    target_word_count: { min: 3000, target: 3500, max: 4200 },
    scene_ids: sceneIds,
    required_context: {
      style_profile_ids: ["STYLE-0001"],
      canon_ids: ["CHAR-0001", "LOC-0001"],
      narrative_ids: sceneIds,
      manuscript_chapter_ids: [],
      decision_ids: []
    },
    required_reviews: {
      continuity: { required: true, review_ids: [] },
      developmental_edit: { required: true, review_ids: [] },
      reader_test: { required: true, review_ids: [] },
      line_edit: { required: false, review_ids: [] }
    },
    continuity_contract: {
      world_state: "The scene state is explicit before drafting.",
      capability_scope: "Only approved capabilities valid in this world and story phase may appear.",
      character_knowledge: "Characters may only act on known, suspected, or misbelieved facts recorded before this chapter.",
      relationship_state: "Relationship changes must name the triggering event or scene.",
      foreshadowing_plan: "Foreshadowing must be planted, advanced, paid off, or abandoned with reader-visible evidence.",
      motivation_gate: "Ability tests require a trigger, goal, hypothesis, risk, and stopping condition.",
      concept_exposure_gate: "New concepts begin as visible phenomena and consequences.",
      npc_independence_gate: "NPC routes and answers require independent goals and costs.",
      cross_layer_state_gate: "Cross-world people, items, injuries, and time must be tracked.",
      reader_exposure: {
        allowed: ["The reader may see only facts earned by the approved scenes."],
        forbidden: ["Future truth and organization-level explanations are withheld."]
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
      prose_quality_review_planned: true,
      motivation_gate_checked: true,
      concept_exposure_checked: true,
      npc_independence_checked: true,
      cross_layer_state_checked: true
    },
    resume_brief: "Load this workpack before writing or continuing the chapter."
  };
}

function styleProfile(id = "STYLE-0001"): Record<string, unknown> {
  return {
    schema_version: "0.1.0",
    id,
    record_type: "prose_style_profile",
    owner: { novel_id: "NOVEL-0001" },
    status: "planned",
    visibility: "internal",
    canon_effect: "proposal_only",
    scope: {
      novel_id: "NOVEL-0001",
      applies_to_chapter_ids: ["CHAPTER-0001"],
      source_skill_refs: ["novel-line-edit", "shuorenhua"]
    },
    style_contract: {
      positive_targets: ["Specific actions before abstract judgment."],
      protected_items: ["Keep facts and capability limits stable."],
      forbidden_patterns: ["Template cliffhangers."],
      pov_and_distance: ["Do not use knowledge outside POV."],
      dialogue_rules: ["Dialogue must change action or relationship."],
      imagery_rules: ["Images must affect action, knowledge, relationship, or payoff."]
    },
    prose_gates: {
      hard: ["No structural blockers before line edit."],
      soft: ["Reduce abstract summary density."]
    },
    revision_protocol: {
      order: ["structure", "continuity", "character", "paragraph causality", "line edit"],
      line_edit_strength: "standard",
      reread_checks: ["facts retained", "AI residue reduced"]
    },
    quality_gates: {
      protected_items_declared: true
    },
    resume_brief: "Use this profile before drafting and line editing."
  };
}

function restructurePlan(id = "RESTRUCT-0001"): Record<string, unknown> {
  return {
    schema_version: "0.1.0",
    id,
    record_type: "volume_restructure_plan",
    owner: { novel_id: "NOVEL-0001" },
    status: "planned",
    visibility: "internal",
    canon_effect: "proposal_only",
    scope: {
      novel_id: "NOVEL-0001",
      volume: 1,
      from: "story opening",
      to: "protagonist returns to the dream world",
      replaces_chapter_ids: ["CHAPTER-0001"]
    },
    source_constraints: {
      world_layers: ["Dream world normal; real world decayed."],
      capability_timeline: ["Pre-fusion forbids thought-based object control."],
      reader_exposure: ["No organization truth."],
      relationship_pacing: ["Slow-burn relationships."],
      motivation_and_concept_gates: ["Tests require motivation; concepts begin as phenomena."]
    },
    phase_plan: [
      {
        phase_id: "phase-01",
        chapter_slots: ["CHAPTER-0001"],
        world_layer: "dream_world",
        function: "Establish pressure.",
        entry_pressure: "The protagonist is exhausted.",
        decisive_change: "The problem becomes visible.",
        exit_hook: "A fair next question.",
        required_cast: ["CHAR-0001"],
        foreshadowing: ["plant footsteps"]
      }
    ],
    character_roster_policy: ["Recurring speakers must be named."],
    memory_contract: {
      must_load_ids: ["CHRUN-0001", "STYLE-0001", "RESTRUCT-0001"],
      must_update_after_draft: ["capability phase ledger", "reader exposure ledger"],
      forbidden_shortcuts: ["Do not use chat memory as authority."]
    },
    quality_gates: {
      world_layer_clear_per_chapter: true,
      ability_phase_clear_per_chapter: true,
      named_cast_has_function: true,
      spoiler_boundary_checked: true,
      prose_profile_attached: true
    },
    resume_brief: "Load this restructure plan before creating chapter workpacks."
  };
}

function chapter(id = "CHAPTER-0001"): Record<string, unknown> {
  return {
    schema_version: "0.1.0",
    id,
    document_type: "chapter",
    novel_id: "NOVEL-0001",
    title: "Fixture Chapter",
    volume: 1,
    chapter: 1,
    status: "revised",
    visibility: "internal",
    summary: "A fixture chapter used by semantic validator tests.",
    content_version: "0.1.0",
    word_count: 2,
    previous_chapter_id: null,
    next_chapter_id: null
  };
}

function reviewRecord(
  id = "REVIEW-0001",
  reviewType = "continuity",
  chapterIds = ["CHAPTER-0001"]
): Record<string, unknown> {
  return {
    schema_version: "0.1.0",
    id,
    record_type: "review_record",
    owner: { novel_id: "NOVEL-0001" },
    status: "reviewed",
    visibility: "internal",
    canon_effect: "proposal_only",
    review_type: reviewType,
    scope: {
      novel_id: "NOVEL-0001",
      chapter_ids: chapterIds,
      entity_ids: ["SCN-0001"],
      manuscript_paths: ["manuscript/chapter-0001.md"]
    },
    source_version: {
      baseline_label: "draft-2026-07-18",
      content_hash: "sha256:da517078212400224c485aa7235b8d37a0e1f0bbb4841534352bef4c96ac67b2",
      reviewed_at: "2026-07-18T10:00:00+08:00"
    },
    coverage: {
      checked: ["scene continuity", "reader exposure"],
      gaps: ["line-level prose was not reviewed"]
    },
    findings: [
      {
        key: "CONT-001",
        severity: "minor",
        status: "open",
        location: "CHAPTER-0001",
        issue: "A transition needs clearer location anchoring.",
        recommendation: "Add one concrete environmental beat before the dialogue."
      }
    ],
    conclusion: {
      verdict: "pass_with_notes",
      summary: "No blocking continuity issue found.",
      blockers: []
    },
    author_decision: {
      status: "pending",
      decision_id: null,
      notes: "Awaiting author handling decision."
    },
    reverification: {
      status: "not_required",
      required_review_ids: [],
      notes: "No blocker requires re-check."
    },
    resume_brief: "Use this review before locking the chapter or continuing revisions."
  };
}

function readerFeedbackRecord(id = "FB-0001"): Record<string, unknown> {
  return {
    schema_version: "0.1.0",
    id,
    record_type: "reader_feedback",
    owner: { novel_id: "NOVEL-0001" },
    status: "received",
    visibility: "internal",
    reader_profile: "fresh_reader",
    submitted_at: "2026-07-18T10:00:00+08:00",
    scope: {
      chapter_ids: ["CHAPTER-0001"],
      allowed_preceding_chapter_ids: [],
      source_revision: "draft-2026-07-18"
    },
    observations: {
      comprehension: "The reader understood the immediate event but not the transition.",
      confusion: ["The second paragraph felt disconnected."],
      interest_loss: [],
      expectations: ["The next chapter should clarify the sound."],
      emotional_landing: "Curious, slightly confused.",
      continue_reading: "yes"
    },
    evidence_locations: [
      {
        chapter_id: "CHAPTER-0001",
        block_id: "BLK-0001",
        content_version: "0.1.0",
        block_content_hash:
          "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
      }
    ],
    suggested_actions: ["Clarify transition before changing Canon."],
    linked_review_ids: [],
    linked_change_request_ids: [],
    processing: {
      status: "new",
      author_decision_id: null,
      notes: ""
    },
    canon_effect: "none"
  };
}

async function writeWorkpackPrerequisites(fixture: Fixture): Promise<void> {
  await fixture.writeCanon(character("CHAR-0001"));
  await fixture.writeCanon(location("LOC-0001"));
  await fixture.writeNarrative(scene("SCN-0001", 1));
  await fixture.writeStyle(styleProfile());
}

function reviewGate(
  required: boolean,
  reviewIds: string[] = []
): Record<string, unknown> {
  return { required, review_ids: reviewIds };
}

function completeRequiredReviews(): Record<string, unknown> {
  return {
    continuity: reviewGate(true, ["REVIEW-0001"]),
    developmental_edit: reviewGate(true, ["REVIEW-0002"]),
    reader_test: reviewGate(true, ["REVIEW-0003"]),
    line_edit: reviewGate(true, ["REVIEW-0004"])
  };
}

function outline(): Record<string, unknown> {
  return {
    schema_version: "0.1.0",
    template_version: "0.1.0",
    document_type: "outline",
    owner: { novel_id: "NOVEL-0001" },
    status: "proposed",
    visibility: "internal",
    title: "Fixture Outline",
    scope: {
      level: "novel",
      volume: 1,
      act: null,
      chapter: null,
      summary: "A validated outline fixture."
    },
    dependencies: { series_id: null, universe_refs: [] },
    source_refs: {
      premise_refs: [],
      canon_ids: [],
      decision_ids: [],
      research_refs: []
    },
    objective: {
      story_goal: "Move the protagonist through a causal change.",
      reader_promise: "Clear genre promise.",
      theme_question: "What changes under pressure?",
      core_conflict: "Want and cost oppose each other.",
      ending_cost: "The ending requires a meaningful loss.",
      success_criteria: ["Every beat changes pressure."]
    },
    structure: {
      lenses: ["scene-sequel"],
      opening_promise: "Open with pressure.",
      first_major_turn: "A choice changes direction.",
      midpoint_change: "The old strategy fails.",
      lowest_point: "The cost becomes unavoidable.",
      climax_choice: "The protagonist chooses with consequence.",
      resolution: "The new state is visible."
    },
    causal_spine: [
      {
        beat_key: "beat-001",
        narrative_position: "opening",
        trigger: { source_ids: [], pressure: "Initial pressure." },
        character_drive: {
          character_ids: ["CHAR-0001"],
          goal: "Get through the day.",
          motivation: "Avoid losing ground."
        },
        opposition: "The pressure intensifies.",
        choice_or_action: "The protagonist acts.",
        turning_point: "The action reveals a sharper problem.",
        consequence: {
          state_change: "The next pressure is clearer.",
          fact_ids: [],
          event_ids: []
        },
        next_pressure: "The protagonist must choose again.",
        scene_ids: []
      }
    ],
    character_arcs: [
      {
        character_id: "CHAR-0001",
        starting_state: "Avoidant.",
        want: "Safety.",
        need: "Agency.",
        wound_or_lie_pressure: "Control prevents loss.",
        irreversible_choice: "Acts despite risk.",
        ending_state: "More active.",
        beat_keys: ["beat-001"]
      }
    ],
    thread_plan: [
      {
        thread_id: "THREAD-0001",
        dramatic_question: "Will the protagonist act?",
        opening_state: "Avoiding action.",
        escalation_beat_keys: ["beat-001"],
        resolution_beat_key: "beat-001",
        intended_resolution: "The protagonist acts."
      }
    ],
    foreshadowing_plan: [],
    chapter_plan: [
      {
        volume: 1,
        chapter: 1,
        title: "Fixture Chapter",
        entry_state: "Pressure begins.",
        causal_trigger: "A concrete disturbance.",
        purpose: "Start the chain.",
        conflict: "Avoidance against pressure.",
        decisive_change: "The protagonist can no longer ignore it.",
        exit_hook: "A new question opens.",
        scene_ids: [],
        advances: {
          thread_ids: ["THREAD-0001"],
          character_ids: ["CHAR-0001"],
          relationship_ids: [],
          foreshadowing_ids: []
        }
      }
    ],
    risks: {
      continuity: [],
      pacing: [],
      genre_promise: [],
      dependency: []
    },
    open_questions: [],
    approval: {
      required_approver: "author",
      status: "pending",
      decision_record_id: null,
      decided_at: null,
      notes: ""
    },
    validation: {
      checks: ["all causal beats have a trigger, change, and next pressure"],
      evidence: []
    }
  };
}

describe("validateWorkspace semantic continuity", () => {
  test("reports an entity reference that does not exist", async () => {
    const fixture = await createFixture();
    await fixture.writeCanon(character("CHAR-0001"));
    await fixture.writeCanon(location("LOC-0001"));
    await fixture.writeNarrative(
      scene("SCN-0001", 1, { eventIds: ["EVT-9999"] })
    );

    const report = await validateWorkspace(fixture.root);

    expectErrorCode(report, "ENTITY_REFERENCE_NOT_FOUND");
  });

  test("reports one character at two locations at the same story time", async () => {
    const fixture = await createFixture();
    await fixture.writeCanon(character("CHAR-0001"));
    await fixture.writeCanon(location("LOC-0001"));
    await fixture.writeCanon(location("LOC-0002"));
    await fixture.writeNarrative(event("EVT-0001", "LOC-0001", ["CHAR-0001"]));
    await fixture.writeNarrative(event("EVT-0002", "LOC-0002", ["CHAR-0001"]));

    const report = await validateWorkspace(fixture.root);

    expectErrorCode(report, "CHARACTER_LOCATION_CONFLICT");
  });

  test("reports two simultaneous item transfers to conflicting holders", async () => {
    const fixture = await createFixture();
    await fixture.writeCanon(character("CHAR-0001"));
    await fixture.writeCanon(character("CHAR-0002"));
    await fixture.writeCanon(character("CHAR-0003"));
    await fixture.writeCanon(location("LOC-0001"));
    await fixture.writeCanon(item("ITEM-0001", "CHAR-0001", "LOC-0001"));

    const firstTransfer = {
      ...event("EVT-0001", "LOC-0001", ["CHAR-0001", "CHAR-0002"]),
      item_changes: [
        {
          item_id: "ITEM-0001",
          from_holder_id: "CHAR-0001",
          to_holder_id: "CHAR-0002",
          from_location_id: "LOC-0001",
          to_location_id: "LOC-0001",
          state_after: "held by CHAR-0002"
        }
      ]
    };
    const conflictingTransfer = {
      ...event("EVT-0002", "LOC-0001", ["CHAR-0001", "CHAR-0003"]),
      item_changes: [
        {
          item_id: "ITEM-0001",
          from_holder_id: "CHAR-0001",
          to_holder_id: "CHAR-0003",
          from_location_id: "LOC-0001",
          to_location_id: "LOC-0001",
          state_after: "held by CHAR-0003"
        }
      ]
    };
    await fixture.writeNarrative(firstTransfer);
    await fixture.writeNarrative(conflictingTransfer);

    const report = await validateWorkspace(fixture.root);

    expectErrorCode(report, "ITEM_HOLDER_CONFLICT");
  });

  test("reports knowledge used before its learned scene", async () => {
    const fixture = await createFixture();
    await fixture.writeCanon(character("CHAR-0001"));
    await fixture.writeCanon(location("LOC-0001"));
    await fixture.writeCanon(fact("FACT-0001"));
    await fixture.writeCanon(knowledge("KNOW-0001", "SCN-0002"));

    const useBeforeLearning = {
      ...scene("SCN-0001", 1),
      knowledge_used_ids: ["KNOW-0001"]
    };
    await fixture.writeNarrative(useBeforeLearning);
    await fixture.writeNarrative(
      scene("SCN-0002", 2, { knowledgeChanges: ["KNOW-0001"] })
    );

    const report = await validateWorkspace(fixture.root);

    expectErrorCode(report, "KNOWLEDGE_USED_BEFORE_LEARNED");
  });

  test("reports paid-off foreshadowing without an actual payoff scene", async () => {
    const fixture = await createFixture();
    await fixture.writeCanon(character("CHAR-0001"));
    await fixture.writeCanon(location("LOC-0001"));
    await fixture.writeNarrative(
      scene("SCN-0001", 1, { foreshadowingIds: ["FORESH-0001"] })
    );
    await fixture.writeNarrative(foreshadowing("FORESH-0001", null));

    const report = await validateWorkspace(fixture.root);

    expectErrorCode(report, "FORESHADOW_PAYOFF_MISSING");
  });

  test("reports a novel dependency on an unregistered universe version", async () => {
    const fixture = await createFixture({
      universeRegistrations: [
        {
          id: "UNIV-0001",
          name: "Fixture Universe",
          path: "universes/UNIV-0001-fixture",
          version: "0.1.0"
        }
      ],
      universeRefs: [{ universe_id: "UNIV-0001", version: "0.2.0" }]
    });

    const report = await validateWorkspace(fixture.root);

    expectErrorCode(report, "UNIVERSE_VERSION_NOT_REGISTERED");
  });

  test("accepts a consistent linked timeline, item transfer, knowledge flow, and universe version", async () => {
    const fixture = await createFixture({
      universeRegistrations: [
        {
          id: "UNIV-0001",
          name: "Fixture Universe",
          path: "universes/UNIV-0001-fixture",
          version: "0.1.0"
        }
      ],
      universeRefs: [{ universe_id: "UNIV-0001", version: "0.1.0" }]
    });
    await fixture.writeCanon(character("CHAR-0001"));
    await fixture.writeCanon(character("CHAR-0002"));
    await fixture.writeCanon(location("LOC-0001"));
    await fixture.writeCanon(item("ITEM-0001", "CHAR-0001", "LOC-0001"));
    await fixture.writeCanon(fact("FACT-0001"));
    await fixture.writeCanon(knowledge("KNOW-0001", "SCN-0001"));

    await fixture.writeNarrative({
      ...event("EVT-0001", "LOC-0001", ["CHAR-0001", "CHAR-0002"]),
      item_changes: [
        {
          item_id: "ITEM-0001",
          from_holder_id: "CHAR-0001",
          to_holder_id: "CHAR-0002",
          from_location_id: "LOC-0001",
          to_location_id: "LOC-0001",
          state_after: "held by CHAR-0002"
        }
      ]
    });
    await fixture.writeNarrative(
      event(
        "EVT-0002",
        "LOC-0001",
        ["CHAR-0002"],
        "2041-05-13T11:00:00+08:00"
      )
    );
    await fixture.writeNarrative(
      scene("SCN-0001", 1, {
        eventIds: ["EVT-0001"],
        knowledgeChanges: ["KNOW-0001"],
        foreshadowingIds: ["FORESH-0001"]
      })
    );
    await fixture.writeNarrative({
      ...scene("SCN-0002", 2, { eventIds: ["EVT-0002"] }),
      knowledge_used_ids: ["KNOW-0001"]
    });
    await fixture.writeNarrative(foreshadowing("FORESH-0001", "SCN-0002"));

    const report = await validateWorkspace(fixture.root);

    expect(report.errors).toEqual([]);
    expect(report.ok).toBe(true);
  });

  test("schema-validates outline documents in the narrative root", async () => {
    const fixture = await createFixture();
    await fixture.writeNarrativeDocument("outline.yaml", outline());

    const report = await validateWorkspace(fixture.root);

    expect(report.errors).toEqual([]);
    expect(report.warnings).toEqual([]);
    expect(report.ok).toBe(true);
  });

  test("reports outline documents that do not satisfy the outline schema", async () => {
    const fixture = await createFixture();
    const invalidOutline = outline();
    delete invalidOutline.objective;
    await fixture.writeNarrativeDocument("outline.yaml", invalidOutline);

    const report = await validateWorkspace(fixture.root);

    expectErrorCode(report, "OUTLINE_SCHEMA_INVALID");
  });

  test("reports outline documents whose owner does not match the novel", async () => {
    const fixture = await createFixture();
    const invalidOutline = outline();
    invalidOutline.owner = { novel_id: "NOVEL-9999" };
    await fixture.writeNarrativeDocument("outline.yaml", invalidOutline);

    const report = await validateWorkspace(fixture.root);

    expectErrorCode(report, "DOCUMENT_OWNER_MISMATCH");
  });

  test("reports unknown non-entity YAML documents in the narrative root", async () => {
    const fixture = await createFixture();
    await fixture.writeNarrativeDocument("mystery.yaml", {
      schema_version: "0.1.0",
      document_type: "mystery"
    });

    const report = await validateWorkspace(fixture.root);

    expectErrorCode(report, "DOCUMENT_TYPE_UNKNOWN");
  });

  test("reports chapter workpack gates that are not satisfied", async () => {
    const fixture = await createFixture();
    await fixture.writeCanon(character("CHAR-0001"));
    await fixture.writeCanon(location("LOC-0001"));
    await fixture.writeNarrative(scene("SCN-0001", 1));
    await fixture.writeWorkpack({
      ...workpack("CHRUN-0001"),
      quality_gates: {
        ...workpack("CHRUN-0001").quality_gates as Record<string, unknown>,
        reader_exposure_limited: false
      }
    });

    const report = await validateWorkspace(fixture.root);

    expectErrorCode(report, "WORKPACK_GATE_NOT_SATISFIED");
  });

  test("blocks draft-ready chapter workpacks with obvious AI residue and repetition", async () => {
    const fixture = await createFixture();
    await writeWorkpackPrerequisites(fixture);
    await fixture.writeChapter(
      chapter(),
      [
        "这意味着真正的问题不只是黑雾，更是他必须面对更大的东西。",
        "",
        "这意味着真正的问题不只是黑雾，更是他必须面对更大的东西。"
      ].join("\n")
    );
    await fixture.writeWorkpack({
      ...workpack("CHRUN-0001"),
      status: "draft_ready"
    });

    const report = await validateWorkspace(fixture.root);

    expectErrorCode(report, "WORKPACK_PROSE_HARD_GATE_FAILED");
  });

  test("reports chapter workpack references that do not exist", async () => {
    const fixture = await createFixture();
    await fixture.writeCanon(character("CHAR-0001"));
    await fixture.writeCanon(location("LOC-0001"));
    await fixture.writeWorkpack(workpack("CHRUN-0001", ["SCN-9999"]));

    const report = await validateWorkspace(fixture.root);

    expectErrorCode(report, "WORKPACK_REFERENCE_NOT_FOUND");
  });

  test("reports a restructure plan whose required style memory is missing", async () => {
    const fixture = await createFixture();
    await fixture.writeCanon(character("CHAR-0001"));
    await fixture.writeCanon(location("LOC-0001"));
    await fixture.writeNarrative(scene("SCN-0001", 1));
    await fixture.writeWorkpack(workpack("CHRUN-0001"));
    await fixture.writeRestructure(restructurePlan());

    const report = await validateWorkspace(fixture.root);

    expectErrorCode(report, "WORKFLOW_MEMORY_REFERENCE_NOT_FOUND");
  });

  test("accepts workflow records when workpack, style profile, and restructure plan are linked", async () => {
    const fixture = await createFixture();
    await fixture.writeCanon(character("CHAR-0001"));
    await fixture.writeCanon(location("LOC-0001"));
    await fixture.writeNarrative(scene("SCN-0001", 1));
    await fixture.writeStyle(styleProfile());
    await fixture.writeWorkpack(workpack("CHRUN-0001"));
    await fixture.writeRestructure(restructurePlan());

    const report = await validateWorkspace(fixture.root);

    expect(report.errors).toEqual([]);
    expect(report.ok).toBe(true);
  });

  test("reports a chapter workpack required review that does not exist", async () => {
    const fixture = await createFixture();
    await writeWorkpackPrerequisites(fixture);
    await fixture.writeChapter(chapter());
    await fixture.writeWorkpack({
      ...workpack("CHRUN-0001"),
      status: "accepted",
      required_reviews: {
        continuity: reviewGate(true, ["REVIEW-9999"]),
        developmental_edit: reviewGate(false, []),
        reader_test: reviewGate(false, []),
        line_edit: reviewGate(false, [])
      }
    });

    const report = await validateWorkspace(fixture.root);

    expectErrorCode(report, "WORKPACK_REQUIRED_REVIEW_NOT_FOUND");
  });

  test("blocks reviewed chapter workpacks when required line edit gate is disabled", async () => {
    const fixture = await createFixture();
    await writeWorkpackPrerequisites(fixture);
    await fixture.writeChapter(chapter());
    await fixture.writeReview(reviewRecord("REVIEW-0001", "continuity"));
    await fixture.writeReview(reviewRecord("REVIEW-0002", "developmental_edit"));
    await fixture.writeReview(reviewRecord("REVIEW-0003", "reader_test"));
    await fixture.writeWorkpack({
      ...workpack("CHRUN-0001"),
      status: "reviewed",
      required_reviews: {
        continuity: reviewGate(true, ["REVIEW-0001"]),
        developmental_edit: reviewGate(true, ["REVIEW-0002"]),
        reader_test: reviewGate(true, ["REVIEW-0003"]),
        line_edit: reviewGate(false, [])
      }
    });

    const report = await validateWorkspace(fixture.root);

    expectErrorCode(report, "WORKPACK_REQUIRED_REVIEW_GATE_DISABLED");
  });

  test("blocks reviewed chapter workpacks when style profile context is missing", async () => {
    const fixture = await createFixture();
    await fixture.writeCanon(character("CHAR-0001"));
    await fixture.writeCanon(location("LOC-0001"));
    await fixture.writeNarrative(scene("SCN-0001", 1));
    await fixture.writeChapter(chapter());
    for (const [id, reviewType] of [
      ["REVIEW-0001", "continuity"],
      ["REVIEW-0002", "developmental_edit"],
      ["REVIEW-0003", "reader_test"],
      ["REVIEW-0004", "line_edit"]
    ] as const) {
      await fixture.writeReview(reviewRecord(id, reviewType));
    }
    await fixture.writeWorkpack({
      ...workpack("CHRUN-0001"),
      status: "reviewed",
      required_reviews: completeRequiredReviews()
    });

    const report = await validateWorkspace(fixture.root);

    expectErrorCode(report, "WORKPACK_STYLE_PROFILE_NOT_FOUND");
  });

  test("blocks reviewed chapter workpacks when required review hash is stale", async () => {
    const fixture = await createFixture();
    await writeWorkpackPrerequisites(fixture);
    await fixture.writeChapter(chapter(), "Changed chapter body.");
    await fixture.writeReview(reviewRecord("REVIEW-0001", "continuity"));
    await fixture.writeReview(reviewRecord("REVIEW-0002", "developmental_edit"));
    await fixture.writeReview(reviewRecord("REVIEW-0003", "reader_test"));
    await fixture.writeReview(reviewRecord("REVIEW-0004", "line_edit"));
    await fixture.writeWorkpack({
      ...workpack("CHRUN-0001"),
      status: "reviewed",
      required_reviews: completeRequiredReviews()
    });

    const report = await validateWorkspace(fixture.root);

    expectErrorCode(report, "WORKPACK_REQUIRED_REVIEW_STALE");
  });

  test("reports a chapter workpack required review whose type does not match the gate", async () => {
    const fixture = await createFixture();
    await writeWorkpackPrerequisites(fixture);
    await fixture.writeChapter(chapter());
    await fixture.writeReview(reviewRecord("REVIEW-0001", "reader_test"));
    await fixture.writeWorkpack({
      ...workpack("CHRUN-0001"),
      status: "accepted",
      required_reviews: {
        continuity: reviewGate(true, ["REVIEW-0001"]),
        developmental_edit: reviewGate(false, []),
        reader_test: reviewGate(false, []),
        line_edit: reviewGate(false, [])
      }
    });

    const report = await validateWorkspace(fixture.root);

    expectErrorCode(report, "WORKPACK_REQUIRED_REVIEW_TYPE_MISMATCH");
  });

  test("reports a chapter workpack required review that does not cover the chapter", async () => {
    const fixture = await createFixture();
    await writeWorkpackPrerequisites(fixture);
    await fixture.writeChapter(chapter());
    await fixture.writeReview(reviewRecord("REVIEW-0001", "continuity", ["CHAPTER-0002"]));
    await fixture.writeWorkpack({
      ...workpack("CHRUN-0001"),
      status: "accepted",
      required_reviews: {
        continuity: reviewGate(true, ["REVIEW-0001"]),
        developmental_edit: reviewGate(false, []),
        reader_test: reviewGate(false, []),
        line_edit: reviewGate(false, [])
      }
    });

    const report = await validateWorkspace(fixture.root);

    expectErrorCode(report, "WORKPACK_REQUIRED_REVIEW_SCOPE_MISMATCH");
  });

  test("blocks accepted chapter workpacks when a required review conclusion is blocked", async () => {
    const fixture = await createFixture();
    await writeWorkpackPrerequisites(fixture);
    await fixture.writeChapter(chapter());
    await fixture.writeReview({
      ...reviewRecord("REVIEW-0001"),
      conclusion: {
        verdict: "blocked",
        summary: "A blocker remains unresolved.",
        blockers: ["CONT-001"]
      }
    });
    await fixture.writeWorkpack({
      ...workpack("CHRUN-0001"),
      status: "accepted",
      required_reviews: {
        continuity: reviewGate(true, ["REVIEW-0001"]),
        developmental_edit: reviewGate(false, []),
        reader_test: reviewGate(false, []),
        line_edit: reviewGate(false, [])
      }
    });

    const report = await validateWorkspace(fixture.root);

    expectErrorCode(report, "WORKPACK_REQUIRED_REVIEW_BLOCKED");
  });

  test("blocks accepted chapter workpacks when a required review still needs reverification", async () => {
    const fixture = await createFixture();
    await writeWorkpackPrerequisites(fixture);
    await fixture.writeChapter(chapter());
    await fixture.writeReview({
      ...reviewRecord("REVIEW-0001"),
      reverification: {
        status: "required",
        required_review_ids: ["REVIEW-0002"],
        notes: "Re-check after edits."
      }
    });
    await fixture.writeWorkpack({
      ...workpack("CHRUN-0001"),
      status: "accepted",
      required_reviews: {
        continuity: reviewGate(true, ["REVIEW-0001"]),
        developmental_edit: reviewGate(false, []),
        reader_test: reviewGate(false, []),
        line_edit: reviewGate(false, [])
      }
    });

    const report = await validateWorkspace(fixture.root);

    expectErrorCode(report, "WORKPACK_REQUIRED_REVIEW_REVERIFICATION_REQUIRED");
  });

  test("blocks reviewed chapter workpacks when a required review is inconclusive", async () => {
    const fixture = await createFixture();
    await writeWorkpackPrerequisites(fixture);
    await fixture.writeChapter(chapter());
    await fixture.writeReview({
      ...reviewRecord("REVIEW-0001"),
      conclusion: {
        verdict: "inconclusive",
        summary: "The review could not reach a usable conclusion.",
        blockers: []
      }
    });
    await fixture.writeWorkpack({
      ...workpack("CHRUN-0001"),
      status: "reviewed",
      required_reviews: {
        continuity: reviewGate(true, ["REVIEW-0001"]),
        developmental_edit: reviewGate(false, []),
        reader_test: reviewGate(false, []),
        line_edit: reviewGate(false, [])
      }
    });

    const report = await validateWorkspace(fixture.root);

    expectErrorCode(report, "WORKPACK_REQUIRED_REVIEW_VERDICT_NOT_SATISFIED");
  });

  test("blocks reviewed chapter workpacks when a required review is not complete", async () => {
    const fixture = await createFixture();
    await writeWorkpackPrerequisites(fixture);
    await fixture.writeChapter(chapter());
    await fixture.writeReview({
      ...reviewRecord("REVIEW-0001"),
      status: "planned"
    });
    await fixture.writeWorkpack({
      ...workpack("CHRUN-0001"),
      status: "reviewed",
      required_reviews: {
        continuity: reviewGate(true, ["REVIEW-0001"]),
        developmental_edit: reviewGate(false, []),
        reader_test: reviewGate(false, []),
        line_edit: reviewGate(false, [])
      }
    });

    const report = await validateWorkspace(fixture.root);

    expectErrorCode(report, "WORKPACK_REQUIRED_REVIEW_NOT_COMPLETE");
  });

  test("blocks reviewed chapter workpacks when required review reverification failed", async () => {
    const fixture = await createFixture();
    await writeWorkpackPrerequisites(fixture);
    await fixture.writeChapter(chapter());
    await fixture.writeReview({
      ...reviewRecord("REVIEW-0001"),
      reverification: {
        status: "failed",
        required_review_ids: ["REVIEW-0002"],
        notes: "Re-check failed."
      }
    });
    await fixture.writeWorkpack({
      ...workpack("CHRUN-0001"),
      status: "reviewed",
      required_reviews: {
        continuity: reviewGate(true, ["REVIEW-0001"]),
        developmental_edit: reviewGate(false, []),
        reader_test: reviewGate(false, []),
        line_edit: reviewGate(false, [])
      }
    });

    const report = await validateWorkspace(fixture.root);

    expectErrorCode(report, "WORKPACK_REQUIRED_REVIEW_REVERIFICATION_FAILED");
  });

  test("blocks reviewed chapter workpacks when a required review category is empty", async () => {
    const fixture = await createFixture();
    await writeWorkpackPrerequisites(fixture);
    await fixture.writeChapter(chapter());
    await fixture.writeReview(reviewRecord("REVIEW-0001", "continuity"));
    await fixture.writeWorkpack({
      ...workpack("CHRUN-0001"),
      status: "reviewed",
      required_reviews: {
        continuity: reviewGate(true, ["REVIEW-0001"]),
        developmental_edit: reviewGate(true, []),
        reader_test: reviewGate(true, []),
        line_edit: reviewGate(false, [])
      }
    });

    const report = await validateWorkspace(fixture.root);

    expectErrorCode(report, "WORKPACK_REQUIRED_REVIEW_MISSING");
  });

  test("blocks accepted chapter workpacks while author review handling is pending", async () => {
    const fixture = await createFixture();
    await writeWorkpackPrerequisites(fixture);
    await fixture.writeChapter(chapter());
    await fixture.writeReview(reviewRecord("REVIEW-0001", "continuity"));
    await fixture.writeReview(reviewRecord("REVIEW-0002", "developmental_edit"));
    await fixture.writeReview(reviewRecord("REVIEW-0003", "reader_test"));
    await fixture.writeWorkpack({
      ...workpack("CHRUN-0001"),
      status: "accepted",
      required_reviews: completeRequiredReviews()
    });

    const report = await validateWorkspace(fixture.root);

    expectErrorCode(report, "WORKPACK_REQUIRED_REVIEW_AUTHOR_DECISION_NOT_ACCEPTED");
  });

  test("blocks accepted chapter workpacks when author review handling was rejected", async () => {
    const fixture = await createFixture();
    await writeWorkpackPrerequisites(fixture);
    await fixture.writeChapter(chapter());
    await fixture.writeReview({
      ...reviewRecord("REVIEW-0001", "continuity"),
      author_decision: {
        status: "rejected",
        decision_id: "DEC-0001",
        notes: "Author rejected this review handling."
      }
    });
    await fixture.writeWorkpack({
      ...workpack("CHRUN-0001"),
      status: "accepted",
      required_reviews: {
        continuity: reviewGate(true, ["REVIEW-0001"]),
        developmental_edit: reviewGate(false, []),
        reader_test: reviewGate(false, []),
        line_edit: reviewGate(false, [])
      }
    });

    const report = await validateWorkspace(fixture.root);

    expectErrorCode(report, "WORKPACK_REQUIRED_REVIEW_AUTHOR_DECISION_NOT_ACCEPTED");
  });

  test("accepts a chapter workpack whose required review matrix is satisfied", async () => {
    const fixture = await createFixture();
    await writeWorkpackPrerequisites(fixture);
    await fixture.writeChapter(chapter());
    for (const [id, reviewType] of [
      ["REVIEW-0001", "continuity"],
      ["REVIEW-0002", "developmental_edit"],
      ["REVIEW-0003", "reader_test"],
      ["REVIEW-0004", "line_edit"]
    ] as const) {
      await fixture.writeReview({
        ...reviewRecord(id, reviewType),
        author_decision: {
          status: "accepted",
          decision_id: "DEC-0001",
          notes: "Author accepted the review handling."
        }
      });
    }
    await fixture.writeWorkpack({
      ...workpack("CHRUN-0001"),
      status: "accepted",
      required_reviews: completeRequiredReviews()
    });

    const report = await validateWorkspace(fixture.root);

    expect(report.errors).toEqual([]);
    expect(report.ok).toBe(true);
  });

  test("reports review records that do not satisfy the review schema", async () => {
    const fixture = await createFixture();
    await fixture.writeReview({
      ...reviewRecord(),
      findings: [
        {
          key: "CONT-001",
          severity: "blocker",
          status: "open",
          issue: "This finding omits its required recommendation."
        }
      ]
    });

    const report = await validateWorkspace(fixture.root);

    expectErrorCode(report, "REVIEW_SCHEMA_INVALID");
  });

  test("accepts a valid review record in reports reviews", async () => {
    const fixture = await createFixture();
    await fixture.writeReview(reviewRecord());

    const report = await validateWorkspace(fixture.root);

    expect(report.errors).toEqual([]);
    expect(report.ok).toBe(true);
  });

  test("reports reader feedback that does not satisfy the feedback schema", async () => {
    const fixture = await createFixture();
    await fixture.writeFeedback({
      ...readerFeedbackRecord(),
      canon_effect: "proposal_only"
    });

    const report = await validateWorkspace(fixture.root);

    expectErrorCode(report, "FEEDBACK_SCHEMA_INVALID");
  });

  test("accepts valid reader feedback in the feedback inbox", async () => {
    const fixture = await createFixture();
    await fixture.writeFeedback(readerFeedbackRecord());

    const report = await validateWorkspace(fixture.root);

    expect(report.errors).toEqual([]);
    expect(report.ok).toBe(true);
  });

  test("reports reader feedback whose owner does not match the novel", async () => {
    const fixture = await createFixture();
    await fixture.writeFeedback({
      ...readerFeedbackRecord(),
      owner: { novel_id: "NOVEL-9999" }
    });

    const report = await validateWorkspace(fixture.root);

    expectErrorCode(report, "FEEDBACK_OWNER_MISMATCH");
  });
});
