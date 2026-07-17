# Story OS Agent Rules

## Language

默认使用中文交流。代码、字段名、命令、日志和已有英文文档保持其适合的语言。

## Session Start

1. 读取 `README.md`、`workspace/manifest.yaml` 和当前任务相关的计划。
2. 涉及具体作品时，必须先确认 `novel_id`；不得凭最近编辑文件猜测。
3. 读取该小说 manifest、相关 Canon、最近决策和必要场景，不默认读取其他小说。
4. 写作或编辑前说明修改范围。预计修改超过 3 个文件时先拆成小批次。

## Canon Authority

- 作者是 Canon 的唯一批准者。
- AI、读者反馈、研究笔记和网页表单只能创建 idea、proposal、audit 或 change request。
- 不得静默把新事实、世界规则、人物历史或 retcon 写成 canon。
- 发现矛盾时先报告引用和影响，不自动选择一个版本修复。
- 共享世界内容默认只读；小说本地文件不得覆盖共享世界 ID。

## Multi-Novel Isolation

- 每部小说位于 `novels/NOVEL-xxxx-slug/`。
- 无关小说不得共享上下文、人物、设定或反馈。
- 系列信息通过 `workspace/series/` 显式关联。
- 共享世界信息通过 `universes/UNIV-xxxx-slug/` 显式关联并带版本。

## Workflow Routing

- 新建/切换小说、会话状态：`story-os-manager`
- 题材、premise、主题：`novel-premise`
- 大纲、结构、分卷：`novel-outline`
- 人物、人物弧、关系：`novel-character`
- 世界观、规则、阵营：`novel-worldbuilding`
- 场景卡和节拍：`novel-scene`
- 章节写作和修订：`novel-chapter`
- 连续性审计：`novel-continuity`
- 结构编辑：`novel-developmental-edit`
- 行文编辑：`novel-line-edit`
- 新读者测试：`novel-reader-test`
- 资料检索：`novel-research`
- Canon/retcon 变更：`novel-canon-change`

对应 skill 尚未创建时，遵循 `STORY_OS_SPEC.md` 的同名流程，不自行发明替代权限。

## Implementation

- 功能和修复使用测试先行：先写失败测试并确认失败原因，再写最小实现。
- 配置和纯文档必须运行解析、链接或格式检查。
- 使用 `apply_patch` 编辑文件，避免覆盖用户未提交内容。
- 每个逻辑批次验证后再进入下一批；不得仅凭“看起来正确”声称完成。
- 生成文件放入 `.generated/`，并保证可从源文件重建。

## Writing Quality

- 大纲必须强调因果，不接受只有“然后”的事件列表。
- 每个场景必须有欲望、阻力、变化和后续拉力。
- 人物行动必须与 Want/Need/Wound/Lie、价值观或压力相连。
- 章节先做结构、人物和连续性审查，再做文风润色。
- 新读者测试不能读取隐藏 Story Bible。

## Session End

- 记录作者决策、未解决问题和停止点。
- 提取新事实和状态变化为 proposal，不自动晋升 Canon。
- 运行当前完整验证命令并检查 `git diff`。
- Git 作者身份未配置时保留改动，不伪造提交者。

