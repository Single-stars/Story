import { createHash, randomUUID } from "node:crypto";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  writeFile
} from "node:fs/promises";
import path from "node:path";

import Ajv2020 from "ajv/dist/2020.js";
import type { AnySchema, ValidateFunction } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { parse, stringify } from "yaml";

export interface CreateNovelInput {
  title: string;
  slug?: string;
}

export interface CreateNovelResult {
  novelId: string;
  slug: string;
  novelPath: string;
  manifestPath: string;
}

export type CreateNovelErrorCode =
  | "INVALID_NOVEL_TITLE"
  | "INVALID_NOVEL_SLUG"
  | "DUPLICATE_NOVEL_SLUG"
  | "NOVEL_ID_EXHAUSTED"
  | "INVALID_WORKSPACE"
  | "INVALID_NOVEL_TEMPLATE"
  | "WORKSPACE_CHANGED";

export class CreateNovelError extends Error {
  readonly code: CreateNovelErrorCode;

  constructor(code: CreateNovelErrorCode, message: string) {
    super(message);
    this.name = "CreateNovelError";
    this.code = code;
  }
}

interface NovelRegistration {
  id: string;
  title: string;
  path: string;
  status: string;
}

interface WorkspaceManifest {
  active_novel_id: string | null;
  novels: NovelRegistration[];
  id_counters: {
    universe: number;
    series: number;
    novel: number;
  };
  paths: {
    novels: string;
    schemas: string;
    templates: string;
  };
}

interface NovelManifest {
  novel_id: string;
  title: string;
  slug: string;
  status: string;
  paths: Record<string, string>;
  [key: string]: unknown;
}

interface Validators {
  workspace: ValidateFunction;
  novel: ValidateFunction;
}

const standardNovelDirectories = [
  "canon",
  "narrative",
  "manuscript",
  "research",
  "decisions",
  "feedback",
  "reports"
] as const;

function createError(
  code: CreateNovelErrorCode,
  message: string
): CreateNovelError {
  return new CreateNovelError(code, message);
}

function validateTitle(input: string): string {
  const title = input.trim();
  if (title.length === 0 || title.length > 200) {
    throw createError(
      "INVALID_NOVEL_TITLE",
      "Novel title must contain between 1 and 200 non-whitespace characters."
    );
  }
  return title;
}

function slugify(title: string): string {
  const asciiSlug = title
    .normalize("NFKD")
    .replace(/\p{Mark}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");

  const slug =
    asciiSlug.length > 0
      ? asciiSlug
      : `novel-${createHash("sha256").update(title).digest("hex").slice(0, 12)}`;

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) {
    throw createError("INVALID_NOVEL_SLUG", "Title cannot produce a legal slug.");
  }
  return slug;
}

function validateSlug(input: string): string {
  const slug = input.trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) {
    throw createError(
      "INVALID_NOVEL_SLUG",
      "Explicit slug must use lowercase ASCII letters, digits, and single hyphens."
    );
  }
  return slug;
}

function parseYamlDocument(source: string, label: string): unknown {
  const document = parse(source) as unknown;
  if (typeof document !== "object" || document === null || Array.isArray(document)) {
    throw new Error(`${label} must contain a YAML mapping.`);
  }
  return document;
}

async function readSchema(filePath: string): Promise<AnySchema> {
  return JSON.parse(await readFile(filePath, "utf8")) as AnySchema;
}

async function createValidators(schemasRoot: string): Promise<Validators> {
  const [commonSchema, workspaceSchema, novelSchema] = await Promise.all([
    readSchema(path.join(schemasRoot, "common.schema.json")),
    readSchema(path.join(schemasRoot, "workspace-manifest.schema.json")),
    readSchema(path.join(schemasRoot, "novel-manifest.schema.json"))
  ]);
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  ajv.addSchema(commonSchema);
  return {
    workspace: ajv.compile(workspaceSchema),
    novel: ajv.compile(novelSchema)
  };
}

function assertValid(
  validate: ValidateFunction,
  document: unknown,
  code: "INVALID_WORKSPACE" | "INVALID_NOVEL_TEMPLATE",
  label: string
): void {
  if (!validate(document)) {
    throw createError(
      code,
      `${label} failed schema validation: ${JSON.stringify(validate.errors)}`
    );
  }
}

function registeredSlug(registrationPath: string): string | null {
  return /^novels\/NOVEL-[0-9]{4}-(.+)$/.exec(registrationPath)?.[1] ?? null;
}

function nextNovelNumber(workspace: WorkspaceManifest): number {
  const registeredNumbers = workspace.novels.map(({ id }) => {
    const match = /^NOVEL-([0-9]{4})$/.exec(id);
    return match?.[1] === undefined ? 0 : Number.parseInt(match[1], 10);
  });
  const next = Math.max(workspace.id_counters.novel, ...registeredNumbers, 0) + 1;
  if (next > 9999) {
    throw createError(
      "NOVEL_ID_EXHAUSTED",
      "No NOVEL-#### identifiers remain in the current ID range."
    );
  }
  return next;
}

async function directoryNames(directory: string): Promise<string[]> {
  try {
    return await readdir(directory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function removeEmptyDirectory(directory: string): Promise<void> {
  try {
    await rm(directory);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT" && code !== "ENOTEMPTY") {
      throw error;
    }
  }
}

export async function createNovel(
  workspaceRoot: string,
  input: CreateNovelInput
): Promise<CreateNovelResult> {
  const title = validateTitle(input.title);
  const slug = input.slug === undefined ? slugify(title) : validateSlug(input.slug);
  const root = path.resolve(workspaceRoot);
  const workspaceManifestPath = path.join(root, "workspace", "manifest.yaml");
  const workspaceSource = await readFile(workspaceManifestPath, "utf8");
  const workspaceDocument = parseYamlDocument(
    workspaceSource,
    "Workspace manifest"
  );
  const validators = await createValidators(path.join(root, "schemas"));
  assertValid(
    validators.workspace,
    workspaceDocument,
    "INVALID_WORKSPACE",
    "Workspace manifest"
  );
  const workspace = workspaceDocument as WorkspaceManifest;
  const novelsRoot = path.join(root, workspace.paths.novels);

  const existingDirectorySlugs = (await directoryNames(novelsRoot))
    .map((name) => /^NOVEL-[0-9]{4}-(.+)$/.exec(name)?.[1] ?? null)
    .filter((value): value is string => value !== null);
  const duplicateInRegistry = workspace.novels.some(
    (registration) => registeredSlug(registration.path) === slug
  );
  if (duplicateInRegistry || existingDirectorySlugs.includes(slug)) {
    throw createError(
      "DUPLICATE_NOVEL_SLUG",
      `Novel slug already exists: ${slug}`
    );
  }

  const novelNumber = nextNovelNumber(workspace);
  const novelId = `NOVEL-${novelNumber.toString().padStart(4, "0")}`;
  const novelPath = `novels/${novelId}-${slug}`;
  const manifestPath = `${novelPath}/manifest.yaml`;
  const finalNovelRoot = path.join(root, ...novelPath.split("/"));
  if (await pathExists(finalNovelRoot)) {
    throw createError(
      "DUPLICATE_NOVEL_SLUG",
      `Novel directory already exists: ${novelPath}`
    );
  }

  const templatePath = path.join(
    root,
    workspace.paths.templates,
    "novel",
    "manifest.yaml"
  );
  const templateDocument = parseYamlDocument(
    await readFile(templatePath, "utf8"),
    "Novel manifest template"
  ) as NovelManifest;
  const novelManifest = structuredClone(templateDocument);
  novelManifest.novel_id = novelId;
  novelManifest.title = title;
  novelManifest.slug = slug;
  novelManifest.status = "planning";
  assertValid(
    validators.novel,
    novelManifest,
    "INVALID_NOVEL_TEMPLATE",
    "Generated novel manifest"
  );

  const nextWorkspace = structuredClone(workspace);
  nextWorkspace.novels.push({
    id: novelId,
    title,
    path: novelPath,
    status: "planning"
  });
  nextWorkspace.id_counters.novel = novelNumber;
  nextWorkspace.active_novel_id = novelId;
  assertValid(
    validators.workspace,
    nextWorkspace,
    "INVALID_WORKSPACE",
    "Updated workspace manifest"
  );

  const novelManifestSource = stringify(novelManifest, { lineWidth: 0 });
  const nextWorkspaceSource = stringify(nextWorkspace, { lineWidth: 0 });
  const novelsRootAlreadyExisted = await pathExists(novelsRoot);
  let temporaryNovelRoot: string | null = null;
  let workspaceTemporaryPath: string | null = null;
  let finalDirectoryCreated = false;
  let workspaceUpdated = false;

  try {
    await mkdir(novelsRoot, { recursive: true });
    temporaryNovelRoot = await mkdtemp(
      path.join(novelsRoot, `.${novelId}-${slug}.tmp-`)
    );
    await Promise.all(
      standardNovelDirectories.map((directory) =>
        mkdir(path.join(temporaryNovelRoot as string, directory))
      )
    );
    const temporaryManifestPath = path.join(temporaryNovelRoot, "manifest.yaml");
    await writeFile(temporaryManifestPath, novelManifestSource, {
      encoding: "utf8",
      flag: "wx"
    });
    const writtenManifest = parseYamlDocument(
      await readFile(temporaryManifestPath, "utf8"),
      "Written novel manifest"
    );
    assertValid(
      validators.novel,
      writtenManifest,
      "INVALID_NOVEL_TEMPLATE",
      "Written novel manifest"
    );

    await rename(temporaryNovelRoot, finalNovelRoot);
    temporaryNovelRoot = null;
    finalDirectoryCreated = true;

    if ((await readFile(workspaceManifestPath, "utf8")) !== workspaceSource) {
      throw createError(
        "WORKSPACE_CHANGED",
        "Workspace manifest changed while the novel was being created."
      );
    }
    workspaceTemporaryPath = path.join(
      path.dirname(workspaceManifestPath),
      `.manifest.yaml.tmp-${randomUUID()}`
    );
    await writeFile(workspaceTemporaryPath, nextWorkspaceSource, {
      encoding: "utf8",
      flag: "wx"
    });
    await rename(workspaceTemporaryPath, workspaceManifestPath);
    workspaceTemporaryPath = null;
    workspaceUpdated = true;
  } catch (error) {
    if (workspaceTemporaryPath !== null) {
      await rm(workspaceTemporaryPath, { force: true });
    }
    if (temporaryNovelRoot !== null) {
      await rm(temporaryNovelRoot, { recursive: true, force: true });
    }
    if (finalDirectoryCreated && !workspaceUpdated) {
      await rm(finalNovelRoot, { recursive: true, force: true });
    }
    if (!novelsRootAlreadyExisted) {
      await removeEmptyDirectory(novelsRoot);
    }
    throw error;
  }

  return { novelId, slug, novelPath, manifestPath };
}
