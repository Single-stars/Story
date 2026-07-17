# Task Plan: Story OS 长期小说开发系统（B 方案）

## Goal

在 `D:\Story` 和 GitHub 仓库 `Single-stars/Story` 中建立一套可持续一至两年甚至更久、可同时推进多部小说的开发系统：纯文本文件保存唯一事实源，Git 保存完整历史，自动验证防止设定漂移，AI 按作品和任务构建受控上下文，移动端网页负责安全阅读、筛选与反馈。

## Current Phase

当前实际进度为：基础地基与项目内 Skill 套件已完成，Phase 7 移动阅读器已有可构建 PWA 基础；`NOVEL-0001` 与 `NOVEL-0002` 已注册，并已各自拥有 3 章 `revised` / `reader` 示例稿用于验证阅读器切书、切章和阅读体验。两书仍没有正式 Canon 实体、正式场景契约或作者批准决策记录；示例正文事实不得自动晋升 Canon。

## Sample Reader Checkpoint: 2026-07-17 09:15 +08:00

- 当前分支：`codex/story-os-reader-samples`。基线提交仍为 `3ae6a04 Initialize Story OS workspace`；本轮尚未提交。
- 已将 `NOVEL-0001`《死亡账户》和 `NOVEL-0002`《六百里夜驿》的 manifest 从占位状态更新为可起草状态，并记录前三章 reader 示例稿存在。
- 已新增两书各三章 manuscript Markdown：`CHAPTER-0001` 至 `CHAPTER-0003`，状态为 `revised`，可见性为 `reader`，章节前后链接完整。
- 未新增或修改 `canon/` 实体；本轮正文仅为示例阅读稿和后续审查输入，不构成作者批准 Canon。
- Reader app 已确认样式通过 `import "./styles.css"` 接入，生产构建包含 CSS asset。
- 当前验证证据：`npm.cmd run verify` PASS，14 files / 81 tests，`validate:story` PASS，2 novels / 0 entities / 6 chapters；`npm.cmd run build:reader-data -- --profile reader --output .generated/reader/library.json` PASS，2 books；`npm.cmd run build:reader-app` PASS；`npm.cmd audit --json` PASS，0 vulnerabilities；`git diff --check` PASS。
- Playwright 浏览器 smoke test 已通过：移动端章节渲染、桌面书架、切书、下一章、目录跳章；测试过程中发现并修复 lucide 图标 `toSvg is not a function` 运行时问题。

以下 2026-07-17 08:25 checkpoint 保留为历史记录，其中“GitHub 为空”“0 chapters”“ready_for_initial_git_push”等内容已被本 checkpoint 和实际 GitHub 状态覆盖。

## Push Checkpoint: 2026-07-17 08:25 +08:00

- Git 身份已在本仓库配置为 `Single-stars <xxqxjd@gmail.com>`。
- GitHub 仓库 `https://github.com/Single-stars/Story.git` 当前仍为空，因为本地此前没有 commit/push；本检查点完成后允许进行首次提交和推送。
- 已新增并验证移动阅读器 `main.ts`、Vite 构建配置、reader data 注入、PWA 图标存在性测试和第三方图标来源说明。
- 已用 Vite 构建 `.generated/mobile-reader`，并用浏览器在 320px 与桌面视口检查空书架状态：无横向溢出、图标可加载、无控制台 error/warning。
- 当前 `workspace/manifest.yaml` 注册两部小说：`NOVEL-0001 death-account` 与 `NOVEL-0002 six-hundred-li-night-relay`；它们仍只有初始化 manifest，尚无章节、Canon 实体或 reader 可见正文。
- 全量验证证据：`npm.cmd run typecheck` PASS；`npm.cmd test` PASS，13 files / 80 tests；`npm.cmd run validate:story` PASS，2 novels / 0 entities / 0 chapters；`npm.cmd run build:reader-app` PASS；`npm.cmd audit --json` PASS，0 vulnerabilities；`git diff --check` PASS。

## Resume Checkpoint: 2026-07-16 22:09 +08:00

本节是下一次接续的当前事实源；下方最初的 Phase 勾选表保留为历史规划，尚未逐项回填，不得据此重做已经完成的地基。

### 已完成且已验证

- 工作区、小说、Canon/叙事实体、章节 Schema，以及多小说隔离、引用、时间/地点、物品、知识、伏笔、共享世界和章节链验证器。
- 小说 scaffolder、最小上下文 builder、profile 裁剪 reader data builder、reader core。
- 13 个项目内 Skill：`story-os-manager`、premise、outline、character、worldbuilding、scene、chapter、continuity、developmental-edit、line-edit、reader-test、research、canon-change；新增 Skill 已通过独立前向门禁测试。
- 缺失的 location/faction/item/fact/knowledge/thread/foreshadowing、research、feedback 模板；9/9 模板测试通过。
- Vite 已从有高危公告的旧 7.x 升级到 `7.3.6`；新增 `lucide` 后 `npm audit` 仍为 0 漏洞。
- A 阶段最后一次完整回归：12 个测试文件、66 个测试全部通过；`typecheck`、`validate:story`、`git diff --check` 通过。

### 移动阅读器精确停止点

- 已完成：`reader-core.ts` 的四主题、两字体和无正文泄漏反馈导出；其 12/12 单测通过。
- 已新增：`index.html`、`styles.css`、`public/manifest.webmanifest`、`public/sw.js`。
- 已新增测试：`tests/mobile-reader/app-shell.test.ts`；暂停时定向结果为 17 项中 16 通过、1 失败。
- 唯一当前定向失败：`app/mobile-reader/src/main.ts` 不存在。负责该文件的子代理已被明确中断，且没有留下部分文件。
- 仍缺：`main.ts`、192/512 PNG 图标、Vite 构建配置/脚本、从 `.generated/reader/library.json` 注入静态构建的步骤、浏览器手机视口验收。
- 内置 `imagegen` 工具在当前会话不可用；不得静默改用需要 API key 的 CLI。图标可在恢复后使用可审计的本地位图生成方案，或在内置工具可用时生成。

### 恢复顺序

1. 读取 `AGENTS.md`、`README.md`、`workspace/manifest.yaml`、本检查点和 `progress.md` 的最新段落；精确检查 `git status`，绝不 reset/clean/recreate。
2. 确认 Git `user.name`/`user.email` 仍为空时继续禁止提交或推送。
3. 运行 `npm.cmd audit --json`、`npm.cmd run typecheck`、`npm.cmd test`、`npm.cmd run validate:story`、`git diff --check`。在 `main.ts` 创建前，全量测试预期只因 app-shell 的该缺文件用例失败。
4. 只新增 `app/mobile-reader/src/main.ts`，实现书架/切书/目录/切章、每书进度、设置、搜索、深链、两步分享、显式离线保存、反馈 JSON 导出、空/错状态和键盘/读屏基线；先让现有失败测试转绿。
5. 分批补图标和 Vite 构建配置，生成 reader library，运行 build，再用 in-app Browser 在 320px 与常见手机视口真实点击和截图检查。
6. 完成阅读器基础后，才使用 `createNovel` 依次创建明确的 `NOVEL-0001 death-account` 与 `NOVEL-0002 six-hundred-li-night-relay`；所有设计资产保持 proposed，作者仍独占 Canon 审批。
7. 再执行两书各前三章、分阶段审查、盲测、reader/public 隐私构建、CI/恢复文档和最终全量验证。

### 持续门禁

- `workspace/manifest.yaml` 目前仍是 `active_novel_id: null`、`novels: []`；不得猜测小说。
- 文件是唯一事实源；网页、library、缓存和 `.generated/` 都是可重建派生物。
- 不得把设计、研究、反馈或正文提取的新事实静默晋升为 Canon。
- 当前仓库没有提交，工作树包含大量用户/前序线程未提交内容；全部必须保留。

## Non-Negotiable Quality Bar

- 小说资产必须可脱离任何单一 AI、云服务或写作软件独立存在。
- Canon（正式设定）只能由作者批准，AI、网页和评论不能静默修改。
- 人物、地点、事件、场景、关系、事实、伏笔等对象必须有永久 ID。
- 故事内时间与读者看到的叙事顺序必须分开记录。
- 人物知识、错误认知、关系变化、物品位置和伤势状态必须可追踪。
- 每个阶段必须有自动验证、人工验收和清晰的回滚路径。
- 每个实施批次控制在 8 个文件以内；结构改动和行为改动尽量分开提交。
- 手机分享不得泄露未授权的正文、剧透、私人研究资料或 API 密钥。
- 生成文件、缓存和网页索引永远不是事实源，必须可以从 Canon 重建。
- 所有关键流程都要能由疲惫状态下的人按文档完成，不能依赖“记得怎么做”。

## Architecture Summary

```text
                         AUTHOR AUTHORITY
                               |
                    approve / reject / retcon
                               v
+------------------+     +---------------------+     +-------------------+
| Ideas / Research | --> | Change Proposals    | --> | Canon Source Files|
| AI Suggestions   |     | feedback + reviews  |     | Markdown + YAML   |
+------------------+     +---------------------+     +---------+---------+
                                                               |
                                      validate references/state/time/ACL
                                                               v
                                                    +----------+----------+
                                                    | Validation Pipeline |
                                                    | schema + semantics  |
                                                    +----+------------+---+
                                                         |            |
                                                  valid  |            | fail
                                                         v            v
                                              +----------+---+   clear errors
                                              | Generated Index|  no publish
                                              | Context Packs  |
                                              +------+---------+
                                                     |
                              +----------------------+-------------------+
                              |                                          |
                              v                                          v
                    +---------+---------+                      +---------+---------+
                    | Codex / AI Roles  |                      | Mobile Read Site  |
                    | scoped read only  |                      | filtered profiles |
                    +---------+---------+                      +---------+---------+
                              |                                          |
                              +------------------+-----------------------+
                                                 v
                                      feedback returns to inbox
                                      never writes Canon directly
```

## Source-of-Truth Layers

| Layer | Purpose | May AI edit directly? | May website edit directly? |
|------|---------|-----------------------|----------------------------|
| Governance | 项目宪法、权限、工作流、Schema 版本 | 仅在明确授权下 | 否 |
| Canon | 已批准的人物、世界、事实、关系、事件 | 否，必须走变更提案 | 否 |
| Narrative | 场景、章节、情节线、伏笔与叙事顺序 | 在单次明确任务范围内 | 否 |
| Manuscript | 正文草稿和修订版本 | 在作者指定范围内 | 否 |
| Research | 资料、引用、待核实事实 | 可补充，需保留来源 | 否 |
| Feedback | 编辑意见、读者反馈、AI 建议 | 可新增 | 可新增但不能晋升 |
| Generated | 索引、关系图数据、网页构建物、上下文包 | 可重建 | 只读展示 |

## Multi-Novel Workspace Model

```text
WORKSPACE-0001
  |
  |-- UNIV-0001 (optional shared world canon)
  |     |-- shared rules, places, factions, history
  |     `-- versioned independently
  |
  |-- SERIES-0001 (optional reading/order metadata)
  |     `-- NOVEL-0001 -> NOVEL-0002 -> NOVEL-0003
  |
  |-- NOVEL-0001 (independent production project)
  |     |-- local canon
  |     |-- narrative plan
  |     |-- manuscript
  |     `-- feedback/reports
  |
  `-- NOVEL-0002 (can progress simultaneously)
        `-- isolated status, focus, branches and context
```

边界规则：

- 每部小说是独立项目，拥有自己的 manifest、Canon、叙事、正文、研究、决策和反馈。
- 多部小说可以同时处于 planning / drafting / revision / paused 等不同阶段。
- 共享世界不是强制项；完全无关的小说不共享任何 Canon。
- 同一系列通过 `SERIES-*` 记录阅读顺序、跨书人物弧和跨书伏笔，但不把所有正文混进一个目录。
- 小说可引用一个或多个共享世界版本；共享世界事实在小说项目中默认只读。
- 小说需要改变共享世界事实时，必须提交到共享世界的变更请求，不能用本地同名事实覆盖。
- AI 每次会话必须明确 `novel_id`；未明确时只允许做工作区管理，不得推断当前作品。

## Canon State Machine

```text
idea
  |
  v
proposed ---> rejected
  |
  | author approval
  v
canon ------> deprecated
  |
  | formal change request + impact review
  v
retconned ---> replacement canon record
```

规则：

- `idea` 和 `proposed` 不能被 AI 当成事实引用。
- `canon` 是默认可用于写作的事实。
- `retconned` 记录仍然保留，用于解释旧稿和历史版本。
- 替代事实必须通过 `supersedes` 指向旧记录。
- 高影响变更必须生成影响报告，列出受影响场景、人物知识、关系、伏笔和正文。

## Core Entity Model

### Stable IDs

```text
WORKSPACE-0001 workspace
UNIV-0001     shared universe
SERIES-0001   ordered series
NOVEL-0001    novel project
CHAR-0001    character
LOC-0001     location
FACTION-0001 faction
ITEM-0001    item
RULE-0001    world rule
FACT-0001    atomic fact
REL-0001     relationship edge
EVT-0001     chronological story event
SCN-0001     narrative scene
THREAD-0001  plot/subplot thread
FORESH-0001  setup/payoff record
DEC-0001     author decision
CR-0001      canon change request
FB-0001      feedback item
```

ID 一经分配永不复用。改名、移动文件、拆章或调整叙事顺序不得改变实体 ID。

### Character

必须覆盖：身份与别名、外部目标、内部需要、创伤、错误信念、价值观、能力边界、声音档案、感知过滤器、秘密、身体状态、人物弧、首次/最后出现、可见范围、关联事实。

### Event vs Scene

```text
EVT-0042: 世界内真实发生的事情
  story_time: 2041-05-13 22:10
  participants: [CHAR-0001, CHAR-0007]
  location: LOC-0012

SCN-0068: 读者如何看到这件事
  narrative_order: book-01/ch-12/scene-03
  pov: CHAR-0007
  reveals: [FACT-0031]
  depicts_events: [EVT-0042]
```

一个事件可以不直接呈现、被多个场景从不同视角呈现，或在后文才被揭露。一个场景也可以包含多个事件。

### Knowledge State

人物知识不简化为布尔值，至少包含：

```text
character_id
fact_id
state: unknown | suspects | believes_true | believes_false | verified
learned_at_event
learned_in_scene
source_character
confidence
valid_from / valid_to
```

### Relationship

关系按方向和时间记录：

```text
from_character
to_character
relationship_type
trust / affection / fear / obligation / leverage
public_label
private_reality
valid_from_event
valid_to_event
caused_by
```

### Scene Contract

每个场景至少包含：

- POV、地点、故事时间、持续时间、叙事位置。
- 入场人物状态与离场人物状态。
- 场景目标、阻力、转折、危机选择、高潮行动、结果。
- 对情节、人物弧、关系、主题和读者体验的作用。
- 新增事实、知识转移、物品转移、伤势变化。
- 埋设/推进/回收的伏笔。
- 开放问题、后续依赖、可删除性判断。
- 当前状态：planned / drafted / revised / locked / cut。

## Proposed Repository Structure

目录结构是目标状态，不会一次性创建。每个里程碑只增加必要部分。

```text
Story/
|-- README.md
|-- STORY_OS_SPEC.md
|-- task_plan.md
|-- findings.md
|-- progress.md
|-- workspace/
|   |-- manifest.yaml
|   |-- series/
|   `-- dashboards/
|-- universes/
|   `-- UNIV-0001-slug/
|       |-- manifest.yaml
|       |-- canon/
|       |-- decisions/
|       `-- research/
|-- novels/
|   `-- NOVEL-0001-slug/
|       |-- manifest.yaml
|       |-- canon/
|       |   |-- characters/
|       |   |-- locations/
|       |   |-- factions/
|       |   |-- items/
|       |   |-- rules/
|       |   |-- facts/
|       |   `-- relationships/
|       |-- narrative/
|       |   |-- events/
|       |   |-- scenes/
|       |   |-- threads/
|       |   |-- foreshadowing/
|       |   `-- outlines/
|       |-- manuscript/
|       |   `-- volumes/volume-01/chapters/
|       |-- research/
|       |-- decisions/
|       |-- feedback/
|       `-- reports/
|-- schemas/
|-- templates/
|-- .agents/
|   `-- skills/
|-- tools/
|   |-- validator/
|   |-- context-builder/
|   `-- site-builder/
|-- tests/
|   |-- fixtures/
|   |-- schema/
|   |-- semantic/
|   `-- evals/
|-- app/
|   `-- mobile-reader/
`-- .generated/          # ignored; indexes/context/build output
```

## Data Format Decision

推荐默认：

- 结构化实体使用“一实体一文件”的 YAML。
- 长文本、场景设计、决策记录、正文使用 Markdown + YAML frontmatter。
- 每个文件必须属于明确的 `novel_id` 或 `universe_id`；禁止依赖当前目录猜测归属。
- JSON Schema 负责字段、枚举和基础引用格式验证。
- TypeScript 语义验证器负责跨文件规则。
- 不在 v1 引入数据库；数据库只能作为未来网页协作层，不能成为 Canon 唯一来源。

原因：逐实体文件更适合 Git diff、AI 局部读取、重命名、冲突隔离和长期迁移。单个巨型 JSON/YAML 在项目增长后会产生大面积冲突和难读 diff。

## Authoring and AI Workflow

### Session Start

```text
1. 读取 README 和 manifest
2. 确认当前里程碑、卷、章、场景与任务范围
3. 运行基础验证
4. 构建相关上下文包
5. 显示未解决决策和连续性警告
6. 作者确认本次目标后开始工作
```

### Scene Creation

```text
brief
  -> 5-15 个候选节拍
  -> 作者筛选
  -> 场景契约
  -> 连续性预检
  -> 草稿
  -> 结构审查
  -> 人物审查
  -> 文风审查
  -> 连贯性审查
  -> 无上下文读者测试
  -> 作者批准
  -> 提取新事实/状态变化
  -> Canon 变更提案
```

### Canon Change

```text
change request
  -> identify affected IDs
  -> dependency graph
  -> timeline/knowledge/foreshadow checks
  -> author decision
  -> apply atomically
  -> validate
  -> commit with retcon/change metadata
```

### Session End

- 保存本次决定、完成范围和停止点。
- 更新进度但不把临时想法晋升为 Canon。
- 运行验证并记录结果。
- 列出下一次启动所需的最小上下文。
- 提交一个可回滚的逻辑单元，或明确说明为什么不提交。

## AI Role Boundaries

| Role | Reads | Produces | Cannot do |
|------|------|----------|-----------|
| Story Architect | premise, structure, threads | alternatives, structure map | 自动定案 |
| Scene Designer | scene dependencies, character states | scene contract, beats | 跳过连续性检查 |
| Character Consultant | character + relationships + scenes | motivation/voice/arc findings | 直接改其他角色 |
| Continuity Auditor | canon + events + scene facts | contradiction report | 自动修复 Canon |
| Line Editor | locked scene context + prose | surgical prose suggestions | 改剧情事实 |
| Canon Curator | approved decisions + diffs | proposed fact/state updates | 自行批准 |
| Fresh Reader | manuscript only | comprehension/engagement report | 读取 Story Bible |
| Researcher | research question + source policy | sourced notes | 把未核实内容写入 Canon |

## Project Skill Suite

Skills 保存在仓库内 `.agents/skills/`，随 Git 版本管理。先建立一个路由/治理 skill，再按任务拆分专用 skills，避免一个超长万能 skill 占满上下文。

| Skill | Trigger examples | Primary output | Stop point |
|-------|------------------|----------------|------------|
| `story-os-manager` | 新建小说、切换小说、会话开始/结束、项目状态 | 项目选择、上下文入口、状态记录 | 明确当前 novel_id 和任务 |
| `novel-premise` | 构思题材、核心冲突、主题、卖点 | 多方案 premise/logline/theme | 作者选择方向 |
| `novel-outline` | 构建/调整大纲、结构审查、分卷 | 结构备选、节拍和因果链 | 作者批准大纲变更 |
| `novel-character` | 人物设计、人物弧、关系、声音 | 人物方案和关系变化提案 | 不自动写正文 |
| `novel-worldbuilding` | 世界观、规则、阵营、地点、系统 | 规则与影响分析 | 不自动晋升 Canon |
| `novel-scene` | 设计下一场、场景卡、节拍 | 场景契约和候选节拍 | 作者确认后才交给章节写作 |
| `novel-chapter` | 写/续写/修订章节 | 指定范围正文与状态提取 | 不越过章节范围 |
| `novel-continuity` | 查设定冲突、时间、知识、物品、伤势 | 只读审计报告 | 不自动修复 |
| `novel-developmental-edit` | 结构、节奏、因果、主题审稿 | 优先级明确的修改建议 | 不进行行文润色 |
| `novel-line-edit` | 文风、句法、视角、对白 | 外科式文本修改 | 不改剧情事实 |
| `novel-reader-test` | 新读者测试、可读性、情绪落点 | 无 Story Bible 的阅读报告 | 作者决定是否返工 |
| `novel-research` | 查资料、核实事实、来源管理 | 带来源和置信度的研究笔记 | 未核实资料不进 Canon |
| `novel-canon-change` | 设定修改、retcon、跨书影响 | 变更请求和依赖报告 | 作者批准后才应用 |

所有 skill 共用统一协议：先选小说、再确定权限和范围；生成建议时列出使用的事实 ID；基础设定变化必须转交 `novel-canon-change`。

## Validation Strategy

### Schema Validation

- 必填字段、枚举、日期、ID 格式。
- 文件类型与 ID 前缀匹配。
- Canon 状态迁移合法。
- `valid_from` 不晚于 `valid_to`。
- 可见范围、剧透级别和分享配置合法。

### Semantic Validation

- ID 全局唯一且所有引用存在。
- 别名不能造成无法消解的同名冲突。
- 场景引用的事件、人物、地点存在且状态可用。
- 人物不能在同一故事时间出现在不可能同时到达的地点。
- 人物不能使用尚未获知的事实。
- 物品不能同时被多个互斥持有人占有。
- 伤势、能力消耗、货币和关键资源状态连续。
- 世界规则不能被场景违反，除非存在已批准例外。
- 伏笔必须处于 planted / advanced / paid_off / abandoned 之一。
- 已锁定场景不能被普通写作流程静默修改。
- 公开/评阅构建不得引用更高可见等级的数据。

### Generated Index Integrity

- 所有生成索引包含源文件哈希。
- 源文件变化后旧索引必须被判定为过期。
- 构建前强制重新验证和生成。
- `.generated/` 可删除后完整重建。

## Test Plan

目标是验证行为、边界和错误路径，而不只验证“能运行”。

```text
CANON INPUT
  |-- valid entity ---------------------- [UNIT] accepts
  |-- missing required field ------------ [UNIT] clear error
  |-- duplicate ID ---------------------- [INTEGRATION] blocks build
  |-- broken reference ------------------ [INTEGRATION] reports source path
  |-- invalid state transition ---------- [UNIT] rejects
  |-- impossible timeline --------------- [SEMANTIC] flags collision
  |-- premature knowledge --------------- [SEMANTIC] flags leak
  |-- conflicting item ownership -------- [SEMANTIC] flags conflict
  |-- stale generated index ------------- [INTEGRATION] rebuild required
  `-- visibility leak ------------------- [E2E][CRITICAL] build must fail

AI CONTEXT
  |-- relevant IDs only ----------------- [EVAL]
  |-- canonical facts outrank proposals - [EVAL]
  |-- retconned facts excluded ---------- [EVAL]
  |-- token budget exceeded ------------- [UNIT] deterministic truncation
  `-- AI attempts Canon mutation -------- [EVAL] change proposal only

MOBILE READER
  |-- phone layout ---------------------- [E2E]
  |-- filter/search/timeline ------------ [E2E]
  |-- private access denied ------------- [E2E]
  |-- public profile excludes spoilers -- [E2E][CRITICAL]
  |-- offline cached approved pages ------ [E2E]
  `-- feedback submission failure ------- [E2E] recoverable message
```

测试层次：

- Unit：ID、状态机、日期、可见性、纯函数。
- Fixture/Integration：跨文件引用、时间、知识、关系、伏笔、生成索引。
- E2E：命令行验证、构建、移动端浏览、权限、反馈。
- AI Eval：上下文选择、事实优先级、禁止静默改 Canon、审查质量。
- Golden Project：维护一个小型完整示例项目，作为每次 Schema 升级的回归基线。

## Failure Modes and Recovery

| Failure | Detection | Handling | User Experience |
|---------|-----------|----------|-----------------|
| YAML/Markdown 损坏 | parser + schema test | 阻止验证、显示文件和字段 | 明确错误，不生成网页 |
| 重复 ID | global index test | 阻止提交/构建 | 列出冲突文件 |
| 断裂引用 | semantic validator | 阻止 Canon 发布 | 提供引用链 |
| AI 使用废弃设定 | context eval | 排除 retconned/deprecated | 报告被排除原因 |
| AI 写入未经批准事实 | Git diff + workflow gate | 转入 change request | 作者看到待批准项 |
| 时间/知识冲突 | semantic validator | 标记但不自动改写 | 提供相关场景和事实 |
| 公开构建泄露剧透 | visibility E2E | 构建失败 | 不发布旧/新版本 |
| 生成索引过期 | source hash mismatch | 自动重建 | 无静默陈旧数据 |
| Git 合并冲突 | file-per-entity + short branches | 人工合并并重跑验证 | 不自动选择事实版本 |
| GitHub/部署不可用 | local source + cached build | 继续本地写作，稍后同步 | 写作不被云服务阻断 |
| Schema 升级破坏旧数据 | versioned migration + golden fixtures | 分支迁移、可回滚 | 原 Canon 不被覆盖 |
| 仓库误删/损坏 | GitHub + 本地 + 定期归档 | 从 tag/remote/archive 恢复 | 有恢复手册 |

任何“没有测试、没有错误处理、并且会静默失败”的路径都视为阻断发布的关键缺口。

## Git and Release Strategy

### Repository

- Remote: `https://github.com/Single-stars/Story.git`
- `main`：已验证、可恢复的正式状态。
- 短分支：`foundation/*`、`schema/*`、`canon/*`、`scene/*`、`site/*`。
- 不长期维护复杂 Git Flow；使用主干开发和短分支。

### Commit Prefixes

```text
plan:       planning and governance
foundation: project constitution and manifest
schema:     data model/schema changes
canon:      approved canon addition/change
retcon:     approved canon replacement
scene:      scene planning and state updates
draft:      manuscript prose
audit:      reports and fixes
tool:       validator/context tooling
site:       mobile reader
test:       tests and fixtures
docs:       instructions and guides
```

### Tags and Releases

- `foundation-v0.1`：治理与 manifest 稳定。
- `schema-v0.1`：核心实体 Schema 可用。
- `pilot-v0.1`：一个真实章节完整跑通。
- `reader-v0.1`：手机端只读页面上线。
- `canon-vX.Y`：重要设定基线。
- `draft-vX.Y`：正文里程碑。

### Protection

- Canon/Schema 变更在合并前必须通过验证。
- 高影响 retcon 必须携带 `CR-*` 记录。
- 不提交密钥、个人隐私、未获授权的整本参考作品。
- 图片、音频和地图等大文件后续评估 Git LFS；初始阶段不引入。

## Mobile Reader Strategy

### v0.1 Read-Only PWA

- 静态生成，所有内容来自已验证的 Canon/Narrative 文件。
- 手机优先布局，可搜索人物、地点、事件、关系和场景。
- 时间线同时支持故事时间与叙事顺序。
- 提供人物关系和伏笔状态的只读视图。
- 离线缓存已授权页面。
- 不支持网页直接修改 Canon。

### Visibility Profiles

```text
internal:  作者完整资料、秘密、废案、未来情节
editor:    正文 + 指定设定 + 评论权限
reader:    指定章节 + 公开人物资料，无未来剧透
public:    宣传资料或明确批准的世界观页面
```

构建时按 profile 生成独立内容包。前端隐藏字段不算安全；未授权数据必须在构建阶段就被排除。

### v0.2 Feedback

- 评论写入外部反馈层或 `feedback/inbox` 的受控入口。
- 每条反馈有分享目标、来源、时间、状态和关联对象。
- 反馈只能变成提案，不能直接改 Canon。
- 网络失败时保留本地草稿并提示重试，不能静默丢失。

### Hosting Decision

推荐私人优先：静态站部署到支持访问控制的平台，使用邮箱白名单或一次性访问策略。GitHub Pages 只适合作为公开版本，不应用来托管含剧透和私人资料的完整站点。

## Phases

### Phase 0: Research, Repository, and Planning

- [x] 调研成熟小说方法论、连续性案例、写作软件和相关 skills。
- [x] 选择 B：文件优先 Story OS + 生成式移动网页。
- [x] 创建 GitHub 仓库并克隆到 `D:\Story`。
- [x] 创建 `task_plan.md`、`findings.md`、`progress.md`。
- [ ] 完成工程架构评审并确认关键选择。
- **Status:** in_progress
- **Acceptance:** 计划包含架构、数据流、测试、失败模式、Git、发布、移动端和明确延期项。

### Phase 1: Foundation Constitution（每批最多 3 个文件）

- [ ] 创建 `README.md`：日常入口、AI 启动/收尾顺序、Git 基本操作。
- [ ] 创建 `STORY_OS_SPEC.md`：正式项目宪法与规范。
- [ ] 创建 `workspace/manifest.yaml`：工作区 ID、Schema 版本、语言、时区、小说/系列/共享世界注册表、权限默认值。
- [ ] 验证三者互相引用一致，完成首次提交和 `foundation-v0.1` 标签。
- **Status:** pending
- **Acceptance:** 新会话只读这三份资料即可知道项目规则、当前状态和下一步；Canon 权限无歧义。

### Phase 2: Core Schemas（拆成三个独立批次）

批次 A：工作区与归属边界

- [ ] Workspace / Universe / Series / Novel manifest Schema。
- [ ] 公共字段/ID/状态/可见性 Schema。
- [ ] 多小说注册、路径归属、共享世界版本引用测试。

批次 B：故事实体

- [ ] Character Schema。
- [ ] Fact + World Rule Schema。
- [ ] 对应正反 fixture 与测试。

批次 C：叙事实体

- [ ] Event + Scene Schema。
- [ ] Relationship + Knowledge State Schema。
- [ ] Thread + Foreshadowing Schema。
- [ ] Schema 版本和迁移约定。
- **Status:** pending
- **Acceptance:** 所有核心实体可机器验证；错误定位到具体文件和字段；坏 fixture 必须稳定失败。

### Phase 3: Templates and Human Workflow

- [ ] 为核心实体生成最小模板，不复制 Schema 文档。
- [ ] 建立场景契约模板。
- [ ] 建立决策记录和 Canon 变更请求模板。
- [ ] 建立反馈项和会话收尾模板。
- [ ] 建立样例小项目，验证模板对人和 AI 都可读。
- **Status:** pending
- **Acceptance:** 作者能在不理解底层 Schema 的情况下创建合法实体；模板字段没有含糊的“备注区万能桶”。

### Phase 4: Validator and Test Harness

- [ ] 选择 Node.js/TypeScript 的最小工具链，使用 JSON Schema/Ajv 和 YAML/Markdown 解析。
- [ ] 先写失败测试，再实现 ID、引用、状态机和可见性验证。
- [ ] 加入时间、知识、关系、物品、伤势和伏笔语义验证。
- [ ] 生成机器可读 JSON 报告和人类可读终端报告。
- [ ] 配置 GitHub Actions，在 PR/Push 上运行验证和测试。
- **Status:** pending
- **Acceptance:** 无效 Canon 无法通过 CI；所有错误可操作；`.generated/` 删除后能重建。

### Phase 5: AI Context Builder and Project Skill Suite

- [ ] 定义任务上下文请求格式：目标、范围、相关 ID、时间窗口、剧透权限、token 预算。
- [ ] 强制选择 `novel_id`，按需合并被引用的共享世界 Canon。
- [ ] 生成分层上下文包，不默认读取整个仓库。
- [ ] 创建项目管理、大纲、人物、世界观、场景、章节、连续性、编辑、研究、读者测试和 Canon 变更 skills。
- [ ] 增加 AI eval：Canon 优先、提案隔离、retcon 排除、禁止静默晋升。
- [ ] 建立不同审查角色和停止点。
- **Status:** pending
- **Acceptance:** 同一个任务重复构建上下文时结果稳定；AI 能明确说明使用了哪些事实和版本。

### Phase 6: Real Writing Pilot

- [ ] 使用一个小型真实故事单元创建人物、地点、事实、事件、关系和 3-5 个场景。
- [ ] 完整跑通规划、写作、审查、Canon 提案、批准和提交。
- [ ] 记录所有摩擦点，修改 Schema 前先写决策记录。
- [ ] 至少执行一次 retcon 演练和一次 Git 回滚演练。
- [ ] 标记 `pilot-v0.1`。
- **Status:** pending
- **Acceptance:** 真实写作没有被表格工作吞没；一次场景启动所需上下文可在数分钟内准备；回滚不丢资料。

### Phase 7: Mobile Read-Only PWA

- [ ] 从验证后的文件生成移动端数据包。
- [ ] 实现人物、场景、时间线、关系和搜索页面。
- [ ] 实现 internal/editor/reader/public 可见性构建。
- [ ] 增加移动端、离线、权限和剧透泄露 E2E 测试。
- [ ] 配置预览部署与正式部署。
- [ ] 标记 `reader-v0.1`。
- **Status:** pending
- **Acceptance:** 手机可流畅查看；未授权数据不进入构建物；发布失败不会覆盖上一稳定版本。

### Phase 8: Feedback and Collaboration

- [ ] 建立分享包和反馈入口。
- [ ] 为反馈增加关联对象、权限、状态、解决记录。
- [ ] 添加失败重试、垃圾提交限制和审计日志。
- [ ] 反馈晋升为提案必须由作者明确操作。
- **Status:** pending
- **Acceptance:** 外部人员无需访问 Canon 仓库即可反馈；任何反馈都不能绕过作者权限。

### Phase 9: Hardening, Backup, and Recovery

- [ ] 编写恢复手册和机器迁移手册。
- [ ] 配置月度完整性验证和归档。
- [ ] 演练 GitHub 不可用、误删、Schema 迁移失败和部署泄露阻断。
- [ ] 建立依赖升级和安全更新节奏。
- **Status:** pending
- **Acceptance:** 在新电脑上可从 Git 仓库和文档恢复；至少一次恢复演练有记录。

### Phase 10: Long-Term Operating Rhythm

- [ ] 每场景：连续性预检 + 完成后状态提取。
- [ ] 每章节：结构、人物、知识、伏笔和节奏审查。
- [ ] 每幕/卷：宏观结构、主题和人物弧审查。
- [ ] 每月：完整验证、死链接、孤立伏笔、陈旧提案、备份检查。
- [ ] 每个大版本：无上下文读者测试、移动端分享审查、恢复演练。
- **Status:** pending
- **Acceptance:** 项目维护成本可控，任何新参与者可通过文档进入工作，AI 更换不会破坏连续性。

## What Already Exists and Will Be Reused

| Existing asset | Reuse | Avoid rebuilding |
|----------------|-------|------------------|
| Git/GitHub | 历史、分支、标签、回滚、远端备份 | 自建版本数据库 |
| Markdown/YAML | 人类与 AI 可读的持久资料 | 私有二进制项目格式 |
| JSON Schema + Ajv | 结构化验证 | 手写全部字段验证 |
| Static site generator | 移动端阅读页面 | 初期自建通用 CMS |
| GitHub Actions | CI 验证与构建 | 自建 CI 服务器 |
| `fiction-workshop` 思路 | 角色化审查、会话记录、新读者测试 | 单一万能 AI 审稿 |
| Snowflake / Scene-Sequel / Story Grid | 规划和诊断镜头 | 发明新的通用故事公式 |
| Plottr/Novelcrafter/Aeon | 作为可选辅助工具或交互参考 | 把厂商格式设为唯一事实源 |

## NOT in Scope for Initial Foundation

- 完整在线多人编辑器：数据模型尚未经过真实写作验证，先避免重建 Notion/Novelcrafter。
- AI 自动连续写整本小说：会削弱作者控制并放大设定漂移。
- 向量数据库和复杂 RAG 服务：先用明确 ID、索引和受控上下文验证真实需求。
- 原生 iOS/Android 应用：PWA 足以验证手机工作流。
- 实时共同编辑 Canon：高冲突、高风险，初期使用 Git 和提案机制。
- 3D 地图、复杂动画、语音、多媒体资产管理：不阻塞核心写作和一致性。
- 公开社区/商业 SaaS：当前目标是作者自己的长期项目。
- 自动接受读者或编辑反馈：反馈必须由作者判断。
- 一次性创建完整目录树和所有模板：会产生大量未经真实使用验证的空结构。

## Workstream Dependencies and Parallelization

| Step | Modules | Depends on |
|------|---------|------------|
| Governance | root docs, workspace manifest | planning |
| Schemas | schemas, tests/fixtures | governance |
| Templates | templates, sample data | schemas |
| Validator | tools/validator, tests | schemas |
| Context Builder | tools/context-builder, evals | schemas + validator |
| Mobile Reader | app/mobile-reader, site builder | validator + sample data |
| Feedback | app feedback adapter, feedback records | mobile reader + governance |

并行策略：

- Phase 1 顺序执行，无并行价值。
- Phase 2 完成公共 Schema 后，可并行设计人物/事实与事件/场景，但合并前统一 ID 和状态模型。
- Phase 3 模板和 Phase 4 验证器可以有限并行，但共同修改 Schema 时必须串行。
- Phase 5 上下文构建器和 Phase 7 移动端在 Validator 稳定后可并行。
- 当前不启动多工作树；等 Phase 2 数据模型稳定后再使用独立 worktree。

## Key Decisions Made

| Decision | Status | Rationale |
|----------|--------|-----------|
| 采用 B 方案 | confirmed | 保持数据所有权、AI 可迁移性和长期可验证性 |
| GitHub 仓库为 `Single-stars/Story` | confirmed | 用户已创建并授权后续版本管理 |
| 文件是唯一事实源 | confirmed | 防止平台锁定和双写漂移 |
| 网页为派生只读视图 | proposed default | 先保证安全和可重建，再逐步增加反馈能力 |
| 一实体一文件 | proposed default | Git diff 清晰、AI 局部读取、降低合并冲突 |
| YAML + Markdown + JSON Schema | proposed default | 平衡人类可读性、机器验证和长期迁移 |
| TypeScript 验证工具 | proposed default | 与未来静态网页共享运行时和类型工具链 |
| v1 不使用数据库/向量库 | proposed default | 避免过早基础设施和新事实源 |
| 每批不超过 8 个文件 | confirmed process | 限制爆炸半径，便于审查和回滚 |
| 工作区内每部小说独立目录 | confirmed | 支持多小说同时推进并隔离 Canon、进度与反馈 |
| 共享世界单独版本化 | confirmed | 支持系列/共享宇宙而不污染无关小说 |
| 项目内 skill suite | confirmed | 每类任务有明确流程、权限和停止点，且随仓库演进 |

## Decisions to Confirm

1. 移动端默认隐私与部署方式：私人优先、公开优先，还是先完全本地。
2. Schema/模板的主要字段语言：英文机器字段 + 中文说明，还是全部中文字段。
3. 第一部作品是否从一开始按“系列/多卷”建模；推荐支持系列但只实例化一本。
4. 是否在 Phase 4 启用 GitHub `main` 分支保护和 PR 必须通过 CI；推荐启用。
5. 外部反馈者是否需要账号；推荐 editor 需要邮箱身份，普通 reader 可用受限匿名反馈。

一次只确认一个高影响问题，未确认项保持提案状态，不阻塞前三个地基文件。

## Errors Encountered

| Error | Attempt | Resolution |
|-------|---------|------------|
| PowerShell 禁止执行 `npx.ps1` | 1 | 改用 `npx.cmd`，技能搜索成功 |
| GitHub REST API 返回 403 | 1 | 使用 skills CLI、npm registry 和官方网页交叉验证 |
| Plottr 页面导航超时 | 1 | 检查实际 URL/DOM，页面已加载，未重复导航 |
| 一个 worldbuilding skill 搜索结果与仓库内容不一致 | 1 | 标记搜索索引陈旧，不安装该 skill |
| 多文件补丁包含一个不存在的上下文行 | 1 | 拆成按章节定位的小补丁，避免整批失败 |
| Git 首次提交缺少 `user.name` / `user.email` | 1 | 保留已暂存改动，等待用户提供本仓库作者身份，不伪造提交者 |

## Immediate Next Slice After Plan Approval

只创建：

1. `README.md`
2. `STORY_OS_SPEC.md`
3. `workspace/manifest.yaml`

然后验证、提交并打 `foundation-v0.1` 标签。不会在同一批次创建 Schema、模板或网页。
