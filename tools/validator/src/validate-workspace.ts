import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

import Ajv2020, {
  type AnySchema,
  type ErrorObject,
  type ValidateFunction
} from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import matter from "gray-matter";
import { parse } from "yaml";

export interface ValidationIssue {
  code: string;
  message: string;
  path: string;
  entityId?: string;
  novelId?: string;
  details?: unknown;
}

export interface ValidationReport {
  ok: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  stats: {
    novels: number;
    entityFiles: number;
    entities: number;
    chapters: number;
  };
}

interface NovelRegistration {
  id: string;
  path: string;
}

interface WorkspaceManifest {
  active_novel_id: string | null;
  novels: NovelRegistration[];
  universes: Array<{
    id: string;
    version: string;
  }>;
}

interface NovelManifest {
  novel_id: string;
  dependencies: {
    universe_refs: Array<{
      universe_id: string;
      version: string;
    }>;
  };
  paths: {
    canon: string;
    narrative: string;
    manuscript: string;
    feedback?: string;
    reports?: string;
  };
}

interface EntityRecord {
  id: string;
  entity_type: string;
  owner?: {
    novel_id?: string;
    universe_id?: string;
  };
}

interface OutlineDocument {
  document_type: "outline";
  owner?: {
    novel_id?: string | null;
  };
}

interface StoredEntity {
  data: EntityRecord;
  filePath: string;
  novelId: string;
}

interface ChapterRecord {
  id: string;
  novel_id: string;
  volume: number;
  chapter: number;
  previous_chapter_id: string | null;
  next_chapter_id: string | null;
}

interface StoredChapter {
  data: ChapterRecord;
  filePath: string;
  novelId: string;
  contentHash: string;
  body: string;
}

interface ChapterWorkpackRecord {
  id: string;
  record_type: "chapter_workpack";
  owner?: {
    novel_id?: string;
  };
  status: string;
  chapter_id: string;
  target_word_count: {
    min: number;
    target: number;
    max: number;
  };
  scene_ids: string[];
  required_context: {
    style_profile_ids: string[];
    canon_ids: string[];
    narrative_ids: string[];
    manuscript_chapter_ids: string[];
    decision_ids: string[];
  };
  required_reviews: {
    continuity: RequiredReviewGate;
    developmental_edit: RequiredReviewGate;
    reader_test: RequiredReviewGate;
    line_edit: RequiredReviewGate;
  };
  quality_gates: Record<string, boolean>;
}

interface RequiredReviewGate {
  required: boolean;
  review_ids: string[];
}

interface StoredWorkpack {
  data: ChapterWorkpackRecord;
  filePath: string;
  novelId: string;
}

interface WorkflowRecord {
  id: string;
  record_type: string;
  owner?: {
    novel_id?: string;
  };
  status?: string;
  quality_gates?: Record<string, boolean>;
}

interface StoredWorkflowRecord {
  data: WorkflowRecord;
  filePath: string;
  novelId: string;
}

interface ReviewRecord extends WorkflowRecord {
  record_type: "review_record";
  review_type: string;
  scope: {
    novel_id: string;
    chapter_ids: string[];
  };
  source_version: {
    content_hash: string;
  };
  conclusion: {
    verdict: string;
  };
  author_decision: {
    status: string;
  };
  reverification: {
    status: string;
  };
}

interface StoredReviewRecord {
  data: ReviewRecord;
  filePath: string;
  novelId: string;
}

interface ReaderFeedbackRecord {
  id: string;
  record_type: "reader_feedback";
  owner?: {
    novel_id?: string;
  };
}

interface Validators {
  workspace: ValidateFunction;
  novel: ValidateFunction;
  canon: ValidateFunction;
  narrative: ValidateFunction;
  manuscript: ValidateFunction;
  workflow: ValidateFunction;
  review: ValidateFunction;
  feedback: ValidateFunction;
  outline: ValidateFunction;
}

const ENTITY_EXTENSIONS = new Set([".yaml", ".yml", ".md"]);
const ENTITY_ID_PATTERN = /^(?:CHAR|LOC|FACTION|ITEM|RULE|FACT|REL|KNOW|EVT|SCN|THREAD|FORESH)-[0-9]{4}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isWorkspaceManifest(value: unknown): value is WorkspaceManifest {
  return (
    isRecord(value) &&
    (typeof value.active_novel_id === "string" || value.active_novel_id === null) &&
    Array.isArray(value.novels) &&
    Array.isArray(value.universes)
  );
}

function isNovelManifest(value: unknown): value is NovelManifest {
  return (
    isRecord(value) &&
    typeof value.novel_id === "string" &&
    isRecord(value.dependencies) &&
    Array.isArray(value.dependencies.universe_refs) &&
    isRecord(value.paths) &&
    typeof value.paths.canon === "string" &&
    typeof value.paths.narrative === "string" &&
    typeof value.paths.manuscript === "string"
  );
}

function isEntityRecord(value: unknown): value is EntityRecord {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.entity_type === "string"
  );
}

function isOutlineDocument(value: unknown): value is OutlineDocument {
  return isRecord(value) && value.document_type === "outline";
}

function isChapterRecord(value: unknown): value is ChapterRecord {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.novel_id === "string" &&
    typeof value.volume === "number" &&
    typeof value.chapter === "number" &&
    (typeof value.previous_chapter_id === "string" ||
      value.previous_chapter_id === null) &&
    (typeof value.next_chapter_id === "string" || value.next_chapter_id === null)
  );
}

function isChapterWorkpackRecord(value: unknown): value is ChapterWorkpackRecord {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.record_type === "chapter_workpack" &&
    typeof value.status === "string" &&
    isRecord(value.target_word_count) &&
    typeof value.target_word_count.min === "number" &&
    typeof value.target_word_count.target === "number" &&
    typeof value.target_word_count.max === "number" &&
    Array.isArray(value.scene_ids) &&
    isRecord(value.required_context) &&
    Array.isArray(value.required_context.style_profile_ids) &&
    Array.isArray(value.required_context.canon_ids) &&
    Array.isArray(value.required_context.narrative_ids) &&
    Array.isArray(value.required_context.manuscript_chapter_ids) &&
    Array.isArray(value.required_context.decision_ids) &&
    isRecord(value.required_reviews) &&
    isRequiredReviewGate(value.required_reviews.continuity) &&
    isRequiredReviewGate(value.required_reviews.developmental_edit) &&
    isRequiredReviewGate(value.required_reviews.reader_test) &&
    isRequiredReviewGate(value.required_reviews.line_edit) &&
    isRecord(value.quality_gates)
  );
}

function isRequiredReviewGate(value: unknown): value is RequiredReviewGate {
  return (
    isRecord(value) &&
    typeof value.required === "boolean" &&
    Array.isArray(value.review_ids)
  );
}

function isWorkflowRecord(value: unknown): value is WorkflowRecord {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.record_type === "string"
  );
}

function isReviewRecord(value: unknown): value is ReviewRecord {
  const record = isRecord(value) ? value : null;
  const scope = record === null ? null : recordValue(record, "scope");
  const conclusion = record === null ? null : recordValue(record, "conclusion");
  const authorDecision = record === null ? null : recordValue(record, "author_decision");
  const reverification = record === null ? null : recordValue(record, "reverification");
  return (
    isWorkflowRecord(value) &&
    value.record_type === "review_record" &&
    record !== null &&
    typeof record.review_type === "string" &&
    scope !== null &&
    typeof scope.novel_id === "string" &&
    Array.isArray(scope.chapter_ids) &&
    isRecord(record.source_version) &&
    typeof record.source_version.content_hash === "string" &&
    conclusion !== null &&
    typeof conclusion.verdict === "string" &&
    authorDecision !== null &&
    typeof authorDecision.status === "string" &&
    reverification !== null &&
    typeof reverification.status === "string"
  );
}

function isReaderFeedbackRecord(value: unknown): value is ReaderFeedbackRecord {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.record_type === "reader_feedback"
  );
}

function sha256(content: string): string {
  return `sha256:${createHash("sha256").update(content).digest("hex")}`;
}

function proseHardGateFindings(content: string): string[] {
  const findings: string[] = [];
  const paragraphs = content
    .split(/\r?\n\s*\r?\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter((paragraph) => paragraph.length >= 20);
  const seenParagraphs = new Set<string>();
  for (const paragraph of paragraphs) {
    if (seenParagraphs.has(paragraph)) {
      findings.push("repeated paragraph");
      break;
    }
    seenParagraphs.add(paragraph);
  }

  const sentences = content
    .split(/[。！？!?]\s*/)
    .map((sentence) => sentence.replace(/\s+/g, " ").trim())
    .filter((sentence) => sentence.length >= 20);
  const seenSentences = new Set<string>();
  for (const sentence of sentences) {
    if (seenSentences.has(sentence)) {
      findings.push("repeated sentence");
      break;
    }
    seenSentences.add(sentence);
  }

  const aiResiduePatterns = [
    /这意味着[^。！？!?]{0,80}不只是[^。！？!?]{0,80}更是/u,
    /真正的问题/u,
    /更大的东西/u,
    /某种意义上/u,
    /这并不(?:只|是)/u
  ];
  for (const pattern of aiResiduePatterns) {
    if (pattern.test(content)) {
      findings.push("ai residue pattern");
      break;
    }
  }

  return findings;
}

async function loadJson(filePath: string): Promise<AnySchema> {
  return JSON.parse(await readFile(filePath, "utf8")) as AnySchema;
}

async function loadYaml(filePath: string): Promise<unknown> {
  return parse(await readFile(filePath, "utf8")) as unknown;
}

async function createValidators(root: string): Promise<Validators> {
  const schemaRoot = path.join(root, "schemas");
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  ajv.addSchema(await loadJson(path.join(schemaRoot, "common.schema.json")));

  return {
    workspace: ajv.compile(
      await loadJson(path.join(schemaRoot, "workspace-manifest.schema.json"))
    ),
    novel: ajv.compile(
      await loadJson(path.join(schemaRoot, "novel-manifest.schema.json"))
    ),
    canon: ajv.compile(
      await loadJson(path.join(schemaRoot, "canon-entity.schema.json"))
    ),
    narrative: ajv.compile(
      await loadJson(path.join(schemaRoot, "narrative-entity.schema.json"))
    ),
    manuscript: ajv.compile(
      await loadJson(path.join(schemaRoot, "manuscript.schema.json"))
    ),
    workflow: ajv.compile(
      await loadJson(path.join(schemaRoot, "workflow-run.schema.json"))
    ),
    review: ajv.compile(
      await loadJson(path.join(schemaRoot, "review-record.schema.json"))
    ),
    feedback: ajv.compile(
      await loadJson(path.join(schemaRoot, "reader-feedback.schema.json"))
    ),
    outline: ajv.compile(
      await loadJson(path.join(schemaRoot, "outline.schema.json"))
    )
  };
}

function schemaIssues(
  code: string,
  filePath: string,
  errors: ErrorObject[] | null | undefined
): ValidationIssue[] {
  return (errors ?? []).map((error) => ({
    code,
    message: `${error.instancePath || "/"}: ${error.message ?? "schema validation failed"}`,
    path: filePath,
    details: error
  }));
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function listEntityFiles(directory: string): Promise<string[]> {
  if (!(await exists(directory))) {
    return [];
  }

  const files: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listEntityFiles(entryPath)));
    } else if (entry.isFile() && ENTITY_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(entryPath);
    }
  }
  return files.sort((left, right) => left.localeCompare(right));
}

async function loadEntity(filePath: string): Promise<unknown> {
  const content = await readFile(filePath, "utf8");
  if (path.extname(filePath).toLowerCase() === ".md") {
    return matter(content).data as unknown;
  }
  return parse(content) as unknown;
}

function collectEntityReferences(value: unknown, key = "", refs = new Set<string>()): Set<string> {
  if (typeof value === "string") {
    if (key !== "id" && ENTITY_ID_PATTERN.test(value)) {
      refs.add(value);
    }
    return refs;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectEntityReferences(item, key, refs);
    }
    return refs;
  }
  if (isRecord(value)) {
    for (const [childKey, childValue] of Object.entries(value)) {
      collectEntityReferences(childValue, childKey, refs);
    }
  }
  return refs;
}

function stringValue(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" ? value : null;
}

function recordValue(record: Record<string, unknown>, key: string): Record<string, unknown> | null {
  const value = record[key];
  return isRecord(value) ? value : null;
}

function stringArray(record: Record<string, unknown>, key: string): string[] {
  const value = record[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function compareNarrativeOrder(
  left: Record<string, unknown>,
  right: Record<string, unknown>
): number {
  for (const key of ["volume", "chapter", "scene"] as const) {
    const leftValue = typeof left[key] === "number" ? left[key] : 0;
    const rightValue = typeof right[key] === "number" ? right[key] : 0;
    if (leftValue !== rightValue) {
      return leftValue - rightValue;
    }
  }
  return 0;
}

function validateSemanticContinuity(
  entities: StoredEntity[],
  errors: ValidationIssue[]
): void {
  const index = new Map<string, StoredEntity>();
  for (const entity of entities) {
    index.set(`${entity.novelId}:${entity.data.id}`, entity);
  }

  for (const entity of entities) {
    for (const reference of collectEntityReferences(entity.data)) {
      if (!index.has(`${entity.novelId}:${reference}`)) {
        errors.push({
          code: "ENTITY_REFERENCE_NOT_FOUND",
          message: `Referenced entity ${reference} does not exist in ${entity.novelId}.`,
          path: entity.filePath,
          entityId: entity.data.id,
          novelId: entity.novelId,
          details: { reference }
        });
      }
    }
  }

  const characterLocations = new Map<string, { locationId: string; entity: StoredEntity }>();
  const itemDestinations = new Map<
    string,
    { holderId: string | null; locationId: string | null; entity: StoredEntity }
  >();
  const sceneOrders = new Map<string, { order: Record<string, unknown>; entity: StoredEntity }>();
  const knowledgeRecords = new Map<string, StoredEntity>();

  for (const entity of entities) {
    const data = entity.data as unknown as Record<string, unknown>;
    if (entity.data.entity_type === "scene") {
      const order = recordValue(data, "narrative_order");
      if (order !== null) {
        sceneOrders.set(`${entity.novelId}:${entity.data.id}`, { order, entity });
      }
    } else if (entity.data.entity_type === "knowledge") {
      knowledgeRecords.set(`${entity.novelId}:${entity.data.id}`, entity);
    }

    if (entity.data.entity_type !== "event") {
      continue;
    }
    const storyTime = recordValue(data, "story_time");
    const timeValue = storyTime === null ? null : stringValue(storyTime, "value");
    const locationId = stringValue(data, "location_id");
    if (timeValue === null || locationId === null) {
      continue;
    }

    for (const characterId of stringArray(data, "participants")) {
      const key = `${entity.novelId}:${timeValue}:${characterId}`;
      const previous = characterLocations.get(key);
      if (previous !== undefined && previous.locationId !== locationId) {
        errors.push({
          code: "CHARACTER_LOCATION_CONFLICT",
          message: `${characterId} appears at ${previous.locationId} and ${locationId} at ${timeValue}.`,
          path: entity.filePath,
          entityId: entity.data.id,
          novelId: entity.novelId,
          details: { conflictingEntityId: previous.entity.data.id, characterId, timeValue }
        });
      } else if (previous === undefined) {
        characterLocations.set(key, { locationId, entity });
      }
    }

    const itemChanges = data.item_changes;
    if (!Array.isArray(itemChanges)) {
      continue;
    }
    for (const itemChange of itemChanges) {
      if (!isRecord(itemChange)) {
        continue;
      }
      const itemId = stringValue(itemChange, "item_id");
      if (itemId === null) {
        continue;
      }
      const holderId = stringValue(itemChange, "to_holder_id");
      const targetLocationId = stringValue(itemChange, "to_location_id");
      const key = `${entity.novelId}:${timeValue}:${itemId}`;
      const previous = itemDestinations.get(key);
      if (
        previous !== undefined &&
        (previous.holderId !== holderId || previous.locationId !== targetLocationId)
      ) {
        errors.push({
          code: "ITEM_HOLDER_CONFLICT",
          message: `${itemId} has conflicting destinations at ${timeValue}.`,
          path: entity.filePath,
          entityId: entity.data.id,
          novelId: entity.novelId,
          details: { conflictingEntityId: previous.entity.data.id, itemId, timeValue }
        });
      } else if (previous === undefined) {
        itemDestinations.set(key, { holderId, locationId: targetLocationId, entity });
      }
    }
  }

  for (const entity of entities) {
    const data = entity.data as unknown as Record<string, unknown>;
    if (entity.data.entity_type === "scene") {
      const usedKnowledgeIds = stringArray(data, "knowledge_used_ids");
      const usingScene = sceneOrders.get(`${entity.novelId}:${entity.data.id}`);
      if (usingScene !== undefined) {
        for (const knowledgeId of usedKnowledgeIds) {
          const knowledge = knowledgeRecords.get(`${entity.novelId}:${knowledgeId}`);
          if (knowledge === undefined) {
            continue;
          }
          const knowledgeData = knowledge.data as unknown as Record<string, unknown>;
          const learnedSceneId = stringValue(knowledgeData, "learned_in_scene_id");
          if (learnedSceneId === null) {
            continue;
          }
          const learnedScene = sceneOrders.get(`${entity.novelId}:${learnedSceneId}`);
          if (
            learnedScene !== undefined &&
            compareNarrativeOrder(usingScene.order, learnedScene.order) < 0
          ) {
            errors.push({
              code: "KNOWLEDGE_USED_BEFORE_LEARNED",
              message: `${knowledgeId} is used in ${entity.data.id} before ${learnedSceneId}.`,
              path: entity.filePath,
              entityId: entity.data.id,
              novelId: entity.novelId,
              details: { knowledgeId, learnedSceneId }
            });
          }
        }
      }
    } else if (entity.data.entity_type === "foreshadowing") {
      if (
        stringValue(data, "foreshadow_state") === "paid_off" &&
        stringValue(data, "actual_payoff_scene_id") === null
      ) {
        errors.push({
          code: "FORESHADOW_PAYOFF_MISSING",
          message: "Paid-off foreshadowing must name its actual payoff scene.",
          path: entity.filePath,
          entityId: entity.data.id,
          novelId: entity.novelId
        });
      }
    }
  }
}

function validateChapterWorkpacks(
  workpacks: StoredWorkpack[],
  workflowRecords: StoredWorkflowRecord[],
  entities: StoredEntity[],
  chapters: StoredChapter[],
  reviews: StoredReviewRecord[],
  errors: ValidationIssue[]
): void {
  const entityIndex = new Map<string, StoredEntity>();
  for (const entity of entities) {
    entityIndex.set(`${entity.novelId}:${entity.data.id}`, entity);
  }

  const chapterIndex = new Map(
    chapters.map((chapter) => [`${chapter.novelId}:${chapter.data.id}`, chapter])
  );
  const workflowIndex = new Map(
    workflowRecords.map((record) => [`${record.novelId}:${record.data.id}`, record])
  );
  const reviewIndex = new Map<string, StoredReviewRecord>();
  for (const review of reviews) {
    reviewIndex.set(`${review.novelId}:${review.data.id}`, review);
  }

  for (const workpack of workpacks) {
    const { data } = workpack;
    const wordCount = data.target_word_count;
    if (!(wordCount.min <= wordCount.target && wordCount.target <= wordCount.max)) {
      errors.push({
        code: "WORKPACK_WORD_COUNT_RANGE_INVALID",
        message: "Chapter workpack target_word_count must satisfy min <= target <= max.",
        path: workpack.filePath,
        entityId: data.id,
        novelId: workpack.novelId,
        details: wordCount
      });
    }

    if (!["blocked", "stale"].includes(data.status)) {
      for (const [gate, passed] of Object.entries(data.quality_gates)) {
        if (passed !== true) {
          errors.push({
            code: "WORKPACK_GATE_NOT_SATISFIED",
            message: `Chapter workpack gate ${gate} must be true before drafting or continuing.`,
            path: workpack.filePath,
            entityId: data.id,
            novelId: workpack.novelId,
            details: { gate }
          });
        }
      }
    }

    const referencedEntityIds = new Set([
      ...data.scene_ids,
      ...data.required_context.canon_ids,
      ...data.required_context.narrative_ids
    ]);
    for (const reference of referencedEntityIds) {
      if (!entityIndex.has(`${workpack.novelId}:${reference}`)) {
        errors.push({
          code: "WORKPACK_REFERENCE_NOT_FOUND",
          message: `Chapter workpack references missing entity ${reference}.`,
          path: workpack.filePath,
          entityId: data.id,
          novelId: workpack.novelId,
          details: { reference }
        });
      }
    }

    for (const styleProfileId of data.required_context.style_profile_ids) {
      const styleProfile = workflowIndex.get(`${workpack.novelId}:${styleProfileId}`);
      if (styleProfile === undefined) {
        errors.push({
          code: "WORKPACK_STYLE_PROFILE_NOT_FOUND",
          message: `Chapter workpack requires missing style profile ${styleProfileId}.`,
          path: workpack.filePath,
          entityId: data.id,
          novelId: workpack.novelId,
          details: { reference: styleProfileId }
        });
        continue;
      }
      if (styleProfile.data.record_type !== "prose_style_profile") {
        errors.push({
          code: "WORKPACK_STYLE_PROFILE_TYPE_MISMATCH",
          message: `Chapter workpack style profile reference ${styleProfileId} must be a prose_style_profile.`,
          path: workpack.filePath,
          entityId: data.id,
          novelId: workpack.novelId,
          details: {
            reference: styleProfileId,
            actualRecordType: styleProfile.data.record_type
          }
        });
      }
    }

    const contextNarrativeIds = new Set(data.required_context.narrative_ids);
    for (const sceneId of data.scene_ids) {
      if (!contextNarrativeIds.has(sceneId)) {
        errors.push({
          code: "WORKPACK_SCENE_NOT_IN_CONTEXT",
          message: `Chapter workpack scene ${sceneId} must also appear in required_context.narrative_ids.`,
          path: workpack.filePath,
          entityId: data.id,
          novelId: workpack.novelId,
          details: { sceneId }
        });
      }
    }

    if (
      ["draft_ready", "reviewed", "accepted"].includes(data.status) &&
      !chapterIndex.has(`${workpack.novelId}:${data.chapter_id}`)
    ) {
      errors.push({
        code: "WORKPACK_CHAPTER_NOT_FOUND",
        message: `Chapter workpack status ${data.status} requires existing manuscript ${data.chapter_id}.`,
        path: workpack.filePath,
        entityId: data.id,
        novelId: workpack.novelId,
        details: { chapterId: data.chapter_id }
      });
    }

    const currentChapter = chapterIndex.get(`${workpack.novelId}:${data.chapter_id}`);
    if (["draft_ready", "reviewed", "accepted"].includes(data.status) && currentChapter !== undefined) {
      const findings = proseHardGateFindings(currentChapter.body);
      if (findings.length > 0) {
        errors.push({
          code: "WORKPACK_PROSE_HARD_GATE_FAILED",
          message: `Chapter workpack ${data.id} cannot be ${data.status} while ${data.chapter_id} has obvious prose hard-gate issues.`,
          path: workpack.filePath,
          entityId: data.id,
          novelId: workpack.novelId,
          details: {
            chapterId: data.chapter_id,
            findings: [...new Set(findings)]
          }
        });
      }
    }

    for (const chapterId of data.required_context.manuscript_chapter_ids) {
      if (!chapterIndex.has(`${workpack.novelId}:${chapterId}`)) {
        errors.push({
          code: "WORKPACK_CHAPTER_REFERENCE_NOT_FOUND",
          message: `Chapter workpack references missing manuscript ${chapterId}.`,
          path: workpack.filePath,
          entityId: data.id,
          novelId: workpack.novelId,
          details: { chapterId }
        });
      }
    }

    if (["reviewed", "accepted"].includes(data.status)) {
      const requiredReviewGroups = [
        {
          field: "continuity",
          expectedReviewType: "continuity",
          gate: data.required_reviews.continuity
        },
        {
          field: "developmental_edit",
          expectedReviewType: "developmental_edit",
          gate: data.required_reviews.developmental_edit
        },
        {
          field: "reader_test",
          expectedReviewType: "reader_test",
          gate: data.required_reviews.reader_test
        },
        {
          field: "line_edit",
          expectedReviewType: "line_edit",
          gate: data.required_reviews.line_edit
        }
      ];

      for (const group of requiredReviewGroups) {
        if (!group.gate.required) {
          errors.push({
            code: "WORKPACK_REQUIRED_REVIEW_GATE_DISABLED",
            message: `Chapter workpack must require ${group.expectedReviewType} review before it can be ${data.status}.`,
            path: workpack.filePath,
            entityId: data.id,
            novelId: workpack.novelId,
            details: { field: group.field, status: data.status }
          });
        }

        if (group.gate.required && group.gate.review_ids.length === 0) {
          errors.push({
            code: "WORKPACK_REQUIRED_REVIEW_MISSING",
            message: `Chapter workpack requires at least one ${group.expectedReviewType} review before it can be ${data.status}.`,
            path: workpack.filePath,
            entityId: data.id,
            novelId: workpack.novelId,
            details: { field: group.field, status: data.status }
          });
        }

        for (const reviewId of group.gate.review_ids) {
          const review = reviewIndex.get(`${workpack.novelId}:${reviewId}`);
          if (review === undefined) {
            errors.push({
              code: "WORKPACK_REQUIRED_REVIEW_NOT_FOUND",
              message: `Chapter workpack requires missing review ${reviewId}.`,
              path: workpack.filePath,
              entityId: data.id,
              novelId: workpack.novelId,
              details: { reference: reviewId, field: group.field }
            });
            continue;
          }

          if (review.data.review_type !== group.expectedReviewType) {
            errors.push({
              code: "WORKPACK_REQUIRED_REVIEW_TYPE_MISMATCH",
              message: `Chapter workpack review ${reviewId} must be ${group.expectedReviewType}, not ${review.data.review_type}.`,
              path: workpack.filePath,
              entityId: data.id,
              novelId: workpack.novelId,
              details: {
                reference: reviewId,
                field: group.field,
                expectedReviewType: group.expectedReviewType,
                actualReviewType: review.data.review_type
              }
            });
          }

          if (!["reviewed", "accepted"].includes(review.data.status ?? "")) {
            errors.push({
              code: "WORKPACK_REQUIRED_REVIEW_NOT_COMPLETE",
              message: `Chapter workpack review ${reviewId} must be reviewed or accepted before the workpack can be ${data.status}.`,
              path: workpack.filePath,
              entityId: data.id,
              novelId: workpack.novelId,
              details: {
                reference: reviewId,
                reviewStatus: review.data.status,
                status: data.status
              }
            });
          }

          if (
            review.data.scope.novel_id !== workpack.novelId ||
            !review.data.scope.chapter_ids.includes(data.chapter_id)
          ) {
            errors.push({
              code: "WORKPACK_REQUIRED_REVIEW_SCOPE_MISMATCH",
              message: `Chapter workpack review ${reviewId} must cover ${data.chapter_id} in ${workpack.novelId}.`,
              path: workpack.filePath,
              entityId: data.id,
              novelId: workpack.novelId,
              details: {
                reference: reviewId,
                chapterId: data.chapter_id,
                reviewNovelId: review.data.scope.novel_id,
                reviewChapterIds: review.data.scope.chapter_ids
              }
            });
          }

          const chapter = chapterIndex.get(`${workpack.novelId}:${data.chapter_id}`);
          if (
            chapter !== undefined &&
            review.data.source_version.content_hash !== chapter.contentHash
          ) {
            errors.push({
              code: "WORKPACK_REQUIRED_REVIEW_STALE",
              message: `Chapter workpack review ${reviewId} was created for ${review.data.source_version.content_hash}, but ${data.chapter_id} is currently ${chapter.contentHash}.`,
              path: workpack.filePath,
              entityId: data.id,
              novelId: workpack.novelId,
              details: {
                reference: reviewId,
                chapterId: data.chapter_id,
                reviewContentHash: review.data.source_version.content_hash,
                currentContentHash: chapter.contentHash
              }
            });
          }

          if (review.data.conclusion.verdict === "blocked") {
            errors.push({
              code: "WORKPACK_REQUIRED_REVIEW_BLOCKED",
              message: `Chapter workpack cannot be ${data.status} while review ${reviewId} is blocked.`,
              path: workpack.filePath,
              entityId: data.id,
              novelId: workpack.novelId,
              details: { reference: reviewId, status: data.status }
            });
          }

          if (review.data.conclusion.verdict === "inconclusive") {
            errors.push({
              code: "WORKPACK_REQUIRED_REVIEW_VERDICT_NOT_SATISFIED",
              message: `Chapter workpack review ${reviewId} must have a conclusive pass verdict before the workpack can be ${data.status}.`,
              path: workpack.filePath,
              entityId: data.id,
              novelId: workpack.novelId,
              details: {
                reference: reviewId,
                verdict: review.data.conclusion.verdict,
                status: data.status
              }
            });
          }

          if (!["pass", "pass_with_notes"].includes(review.data.conclusion.verdict)) {
            errors.push({
              code: "WORKPACK_REQUIRED_REVIEW_VERDICT_NOT_SATISFIED",
              message: `Chapter workpack review ${reviewId} must pass before the workpack can be ${data.status}.`,
              path: workpack.filePath,
              entityId: data.id,
              novelId: workpack.novelId,
              details: {
                reference: reviewId,
                verdict: review.data.conclusion.verdict,
                status: data.status
              }
            });
          }

          if (review.data.reverification.status === "required") {
            errors.push({
              code: "WORKPACK_REQUIRED_REVIEW_REVERIFICATION_REQUIRED",
              message: `Chapter workpack cannot be ${data.status} while review ${reviewId} still requires reverification.`,
              path: workpack.filePath,
              entityId: data.id,
              novelId: workpack.novelId,
              details: { reference: reviewId, status: data.status }
            });
          }

          if (review.data.reverification.status === "failed") {
            errors.push({
              code: "WORKPACK_REQUIRED_REVIEW_REVERIFICATION_FAILED",
              message: `Chapter workpack cannot be ${data.status} while review ${reviewId} has failed reverification.`,
              path: workpack.filePath,
              entityId: data.id,
              novelId: workpack.novelId,
              details: { reference: reviewId, status: data.status }
            });
          }

          if (
            data.status === "accepted" &&
            review.data.author_decision.status !== "accepted"
          ) {
            errors.push({
              code: "WORKPACK_REQUIRED_REVIEW_AUTHOR_DECISION_NOT_ACCEPTED",
              message: `Chapter workpack cannot be accepted until the author accepts review ${reviewId} handling.`,
              path: workpack.filePath,
              entityId: data.id,
              novelId: workpack.novelId,
              details: {
                reference: reviewId,
                authorDecisionStatus: review.data.author_decision.status
              }
            });
          }
        }
      }
    }
  }
}

function validateWorkflowRecords(
  records: StoredWorkflowRecord[],
  entities: StoredEntity[],
  chapters: StoredChapter[],
  errors: ValidationIssue[]
): void {
  const workflowIndex = new Set(records.map((record) => `${record.novelId}:${record.data.id}`));
  const entityIndex = new Set(entities.map((entity) => `${entity.novelId}:${entity.data.id}`));
  const chapterIndex = new Set(chapters.map((chapter) => `${chapter.novelId}:${chapter.data.id}`));

  for (const record of records) {
    const { data } = record;
    if (data.owner?.novel_id !== record.novelId) {
      errors.push({
        code: "WORKFLOW_OWNER_MISMATCH",
        message: `Workflow record owner must be ${record.novelId} inside this novel.`,
        path: record.filePath,
        entityId: data.id,
        novelId: record.novelId
      });
    }

    if (
      data.quality_gates !== undefined &&
      !["blocked", "stale"].includes(data.status ?? "")
    ) {
      for (const [gate, passed] of Object.entries(data.quality_gates)) {
        if (passed !== true) {
          errors.push({
            code: "WORKFLOW_GATE_NOT_SATISFIED",
            message: `Workflow record gate ${gate} must be true before use.`,
            path: record.filePath,
            entityId: data.id,
            novelId: record.novelId,
            details: { gate }
          });
        }
      }
    }

    const recordData = data as unknown as Record<string, unknown>;
    const memoryContract = recordValue(recordData, "memory_contract");
    if (memoryContract === null) {
      continue;
    }

    for (const reference of stringArray(memoryContract, "must_load_ids")) {
      const scopedReference = `${record.novelId}:${reference}`;
      if (
        !workflowIndex.has(scopedReference) &&
        !entityIndex.has(scopedReference) &&
        !chapterIndex.has(scopedReference)
      ) {
        errors.push({
          code: "WORKFLOW_MEMORY_REFERENCE_NOT_FOUND",
          message: `Workflow record references missing required memory ${reference}.`,
          path: record.filePath,
          entityId: data.id,
          novelId: record.novelId,
          details: { reference }
        });
      }
    }
  }
}

export async function validateWorkspace(rootPath: string): Promise<ValidationReport> {
  const root = path.resolve(rootPath);
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const stats = { novels: 0, entityFiles: 0, entities: 0, chapters: 0 };
  const storedEntities: StoredEntity[] = [];
  const storedChapters: StoredChapter[] = [];
  const storedWorkpacks: StoredWorkpack[] = [];
  const storedWorkflowRecords: StoredWorkflowRecord[] = [];
  const storedReviews: StoredReviewRecord[] = [];
  let validators: Validators;

  try {
    validators = await createValidators(root);
  } catch (error) {
    errors.push({
      code: "SCHEMA_LOAD_FAILED",
      message: error instanceof Error ? error.message : String(error),
      path: path.join(root, "schemas")
    });
    return { ok: false, errors, warnings, stats };
  }

  const workspacePath = path.join(root, "workspace", "manifest.yaml");
  let workspace: unknown;
  try {
    workspace = await loadYaml(workspacePath);
  } catch (error) {
    errors.push({
      code: "WORKSPACE_MANIFEST_READ_FAILED",
      message: error instanceof Error ? error.message : String(error),
      path: workspacePath
    });
    return { ok: false, errors, warnings, stats };
  }

  if (!validators.workspace(workspace)) {
    errors.push(
      ...schemaIssues("WORKSPACE_SCHEMA_INVALID", workspacePath, validators.workspace.errors)
    );
    return { ok: false, errors, warnings, stats };
  }
  if (!isWorkspaceManifest(workspace)) {
    errors.push({
      code: "WORKSPACE_MANIFEST_INVALID",
      message: "Workspace manifest has an unexpected runtime shape.",
      path: workspacePath
    });
    return { ok: false, errors, warnings, stats };
  }

  const registeredIds = new Set(workspace.novels.map((novel) => novel.id));
  if (
    workspace.active_novel_id !== null &&
    !registeredIds.has(workspace.active_novel_id)
  ) {
    errors.push({
      code: "ACTIVE_NOVEL_NOT_REGISTERED",
      message: `Active novel ${workspace.active_novel_id} is not registered.`,
      path: workspacePath,
      novelId: workspace.active_novel_id
    });
  }

  const entityLocations = new Map<string, string>();
  for (const registration of workspace.novels) {
    stats.novels += 1;
    const novelRoot = path.resolve(root, registration.path);
    if (!(await exists(novelRoot))) {
      errors.push({
        code: "NOVEL_DIRECTORY_MISSING",
        message: `Registered novel directory does not exist: ${registration.path}`,
        path: novelRoot,
        novelId: registration.id
      });
      continue;
    }

    const novelManifestPath = path.join(novelRoot, "manifest.yaml");
    let novelManifest: unknown;
    try {
      novelManifest = await loadYaml(novelManifestPath);
    } catch (error) {
      errors.push({
        code: "NOVEL_MANIFEST_READ_FAILED",
        message: error instanceof Error ? error.message : String(error),
        path: novelManifestPath,
        novelId: registration.id
      });
      continue;
    }

    if (!validators.novel(novelManifest)) {
      errors.push(
        ...schemaIssues("NOVEL_SCHEMA_INVALID", novelManifestPath, validators.novel.errors)
      );
      continue;
    }
    if (!isNovelManifest(novelManifest)) {
      errors.push({
        code: "NOVEL_MANIFEST_INVALID",
        message: "Novel manifest has an unexpected runtime shape.",
        path: novelManifestPath,
        novelId: registration.id
      });
      continue;
    }
    if (novelManifest.novel_id !== registration.id) {
      errors.push({
        code: "NOVEL_ID_MISMATCH",
        message: `Manifest novel_id ${novelManifest.novel_id} does not match registration ${registration.id}.`,
        path: novelManifestPath,
        novelId: registration.id
      });
    }
    for (const universeRef of novelManifest.dependencies.universe_refs) {
      const registered = workspace.universes.some(
        (universe) =>
          universe.id === universeRef.universe_id && universe.version === universeRef.version
      );
      if (!registered) {
        errors.push({
          code: "UNIVERSE_VERSION_NOT_REGISTERED",
          message: `Universe ${universeRef.universe_id}@${universeRef.version} is not registered.`,
          path: novelManifestPath,
          novelId: registration.id,
          details: universeRef
        });
      }
    }

    const roots = [
      { kind: "canon" as const, directory: path.join(novelRoot, novelManifest.paths.canon) },
      {
        kind: "narrative" as const,
        directory: path.join(novelRoot, novelManifest.paths.narrative)
      }
    ];

    for (const entityRoot of roots) {
      const files = await listEntityFiles(entityRoot.directory);
      stats.entityFiles += files.length;
      for (const filePath of files) {
        let entity: unknown;
        try {
          entity = await loadEntity(filePath);
        } catch (error) {
          errors.push({
            code: "ENTITY_READ_FAILED",
            message: error instanceof Error ? error.message : String(error),
            path: filePath,
            novelId: registration.id
          });
          continue;
        }

        if (!isEntityRecord(entity)) {
          if (entityRoot.kind === "narrative" && isRecord(entity) && "document_type" in entity) {
            if (isOutlineDocument(entity)) {
              if (!validators.outline(entity)) {
                errors.push(
                  ...schemaIssues("OUTLINE_SCHEMA_INVALID", filePath, validators.outline.errors).map(
                    (issue) => ({ ...issue, novelId: registration.id })
                  )
                );
                continue;
              }
              if (entity.owner?.novel_id !== registration.id) {
                errors.push({
                  code: "DOCUMENT_OWNER_MISMATCH",
                  message: `Outline owner must be ${registration.id} inside this novel.`,
                  path: filePath,
                  novelId: registration.id
                });
              }
              continue;
            }

            errors.push({
              code: "DOCUMENT_TYPE_UNKNOWN",
              message: `Narrative document_type ${String(entity.document_type)} is not recognized.`,
              path: filePath,
              novelId: registration.id,
              details: { documentType: entity.document_type }
            });
            continue;
          }

          warnings.push({
            code: "ENTITY_RECORD_SKIPPED",
            message: "File has no entity id/entity_type and was not schema-validated.",
            path: filePath,
            novelId: registration.id
          });
          continue;
        }
        stats.entities += 1;
        storedEntities.push({ data: entity, filePath, novelId: registration.id });

        const entityId = entity.id;
        const validateEntity =
          entityRoot.kind === "canon" ? validators.canon : validators.narrative;
        if (!validateEntity(entity)) {
          errors.push(
            ...schemaIssues("ENTITY_SCHEMA_INVALID", filePath, validateEntity.errors).map(
              (issue) => ({ ...issue, entityId, novelId: registration.id })
            )
          );
        }

        const scopedEntityId = `${registration.id}:${entity.id}`;
        const previousPath = entityLocations.get(scopedEntityId);
        if (previousPath !== undefined) {
          errors.push({
            code: "DUPLICATE_ENTITY_ID",
            message: `Entity id ${entity.id} is also used by ${previousPath}.`,
            path: filePath,
            entityId: entity.id,
            novelId: registration.id,
            details: { previousPath }
          });
        } else {
          entityLocations.set(scopedEntityId, filePath);
        }

        if (entity.owner?.novel_id !== registration.id) {
          errors.push({
            code: "ENTITY_OWNER_MISMATCH",
            message: `Entity owner must be ${registration.id} inside this novel.`,
            path: filePath,
            entityId: entity.id,
            novelId: registration.id
          });
        }
      }
    }

    const manuscriptRoot = path.join(novelRoot, novelManifest.paths.manuscript);
    const chapterFiles = (await listEntityFiles(manuscriptRoot)).filter(
      (filePath) => path.extname(filePath).toLowerCase() === ".md"
    );
    const chapterIds = new Map<string, string>();
    const chapterPositions = new Map<string, string>();
    for (const filePath of chapterFiles) {
      let chapter: unknown;
      let rawChapterContent = "";
      let chapterBody = "";
      try {
        rawChapterContent = await readFile(filePath, "utf8");
        const parsedChapter = matter(rawChapterContent);
        chapter = parsedChapter.data as unknown;
        chapterBody = parsedChapter.content;
      } catch (error) {
        errors.push({
          code: "CHAPTER_READ_FAILED",
          message: error instanceof Error ? error.message : String(error),
          path: filePath,
          novelId: registration.id
        });
        continue;
      }
      if (!validators.manuscript(chapter)) {
        errors.push(
          ...schemaIssues("CHAPTER_SCHEMA_INVALID", filePath, validators.manuscript.errors).map(
            (issue) => ({ ...issue, novelId: registration.id })
          )
        );
        continue;
      }
      if (!isChapterRecord(chapter)) {
        errors.push({
          code: "CHAPTER_RECORD_INVALID",
          message: "Chapter frontmatter has an unexpected runtime shape.",
          path: filePath,
          novelId: registration.id
        });
        continue;
      }

      stats.chapters += 1;
      storedChapters.push({
        data: chapter,
        filePath,
        novelId: registration.id,
        contentHash: sha256(rawChapterContent),
        body: chapterBody
      });
      if (chapter.novel_id !== registration.id) {
        errors.push({
          code: "CHAPTER_NOVEL_MISMATCH",
          message: `Chapter belongs to ${chapter.novel_id}, not ${registration.id}.`,
          path: filePath,
          entityId: chapter.id,
          novelId: registration.id
        });
      }

      const previousIdPath = chapterIds.get(chapter.id);
      if (previousIdPath !== undefined) {
        errors.push({
          code: "DUPLICATE_CHAPTER_ID",
          message: `Chapter id ${chapter.id} is also used by ${previousIdPath}.`,
          path: filePath,
          entityId: chapter.id,
          novelId: registration.id
        });
      } else {
        chapterIds.set(chapter.id, filePath);
      }

      const position = `${chapter.volume}:${chapter.chapter}`;
      const previousPositionPath = chapterPositions.get(position);
      if (previousPositionPath !== undefined) {
        errors.push({
          code: "DUPLICATE_CHAPTER_POSITION",
          message: `Volume ${chapter.volume}, chapter ${chapter.chapter} is also used by ${previousPositionPath}.`,
          path: filePath,
          entityId: chapter.id,
          novelId: registration.id
        });
      } else {
        chapterPositions.set(position, filePath);
      }
    }

    if (novelManifest.paths.reports !== undefined) {
      const workflowRoots = [
        path.join(novelRoot, novelManifest.paths.reports, "workpacks"),
        path.join(novelRoot, novelManifest.paths.reports, "style"),
        path.join(novelRoot, novelManifest.paths.reports, "restructure")
      ];
      const workflowFiles = (
        await Promise.all(
          workflowRoots.map(async (directory) => {
            try {
              return await listEntityFiles(directory);
            } catch (error) {
              if ((error as NodeJS.ErrnoException).code === "ENOENT") {
                return [];
              }
              throw error;
            }
          })
        )
      ).flat().filter((filePath) =>
        [".yaml", ".yml"].includes(path.extname(filePath).toLowerCase())
      );
      for (const filePath of workflowFiles) {
        let workflowRecord: unknown;
        try {
          workflowRecord = await loadYaml(filePath);
        } catch (error) {
          errors.push({
            code: "WORKFLOW_READ_FAILED",
            message: error instanceof Error ? error.message : String(error),
            path: filePath,
            novelId: registration.id
          });
          continue;
        }

        if (!validators.workflow(workflowRecord)) {
          errors.push(
            ...schemaIssues("WORKFLOW_SCHEMA_INVALID", filePath, validators.workflow.errors).map(
              (issue) => ({ ...issue, novelId: registration.id })
            )
          );
          continue;
        }
        if (!isWorkflowRecord(workflowRecord)) {
          errors.push({
            code: "WORKFLOW_RECORD_INVALID",
            message: "Workflow record has an unexpected runtime shape.",
            path: filePath,
            novelId: registration.id
          });
          continue;
        }

        storedWorkflowRecords.push({
          data: workflowRecord,
          filePath,
          novelId: registration.id
        });

        if (isChapterWorkpackRecord(workflowRecord)) {
          storedWorkpacks.push({
            data: workflowRecord,
            filePath,
            novelId: registration.id
          });
        }
      }

      const reviewRoot = path.join(novelRoot, novelManifest.paths.reports, "reviews");
      const reviewFiles = (await listEntityFiles(reviewRoot)).filter((filePath) =>
        [".yaml", ".yml"].includes(path.extname(filePath).toLowerCase())
      );
      for (const filePath of reviewFiles) {
        let reviewRecord: unknown;
        try {
          reviewRecord = await loadYaml(filePath);
        } catch (error) {
          errors.push({
            code: "REVIEW_READ_FAILED",
            message: error instanceof Error ? error.message : String(error),
            path: filePath,
            novelId: registration.id
          });
          continue;
        }

        if (!validators.review(reviewRecord)) {
          errors.push(
            ...schemaIssues("REVIEW_SCHEMA_INVALID", filePath, validators.review.errors).map(
              (issue) => ({ ...issue, novelId: registration.id })
            )
          );
          continue;
        }
        if (!isWorkflowRecord(reviewRecord)) {
          errors.push({
            code: "REVIEW_RECORD_INVALID",
            message: "Review record has an unexpected runtime shape.",
            path: filePath,
            novelId: registration.id
          });
          continue;
        }

        storedWorkflowRecords.push({
          data: reviewRecord,
          filePath,
          novelId: registration.id
        });
        if (isReviewRecord(reviewRecord)) {
          storedReviews.push({
            data: reviewRecord,
            filePath,
            novelId: registration.id
          });
        }
      }

      const feedbackRoot = path.join(novelRoot, novelManifest.paths.feedback ?? "feedback");
      const feedbackFiles = (await listEntityFiles(feedbackRoot)).filter((filePath) =>
        [".yaml", ".yml"].includes(path.extname(filePath).toLowerCase())
      );
      for (const filePath of feedbackFiles) {
        let feedbackRecord: unknown;
        try {
          feedbackRecord = await loadYaml(filePath);
        } catch (error) {
          errors.push({
            code: "FEEDBACK_READ_FAILED",
            message: error instanceof Error ? error.message : String(error),
            path: filePath,
            novelId: registration.id
          });
          continue;
        }

        if (!validators.feedback(feedbackRecord)) {
          errors.push(
            ...schemaIssues("FEEDBACK_SCHEMA_INVALID", filePath, validators.feedback.errors).map(
              (issue) => ({ ...issue, novelId: registration.id })
            )
          );
          continue;
        }
        if (!isReaderFeedbackRecord(feedbackRecord)) {
          errors.push({
            code: "FEEDBACK_RECORD_INVALID",
            message: "Reader feedback record has an unexpected runtime shape.",
            path: filePath,
            novelId: registration.id
          });
          continue;
        }
        if (feedbackRecord.owner?.novel_id !== registration.id) {
          errors.push({
            code: "FEEDBACK_OWNER_MISMATCH",
            message: `Reader feedback owner must be ${registration.id} inside this novel.`,
            path: filePath,
            entityId: feedbackRecord.id,
            novelId: registration.id
          });
        }
      }
    }
  }

  validateSemanticContinuity(storedEntities, errors);

  const chapterIndex = new Set(
    storedChapters.map((chapter) => `${chapter.novelId}:${chapter.data.id}`)
  );
  for (const chapter of storedChapters) {
    for (const linkedId of [
      chapter.data.previous_chapter_id,
      chapter.data.next_chapter_id
    ]) {
      if (linkedId !== null && !chapterIndex.has(`${chapter.novelId}:${linkedId}`)) {
        errors.push({
          code: "CHAPTER_LINK_NOT_FOUND",
          message: `Linked chapter ${linkedId} does not exist in ${chapter.novelId}.`,
          path: chapter.filePath,
          entityId: chapter.data.id,
          novelId: chapter.novelId,
          details: { linkedId }
        });
      }
    }
  }

  validateChapterWorkpacks(
    storedWorkpacks,
    storedWorkflowRecords,
    storedEntities,
    storedChapters,
    storedReviews,
    errors
  );
  validateWorkflowRecords(storedWorkflowRecords, storedEntities, storedChapters, errors);

  return { ok: errors.length === 0, errors, warnings, stats };
}
