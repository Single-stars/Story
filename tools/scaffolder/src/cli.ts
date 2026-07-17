import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  CreateNovelError,
  createNovel,
  type CreateNovelResult
} from "./create-novel.js";

interface CliOptions {
  title: string;
  root: string;
  slug?: string;
}

const usage =
  "Usage: create-novel --title <title> [--slug <slug>] [--root <workspace-root>]";

function parseArguments(args: string[]): CliOptions {
  let title: string | null = null;
  let root = process.cwd();
  let slug: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--title") {
      const value = args[index + 1];
      if (value === undefined) {
        throw new Error(`Missing value for --title. ${usage}`);
      }
      title = value;
      index += 1;
    } else if (argument === "--root") {
      const value = args[index + 1];
      if (value === undefined) {
        throw new Error(`Missing value for --root. ${usage}`);
      }
      root = value;
      index += 1;
    } else if (argument === "--slug") {
      const value = args[index + 1];
      if (value === undefined) {
        throw new Error(`Missing value for --slug. ${usage}`);
      }
      slug = value;
      index += 1;
    } else if (argument?.startsWith("-")) {
      throw new Error(`Unknown option: ${argument}. ${usage}`);
    } else if (argument !== undefined && title === null) {
      title = argument;
    } else {
      throw new Error(`Unexpected argument: ${argument ?? ""}. ${usage}`);
    }
  }

  if (title === null) {
    throw new Error(`Missing novel title. ${usage}`);
  }
  return slug === undefined ? { title, root } : { title, root, slug };
}

export async function runCli(
  args: string[] = process.argv.slice(2)
): Promise<CreateNovelResult> {
  const options = parseArguments(args);
  const input =
    options.slug === undefined
      ? { title: options.title }
      : { title: options.title, slug: options.slug };
  const result = await createNovel(options.root, input);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return result;
}

const entryPath = process.argv[1];
if (
  entryPath !== undefined &&
  path.resolve(entryPath) === path.resolve(fileURLToPath(import.meta.url))
) {
  runCli().catch((error: unknown) => {
    if (error instanceof CreateNovelError) {
      process.stderr.write(`${error.code}: ${error.message}\n`);
    } else {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    }
    process.exitCode = 1;
  });
}
