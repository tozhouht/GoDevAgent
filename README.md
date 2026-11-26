# GoDevAgent

[![ci](https://github.com/tozhouht/GoDevAgent/actions/workflows/ci.yml/badge.svg)](https://github.com/tozhouht/GoDevAgent/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/godevagent.svg)](https://www.npmjs.com/package/godevagent)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**全流程研发 Agent 团队 —— 需求 → 原型 → 架构 → 详细设计 → 编码 → 测试 → 发布**

九个可组合的 Markdown Skill，把任何编码 Agent 变成一支能自己跑完整个交付流程的团队：一条需求进去，一路自动跑到终点，**只在你终验时停一次**；你打回，它自己进修复循环。

**English** · [README_en.md](README_en.md)

---

## 为什么做这个

市面上的 Agent 工作流大多卡在同一个地方：每做一步就停下来问「要继续吗」。GoDevAgent 把这些打断全部去掉——人工审查只发生在**最后一次性验收**，中间由机器可判定的质量清单代替人工点头。

支撑这个设计的三个决定：

1. **质检门替代人工闸门** —— 四个自动检查点（Q1–Q4），按明确清单校验每个阶段，不合格自动返工，合格自动放行。
2. **单点验收** —— 你只看一次：验收矩阵、自动拍板的假设、已知问题。通过就交付，不通过就丢缺陷清单回来。
3. **循环有上限** —— 自检 ≤2 轮、测试打回 ≤3 轮、修复迭代 ≤3 轮。绝不无限重试，超限输出根因诊断报告后停止。

## 流水线

```
需求 →[Q1自检]→ 原型 → 架构 →[Q2自检]→ 详细设计(任务拆解)
  → 编码(TDD + 每任务两级评审) → 测试 →[Q4全量测试]
  → 发布包 → ★终验(唯一人工点) → 通过:交付 / 不通过:修复循环(≤3轮)
```

只有 ★ 需要你出手。

## 九个角色

| Skill | 角色 | 关键产出 |
|-------|------|----------|
| `00-orchestrator` | 流程总控：调度阶段、守护质检门、驱动修复循环 | `docs/00-pipeline.md` |
| `01-requirements` | 需求分析师：澄清意图、假设显式化 | `docs/01-prd.md` |
| `02-prototype` | 原型设计师：多页 HTML 原型，零依赖直开 | `docs/02-prototype/` |
| `03-architecture` | 架构师：选型自动拍板并记录、接口契约 | `docs/03-architecture.md` |
| `04-detail-design` | 详细设计：2–5 分钟粒度任务，含精确路径与验证步骤 | `docs/04-tasks.md` |
| `05-developer` | 实现工程师：强制 TDD，每任务两级评审 | 代码 + `docs/05-impl-log.md` |
| `06-tester` | 测试工程师：分层测试、验收覆盖矩阵、自动打回 | `docs/06-test-report.md` |
| `07-release` | 发布与终验官：完成前逐条验证、产出终验报告 | `docs/07-release.md` |
| `08-notifier` | 通知官：阶段事件推送负责人（飞书/钉钉/企微） | 可选 |

## 安装

### 方式一：npx 直接运行（推荐，无需安装）

> 要求 Node.js ≥ 18。不落盘、随用随跑：

```bash
npx godevagent              # 探测本机 Agent 工具并安装
npx godevagent --dry-run    # 只预览，不做任何改动
npx godevagent list         # 查看探测结果与安装状态
```

### 方式二：npm 安装

```bash
npm install -g godevagent   # 全局安装
godevagent                  # 之后直接运行（无需 npx 前缀）
godevagent --dry-run
godevagent list
```

或安装为某个项目的开发依赖：

```bash
npm install -D godevagent
npx godevagent --dry-run
```

升级版本：`npm update -g godevagent`。

### 方式三：从 GitHub 仓库直装（不经过 npm）

```bash
npx github:tozhouht/GoDevAgent --dry-run
```

### 安装器会做什么

自动探测本机已装的 Agent 工具（Claude Code、WorkBuddy、Codex、OpenCode、Gemini CLI、Cursor），按各自约定把九个角色的 Skill 装进去；技能包会落盘到稳定目录 `~/.godevagent/skills`，各工具的引用路径长期有效。**只新增文件、幂等跳过已装内容，不会覆盖或删除你已有的任何配置**。

### 其他安装途径

**仓库内脚本**（Windows 用 Git Bash）：

```bash
cd sd-agent-team
bash adapters/install.sh --dry-run   # 预览：探测本机有哪些 Agent 工具
bash adapters/install.sh             # 装进所有检测到的工具
```

内置探测 Claude Code、WorkBuddy、Codex、OpenCode、Gemini CLI、Cursor。其余工具：

```bash
bash adapters/install.sh --skills-to <目录>    # 有 skills 目录约定的工具
bash adapters/install.sh --agents-to <文件>    # 读 AGENTS.md 的工具
bash adapters/install.sh --prompt-to <目录>    # 纯 Harness / API
```

**手动安装**

| 工具 | 复制什么 | 去哪 |
|------|----------|------|
| Claude Code / WorkBuddy | 九个编号目录 | `~/.claude/skills/` 或 `~/.workbuddy/skills/` |
| Codex / OpenCode | `adapters/AGENTS.md` | 追加到 `~/.codex/AGENTS.md` |
| Cursor | `adapters/AGENTS.md` | `<项目>/.cursor/rules/sd-agent-team.mdc` |
| ZCode 等 | 登记 `adapters/tools.local` | 参考 `tools.local.example` |
| DeepSeek Harness / 纯 API | `adapters/COMBINED-PROMPT.md` | 作为 system prompt |

修改任何 Skill 后重新生成合并提示词：`bash adapters/build-combined.sh`。

## 使用

启动项目：

```
用 sd-orchestrator 启动新项目：<一句话需求>
```

之后它自己跑到底，最后给你一份终验报告。回「通过」就交付；回「不通过：<缺陷>」它自动进修复循环。

换会话或换工具续跑：

```
读取 docs/00-pipeline.md，从当前阶段继续。
```

这之所以成立，是因为**状态存在文件里，不在 Agent 的记忆里**——`docs/` 是唯一事实来源，所以流水线甚至能在工具之间交接（Claude Code 编码、Codex 评审）。

## 方法论

提示词结构与工程纪律参考 [superpowers](https://github.com/obra/superpowers) 的 Agentic Skills 方法论：brainstorming、writing-plans、test-driven development、subagent-driven development 两级评审、systematic debugging、verification before completion。

核心理念：**Mandatory workflows, not suggestions（流程是强制的，不是建议）**。

## 仓库结构

```
README.md                中文说明（默认）
README_en.md             英文说明
README.txt               纯文本版中文说明
LICENSE                  MIT
package.json             npm 包配置（npx godevagent）
bin/cli.mjs              CLI 安装器（Node 实现，跨平台，无需 bash）
PUBLISHING.md            发布到 npm 的流程说明
sd-agent-team/
  README.md              完整详细文档
  00-orchestrator … 08-notifier/    各角色定义（各自 SKILL.md）
  templates/             交接物模板（PRD/架构/任务/测试/缺陷/通知）
  adapters/              跨工具接入层（AGENTS.md、install.sh、build-combined.sh、COMBINED-PROMPT.md）
```

## 许可

MIT —— 见 [LICENSE](LICENSE)。
