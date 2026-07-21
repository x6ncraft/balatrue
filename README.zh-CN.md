# Balatrue（猜丑牌）

[开始游戏](https://balatrue.x6n.me/) · [English](README.md)

Balatrue 是一款以《小丑牌》小丑卡为谜底的每日猜谜网页游戏。你有六次机会；每次选择一张
小丑牌，系统会从稀有度、基础价格或获取方式、主效果、触发时机和依赖条件五个方面给出线索。

玩法形式受到 [Wordle](https://www.nytimes.com/games/wordle/index.html)、
[汉兜（Handle）](https://github.com/antfu/handle)和 BLAST.tv 的
[Counter-Strikle](https://blast.tv/counter-strikle/daily)启发。

## 当前状态

游戏已在 [balatrue.x6n.me](https://balatrue.x6n.me/) 以经过测试的纯前端静态站点发布，干净
checkout 可以生成同样的独立构建。项目原创代码采用 MIT 许可证；仓库有意保留另行标注、不适用
该许可证的上游审查数据和小丑卡图，具体边界见下文。项目不声称取得 Balatro 权利人的授权。

## 现在可以玩什么

- **今日谜牌：**北京时间每天一个答案，最多六次机会，刷新后恢复本地进度。
- **无尽牌局：**使用本地洗牌袋连续开局，一轮 150 张内不重复。
- **随手开局：**可以输入心里想到的牌，也可以点选五张随机牌中的任意一张；都不合意时一键换一组。
- **五项线索：**稀有度、基础价格或获取方式、主效果、触发时机和依赖条件。
- **分层线索：**主效果和依赖条件在棋盘上各显示 7 个大类，完整机制与条件细项仍决定是否完全
  吻合；黄色格只在有帮助时说明猜测中已经吻合的细项、同类差异，或答案另有内容，不直接写出
  尚未猜到的谜底细项。触发时机用 8 个大类比较，同时保留 22 个精确事件供查阅。
- **输入联想：**支持游戏内英文名、简体中文名、全拼和拼音首字母；所有匹配项都保留在可滚动
  列表中。
- **线索字典：**随时查看比较类别及其机制、事件和条件细项，不影响战绩；五个列头都能直达对应章节。
- **小丑图鉴：**可搜索、筛选 150 张牌，并在紧凑棋盘线索之外保留完整分类说明；每日局进行中
  打开后会标记为图鉴辅助局，不计战绩。
- **本地战绩与分享：**记录胜率、连胜和平均出牌数，并生成不泄露答案的分享结果。
- **移动端：**常见手机宽度下，牌面身份与五项线索保持六列对齐；较长的黄色解释移到该次猜测
  下方完整展示，340px 及以下再使用短标签和牌名独占行的兜底布局。

Balatrue 是纯前端游戏，答案可以被检查，因此不承诺防作弊，也不适合有奖竞赛。

## 本地开发

项目使用 React 19、TypeScript、Vite 和 Bun 1.3.11。Vite 同时要求 Node.js `^20.19.0` 或
`>=22.12.0`。

```bash
bun install --frozen-lockfile
bun run dev
```

运行完整技术检查与浏览器旅程：

```bash
bun run check
bunx playwright install chromium # 新机器首次运行时安装浏览器
bun run test:e2e
```

构建并预览静态站点：

```bash
bun run build
bun run preview
```

修改经审查的分类规则后，可以在不访问网络的情况下重建并校验仓库内的运行数据：

```bash
bun run data:regenerate
bun run data:validate
```

可部署产物位于 `dist/`。远程数据同步只供维护者在确认数据源访问条件后使用，默认关闭；仓库内的
来源快照使普通校验与构建无需访问 Wiki。执行同步命令前先读[数据来源与边界](docs/data-sources.md)。

`package.json` 中的 `private: true` 只用于防止误发到 npm，不限制 GitHub 可见性，也不改变 MIT
许可证。

## 项目结构

```text
src/          React 界面、游戏规则、搜索、本地化与生成后的运行数据
data/         随仓库提交的逐卡来源记录与仅供仓库审查的上游资料
scripts/      数据生成、数据校验与发布产物检查
tests/e2e/    Playwright 浏览器旅程
docs/         产品、架构、设计、权利与可复现发布说明
public/       用于识别牌面的低分辨率小丑卡图
```

代码阅读路径与模块边界见[实现结构](docs/architecture.md)。

## 数据、素材与权利

Balatrue 是由粉丝制作的免费、非商业猜谜游戏，目前没有广告、付费、奖品、赞助或捐赠；项目与
LocalThunk 或 Playstack 无关联，也未获其赞助、背书或认可。Balatro 由 LocalThunk 开发、
Playstack 发行，相关名称与美术素材的权利归相应权利人所有。

仓库保留 150 张经由社区资料站 [Balatro Wiki](https://balatrowiki.org/) 获取的低分辨率小丑卡图，
只用于在粉丝游戏中识别牌面。Wiki 是资料与出处来源，本文不把它写成原作权利人或卡图授权方；
这些图片不适用 MIT 许可证。每张图片的参考页、来源 URL、摘要和尺寸记录在
[`data/jokers.provenance.generated.json`](data/jokers.provenance.generated.json)。来源记录、署名、
免责声明与下架机制不会产生授权，因此公开再分发和展示仍有残余权利风险。

如有侵权疑问，请联系 [@x6ncraft](https://x.com/x6ncraft)。项目会优先立即下线相关素材，再核对并
按需要移除或替换。

浏览器目录只包含玩法需要的名称与事实、项目整理的分类和来源摘要。完整的规范化英文效果与解锁
描述保存在 [`data/upstream/jokers.wiki.generated.json`](data/upstream/jokers.wiki.generated.json)，
用于后续复核与数据升级；它属于第三方来源审查资料，不适用项目 MIT 许可证，也不会进入生产
构建。同目录的[来源说明](data/upstream/README.md)记录 Wiki 署名、来源站许可声明、Fandom 迁移
沿革、转换方式及可能涉及的原作文本权利，不声称一种 CC 许可证覆盖全部字段。

发布或再分发前，请先读[许可范围](LICENSE_SCOPE.md)、[素材与数据说明](ASSET_NOTICE.md)、
[权利与发布说明](docs/legal-notice.md)、[发布清单](docs/release-checklist.md)和
[第三方声明](THIRD_PARTY_NOTICES.md)。

## 文档

- [产品与规则](docs/product.md)
- [实现结构](docs/architecture.md)
- [数据来源与边界](docs/data-sources.md)
- [视觉与交互](docs/design.md)
- [验收标准](docs/acceptance.md)
- [发布清单](docs/release-checklist.md)
- [权利与发布说明](docs/legal-notice.md)
- [路线图](docs/roadmap.md)
- [参与贡献](CONTRIBUTING.md)

## 许可证

Balatrue 原创的功能定义、游戏逻辑、UI、工程代码，以及说明这些原创内容的项目文档采用
[MIT 许可证](LICENSE)。该许可证不覆盖 Balatro 相关名称、商标、游戏文本、小丑卡图、第三方
字体、依赖或
[素材与数据说明](ASSET_NOTICE.md)、[第三方声明](THIRD_PARTY_NOTICES.md)中列明的其他材料。
