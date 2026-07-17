---
name: novel-worldbuilding
description: 为已选小说设计、比较、压力测试和收敛世界规则、制度、经济、技术、超自然系统、文化与地点 proposal。用于世界观搭建、规则漏洞检查、便利魔法修复、现实研究与虚构假设分离、信息披露规划或共享世界边界判断；必须显式绑定 novel_id，并在作者批准前保持非 Canon。
---

# Novel Worldbuilding

让世界规则持续制造选择、限制和后果。不要为了百科完整度扩张与故事无关的设定。

## 核心边界

- 先按 story-os-manager 绑定明确 novel_id；不得用 active_novel_id、最近文件或唯一候选静默代替。
- 把版本化源文件视为唯一事实源，区分 Canon、proposal、research 和 manuscript。
- 只读取当前小说与 manifest 显式声明、带版本的系列或共享世界依赖。
- 把所有新规则、事实、地点、制度和历史保持为 proposal。只有作者可以批准 Canon。
- 不在小说范围覆盖 UNIV-* 实体。共享世界修改必须转到对应 universe owner 并完成跨书影响审查。
- 不替 novel-premise 改变核心类型承诺，不替 novel-outline 重写结构，不替 novel-scene 写正式场景契约。

## 1. 绑定范围与上下文预算

1. 验证 novel_id 已注册，读取目标小说 manifest、已选 premise 和相关 outline 范围。
2. 从仓库根目录运行 npm run validate:story；报告会影响本次工作的归属、引用和 Schema 错误。
3. 检查工作树是否有与目标规则或世界记录重叠的用户改动。
4. 声明本次世界构建层级：单条规则、系统、制度、文化、地点、历史事件或披露方案。
5. 声明唯一目标文件；预计超过 3 个文件时先拆批。

默认上下文预算为：

- AGENTS.md、目标小说 manifest、已选 premise 和当前 outline 目标。
- 与问题直接相关的最多 8 个 RULE-*、FACT-*、LOC-*、FACTION-*、EVT-*、SCN-* 或作者决定。
- manifest 明确引用且当前问题确实需要的共享世界版本。

使用 rg 按 ID 和路径定位。列出已加载文件、实体 ID、依赖版本和排除范围。需要扩大预算时先说明新增内容、原因和数量；不要扫描整部小说或其他小说来“补全世界”。

输出启动契约：novel_id、故事需求、世界构建范围、上下文清单、预算、验证结果、拟修改文件和第一个作者门禁。

## 2. 从故事需求开始

先回答世界构建必须服务的具体问题：

- 哪个类型承诺需要这种规则或制度才能兑现？
- 哪个角色目标、困难选择或关系压力依赖它？
- 它要阻止什么容易的解法？
- 它会怎样升级冲突、改变资源或制造不可逆代价？
- 读者最早需要看到什么，最晚何时必须理解真实规则？
- 如果删除它，故事的因果、人物或读者体验会损失什么？

建立 need_map：

| story_need | world_lever | character_choice | visible_consequence | candidate_entities |
|---|---|---|---|---|

删除只提供装饰、不能改变人物行动或读者判断的条目。美学细节可以保留为氛围 proposal，但不要伪装成核心规则。

### Gate A：需求与范围

让作者确认 need_map、设计层级和必须保留/禁止的元素。未确认时只输出问题与候选方向，不扩写完整系统。

## 3. 设计规则 proposal

对每条规则至少填写与 templates/entities/rule.yaml 对齐的字段：

- statement：在什么条件下必然如何。
- scope：适用人物、地点、时期、资源和触发条件。
- limitations：不能做什么、何时失效、精度与规模边界。
- costs：触发、维持、扩张、失败或违反规则的资源、时间、身体、社会与叙事代价。
- exceptions：具体、稀少、可追踪的例外；说明谁知道、如何验证和为何不推翻规则。

额外分析但不要伪造成 Schema 字段：

- enforcement：谁执行或维护规则。
- detection：违规如何被发现，误判成本是什么。
- access：谁能使用，谁被排除。
- countermeasures：对手如何限制、绕过或反制。
- failure_modes：正常失败、灾难失败和缓慢失效。
- story_payoff：规则如何迫使角色选择，而不是替角色免费解题。

高影响规则至少提供 2 个方案，比较读者体验、冲突强度、世界后果、漏洞数量和制作成本。

## 4. 建立制度、经济、技术与超自然因果

不要分别写互不相干的百科条目。用因果链连接：

world_rule
→ scarce_resource_or_constraint
→ institution_and_incentive
→ winners_and_losers
→ culture_and_daily_behavior
→ conflict_and_event

### 制度

检查：

- authority：权力来自何处，谁承认其合法性。
- goal：制度声称目标与真实激励是否一致。
- methods：许可、惩罚、教育、垄断、仪式或暴力如何运作。
- resources：信息、人员、资金、技术或超自然资源从何而来。
- constraints：法律、传统、物流、腐败、能力和反对力量如何限制它。
- accountability：错误和滥权由谁承担代价。
- informal_system：家庭、黑市、行会、宗教或互助网络如何补位。

### 经济

检查：

- 什么真正稀缺，谁生产、控制、运输、保存和定价。
- 交易成本、劳动条件、税费、债务和风险由谁承担。
- 规则变化如何影响货币、阶层、黑市、保险、战争与迁移。
- 哪种套利最便宜，为什么没有无限复制或价格崩溃。
- 系统的外部性由谁看见、谁被迫承受。

### 技术或超自然系统

检查：

- capability：能稳定完成什么。
- prerequisite：知识、训练、血统、设备、地点或仪式要求。
- input_and_cost：能量、材料、时间、健康、记忆、社会身份或机会成本。
- scale_and_precision：距离、规模、速度、准确度和并发上限。
- failure_and_variance：失败表现、误差、污染和不可逆后果。
- maintenance_and_learning：维护、教育、传承与更新成本。
- countermeasure：如何侦测、防御、封锁和欺骗。
- distribution：谁先获益，谁被淘汰，权力如何重组。
- historical_consequence：若长期存在，战争、城市、职业和制度为何会变成现在这样。

如果系统强大却没有改变交通、通信、生产、医疗、战争或权力结构，必须解释原因；不能只写“人们习惯如此”。

### Gate B：系统方案

展示 2–3 个高影响设计方案及取舍。作者未选择时，不把任一方案当成既定世界事实。

## 5. 推导文化与日常可见后果

从已提出规则推导，而不是从风格标签堆砌：

- 家庭、亲属、婚姻、继承与照护。
- 身份、阶层、荣誉、禁忌、礼仪和污名。
- 工作、教育、医疗、法律、宗教与公共服务。
- 食物、服装、住宅、旅行、通信与时间感。
- 语言中的称谓、隐喻、委婉语和不能公开说的事。
- 儿童、老人、病弱者、边缘群体和外来者看到的不同世界。

为每项结果标明：

- cause_rule：由哪条规则或资源约束导致。
- beneficiary_and_burden：谁获益，谁承担代价。
- daily_visibility：普通人每天在哪个动作或场所看见它。
- plot_relevance：它会改变哪种选择、误解、冲突或线索。
- variation：地区、阶层、年龄、职业或时代如何不同。

区分逻辑后果和作者审美选择；审美选择可以保留，但不要声称它是规则必然推导。

## 6. 设计地点 proposal

当前没有独立 location 模板。按 canon-entity Schema 的 location 定义组织 proposal，不自行新增模板：

- name 与 aliases。
- parent_location_id：空间层级与归属。
- narrative_function：该地点在冲突、选择或披露中的作用。
- sensory_palette：光线、声音、气味、触感、温湿度、材质和空间尺度；每项尽量连接具体来源。
- constraints：通行、视线、距离、容量、危险、管制、资源、时间与社会规范。
- routes_and_thresholds：入口、出口、关卡、绕路和不可见边界。
- users_and_power：谁拥有、管理、居住、工作、监视或被排除。
- time_variation：昼夜、季节、事件前后如何改变。
- rule_imprint：哪些制度、经济或超自然规则在此可被直接感知。

不要只写“繁华”“神秘”“压抑”。把感官信息写成可观察细节，并说明它如何限制行动、误导判断或暴露权力关系。

## 7. 分离研究事实、假设与原创设定

维护 research_ledger：

- verified_fact：已核实事实、来源、访问日期、适用范围和 confidence。
- disputed_fact：存在分歧的事实及主要观点。
- assumption：当前推演暂用但未核实的前提。
- invention：明确为虚构的设计选择。
- analogy_limit：现实类比在哪些地方会失效。
- sensitivity_risk：可能误写文化、身份、创伤、医疗、法律或历史的风险。
- research_question：会改变规则、冲突或作者选择的具体问题。
- stop_condition：获得什么证据后停止研究并返回设计。

未核实资料保存在 research 或 proposal，不得创建 FACT-* Canon。需要深入检索时转交 novel-research，并明确所需来源质量。

## 8. 压力测试规则漏洞与便利魔法

对每条高影响规则执行红队测试：

1. 主角为何不能用它立刻解决核心冲突？
2. 对手为何不能更便宜、更早或更大规模地使用它？
3. 穷人、富人、机构、罪犯、专家、儿童和外来者会怎样利用或误用它？
4. 能否套利、无限复制、远程杀伤、秘密监控、快速运输或绕过稀缺性？
5. 多条规则组合后是否产生作者未预期的能力？
6. 例外是否比规则更常用，或只在剧情需要时出现？
7. 成本是否真的在关键时刻生效，且同样约束主角和反派？
8. 社会为何没有围绕最便宜的漏洞重组？

输出 loophole_table：

| exploit | cheapest_user | story_impact | proposed_patch | patch_cost | residual_risk |
|---|---|---|---|---|---|

不要用新增任意例外连续打补丁。若补丁造成更多例外、成本只惩罚无关角色或规则只能靠角色“忘记能力”维持，退回重设计。

### Gate C：压力测试

展示最危险漏洞、最弱限制、便利魔法风险和修订代价。作者未确认修订方向时保持多个 proposal。

## 9. 规划信息披露顺序

把三层信息分开：

- world_truth：世界内实际成立的规则和历史。
- character_knowledge：某角色知道、怀疑、误信或验证了什么。
- reader_exposure：读者在什么叙事位置看到证据、误导、解释和代价。

使用 event/scene 分离：

- EVT-* 记录世界内事件、story_time、地点、参与者、前因、后果和建立的事实。
- SCN-* 决定叙事顺序、POV、可见证据和知识变化。
- 不用事件发生顺序代替读者披露顺序，也不为尚未存在的实体伪造 ID。

为重要规则规划 reveal_ladder：

1. surface_behavior：先让读者看到日常可见后果。
2. working_model：角色形成可用但可能不完整的解释。
3. anomaly：出现无法被旧模型解释的证据。
4. test_and_cost：角色尝试规则并付出代价。
5. partial_explanation：只解释当前选择需要的部分。
6. deeper_truth_or_exception：在因果需要时揭示更深层机制。
7. payoff：知识改变高潮选择或重新解释旧证据。

优先用行动、制度摩擦、地点限制和失败后果披露，避免百科式说明。把剧透级真相保持 internal，并检查分享可见性。

### Gate D：披露顺序

让作者确认第一印象、误解边界、揭示节点和最终 payoff。需要正式场景设计时转交 novel-scene。

## 10. 守住共享世界边界

先判断正式 owner：

- 只服务一部小说、允许独立演化的规则使用 owner.novel_id。
- 被多部作品共同依赖且应保持同一事实的规则使用 owner.universe_id。
- 系列顺序或跨书剧透元数据属于 SERIES-*，不代替规则 Canon。

小说读取共享世界时：

- 只读取 manifest 中声明的 universe_id 和明确版本。
- 把共享世界内容视为只读依赖。
- 不复制共享实体到小说目录后分别修改。
- 小说特有的应用、误解或局部制度可以成为本地 proposal，但必须引用共享规则，不能覆盖同一 ID。

需要改变共享规则时，停止小说级写入，列出受影响小说、事件、人物知识、关系、伏笔和正文，转入共享世界范围的 novel-canon-change。

## 11. Proposal 写入与验证

默认在对话中交付 proposal。只有作者明确授权目标文件后才落盘：

1. 新规则复制 templates/entities/rule.yaml，不编辑模板本身。
2. 新事件需要记录世界内因果时复制 templates/entities/event.yaml；不要用事件文件填写读者披露顺序。
3. 地点、阵营和事实 proposal 必须符合当前 canon-entity Schema；没有模板时先确认目标路径和字段。
4. 填写真实 owner、来源引用和已有永久 ID；不得伪造 ID、作者批准、研究来源或验证证据。
5. 保持 status: proposed 与适当 visibility。作者允许写 proposal 不等于批准 Canon。
6. 修改已有 Canon 或共享世界时，使用 templates/governance/change-request.yaml 并转交 novel-canon-change。
7. 解析 YAML，运行 npm run validate:story，并检查 Git diff 是否只包含授权范围。

### Gate E：Proposal 落盘

向作者展示最终 proposal、风险、开放问题、目标路径和验证计划。没有明确写入授权时标记“未落盘”并停止。

## 输出格式

每次输出至少包含：

- novel_id、范围、上下文预算、读取文件和依赖版本。
- story_need_map。
- rule_proposals 与 system_causality。
- institutions_economy_technology_or_supernatural。
- culture_and_daily_consequences。
- location_proposals。
- research_ledger。
- loophole_and_convenience_magic_stress_test。
- information_reveal_ladder。
- shared_universe_boundary。
- author_gate、open_questions、stop_point 和 next_skill。
- 已写文件与验证证据；未获授权时明确写“未落盘”。

## 完成检查

- 是否绑定正确 novel_id，且没有读取无关小说。
- 是否每条规则都有 scope、limitations、costs 和 exceptions。
- 是否把制度、经济、技术或超自然能力连接到可观察因果与日常后果。
- 是否让地点感官细节同时承担行动约束或权力表达。
- 是否分开 verified facts、assumptions、inventions 和 Canon。
- 是否完成漏洞、套利、规模、组合能力和便利魔法压力测试。
- 是否分开 world truth、character knowledge 和 reader exposure。
- 是否守住小说、系列和共享世界 owner 边界。
- 是否保持 proposal，停在当前作者门禁，未自动晋升 Canon。
- 若获授权写入，是否解析文件、运行 npm run validate:story 并检查 diff。

验证失败、研究阻塞或作者未批准时，报告最小解阻动作，不宣称世界规则已经确定。

## 必须停止的情况

- 缺少 novel_id，或注册表、路径、manifest、owner 不一致。
- premise/outline 没有提供足够故事需求，继续只会产生无目的百科。
- 需要未声明的其他小说或未锁定版本的共享世界。
- 修改现有 Canon 或共享规则但没有变更请求与作者权限。
- 关键规则依赖未核实事实，且错误会改变核心冲突。
- 漏洞测试表明系统只能靠任意例外、免费能力或角色失忆维持。
- 当前 Gate 尚未获得作者确认。
- 请求跳过 proposal 直接写 Canon、正文或共享世界正式记录。

停止时给出具体文件、ID、失败门禁、风险和下一步，不自行选择方便的世界版本。
