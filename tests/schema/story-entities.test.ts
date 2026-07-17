import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import Ajv2020 from "ajv/dist/2020.js";
import type { AnySchema } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, test } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

async function load(relativePath: string): Promise<AnySchema> {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8")) as AnySchema;
}

async function validators() {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  ajv.addSchema(await load("schemas/common.schema.json"));
  return {
    canon: ajv.compile(await load("schemas/canon-entity.schema.json")),
    narrative: ajv.compile(await load("schemas/narrative-entity.schema.json"))
  };
}

const base = {
  schema_version: "0.1.0",
  owner: { novel_id: "NOVEL-0001" },
  status: "proposed",
  visibility: "internal",
  tags: []
};

describe("canon entity schema", () => {
  test("accepts a character with an actionable inner model", async () => {
    const { canon } = await validators();
    const character = {
      ...base,
      id: "CHAR-0001",
      entity_type: "character",
      name: "许见微",
      aliases: [],
      summary: "负责核验死亡与数字遗产的风险调查员。",
      psychology: {
        want: "证明自己仍然活着",
        need: "接受身份不只来自制度认证",
        wound: "妹妹失踪后，她选择相信系统而不是家人",
        lie: "只要证据链完整，真相就会自动获胜"
      },
      voice: {
        vocabulary: ["实证链"],
        syntax: "短句，先描述证据再表达情绪",
        notices_first: "记录中的时间和责任人",
        avoids: ["直接谈妹妹"]
      },
      capabilities: ["死亡核验", "数字遗产调查"],
      limits: ["无权直接修改城市身份底账"],
      secrets: [],
      first_scene_id: "SCN-0001"
    };

    expect(canon(character), JSON.stringify(canon.errors)).toBe(true);
  });

  test("rejects a world rule without a limitation or cost", async () => {
    const { canon } = await validators();
    const rule = {
      ...base,
      id: "RULE-0001",
      entity_type: "rule",
      name: "身份重绑定",
      summary: "可把一个人的社会身份绑定到另一具身体。",
      statement: "维护窗口内可重绑定身份。",
      scope: "城市数字身份系统",
      exceptions: []
    };

    expect(canon(rule)).toBe(false);
    expect(canon.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ keyword: "required" })
      ])
    );
  });

  test("requires exactly one owner scope", async () => {
    const { canon } = await validators();
    const fact = {
      ...base,
      owner: { novel_id: "NOVEL-0001", universe_id: "UNIV-0001" },
      id: "FACT-0001",
      entity_type: "fact",
      name: "冲突归属",
      summary: "不应同时归属小说和共享世界。",
      statement: "This record is invalid.",
      confidence: 1,
      evidence: []
    };

    expect(canon(fact)).toBe(false);
  });

  test("accepts a directional relationship with a causal event", async () => {
    const { canon } = await validators();
    const relationship = {
      ...base,
      id: "REL-0001",
      entity_type: "relationship",
      name: "许见微对许雾",
      summary: "爱与不信任并存。",
      from_character_id: "CHAR-0001",
      to_character_id: "CHAR-0002",
      dimensions: {
        trust: 0.2,
        affection: 0.9,
        fear: 0.4,
        obligation: 0.8,
        leverage: 0
      },
      public_label: "失踪者家属",
      private_reality: "她怀疑妹妹主动参与了身份实验。",
      valid_from_event_id: "EVT-0001",
      caused_by_event_ids: ["EVT-0001"]
    };

    expect(canon(relationship), JSON.stringify(canon.errors)).toBe(true);
  });
});

describe("narrative entity schema", () => {
  test("accepts an event with story time and consequences", async () => {
    const { narrative } = await validators();
    const event = {
      ...base,
      id: "EVT-0001",
      entity_type: "event",
      name: "许见微被系统判定死亡",
      summary: "城市底账在午夜把她变成已死亡人员。",
      story_time: {
        value: "2041-05-13T00:03:00+08:00",
        precision: "minute"
      },
      participants: ["CHAR-0001"],
      location_id: "LOC-0001",
      caused_by_event_ids: [],
      consequence_event_ids: [],
      facts_established: ["FACT-0001"]
    };

    expect(narrative(event), JSON.stringify(narrative.errors)).toBe(true);
  });

  test("accepts a scene contract with causal structure and exit hook", async () => {
    const { narrative } = await validators();
    const scene = {
      ...base,
      id: "SCN-0001",
      entity_type: "scene",
      name: "死亡客户拨来电话",
      summary: "许见微接到一个已死亡客户的求救。",
      narrative_order: { volume: 1, chapter: 1, scene: 1 },
      pov_character_id: "CHAR-0001",
      location_id: "LOC-0001",
      event_ids: ["EVT-0001"],
      cast_character_ids: ["CHAR-0001"],
      entry_state: "她相信系统记录可以解决任何身份争议。",
      structure: {
        goal: "核验来电者的死亡状态",
        conflict: "所有证据都证明来电者已经火化",
        turning_point: "对方说出只有许见微和妹妹知道的暗号",
        crisis: "挂断保护流程，还是继续听取非法来电",
        climax: "她绕过自动挂断，要求对方证明身份",
        resolution: "系统同时弹出许见微本人的死亡确认",
        exit_hook: "她的门禁权限在电话结束时被注销"
      },
      exit_state: "她失去制度身份，但获得妹妹可能活着的线索。",
      knowledge_changes: [],
      relationship_changes: [],
      foreshadowing_ids: ["FORESH-0001"]
    };

    expect(narrative(scene), JSON.stringify(narrative.errors)).toBe(true);
  });

  test("rejects a scene whose resolution does not create an exit hook", async () => {
    const { narrative } = await validators();
    const scene = {
      ...base,
      id: "SCN-0002",
      entity_type: "scene",
      name: "无拉力场景",
      summary: "场景结束后没有新问题。",
      narrative_order: { volume: 1, chapter: 1, scene: 2 },
      pov_character_id: "CHAR-0001",
      location_id: "LOC-0001",
      event_ids: [],
      cast_character_ids: ["CHAR-0001"],
      entry_state: "平静",
      structure: {
        goal: "喝水",
        conflict: "杯子有点远",
        turning_point: "她够到了杯子",
        crisis: "现在喝还是稍后喝",
        climax: "她喝了",
        resolution: "不再口渴",
        exit_hook: ""
      },
      exit_state: "平静",
      knowledge_changes: [],
      relationship_changes: [],
      foreshadowing_ids: []
    };

    expect(narrative(scene)).toBe(false);
    expect(narrative.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          instancePath: "/structure/exit_hook",
          keyword: "minLength"
        })
      ])
    );
  });
});
