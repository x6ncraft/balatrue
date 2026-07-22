# 权利与发布说明

更新日期：2026-07-22。本文件记录项目采用的权利边界与发布判断，不构成法律意见。

## 项目性质与页面说明

Balatrue 是由粉丝制作的免费、非商业猜谜游戏，当前不用于盈利，没有广告、付费、奖品、赞助或
捐赠，也与 LocalThunk、Playstack 无关联，未获其赞助、背书或认可。Balatro 由 LocalThunk 开发、
Playstack 发行，相关商标、名称和美术素材的权利归相应权利人所有。

页面短说明由 `product.md` 和 `src/i18n/messages.ts` 共同维护，当前为“Balatro 粉丝自制小游戏 ·
非官方出品”。页尾的完整权利说明再写清免费、非商业、无关联、无背书、权利归属和权利／下架联系。
以后加入广告、赞助、捐赠、付费或奖品时，必须重新核对权利边界和页面文案。

署名、来源记录、免责声明和下架机制可以减少混淆、提高可追溯性，但不会产生名称、域名、卡图
或文本使用权，也不消除残余风险。

## 仓库的四层边界

1. **项目原创内容：**根 `LICENSE` 与仓库级 `LICENSE_SCOPE.md` 共同说明 MIT 只许可项目原创的
   功能定义、游戏逻辑、UI、工程代码、工具及项目文档中的原创部分。`package.json` 的
   `private: true` 只防止误发 npm，不限制 GitHub 公开。MIT 不覆盖第三方名称、商标、游戏文本、
   卡图、字体或依赖。
2. **浏览器运行目录：**`src/data/jokers.generated.ts` 只保留玩法需要的名称、事实字段、项目分类、
   固定来源修订和不可逆摘要。生成事实与第三方名称不因位于源码目录就自动适用 MIT。
3. **公开来源记录与卡图：**卡图经由社区资料站 Balatro Wiki 获取；Wiki 由 Weird Gloop 托管，
   在本项目中只承担资料与出处来源角色，不被写成原作权利人或卡图授权方。
   `data/jokers.provenance.generated.json` 逐卡记录小丑资料页、文件说明页、图片 URL、摘要和尺寸。
   `public/jokers/` 的 150 张低分辨率卡图只用于免费、非商业粉丝猜谜中的牌面识别，明确排除 MIT。
   来源记录证明出处，不证明授权；公开展示与再分发仍有残余权利风险。
4. **公开的来源审查快照：**完整英文效果与解锁描述保存在
   `data/upstream/jokers.wiki.generated.json`，用于复核、追溯和后续数据升级。它随仓库公开但不
   进入生产构建，标记为 `NOASSERTION` 并明确排除根 MIT；同目录说明记录 Wiki 贡献者、来源站
   许可声明、Fandom 迁移沿革、转换方式和可能涉及的原作文本权利。

素材与数据的短版声明见 `ASSET_NOTICE.md`，软件和字体声明见 `THIRD_PARTY_NOTICES.md`。

## Git 历史

早期提交曾把完整英文效果与解锁描述放在 `src/data/jokers.generated.ts`；当前结构把同一批文字移到
专门的 `data/upstream/`，避免浏览器加载并让权利边界更清楚。项目现已选择有意保存并公开这些
来源资料，`ASSET_NOTICE.md` 与本文件对第三方文字、卡图和 MIT 排除范围的说明同样适用于历史
版本。重写历史或另建干净根提交不再是公开前置，也不会消除原作文字和卡图本身的残余风险。

## 已核对的公开资料

- [Balatro 官方 Press Kit](https://www.playbalatro.com/press-kit/)是媒体素材入口，未明确授予在独立
  互动网站或源码仓库中使用全部 150 张卡图的权利。
- [Playstack 的视频政策](https://www.playbalatro.com/video-policy)针对带创作内容的视频、直播与
  相关图片，不能扩大解释为网页游戏或源码再分发的通用许可。
- [Balatro 官方条款](https://www.playbalatro.com/terms-and-conditions)保留内容与品牌相关权利，
  并提供 `support@playstack.com` 作为联系路径。
- Balatro Wiki 当前页脚标注 CC BY-NC-SA 3.0；其
  [About 页面](https://balatrowiki.org/w/Balatro_Wiki%3AAbout)记录该站在 2025 年从 Fandom 迁出，
  而 [Fandom 原站](https://balatrogame.fandom.com/wiki/Jokers)标注社区文字为 CC BY-SA。
  Weird Gloop 的通用许可表尚未列出 Balatro Wiki 的迁移日期和转换规则；
  [Creative Commons 的兼容说明](https://wiki.creativecommons.org/wiki/Wiki/cc_license_compatibility)
  也不把 BY-SA 与 BY-NC-SA 改编物视为可直接混用。效果与解锁文案还可能直接来自游戏文本，因此
  本项目不声称整份来源审查快照受单一 CC 许可证覆盖，也不以自己的名义重新授权这些文字。
- [Weird Gloop Licensing](https://meta.weirdgloop.org/w/Licensing)明确提示非文本文件需要逐项核对。
  逐卡来源记录保留 Wiki 文件说明页，但没有把 Wiki 文字声明当作卡图许可，也没有把资料站的
  出处记录写成原始权利人的授权。
- Wiki 运营方的[使用条款](https://weirdgloop.org/terms/)对自动化访问另有约束。因此远程同步默认
  关闭，不进入 CI；再次同步前先确认合适的访问条件。

“免费、非商业”只是风险判断中的一个事实。[美国版权局](https://www.copyright.gov/fair-use/)说明
合理使用还要综合作品性质、使用数量和市场影响；中国著作权法也采用具体的合理使用情形。本项目
不把当前用途表述成已经由法院或权利人确认的合理使用，也不声称已取得卡图授权。

## 名称、域名与权利沟通

`Balatrue` 有意联想 Balatro，且两者都用于在线游戏。加拿大官方记录可见 LocalThunk Inc. 对
`BALATRO` 的商标申请，并覆盖在线非下载游戏等服务；最终发布仍应按目标地区做必要的名称清查。
[CIPO 记录](https://ised-isde.canada.ca/cipo/trademark-search/2316250?wbdisable=true)只说明加拿大
公开记录，不能写成全球已注册结论。

换成 `.com`、`.me` 或其他后缀不会消除近似。[WIPO UDRP 指引](https://www.wipo.int/amc/en/domains/search/overview/)
会综合域名、页面整体呈现、真实非商业用途和免责声明。域名调研只解决可读性、成本和备案问题，
不能解决名称权利风险。

通过 `support@playstack.com` 询问合适的权利联系人仍是降低不确定性的推荐动作。沟通时应完整
说明名称、域名、150 张低分辨率缩略图、网站展示、CDN 缓存、源码再分发、免费非商业现状和
下架方式。收到书面回复后保存原文并按条件调整；权利人沉默、社区口头意见、Press Kit 下载入口
或页面免责声明都不视为授权。

## 隐私与统计

当前没有账号、广告、浏览器统计 SDK、画像或跨站追踪。牌局、语言和战绩保存在用户浏览器的
`localStorage`；清除本站数据即可删除。页面外链会跳转到 GitHub、X、B 站、Balatro Wiki 和
Balatro 官网。

公开托管后，CDN 或托管商可能按其政策处理 IP、User-Agent、时间、请求路径、状态码和地区等
标准访问日志。首发只查看托管商的聚合请求与流量指标；正式域名和供应商确定后，在页面补齐
处理者、用途、保存期、处理地区和稳定联系地址。

若后续接入浏览器统计：

- 首次同意前不下载、不初始化非必要 SDK，拒绝后仍可完整游玩；
- 只上报低基数游戏事件，不上传答案、具体猜测、自由文本或本地存档；
- 提供撤回入口，并同步更新中英文隐私说明；
- 统计失败不能阻塞游戏，也不能把趋势数据用于有奖排名或精确结算。

## 联系与下架

当前页面使用公开的 [@x6ncraft](https://x.com/x6ncraft) 作为权利咨询与下架入口。后续建立稳定的权利联系邮箱时，
再同步更新页面、README 和本文件。

如有侵权疑问或权利请求，优先立即下线相关素材，再保存请求、核对事实并按需要移除或替换；静态
站应能通过一次构建移除卡图。下架响应降低持续影响，不追溯产生授权。执行顺序见
`release-checklist.md`。
