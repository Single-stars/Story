---
name: story-os-manager
description: 管理 Story OS 工作区与小说会话。用于新建、选择或切换小说，启动、恢复或结束会话，检查项目状态与验证门禁，控制上下文预算，或把任务路由到大纲、人物、场景、章节、连续性、研究和 Canon 变更等专用流程。
---

# Story OS Manager

## Durable longform memory

- For chapter drafting, rewriting, or continuation, route through `CHRUN-*` records in `reports/workpacks/` before prose work.
- Use `CHRUN-*` as the resumable chapter memory contract: target word count, approved scene ids, required context ids, capability scope, relationship state, foreshadowing plan, reader exposure limits, quality gates, and resume brief.
- For every chapter workpack, treat `required_context.style_profile_ids` as mandatory prose memory. If any referenced `STYLE-*` record is missing, stop before prose; do not replace it with a generic anti-AI phrase list.
- For large rewrites or longform recovery, also load `STYLE-*` records in `reports/style/` and `RESTRUCT-*` records in `reports/restructure/` when present or referenced. `STYLE-*` is the project prose and de-AI contract; `RESTRUCT-*` is the chapter-range rebuild matrix.
- `reviewed` and `accepted` chapter workpacks require current-version `continuity`, `developmental_edit`, `reader_test`, and `line_edit` review records. A changed manuscript hash makes earlier review evidence stale.
- Treat `memory_contract.must_load_ids` in workflow records as mandatory context. If validation reports `WORKFLOW_MEMORY_REFERENCE_NOT_FOUND`, stop before prose and create the missing proposal record or correct the reference.
- A missing or invalid `CHRUN-*` is a workflow blocker for new longform prose. Create a proposal workpack from `templates/workflow/chapter-workpack.yaml`, validate it, and only then route to `novel-chapter`.
- Treat all workflow records as `proposal_only`; they can constrain drafting but cannot promote Canon or retcon existing facts without `novel-canon-change`.

把本 Skill 当作会话总控和权限门禁，不要用它代替专用创作 Skill。

## 核心契约

- 把版本化源文件视为唯一事实源。网页、缓存、索引、上下文包和 .generated/ 仅是可重建派生物。
- 只允许作者批准 Canon。把 AI 建议、研究结论、读者反馈和正文提取的新事实保持为 idea、proposed、审计或变更请求。
- 在任何小说级读取或写入前，要求用户明确选择 novel_id。不得用最近编辑文件或 active_novel_id 代替选择。
- 把一部小说的目录视为隔离边界。除非存在显式系列或共享世界引用，否则不得读取其他小说。
- 在读写前声明任务类型、范围、上下文预算、允许修改的文件和必须通过的门禁。
- 发现冲突、验证失败或待作者决定时，报告证据并停止越权动作。

## 选择工作模式

先把请求归入一种模式：

1. workspace：列出项目、注册新小说、检查工作区状态；可在尚无 novel_id 时执行。
2. creative-intake：作者只有灵感、零基础开始新小说、要求逐步引导或固定创作陪跑时使用；可在尚无 novel_id 时执行。
3. start：选择小说并启动一个限定范围的新会话。
4. resume：从该小说的会话记录和源文件恢复工作。
5. route：确认范围后转交 AGENTS.md 的 Workflow Routing 所指定的专用 Skill。
6. close：记录停止点、决定、提案、未决问题、下一步和验证证据。
7. validate：只运行门禁并报告，不顺带修改内容。

注册新小说是唯一可在没有现成 novel_id 时进入的小说创建流程。先让作者确认单本/系列/共享世界归属，再分配并回显新的 NOVEL-* ID；从此后的每一步都使用该 ID。

当作者尚未确认创作简报时，不要急于注册新小说。先执行 creative-intake，使用 templates/workflow/creative-intake.yaml 的字段逐步收集灵感、偏好、目标体验、参考作品、人物与世界的高影响约束。访谈完成并经作者确认后，再进入注册新小说流程。

## 零基础作者创作启动

当用户表达“我只有灵感”“我是零基础小说家”“你一步步问我”“每次都按固定流程来”时，必须进入 creative-intake 模式。

执行规则：

1. 一次只问一个高影响问题；不要把模板字段一次性抛给作者。
2. 每轮回答后输出：已确认、AI 推断、仍未知、建议与取舍。
3. AI 可以主动补充专业建议、比较方案和推荐方向，但不得替作者批准 Canon。
4. 在 novel_id 尚未创建前，所有内容保持 workspace-level intake，novel_id 为 null。
5. 创作简报确认前，不写正文、不写 Canon、不生成正式大纲。
6. 创作简报确认后，注册 NOVEL-*，再把访谈结论作为 proposal/decision 输入 premise、人物、世界观和大纲流程。

固定阶段：

```text
author inspiration
-> creative preferences
-> ownership: standalone / series / shared universe
-> target reader and genre promise
-> 3-5 premise proposals
-> author selection
-> benchmark and research needs
-> character network and arcs
-> world rules and constraints
-> macro outline alternatives
-> chapter architecture
-> scene contracts
-> continuity preflight
-> draft
-> developmental / character / continuity / line review
-> fresh-reader test
-> author approval
-> Canon change proposal
```

质量检查必须覆盖：类型承诺、因果链、主角能动性、困难选择和代价、反对力量升级、悬念/惊奇/好奇、情绪曲线、转折可追溯性、伏笔种植与回收、世界规则限制、POV、人物声音、读者理解和长期连载节奏。

## 绑定小说

1. 读取 workspace/manifest.yaml 的注册表。
2. 如果用户已给出 novel_id，验证它已注册且路径存在。
3. 如果未给出或存在歧义，列出候选的 ID、标题和状态，要求用户明确选择。
4. 读取所选小说的 manifest.yaml，确认其 novel_id 与注册表一致。
5. 检查系列与共享世界依赖；共享世界必须带明确 universe_id 和版本。
6. 输出当前绑定的 novel_id。在用户明确切换前，不改变绑定。

不要因为工作区只有一部小说就静默选择。可以推荐唯一候选，但仍要回显并取得确认。

## 控制上下文预算

在启动报告中声明初始预算。默认只加载：

- AGENTS.md、README.md 和 workspace/manifest.yaml。
- 所选小说的 manifest.yaml。
- 最新且属于该 novel_id 的会话记录。
- 当前任务直接引用的最多 8 个源文件或实体 ID。

使用 rg 精确定位 ID、路径和最近记录。不要默认读取整部小说、其他小说、根目录历史计划、构建输出、依赖目录或日志。

维护一份简短上下文清单，记录已读取的文件、实体 ID、共享世界版本和排除范围。预算不足时，先说明缺少什么、为何需要、准备新增多少，再扩展读取；不得用无边界扫描解决不确定性。

## 启动检查

按顺序执行：

1. 绑定 novel_id 并确认任务类型。
2. 检查工作区是否有未提交且与本次范围重叠的改动；保留用户已有内容。
3. 从仓库根目录运行 npm run validate:story。
4. 读取小说 manifest、当前焦点、最近作者决策和必要的会话记录。
5. 只加载任务需要的 Canon、叙事实体、正文或研究资料。
6. 列出本次依赖的关键事实 ID，并区分 Canon、proposal、research 和 manuscript。
7. 声明修改文件；预计超过 3 个文件时先拆批。
8. 根据 AGENTS.md 路由专用 Skill。对应 Skill 尚未建立时，使用 STORY_OS_SPEC.md 的同名流程，不发明替代权限。

启动输出至少包含：novel_id、任务类型、目标、读取范围、上下文预算、验证结果、修改范围、路由目标和阻塞决定。

## 恢复检查

1. 重新绑定并核对会话记录中的 novel_id，拒绝跨小说恢复。
2. 使用 templates/workflow/session-note.yaml 的字段恢复目标、已确认决定、未批准提案、未决问题、停止点和下一步。
3. 对照当前源文件与 Git diff，确认会话记录没有被后续变更淘汰。
4. 重新运行 npm run validate:story；不要信任旧验证结果。
5. 核对任何“已批准”声称是否有作者决定记录。没有证据时仍按 proposal 处理。
6. 从 resume_from 指定的位置继续；不要凭聊天记忆补全缺失状态。

若当前小说没有约定的会话记录保存位置，先向作者确认位置，再复制模板；不要自行建立新的事实源目录。

## 使用现有模板

复制模板到所选小说的正式位置后再填写，不要编辑模板本身：

- 新小说 manifest：templates/novel/manifest.yaml
- 大纲：templates/narrative/outline.yaml
- 场景契约：templates/narrative/scene-contract.yaml
- Canon 变更请求：templates/governance/change-request.yaml
- 创作启动访谈：templates/workflow/creative-intake.yaml
- 会话记录：templates/workflow/session-note.yaml
- 实体记录：按任务选择 templates/entities/*.yaml

填写后立即替换占位值，并验证 owner.novel_id、实体引用和文件路径均属于当前小说或显式依赖。

## 执行门禁

### 写入门禁

- 写入前复述授权范围和目标文件。
- 不修改未列入范围的业务文件。
- 不把派生数据写回 Canon。
- 不覆盖用户未提交改动；发生重叠时停止并报告。

### Canon 门禁

- 新事实、规则、人物历史、retcon 或共享世界变化只能先成为 proposal。
- 高影响变化使用 templates/governance/change-request.yaml，包含影响、迁移、验证和回滚。
- 只有存在作者批准记录后才能应用 Canon 状态变化。
- 小说本地范围不得修改共享世界 ID；把请求转到对应 UNIV-* 所有者范围。

### 隔离门禁

- 校验每个实体的 owner.novel_id 与当前小说一致。
- 跨书读取必须来自显式 SERIES-* 或带版本的 UNIV-* 依赖，并列入上下文清单。
- 不把其他小说的决定、人物、设定、反馈或正文作为当前小说的隐式上下文。

### 验证门禁

- 使用仓库脚本 npm run validate:story；实现入口为 tools/validator/src/cli.ts。
- 根据任务补充 YAML/Markdown 解析、测试、类型检查或审查。
- 提交前如适用，运行仓库当前完整命令 npm run verify。
- Schema、归属、ID、引用、Canon 生命周期、连续性或可见性验证失败时，不得宣称完成、提交或发布。

## 会话收尾

1. 使用 templates/workflow/session-note.yaml 记录完成内容和精确停止点。
2. 单独记录作者已确认决定与尚未批准的提案。
3. 提取新事实、知识、关系、物品、事件和伏笔变化，但保持 proposal 状态。
4. 记录未决问题、下一步、所需依赖和下一次最小上下文。
5. 运行任务相关检查和 npm run validate:story，保存命令、结果和证据。
6. 检查 Git diff，确认只修改授权文件且没有跨小说泄漏。
7. 报告是否满足提交条件。除非用户明确要求，否则不要提交 Git。

收尾输出至少包含：novel_id、完成范围、作者决定、未批准提案、未决问题、停止点、下一步、验证证据、修改文件和剩余门禁。

## 必须停止的情况

- 小说级任务没有明确 novel_id。
- 注册表、路径、manifest 或实体 owner 不一致。
- 需要读取未声明的其他小说。
- 小说范围试图覆盖共享世界记录。
- Canon 变化尚无作者批准。
- 上下文预算需要无边界扩张。
- 验证失败、可见性可能泄漏或用户改动与本次修改冲突。

停止时给出具体文件、ID、失败门禁和最小解阻动作，不要自行选择方便的事实版本。
