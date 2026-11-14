#!/usr/bin/env bash
# SD Agent Team 自动安装脚本
# 探测本机已安装的 Agent 工具，按各工具的约定自动安装 Skill 包
#
# 用法：
#   bash adapters/install.sh                # 探测并安装到所有检测到的工具（用户级）
#   bash adapters/install.sh --dry-run      # 只预览会做什么，不实际写入
#   bash adapters/install.sh --only claude,codex   # 只安装到指定工具
#   bash adapters/install.sh --project /path/to/repo  # 安装为项目级（写入项目目录）
#
# 安全性：只新增文件 / 按标记追加内容，绝不删除或覆盖已有配置
set -euo pipefail

SRC="$(cd "$(dirname "$0")/.." && pwd)"
HOME_DIR="${HOME:-$(cd ~ && pwd)}"
AGENTS="00-orchestrator 01-requirements 02-prototype 03-architecture 04-detail-design 05-developer 06-tester 07-release 08-notifier"
MARKER_BEGIN="<!-- SD-AGENT-TEAM:BEGIN (auto-generated, do not edit inside) -->"
MARKER_END="<!-- SD-AGENT-TEAM:END -->"

DRY=0; ONLY=""; PROJECT=""; CUSTOM_SKILLS=""; CUSTOM_AGENTS=""; CUSTOM_PROMPT=""
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY=1 ;;
    --only) ONLY="$2"; shift ;;
    --project) PROJECT="$2"; shift ;;
    --skills-to) CUSTOM_SKILLS="$2"; shift ;;
    --agents-to) CUSTOM_AGENTS="$2"; shift ;;
    --prompt-to) CUSTOM_PROMPT="$2"; shift ;;
    *) echo "未知参数: $1"; exit 1 ;;
  esac; shift
done
want() { [ -z "$ONLY" ] && return 0; case ",$ONLY," in *",$1,"*) return 0;; esac; return 1; }
has_cmd() { command -v "$1" >/dev/null 2>&1; }
act() { if [ "$DRY" = "1" ]; then echo "  [dry-run] $*"; else echo "  [install] $*"; eval "$@"; fi; }

install_skills_dir() {  # $1=目标 skills 目录
  local dest="$1"
  act "mkdir -p '$dest'"
  for a in $AGENTS; do
    act "cp -r '$SRC/$a' '$dest/'"
  done
}

append_block() {  # $1=目标AGENTS.md $2=仓库内包路径
  local f="$1" ref="$2"
  if [ -f "$f" ] && grep -q "SD-AGENT-TEAM:BEGIN" "$f" 2>/dev/null; then
    echo "  [skip] $f 已含安装块"
    return
  fi
  local tmp; tmp="$HOME_DIR/.sd-agent-block.tmp"
  {
    echo "$MARKER_BEGIN"
    echo
    cat "$SRC/adapters/AGENTS.md"
    echo
    echo "**Skill 包位置：** \`$ref\`（相对/绝对路径以本行为准）"
    echo
    echo "$MARKER_END"
  } > "$tmp"
  act "mkdir -p \"\$(dirname '$f')\""
  if [ -f "$f" ]; then
    act "cat '$tmp' >> '$f'"
  else
    act "cp '$tmp' '$f'"
  fi
  rm -f "$tmp"
}

echo "=========================================="
echo "SD Agent Team 安装器 (源: $SRC)"
[ "$DRY" = "1" ] && echo "模式: DRY-RUN 预览"
[ -n "$PROJECT" ] && echo "模式: 项目级 → $PROJECT"
echo "=========================================="
detected=""

# ---------- 1. Claude Code ----------
if want claude && { [ -d "$HOME_DIR/.claude" ] || has_cmd claude; }; then
  detected="$detected claude"
  echo "[claude] Claude Code 检测到 → 安装到 ~/.claude/skills/"
  install_skills_dir "$HOME_DIR/.claude/skills"
fi

# ---------- 2. WorkBuddy ----------
if want workbuddy && [ -d "$HOME_DIR/.workbuddy/skills" ]; then
  detected="$detected workbuddy"
  echo "[workbuddy] WorkBuddy 检测到 → 安装到 ~/.workbuddy/skills/"
  install_skills_dir "$HOME_DIR/.workbuddy/skills"
fi

# ---------- 3. Codex ----------
if want codex && { [ -d "$HOME_DIR/.codex" ] || has_cmd codex; }; then
  detected="$detected codex"
  echo "[codex] Codex 检测到 → 追加引用块到 ~/.codex/AGENTS.md"
  append_block "$HOME_DIR/.codex/AGENTS.md" "$SRC"
fi

# ---------- 4. OpenCode ----------
if want opencode && { [ -d "$HOME_DIR/.config/opencode" ] || has_cmd opencode; }; then
  detected="$detected opencode"
  echo "[opencode] OpenCode 检测到 → 追加引用块到 ~/.config/opencode/AGENTS.md"
  append_block "$HOME_DIR/.config/opencode/AGENTS.md" "$SRC"
fi

# ---------- 5. Gemini CLI ----------
if want gemini && { [ -d "$HOME_DIR/.gemini" ] || has_cmd gemini; }; then
  detected="$detected gemini"
  echo "[gemini] Gemini CLI 检测到 → 追加引用块到 ~/.gemini/GEMINI.md"
  append_block "$HOME_DIR/.gemini/GEMINI.md" "$SRC"
fi

# ---------- 6. Cursor（仅项目级有意义）----------
if want cursor && [ -d "$HOME_DIR/.cursor" ]; then
  detected="$detected cursor"
  if [ -n "$PROJECT" ]; then
    echo "[cursor] Cursor 检测到 → 项目规则 .cursor/rules/"
    act "mkdir -p '$PROJECT/.cursor/rules'"
    act "cp '$SRC/adapters/AGENTS.md' '$PROJECT/.cursor/rules/sd-agent-team.mdc'"
  else
    echo "[cursor] Cursor 检测到，但其用户级规则在设置界面配置——建议用 --project 安装项目级规则"
  fi
fi

# ---------- 7. 自定义工具注册（tools.local，适配 ZCode / DeepSeek Harness 等未内置工具）----------
# 格式每行: 工具名|类型|目标路径  类型: skills=技能目录 agents=AGENTS.md文件 prompt=提示词目标目录
local_file="$SRC/adapters/tools.local"
if [ -f "$local_file" ]; then
  while IFS='|' read -r name type path; do
    case "$name" in ''|\#*) continue ;; esac
    if want "$name"; then
      case "$type" in
        skills) echo "[$name] 注册(skills目录) → $path"; install_skills_dir "$path" ;;
        agents) echo "[$name] 注册(AGENTS.md) → $path"; append_block "$path" "$SRC" ;;
        prompt) echo "[$name] 注册(system prompt) → $path"; act "mkdir -p '$path'"; act "cp '$SRC/adapters/COMBINED-PROMPT.md' '$path/'" ;;
        *) echo "[$name] 未知类型 '$type'，跳过（应为 skills/agents/prompt）" ;;
      esac
      detected="$detected $name"
    fi
  done < "$local_file"
fi

# ---------- 8. 命令行直指定（一次性安装，无需注册文件）----------
if [ -n "$CUSTOM_SKILLS" ]; then
  echo "[custom] --skills-to → $CUSTOM_SKILLS"; install_skills_dir "$CUSTOM_SKILLS"; detected="$detected custom"
fi
if [ -n "$CUSTOM_AGENTS" ]; then
  echo "[custom] --agents-to → $CUSTOM_AGENTS"; append_block "$CUSTOM_AGENTS" "$SRC"; detected="$detected custom"
fi
if [ -n "$CUSTOM_PROMPT" ]; then
  echo "[custom] --prompt-to → $CUSTOM_PROMPT"
  act "mkdir -p '$CUSTOM_PROMPT'"
  act "cp '$SRC/adapters/COMBINED-PROMPT.md' '$CUSTOM_PROMPT/'"
  detected="$detected custom"
fi

# ---------- 9. 项目级安装 ----------
if [ -n "$PROJECT" ]; then
  echo "[project] 项目级安装 → $PROJECT"
  act "mkdir -p '$PROJECT'"
  act "cp -r '$SRC' '$PROJECT/sd-agent-team'"
  act "cp '$SRC/adapters/AGENTS.md' '$PROJECT/AGENTS.md'"
  [ -d "$HOME_DIR/.claude" ] && install_skills_dir "$PROJECT/.claude/skills"
fi

echo "=========================================="
if [ -z "$detected" ] && [ -z "$PROJECT" ]; then
  echo "未检测到已知 Agent 工具。"
  echo "三种接入方式："
  echo "  1) 命令行直指定:  bash install.sh --skills-to <目录> / --agents-to <AGENTS.md路径> / --prompt-to <目录>"
  echo "  2) 注册文件:      复制 adapters/tools.local.example 为 adapters/tools.local，按行登记你的工具"
  echo "  3) Harness/API:   直接用 adapters/COMBINED-PROMPT.md 作为 system prompt"
else
  echo "检测到并处理: ${detected:-（项目级）}"
  [ "$DRY" = "1" ] && echo "以上为预览。去掉 --dry-run 重新运行即正式安装。"
  echo "安装后请重启各工具会话以加载新技能。"
fi
