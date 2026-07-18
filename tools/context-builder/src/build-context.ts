import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import matter from "gray-matter";
import { parse } from "yaml";

export interface BuildContextOptions {
  novelId: string;
  entityIds: string[];
  maxChars: number;
}

export interface ContextBuildResult {
  novelId: string;
  content: string;
  sources: string[];
  sourceDetails: ContextSourceDetail[];
  missingEntityIds: string[];
  warnings: ContextBuildWarning[];
  truncated: boolean;
}

export interface ContextSourceDetail {
  path: string;
  id: string | null;
  sha256: string;
  status: "complete" | "truncated";
  reason?: string;
}

export interface ContextBuildWarning {
  code: "OPTIONAL_REVIEW_NOT_FOUND" | "OPTIONAL_REVIEW_INVALID";
  id: string;
  message: string;
}

export type ContextBuilderErrorCode =
  | "INVALID_CONTEXT_BUDGET"
  | "UNKNOWN_NOVEL"
  | "MISSING_REQUIRED_CONTEXT"
  | "REQUIRED_REVIEW_MISSING"
  | "REQUIRED_REVIEW_NOT_FOUND"
  | "REQUIRED_REVIEW_OWNER_MISMATCH"
  | "REQUIRED_REVIEW_TYPE_MISMATCH"
  | "REQUIRED_REVIEW_SCOPE_MISMATCH"
  | "WORKSPACE_READ_FAILED";

export class ContextBuilderError extends Error {
  readonly code: ContextBuilderErrorCode;

  constructor(code: ContextBuilderErrorCode, message: string) {
    super(message);
    this.name = "ContextBuilderError";
    this.code = code;
  }
}

interface NovelRegistration {
  id: string;
  path: string;
}

interface SourceDocument {
  relativePath: string;
  content: string;
  id: string | null;
  parsed: unknown;
}

const dependencyKeys = new Set([
  "style_profile_ids",
  "canon_ids",
  "narrative_ids",
  "manuscript_chapter_ids",
  "decision_ids",
  "research_ids",
  "must_load_ids"
]);

const reviewGateTypes = [
  "continuity",
  "developmental_edit",
  "reader_test",
  "line_edit"
] as const;

type ReviewGateType = (typeof reviewGateTypes)[number];

const loadableIdPattern =
  /^(CHRUN|STYLE|RESTRUCT|REVIEW|CHAPTER|DEC|RESEARCH|SESSION|SCN|EVT|THREAD|FORESH|CHAR|LOC|FACTION|ITEM|RULE|FACT|REL|KNOW)-[0-9]{4}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function listFiles(directory: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(entryPath)));
    } else if (
      entry.isFile() &&
      [".yaml", ".yml", ".md"].includes(path.extname(entry.name).toLowerCase())
    ) {
      files.push(entryPath);
    }
  }
  return files.sort((left, right) => left.localeCompare(right));
}

function parseDocument(filePath: string, content: string): unknown {
  return path.extname(filePath).toLowerCase() === ".md"
    ? (matter(content).data as unknown)
    : (parse(content) as unknown);
}

function documentId(filePath: string, content: string): string | null {
  try {
    const parsed = parseDocument(filePath, content);
    return isRecord(parsed) && typeof parsed.id === "string" ? parsed.id : null;
  } catch {
    return null;
  }
}

function sha256(content: string): string {
  return `sha256:${createHash("sha256").update(content).digest("hex")}`;
}

function dependencyIds(value: unknown, parentKey: string | null = null): string[] {
  if (Array.isArray(value)) {
    if (parentKey !== null && dependencyKeys.has(parentKey)) {
      return value.filter(
        (item): item is string => typeof item === "string" && loadableIdPattern.test(item)
      );
    }
    return value.flatMap((item) => dependencyIds(item, parentKey));
  }
  if (!isRecord(value)) {
    return [];
  }
  return Object.entries(value).flatMap(([key, child]) => dependencyIds(child, key));
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function recordString(value: Record<string, unknown>, key: string): string | null {
  const child = value[key];
  return typeof child === "string" ? child : null;
}

function reviewGateDependencies(
  source: SourceDocument,
  found: Map<string, SourceDocument>,
  novelId: string,
  warnings: ContextBuildWarning[]
): string[] {
  if (!isRecord(source.parsed) || source.parsed.record_type !== "chapter_workpack") {
    return [];
  }

  const workpack = source.parsed;
  const chapterId = recordString(workpack, "chapter_id");
  const requiredReviews = workpack.required_reviews;
  if (!isRecord(requiredReviews)) {
    return [];
  }

  const dependencyIdsFromGates: string[] = [];
  for (const gateType of reviewGateTypes) {
    const gate = requiredReviews[gateType];
    if (!isRecord(gate)) {
      continue;
    }

    const required = gate.required === true;
    const reviewIds = stringArray(gate.review_ids).filter((id) => loadableIdPattern.test(id));
    if (required && reviewIds.length === 0) {
      throw new ContextBuilderError(
        "REQUIRED_REVIEW_MISSING",
        `${source.id ?? source.relativePath} requires ${gateType} review evidence but has no review ids.`
      );
    }

    for (const reviewId of reviewIds) {
      const review = found.get(reviewId);
      if (review === undefined) {
        if (required) {
          throw new ContextBuilderError(
            "REQUIRED_REVIEW_NOT_FOUND",
            `${source.id ?? source.relativePath} requires missing review ${reviewId}.`
          );
        }
        warnings.push({
          code: "OPTIONAL_REVIEW_NOT_FOUND",
          id: reviewId,
          message: `${source.id ?? source.relativePath} references optional missing review ${reviewId}.`
        });
        continue;
      }

      const invalidReason = validateReviewForGate(review, novelId, gateType, chapterId);
      if (invalidReason !== null) {
        if (required) {
          throw invalidReason;
        }
        warnings.push({
          code: "OPTIONAL_REVIEW_INVALID",
          id: reviewId,
          message: invalidReason.message
        });
        continue;
      }

      dependencyIdsFromGates.push(reviewId);
    }
  }

  return dependencyIdsFromGates;
}

function validateReviewForGate(
  review: SourceDocument,
  novelId: string,
  gateType: ReviewGateType,
  chapterId: string | null
): ContextBuilderError | null {
  if (!isRecord(review.parsed)) {
    return new ContextBuilderError(
      "REQUIRED_REVIEW_SCOPE_MISMATCH",
      `${review.id ?? review.relativePath} could not be parsed as a review record.`
    );
  }

  const owner = review.parsed.owner;
  if (!isRecord(owner) || owner.novel_id !== novelId) {
    return new ContextBuilderError(
      "REQUIRED_REVIEW_OWNER_MISMATCH",
      `${review.id ?? review.relativePath} does not belong to ${novelId}.`
    );
  }

  if (review.parsed.review_type !== gateType) {
    return new ContextBuilderError(
      "REQUIRED_REVIEW_TYPE_MISMATCH",
      `${review.id ?? review.relativePath} is not a ${gateType} review.`
    );
  }

  const scope = review.parsed.scope;
  if (!isRecord(scope) || scope.novel_id !== novelId) {
    return new ContextBuilderError(
      "REQUIRED_REVIEW_SCOPE_MISMATCH",
      `${review.id ?? review.relativePath} scope does not belong to ${novelId}.`
    );
  }

  if (chapterId !== null && !stringArray(scope.chapter_ids).includes(chapterId)) {
    return new ContextBuilderError(
      "REQUIRED_REVIEW_SCOPE_MISMATCH",
      `${review.id ?? review.relativePath} does not cover ${chapterId}.`
    );
  }

  return null;
}

function renderSource(source: SourceDocument): string {
  return `## Source: ${source.relativePath}\n\n${source.content.trim()}\n`;
}

async function safeListFiles(directory: string): Promise<string[]> {
  try {
    return await listFiles(directory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export async function buildContext(
  workspaceRoot: string,
  options: BuildContextOptions
): Promise<ContextBuildResult> {
  if (!Number.isInteger(options.maxChars) || options.maxChars <= 0) {
    throw new ContextBuilderError(
      "INVALID_CONTEXT_BUDGET",
      "maxChars must be a positive integer."
    );
  }

  const root = path.resolve(workspaceRoot);
  const workspacePath = path.join(root, "workspace", "manifest.yaml");
  let workspace: unknown;
  try {
    workspace = parse(await readFile(workspacePath, "utf8")) as unknown;
  } catch (error) {
    throw new ContextBuilderError(
      "WORKSPACE_READ_FAILED",
      error instanceof Error ? error.message : String(error)
    );
  }
  if (!isRecord(workspace) || !Array.isArray(workspace.novels)) {
    throw new ContextBuilderError(
      "WORKSPACE_READ_FAILED",
      "Workspace manifest does not contain a novel registry."
    );
  }

  const registration = workspace.novels.find(
    (value): value is NovelRegistration =>
      isRecord(value) && value.id === options.novelId && typeof value.path === "string"
  );
  if (registration === undefined) {
    throw new ContextBuilderError(
      "UNKNOWN_NOVEL",
      `Novel ${options.novelId} is not registered.`
    );
  }

  const novelRoot = path.resolve(root, registration.path);
  const manifestPath = path.join(novelRoot, "manifest.yaml");
  const manifestContent = await readFile(manifestPath, "utf8");
  const sources: SourceDocument[] = [
    {
      relativePath: path.relative(root, manifestPath).replaceAll("\\", "/"),
      content: manifestContent,
      id: null,
      parsed: null
    }
  ];

  const entityRoots = [
    path.join(novelRoot, "canon"),
    path.join(novelRoot, "narrative"),
    path.join(novelRoot, "manuscript"),
    path.join(novelRoot, "decisions"),
    path.join(novelRoot, "research"),
    path.join(novelRoot, "sessions"),
    path.join(novelRoot, "session-notes"),
    path.join(novelRoot, "reports", "workpacks"),
    path.join(novelRoot, "reports", "style"),
    path.join(novelRoot, "reports", "restructure"),
    path.join(novelRoot, "reports", "reviews"),
    path.join(novelRoot, "reports", "sessions")
  ];
  const files = (await Promise.all(entityRoots.map(safeListFiles))).flat();
  const requestedIds = [...new Set(options.entityIds)];
  const found = new Map<string, SourceDocument>();

  for (const filePath of files) {
    const content = await readFile(filePath, "utf8");
    const id = documentId(filePath, content);
    if (id !== null && !found.has(id)) {
      let parsed: unknown = null;
      try {
        parsed = parseDocument(filePath, content);
      } catch {
        parsed = null;
      }
      found.set(id, {
        relativePath: path.relative(root, filePath).replaceAll("\\", "/"),
        content,
        id,
        parsed
      });
    }
  }

  const queuedIds = [...requestedIds];
  const seenIds = new Set<string>();
  const missingEntityIds: string[] = [];
  const missingRequiredIds: string[] = [];
  const warnings: ContextBuildWarning[] = [];
  for (let index = 0; index < queuedIds.length; index += 1) {
    const entityId = queuedIds[index];
    if (entityId === undefined) {
      continue;
    }
    if (seenIds.has(entityId)) {
      continue;
    }
    seenIds.add(entityId);
    const source = found.get(entityId);
    if (source === undefined) {
      if (requestedIds.includes(entityId)) {
        missingEntityIds.push(entityId);
      } else {
        missingRequiredIds.push(entityId);
      }
      continue;
    }
    sources.push(source);
    const sourceDependencyIds = [
      ...dependencyIds(source.parsed),
      ...reviewGateDependencies(source, found, options.novelId, warnings)
    ];
    for (const dependencyId of sourceDependencyIds) {
      if (!seenIds.has(dependencyId) && !queuedIds.includes(dependencyId)) {
        queuedIds.push(dependencyId);
      }
    }
  }

  if (missingRequiredIds.length > 0) {
    throw new ContextBuilderError(
      "MISSING_REQUIRED_CONTEXT",
      `Required context ids are missing: ${missingRequiredIds.join(", ")}.`
    );
  }

  const includedSources: string[] = [];
  const sourceDetails: ContextSourceDetail[] = [];
  let content = "";
  let truncated = false;
  for (const source of sources) {
    const rendered = renderSource(source);
    const remaining = options.maxChars - content.length;
    if (remaining <= 0) {
      truncated = true;
      sourceDetails.push({
        path: source.relativePath,
        id: source.id,
        sha256: sha256(source.content),
        status: "truncated",
        reason: "character budget exhausted before this source"
      });
      break;
    }
    if (rendered.length <= remaining) {
      includedSources.push(source.relativePath);
      content += rendered;
      sourceDetails.push({
        path: source.relativePath,
        id: source.id,
        sha256: sha256(source.content),
        status: "complete"
      });
    } else {
      sourceDetails.push({
        path: source.relativePath,
        id: source.id,
        sha256: sha256(source.content),
        status: "truncated",
        reason: "source omitted to preserve complete-record boundary"
      });
      truncated = true;
      break;
    }
  }

  return {
    novelId: options.novelId,
    content,
    sources: includedSources,
    sourceDetails,
    missingEntityIds,
    warnings,
    truncated
  };
}
