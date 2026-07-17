import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import Ajv2020 from "ajv/dist/2020.js";
import type { AnySchema } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { parse } from "yaml";
import { describe, expect, test } from "vitest";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

async function loadJson(relativePath: string): Promise<AnySchema> {
  return JSON.parse(
    await readFile(path.join(repositoryRoot, relativePath), "utf8")
  ) as AnySchema;
}

async function loadYaml(relativePath: string): Promise<unknown> {
  return parse(await readFile(path.join(repositoryRoot, relativePath), "utf8"));
}

async function createValidator() {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  ajv.addSchema(await loadJson("schemas/common.schema.json"));
  return ajv.compile(await loadJson("schemas/workspace-manifest.schema.json"));
}

describe("workspace manifest schema", () => {
  test("accepts the repository workspace manifest", async () => {
    const validate = await createValidator();
    const manifest = await loadYaml("workspace/manifest.yaml");

    expect(validate(manifest), JSON.stringify(validate.errors)).toBe(true);
  });

  test("rejects a workspace without a stable workspace id", async () => {
    const validate = await createValidator();
    const manifest = (await loadYaml("workspace/manifest.yaml")) as Record<
      string,
      unknown
    >;
    delete manifest.workspace_id;

    expect(validate(manifest)).toBe(false);
    expect(validate.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          instancePath: "",
          keyword: "required",
          params: { missingProperty: "workspace_id" }
        })
      ])
    );
  });

  test("rejects malformed registered novel ids", async () => {
    const validate = await createValidator();
    const manifest = (await loadYaml("workspace/manifest.yaml")) as Record<
      string,
      unknown
    >;
    manifest.novels = [
      {
        id: "novel-one",
        title: "Broken",
        path: "novels/novel-one",
        status: "planning"
      }
    ];

    expect(validate(manifest)).toBe(false);
    expect(validate.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          instancePath: "/novels/0/id",
          keyword: "pattern"
        })
      ])
    );
  });

  test("rejects unknown top-level fields", async () => {
    const validate = await createValidator();
    const manifest = (await loadYaml("workspace/manifest.yaml")) as Record<
      string,
      unknown
    >;
    manifest.hidden_database = "not-allowed";

    expect(validate(manifest)).toBe(false);
    expect(validate.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          instancePath: "",
          keyword: "additionalProperties"
        })
      ])
    );
  });
});
