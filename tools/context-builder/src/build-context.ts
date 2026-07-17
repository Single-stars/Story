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
  missingEntityIds: string[];
  truncated: boolean;
}

export type ContextBuilderErrorCode =
  | "INVALID_CONTEXT_BUDGET"
  | "UNKNOWN_NOVEL"
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
}

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

function documentId(filePath: string, content: string): string | null {
  try {
    const parsed =
      path.extname(filePath).toLowerCase() === ".md"
        ? (matter(content).data as unknown)
        : (parse(content) as unknown);
    return isRecord(parsed) && typeof parsed.id === "string" ? parsed.id : null;
  } catch {
    return null;
  }
}

function renderSource(source: SourceDocument): string {
  return `## Source: ${source.relativePath}\n\n${source.content.trim()}\n`;
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
  const sources: SourceDocument[] = [
    {
      relativePath: path.relative(root, manifestPath).replaceAll("\\", "/"),
      content: await readFile(manifestPath, "utf8")
    }
  ];

  const entityRoots = [path.join(novelRoot, "canon"), path.join(novelRoot, "narrative")];
  const files = (
    await Promise.all(
      entityRoots.map(async (directory) => {
        try {
          return await listFiles(directory);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            return [];
          }
          throw error;
        }
      })
    )
  ).flat();
  const requestedIds = [...new Set(options.entityIds)];
  const found = new Map<string, SourceDocument>();

  for (const filePath of files) {
    const content = await readFile(filePath, "utf8");
    const id = documentId(filePath, content);
    if (id !== null && requestedIds.includes(id) && !found.has(id)) {
      found.set(id, {
        relativePath: path.relative(root, filePath).replaceAll("\\", "/"),
        content
      });
    }
  }
  for (const entityId of requestedIds) {
    const source = found.get(entityId);
    if (source !== undefined) {
      sources.push(source);
    }
  }

  const includedSources: string[] = [];
  let content = "";
  let truncated = false;
  for (const source of sources) {
    const rendered = renderSource(source);
    const remaining = options.maxChars - content.length;
    if (remaining <= 0) {
      truncated = true;
      break;
    }
    includedSources.push(source.relativePath);
    if (rendered.length <= remaining) {
      content += rendered;
    } else {
      content += rendered.slice(0, remaining);
      truncated = true;
      break;
    }
  }

  return {
    novelId: options.novelId,
    content,
    sources: includedSources,
    missingEntityIds: requestedIds.filter((entityId) => !found.has(entityId)),
    truncated
  };
}
