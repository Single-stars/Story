---
name: novel-continuity
description: 对小说场景、事件、章节、人物状态、物品、知识、关系、伏笔、世界规则、权限、共享世界依赖和读者可见性进行只读连续性审计。用于写作前预检、章节完成后复核、跨章/跨卷一致性检查、设定冲突调查、发布或分享前剧透审查，以及定位时间、位置、伤势、资源、item_changes、knowledge learned/used、关系有效区间、章节链接或共享世界版本问题；必须显式绑定 novel_id，只输出证据化问题单和最小修复建议，不自动修改 Canon、场景契约或正文。
---

# Novel Continuity

把本 Skill 当作只读审计员。证明矛盾、标明影响并提出最小修复方向；不要替作者选择哪个版本为真，也不要直接修文件。

## 核心契约

- 在任何小说级读取前要求用户明确给出并确认 `novel_id`；不得用 `active_novel_id`、唯一候选或最近文件代替。
- 把版本化源文件视为唯一事实源，区分 Canon、proposal、research、manuscript 和派生物。
- 默认只读。即使修复看似明显，也不得修改 Canon、场景、章节、共享世界、可见性或生成物。
- 只读取当前小说及 manifest 显式引用的系列/共享世界版本；不得把其他小说当作隐式证据。
- 把验证器错误与人工判断分开。机器未报错不等于连续性完整，人工怀疑也不能冒充已证实冲突。
- 不把不可靠叙述、梦境、传闻、伪造记录、人物错误认知或有意误导自动判为世界事实冲突；先检查显式标记和叙事目的。
- 修复需要改变既有事实时，转交 `novel-canon-change`；需要改正文、场景、大纲、人物或世界规则时，交给对应专用 Skill 并等待作者授权。

## 1. 绑定审计范围

1. 按 `story-os-manager` 核对工作区注册、小说目录与 manifest 的 `novel_id` 一致。
2. 确认审计模式：单场预检、单章复核、跨章范围、跨卷范围、设定专项、发布/分享专项或变更影响专项。
3. 明确起止范围：`SCN-*`、`EVT-*`、`CHAPTER-*`、卷/章位置、实体 ID 或目标可见性 profile。
4. 确认基准：当前源文件、指定提交/版本或作者批准的基线；不要混用不同历史版本。
5. 运行 `npm run validate:story`；Windows PowerShell 入口受限时使用 `npm.cmd run validate:story`。
6. 报告验证命令、时间、错误码和统计，不在审计开始前自动修复。

启动输出至少包含：`novel_id`、审计模式、范围、基准、目标 profile、验证结果、上下文预算、拟读取文件/ID 和已知覆盖缺口。

### Gate A：范围与权限

若用户已经给出明确 `novel_id` 和范围，回显后直接进行只读审计。若缺少 `novel_id`、版本基准、分享 profile 或跨书权限，停在此 Gate 请求最小确认。

## 2. 控制上下文预算

按依赖环逐层加载，不扫描整部小说：

### 初始环

- `AGENTS.md`、工作区 manifest、目标小说 manifest。
- 目标场景契约或章节，以及直接相邻的上一/下一场景或章节。
- 目标记录直接引用的 `EVT/CHAR/LOC/ITEM/FACT/KNOW/REL/RULE/FORESH/THREAD`。

### 依赖环

- 事件的前因/后果、同一 `story_time` 的参与者与物品变化。
- 人物的上一已知位置、伤势/资源出口和下一入口。
- 知识的 `FACT-*`、学习事件/场景、来源人物和第一次使用场景。
- 关系的起止事件、原因事件与反向 `REL-*`。
- 伏笔的种植、推进、回收场景。
- manifest 明确引用的 `SERIES-*` 和 `UNIV-* @ version`。

默认先加载最多 8 个源文件或 20 个直接相关实体；不足时列出下一依赖环、原因和预计数量，再扩展。不要读取无关小说、根目录历史计划、构建输出、依赖目录或日志。

对发布/分享审计，内部证据可以用于审计，但输出报告本身不得向目标 profile 泄露更高可见性内容。必要时用“内部事实 FACT-* 导致剧透”代替复述秘密。

## 3. 先解释机器验证结果

保留验证器原始错误码、文件、实体 ID 和 details。当前语义验证至少覆盖：

- `ENTITY_REFERENCE_NOT_FOUND`：引用 ID 在当前小说不存在。
- `CHARACTER_LOCATION_CONFLICT`：同一 `story_time` 的同一人物出现在不同地点。
- `ITEM_HOLDER_CONFLICT`：同一时刻同一物品具有冲突的目标持有人或地点。
- `KNOWLEDGE_USED_BEFORE_LEARNED`：场景在叙事顺序上早于知识学习场景却使用该知识。
- `FORESHADOW_PAYOFF_MISSING`：伏笔标记 `paid_off` 却没有实际回收场景。
- `UNIVERSE_VERSION_NOT_REGISTERED`：小说引用了未注册的共享世界版本。
- `CHAPTER_NOVEL_MISMATCH`、`DUPLICATE_CHAPTER_ID`、`DUPLICATE_CHAPTER_POSITION`、`CHAPTER_LINK_NOT_FOUND`：章节归属、ID、位置或链接错误。
- Schema、owner、重复实体 ID、非法状态或可见性等结构错误。

结构错误若使后续字段无法可信读取，把依赖检查标为 `blocked_by_validation`；继续审计不依赖该字段的部分。不要把一次验证失败当成停止全部审计的理由，也不要把自动覆盖范围夸大成完整连续性证明。

## 4. 时间与叙事顺序

分别建立两条序列：

- **故事时间：**按 `EVT-*.story_time.value/precision` 排列实际事件。
- **叙事顺序：**按 `SCN-*.narrative_order.volume/chapter/scene` 和章节 `volume/chapter` 排列读者看到的内容。

逐项检查：

- 倒叙、梦境、传闻、伪造记录和不可靠叙述是否显式标记，而非被误当成新事件。
- 因果事件是否先发生；`caused_by_event_ids` 与 `consequence_event_ids` 是否互相支持。
- 同时发生、时间精度不同或跨午夜的事件是否被过度排序。
- 人物移动、通信、休息、治疗、制作和调查是否有足够时间；无距离/速度证据时标为待核实，不伪造结论。
- 场景地点与其事件地点是否合理；跨地点场景是否明确分段。
- 场景的章节位置与章节 frontmatter 是否一致。

不要用叙事先后推断故事时间，也不要因倒叙先被读者看到就判定人物提前经历事件。

## 5. 人物位置、伤势与资源

为目标人物建立逐事件/逐场状态链：

- 位置、同行者和可达性。
- 身体伤势、疾病、疲劳、饥渴与恢复进度。
- 精神/情绪状态中会限制行动的部分。
- 能力消耗、冷却、代价和规则例外。
- 金钱、弹药、药品、凭证、交通工具、时间配额及其他关键资源。
- 社会身份、权限、通缉/许可和公开关系状态。

把前一场 `exit_state` 与后一场 `entry_state` 对照。若伤势消失、资源补满、人物瞬移或权限突变，必须找到中间 `EVT-*`、场景或获批事实；否则报告缺口。人物卡的静态能力不能证明当前仍有资源使用能力。

## 6. 物品与 `item_changes`

以 `ITEM-*` 为单位追踪持有人、地点、状态和每次转移事件：

1. `from_holder_id/from_location_id` 是否匹配上一已知状态。
2. `to_holder_id/to_location_id` 是否唯一且与参与者、地点相容。
3. `state_after` 是否承接损坏、开启、消耗、伪造、封存等变化。
4. 后续人物是否实际取得物品后才使用它。
5. Canon 物品当前状态与最新批准事件是否一致；proposal 事件不能静默覆盖 Canon。

同一时刻的冲突目标由验证器捕获；跨时刻的断链、凭空出现、消耗后复原和来源不匹配需要人工审计。群体持有、复制品或不可分割物品要依据已批准规则判断，不要默认套用单一持有人模型。

## 7. 知识 learned / used

为每个关键 `KNOW-*` 建立：人物、`FACT-*`、状态、置信度、学习事件/场景、来源人物、首次/后续使用场景。

检查：

- `knowledge_changes` 是否链接到真正发生学习或认知变化的场景。
- `knowledge_used_ids` 是否在学习后使用；机器按叙事顺序检查，人工还要核对故事时间和回忆/预知规则。
- `unknown / suspects / believes_true / believes_false / verified` 是否与人物行动和叙述确定性相符。
- 来源人物是否当时拥有并愿意传递该知识。
- 人物是否忘记已经验证的信息，或依据作者层/读者层秘密行动。
- 错误认知是否被误写成客观 `FACT-*`，真相揭露后旧认知是否仍合理影响行为。

人物可以依据怀疑或错误信念行动；问题是正文把何种确信程度呈现给读者，而不是只有 `verified` 才能行动。

## 8. 关系有效区间

关系按方向审计，分别检查 `A -> B` 与 `B -> A`：

- `valid_from_event_id` 与 `valid_to_event_id` 的故事时间顺序。
- `caused_by_event_ids` 是否真正造成信任、好感、恐惧、义务或筹码变化。
- 场景的 `relationship_changes` 是否引用正确方向和当前有效区间。
- 同一方向的区间是否无解释重叠，旧区间是否在阶段变化时关闭。
- `public_label`、`private_reality` 与人物实际行为是否相容。
- 反向关系可以不同，不把数值不一致误判为错误。

“关系突然变好/变坏”必须落到可观察事件、知识变化或选择。缺少原因事件时只建议补追踪或调整场景，不直接重写关系值。

## 9. 伏笔状态与读者信息

按 `planted -> advanced -> paid_off | abandoned` 检查：

- `planted_scene_id` 存在且读者实际能看到 `reader_sees`。
- 推进没有提前泄露 `true_meaning`，回收能由此前信息公平支持。
- `paid_off` 具有 `actual_payoff_scene_id`，正文确实兑现而非只在记录中标记。
- `abandoned` 有具体原因，相关场景或读者承诺已处理。
- 同一伏笔没有重复回收、先回收后种植或因章节重排失去顺序。
- 目标 profile 不会通过伏笔记录、摘要、人物秘密或索引提前看到真实含义。

区分“作者知道的真实含义”和“读者当前能推断的信息”；可猜到不等于剧透，未授权直接暴露答案才是权限问题。

## 10. 章节链接与正文承接

检查章节 frontmatter：

- `CHAPTER-*` 唯一、`novel_id` 正确、卷章位置唯一，状态与内容版本一致。
- `previous_chapter_id`、`next_chapter_id` 存在，并人工检查互链是否对称、是否指向叙事相邻章节；验证器目前只检查目标存在。
- 首章/末章的空链接合理，章节插入或重排后链接同步更新。
- 前章出口与后章入口在时间、位置、伤势、物品、知识、关系和未完成行动上承接。
- `word_count`、标题和摘要与实际正文一致；摘要不得包含未来章节剧透。
- `locked/published` 章节没有被普通写作流程静默修改。

章节正文与场景契约冲突时，同时引用 `CHAPTER-*`、`SCN-*` 和相关事件；不要自动宣布正文或契约哪一个为准。

## 11. 世界规则、权限与项目边界

### 世界规则

- 检查人物行动是否符合 `RULE-*` 的 scope、limitations、costs 和 exceptions。
- “首次出现的新例外”不是自动合法例外；没有批准记录时标为 Canon 变更需求。
- 能力使用后的伤势、资源与关系代价必须持续到后续状态链。

### Canon 与归属

- `idea/rejected` 不能用于连续性判断；`proposed` 可作为候选分析，但不能当作已批准事实压过 Canon。
- `retconned/deprecated` 只用于解释历史版本，检查 `supersedes/superseded_by` 和目标基准。
- owner 必须与当前 `novel_id` 一致；共享世界实体只有一个正式所有者，小说本地不得同 ID 覆盖。

### 跨小说与共享世界

- 跨书引用必须来自显式 `SERIES-*`；同时检查阅读顺序和跨书剧透边界。
- 共享世界引用必须匹配已注册 `UNIV-* @ version`，不能把“同一 ID、不同版本”视为相同事实。
- 缺少明确依赖或版本时停止跨项目读取，只报告依赖缺口。
- 需要修改共享世界时只提出影响与变更请求，转交该 `UNIV-*` 所有者范围。

## 12. 可见性与剧透审计

先声明目标 profile：

- `internal`：作者完整资料和全部剧透。
- `editor`：明确授权的正文、设定和评论范围。
- `reader`：已开放章节与无未来剧透资料。
- `public`：作者明确批准的宣传内容。

检查章节、人物秘密、知识、伏笔真实含义、未来事件、摘要、索引和关系私密现实的 `visibility`。高等级记录被低等级记录引用时，不能假设前端隐藏字段即可保密；构建数据进入目标包前必须移除未授权内容。

报告剧透问题时说明泄露入口、目标 profile、被泄露的 ID、最早允许揭示位置和读者影响，但不要在低权限报告中复述秘密。系列或共享世界内容还要检查本书读者是否已按阅读顺序获知该事实。

## 13. 形成证据化问题单

每个问题使用稳定本次审计键 `CONT-001`、`CONT-002`；这些不是永久实体 ID。字段至少包含：

```text
issue_key
severity: blocker | high | medium | low
confidence: confirmed | probable | needs_evidence
category
claim
evidence[]: path + line/field + entity_id + observed_state
expected_constraint
affected_ids[]
reader_or_system_impact
minimal_fix_options[]: target_layer + smallest_change + tradeoff
verification_after_fix[]
blocked_by[]
```

严重度定义：

- `blocker`：归属/权限/剧透泄漏、不可同时成立的核心状态，或会阻止验证、发布、后续审计的问题。
- `high`：读者可见且破坏因果、谜题、公平性、人物能力或关键资源的矛盾。
- `medium`：局部状态断链、章节互链、关系/伏笔记录不完整，可能造成后续漂移。
- `low`：当前不改变理解，但会增加维护风险或缺少证据的追踪问题。

同一根因合并为一个问题并列出全部受影响 ID；不要按每个文件复制问题。证据不足时降低 confidence 或列入 `coverage_gaps`，不要用肯定语气。

最小修复建议只说明方向，不执行：优先补缺失追踪、修最小范围的场景/章节，再考虑 Canon 变更。若“改正文”与“改 Canon”都可成立，列出两个选项、各自影响和作者必须决定的问题，不替作者选择。

## 14. 输出与停点

按顺序输出：

1. `audit_header`：novel_id、范围、基准、profile、验证命令和上下文预算。
2. `machine_validation`：原始错误码、统计及其覆盖边界。
3. `issues_by_severity`：证据化问题单。
4. `passed_checks`：明确检查过且无问题的项目，不泛称“其他都正常”。
5. `coverage_gaps`：缺少文件、时间精度、距离、来源或权限导致无法判断的部分。
6. `author_decisions_required`：互斥修复方向与影响。
7. `stop_point`：审计完成位置、未读取范围、下一步路由和修复后复验命令。

### REVIEW record draft

默认只在对话中交付 `review_record_draft` YAML 块；只有用户明确授权写入精确路径，或明确授权“创建下一条审查记录”时，才写入 `novels/<NOVEL>/reports/reviews/REVIEW-*.yaml`。草稿必须兼容 `templates/workflow/review-record.yaml` 与 `schemas/review-record.schema.json`，使用 `review_type: continuity`、`canon_effect: proposal_only`，记录 `scope`、`source_version.content_hash`、`coverage.gaps`、`findings[].key/severity/status`、`conclusion.verdict`、`author_decision.status` 和 `reverification.status`。仍不得修改被审计源文件；报告落盘也不授权修改 Canon、场景契约或正文。

如果任何门禁必需字段未知，尤其是 `source_version.content_hash`、精确 `chapter_ids` 或版本基线，把缺口写入 `coverage.gaps`，并说明该草稿在补齐前不能用于 `CHRUN.required_reviews`。不要编造 hash、ID、作者决定或批准状态。

```yaml
review_record_draft:
  id: REVIEW-0001
  record_type: review_record
  owner:
    novel_id: NOVEL-0001
  review_type: continuity
  status: reviewed
  scope:
    novel_id: NOVEL-0001
    chapter_ids: []
    entity_ids: []
    manuscript_paths: []
  source_version:
    baseline_label: current-working-tree
    content_hash: "sha256:0000000000000000000000000000000000000000000000000000000000000000"
    reviewed_at: "2026-07-18T00:00:00.000Z"
  coverage:
    checked: []
    gaps: []
  findings:
    - key: CONT-001
      severity: note
      status: open
      issue: "替换为本次审计发现；无问题时使用空数组。"
      recommendation: "记录最小修复方向或复验建议。"
  conclusion:
    verdict: pass_with_notes
  author_decision:
    status: pending
    decision_id: null
  reverification:
    status: not_required
  resume_brief: "概括审计范围、结论和下一步。"
```

路由修复：正文交 `novel-chapter`，场景契约交 `novel-scene`，人物/关系/知识交 `novel-character`，规则交 `novel-worldbuilding`，结构交 `novel-outline`，Canon/retcon 交 `novel-canon-change`。每个流程仍须单独取得写入授权，不得由连续性审计直接代为修改。

## 必须停止的情况

- 缺少明确 `novel_id`，或注册、目录、manifest、owner 无法确定。
- 用户要求读取未声明的其他小说、未注册共享世界版本或超出目标 profile 的内容。
- 无法确定审计基准，源文件来自互相混杂的历史版本。
- 上下文预算需无边界扩张才能支持结论。
- 文件无法解析或 Schema 错误使相关字段不可信；停止依赖该字段的检查并报告，不伪造状态。
- 请求把 proposal 当 Canon、自动选择冲突版本、静默修正文/Canon 或覆盖共享世界。
- 目标可见性报告本身会泄露未授权秘密。

停止时给出具体文件、ID、失败门禁、已完成检查和最小解阻动作。

## 完成检查

- 已显式绑定正确 `novel_id`、范围、基准和目标 profile。
- 已记录上下文预算、读取清单和未覆盖范围，没有跨小说泄漏。
- 已区分故事时间、叙事顺序和章节链接。
- 已检查人物位置、伤势、资源、权限与相邻场景状态。
- 已追踪 `ITEM-*` 与 `item_changes` 的前后持有人、地点和状态。
- 已核对知识 learned/used、状态、来源和人物/读者边界。
- 已检查关系方向、有效区间、原因事件及反向差异。
- 已检查伏笔种植、推进、回收/放弃和剧透边界。
- 已核对章节归属、位置、互链、摘要、版本和锁定状态。
- 已检查规则限制/代价、Canon 生命周期、共享世界版本与可见性。
- 每个问题都有严重度、confidence、证据、受影响 ID、最小修复方向和复验方法。
- 没有修改 Canon、场景契约、正文、共享世界或派生物；已记录精确停点且未提交 Git。
