import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildReaderLibrary,
  ReaderBuildError,
  type ReaderProfile
} from "./build-library.js";

const args = process.argv.slice(2);
let root = process.cwd();
let profile: ReaderProfile = "reader";
let output = path.join(root, ".generated", "reader", "library.json");

for (let index = 0; index < args.length; index += 1) {
  const argument = args[index];
  const value = args[index + 1];
  if (argument === "--root" && value !== undefined) {
    root = path.resolve(value);
    index += 1;
  } else if (argument === "--profile" && value !== undefined) {
    profile = value as ReaderProfile;
    index += 1;
  } else if (argument === "--output" && value !== undefined) {
    output = path.resolve(value);
    index += 1;
  } else {
    process.stderr.write(
      "Usage: reader-builder [--profile internal|editor|reader|public] [--root PATH] [--output FILE]\n"
    );
    process.exitCode = 1;
    break;
  }
}

if (process.exitCode !== 1) {
  try {
    const library = await buildReaderLibrary(root, { profile });
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, `${JSON.stringify(library, null, 2)}\n`, "utf8");
    process.stdout.write(
      `Reader library built: ${output} (${library.books.length} book(s), profile=${profile}).\n`
    );
  } catch (error) {
    const code = error instanceof ReaderBuildError ? `${error.code}: ` : "";
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${code}${message}\n`);
    process.exitCode = 1;
  }
}
