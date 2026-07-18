---
name: novel-reader-test
description: 对 Story OS 小说执行隔离隐藏设定的新读者盲测。用于逐章、章节区间或前三章测试，记录读者实际理解、可能误解、注意力流失、期待、情绪落点与章末继续意愿，并输出可定位的 fresh-reader 报告。必须显式绑定 novel_id、正文白名单、获准前置章节和版本基准；只能读取授权正文，不得读取隐藏 Canon、Story Bible、其他小说、未来章节、作者意图或既有审查答案。输出只属于 feedback/audit，不修改正文，也不得自动晋升 Canon。
---

# Novel Reader Test

把本 Skill 当作第一次接触作品的读者，而不是知道答案的编辑。只报告授权文本实际产生的理解和反应；不知道的内容保持不知道。

## 核心契约

- 在任何小说级读取前要求用户明确给出并确认 `novel_id`。不得用 `active_novel_id`、唯一候选、目录名或最近文件代替选择。
- 默认只读。不得修改正文、Canon、outline、场景契约、人物、世界规则、共享世界或阅读器数据。
- 只读取精确列入白名单的正文，以及作者明确批准的前置章节正文。不得读取其他小说或同一小说的未来章节。
- 不得读取 Canon、Story Bible、manifest 中的 premise/秘密、outline、scene contracts、研究、决策、作者注释、伏笔真义、未来摘要、既有编辑/盲测报告或答案表。
- 不用隐藏知识判断读者“应该懂什么”。把与事实冲突但由当前文本合理产生的理解标为 `possible_misunderstanding`，不要宣判作者设定错误。
- 把盲测结论视为一次读者反应样本，不伪装成统计结论，也不把个人口味冒充普遍规律。
- 输出属于 `feedback` 或 `audit`。即使反馈提出新解释或修改建议，也不得把它写成事实、proposal 或 Canon；作者是 Canon 的唯一批准者。

## 1. 建立盲测输入契约

开始前确认：

```text
novel_id
test_scope: single_chapter | chapter_range | opening_three
baseline: exact source version or named snapshot
authorized_chapters[]: chapter_id + exact file/packet path + reading order
allowed_prior_chapters[]: chapter_id + exact file/packet path
excluded_chapters[]
target_reader: optional audience description without story answers
test_questions[]: optional, phrased without revealing expected answers
report_destination: conversation or exact authorized feedback/report path
```

`authorized_chapters` 和 `allowed_prior_chapters` 构成唯一正文白名单。范围、顺序或基准缺失时请求最小确认，不要搜索仓库猜测目标。

优先使用已去除内部字段、带稳定段落锚点的盲测包。若只能读取章节源文件，只把获准正文与公开章名作为测试输入；不得把 frontmatter 中的 summary、未来链接、内部状态或其他元数据带入判断。需要另一流程准备安全输入包时先停止盲测，不要自行浏览内部资料。

### Gate A：隔离与未污染确认

在读取正文前回显 `novel_id`、基准、阅读顺序、正文白名单、明确排除项和报告位置，并检查当前测试上下文是否已接触以下任一内容：

- 目标小说的 Canon、outline、scene contracts、设计包、作者意图或伏笔答案。
- 白名单之外的章节、未来摘要、其他小说或跨书剧透。
- developmental、character、continuity、line-edit 或旧 reader-test 报告中的答案性结论。

若已经接触，当前上下文不能声称是盲测。停止并要求在新的干净上下文中运行，只传递输入契约、获准正文和无答案测试问题。不得靠“忽略刚才看到的内容”继续。

## 2. 严格限制读取

允许读取：

- 本 Skill 和适用的工作区操作规则。
- 输入契约中逐项列出的正文盲测包；没有盲测包时，仅限精确授权章节的公开章名和正文。
- 明确列入 `allowed_prior_chapters` 的前置章节正文。

禁止读取：

- `canon/`、`narrative/`、`research/`、`decisions/`、内部 `reports/`、既有 `feedback/`、设计文档和作者会话记录。
- 未授权 frontmatter 字段、下一章或更晚章节、未开放尾声、未来目录与剧透性搜索索引。
- 其他 `NOVEL-*` 目录；显式系列或共享世界关联也不构成盲测读取许可。
- Git 历史、diff、构建日志或验证器输出中可能出现的隐藏事实。

不要运行会扫描全项目并把内部错误或实体名带回上下文的命令。输入包的结构与权限验证应由盲测外的编排流程完成，并把无剧透的 pass/fail 结果传入。

读取按授权顺序单向进行。完成一章的即时记录后才能读取下一章；不得先读完整范围再伪造逐章首次反应。

## 3. 逐章记录首次反应

每章结束后、读取下一章前记录：

1. **发生了什么：**用读者自己的话复述行动、结果和当前局面，不引用内部术语答案。
2. **人物与目标：**当前认为谁重要、谁想要什么、阻力和代价是什么；不确定处明确标记。
3. **确信度：**把理解分为 `clear`、`tentative`、`confused`，说明文本依据。
4. **可能误解：**记录互相竞争的解释和读者为何选择其中一个；不要查答案。
5. **注意力曲线：**标出最投入和开始失去兴趣的位置、触发原因与恢复位置。
6. **情绪落点：**记录实际感到的情绪、强度 `0-5`、触发文本，以及预期但没有落地的情绪。
7. **开放问题与期待：**列出最想知道的三件事、当前预测和希望下一章兑现的承诺。
8. **继续意愿：**给出 `0-5` 分、最直接原因，以及“不继续时缺少的最小拉力”。
9. **章末钩子：**说明钩子来自新问题、危险、选择、关系变化还是信息揭示，并判断它是否由本章结果产生。

定向测试问题只能在自由复述完成后提问，避免问题本身教会读者答案。若问题包含作品真相或预期解释，标记 `leading_question` 并不把回答计为自然理解。

## 4. 使用稳定定位

每个理解障碍、注意力变化、情绪触发和章末判断都要定位。优先顺序：

1. 数据包提供的稳定段落锚点，例如 `CHAPTER-0001#p-0007`。
2. `chapter_id + heading + paragraph_index`。
3. `chapter_id + paragraph_index + 不超过 20 字的原文起始片段`。

不要只写“开头”“中间”“这里有点慢”。行号可以作为辅助，但不能作为唯一定位，因为正文编辑会改变行号。引用保持最短，只提供足以复核反应的触发片段。

为本次问题使用临时键 `RT-001`、`RT-002`；这不是永久实体 ID。每项至少包含：

```text
issue_key
chapter_id
locator
reaction_type: comprehension | possible_misunderstanding | attention | emotion | expectation | continuation
observed_reaction
textual_trigger
reader_impact
confidence: direct | inferred
severity: high | medium | low
revision_question
```

`revision_question` 只把反应转成作者可评估的问题，不直接规定修改方案。无法从授权正文验证的判断写成问题，不写成事实。

## 5. 汇总盲测报告

完成全部授权章节后按以下顺序输出：

1. `test_header`：novel_id、基准、范围、阅读顺序、目标读者、运行方式与时间。
2. `isolation_attestation`：实际读取清单、明确排除清单、上下文是否未污染、任何偏离。
3. `chapter_snapshots`：逐章首次复述、人物/目标、确信度、疑问、预测、情绪、注意力和继续意愿。
4. `comprehension_map`：读者认为已确认、暂定和仍困惑的内容；不得附作者层正确答案。
5. `localized_findings`：按影响排序的 `RT-*` 项，包含稳定定位和文本触发。
6. `expectation_ledger`：作品打开了哪些问题和承诺，读者预计何时得到何种回报。
7. `continuation_curve`：每章继续意愿及变化原因，说明最强和最弱拉力。
8. `coverage_limits`：未读章节、未回答问题、样本局限和不能支持的结论。
9. `author_review_required`：反馈仅供作者判断，不构成 Canon、事实确认或自动修订授权。
10. `stop_point`：测试结束位置、最后获准章节和禁止继续读取的边界。

### REVIEW record draft

默认只在对话中交付 `review_record_draft` YAML 块；只有用户明确授权写入精确路径，或明确授权“创建下一条审查记录”时，才写入 `novels/<NOVEL>/reports/reviews/REVIEW-*.yaml`。草稿必须兼容 `templates/workflow/review-record.yaml` 与 `schemas/review-record.schema.json`，使用 `review_type: reader_test`、`canon_effect: proposal_only`，只记录白名单正文 `scope`、`source_version.content_hash`、隔离声明、`coverage.gaps`、`findings[].key/severity/status`、`conclusion.verdict`、`author_decision.status` 和 `reverification.status`。不得顺带修改任何被测文件；不得把盲测反馈写入 Canon、proposal 或正文。

`coverage.gaps` 必须显式说明隐藏 Canon、大纲、未来章节和其他非白名单材料没有读取。盲测结论通常使用 `pass_with_notes` 或 `inconclusive`；只有被授权正文自身造成严重理解失败时才使用 `blocked`。如果任何门禁必需字段未知，尤其是 `source_version.content_hash`、精确 `chapter_ids` 或版本基线，把缺口写入 `coverage.gaps`，并说明该草稿在补齐前不能用于 `CHRUN.required_reviews`。不要编造 hash、ID、作者决定或批准状态。

```yaml
review_record_draft:
  id: REVIEW-0001
  record_type: review_record
  owner:
    novel_id: NOVEL-0001
  review_type: reader_test
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
    gaps:
      - "未读取隐藏 Canon、大纲、未来章节或非白名单材料。"
  findings:
    - key: RT-001
      severity: note
      status: open
      issue: "替换为本次盲测反馈；无问题时使用空数组。"
      recommendation: "记录需要作者判断或后续审查的最小动作。"
  conclusion:
    verdict: pass_with_notes
  author_decision:
    status: pending
    decision_id: null
  reverification:
    status: not_required
  resume_brief: "概括白名单范围、新读者理解、误解风险和下一步。"
```

### Gate B：交付前泄密审计

交付前逐项核对：

- 每个结论是否能仅由白名单正文推出。
- 是否出现未授权人名、实体 ID、未来事件、伏笔真义、作者意图或其他小说内容。
- 是否把“可能误解”改写成了作者层正确答案。
- 是否把旧报告观点或编辑建议伪装成首次反应。
- 是否把反馈写成 Canon、proposal、事实确认或修订指令。

任一项失败时，删除受污染结论并在 `isolation_attestation` 记录偏离；污染影响整体可信度时，作废本次运行并要求干净上下文重测。

## 必须停止的情况

- 缺少显式 `novel_id`、精确正文白名单、阅读顺序或版本基准。
- 当前上下文已经读取隐藏 Story Bible、未来章节、其他小说或答案性审查材料。
- 授权范围要求搜索仓库才能猜出，或输入包混入内部字段且无法安全剥离。
- 用户要求用隐藏 Canon 判断新读者是否“读对了”，或要求读取后文解释当前困惑。
- 报告需要跨越目标小说边界，或输出本身会泄露未授权秘密。
- 用户要求把反馈直接修改正文、写成 Canon、批准 retcon 或覆盖作者决定。
- 不能提供可复核定位，却要求给出确定性问题结论。

停止时给出失败门禁、已读取白名单、污染来源、仍可信的最小结果和重新运行所需的干净输入；不要继续浏览以“补证据”。

## 完成检查

- 已显式绑定 `novel_id`、基准、授权章节、获准前置章节和阅读顺序。
- 当前上下文未读取隐藏 Canon、其他小说、未来章节、作者意图或既有答案。
- 已按章先记录即时反应再读取下一章，没有用后文修正早期快照。
- 已回答理解、误解、失去兴趣、期待、情绪落点和章末继续意愿。
- 每个关键反应都有章节和稳定段落定位、最短触发证据与置信度。
- 已区分实际反应、推断、个人口味和不能由样本支持的结论。
- 交付前泄密审计通过，报告没有包含白名单外信息。
- 报告明确属于 feedback/audit，不修改正文，不创建或晋升 Canon，并记录精确停点。
