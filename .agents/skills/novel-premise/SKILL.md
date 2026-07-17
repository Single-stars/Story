---
name: novel-premise
description: 设计、比较和收敛小说 premise、题材方向、类型承诺、目标读者、logline、主题问题、核心冲突与主角初始驱动力。用于新小说立项、比较多个灵感、在大纲前确认故事核心，或重做尚未批准的 premise；必须输出 3–5 个 proposal 并停在作者选择门禁。
---

# Novel Premise

生成可比较的故事核心方案，帮助作者做选择。不要在本流程中写大纲、正文或 Canon。

## 进入门禁

1. 先按 story-os-manager 绑定明确 novel_id。
2. 读取所选小说的 manifest.yaml；若小说尚未初始化，使用 templates/novel/manifest.yaml 理解目标字段，但不要替作者注册项目。
3. 只读取当前小说已批准的约束、作者明确提供的灵感和显式系列/共享世界依赖。
4. 复述本次修改范围和上下文预算。不得读取无关小说来寻找灵感。
5. 把已有 Canon、作者硬约束、偏好和待验证假设分开列出。

没有 novel_id、小说归属冲突或现有已批准 premise 的修改权限不明确时，停止并请求确认。

## 收集最小简报

优先从现有文件提取，缺失时一次只追问最影响方向的问题：

- 作者真正想探索的题材、情绪或矛盾。
- 主要类型、可接受的次要类型和目标读者。
- 预期篇幅、单本/系列/共享世界归属。
- 必须保留的元素与明确禁止的元素。
- 读者应稳定获得的体验，以及不能造成的错误期待。
- 现实、历史、职业、地域、科学或敏感议题的研究需求。

如果信息足以产生有意义差异，直接生成候选；不要为了填满表格追问低影响细节。

## 定义题材与类型承诺

在生成 premise 前先形成一份 proposal 级设计边界：

- primary_genre：作品主要兑现的类型体验。
- secondary_genres：真正参与冲突结构的次要类型，不把装饰元素当类型。
- target_readers：具体到阅读偏好、容忍节奏、情绪强度和必要内容提示。
- promises：读者持续能获得的核心体验。
- obligatory_moments：兑现类型承诺通常需要出现的场面或转折。
- false_promises_to_avoid：标题、开局或宣传不能暗示却无法兑现的体验。

把类型方法当诊断镜头，不要求机械套用固定节拍。

## 生成 3–5 个候选

始终生成 3–5 个实质不同的候选。差异至少落在两个高影响轴上，例如主角身份、核心目标、主要阻力、失败代价、叙事距离、类型混合或结局代价。不要用换名字、换地点或换反派制造伪差异。

为每个候选使用本地比较标签 PREM-A、PREM-B 等；这些不是永久实体 ID。

每个候选必须包含：

### Premise 核心

- working_title：便于讨论的临时名。
- one_sentence_premise：一句话完整故事核心。
- logline：主角、触发事件、目标、主要阻力和失败后果。
- theme_question：故事持续追问但不替读者预答的问题。
- core_conflict：外部冲突与内部冲突如何互相加压。
- conflict_engine：为什么这个矛盾能持续推动一部长篇，而不是只支撑一个点子。
- stakes_and_cost：失败代价、成功代价和不可逆损失。

推荐用以下逻辑检查 logline，但不要机械套句式：

当触发事件打破常态，具有明确矛盾的主角必须追求可观察目标，对抗能主动施压的阻力，否则将付出具体代价；外部行动同时逼迫其面对内部错误信念。

### 题材承诺与读者

- primary_genre 与 secondary_genres。
- target_readers。
- reader_promises。
- obligatory_moments。
- false_promises_to_avoid。
- tone_and_emotional_curve。

### 主角初判

只做初始假设，不创建正式人物 Canon：

- external_want：主角主动追求且可观察的目标。
- internal_need：主角真正需要学会、接受或改变的东西。
- wound：塑造其防御与选择的旧伤。
- lie：主角目前相信、并持续制造代价的错误信念。
- agency_test：主角如何主动选择，而不是只被事件拖行。
- pressure_link：外部冲突如何反复攻击 wound/lie，迫使 Want 与 Need 冲突。

标记这些字段为 proposed character hypotheses；后续交给 novel-character 深化。

### 研究与风险

- known_facts：只列已有可靠来源或当前 Canon 支持的事实。
- assumptions：尚未核实但候选依赖的假设。
- research_questions：需要查证的具体问题。
- research_depth：决定 premise 前必须研究、可在大纲前研究、可在写作时研究。
- sensitivity_notes：可能涉及身份、创伤、文化、法律、医疗或伦理误读的部分。
- counterintuitive_move：候选如何以反直觉选择增强主题、因果或读者体验。
- homogeneity_risk：与同类常见作品过度相似的结构、卖点或人物组合。
- sustainability_risk：噱头是否只能维持开局，冲突引擎能否支撑目标篇幅。

## 控制研究边界

- 只研究会改变 premise 选择的高影响问题；低影响细节留到大纲或章节阶段。
- 为每个研究问题写明用途、期望来源类型和停止条件。
- 把未核实资料保存在 research 或候选 assumptions 中，不得写入 Canon。
- 比较同类作品时只抽象类型承诺、受众期待、结构风险和市场同质化，不复制受保护的表达、角色组合、独特设定或情节链。
- 不用“市场流行”代替作者目标；说明趋势证据的日期、范围与不确定性。
- 研究不足以支持关键前提时，把候选标为 blocked_by_research，不用合理想象补齐事实。

需要专门检索时转交 novel-research，并保持当前候选为 proposal。

## 检查反直觉与同质化

对每个候选逐项判断：

- 是否只是熟悉套路换皮。
- 类型混合是否真正改变选择与代价，还是只叠加标签。
- 反套路是否服务于因果、人物和主题，还是为了惊讶而任意逆转。
- 主角是否拥有主动目标和困难选择。
- antagonist/opposition 是否能持续升级，而非只靠误会拖延。
- 主题问题是否能由行动检验，而非只靠对白讨论。
- 核心卖点是否在开局后仍能产生新局面。
- 读者承诺是否与结局代价和情绪曲线一致。

把风险写成具体失效时刻，例如“第三幕只能重复逃亡”或“主角成功不需要放弃错误信念”，不要只写“可能俗套”。

## 建立选择矩阵

先允许作者调整权重，再按 1–5 分评分并给出一句证据。默认权重：

| 维度 | 权重 |
|---|---:|
| 类型承诺与目标读者清晰度 | 20 |
| 核心冲突引擎与因果持续性 | 20 |
| 主角能动性及 Want/Need 张力 | 15 |
| 长篇可持续性与升级空间 | 15 |
| 差异化且非任意反套路 | 10 |
| 主题问题的行动检验潜力 | 10 |
| 研究与制作可行性 | 10 |

计算加权结果，但不要把最高分自动当成答案。另列：

- strongest_reason_to_choose
- strongest_reason_to_reject
- hidden_tradeoff
- research_blocker
- best_fit_if：该候选最适合作者真正重视什么

推荐一个方向时必须说明判断依据和牺牲项，并明确推荐不等于作者批准。

## 收敛与作者选择

按以下顺序展示结果：

1. 已确认约束与未确认假设。
2. 3–5 个候选卡。
3. 选择矩阵与证据。
4. 反直觉、同质化和研究风险比较。
5. 非约束性推荐。
6. 明确询问作者选择 PREM-A/B/C，要求修改候选，或要求生成有限的混合方案。

不要自行合并候选。作者要求混合时，说明哪些承诺、冲突引擎和代价被保留或牺牲，最多再提供 2 个混合 proposal。

在作者明确选择前停止，不更新 manifest，不写 outline，不创建设定或人物 Canon。

## 选择后的写入边界

作者明确选择后：

1. 回显选择、理由和仍待研究的假设。
2. 只在作者明确授权写文件时更新当前小说 manifest 的 genre 和 premise 字段。
3. 把 premise.status 设为 approved 仅视为作者批准的项目方向，不代表候选中的人物、世界规则或事实已成为 Canon。
4. 保留决定记录或引用；没有作者选择证据时保持 proposed。
5. 把选定方案的 reader promise、theme question、core conflict 和 ending cost 映射到 templates/narrative/outline.yaml 的 objective，随后转交 novel-outline。
6. 不在本 Skill 中填写 causal_spine、chapter_plan、正式人物实体或正文。

任何新增基础事实仍须走 proposal 或 novel-canon-change。

## 输出格式

输出至少包含：

- novel_id、任务范围、来源文件和上下文预算。
- design_constraints。
- 3–5 个完整候选。
- selection_matrix。
- research_questions 与 blocked_by_research。
- counterintuitive_and_homogeneity_risks。
- non_binding_recommendation。
- author_choice_required。
- stop_point 与 next_skill。

只在用户授权时写入文件；否则在对话中交付 proposal。

## 完成检查

- 是否已绑定正确 novel_id，且未加载无关小说。
- 是否生成恰好 3–5 个实质不同的候选。
- 每个候选是否覆盖题材承诺、目标读者、logline、主题问题、核心冲突和 Want/Need/Wound/Lie 初判。
- 是否区分已知事实、研究假设和 Canon。
- 是否具体说明反直觉设计、同质化风险和长篇可持续性。
- 选择矩阵是否有权重、分数证据和隐藏取舍。
- 是否停在作者选择门禁，没有自动定案或写入 Canon。
- 若获授权写入，是否只改当前小说的目标字段并运行 npm run validate:story。

验证失败或作者未选择时，报告下一步，不宣称 premise 已确定。
