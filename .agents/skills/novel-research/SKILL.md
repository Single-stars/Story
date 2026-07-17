---
name: novel-research
description: 为指定小说执行有边界、可追溯的资料检索、事实核验、来源比较与敏感性风险调查。用于历史、地理、职业、法律、医学、科技、文化、语言、物流或其他现实依据的研究，以及核实某项设定假设、定位来源分歧、建立 research ledger 或为大纲/人物/世界观/场景/章节提供证据；必须显式绑定 novel_id，记录来源、访问日期、可信度、适用范围和冲突，严格区分 research 与 Canon，不把未核实资料或研究结论直接晋升为 FACT-*，并遵守小说、系列与共享世界隔离。
---

# Novel Research

把本 Skill 当作证据管理员。回答会改变故事选择的具体问题，保留来源与不确定性；不要替作者批准设定，也不要把现实资料自动变成小说世界事实。

## 核心契约

- 在读取任何小说级文件前要求用户明确给出并确认 `novel_id`；不得用 `active_novel_id`、唯一候选、最近文件或目录名猜测。
- 先声明任务类型为 `research`，并区分 `Canon`、`proposal`、`research`、`manuscript` 和派生物。
- 默认只在对话中交付研究账本。只有作者明确授权目标路径后才写入当前小说的 `research/`；研究写入仍不是 Canon 批准。
- 不创建、修改或晋升 `FACT-*`、`RULE-*` 或其他 Canon 实体，不修改场景契约、正文、共享世界或系列记录。
- 只读取当前小说，以及其 manifest 明确引用且版本锁定的 `SERIES-*` / `UNIV-*`。不得读取或借用其他小说的研究、人物、设定、反馈或正文。
- 不伪造来源、URL、作者、出版信息、引文、访问日期、页码或验证结果。无法访问或无法核实就明确标记。
- 遇到来源冲突时并列呈现证据、适用条件与影响，不替作者选择方便的版本。

## 1. 绑定问题与范围

启动时确认：

1. `novel_id`、小说目录和 manifest 归属一致。
2. 一个可回答的 `research_question`，以及它会影响的规则、人物选择、场景、情节或措辞。
3. 时间、地区、人群、制度、技术版本、语言和精度边界。
4. 需要的来源质量：一手资料、权威二手资料、专业实践资料或仅作灵感的参考。
5. 风险等级：普通、时效敏感、医疗/法律/安全、文化身份/创伤等敏感主题。
6. `stop_condition`：什么证据足以停止检索并返回创作决策。

启动输出至少包含：`novel_id`、问题、适用范围、排除范围、目标用途、来源门槛、上下文预算、拟读取文件/ID 和停止条件。

### Gate A：研究契约

缺少明确 `novel_id`、问题宽到无法验证、适用范围不清或需要读取未授权小说时，停在此 Gate 请求最小确认。不要以无边界“查全所有资料”开始研究。

## 2. 控制项目上下文

按最小依赖读取：

- `AGENTS.md`、工作区 manifest、当前小说 manifest。
- 用户点名的 premise、outline、角色、规则、事件、场景或章节。
- 上述文件直接引用且确实会约束研究问题的当前小说 Canon。
- manifest 明确声明的共享世界实体，只读取锁定版本且保持只读。

默认先读取最多 6 个源文件或 15 个直接相关实体。需要扩大时，先列出新增文件/ID、原因和预计数量。不要扫描其他小说、历史计划、构建产物、依赖目录或日志来“补充背景”。

把 Canon 仅用作问题边界：它能说明小说目前假定什么，但不能证明现实世界事实。把 manuscript 仅用作措辞或场景需求证据，不能反推它已经是 Canon。

## 3. 设计检索与证据标准

先拆出少量可独立验证的子问题，按影响优先级排序。优先寻找：

1. 原始法规、标准、档案、数据、论文、机构手册、当事人同期材料等一手来源。
2. 可靠学术、政府、专业机构或有透明编辑流程的权威二手来源。
3. 能说明实践差异的专业访谈、行业资料或高质量报道。
4. 百科、论坛、社交媒体和聚合内容只用于发现线索，不单独支撑高影响结论。

对每个来源检查：作者/机构、发布日期或版本、访问日期、证据链、地域与时期、利益冲突、是否引用原始材料、是否已失效。时效敏感问题必须寻找当前版本；历史问题必须避免用现代规则倒推旧时期。

不要用来源数量代替质量。多个互相抄录的网页算同一证据链；搜索摘要、AI 摘要和未打开的结果页不能作为已核实证据。

## 4. 维护研究账本

每个可用于创作的 claim 使用临时研究键 `RES-001`、`RES-002`；这些不是永久实体 ID。至少记录：

```text
research_key
claim
classification: verified_fact | disputed_fact | assumption | invention | unresolved
source_records[]:
  title
  author_or_institution
  source_type
  publication_or_version_date
  access_date
  locator: URL | DOI | ISBN | archive reference | page/section
  supports_or_challenges
source_quality: primary | authoritative_secondary | professional_practice | discovery_only
confidence: high | medium | low
applicability: time + place + population + conditions
limits_and_analogy_breaks[]
conflicts[]: competing claim + source + likely reason
story_relevance: affected IDs/files + decision changed
sensitivity_or_safety_risk[]
open_questions[]
```

分类规则：

- `verified_fact`：在声明的适用范围内得到足够可靠证据支持；仍然只是 research，不自动成为 Canon。
- `disputed_fact`：可靠来源存在实质分歧；保留主要观点、各自范围和证据强弱。
- `assumption`：为继续设计而暂用、尚未充分核实的前提。
- `invention`：作者有意虚构的选择；不得伪装成现实事实或用伪造来源背书。
- `unresolved`：证据不足、不可访问、术语含混或问题本身无法按当前范围回答。

`confidence` 是对该 claim 在特定范围内成立的判断，不等于来源名气；必须给出简短理由。引用只支持它实际证明的内容，不从相关性跳到因果性，也不把个案外推为普遍规律。

## 5. 处理冲突、缺口与敏感内容

来源冲突时：

1. 核对是否在谈不同年代、地区、人群、定义、法律层级或统计口径。
2. 追踪共同原始来源，识别互相抄录或过期版本。
3. 分别记录支持与反驳证据，不把争议压成单一确定句。
4. 说明采用任一版本会影响哪些故事选择，但把选择留给作者。

对医疗、法律、安全或高风险专业细节，标明研究用途与时效边界，不把创作资料包装成现实建议。对文化、身份、宗教、创伤和历史暴力，记录谁的视角被引用、样本缺口、术语自称与外称、刻板印象风险；必要时建议敏感读者或领域专家复核，但不要声称已代表整个群体。

无法获得足够证据时输出 `evidence_gap`，说明已查方向、失败原因、结论风险和最小解阻动作。不要为填满表格降低验证标准。

### Gate B：证据充分性

高影响情节或世界规则依赖低可信、单一、过期或冲突未解的来源时，停止把它表述为已核实事实。返回可逆的创作选项、需要作者接受的误差范围或下一轮具体检索问题。

## 6. 从研究返回创作流程

研究结论只提供设计输入：

- 影响 premise 或类型承诺时，交给 `novel-premise`。
- 影响结构因果时，交给 `novel-outline`。
- 影响人物身份、能力或经历时，交给 `novel-character`。
- 影响规则、制度、地点或文化时，交给 `novel-worldbuilding`。
- 影响场景可行性时，交给 `novel-scene`。
- 只影响正文表达时，交给 `novel-chapter` 或 `novel-line-edit`。
- 需要新增或改变正式事实时，先形成 proposal/change request，再交给 `novel-canon-change` 等待作者批准。

现实中的 `verified_fact` 与小说内 `FACT-*` 不是同一层。即使作者决定采用研究结论，也必须经过相应设计与 Canon 审批流程；不得由本 Skill 直接创建 `status: canon`，也不得把“作者允许保存研究笔记”解释为批准事实。

## 7. 写入与验证

没有明确写入授权时，标记“未落盘”并停在对话交付。获得授权后：

1. 只写入当前 `novel_id` 的 `research/` 目标路径，使用 `templates/research/source-note.yaml` 创建记录；不要修改模板或 Schema。
2. 保留问题、范围、来源记录、访问日期、claim 分类、可信度、冲突、适用限制、故事相关性和开放问题。
3. 不在研究笔记中伪造永久 `FACT-*` 或 Canon 批准记录；引用现有实体时只使用真实 ID。
4. 解析 YAML/Markdown，运行 `npm run validate:story`；Windows PowerShell 入口受限时使用 `npm.cmd run validate:story`。
5. 检查 Git diff 仅包含作者授权范围，不提交 Git。

### Gate C：研究笔记落盘

展示目标路径、内容摘要、敏感性/许可风险和验证计划。作者未明确授权时不得落盘；验证失败时保留可诊断证据，不宣称研究记录完成。

## 输出格式

每次完整交付按顺序包含：

1. `research_header`：novel_id、问题、范围、用途、来源门槛、访问日期和停止条件。
2. `context_used`：读取文件/ID、共享世界版本、明确排除范围和预算。
3. `answer_summary`：只陈述证据支持到的精度。
4. `research_ledger`：逐项 claim、分类、来源、质量、confidence、适用范围、限制和冲突。
5. `story_implications`：影响的文件/ID、可逆选项和各自风险；不得写成 Canon 决定。
6. `evidence_gaps_and_sensitivity`：未解决问题、偏差、安全/文化风险和需要的专家复核。
7. `author_decisions_required`：需要作者选择或批准的事项。
8. `stop_point`：停止条件是否满足、是否落盘、验证证据和下一 Skill。

短问题可以压缩格式，但不得省略来源、访问日期、可信度、适用范围、冲突状态、`novel_id` 与非 Canon 声明。

## 必须停止的情况

- 缺少明确 `novel_id`，或工作区注册、目录、manifest 不一致。
- 研究范围要求读取未声明的其他小说，或未锁定版本的系列/共享世界。
- 问题、年代、地区、人群或术语边界不足以判断来源是否适用。
- 高影响结论只能依赖搜索摘要、AI 生成内容、不可核实引文、单一低质量来源或已失效版本。
- 来源冲突会改变核心因果，但用户要求隐去争议或直接选一个方便版本。
- 用户要求伪造来源、引文、访问记录、专家共识或验证结果。
- 用户要求把 research 直接写成 `FACT-*`、Canon、共享世界正式记录或正文既定事实。
- 写入路径不属于当前小说的 `research/`，或作者尚未授权落盘。

停止时报告问题、证据缺口、受影响文件/ID、风险、已完成工作和最小解阻动作。

## 完成检查

- 已显式绑定正确 `novel_id`，没有读取或混入无关小说。
- 已声明问题、范围、用途、来源门槛、上下文预算和停止条件。
- 每个关键 claim 都有分类、可追溯来源、访问日期、来源质量、confidence 与适用范围。
- 已识别来源冲突、共同证据链、过期版本、类比边界和未解决缺口。
- 已区分现实研究事实、假设、原创设定、proposal、Canon 与 manuscript。
- 未把未核实资料或已核实研究结论直接晋升为 `FACT-*` 或 Canon。
- 已记录故事影响和可逆选项，但未替作者批准设计选择。
- 已遵守系列/共享世界版本与小说隔离，没有复制或覆盖共享实体。
- 获得写入授权时只修改当前小说 `research/`，并完成解析、Story OS 验证和 diff 检查。
- 已记录精确停点、开放问题、作者门禁与下一 Skill；未提交 Git。
