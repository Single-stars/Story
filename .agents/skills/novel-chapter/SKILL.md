---
name: novel-chapter
description: 按已批准场景契约起草、续写、重写和自审单个小说章节。用于把锁定场景转化为正文，控制 POV、叙述距离、段落因果、信息披露、对白动作、章末拉力、字数节奏，并在写后提取事实与状态 proposal；必须先做连续性预检，验证合法 frontmatter，并停在作者批准门禁。
---

# Novel Chapter

## Durable chapter workpack

- Before drafting, rewriting, or continuing a chapter, load the matching `CHRUN-*` record from `reports/workpacks/` when one exists or require one for new longform work.
- Treat the workpack as the first resumable memory surface: `target_word_count`, `scene_ids`, `required_context`, `continuity_contract`, `quality_gates`, and `resume_brief` must be read before prose.
- Load every `STYLE-*` listed in `required_context.style_profile_ids` for ordinary chapter drafting, continuation, and local rewrites. Missing style memory is a blocker, not an optional polish concern.
- Before large rewrites, also load available `STYLE-*` records from `reports/style/` and `RESTRUCT-*` records from `reports/restructure/` when referenced by the workpack, restructure plan, or user task. Use them as durable language and rebuild constraints.
- A `STYLE-*` record controls prose gates: protected facts, forbidden AI-syntax patterns, POV/distance, dialogue rules, imagery function, and reread protocol. Do not rely on a generic anti-AI phrase list when a project style profile exists.
- A `RESTRUCT-*` record controls chapter-range rebuilds. Do not map old chapter numbers directly to new drafts; follow its phase functions, world layers, capability timeline, reader exposure, character roster policy, and memory contract.
- Stop before prose when any workpack gate is false, when a referenced scene/entity is missing, or when `npm run validate:story` reports `WORKPACK_*`.
- Stop before marking a workpack `reviewed` or `accepted` unless current-version `continuity`, `developmental_edit`, `reader_test`, and `line_edit` records all pass and still match the manuscript hash.
- Stop before prose when `npm run validate:story` reports `WORKFLOW_*`, especially missing `memory_contract.must_load_ids`.
- Do not use chat memory to replace a missing workpack. Create or update a `chapter_workpack` proposal first, then validate.
- The workpack, style profile, and restructure plan are not Canon. They can constrain drafting and produce proposals, but they cannot approve new facts, rules, relationships, or retcons.

把已批准的场景契约实现为一章可验证正文。不要用正文反向发明大纲、场景契约或 Canon。

## 核心契约

- 先按 story-os-manager 绑定明确 novel_id、唯一 CHAPTER-* ID、卷章位置和目标文件。
- 默认一次只处理一章。多章任务按章节拆批，不跨越用户授权范围。
- 把版本化源文件视为唯一事实源，区分 Canon、proposal、research、narrative 和 manuscript。
- 只按作者已确认的 outline 范围与场景契约写作。缺失或冲突时转回 novel-scene，不自行补设计。
- 把新增事实、知识、关系、物品、伤势、资源和规则变化提取为 proposal；不得静默修改 Canon。
- 严格按以下顺序工作，不合并审查阶段：

连续性预检
→ 草稿
→ 结构自审
→ 人物自审
→ 语言初审
→ 验证
→ 作者批准

## 1. 绑定章节与上下文预算

1. 验证 novel_id 已注册，读取目标小说 manifest 和 manuscript 路径。
2. 确认 CHAPTER-* ID、volume、chapter、标题、前后章引用和唯一目标文件。
3. 检查目标文件和相邻章节是否有与本次范围重叠的用户改动。
4. 从仓库根目录运行 npm run validate:story；报告会影响本章的 Schema、归属、引用与连续性错误。
5. 声明任务是新写、续写、局部重写还是整章修订；局部任务必须标明段落或场景边界。

默认上下文预算为：

- AGENTS.md、小说 manifest、当前 outline 的本章部分。
- 本章全部场景契约。
- 上一章最后一个相关场景或章末出口；必要时读取下一章入口约束，不默认读取整章。
- 与本章直接相关的最多 8 个 Canon、人物、关系、知识、规则、事件、伏笔或作者决定文件。
- manifest 显式声明且本章实际使用的共享世界版本。

使用 rg 按 ID 和路径定位。列出已读取文件、实体 ID、共享依赖、明确排除内容和预算余量。需要扩大预算时先说明原因和数量；不要读取整部正文、无关章节或其他小说来模仿文风。

输出启动契约：novel_id、chapter_id、卷章位置、任务类型、目标字数、场景列表、上下文清单、验证结果、目标文件和第一个作者门禁。

## 2. 锁定章节场景契约

建立 scene_lock：

| order | scene_id | status | pov | location | goal | turning_point | climax_action | exit_state | author_evidence |
|---:|---|---|---|---|---|---|---|---|---|

逐项检查：

- 场景属于当前 novel_id，narrative_order 落在目标章节。
- 场景状态、作者决定或会话记录足以证明本章可写。
- POV、地点、event_ids、在场人物、entry_state 与 exit_state 完整。
- goal、conflict、turning_point、crisis、climax、resolution 和 exit_hook 属于同一因果链。
- 场景顺序与已批准 outline 一致。
- 相邻场景的出口能成为下一场入口；时间、地点或 POV 跳转有明确过渡条件。

场景契约不完整时，使用 `novel-scene` 与 `templates/narrative/scene-contract.yaml` 补齐并取得作者确认。不要替场景流程补写缺失契约。

### Gate A：场景锁定

让作者确认场景列表、顺序、允许的局部调整、目标字数和不可改变的事实。未确认时只输出预检问题，不开始正文。

## 3. 连续性预检

在写第一段前建立 preflight_ledger：

### 章节边界

- 上一章结尾的地点、时间、未完成动作、情绪与具体压力。
- 本章第一场 entry_state 是否完整承接。
- 本章最后一场 exit_hook 是否兼容下一章已知入口。
- previous_chapter_id 与 next_chapter_id 是否真实存在；未知时保持 null，不伪造链接。

### 时间与空间

- EVT-* 的 story_time 与 SCN-* 的 narrative_order 分离。
- 行程、等待、伤势恢复、昼夜和环境变化所需时间合理。
- 人物、物品和资源不能同时出现在互斥地点。
- 场景转换明确谁移动、移动多久、途中发生什么状态变化。

### 人物与知识

- POV 人物只依据其已知、怀疑、误信或验证的信息行动。
- 在场人物、关系方向、承诺、秘密、称谓和当前立场一致。
- Want、Need、Wound、Lie、价值观和当前压力足以解释关键选择。
- 身体、精神、伤势、疲劳、能力消耗、金钱和社会状态连续。

### 规则、物品与伏笔

- 世界规则的 scope、limitations、costs 和 exceptions 在本章真实生效。
- 关键物品的持有人、位置、状态和转移原因一致。
- 本章种植、推进或回收的 FORESH-* 与场景契约一致。
- 共享世界规则来自 manifest 锁定版本，且未被小说本地覆盖。

把每个问题标为 pass、warning 或 blocker。blocker 未解决时停止；不要在正文中用含糊句子掩盖矛盾。

## 4. 建立 POV 与叙述距离契约

为每个场景确认：

- pov_character_id。
- 人称与时态。
- narrative_distance：贴身、近距、中距或远距。
- sensory_filter：该人物优先注意什么、忽略什么。
- vocabulary_and_syntax：词汇、句法、比喻与回避话题。
- knowledge_limit：不能知道、不能正确理解或不能公开承认什么。
- distance_shift：何时允许拉近或拉远，以及叙事目的。

同一场景不跳进其他人物内心。多 POV 章节只在已批准的场景边界切换，并用清晰分隔、地点或时间重新定向。不要为了制造悬念隐瞒 POV 人物此刻必然想到的关键信息。

## 5. 规划开篇抓力与字数节奏

开篇必须承接真实压力，而不是制造与本章无关的假危险：

- 在最早数段内给出人物、当前处境和可感知目标中的至少两项。
- 用行动、异常、未完成后果、困难选择或具体承诺建立阅读问题。
- 让首段语气符合 POV，不用通用警句、天气说明或百科背景代替冲突。
- 若使用梦境、倒叙、伪造记录或不可靠叙述，必须来自已批准场景契约并尽快提供公平定位。

设置 target_word_range 和 scene_word_budgets。作者未给目标时，根据章节功能、场景数量和相邻章节提出范围并请求确认，不把平台惯例当硬规则。

字数分配服务节奏：

- 关键选择、误解修正和高代价行动允许扩写。
- 重复信息、无变化往返和纯过场应压缩。
- 不能为了达到字数加入新场景、新 Canon 或无功能对白。
- 最终 word_count 使用实际正文计数，不使用估算。

## 6. 起草正文

获得 Gate A 写入授权后：

1. 复制 templates/manuscript/chapter.md 到作者批准的 manuscript 路径，不编辑模板本身。
2. 立即填写合法 frontmatter，保持 status: draft 与适当 visibility。
3. 按 scene_lock 顺序写作，每场都从 entry_state 进入并落到已批准 exit_state。
4. 让触发、行动、反应、选择和结果推动段落，不把梗概扩写成静态说明。
5. 草稿期间发现契约或 Canon 缺口时标记 draft_blocker；重大问题停止，不静默改设计。

### 段落级因果与悬念

检查相邻段落是否能用“因为 / 但是 / 所以”连接。段落可以承担：

- stimulus：新动作、信息或环境压力。
- perception：POV 对刺激的有限感知。
- reaction：身体、情绪或判断反应。
- choice：角色决定采用的策略。
- action：可观察行动或对白。
- consequence：结果、代价或新的压力。

不要求每段机械包含全部步骤，但连续段落不能只是互不影响的观察清单。

管理 question_ledger：

- 本段打开什么问题。
- 哪个旧问题得到部分或完整回答。
- 回答如何产生更具体的新问题。
- 该信息对角色选择与读者判断有什么作用。

悬念来自不确定结果、信息差、时间压力和代价，不来自故意删掉角色必知信息。

### 场景过渡

- 用上一场结果触发下一场目标，不靠“过了一会儿”替代因果。
- 明确时间、地点、POV 或状态变化；必要时使用章节内分隔。
- 转场后尽快重新建立人物位置、当前压力和行动方向。
- 跨地点移动保留时间、伤势、物品和同行者连续性。
- 不在过渡段偷塞未经批准的新事件。

### 信息控制

- 分开 world_truth、character_knowledge 与 reader_exposure。
- 只让 POV 叙述其能观察、记起、推断或误解的内容。
- 把背景信息绑定到目标、冲突、物件、制度摩擦或错误判断。
- 先展示会影响当前选择的证据，再解释必要机制。
- 新概念先写形状、材质、声音、痕迹、使用和人物反应；名称只能是有来源的暂称，不能提前告诉读者用途或真义。
- 不提前泄露未来章节、隐藏身份或 internal 真相，除非场景契约明确要求。
- 新事实必须有来源或 proposal 标记，不能因正文写得自然就视为 Canon。

### 对白与动作

- 让每段对白具有目标、策略、阻力、潜台词或关系变化。
- 对白必须像当前人物会说的话；人物职责、敏锐或神秘感只能由行为、误判和代价体现，不能靠自我标签或主题警句宣布。
- 区分人物声音；避免所有角色使用同一种解释句式。
- 使用动作节拍澄清空间、态度和因果，不为每句话机械添加表情。
- 让回答可以回避、误解、反击或改变策略，但不能无故拒绝交流来拖延情节。
- 保持说话者、持有物、距离、视线和动作顺序清楚。
- 动作场面优先写目标、空间、选择、受力、结果和代价，而不是招式清单。
- 能力测试必须先有即时触发、目标、假设、风险和停止条件；没有这些条件时只写感知或失败，不写验收清单。

### 章末拉力

章末必须由本章结果产生：

- 新决定。
- 新威胁或时间压力。
- 已付代价的后续。
- 关系或知识状态的不可逆变化。
- 得到回答后暴露的更深问题。
- 必须履行的承诺或无法撤回的行动。

同时交付局部满足与下一步压力。不要用角色突然昏倒、无来源来客或截断一句普通话制造任意 cliffhanger。

## 7. 结构自审

完成草稿后先做结构审查，不先润色句子：

- 开篇是否承接上一章并迅速建立本章压力。
- 每个场景是否兑现 goal、turning_point、climax 和 exit_state。
- 段落与场景是否存在清楚的因果出口。
- 冲突是否升级，困难选择是否真实改变状态。
- 转场是否保留时间、空间和状态连续性。
- 类型承诺、情节线、关系或伏笔是否至少推进一项。
- 章末拉力是否来自本章结果。
- 删除任一场景或段落后，因果、人物或读者体验是否毫无损失。
- 字数是否集中在高价值选择，而非重复解释。

按位置记录 issue、severity、evidence、proposed_fix 和 impact。需要改变 outline、场景契约或结局时停止，转回相应流程；不要在正文层自行批准结构变化。

## 8. 人物自审

结构通过后检查：

- POV 的目标、动机和策略在每场清楚。
- 关键行动能回到 Want、Need、Wound、Lie、价值观或现实压力。
- 人物主动选择造成转折，不只是被巧合搬运。
- 情绪变化有刺激、解释和行为后果。
- 人物声音、称谓、习惯、能力和限制一致。
- knowledge_used_ids 与正文行动相符，没有提前知道事实。
- 关系变化有方向、原因和可观察表现。
- 伤势、疲劳、资源、物品和能力代价真实影响行为。

发现新人物历史、能力、秘密或关系事实时，只记录 proposal。不得为修正文稿便利而回写人物 Canon。

## 9. 语言初审

人物与结构通过后再处理：

- POV 漂移、叙述距离突变和时态不一致。
- 指代歧义、空间不清和动作先后混乱。
- 重复信息、空泛总结、套话、过度解释和无功能修饰。
- 句长与段长是否支持当前速度、压力和情绪。
- 对白归属、语气、潜台词和动作节拍。
- 词汇是否符合人物感知过滤器与作品语域。
- 重要信息是否因句法埋没，悬念是否因含糊而不公平。

语言初审只能提高可读性和声音一致性，不改变事件、关系、规则和人物决定。需要深度行文编辑时转交 novel-line-edit。

## 10. 写后事实与状态提取

完成三轮自审后，建立 post_draft_extraction：

- facts：新增或被正文明确确认的事实。
- events：发生的行动、因果、时间与地点。
- knowledge_changes：谁知道、怀疑、误信或验证了什么，来源是什么。
- relationship_changes：信任、好感、恐惧、义务、权力或秘密如何变化。
- item_changes：持有人、位置和状态变化。
- physical_and_resource_changes：伤势、疲劳、能力消耗、金钱和关键资源。
- rule_or_exception_requests：正文是否需要新增规则或例外。
- foreshadowing_changes：种植、推进、回收或放弃。
- continuity_warnings：与契约、Canon 或相邻章节的潜在冲突。

每条记录包含 source_scene_id、正文位置、affected_ids、proposal_status 和 author_action。没有现有 ID 时不要伪造。

正文不是 Canon 变更授权：

- 不因某句话已经写进正文，就把它晋升为 FACT-*、RULE-*、EVT-* 或其他 Canon。
- 与已批准场景契约一致的事件呈现仍需由正式实体和作者流程承接。
- 基础规则、历史、人物能力或 retcon 使用 Canon 变更请求。
- 草稿与 Canon 冲突时先标记正文问题，不自动修改 Canon 来迁就草稿。

## 11. Frontmatter 与验证

依据 schemas/manuscript.schema.json 检查 frontmatter：

- schema_version 与 content_version 是合法语义版本。
- id 是唯一 CHAPTER-*。
- document_type 固定为 chapter。
- novel_id 与目录和 manifest 一致。
- title、volume、chapter、status、visibility 和 summary 合法。
- word_count 等于正文实际字数。
- previous_chapter_id 与 next_chapter_id 只引用当前小说中真实存在的章节，未知时为 null。
- 不添加 Schema 未定义字段；updated_at 如填写则使用合法 date-time。

同时检查：

- 标题正文与 frontmatter title 一致。
- volume/chapter 位置不重复。
- Markdown 和 YAML frontmatter 可解析。
- status 在作者批准前保持 draft 或 revised；不得自行设为 locked 或 published。
- summary 概括本章决定性变化，不泄露未来章节。

从仓库根目录运行 npm run validate:story。当前验证器会检查 frontmatter Schema、小说归属、重复章节 ID、重复卷章位置和断裂的前后章链接。验证失败时修复本章合法问题；若错误来自外部文件，报告并停止，不顺手修改。

检查 Git diff，确认只修改授权章节及明确批准的附属 proposal 文件。除非用户明确要求，否则不要提交 Git。

## 12. 作者批准门禁

交付：

- 目标章节路径与 frontmatter 摘要。
- 实际 word_count 与目标范围差异。
- 连续性预检结果。
- 结构、人物和语言自审问题及处理。
- post_draft_extraction 全部 proposal。
- 验证命令、结果和 warnings。
- 尚需作者决定的结构、人物、世界或 Canon 问题。

作者可以要求修订、批准为下一流程输入或拒绝。只有作者明确授权且所有门禁通过后，才能把 status 更新为 locked；published 还需要发布流程。锁定章节不代表写后提取的事实自动成为 Canon。

未获得作者批准时，精确记录 stop_point、未决问题和下一步，不宣称章节完成。

## 输出格式

每次响应至少包含：

- novel_id、chapter_id、卷章位置、任务范围和当前阶段。
- 上下文预算、读取文件、事实 ID 与共享依赖。
- scene_lock 与 continuity_preflight。
- POV/distance 契约、目标字数和节奏计划。
- 草稿路径；未获写入授权时明确写“未落盘”。
- structural_review、character_review 和 language_review。
- post_draft_extraction。
- frontmatter_validation 与 workspace_validation。
- author_approval_required、stop_point 和 next_skill。

## 必须停止的情况

- 缺少 novel_id、chapter_id 或唯一目标文件。
- 注册表、目录、manifest、frontmatter 或场景 owner 不一致。
- 本章场景契约缺失、未批准、互相冲突或无法形成连续 entry/exit。
- 连续性预检存在 blocker。
- 需要读取未声明的其他小说或未锁定版本共享世界。
- 草稿必须新增/修改 Canon 才能成立。
- 请求跨越章节范围、重写未授权场景或静默更改 outline。
- 工作树存在与本章重叠的用户改动。
- frontmatter 或 npm run validate:story 失败。
- 当前作者门禁未通过。

停止时报告具体文件、ID、失败阶段、证据和最小解阻动作，不自行选择方便的故事版本。
