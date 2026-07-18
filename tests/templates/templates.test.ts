import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import Ajv2020 from "ajv/dist/2020.js";
import type { AnySchema } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { parse } from "yaml";
import { describe, expect, test } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

async function loadJson(relativePath: string): Promise<AnySchema> {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8")) as AnySchema;
}

async function loadYaml(relativePath: string): Promise<unknown> {
  return parse(await readFile(path.join(root, relativePath), "utf8")) as unknown;
}

async function entityValidators() {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  ajv.addSchema(await loadJson("schemas/common.schema.json"));
  return {
    canon: ajv.compile(await loadJson("schemas/canon-entity.schema.json")),
    narrative: ajv.compile(await loadJson("schemas/narrative-entity.schema.json")),
    workflow: ajv.compile(await loadJson("schemas/workflow-run.schema.json"))
  };
}

describe("entity templates", () => {
  for (const name of ["location", "faction", "item", "fact", "knowledge"] as const) {
    test(`${name} template is valid against the canon entity schema`, async () => {
      const { canon } = await entityValidators();
      const document = await loadYaml(`templates/entities/${name}.yaml`);
      expect(canon(document), JSON.stringify(canon.errors)).toBe(true);
    });
  }

  for (const name of ["thread", "foreshadowing"] as const) {
    test(`${name} template is valid against the narrative entity schema`, async () => {
      const { narrative } = await entityValidators();
      const document = await loadYaml(`templates/entities/${name}.yaml`);
      expect(narrative(document), JSON.stringify(narrative.errors)).toBe(true);
    });
  }
});

describe("workflow input templates", () => {
  test("research note keeps evidence separate from Canon", async () => {
    const document = await loadYaml("templates/research/source-note.yaml");
    expect(document).toMatchObject({
      record_type: "research_note",
      owner: { novel_id: "NOVEL-0001" },
      status: "research",
      visibility: "internal",
      canon_effect: "proposal_only"
    });
    expect(document).toHaveProperty("sources.0.accessed_at");
    expect(document).toHaveProperty("sources.0.source_quality");
    expect(document).toHaveProperty("sources.0.confidence");
    expect(document).toHaveProperty("applicability");
    expect(document).toHaveProperty("conflicts");
  });

  test("reader feedback cannot approve Canon", async () => {
    const document = await loadYaml("templates/feedback/reader-feedback.yaml");
    expect(document).toMatchObject({
      id: "FB-0001",
      record_type: "reader_feedback",
      owner: { novel_id: "NOVEL-0001" },
      status: "received",
      visibility: "internal",
      canon_effect: "none"
    });
    expect(document).toHaveProperty("scope.chapter_ids");
    expect(document).toHaveProperty("observations.comprehension");
    expect(document).toHaveProperty("observations.confusion");
    expect(document).toHaveProperty("observations.interest_loss");
    expect(document).toHaveProperty("observations.expectations");
    expect(document).toHaveProperty("observations.emotional_landing");
    expect(document).toHaveProperty("observations.continue_reading");
  });

  test("chapter workpack records durable longform gates", async () => {
    const { workflow } = await entityValidators();
    const document = await loadYaml("templates/workflow/chapter-workpack.yaml");
    expect(workflow(document), JSON.stringify(workflow.errors)).toBe(true);
    expect(document).toMatchObject({
      record_type: "chapter_workpack",
      owner: { novel_id: "NOVEL-0001" },
      status: "planned",
      visibility: "internal",
      canon_effect: "proposal_only"
    });
    expect(document).toHaveProperty("target_word_count.min");
    expect(document).toHaveProperty("scene_ids");
    expect(document).toHaveProperty("required_context.canon_ids");
    expect(document).toHaveProperty("continuity_contract.capability_scope");
    expect(document).toHaveProperty("continuity_contract.reader_exposure.forbidden");
    expect(document).toHaveProperty("quality_gates.reader_exposure_limited");
  });

  test("prose style profile records reusable language gates", async () => {
    const { workflow } = await entityValidators();
    const document = await loadYaml("templates/workflow/prose-style-profile.yaml");
    expect(workflow(document), JSON.stringify(workflow.errors)).toBe(true);
    expect(document).toMatchObject({
      record_type: "prose_style_profile",
      owner: { novel_id: "NOVEL-0001" },
      status: "planned",
      visibility: "internal",
      canon_effect: "proposal_only"
    });
    expect(document).toHaveProperty("style_contract.forbidden_patterns");
    expect(document).toHaveProperty("style_contract.imagery_rules");
    expect(document).toHaveProperty("prose_gates.hard");
    expect(document).toHaveProperty("revision_protocol.reread_checks");
  });

  test("volume restructure plan records longform rebuild constraints", async () => {
    const { workflow } = await entityValidators();
    const document = await loadYaml("templates/workflow/volume-restructure-plan.yaml");
    expect(workflow(document), JSON.stringify(workflow.errors)).toBe(true);
    expect(document).toMatchObject({
      record_type: "volume_restructure_plan",
      owner: { novel_id: "NOVEL-0001" },
      status: "planned",
      visibility: "internal",
      canon_effect: "proposal_only"
    });
    expect(document).toHaveProperty("source_constraints.capability_timeline");
    expect(document).toHaveProperty("phase_plan.0.entry_pressure");
    expect(document).toHaveProperty("memory_contract.must_load_ids");
    expect(document).toHaveProperty("quality_gates.prose_profile_linked");
  });
});
