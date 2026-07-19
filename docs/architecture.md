# 实现结构

本页说明当前代码如何承载已经确认的产品规则。产品语义以 `product.md` 为准，数据事实以
`data-sources.md` 为准。

## 运行入口

```text
src/main.tsx
  └─ src/App.tsx
       ├─ components/   输入、猜测行、结果、字典、图鉴和战绩
       ├─ game/         每日轮换、比较、牌局、存档与分享
       ├─ data/         运行时类型与生成后的小丑目录
       ├─ search/       中英文与拼音索引
       ├─ i18n/         中英文界面文案
       ├─ state/        本地战绩
       └─ ui/           玩家线索标签和小丑属性格式化
```

`App.tsx` 负责组合页面与浏览器状态，不拥有小丑分类规则。每日答案、反馈、存档兼容和统计分别
留在相邻模块中，组件只接收已经计算好的结果。

## 数据流

```text
维护者远程同步（默认关闭）
  → scripts/sync-jokers.ts
  ├─ src/data/jokers.generated.ts                  浏览器玩法字段与来源摘要，随仓库提交
  ├─ data/jokers.provenance.generated.json         逐卡公开来源记录，随仓库提交
  ├─ public/jokers/*.png                           用于牌面识别的低分辨率卡图
  └─ data/restricted/jokers.audit.generated.json   完整英文来源文本，仅限本地且被 Git 忽略

src/data/jokers.generated.ts
  → game/clue-model.ts  c9 原始分类投影为 g3 玩家线索
  → game/compare.ts     五项反馈
  → React 界面
```

生成器先用英文来源文本推导分类，再分别写出运行目录、公开来源记录和本地审计文件。运行数据只
保留摘要、类型和玩法字段；公开来源记录保留参考页、图片 URL、摘要与尺寸，不包含完整效果和
解锁原文。

`scripts/validate-jokers.ts` 始终核对运行目录、150 条公开来源记录与本地图片。若维护者本地存在
受限审计文件，再额外重新计算原文摘要；干净 checkout 没有该文件也能完成全部标准校验。
`scripts/public-provenance.ts` 只在维护者需要从本地审计数据重建公开来源记录时使用。

远程同步默认拒绝执行，也不能进入 CI。只有在维护者确认数据源允许自动访问后，才显式设置
`BALATRUE_REMOTE_SYNC_ALLOWED=1`。正常构建不访问任何远程数据源。

## 牌局与存档

- `daily.ts` 使用稳定种子生成 150 天轮换，并以北京时间日期确定今日答案。
- `session.ts` 维护六次机会、胜负和图鉴辅助状态。
- `compare.ts` 只比较 `Joker` 的版本化玩法字段。
- `persistence.ts` 把数据分类版本与玩家线索版本写入键名；升级时只迁移能够按新规则完整重放的
  牌局。
- 语言、今日局、无尽局洗牌袋和战绩存入 `localStorage`。写入失败时牌局仍可继续。
- 当前没有账号、服务器存档、排行榜或浏览器统计 SDK。

## 构建与发布产物

Vite 生成纯静态 `dist/`。构建插件同时写入项目 MIT 许可证、`ASSET_NOTICE.md`、150 条逐卡来源
记录、`THIRD_PARTY_NOTICES.md` 和运行依赖的原始许可证到 `dist/legal/`；
`scripts/validate-dist.ts` 缺少任何一项或发现本地受限字段都会使构建失败。

`dist/` 包含 150 张低分辨率卡图。它们服务于免费、非商业粉丝游戏中的牌面识别，明确排除 MIT；
来源记录、免责声明和下架机制不构成授权，发布者仍承担 `legal-notice.md` 记录的残余风险。

根 MIT 许可证允许公开项目原创代码。现有 Git 历史曾包含完整上游原文，因此实际切换仓库可见性
前仍需在用户确认后建立干净根提交或新公开仓库；这项历史动作不影响干净 checkout 的当前构建。

## 验证路径

- 单元测试：线索投影、比较、每日轮换、牌局、存档、搜索、翻译、战绩与分享。
- 数据检查：数量、稀有度、两层版本、公开来源记录、摘要、图片、玩家文案和五维签名唯一性；本地
  审计文件存在时追加原文核对。
- Playwright：桌面和手机核心旅程、输入法、键盘、弹层焦点、图鉴辅助局与响应式布局。
- 完整入口：`bun run check`；浏览器旅程：`bun run test:e2e`。
