import path from "node:path";

import { validateWorkspace, type ValidationIssue } from "./validate-workspace.js";

function formatIssue(issue: ValidationIssue): string {
  const location = path.relative(process.cwd(), issue.path) || ".";
  const entity = issue.entityId === undefined ? "" : ` [${issue.entityId}]`;
  return `${issue.code}${entity} ${location}: ${issue.message}`;
}

const root = process.argv[2] === undefined ? process.cwd() : path.resolve(process.argv[2]);
const report = await validateWorkspace(root);

for (const warning of report.warnings) {
  process.stdout.write(`WARN  ${formatIssue(warning)}\n`);
}
for (const error of report.errors) {
  process.stderr.write(`ERROR ${formatIssue(error)}\n`);
}

process.stdout.write(
  `Story OS validation: ${report.ok ? "PASS" : "FAIL"}; ` +
    `${report.stats.novels} novel(s), ${report.stats.entities} entity record(s), ` +
    `${report.stats.chapters} chapter(s), ` +
    `${report.warnings.length} warning(s), ${report.errors.length} error(s).\n`
);

if (!report.ok) {
  process.exitCode = 1;
}
