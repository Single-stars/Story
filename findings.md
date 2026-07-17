# Findings & Decisions: Story OS

## Requirements

- 支持至少一至两年的小说开发、写作、修订和持续成长。
- AI 可以长期协助，但不能因聊天上下文丢失而偏离既定设定。
- 人物、场景、关系、事件、物品、世界规则、知识和伏笔必须有序记录。
- 使用成熟方法论和已有案例，不凭空制造一套未经验证的写作术语。
- 有完整工作流、即时反馈、手机分享、多人查看能力。
- 数据质量、长期迁移能力和作者控制权优先于短期开发速度。
- 使用 GitHub 仓库 `https://github.com/Single-stars/Story.git` 管理版本。
- 已确认采用 B：文件优先 Story OS + 自动生成移动网页。
- 必须支持多部无关或相关小说同时推进，具有清晰的作品隔离、系列归属和共享世界机制。
- 大纲、人物、世界观、场景、章节、连续性、编辑、研究和读者测试应有相对应的项目内 skills。

## Research Findings

### Mature Craft Methods

- Snowflake Method 把小说设计视为逐层扩张：一句话、段落、人物线、长梗概、场景表格和正文；设计文档应随创作继续更新，而不是一次性大纲。
- Snowflake 的场景表建议一行一个场景，记录 POV、内容和章节，强调保存多个版本。这与文件优先和 Git 历史高度兼容。
- Dwight Swain 的 Scene/Sequel 提供场景级因果链：Goal / Conflict / Disaster 与 Reaction / Dilemma / Decision。
- Story Grid 的五个要素是 Inciting Incident、Progressive Complication、Crisis、Climax、Resolution，适合做场景“是否发生改变”的检查。
- Story Grid 用《沉默的羔羊》做了 64 场景、14 列的完整表格，连续性列追踪 POV、时间、持续时长、地点、在场人物和被提及人物。
- 成熟方法的共同点不是某一套固定节拍，而是：分层设计、逐场记录、明确状态变化、定期分析、保留历史。

### Existing Products

- Plottr 提供视觉时间线、40+ 结构模板、人物卡、地点/笔记、系列圣经、Web、云同步和实时协作；明确不内置 AI。适合作为交互参考或辅助规划，但不应成为唯一数据源。
- Novelcrafter 提供 Codex wiki、自动链接人物/地点/设定、跨书共享、协作和可连接多个 AI/本地模型。它最接近现成 Story OS，但数据模型和 Canon 权限仍由厂商决定。
- Aeon Timeline 提供自定义属性、关系交叉引用、按日期/人物弧/叙事查看、Scrivener/Ulysses 同步，并支持 Mac、Windows、iOS。它适合复杂时间线，但不足以独立承担 Canon 和 AI 工作流。
- World Anvil 偏世界观发布和社区展示；本次抓取的 features 页面没有提供足够清晰的核心能力说明，因此不把它列为地基首选。

### Existing Skills

- `rhavekost/author-toolkit@fiction-workshop`（搜索结果约 1.5K 安装）是目前最值得复用的技能：Story Bible、会话收尾记录、Developmental/Line/Character/Continuity 等角色化审查，以及不读取 Story Bible 的新读者测试。
- 它的局限是把大量状态集中在一个 Story Bible，缺少稳定 ID、状态机、变更影响分析、机器 Schema 和权限分层。
- 同仓库的 `story-structure` 把 K.M. Weiland 的结构节点与 James Scott Bell 的 signposts 结合，可做宏观 Map/Audit，但百分比只能作为诊断参考。
- `inkos-multi-agent-novel-writing` 搜索结果约 2.6K 安装，真实 npm 包 `@actalk/inkos` 已发布到 1.7.0；其人物矩阵、情感弧、支线板、Canon 约束、Validator/Auditor/Reviser 流程值得借鉴。
- InkOS 的 skill 内容仍主要描述 v0.4 的行为，与 npm 当前 1.7.0 不同步；而且其目标偏自动批量生成小说，不适合作为作者主导项目的唯一基础。
- `novel-creator` 偏 10 章互动穿越小说和 EPUB 生成，结构固定，不适合长期严肃开发。
- `jwynia/agent-skills` 的 worldbuilding 搜索结果在实际 `skills use` 时不存在，说明索引可能陈旧，不能仅凭搜索排名安装。

## Architectural Insight

**EUREKA:** 长篇小说最稳固的“故事圣经”不应是一份越来越长的文档，而应是一组可验证的原子记录；传统 Story Bible、时间线、人物表和移动网页都应该是这些记录的不同编译视图。

这解决三个长期问题：

1. AI 不需要每次读取整本故事圣经。
2. 同一事实不会在多个表格和网页中各自变成不同版本。
3. 更换工具时只需重新生成视图，不需要迁移唯一事实源。

**EUREKA:** 多小说工作区不能共享一个根 Canon。正确边界是“每部小说独立 Canon + 可选共享世界 Canon + 系列元数据”。这允许完全无关的小说并行，也允许同一宇宙的跨书事实被版本化复用。

## Technical Decisions

| Decision | Status | Rationale |
|----------|--------|-----------|
| 文件优先、Git 版本化 | confirmed | 资产归作者所有，可审计、可迁移、可回滚 |
| Canon 与 idea/proposal/feedback 分层 | confirmed | 防止 AI 建议或评论被误当正式事实 |
| 永久 ID | confirmed | 改名、移动和重排不会破坏引用 |
| 故事时间与叙事顺序分离 | confirmed | 支持倒叙、多 POV、秘密揭露和复杂时间线 |
| 人物知识状态作为一等数据 | confirmed | 防止人物知道不可能知道的信息 |
| 网页从文件生成 | confirmed | 消除双写和数据库成为隐藏事实源的问题 |
| 一实体一 YAML 文件 | proposed | Git diff 和局部 AI 上下文更稳定 |
| Markdown + YAML frontmatter 用于长文本 | proposed | 同时满足阅读、写作和机器索引 |
| JSON Schema + TypeScript 语义验证 | proposed | 复用成熟验证技术并服务后续网页 |
| PWA 先只读、后反馈 | proposed | 降低数据损坏和权限泄露风险 |
| 每部小说独立目录与 manifest | confirmed | 隔离状态、上下文、正文、反馈和版本演进 |
| 可选共享世界目录 | confirmed | 为系列/共享宇宙提供只读依赖，避免复制事实 |
| 仓库内 `.agents/skills` 技能组 | confirmed | 对大纲、章节等高频任务提供稳定、可版本化流程 |

## What Already Exists

- GitHub 已解决远端版本、历史、标签和基本灾备。
- Git 可解决本地回滚、分支隔离和变更审查。
- Markdown/YAML 可被 Codex、编辑器、Obsidian、静态站生成器和普通文本工具读取。
- JSON Schema/Ajv 可处理结构验证，无需自建 Schema 引擎。
- GitHub Actions 可承担 CI，不需要维护专用构建服务器。
- Plottr/Novelcrafter/Aeon 可以作为辅助界面或导入导出目标，而不是重新实现它们的所有能力。

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| `npx.ps1` 被 Windows ExecutionPolicy 阻止 | 使用 `C:\Program Files\nodejs\npx.cmd` |
| GitHub API 403，无法可靠读取 stars | 改用 skills 安装量、npm 元数据、官方页面和实际 skill 内容交叉验证 |
| Plottr 导航调用超时 | 检查 URL 和 DOM 后确认页面实际已加载，避免重复请求 |
| skills.sh 的 worldbuilding 项目索引陈旧 | 不推荐安装，后续只采用能实际读取并核对内容的 skill |
| gstack bash preamble 在当前 Windows 环境没有 bash | 采用可执行的 PowerShell/本地规划流程，不修改项目外配置 |

## Resources

- Snowflake Method: https://www.advancedfictionwriting.com/articles/snowflake-method/
- Writing the Perfect Scene: https://www.advancedfictionwriting.com/articles/writing-the-perfect-scene/
- Story Grid Five Commandments: https://storygrid.com/a-deeper-dive-into-the-five-commandments-of-storytelling/
- Story Grid Continuity: https://storygrid.com/tracking-continuity/
- Plottr: https://plottr.com/
- Novelcrafter: https://www.novelcrafter.com/
- Aeon Timeline: https://www.aeontimeline.com/
- Fiction Workshop skill: https://skills.sh/rhavekost/author-toolkit/fiction-workshop
- InkOS skill: https://skills.sh/aradotso/trending-skills/inkos-multi-agent-novel-writing
- GitHub repository: https://github.com/Single-stars/Story

## Planned Project Skills

- `story-os-manager`
- `novel-premise`
- `novel-outline`
- `novel-character`
- `novel-worldbuilding`
- `novel-scene`
- `novel-chapter`
- `novel-continuity`
- `novel-developmental-edit`
- `novel-line-edit`
- `novel-reader-test`
- `novel-research`
- `novel-canon-change`

## Visual/Browser Findings

- Plottr 官方页说明其支持 Windows、Mac、Web、云同步、实时协作、视觉时间线、系列圣经和跨多本书的集中人物/地点/笔记。
- Novelcrafter 官方页说明 Codex 会自动追踪和链接人物、地点及 lore，可跨书共享，并支持协作者、写作组、多 AI 供应商和本地模型。
- Aeon Timeline 官方页说明可交叉引用记录、自定义类别和属性、从时间/叙事/人物弧观察故事，并支持 Mac、Windows、iOS。
- Story Grid 官方连续性文章展示了《沉默的羔羊》完整 Excel 案例，并明确表示连续性小错误足以破坏阅读体验。

## Open Questions

1. 私人移动站的访问控制平台。
2. 机器字段语言。
3. 第一部作品的单本/系列初始化方式。
4. 分支保护和 PR 门槛。
5. 外部反馈者身份与匿名策略。
