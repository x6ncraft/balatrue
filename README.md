# Balatrue（猜丑牌）

`Balatrue` 是一个通过五项属性线索猜出《小丑牌》（Balatro）小丑卡的网页游戏。每次
打出一张猜测，系统会从稀有度、基础价格、主效果、怎么触发和依赖什么五个维度给出反馈，
逐步缩小答案范围。玩法灵感来自 [Wordle](https://www.nytimes.com/games/wordle/index.html)、
[汉兜（Handle）](https://github.com/antfu/handle)和 BLAST.tv 的
[Counter-Strikle](https://blast.tv/counter-strikle/daily)。

当前处于私人原型阶段，采用纯前端实现；玩法验收通过后再决定公开和部署方式。

## 现在可以玩什么

- 今日谜牌：北京时间每天一个固定答案，最多六次机会，刷新后继续。
- 无尽牌局：使用本地洗牌袋连续开局，一轮 150 张内不重复。
- 五项反馈：稀有度、基础价格／获取、主效果、怎么触发、依赖什么。
- 线索字典：随时查看五项线索的完整枚举，不影响战绩。
- 小丑图鉴：搜索、筛选并浏览 150 张牌；进行中的每日局查看后会标为图鉴辅助局，不计战绩。
- 名称与联想：使用官方中英文名称，并索引中文全拼和拼音首字母，支持键盘操作。
- 本地战绩与分享：保存胜率、连胜和平均出牌数，分享结果不包含答案。
- 移动端：375px 宽度下仍保留一排五项反馈，图鉴和字典使用全屏触控布局。

纯前端版本不会隐藏答案，也不承诺防作弊；它是一款自己和朋友轻松玩的每日谜题。

## 本地开发

项目使用 React 19、TypeScript 和 Vite，本地开发依赖 Bun 1.x 与 Node.js `^20.19.0` 或
`>=22.12.0`：

```bash
bun install
bun run dev
```

完整技术检查：

```bash
bun run check
bun run test:e2e
```

构建产物位于 `dist/`，部署契约为：

```bash
bun install --frozen-lockfile && bun run build
```

本地生产预览：

```bash
bun run build
bun run preview
```

## 文档

- [产品与规则](docs/product.md)
- [数据来源与边界](docs/data-sources.md)
- [视觉与交互](docs/design.md)
- [验收标准](docs/acceptance.md)
- [当前路线](docs/roadmap.md)
- [部署、域名与统计调研](docs/deployment-research.md)
- [权利与发布说明](docs/legal-notice.md)
- [外部阻塞项](docs/blockers.md)

## 关于原作与素材

Balatrue 是一款由 Balatro 粉丝制作的免费猜谜游戏，与 LocalThunk 或 Playstack 没有官方
关联。原作由 LocalThunk 开发、Playstack 发行；Balatro、相关名称与游戏美术的权利归各自
权利人所有。当前仓库保持私有；公开网站或公开包含原作卡图的版本之前，需要先获得合适的
素材使用许可。页面声明只能帮助读者理解项目性质，不能代替授权。具体发布边界见
[权利与发布说明](docs/legal-notice.md)。
