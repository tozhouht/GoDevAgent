# GoDevAgent

[![ci](https://github.com/tozhouht/GoDevAgent/actions/workflows/ci.yml/badge.svg)](https://github.com/tozhouht/GoDevAgent/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/godevagent.svg)](https://www.npmjs.com/package/godevagent)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**A full-lifecycle software development team of AI agents — requirements → prototype → architecture → design → code → test → release.**

Nine composable Markdown skills that turn any coding agent into a self-driving delivery team: it runs the entire pipeline start to finish, stops exactly once for your final acceptance, and fixes itself in a loop if you reject it.

> 中文说明见 [README.md](README.md)

---

## Why it exists

Most agent workflows stall at every step: "shall I proceed?", "please confirm the requirements". GoDevAgent removes those interruptions. Human review happens **once, at the end** — the rest is automated, gated by machine-checkable quality checklists instead of human approval.

Three design decisions make that safe:

1. **Quality gates, not human gates** — four automated checkpoints (Q1–Q4) verify each stage against explicit checklists and self-correct before moving on.
2. **Single acceptance point** — you review once: acceptance matrix, auto-decided assumptions, known issues. Approve, or send back defects.
3. **Bounded loops** — self-check ≤2 rounds, test-rejection ≤3 rounds, rework iterations ≤3 rounds. Never an infinite retry; it stops with a root-cause report instead.

## Pipeline

```
requirements →[Q1]→ prototype → architecture →[Q2]→ detailed design (task breakdown)
  → implementation (TDD + two-stage review per task) → testing →[Q4]
  → release package → ★FINAL ACCEPTANCE → pass: ship / reject: rework loop (≤3)
```

Only ★ is a human step.

## The nine agents

| Skill | Role | Key output |
|-------|------|------------|
| `00-orchestrator` | Pipeline controller: schedules stages, enforces gates, drives rework loops | `docs/00-pipeline.md` |
| `01-requirements` | Intent clarification, assumptions made explicit | `docs/01-prd.md` |
| `02-prototype` | Multi-page clickable HTML prototype, zero dependencies | `docs/02-prototype/` |
| `03-architecture` | Tech selection decided automatically + recorded, contracts | `docs/03-architecture.md` |
| `04-detail-design` | 2–5 minute tasks with exact file paths and verification steps | `docs/04-tasks.md` |
| `05-developer` | Mandatory TDD (RED-GREEN-REFACTOR), two-stage review per task | code + `docs/05-impl-log.md` |
| `06-tester` | Layered tests, acceptance-coverage matrix, auto-rejection | `docs/06-test-report.md` |
| `07-release` | Verification before completion, final acceptance report | `docs/07-release.md` |
| `08-notifier` | Push stage events to the project owner (Feishu/DingTalk/WeCom webhooks) | optional |

## Installation

**npx (one command, cross-platform)**:

```bash
npx godevagent              # detect agent tools and install
npx godevagent --dry-run    # preview only
npx godevagent list         # show detection and install status
```

Before the npm release, install straight from the repo: `npx github:tozhouht/GoDevAgent --dry-run`

**Auto-detect via repo script** (on Windows use Git Bash):

```bash
cd sd-agent-team
bash adapters/install.sh --dry-run   # preview: which agent tools are detected
bash adapters/install.sh             # install into every detected tool
```

Detects Claude Code, WorkBuddy, Codex, OpenCode, Gemini CLI, Cursor. For anything else:

```bash
bash adapters/install.sh --skills-to <dir>      # tool with a skills directory
bash adapters/install.sh --agents-to <file>     # tool that reads AGENTS.md
bash adapters/install.sh --prompt-to <dir>      # prompt-only harness / API
```

**Manual**

| Tool | What to copy | Where |
|------|--------------|-------|
| Claude Code / WorkBuddy | the nine numbered folders | `~/.claude/skills/` or `~/.workbuddy/skills/` |
| Codex / OpenCode | `adapters/AGENTS.md` | `~/.codex/AGENTS.md` (append) |
| Cursor | `adapters/AGENTS.md` | `<project>/.cursor/rules/sd-agent-team.mdc` |
| ZCode / other | register in `adapters/tools.local` | see `tools.local.example` |
| DeepSeek Harness / raw API | `adapters/COMBINED-PROMPT.md` | as the system prompt |

Regenerate the combined prompt after editing any skill: `bash adapters/build-combined.sh`.

## Usage

Start a project:

```
Use sd-orchestrator to start a new project: <one-line requirement>
```

Then it runs to the end and hands you one acceptance report. Reply `approve` to ship, or `reject: <defects>` and it enters the rework loop on its own.

Resume an interrupted run in a different session or a different tool:

```
Read docs/00-pipeline.md and continue from the current stage.
```

That works because **state lives in files, not in the agent's memory** — `docs/` is the source of truth, so pipelines can even be handed off between tools (Claude Code codes, Codex reviews).

## Methodology

Prompt structure and engineering discipline follow the [superpowers](https://github.com/obra/superpowers) agentic-skills methodology: brainstorming, writing-plans, test-driven development, subagent-driven development with two-stage review, systematic debugging, and verification before completion.

Core principle: **mandatory workflows, not suggestions.**

## Repository layout

```
README.md                Chinese overview (default)
README_en.md             this file (English)
README.txt               Chinese plain-text version
LICENSE                  MIT
package.json             npm package config (`npx godevagent`)
bin/cli.mjs              CLI installer (Node, cross-platform, no bash required)
PUBLISHING.md            npm release guide
sd-agent-team/
  README.md              detailed documentation
  00-orchestrator … 08-notifier/    role definitions (SKILL.md each)
  templates/               handoff templates (PRD, architecture, tasks, tests, defects, notify)
  adapters/                cross-tool layer (AGENTS.md, install.sh, build-combined.sh, COMBINED-PROMPT.md)
```

## License

MIT — see [LICENSE](LICENSE).
