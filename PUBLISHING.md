# 发布到 npm（维护者文档）

本仓库已具备 npm CLI 包结构：`package.json` + `bin/cli.mjs`（Node 实现，不依赖 bash，Windows 原生可用）。
`godevagent` 这个包名在 npm 上**未被占用**。

## 一、发布前的一次性准备

```bash
# 1. 注册/登录 npm 账号（若无）
npm adduser            # 或 npm login
npm whoami             # 应输出你的用户名

# 2. 确认包名可用
npm view godevagent version    # 应为 404 Not Found
```

若 `godevagent` 被抢注，改用作用域包：把 `package.json` 的 `name` 改为 `@tozhouht/godevagent`，
并把 `publishConfig` 设为 `{ "access": "public" }`（作用域包默认私有，必须显式公开）。

## 二、本地自检（每次发布前）

```bash
npm test                # = node bin/cli.mjs --dry-run，确认探测与安装逻辑正常
npm pack --dry-run      # 确认打包内容（应含 bin/、sd-agent-team/、README、LICENSE）
node bin/cli.mjs list   # 本机工具探测结果
```

## 三、发布

```bash
npm version patch       # 或 minor / major，自动改版本号并打 git tag
npm publish             # 发布到 registry.npmjs.org
git push --follow-tags  # 版本 tag 一起推上去
```

发布后验证：

```bash
npx godevagent@latest --version
npx godevagent list
```

## 四、自动化发布（推荐，GitHub Actions）

在仓库设置里添加 Secret `NPM_TOKEN`（npm → Account → Access Tokens → Granular Access Token，
权限选 Read and write，作用域仅 `godevagent`），然后创建 `.github/workflows/publish.yml`：

```yaml
name: publish
on:
  push:
    tags: ['v*']
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: https://registry.npmjs.org
      - run: npm test
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

之后发版流程：`npm version patch && git push --follow-tags`。

## 五、无需发布也能用（立即可用）

推到 GitHub 后，`npx` 可以直接从仓库安装，跳过 npm 发布：

```bash
npx github:tozhouht/GoDevAgent --dry-run
npx github:tozhouht/GoDevAgent
```

原理：npx 检测到仓库里有 `package.json` 的 `bin` 字段，会临时 clone 并执行。
缺点是没有版本管理、每次拉最新代码，适合尝鲜；正式分发仍建议发 npm。

## 六、CLI 行为约定（避免踩坑）

- **不在 postinstall 里自动写入用户目录**——安装动作必须显式执行 `npx godevagent`，符合 npm 生态惯例
- 技能包先落盘到稳定目录 `~/.godevagent/skills`（可用 `GODEVA_HOME` 覆盖），再从那里分发；因为 npx 缓存目录是临时的，AGENTS.md 里不能引用它
- `--dry-run` 全程只打印不写入，可安全用于 CI 与首次体验
- 重复运行幂等：skills 目录覆盖拷贝，AGENTS.md 按标记块追加一次，不会重复插入

## 七、版本与兼容

- `engines.node >= 18`（用到 `fs.cpSync`、`node:` 前缀导入）
- 升级技能内容时 bump `minor`；仅改文档 bump `patch`；破坏 CLI 参数 bump `major`
