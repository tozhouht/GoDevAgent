# SD Agent Team — 研发全流程 Agent 团队 Skill 包（全自动版）

一套覆盖「需求 → 原型 → 架构 → 详细设计 → 编码 → 测试 → 发布」全流程的多 Agent 研发流水线。提示词风格参考 obra/superpowers：frontmatter 触发词 + 步骤化过程 + 强制检查清单，**Mandatory workflows, not suggestions**。

## 设计原则

1. **全程自动，终验一次过**：7 个阶段连续自动推进，中间**不停下来等人确认**。人工只在最后做一次「终验」。
2. **人工闸门 → 自动质检门**：原来 4 个人工确认点改为 Agent 自检门（Q1-Q4），按强制检查清单自动放行或自动返工。
3. **交接物驱动**：每阶段产出标准文档到 `docs/`，下一阶段只消费交接物，跨会话、跨平台无损续接。
4. **不通过 → 新循环**：终验不通过自动进入修复循环（根因分析 → 只重跑受影响阶段 → 再终验），上限 3 轮。

## 流程总览

```
需求 → [Q1自检] → 原型 → 架构 → [Q2自检] → 详细设计(任务拆解)
  → 编码(TDD + 每任务两级评审) → 测试 → [Q4全量测试]
  → 发布包 → ★终验（唯一人工点） → 通过:交付 / 不通过:修复循环(≤3轮)
```

## 自动质检门（Agent 自查，不停等人）

| 质检门 | 时机 | 检查方式 | 不合格处理 |
|--------|------|----------|-----------|
| Q1 需求自检 | PRD 完成后 | 需求 Agent 对照清单自查 + 假设显式化 | 自动修订，最多 2 轮 |
| Q2 架构自检 | 架构文档完成后 | 对照接口契约一致性/非功能覆盖清单 | 自动修订，最多 2 轮 |
| Q3 任务级评审 | 每个编码任务完成后 | 两级评审：spec 合规 → 代码质量 | Critical 阻断，自动返工 |
| Q4 全量测试 | 编码完成后 | 自动化测试 + 验收标准覆盖矩阵 | 自动打回修复 |

**原本需要人拍板的决策**（技术选型、优先级取舍）改为「按预设决策原则自动拍板 + 决策记录」，全部写入交接物，终验时可随时推翻重跑。

## 唯一人工点：终验

全部阶段完成后，发布官提交：验收矩阵 + 发布说明 + 决策记录摘要 + 已知问题。人做一次验收：

- **通过** → 交付
- **不通过** → 自动生成缺陷清单，进入修复循环：根因分析 → 影响评估 → 只重跑受影响阶段 → 回到终验。**最多 3 轮**，超限输出诊断报告并停止。

## 目录结构

```
sd-agent-team/
├── README.md                    本文件
├── 00-orchestrator/SKILL.md     流程总控（编排器，含修复循环协议）
├── 01-requirements/SKILL.md     需求分析师（含 Q1 自检清单）
├── 02-prototype/SKILL.md        原型设计师
├── 03-architecture/SKILL.md     架构师（含自动决策原则 + Q2 自检清单）
├── 04-detail-design/SKILL.md    详细设计（superpowers writing-plans 风格）
├── 05-developer/SKILL.md        实现工程师（TDD 强制 + 两级评审）
├── 06-tester/SKILL.md           测试工程师（含打回循环）
├── 07-release/SKILL.md          发布与终验官（verification-before-completion）
├── 08-notifier/SKILL.md         负责人通知官（飞书/钉钉/企微 webhook，异步不阻塞）
└── templates/                   标准交接物模板
    ├── notify-config-template.md  通知配置（复制为 docs/notify.yaml）
```

## 负责人通知（可选模块）

把 `templates/notify-config-template.md` 复制为项目 `docs/notify.yaml`，填入飞书/钉钉/企业微信群机器人的 webhook 即可。之后每个阶段完成、终验就绪、流水线停止等事件都会**自动推送消息给负责人**，流水线继续跑不被阻塞。关键事件（终验就绪、超限停止）必推，其余按订阅开关。webhook 属密钥，不要提交 git（支持环境变量替代）。在 WorkBuddy 里也可以不配 webhook，直接启用飞书/企微连接器，通知官会优先走连接器发消息。
```

## 安装到各 Agent 系统

**WorkBuddy（用户级）**
```bash
cp -r sd-agent-team/00-orchestrator ~/.workbuddy/skills/sd-orchestrator
cp -r sd-agent-team/01-requirements ~/.workbuddy/skills/sd-requirements
# 02~07 同理；templates 放项目 docs/ 下随用随取
```

**Claude Code / Codebuddy CLI**：复制到项目 `.claude/skills/`（或 `.claude/agents/` 作为子 Agent）。
**Cursor / 其他**：SKILL.md 正文直接作为 Rule / System Prompt，格式天然兼容。

## 跨工具接入（Claude / Codex / OpenCode / ZCode / DeepSeek Harness 等）

本包状态全部存在项目 `docs/` 交接物里，不依赖任何工具的记忆——**同一套流水线甚至可以跨工具接力**（Claude Code 编码、Codex 评审都行）。

**一键自动安装（推荐）**：
```bash
bash adapters/install.sh --dry-run        # 先预览：探测本机工具 + 列出将执行的动作
bash adapters/install.sh                  # 正式安装到所有检测到的工具（用户级）
bash adapters/install.sh --only claude,codex   # 只装指定工具
bash adapters/install.sh --project /path/to/repo  # 安装为某项目项目级（含 AGENTS.md + .claude/skills）
```
脚本自动探测 Claude Code / WorkBuddy / Codex / OpenCode / Gemini CLI / Cursor（按配置目录或命令识别），并按各工具约定安装：skills 目录型直接拷贝 Skill 目录；AGENTS.md 型按标记块追加引用（重复运行安全，不会重复插入）；只新增不删除。

| 工具 | 接入方式 | 用法 |
|------|----------|------|
| Claude Code | `cp -r 0X-* ~/.claude/skills/`（用户级）或项目 `.claude/skills/` | 原生识别 SKILL.md frontmatter，按名触发，如「用 sd-orchestrator 启动新项目」 |
| Codex | 把 `adapters/AGENTS.md` 放项目根目录（或 `~/.codex/AGENTS.md`），`sd-agent-team/` 一并放进仓库 | Codex 自动读 AGENTS.md → 按需读各阶段 SKILL.md 执行 |
| OpenCode / ZCode | 支持 AGENTS.md 约定的 → 同 Codex；否则用下一种 | 自动读取，行为同上 |
| 无文件读取的 Harness / 纯 API（DeepSeek 等） | 运行 `bash adapters/build-combined.sh` 生成 `adapters/COMBINED-PROMPT.md`（9 个角色合并的单文件提示词） | 整个文件作为 system prompt，单 Agent 按阶段切换角色 |

要点：
- **AGENTS.md 路线**（Codex/OpenCode/ZCode）：提示词只写「去读哪个文件」，内容单一来源在 SKILL.md，改流程不用同步多份
- **合并提示词路线**（Harness/API）：源 Skill 变更后重跑 `build-combined.sh` 重新生成，勿手改生成文件
- **跨工具接力**：docs/00-pipeline.md 是唯一状态源，A 工具跑到一半中断，B 工具说「读 docs/00-pipeline.md 继续」即可无损接手

## 使用方式

**新项目（全流程）**
> 「用 sd-orchestrator 启动新项目：<一句话需求>」
> 一路自动跑到底，最后给你终验报告。

**中断续接（跨会话）**
> 「读取 docs/00-pipeline.md，从当前阶段继续」

**终验不通过**
> 「终验不通过，缺陷如下：…」→ 自动进入修复循环，无需指挥
