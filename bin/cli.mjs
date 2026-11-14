#!/usr/bin/env node
/*
 * godevagent — 安装器 CLI
 *
 * npx godevagent                     探测本机 Agent 工具并安装
 * npx godevagent --dry-run           只预览
 * npx godevagent --only claude,codex 只装指定工具
 * npx godevagent --project ./repo    安装为项目级
 * npx godevagent list                列出探测结果与安装状态
 * npx godevagent prompt [dir]        输出合并版系统提示词（默认打印路径，给 dir 则写入该目录）
 *
 * 设计要点：技能包先落盘到稳定目录 ~/.godevagent/skills（npx 缓存是临时的，不能长期引用），
 * 再从那里安装到各工具，保证 AGENTS.md 里的引用路径不会失效。
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = path.resolve(__dirname, '..');
const PKG_SRC = path.join(PKG_ROOT, 'sd-agent-team');
const HOME = os.homedir();
const STABLE_DIR = path.join(HOME, '.godevagent');
const STABLE_SKILLS = path.join(STABLE_DIR, 'skills');

const AGENTS = [
  '00-orchestrator', '01-requirements', '02-prototype', '03-architecture',
  '04-detail-design', '05-developer', '06-tester', '07-release', '08-notifier',
];
const MARK_BEGIN = '<!-- SD-AGENT-TEAM:BEGIN (auto-generated, do not edit inside) -->';
const MARK_END = '<!-- SD-AGENT-TEAM:END -->';

/* ---------------- 参数解析 ---------------- */
const argv = process.argv.slice(2);
const opt = {
  cmd: 'install', dryRun: false, only: [], project: '',
  skillsTo: '', agentsTo: '', promptTo: '',
};
const valueFlags = { '--only': 'only', '--project': 'project', '--skills-to': 'skillsTo', '--agents-to': 'agentsTo', '--prompt-to': 'promptTo' };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--dry-run' || a === '-n') opt.dryRun = true;
  else if (a === '--help' || a === '-h') opt.cmd = 'help';
  else if (a === '--version' || a === '-v') opt.cmd = 'version';
  else if (valueFlags[a]) {
    const v = argv[++i];
    if (v === undefined) die(`缺少参数值: ${a}`);
    if (a === '--only') opt.only = v.split(',').map((s) => s.trim()).filter(Boolean);
    else opt[valueFlags[a]] = v;
  } else if (a === 'install' || a === 'list' || a === 'prompt' || a === 'help') opt.cmd = a;
  else if (a.startsWith('-')) die(`未知参数: ${a}`);
  else if (opt.cmd === 'prompt') opt.project = opt.project || '';  // prompt <dir> 位置参数
  else opt.project = a;
}
if (opt.cmd === 'prompt' && argv.includes('prompt')) {
  const idx = argv.indexOf('prompt');
  if (argv[idx + 1] && !argv[idx + 1].startsWith('-')) opt.promptArg = argv[idx + 1];
}

/* ---------------- 工具函数 ---------------- */
function die(msg) { console.error(`\x1b[31m错误\x1b[0m ${msg}`); process.exit(1); }
function ok(msg) { console.log(`\x1b[32m✓\x1b[0m ${msg}`); }
function info(msg) { console.log(`\x1b[36m·\x1b[0m ${msg}`); }
function step(msg) { console.log(opt.dryRun ? `  \x1b[90m[dry-run]\x1b[0m ${msg}` : `  \x1b[90m[install]\x1b[0m ${msg}`); }
const exists = (p) => { try { fs.accessSync(p); return true; } catch { return false; } };
const isDir = (p) => { try { return fs.statSync(p).isDirectory(); } catch { return false; } };

function onPath(cmd) {
  const exts = process.platform === 'win32' ? ['.cmd', '.exe', '.bat', ''] : [''];
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    if (!dir) continue;
    for (const ext of exts) if (exists(path.join(dir, cmd + ext))) return true;
  }
  return false;
}

function copyDir(src, destParent) {
  const target = path.join(destParent, path.basename(src));
  if (opt.dryRun) { step(`copy ${src} → ${target}`); return; }
  fs.mkdirSync(destParent, { recursive: true });
  fs.rmSync(target, { recursive: true, force: true });
  fs.cpSync(src, target, { recursive: true });
  step(`copied ${path.basename(src)} → ${destParent}`);
}

function sourceDir() {
  // 优先用稳定目录（npx 缓存不可靠），没有则用包内目录
  return isDir(STABLE_SKILLS) ? STABLE_SKILLS : PKG_SRC;
}
function ensureStable() {
  if (opt.dryRun || isDir(STABLE_SKILLS)) return sourceDir();
  fs.mkdirSync(STABLE_DIR, { recursive: true });
  fs.cpSync(PKG_SRC, STABLE_SKILLS, { recursive: true });
  fs.writeFileSync(path.join(STABLE_DIR, 'VERSION'), readVersion() + '\n');
  info(`技能包已落盘到稳定目录: ${STABLE_SKILLS}`);
  return STABLE_SKILLS;
}
function readVersion() {
  try { return JSON.parse(fs.readFileSync(path.join(PKG_ROOT, 'package.json'), 'utf8')).version; } catch { return '0.0.0'; }
}

function installSkills(dest) {
  const src = ensureStable();
  if (!opt.dryRun) fs.mkdirSync(dest, { recursive: true });
  for (const a of AGENTS) copyDir(path.join(src, a), dest);
}

function appendAgentsBlock(file, refRoot) {
  const block = [
    MARK_BEGIN, '',
    fs.readFileSync(path.join(PKG_ROOT, 'sd-agent-team', 'adapters', 'AGENTS.md'), 'utf8').trim(),
    '', `**Skill 包位置：** \`${refRoot}\``, '', MARK_END, '',
  ].join('\n');
  if (exists(file) && fs.readFileSync(file, 'utf8').includes('SD-AGENT-TEAM:BEGIN')) {
    info(`${file} 已含安装块，跳过`);
    return;
  }
  if (opt.dryRun) { step(`append block → ${file}`); return; }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, (exists(file) ? '\n' : '') + block);
  step(`appended block → ${file}`);
}

function buildCombined(src) {
  const head = '# SD Agent Team — 单文件合并提示词（自动生成）\n\n你是研发流水线的多角色 Agent。每个用户请求先判断属于哪个阶段/角色，然后严格按对应角色的定义执行；无明确归属时按 00-orchestrator 的规则调度。所有阶段产物按各角色定义写入项目 docs/ 目录，判定以文件为准。\n';
  return head + AGENTS.map((a) => `\n\n${'='.repeat(62)}\n\n${fs.readFileSync(path.join(src, a, 'SKILL.md'), 'utf8')}`).join('');
}

/* ---------------- 工具探测 ---------------- */
const tools = [
  { id: 'claude', label: 'Claude Code', kind: 'skills', dest: path.join(HOME, '.claude', 'skills'), detect: () => isDir(path.join(HOME, '.claude')) || onPath('claude') },
  { id: 'workbuddy', label: 'WorkBuddy', kind: 'skills', dest: path.join(HOME, '.workbuddy', 'skills'), detect: () => isDir(path.join(HOME, '.workbuddy', 'skills')) || onPath('workbuddy') },
  { id: 'codex', label: 'Codex', kind: 'agents', dest: path.join(HOME, '.codex', 'AGENTS.md'), detect: () => isDir(path.join(HOME, '.codex')) || onPath('codex') },
  { id: 'opencode', label: 'OpenCode', kind: 'agents', dest: path.join(HOME, '.config', 'opencode', 'AGENTS.md'), detect: () => isDir(path.join(HOME, '.config', 'opencode')) || onPath('opencode') },
  { id: 'gemini', label: 'Gemini CLI', kind: 'agents', dest: path.join(HOME, '.gemini', 'GEMINI.md'), detect: () => isDir(path.join(HOME, '.gemini')) || onPath('gemini') },
  { id: 'cursor', label: 'Cursor', kind: 'cursor', dest: '', detect: () => isDir(path.join(HOME, '.cursor')) || onPath('cursor') },
];

const wanted = (id) => opt.only.length === 0 || opt.only.includes(id) || opt.only.includes('custom');

/* ---------------- 命令实现 ---------------- */
function cmdList() {
  console.log('\n检测本机 Agent 工具:\n');
  for (const t of tools) {
    const hit = t.detect();
    const installed = t.kind === 'skills'
      ? isDir(path.join(t.dest, '00-orchestrator'))
      : (exists(t.dest) && fs.readFileSync(t.dest, 'utf8').includes('SD-AGENT-TEAM:BEGIN'));
    console.log(`  ${hit ? '\x1b[32m●\x1b[0m' : '\x1b[90m○\x1b[0m'} ${t.label.padEnd(14)} ${hit ? (installed ? '已安装' : '可安装') : '未检测到'}`);
  }
  console.log(`\n稳定目录: ${STABLE_SKILLS} ${isDir(STABLE_SKILLS) ? '(已存在)' : '(尚未创建)'}`);
  console.log(`版本: ${readVersion()}\n`);
}

function cmdInstall() {
  const ver = readVersion();
  console.log(`\nGoDevAgent v${ver} 安装器${opt.dryRun ? ' (dry-run 预览)' : ''}\n`);
  if (opt.dryRun) info(`源: ${PKG_SRC}`);
  let n = 0;

  for (const t of tools) {
    if (!wanted(t.id) || !t.detect()) continue;
    if (t.kind === 'cursor' && !opt.project) {
      info('Cursor 检测到：其用户级规则在设置界面配置，建议用 --project 安装项目级');
      continue;
    }
    console.log(`\n[${t.id}] ${t.label}`);
    if (t.kind === 'skills') installSkills(t.dest);
    else if (t.kind === 'agents') appendAgentsBlock(t.dest, ensureStable());
    else if (t.kind === 'cursor' && opt.project) {
      const f = path.join(opt.project, '.cursor', 'rules', 'sd-agent-team.mdc');
      if (opt.dryRun) step(`copy AGENTS.md → ${f}`);
      else { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.copyFileSync(path.join(PKG_ROOT, 'sd-agent-team', 'adapters', 'AGENTS.md'), f); step(`wrote ${f}`); }
    }
    n++;
  }

  if (opt.skillsTo) { console.log(`\n[custom] ${opt.skillsTo}`); installSkills(path.resolve(opt.skillsTo)); n++; }
  if (opt.agentsTo) { console.log(`\n[custom] ${opt.agentsTo}`); appendAgentsBlock(path.resolve(opt.agentsTo), ensureStable()); n++; }
  if (opt.promptTo) {
    console.log(`\n[custom] ${opt.promptTo}`);
    const out = path.join(path.resolve(opt.promptTo), 'COMBINED-PROMPT.md');
    if (opt.dryRun) step(`write combined prompt → ${out}`);
    else { fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, buildCombined(ensureStable())); step(`wrote ${out}`); }
    n++;
  }
  if (opt.project) {
    console.log(`\n[project] ${opt.project}`);
    const dest = path.join(opt.project, 'sd-agent-team');
    if (opt.dryRun) { step(`copy pack → ${dest}`); step(`copy AGENTS.md → ${opt.project}/AGENTS.md`); }
    else {
      fs.mkdirSync(opt.project, { recursive: true });
      fs.rmSync(dest, { recursive: true, force: true });
      fs.cpSync(PKG_SRC, dest, { recursive: true });
      fs.copyFileSync(path.join(PKG_SRC, 'adapters', 'AGENTS.md'), path.join(opt.project, 'AGENTS.md'));
      step(`project-level install → ${opt.project}`);
    }
    n++;
  }

  console.log('');
  if (n === 0) {
    console.log('未检测到可安装的工具。可手动指定：');
    console.log('  npx godevagent --skills-to <目录>   # 有 skills 目录约定的工具');
    console.log('  npx godevagent --agents-to <文件>   # 读 AGENTS.md 的工具');
    console.log('  npx godevagent --prompt-to <目录>   # 纯 Harness / API');
  } else {
    ok(`完成：处理 ${n} 个目标${opt.dryRun ? '（预览模式，未写入）' : ''}。重启各工具会话以加载技能。`);
  }
  console.log('');
}

function cmdPrompt() {
  const dir = opt.promptArg;
  const src = ensureStable();
  if (!dir) { console.log(`合并提示词内容可由以下方式获取：\n  npx godevagent prompt ./out      # 写入 ./out/COMBINED-PROMPT.md\n源码: ${path.join(src)}`); return; }
  const out = path.join(path.resolve(dir), 'COMBINED-PROMPT.md');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, buildCombined(src));
  ok(`已生成 ${out}`);
}

function cmdHelp() {
  console.log(`
GoDevAgent v${readVersion()} — 研发全流程 Agent 团队安装器

用法:
  npx godevagent                       探测并安装到所有检测到的 Agent 工具
  npx godevagent --dry-run             只预览，不写入
  npx godevagent --only claude,codex   只装指定工具
  npx godevagent --project ./repo      安装为项目级（写入项目目录）
  npx godevagent list                  列出探测结果与安装状态
  npx godevagent prompt ./out          生成合并版系统提示词（纯 API/Harness 用）

自定义目标:
  --skills-to <目录>   工具使用 skills 目录约定
  --agents-to <文件>   工具读取 AGENTS.md / GEMINI.md
  --prompt-to <目录>   只能吃 system prompt 的 Harness

环境变量:
  GODEVA_HOME          覆盖稳定目录（默认 ~/.godevagent）
`);
}

/* ---------------- 入口 ---------------- */
if (opt.cmd === 'help') cmdHelp();
else if (opt.cmd === 'version') console.log(readVersion());
else if (opt.cmd === 'list') cmdList();
else if (opt.cmd === 'prompt') cmdPrompt();
else cmdInstall();
