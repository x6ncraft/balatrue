# 外部阻塞项

这些事项不阻塞私人本地原型，但会阻塞公开部署或公开原作素材。

## 中国大陆公开发布分类

在启用中国大陆节点前，先取得属地出版主管部门／合规律师和托管平台的书面分类结论。
[《网络出版服务管理规定》](https://www.miit.gov.cn/gyhxxhb/jgsj/cyzcyfgs/bmgz/xwcbl/art/2016/art_573f1756b8df41deb671cadf83e98fd1.html)
把通过信息网络向公众提供的游戏列为网络出版物，并要求网络游戏上网出版前履行审批；
[国家新闻出版署现行办事指南](https://www.nppa.gov.cn/bsfw/xksx/cbfxl/wlcbfwspsx/202210/t20221013_600725.html)
列出的许可条件包含具有网络游戏出版范围的出版单位、具有 ICP 证的运营机构与作品审批材料。

Balatrue 是无账号、无付费的纯前端猜谜，但仍是面向公众在线交互的 Web 游戏。它最终是否落入
上述范围需要专业书面判断，本项目不自行定性。结论取得前不创建中国大陆生产站点；若需要游戏
审批或合作出版／运营主体，当前个人静态站方案不能直接发布。ICP 备案与 EdgeOne 内容审核均不
替代这一结论。境外受控预览也仍受下述原作素材许可边界约束。

## 原作素材书面许可

公开部署前，先按 [Balatro 官方条款](https://www.playbalatro.com/terms-and-conditions)提供的
权限联系路径，写信至 `support@playstack.com`，请对方确认合适的权利联系人，并说明：

- 这是粉丝自制、无真钱下注的每日猜谜网站；
- 会使用 150 张小丑卡缩略图、官方中英文名称和 `Balatrue` 项目名／域名；
- 是否有广告、赞助、捐赠或其他变现；当前计划是无广告、非商业；
- 卡图尺寸、展示位置、缓存方式、预计访问范围，以及是否会把素材随源码公开；
- 页面会注明原作开发商与发行商，并提供联系和下架入口。

只有明确覆盖本项目用途的书面回复才能解除卡图阻塞。
[Balatro 官方 Press Kit](https://www.playbalatro.com/press-kit/)提供媒体素材；
[Playstack 的视频政策](https://www.playbalatro.com/video-policy)允许符合条件的直播与视频创作。
两者都不能直接推导出“可在独立互动网站使用全部 150 张卡图”。页面声明同样不能代替授权。

若未获许可，公开版替换为原创图像或纯文字／符号占位，原作卡图继续只存在于私人版本；
公开仓库只发布代码、数据 schema 和素材导入接口。若回复附带尺寸、署名、地区、期限或
非商业条件，应把原文与项目合规清单一起保存，并在每次发布前复核。

## 名称与对外呈现

`Balatrue` 与 `balatrue.com` 会让人直接联想到 Balatro。注册域名并不自动取得相关名称、
商标或美术的使用权。书面询问应同时覆盖项目名和域名；公开页面不要使用原作 Logo，也不要
把页面做成容易误认的官方入口。若权利方对名称有异议，发布前改名和换域名。

面向用户的推荐说明：

> Balatrue 是一款由 Balatro 粉丝制作的免费猜谜游戏，与 LocalThunk 或 Playstack 没有官方关联。原作由 LocalThunk 开发、Playstack 发行。

英文版：

> Balatrue is a free guessing game made by fans of Balatro. It is not affiliated with or endorsed by LocalThunk or Playstack. Balatro is developed by LocalThunk and published by Playstack.

在完整权利说明里再写清：Balatro 是 LocalThunk LLC 的注册商标，相关名称与游戏美术的
权利归各自权利人所有。公开站点还应提供联系／下架方式。更完整的项目边界见
`docs/legal-notice.md`。
