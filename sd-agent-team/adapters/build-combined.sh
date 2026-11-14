#!/usr/bin/env bash
# 把全部 SKILL.md 合并为单文件系统提示词，供无文件读取能力的 Harness/API 使用
# 用法：bash adapters/build-combined.sh  →  生成 adapters/COMBINED-PROMPT.md
# 源 Skill 变更后重跑本脚本即可，勿手改生成文件
set -euo pipefail
cd "$(dirname "$0")/.."

out="adapters/COMBINED-PROMPT.md"
agents="00-orchestrator 01-requirements 02-prototype 03-architecture 04-detail-design 05-developer 06-tester 07-release 08-notifier"

{
  echo "# SD Agent Team — 单文件合并提示词（自动生成）"
  echo
  echo "你是研发流水线的多角色 Agent。每个用户请求先判断属于哪个阶段/角色，"
  echo "然后严格按对应角色的定义执行；无明确归属时按 00-orchestrator 的规则调度。"
  echo "所有阶段产物按各角色定义写入项目 docs/ 目录，判定以文件为准。"
  echo
  for a in $agents; do
    echo ""
    echo "=============================================================="
    echo ""
    cat "$a/SKILL.md"
    echo ""
  done
} > "$out"

echo "已生成 $out（$(wc -l < "$out") 行）"
