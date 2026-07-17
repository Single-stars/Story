# Story OS

这是一个面向长期小说创作的多项目工作区。它把小说设定、叙事设计、正文、研究、反馈和 AI 工作流保存为可审计的纯文本文件，并使用 Git 管理历史。

## First Principles

1. 文件是唯一事实源。网页、索引、AI 上下文和图表都必须能够从文件重建。
2. 作者拥有 Canon 最终决定权。AI 建议、读者评论和灵感不会自动成为正式设定。
3. 每次工作必须先选择 `novel_id`。不同小说的资料不得混用。
4. 共享世界是显式依赖，不是隐式复制。小说不能私自覆盖共享世界事实。
5. 先验证，再写作；先结构和连续性，再润色。
6. 每个逻辑批次保持小而可回滚，完成后运行检查并记录 Git 历史。

## Workspace Layout

```text
workspace/   多小说注册表、系列与工作区状态
universes/   可选的共享世界 Canon
novels/      每部小说完全独立的开发目录
schemas/     机器可验证的数据契约
templates/   人类可填写的最小模板
tools/       验证、上下文构建和网页生成工具
tests/       Schema、语义、E2E 与 AI eval
.agents/     随仓库版本化的小说工作 skills
app/         手机阅读器
.generated/  可删除并重建的派生数据，不是事实源
```

当前正式入口是 [workspace/manifest.yaml](workspace/manifest.yaml)。完整规则见 [STORY_OS_SPEC.md](STORY_OS_SPEC.md)。长期执行计划见 [task_plan.md](task_plan.md)。

## Start a Session

1. 读取 `workspace/manifest.yaml`。
2. 明确本次处理的 `novel_id`；如果尚未创建小说，先运行项目管理流程。
3. 读取该小说的 `manifest.yaml` 和当前工作状态。
4. 运行验证器。验证器尚未安装时，至少检查 ID、状态和路径归属。
5. 说明本次任务类型：构思、大纲、人物、世界观、场景、章节、连续性、编辑、研究或 Canon 变更。
6. 只加载与任务相关的 Canon、事件、场景和最近决策。
7. 在写入前说明修改范围；基础设定变化必须走 Canon 变更流程。

## End a Session

1. 记录完成内容、作者决策、未解决问题和停止点。
2. 提取正文中出现的新事实、知识、关系、物品和伤势变化，但只生成提案。
3. 运行验证和必要审查。
4. 检查 `git diff`，确保没有越过本次范围。
5. 只提交一个可解释的逻辑单元。

## Standard Creative Order

```text
premise/theme
  -> character and world constraints
  -> global outline
  -> volume/act/chapter outline
  -> scene contract
  -> continuity preflight
  -> chapter draft
  -> developmental edit
  -> character/continuity audit
  -> line edit
  -> fresh-reader test
  -> author approval
  -> Canon change proposal
```

任何步骤都可以回退，但不能跳过作者选择、连续性验证或 Canon 权限。

## Multi-Novel Rule

- `novels/NOVEL-xxxx-slug/` 是一部小说的隔离边界。
- 同时推进多部小说时，每部小说有自己的状态、当前章节和待处理任务。
- `workspace/manifest.yaml` 的 `active_novel_id` 只是界面默认值，不代表 AI 可以省略小说选择。
- 跨书系列信息放在 `workspace/series/`；共享世界事实放在 `universes/`。
- 无关小说不读取彼此的 Canon。

## Git Practice

推荐短分支和小提交：

```text
foundation/*  项目地基
schema/*      数据契约
canon/*       已批准设定
scene/*       场景设计
draft/*       正文
audit/*       审查结果
site/*        阅读器
```

提交前必须运行当时可用的完整验证命令。Git 作者身份尚未配置时，不要伪造提交者；先在本仓库设置真实的 `user.name` 和 `user.email`。

## Current Build Status

- [x] 研究与路线选择
- [x] 多小说总体计划
- [x] 工作区入口与项目宪法
- [x] 核心 Schema
- [x] 模板与示例项目
- [x] 验证器基础
- [x] 项目 skills
- [x] 两部小说的前三章 reader 示例稿
- [x] 手机阅读器基础构建与样式接入
- [ ] CI、生产发布权限、Canon 决策强制门禁
- [ ] 正式 Canon 实体、场景契约与作者批准记录

## Current Sample Reader State

- GitHub `main` 已完成初始提交与推送；当前工作分支为 `codex/story-os-reader-samples`。
- `NOVEL-0001`《死亡账户》与 `NOVEL-0002`《六百里夜驿》各有 3 章 `revised` / `reader` 示例稿，可进入 reader profile。
- 示例正文用于验证 Story OS 写作和阅读器切书、切章流程；正文事实仍属于 manuscript/proposal 层，不自动晋升 Canon。
- `npm.cmd run validate:story` 当前应识别 `2 novels / 0 entities / 6 chapters`。
- `npm.cmd run build:reader-app` 会生成 `.generated/mobile-reader`，其中 `library.json` 含 2 本书、每本 3 章。
