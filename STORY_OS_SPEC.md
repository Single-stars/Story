# Story OS Specification

Version: 0.1.0-draft  
Authority: Author  
Repository: `https://github.com/Single-stars/Story.git`

本文档是 Story OS 的项目宪法。文中的 MUST、MUST NOT、SHOULD、MAY 分别表示强制、禁止、推荐和可选。

## 1. Purpose

Story OS 必须支持：

- 多部小说同时规划、写作、修订、暂停和恢复。
- 单本、系列、多卷和共享世界作品。
- 一至两年或更久的设定、人物、关系、事件和正文演进。
- 可更换的 AI 模型与写作工具。
- 可追踪、可验证、可回滚的 Canon。
- 手机阅读、章节切换、书籍切换、分享和反馈。

系统不以“自动生成最多文字”为目标，而以“作者长期保持控制、小说持续变好且不丢失因果和设定”为目标。

## 2. Authority and Truth

### 2.1 Source of Truth

- 正式事实 MUST 存在于版本化源文件中。
- 网页、搜索索引、图表、上下文包和缓存 MUST 被视为派生物。
- 派生物 MUST 能在删除后由源文件完整重建。
- 同一事实 MUST NOT 在多个正式位置分别维护。

### 2.2 Author Authority

- 作者是 Canon 的唯一批准者。
- AI MAY 创建 `idea`、`proposed`、审查报告和变更请求。
- AI MUST NOT 把建议静默标记为 `canon`。
- 网页评论和读者反馈 MUST NOT 直接写入 Canon。
- 任何 retcon MUST 保留旧事实、原因、影响范围和替代事实。

## 3. Workspace Boundaries

### 3.1 Workspace

一个 Git 仓库代表一个工作区。工作区包含多个小说、可选共享世界、系列元数据、通用 Schema、工具和 skills。

### 3.2 Novel Project

每部小说 MUST 有独立 `NOVEL-*` ID 和目录。目录至少包含：

```text
manifest.yaml
canon/
narrative/
manuscript/
research/
decisions/
feedback/
reports/
```

每部小说 MUST 独立记录：

- 生命周期状态。
- 当前卷、章、场景和工作焦点。
- 题材、类型承诺、目标读者和语言。
- 使用的共享世界和系列。
- Canon 版本与 Schema 版本。
- 可见性和分享设置。

### 3.3 Shared Universe

- 共享世界使用 `UNIV-*` ID。
- 共享世界 SHOULD 只包含真正跨作品复用的规则、历史、地点、阵营和人物。
- 小说读取共享世界时 MUST 引用明确版本。
- 小说本地 Canon MUST NOT 用同一 ID 覆盖共享世界记录。
- 修改共享世界 MUST 在共享世界范围内完成影响审查。

### 3.4 Series

- 系列使用 `SERIES-*` ID。
- 系列记录阅读顺序、跨书情节线、跨书人物弧、跨书伏笔和共享剧透边界。
- 系列元数据 MUST NOT 代替各小说自己的正文和场景记录。

## 4. Identity and File Ownership

### 4.1 Stable IDs

所有长期引用对象 MUST 使用永久 ID：

```text
WORKSPACE-0001  UNIV-0001  SERIES-0001  NOVEL-0001
CHAR-0001       LOC-0001   FACTION-0001 ITEM-0001
RULE-0001       FACT-0001  REL-0001     EVT-0001
SCN-0001        THREAD-0001 FORESH-0001 DEC-0001
CR-0001         FB-0001
```

- ID MUST NOT 因改名、改文件名、拆章、重排或 retcon 被复用。
- 删除对象 SHOULD 使用状态标记而不是抹去历史。
- 文件路径 MAY 改变，但对象 ID 不变。

### 4.2 Ownership

- 每个实体 MUST 声明 `novel_id` 或 `universe_id`。
- 一个实体 MUST 有且只有一个正式所有者。
- 跨项目引用 MUST 使用 ID，不得复制并分别修改同一事实。

## 5. Canon Lifecycle

合法状态：

```text
idea -> proposed -> canon -> deprecated
                  |       -> retconned
                  `-> rejected
```

- `idea`：未经整理的灵感，不能用于连续性判断。
- `proposed`：结构化候选，AI 必须标明非正式。
- `canon`：已批准、可用于写作和验证。
- `rejected`：保留拒绝原因，避免重复讨论。
- `deprecated`：不再推荐使用，但未被新的事实追溯替换。
- `retconned`：被新的 Canon 替换，必须记录 `superseded_by`。

状态变化 MUST 产生决策记录。高影响变化 MUST 产生 `CR-*` 变更请求。

## 6. Story Data Model

### 6.1 Character

主要人物 SHOULD 包含：

- external want、internal need、wound、lie。
- 价值观、恐惧、底线、能力、限制和代价。
- 声音档案：词汇、句法、感知过滤器、回避话题。
- 公开身份、秘密身份、别名和关系。
- 人物弧状态与关键变化事件。
- 身体、精神、资源和社会状态。

### 6.2 Fact and Rule

- `FACT-*` 是最小可引用事实。
- `RULE-*` 是限制世界行为的规则，必须描述适用范围、例外、代价和验证方式。
- 未核实的现实资料 MUST 保存在 research，不得直接成为事实。
- 魔法、科技、社会和经济系统 MUST 记录限制，不能只记录能力。

### 6.3 Event and Narrative Order

- `EVT-*` 表示世界内实际发生的事件。
- `SCN-*` 表示读者如何、何时、从谁的视角看到事件。
- `story_time` 和 `narrative_order` MUST 分离。
- 倒叙、梦境、传闻、伪造记录和不可靠叙述 MUST 显式标记。

### 6.4 Knowledge State

人物对事实的状态至少包括：

```text
unknown
suspects
believes_true
believes_false
verified
```

知识记录 MUST 指向获得来源和场景。人物在正文中依据某事实行动时，验证器 SHOULD 能判断其是否已经知道或相信该事实。

### 6.5 Relationship

关系 MUST 支持方向性、非对称性和时间变化。至少可记录信任、好感、恐惧、义务、权力、秘密和误解。

### 6.6 Object and Physical State

关键物品 MUST 追踪位置、持有人、状态和转移事件。伤势、疲劳、能力消耗、金钱和其他关键资源 SHOULD 使用同类状态记录。

### 6.7 Plot Threads and Foreshadowing

- 主线和支线使用 `THREAD-*`。
- 伏笔使用 `FORESH-*`，状态为 planted / advanced / paid_off / abandoned。
- 伏笔 MUST 记录种植位置、读者可见信息、真实含义、预期回收范围和实际回收位置。
- abandoned 必须说明原因，避免被误判为遗忘。

## 7. Craft Frameworks

方法论是诊断镜头，不是必须套用的唯一公式。每部作品在 manifest 中声明使用哪些结构镜头。

### 7.1 Snowflake Expansion

适用于从概念逐层扩张：

```text
一句话 premise
-> 一段完整故事
-> 主要人物故事线
-> 多段/多页梗概
-> 场景列表
-> 章节和正文
```

每次扩张 SHOULD 允许回写上层设计，但 MUST 留下决策历史。

### 7.2 Character Model

主要人物使用 Want / Need / Wound / Lie，并用 Goal / Motivation / Conflict 检查每个阶段的行动。人物行为必须能通过“为什么链”回到价值观、目标或创伤。

### 7.3 Scene/Sequel

行动型场景检查 Goal / Conflict / Disaster；反应型场景检查 Reaction / Dilemma / Decision。不是每个场景机械套满六项，但场景必须有变化和因果出口。

### 7.4 Story Grid Five Commandments

重要场景和宏观段落检查：

1. Inciting Incident
2. Progressive Complication / Turning Point
3. Crisis
4. Climax
5. Resolution

触发、危机、高潮和结果 MUST 由同一因果链连接。

### 7.5 Macro Structure

三幕、四幕、英雄之旅、Story Circle、类型节拍等 MAY 用于比较和审查。系统 MUST NOT 强制所有小说使用固定百分比；偏离时只要求作者知道偏离的效果。

### 7.6 Genre Promise

每部小说 MUST 声明主要类型、次要类型、读者期待、必要场面和禁止误导。每章 SHOULD 至少推进主线、人物、关系、谜团、世界规则或类型体验中的一项，最好推进多项。

## 8. Standard Workflows

### 8.0 Beginner Creative Intake

当作者以零基础灵感开始新小说，或要求 AI 逐步引导创作时，Story OS MUST 先进入创作启动访谈，而不是直接写正文、直接注册 Canon，或一次性要求作者填写完整设定表。

创作启动访谈 MUST 遵守：

- 一次只问一个高影响问题，优先解决作品归属、核心灵感、目标体验、类型承诺、主角驱动力和主要阻力。
- 每轮回答后 SHOULD 输出：已确认、AI 推断、仍未知、建议与取舍。
- 低影响细节 SHOULD 延后，避免问卷疲劳和过早设定锁死。
- AI MAY 补充专业建议和候选方案，但作者必须选择方向。
- 未经作者明确批准的内容 MUST 保持为 idea、proposed 或 decision draft，不得写成 Canon。
- 访谈记录 SHOULD 使用 `templates/workflow/creative-intake.yaml`，并绑定后续分配的 `novel_id`；在 novel_id 尚未分配前，必须保持 `novel_id: null`。

创作启动访谈至少覆盖：

1. 单本、系列或共享世界意图。
2. 作者灵感、不可丢失的核心画面或情绪。
3. 目标读者、类型承诺、禁区和敏感内容边界。
4. 参考作品与反参考作品，以及希望继承或避开的体验。
5. 主角候选、Want / Need / Wound / Lie、能力、限制、代价、声音指纹和行动压力。
6. 反对力量、关系网络、秘密、知识边界和人物之间的方向性关系。
7. 世界规则、制度、资源、成本、例外和信息披露节奏。
8. 主题问题、核心冲突、情绪曲线、悬念、惊奇、好奇和伏笔策略。
9. 篇幅、更新节奏、作者投入时间和长期工作方式。
10. 需要研究或同类作品拆解的高影响问题。

创作启动完成后，AI MUST 先给出创作简报和未决问题，由作者确认；确认后才能注册新 `NOVEL-*`、进入 premise proposal、人物、世界观、大纲或章节流程。

### 8.1 New Novel

```text
creative intake
-> author confirms creation brief
-> register NOVEL ID
-> choose standalone / series / universe
-> audience and genre promise
-> three to five premise alternatives
-> author selection
-> initial character/world constraints
-> global outline
-> pilot scenes
-> validate
```

### 8.2 Outline

1. 读取 premise、主题、类型承诺、人物和世界限制。
2. 提供至少两个结构方案并说明读者体验差异。
3. 建立事件因果链，而不是只列“然后发生”。
4. 标出人物弧、谜团、关系和伏笔的推进点。
5. 检查开局承诺、中段变化、最低点、高潮选择和结局代价。
6. 作者批准后才写入正式 outline。

### 8.3 Scene

场景设计 MUST 先形成场景契约：POV、时间、地点、入场状态、目标、阻力、转折、危机、行动、结果、离场状态、新事实、知识转移、关系变化、伏笔和依赖。

### 8.4 Chapter Draft

1. 只读取本章必要上下文。
2. 检查上一章出口和本章入口。
3. 按已批准场景契约写作。
4. 不静默增加改变世界基础的能力或历史。
5. 草稿完成后提取状态变化。
6. 先做结构/人物/连续性审查，再做行文润色。

### 8.5 Canon Change

变更请求 MUST 包含：旧事实、新事实、原因、替代方案、影响 ID、受影响正文、时间/知识/关系/伏笔影响、迁移步骤、验证和回滚。

### 8.6 Reader Test

新读者测试 MUST 不读取隐藏 Canon，只读取指定正文和允许的前置章节。报告应回答：理解了什么、误解了什么、哪里失去兴趣、期待什么、情绪是否落地、章末是否愿意继续。

## 9. AI Protocol

- AI MUST 先声明 novel_id、任务类型和修改范围。
- AI MUST 区分 Canon、proposal、research 和 manuscript。
- AI SHOULD 列出本次依赖的关键事实 ID。
- AI 遇到冲突 MUST 报告，不得自行选择方便的版本。
- AI 不得把其他小说的资料带入当前项目，除非存在显式系列/共享世界引用。
- AI 角色审查 SHOULD 分轮进行；结构、人物、连续性和文风不能混成无法执行的一大段意见。
- AI 会话结束 MUST 记录停止点和未解决问题。

## 10. Validation Gates

正式提交和网页构建前 MUST 通过：

- YAML/Markdown 可解析。
- Schema 合法。
- ID 唯一、前缀正确、引用存在。
- 文件归属与 novel_id/universe_id 一致。
- Canon 状态迁移合法。
- 事件、时间、人物知识、物品和关键状态无已知矛盾。
- 共享世界引用版本存在且不可被本地覆盖。
- 分享构建不包含高于目标 profile 的数据。

验证失败 MUST 阻止生成新的正式阅读站版本。

## 11. Review Gates

推荐审查顺序：

```text
developmental
-> character
-> continuity
-> genre promise
-> line edit
-> fresh reader
-> author approval
```

审查报告 MUST 给出位置、问题、严重度、依据、可选修改和可能影响。连续性审查默认只读，不自动修复。

## 12. Mobile Reader Contract

阅读器必须至少支持：

- 书架和多书切换。
- 目录、卷/章切换、上一章/下一章。
- 保存每本书的独立阅读进度。
- 字号、行距、页边距、字体、亮/暗/护眼主题。
- 章节进度、返回顶部、沉浸模式。
- 搜索允许分享范围内的内容。
- 响应式手机布局和键盘/屏幕阅读器操作。
- 离线缓存已获授权的章节。
- 分享指定书籍/章节，而不是暴露整个内部工作区。
- 清晰的加载、空、错误、无权限和离线状态。

前端隐藏字段不是权限控制。构建器 MUST 在数据进入网页包之前删除未授权内容。

## 13. Visibility

```text
internal  作者完整资料和所有剧透
editor    指定正文、设定和评论能力
reader    已开放章节和无未来剧透的资料
public    明确批准的宣传内容
```

每个构建物 MUST 记录 profile、源提交、构建时间和内容哈希。

## 14. Git and Recovery

- `main` SHOULD 只包含已验证状态。
- Schema、Canon、正文和网页 SHOULD 使用短分支。
- 提交 MUST 按逻辑单元拆分并使用明确前缀。
- 重要 Canon 基线和正文里程碑 SHOULD 打 tag。
- Schema 迁移 MUST 在独立分支运行，并通过 Golden Project 回归。
- 任何恢复流程 MUST 能从本地、GitHub 或归档恢复，而不依赖某个 AI 会话。

## 15. Skill Contract

仓库内 skills MUST：

- 使用小写连字符命名。
- 在 description 中写清触发场景。
- 读取统一协议，不复制整个规范。
- 只加载任务需要的 references。
- 写明停止点和禁止越权动作。
- 通过 skill 验证脚本。
- 对大纲、章节、Canon 变更等高风险流程提供可复用模板或脚本。

## 16. Change to This Specification

本规范的重大修改 MUST：

1. 说明真实写作中出现的问题。
2. 给出至少一个较小替代方案。
3. 描述对现有小说和 Schema 的影响。
4. 提供迁移、测试和回滚方案。
5. 由作者批准并记录 Git 历史。
