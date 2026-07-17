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
}

interface Validators {
  workspace: ValidateFunction;
  novel: ValidateFunction;
  canon: ValidateFunction;
  narrative: ValidateFunction;
  manuscript: ValidateFunction;
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

export async function validateWorkspace(rootPath: string): Promise<ValidationReport> {
  const root = path.resolve(rootPath);
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const stats = { novels: 0, entityFiles: 0, entities: 0, chapters: 0 };
  const storedEntities: StoredEntity[] = [];
  const storedChapters: StoredChapter[] = [];
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
      try {
        chapter = matter(await readFile(filePath, "utf8")).data as unknown;
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
      storedChapters.push({ data: chapter, filePath, novelId: registration.id });
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

  return { ok: errors.length === 0, errors, warnings, stats };
}
