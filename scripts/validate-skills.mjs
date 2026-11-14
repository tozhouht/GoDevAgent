#!/usr/bin/env node
/*
 * 技能包完整性校验：SKILL.md frontmatter、目录编号连续性、合并提示词可生成
 * 用法：node scripts/validate-skills.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packDir = path.join(root, 'sd-agent-team');
let errors = 0;

const fail = (msg) => { console.error(`\x1b[31m✗\x1b[0m ${msg}`); errors++; };

/* 1. 角色目录与 SKILL.md */
const dirs = fs.readdirSync(packDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^\d{2}-[a-z-]+$/.test(d.name))
  .map((d) => d.name)
  .sort();

if (dirs.length === 0) fail('sd-agent-team 下没有角色目录');

for (const d of dirs) {
  const file = path.join(packDir, d, 'SKILL.md');
  if (!fs.existsSync(file)) { fail(`${d}: 缺少 SKILL.md`); continue; }
  const text = fs.readFileSync(file, 'utf8');
  if (!text.startsWith('---\n')) { fail(`${d}: 缺少 frontmatter`); continue; }
  const fm = text.slice(4, text.indexOf('\n---', 4));
  for (const key of ['name', 'description']) {
    const re = new RegExp(`^${key}:\\s*\\S`, 'm');
    if (!re.test(fm)) fail(`${d}: frontmatter 缺少或为空 ${key}`);
  }
  const name = (fm.match(/^name:\s*(\S+)/m) || [])[1];
  if (name && name !== `sd-${d.slice(3)}` && !name.startsWith('sd-')) {
    fail(`${d}: name 应以 sd- 开头（当前 ${name}）`);
  }
  if (text.trim().split('\n').length < 15) fail(`${d}: 内容过短，疑似残缺`);
}

/* 2. 编号连续性 00..NN */
const nums = dirs.map((d) => Number(d.slice(0, 2)));
nums.forEach((n, i) => { if (n !== i) fail(`角色编号不连续：期望 ${String(i).padStart(2, '0')}，实际 ${String(n).padStart(2, '0')}`); });

/* 3. 引用到的模板必须存在 */
const templates = path.join(packDir, 'templates');
for (const d of dirs) {
  const text = fs.readFileSync(path.join(packDir, d, 'SKILL.md'), 'utf8');
  for (const m of text.matchAll(/templates\/([\w.-]+\.md)/g)) {
    if (!fs.existsSync(path.join(templates, m[1]))) fail(`${d}: 引用的模板不存在 templates/${m[1]}`);
  }
}

/* 4. 合并提示词可生成 */
const combined = path.join(packDir, 'adapters', 'COMBINED-PROMPT.md');
if (fs.existsSync(combined)) {
  const t = fs.readFileSync(combined, 'utf8');
  if (t.length < 5000) fail('COMBINED-PROMPT.md 内容异常偏小，请重跑 build-combined.sh');
  for (const d of dirs) {
    const sk = fs.readFileSync(path.join(packDir, d, 'SKILL.md'), 'utf8');
    const fmName = (sk.slice(4, sk.indexOf('\n---', 4)).match(/^name:\s*(\S+)/m) || [])[1];
    if (!fmName) continue;
    if (!t.includes(fmName)) fail(`COMBINED-PROMPT.md 未包含角色 ${fmName}（${d}），请重跑 build-combined.sh`);
  }
} else {
  fail('缺少 adapters/COMBINED-PROMPT.md（运行 bash adapters/build-combined.sh）');
}

/* 5. 包配置 */
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (!pkg.bin || !pkg.bin.godevagent) fail('package.json 缺少 bin.godevagent');
if (!fs.existsSync(path.join(root, pkg.bin?.godevagent || ''))) fail('bin 指向的文件不存在');
if (!pkg.files?.includes('sd-agent-team/')) fail('package.json files 未包含 sd-agent-team/');

console.log('');
if (errors) { console.error(`校验失败：${errors} 个问题`); process.exit(1); }
console.log(`\x1b[32m✓\x1b[0m 校验通过：${dirs.length} 个角色、模板引用、合并提示词、包配置均正常`);
