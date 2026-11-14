================================================================
GoDevAgent — 研发全流程 Agent 团队 Skill 包
================================================================

一套覆盖「需求 → 原型 → 架构 → 详细设计 → 编码 → 测试 → 发布」的
多 Agent 研发流水线。九个角色 Agent 全部用 Markdown Skill 定义，
可移植到 Claude Code / Codex / OpenCode / WorkBuddy / Gemini CLI /
Cursor / ZCode / DeepSeek Harness 等主流 Agent 工具。

设计目标：全程自动推进，人工只做最终验收；不通过则自动进入修复
循环，直到通过或达到轮次上限。

----------------------------------------------------------------
一、核心设计
----------------------------------------------------------------

1. 流水线 + 自动质检门
   七个阶段连续自动推进，中间不停下等人。原有的人工确认点改为
   Agent 自检门（Q1-Q4），按强制检查清单自动放行或自动返工。

2. 唯一人工点：终验
   全部阶段完成后一次性提交：验收矩阵 + 决策记录 + 已知问题。
   人只需回复「通过」或「不通过 + 缺陷清单」。

3. 不通过 → 修复循环
   根因分析（复现 → 定位 → 假设 → 验证）→ 只重跑受影响阶段 →
   回到终验。最多 3 轮，超限输出诊断报告后停止，不无限重试。

4. 交接物驱动
   每个阶段的产物写入项目 docs/ 目录，下一阶段只消费交接物，
   不依赖对话记忆。因此换会话、换工具都能无损续接——状态在文件
   里，不在任何 Agent 的脑子里。

----------------------------------------------------------------
二、流程总览
----------------------------------------------------------------

  需求 →[Q1自检]→ 原型 → 架构 →[Q2自检]→ 详细设计(任务拆解)
    → 编码(TDD + 每任务两级评审) → 测试 →[Q4全量测试]
    → 发布包 → ★终验(唯一人工点) → 通过:交付 / 不通过:修复循环

三个自循环兜底：
  · Q1/Q2 自检不合格 → 自动修订，同一门最多 2 轮
  · 测试发现 Blocker/Major → 自动打回编码，最多 3 轮
  · 终验不通过 → 修复迭代，最多 3 轮

----------------------------------------------------------------
三、角色清单（9 个 Agent）
----------------------------------------------------------------

  00-orchestrator      流程总控：调度阶段、守护质检门、驱动修复循环
  01-requirements      需求分析师：澄清意图、假设显式化、产出 PRD
  02-prototype         原型设计师：多页 HTML 原型，零依赖直开
  03-architecture      架构师：选型自动拍板、模块划分、接口契约
  04-detail-design     详细设计：2-5 分钟粒度任务，含精确文件路径与验证步骤
  05-developer         实现工程师：强制 TDD（RED-GREEN-REFACTOR）+ 两级评审
  06-tester            测试工程师：分层测试、验收标准覆盖矩阵、自动打回
  07-release           发布与终验官：完成前逐条验证、产出终验报告
  08-notifier          通知官：阶段完成/终验就绪等事件推送到负责人

----------------------------------------------------------------
四、目录结构
----------------------------------------------------------------

  sd-agent-team/
    README.md                    完整说明（Markdown 版）
    README.txt                   本文件
    00-orchestrator/SKILL.md     各角色定义（共 9 个目录）
    ...
    08-notifier/SKILL.md
    templates/                   标准交接物模板
      PRD-template.md
      architecture-template.md
      task-breakdown-template.md
      test-report-template.md
      defects-template.md
      notify-config-template.md
    adapters/                    跨工具接入层
      AGENTS.md                  支持 AGENTS.md 的工具的通用适配器
      build-combined.sh          合并 9 个角色为单文件提示词
      COMBINED-PROMPT.md         生成产物（Harness/API 用）
      install.sh                 自动探测 + 安装脚本
      tools.local.example        自定义工具注册表样例

----------------------------------------------------------------
五、快速开始
----------------------------------------------------------------

1) 自动安装（推荐，Windows 用 Git Bash）

   cd sd-agent-team
   bash adapters/install.sh --dry-run     # 预览：探测本机 Agent 工具
   bash adapters/install.sh               # 正式安装到所有检测到的工具

2) 手动安装

   Claude Code / WorkBuddy：把 9 个编号目录复制到
     ~/.claude/skills/  或  ~/.workbuddy/skills/
   Codex / OpenCode / Gemini：把 adapters/AGENTS.md 内容追加到
     ~/.codex/AGENTS.md 等对应文件
   Cursor：adapters/AGENTS.md → 项目 .cursor/rules/sd-agent-team.mdc
   ZCode 等其他工具：用 --skills-to / --agents-to / --prompt-to
     或登记 adapters/tools.local
   DeepSeek Harness 等纯 API：把 adapters/COMBINED-PROMPT.md
     整个文件作为 system prompt

3) 启动一个项目

   对话里说：「用 sd-orchestrator 启动新项目：<一句话需求>」
   之后自动跑到底，最后给你终验报告。

4) （可选）配置负责人通知

   复制 templates/notify-config-template.md 为项目 docs/notify.yaml，
   填入飞书/钉钉/企业微信群机器人 webhook 即可。推送失败不阻塞流水线。

----------------------------------------------------------------
六、项目中会生成的交接物
----------------------------------------------------------------

  docs/00-pipeline.md     流程状态（当前阶段/已完成/迭代轮次）
  docs/01-prd.md          PRD（含关键假设表 AS-xx）
  docs/02-prototype/      多页 HTML 原型
  docs/03-architecture.md 架构文档（含决策记录）
  docs/04-tasks.md        任务拆解（T-xx）
  docs/05-impl-log.md     实现日志（每任务 TDD + 评审记录）
  docs/06-test-report.md  测试报告（含验收覆盖矩阵）
  docs/07-release.md      发布说明 + 终验报告
  docs/08-defects.md      缺陷清单与根因分析（修复循环时）

----------------------------------------------------------------
七、方法论来源
----------------------------------------------------------------

提示词结构参考 obra/superpowers 的 Agentic Skills 方法论：
brainstorming（意图澄清）、writing-plans（可执行计划）、
test-driven-development（强制 RED-GREEN-REFACTOR）、
subagent-driven-development（每任务两级评审）、
systematic-debugging（根因分析）、
verification-before-completion（完成前验证）。
核心理念：Mandatory workflows, not suggestions —— 流程是强制的，不是建议。

----------------------------------------------------------------
八、注意
----------------------------------------------------------------

· 全部流程状态在项目 docs/ 里，不要把 docs/ 加入 .gitignore
· webhook 与密钥只存 docs/notify.yaml，不要提交到版本库
· 同一套流水线支持跨工具接力（A 工具中断，B 工具读状态文件继续）
