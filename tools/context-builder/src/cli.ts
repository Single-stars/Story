import path from "node:path";

import { buildContext, ContextBuilderError, type ContextProfile } from "./build-context.js";

const args = process.argv.slice(2);
let root = process.cwd();
let novelId: string | null = null;
let entityIds: string[] = [];
let maxChars = 12000;
let profile: ContextProfile = "internal";
const validProfiles = new Set<ContextProfile>(["internal", "editor", "reader", "public"]);

for (let index = 0; index < args.length; index += 1) {
  const argument = args[index];
  const value = args[index + 1];
  if (argument === "--root" && value !== undefined) {
    root = path.resolve(value);
    index += 1;
  } else if (argument === "--novel" && value !== undefined) {
    novelId = value;
    index += 1;
  } else if (argument === "--ids" && value !== undefined) {
    entityIds = value.split(",").map((id) => id.trim()).filter(Boolean);
    index += 1;
  } else if (argument === "--workpack" && value !== undefined) {
    entityIds.push(value);
    index += 1;
  } else if (argument === "--baseline" && value !== undefined) {
    entityIds.push(value);
    index += 1;
  } else if (argument === "--profile" && value !== undefined && validProfiles.has(value as ContextProfile)) {
    profile = value as ContextProfile;
    index += 1;
  } else if (argument === "--max-chars" && value !== undefined) {
    maxChars = Number.parseInt(value, 10);
    index += 1;
  } else {
    process.stderr.write(
      "Usage: context-builder --novel NOVEL-#### [--ids ID,ID] [--workpack CHRUN-####] [--baseline BASELINE-####] [--profile internal|editor|reader|public] [--max-chars N] [--root PATH]\n"
    );
    process.exitCode = 1;
    novelId = null;
    break;
  }
}

if (process.exitCode !== 1) {
  if (novelId === null) {
    process.stderr.write("Missing required --novel NOVEL-####.\n");
    process.exitCode = 1;
  } else {
    try {
      const result = await buildContext(root, { novelId, entityIds, maxChars, profile });
      process.stdout.write(result.content);
      if (result.missingEntityIds.length > 0) {
        process.stderr.write(
          `Missing entity ids: ${result.missingEntityIds.join(", ")}\n`
        );
      }
      for (const warning of result.warnings) {
        process.stderr.write(`Warning ${warning.code}: ${warning.message}\n`);
      }
      if (result.truncated) {
        process.stderr.write(`Context truncated at ${maxChars} characters.\n`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const code = error instanceof ContextBuilderError ? `${error.code}: ` : "";
      process.stderr.write(`${code}${message}\n`);
      process.exitCode = 1;
    }
  }
}
