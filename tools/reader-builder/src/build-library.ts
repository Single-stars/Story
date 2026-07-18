import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import matter from "gray-matter";
import { parse } from "yaml";

import { validateWorkspace } from "../../validator/src/validate-workspace.js";

export type ReaderProfile = "internal" | "editor" | "reader" | "public";

export interface ReaderBlock {
  id: string;
  kind: "paragraph" | "divider";
  text: string;
  contentHash: string;
}

export interface ReaderChapter {
  id: string;
  title: string;
  volume: number;
  chapter: number;
  summary: string;
  contentVersion: string;
  previousChapterId: string | null;
  nextChapterId: string | null;
  blocks: ReaderBlock[];
}

export interface ReaderBook {
  id: string;
  title: string;
  slug: string;
  status: string;
  chapters: ReaderChapter[];
}

export interface ReaderLibrary {
  schemaVersion: "0.1.0";
  profile: ReaderProfile;
  books: ReaderBook[];
}

export class ReaderBuildError extends Error {
  readonly code: "STORY_VALIDATION_FAILED" | "INVALID_READER_PROFILE" | "DUPLICATE_BLOCK_ID";
  readonly details?: unknown;

  constructor(
    code: "STORY_VALIDATION_FAILED" | "INVALID_READER_PROFILE" | "DUPLICATE_BLOCK_ID",
    message: string,
    details?: unknown
  ) {
    super(message);
    this.name = "ReaderBuildError";
    this.code = code;
    this.details = details;
  }
}

interface BuildOptions {
  profile: ReaderProfile;
}

interface WorkspaceManifest {
  novels: Array<{
    id: string;
    title: string;
    path: string;
    status: string;
  }>;
}

interface NovelManifest {
  novel_id: string;
  title: string;
  slug: string;
  status: string;
  paths: { manuscript: string };
}

interface ChapterFrontmatter {
  id: string;
  title: string;
  volume: number;
  chapter: number;
  status: string;
  visibility: ReaderProfile;
  summary: string;
  content_version: string;
  previous_chapter_id: string | null;
  next_chapter_id: string | null;
}

const visibilityRank: Record<ReaderProfile, number> = {
  internal: 0,
  editor: 1,
  reader: 2,
  public: 3
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isWorkspace(value: unknown): value is WorkspaceManifest {
  return isRecord(value) && Array.isArray(value.novels);
}

function isNovelManifest(value: unknown): value is NovelManifest {
  return (
    isRecord(value) &&
    typeof value.novel_id === "string" &&
    typeof value.title === "string" &&
    typeof value.slug === "string" &&
    typeof value.status === "string" &&
    isRecord(value.paths) &&
    typeof value.paths.manuscript === "string"
  );
}

function isChapter(value: unknown): value is ChapterFrontmatter {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.volume === "number" &&
    typeof value.chapter === "number" &&
    typeof value.status === "string" &&
    typeof value.visibility === "string" &&
    value.visibility in visibilityRank &&
    typeof value.summary === "string" &&
    typeof value.content_version === "string" &&
    (typeof value.previous_chapter_id === "string" || value.previous_chapter_id === null) &&
    (typeof value.next_chapter_id === "string" || value.next_chapter_id === null)
  );
}

async function listMarkdown(directory: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listMarkdown(entryPath)));
    } else if (entry.isFile() && path.extname(entry.name).toLowerCase() === ".md") {
      files.push(entryPath);
    }
  }
  return files.sort((left, right) => left.localeCompare(right));
}

function includeChapter(chapter: ChapterFrontmatter, profile: ReaderProfile): boolean {
  if (chapter.status === "cut") {
    return false;
  }
  if (visibilityRank[chapter.visibility] < visibilityRank[profile]) {
    return false;
  }
  if (profile === "public") {
    return chapter.status === "published";
  }
  if (profile === "reader") {
    return ["revised", "locked", "published"].includes(chapter.status);
  }
  return ["draft", "revised", "locked", "published"].includes(chapter.status);
}

function sha256(content: string): string {
  return `sha256:${createHash("sha256").update(content).digest("hex")}`;
}

function blocks(novelId: string, chapterId: string, content: string): ReaderBlock[] {
  const explicitBlockPattern = /^<!--\s*block:\s*(BLK-[0-9]{4})\s*-->\s*/u;
  const chunks = content
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/u)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0 && !/^#{1,6}\s+/u.test(chunk));

  const seenAnchors = new Map<string, number>();
  return chunks.map((text) => {
    const explicitMatch = explicitBlockPattern.exec(text);
    const explicitId = explicitMatch?.[1] ?? null;
    const bodyText = explicitId === null ? text : text.slice(explicitMatch?.[0].length ?? 0).trim();
    if (explicitId !== null && seenAnchors.has(explicitId)) {
      throw new ReaderBuildError(
        "DUPLICATE_BLOCK_ID",
        `Duplicate block id ${explicitId} in ${chapterId}.`
      );
    }
    const divider = /^(?:\*\s*\*\s*\*|-\s*-\s*-|_)$/u.test(bodyText);
    const normalizedText = divider ? "*" : bodyText.replace(/\n+/g, " ");
    const hash = sha256(normalizedText);
    const baseId =
      explicitId ??
      createHash("sha256")
        .update(`${novelId}\u0000${chapterId}\u0000${normalizedText}`)
        .digest("hex")
        .slice(0, 12);
    const occurrence = seenAnchors.get(baseId) ?? 0;
    seenAnchors.set(baseId, occurrence + 1);
    const id = explicitId ?? (occurrence === 0 ? `p-${baseId}` : `p-${baseId}-${occurrence + 1}`);
    return {
      id,
      kind: divider ? "divider" : "paragraph",
      text: normalizedText,
      contentHash: hash
    };
  });
}

export async function buildReaderLibrary(
  workspaceRoot: string,
  options: BuildOptions
): Promise<ReaderLibrary> {
  if (!(options.profile in visibilityRank)) {
    throw new ReaderBuildError(
      "INVALID_READER_PROFILE",
      `Unknown reader profile: ${String(options.profile)}`
    );
  }

  const root = path.resolve(workspaceRoot);
  const validation = await validateWorkspace(root);
  if (!validation.ok) {
    throw new ReaderBuildError(
      "STORY_VALIDATION_FAILED",
      "Story OS validation failed; no reader bundle was produced.",
      validation.errors
    );
  }

  const workspace = parse(
    await readFile(path.join(root, "workspace", "manifest.yaml"), "utf8")
  ) as unknown;
  if (!isWorkspace(workspace)) {
    throw new ReaderBuildError(
      "STORY_VALIDATION_FAILED",
      "Workspace manifest has an unexpected runtime shape."
    );
  }

  const books: ReaderBook[] = [];
  for (const registration of workspace.novels) {
    const novelRoot = path.join(root, registration.path);
    const manifest = parse(
      await readFile(path.join(novelRoot, "manifest.yaml"), "utf8")
    ) as unknown;
    if (!isNovelManifest(manifest)) {
      continue;
    }

    const chapterFiles = await listMarkdown(
      path.join(novelRoot, manifest.paths.manuscript)
    );
    const chapters: ReaderChapter[] = [];
    for (const filePath of chapterFiles) {
      const document = matter(await readFile(filePath, "utf8"));
      if (!isChapter(document.data) || !includeChapter(document.data, options.profile)) {
        continue;
      }
      chapters.push({
        id: document.data.id,
        title: document.data.title,
        volume: document.data.volume,
        chapter: document.data.chapter,
        summary: document.data.summary,
        contentVersion: document.data.content_version,
        previousChapterId: document.data.previous_chapter_id,
        nextChapterId: document.data.next_chapter_id,
        blocks: blocks(manifest.novel_id, document.data.id, document.content)
      });
    }
    chapters.sort(
      (left, right) => left.volume - right.volume || left.chapter - right.chapter
    );
    if (chapters.length > 0) {
      books.push({
        id: manifest.novel_id,
        title: manifest.title,
        slug: manifest.slug,
        status: manifest.status,
        chapters
      });
    }
  }

  return { schemaVersion: "0.1.0", profile: options.profile, books };
}
