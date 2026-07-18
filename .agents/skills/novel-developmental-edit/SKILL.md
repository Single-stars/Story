---
name: novel-developmental-edit
description: 对 Story OS 小说进行从全书、卷幕到章节的结构编辑与发展性审查。用于诊断类型承诺、因果主链、主角能动性与人物弧、冲突升级、悬念和信息差、支线价值、节奏重复、高潮代价与结局兑现，或在大修前形成证据化问题单、方案 A/B、取舍和修订顺序。必须显式绑定 novel_id、范围、版本基准和上下文预算，先验证并取得作者门禁批准；默认只输出审查 proposal，不做行文润色，不自动修改 Canon、场景契约或正文。需要无 Story Bible 的新读者视角时转交 novel-reader-test。
---

# Novel Developmental Edit

从高杠杆的故事承诺和因果结构开始，再下钻到人物弧、情节线与章节功能。证明问题、解释读者影响并提供可选择的修订路径；不要直接替作者重写作品。

## 核心契约

- 在任何小说级读取前要求用户明确给出并确认 `novel_id`。不得用 `active_novel_id`、唯一候选或最近文件代替选择。
- 默认只读。不得修改 Canon、outline、场景契约、章节正文、共享世界或派生物；即使修复看似明显，也只输出 proposal。
- 把版本化源文件视为唯一事实源，区分 Canon、proposal、research、narrative、manuscript 和 feedback。
- 只读取当前小说及 manifest 显式引用的系列/共享世界版本；不得把其他小说当作隐式比较样本。
- 先处理结构、人物与连续性，再考虑语言。句法、措辞、对白润色和局部文风问题转交 `novel-line-edit`。
- 不把隐藏 Story Bible、作者意图和伏笔答案混入“新读者反应”。需要无背景读者测试时转交 `novel-reader-test`，本 Skill 不伪装成新读者。
- 作者选择修订方向后，把实施分别路由到 `novel-outline`、`novel-scene`、`novel-chapter`、`novel-character`、`novel-worldbuilding`、`novel-continuity` 或 `novel-canon-change`。

## 1. 绑定范围、基准与验证

1. 按 `story-os-manager` 核对工作区注册、小说目录与 manifest 的 `novel_id` 一致。
2. 确认审查范围：全书、卷、幕、章节区间、单章结构，或某个专项问题。
3. 确认版本基准：当前源文件、指定提交/版本或作者批准的基线；不要混用历史版本。
4. 确认目标：首次诊断、修订方案比较、既有大纲与正文偏差审查，或大修后的复验。
5. 检查工作树中与审查范围重叠的未提交改动，说明它们是否属于基准。
6. 从仓库根目录运行 `npm run validate:story`；Windows PowerShell 入口受限时使用 `npm.cmd run validate:story`。
7. 保留验证器原始错误码、文件和实体 ID。结构错误使依赖字段不可信时标为 `blocked_by_validation`，不要用推测补齐。

启动输出至少包含：`novel_id`、范围、基准、审查目标、上下文预算、验证结果、拟读取文件/ID、明确排除项和第一个作者门禁。

### Gate A：范围与权限

回显 `novel_id`、范围、基准和输出形式。范围或基准缺失时请求最小确认；未确认前不要扩大读取。

## 2. 控制上下文预算

按从宏观到局部的依赖层加载：

### 宏观层

- 小说 manifest、premise、主题问题、类型承诺和目标读者。
- 当前 outline 的目标、结构节点、因果脊柱和章节计划。
- 主要人物弧、`THREAD-*`、`FORESH-*` 与关键世界限制。
- 结局、高潮和开局对应的已批准设计或正文范围。

### 中观层

- 当前卷幕或章节区间的 scene contracts、事件链与关系/知识变化。
- 与专项问题直接相关的作者决定、连续性报告和反馈。
- 关键前后章节的入口、决定性变化和出口。

### 局部层

- 仅为证明问题所需的章节段落、相邻场景和受影响实体。
- 方案波及的直接依赖，不默认加载整部正文。

使用 `rg` 按 ID、章节和结构节点精确定位。维护上下文清单与预算余量；需要扩展时先说明新增文件/ID、原因和预计数量。全书审查可以分批取样并逐步扩展，但必须列出覆盖范围和未覆盖章节，不能用局部样本宣称全书结论。

### Gate B：证据覆盖

在正式下结论前展示已读取范围、证据缺口和可支持的结论层级。作者若要求扩大范围，更新预算后再继续。

## 3. 从宏观到章节诊断

严格按以下顺序检查；上层问题未澄清时，不急于修局部章节。

### 3.1 类型承诺与故事合同

- 开局是否尽早建立主要类型、核心异常、人物欲望和风险问题。
- 中段是否持续提供读者为该类型进入故事时期待的升级、必要场面和情绪回报。
- 宣传性 premise、主题问题、实际主线和结局是否属于同一本书。
- 有意延迟类型回报时，是否提供等价张力和明确兑现计划。
- 结局是否回答开局承诺，而非在最后更换故事类型或主要问题。

### 3.2 因果主链

- 相邻结构节点能否用“因为 / 所以”连接，而不是只有“然后”。
- 主角行动是否造成后果，后果是否生成下一压力；巧合可以制造麻烦，不能持续解决核心问题。
- 转折是否改变目标、策略、关系、资源、信息或代价。
- 主线是否存在缺失前因、无成本捷径、反派失去行动能力或高潮前临时规则。
- 新能力或新概念是否由当前目标触发；没有目标、假设、风险和停止条件的能力测试，视为规范泄漏而非人物行动。
- 场景与章节删除后，核心因果是否毫无损失；无损则考虑合并、压缩或删除。

### 3.3 主角能动性与人物弧

- 主角是否提出目标、选择策略、承担代价并造成关键转折，而不是被线索和配角搬运。
- 关键行动能否回到 Want、Need、Wound、Lie、价值观或现实压力。
- 内部变化是否通过越来越困难的选择体现，不只靠旁白总结。
- 最低点是否来自此前选择的累积后果；高潮是否要求主角以新的理解行动。
- 结局状态是否回应人物弧，且成长不等于伤痛、责任和代价被抹除。

### 3.4 冲突升级

- 阻力是否在能力、信息、关系、时间、资源或道德代价上升级，而非只增加人数和音量。
- 每次失败或局部成功是否改变下一步条件。
- 对手是否有持续目标、资源、限制与反应，不在作者需要时才出现。
- 中段是否出现策略变化、关系重组或目标重定义，避免重复同一种追逐/调查/争吵。
- 危机是否提供真实互斥代价，高潮是否是行动而非外力替角色决定。

### 3.5 悬念、谜团与信息差

- 区分 world truth、character knowledge 和 reader exposure。
- 每个主要问题何时打开、部分回答、重新定义和回收；回答是否产生更具体的新问题。
- 信息隐瞒是否来自 POV、权限、误解或现实阻力，而非角色故意不想必然会想到的事。
- 线索是否公平支持答案，同时保留竞争解释；反转后前文能否重新解释。
- 新概念是否先以现象、材质、使用痕迹和人物反应显影，名称是否被错误地写成官方答案或功能指示。
- 人物是否依据尚未学会的知识行动，读者是否提前看到高于当前权限的真相。
- 悬念是否转化为选择与代价，而不是无限拖延答案。

### 3.6 支线价值

- 每条支线是否推进主线压力、人物弧、关系、主题、世界限制或类型体验中的至少一项。
- 支线与主线交叉时是否改变资源、信息、关系或选择条件。
- 支线是否拥有明确 dramatic question、升级和解决/放弃状态。
- 删除支线后主线是否更清楚且无损；若是，考虑删除或融合。
- 支线高潮是否抢走主角的主线选择，或在结局前留下未处理的读者承诺。
- 角色的作者侧职责是否被误写成对白标签；正常对白不能为了凸显敏锐、神秘或观察力而替角色自我说明。

### 3.7 节奏与重复

- 高价值选择、转折、关系变化和揭示是否获得足够篇幅；重复解释和无变化往返是否过长。
- 连续章节是否重复同一目标、阻力、情绪落点、揭示模式或章末钩子。
- 压力与恢复是否有节律，Sequel 是否真正产生 dilemma 和 decision，而非停滞。
- 转场、调查过程和背景说明是否改变行动条件；没有变化的内容应压缩。
- 章节长度差异是否服务功能和情绪，不把统一字数当结构质量。

### 3.8 高潮代价与结局兑现

- 高潮是否解决核心因果链，由主角基于人物弧作出不可撤销选择。
- 选择是否支付前文承诺的现实、关系、道德或资源代价。
- 反派失败是否来自已建立的限制和主角行动，而非突然失误或新能力。
- 主要类型问题、人物弧、关键关系、主线和重要伏笔是否获得相称回收。
- Resolution 是否展示选择造成的新状态，不用解释性尾声抹平代价。
- 开局 premise 与主题问题是否在结局中被行动回答，而非口号回答。

## 4. 建立章节功能矩阵

对目标章节逐章记录：

```text
chapter_id / volume / chapter
entry_pressure
chapter_goal_or_function
protagonist_or_pov_choice
decisive_change
exit_hook
threads_advanced[]
character_or_relationship_advanced[]
foreshadowing_advanced[]
genre_promise_delivered
repetition_or_pacing_risk
deletion_impact
evidence_refs[]
```

检查上一章出口是否造成下一章入口；章节内部场景是否共同服务一个决定性变化；章末拉力是否由本章结果产生。正文与 outline 或 scene contract 不一致时并列证据，不自动宣布某一层为真。

## 5. 形成证据化问题单

为每个问题分配本次审查键 `DEV-001`、`DEV-002`；这不是永久实体 ID。每项至少包含：

```text
issue_key
severity: blocker | high | medium | low
confidence: confirmed | probable | needs_evidence
category
claim
evidence[]: path + line/field + entity_id + observed_state
reader_impact
affected_ids[]
root_cause
option_a: change + benefit + cost + ripple_effects
option_b: change + benefit + cost + ripple_effects
recommended_tradeoff
author_decision_required
verification_after_revision[]
blocked_by[]
```

严重度定义：

- `blocker`：范围/权限/验证问题使诊断不可信，或结构基础互相排斥，无法安全修订。
- `high`：破坏主要类型承诺、核心因果、主角高潮选择、谜题公平性或结局兑现。
- `medium`：局部人物弧、支线、节奏、重复或章节功能显著削弱体验，但不推翻整本结构。
- `low`：当前不改变理解，但增加维护成本、轻微拖慢节奏或缺少结构证据。

把同一根因造成的多个症状合并，并列出全部受影响 ID。证据不足时降低 confidence 或列入 coverage gaps，不用肯定语气。方案 A/B 必须是可执行的真实取舍；不要把“全部重写”和“什么都不做”伪装成两个方案。

可以给出有依据的推荐，但作者负责选择。建议不得自动应用到大纲、场景、正文或 Canon。

## 6. 安排修订顺序

按依赖和杠杆排序，不按发现顺序堆清单：

1. 先解决验证、权限、范围和版本基准 blocker。
2. 锁定 premise、类型承诺、主题问题和结局合同。
3. 调整高潮选择与结局代价，明确故事要去哪里。
4. 修复因果主链、主要转折和冲突升级。
5. 对齐主角能动性、人物弧和关键关系。
6. 处理悬念/信息差、支线取舍和伏笔回收。
7. 重排、合并、拆分或压缩章节与场景。
8. 运行 `novel-continuity` 复核时间、知识、物品、关系和共享世界影响。
9. 最后才交给 `novel-line-edit` 做语言层处理，避免润色将被删除的段落。

为每个修订批次列出依赖问题、目标文件层、受影响 ID、预期收益、回滚点和复验方式。高影响 Canon 或 retcon 需求单独转交 `novel-canon-change`，不要混入正文修订批次。

### Gate C：修订方向批准

向作者提交按优先级排序的问题、方案 A/B、推荐取舍和波及范围。作者未选择方向前，停在审查报告；不要代替作者启动重写。

## 7. 路由实施与复验

作者批准方向后只给出路由，不在本 Skill 内实施：

- premise、全书/卷幕结构、章节计划：`novel-outline`。
- 场景职责、POV、因果链、状态变化：`novel-scene`。
- 指定章节正文修订：`novel-chapter`。
- 人物弧、关系与人物模型：`novel-character`。
- 世界规则与系统限制：`novel-worldbuilding`。
- 时间、知识、物品、伤势、关系、伏笔一致性：`novel-continuity`。
- Canon、规则、历史或 retcon：`novel-canon-change`。
- 句法、措辞、声音与对白：`novel-line-edit`。
- 不读取 Story Bible 的理解、投入度和章末继续意愿：`novel-reader-test`。

修订完成后，用同一范围、基准定义和问题键复验。报告 resolved、partially_resolved、unchanged、regressed 和新增波及；不要因文字变多就判定结构改善。

## 8. 输出与停点

### REVIEW record draft

默认只在对话中交付 `review_record_draft` YAML 块；只有用户明确授权写入精确路径，或明确授权“创建下一条审查记录”时，才写入 `novels/<NOVEL>/reports/reviews/REVIEW-*.yaml`。草稿必须兼容 `templates/workflow/review-record.yaml` 与 `schemas/review-record.schema.json`，使用 `review_type: developmental_edit`、`canon_effect: proposal_only`，记录 `scope`、`source_version.content_hash`、`coverage.gaps`、`findings[].key/severity/status`、`conclusion.verdict`、`author_decision.status`、`reverification.status`、修订顺序和作者待决项。仍不得修改被审查源文件；报告落盘也不授权修改大纲、场景、章节或 Canon。

如果任何门禁必需字段未知，尤其是 `source_version.content_hash`、精确 `chapter_ids` 或版本基线，把缺口写入 `coverage.gaps`，并说明该草稿在补齐前不能用于 `CHRUN.required_reviews`。不要编造 hash、ID、作者决定或批准状态。

```yaml
review_record_draft:
  id: REVIEW-0001
  record_type: review_record
  owner:
    novel_id: NOVEL-0001
  review_type: developmental_edit
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
    - key: DEV-001
      severity: note
      status: open
      issue: "替换为本次结构审查发现；无问题时使用空数组。"
      recommendation: "记录结构修订顺序、取舍或复验建议。"
  conclusion:
    verdict: pass_with_notes
  author_decision:
    status: pending
    decision_id: null
  reverification:
    status: not_required
  resume_brief: "概括审查范围、主链结论、修订顺序和下一步。"
```

按顺序输出：

1. `review_header`：novel_id、范围、基准、目标、验证命令和上下文预算。
2. `coverage`：已读取文件/ID、取样方法、排除范围和证据缺口。
3. `macro_findings`：类型承诺、因果、人物弧、冲突、悬念、支线、节奏和结局。
4. `chapter_matrix`：目标章节功能与重复/删除判断。
5. `issues_by_severity`：证据、读者影响、affected IDs、方案 A/B 与取舍。
6. `revision_order`：按依赖分批的建议顺序、目标层和复验方式。
7. `author_decisions_required`：互斥方向和不可逆影响。
8. `stop_point`：完成位置、未读取范围、下一步路由和剩余门禁。

## 必须停止的情况

- 缺少明确 `novel_id`、范围或版本基准。
- 注册表、目录、manifest、owner 或共享世界版本不一致。
- 文件无法解析或验证错误使相关结构不可信。
- 需要无边界扩展上下文才能支持结论。
- 用户要求把 proposal 当 Canon、自动选择冲突版本或直接重写源文件。
- 请求在结构审查中顺带做行文润色。
- 请求把读取 Story Bible 后的判断冒充新读者反应。
- 目标范围有未确认的重叠改动，或作者尚未选择高影响修订方向。

停止时给出具体文件、ID、失败门禁、已完成检查和最小解阻动作；不要自行选择最方便的故事版本。

## 完成检查

- 已绑定 `novel_id`、范围、基准、目标和上下文预算。
- 已记录验证结果、覆盖范围和未读取部分。
- 已按宏观到章节顺序检查八个诊断维度。
- 每个问题都有证据、严重度、reader impact、affected IDs、方案 A/B、取舍和复验方法。
- 已给出按依赖排序的修订批次，而不是按发现顺序罗列。
- 已把正文、场景、大纲、Canon、行文和新读者测试路由到正确 Skill。
- 没有修改 Canon、outline、场景契约、正文、共享世界或派生物；已记录精确停点且未提交 Git。
