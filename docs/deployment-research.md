# 部署、域名与统计调研

调研日期：2026-07-19。当前只记录方案，不购买域名、不创建云资源、不部署。

## 结论

验收后的首选组合是：

- 主域名：`balatrue.fun`。
- 托管：腾讯 EdgeOne Pages 免费版，选择“全球可用区（含中国大陆）”。
- 分发：EdgeOne 自带 HTTPS 与全球 CDN，先保持单站点，不做境内外双栈。
- 统计：EdgeOne 自带请求／流量指标；经用户同意后再加载腾讯云前端性能监控 RUM，统计 PV／UV 和少量游戏事件。
- 发布：GitHub Actions 使用 Bun 构建 `dist/`，再通过 EdgeOne CLI 上传；仓库继续保持私有。

这个组合不需要业务服务端。EdgeOne Pages [支持 Vue／Vite SPA、Git 部署和 CLI 部署](https://edgeone.ai/document/196763737788014592)，也支持自定义域名与免费 SSL。当前免费版为长期免费，包含自动 CI/CD 和全球 CDN；[价格页写明 $0／月](https://pages.edgeone.ai/pricing)，[免费版额度](https://edgeone.ai/document/211893332490612736)对当前项目绰绰有余。

## 为什么选 EdgeOne Pages

| 方案                  | 中国内地                   | 海外             | 自定义域名 | 成本与复杂度                                        | 结论               |
| --------------------- | -------------------------- | ---------------- | ---------- | --------------------------------------------------- | ------------------ |
| EdgeOne Pages         | 备案后可选中国大陆／全球区 | 全球 CDN         | 支持       | 当前免费，Git／CLI 都可部署                         | 首选               |
| CloudBase 静态托管    | 完成备案后使用境内服务     | 官方提供全球 CDN | 支持       | 个人版当前限时价 19.9 元／月，成熟可控              | 首选兜底           |
| 阿里 OSS + CDN        | 完成备案后稳定             | CDN 可选全球加速 | 支持       | 用量成本低，但存储、CDN、证书、缓存和 CI 需分别配置 | 备选               |
| 腾讯 COS + CDN        | 完成备案后稳定             | CDN 可选全球加速 | 支持       | 与 OSS 类似，比 CloudBase 多一层配置                | 备选               |
| Cloudflare Pages      | 无中国内地服务保证         | 很好             | 支持       | 免费层和 Git 体验好                                 | 只作海外预览／备用 |
| Vercel                | 无中国内地服务保证         | 很好             | 支持       | Git 体验好；游戏自定义事件需 Pro／Enterprise        | 只作海外预览       |
| Netlify／GitHub Pages | 无中国内地服务保证         | 可用             | 支持       | 简单，但不解决核心访问目标                          | 不作生产首选       |

Cloudflare 官方明确说明 [Pages 当前不在中国内地网络提供](https://developers.cloudflare.com/china-network/faq/#is-pages-available-in-mainland-china)，因此不能把“偶尔能打开”当作中国内地的访问承诺。Vercel、Netlify 和 GitHub Pages 同样没有适合本项目的中国内地服务保证。

EdgeOne Pages 的免费版当前列出 500 次构建／月、200 个自定义域名与免费 SSL；正常业务超过额度时平台说明会优先保障稳定，商业化后额度可能调整。当前 `dist/` 约 1.3MB，初始 gzip 后的 HTML、CSS、JS 和字体约 260KB，150 张卡图合计约 296KB，对静态 CDN 很轻。它很适合个人娱乐项目，但免费版没有付费 SLA；若后续需要明确额度、工单和成本上限，可切到 CloudBase 个人版。CloudBase 当前包含 1 个自定义域名、1GB 静态托管、10GB／月存储流量与 500 QPS，19.9 元／月限时价以[实时价格页](https://cloud.tencent.com/document/product/876/75213)为准。

EdgeOne 的注意项是内容审核：其中国内地服务的[官方使用限制](https://edgeone.ai/document/63620)
将“赌博广告和游戏”列为不合规内容。Balatrue 是无真钱、无下注的猜谜粉丝作品，但扑克素材仍可能引发误判。上线前应向腾讯云工单提供玩法说明和截图，书面确认内容边界；若平台认定不可接入，先暂停内地发布并处理合规问题，更换托管商也不会改变这一边界。

## 备案的真实成本

中国内地节点和 CDN 需要 ICP 备案；仅解析到中国香港或境外服务器可不做 ICP，但无法同时承诺内地访问质量。腾讯云也明确要求[使用内地服务器或 CDN 的域名先完成备案](https://cloud.tencent.com/document/product/243/19630)。

EdgeOne Pages 自己不能充当首次备案资源，因此“免费托管”也不等于“零成本完成内地发布”：

- CloudBase 自身作为备案资源时，环境需为个人版以上、剩余有效期超过 6 个月，并开启固定公网 IP；[备案要求见官方说明](https://cloud.tencent.com/document/product/876/128405)。
- 固定公网 IP [目前只支持标准版及以上](https://docs.cloudbase.net/run/deploy/networking/staticip)，因此不能只买个人版就直接把它当作首次备案资源。
- 对这个个人项目，更合理的做法是购买一台满足条件的中国内地轻量应用服务器完成备案，再把备案域名绑定到 EdgeOne Pages。腾讯云要求该轻量服务器按包年包月购买，累计至少 3 个月且带公网 IP；[备案资源条件见官方文档](https://cloud.tencent.com/document/product/243/18908)。轻量服务器价格受地域和活动影响，发布前在控制台确认，不提前写死。
- 如果名下已有合格的腾讯云备案资源，可以直接复用；如果域名在其他接入商备案，还需要做腾讯云接入备案。
- 备案本身免费，通常需 1–20 个工作日。网站开放后还需在 30 日内完成公安联网备案，并在页脚展示备案号。

因此，成本基线是“域名年费 + 首次备案所需的合格云资源”；EdgeOne Pages 托管当前为 0 元。CloudBase 是每月约 19.9 元的稳定兜底，不能把它的套餐价误写成完成大陆发布的全部成本。

## 域名建议

推荐顺序：

1. `balatrue.fun`：短、好记、和娱乐项目语气一致；当前工信部域名体系可用于备案。
2. `balatrue.cn`：后缀更短，适合防御性注册或跳转到主域名。
3. `balatrue.com`：最通用，可作为品牌保护。

不建议把 `balatrue.gg` 或 `balatrue.game` 作为内地主域名：前者的备案可用性不稳，后者在当前可备案后缀清单中缺失。域名用于 ICP 前还需满足[后缀获批、注册商获批和实名认证主体一致](https://help.aliyun.com/zh/icp-filing/basic-icp-service/user-guide/prepare-and-check-the-domain-name)等要求。

2026-07-19 通过 RDAP／WHOIS 即时检查时，`balatrue.fun`、`balatrue.cn`、`balatrue.com`、`balatrue.gg` 与 `balatrue.game` 均未发现注册记录。这只是查询时点，不代表已保留；本轮不购买。

## 无服务端统计

托管层面不用加任何代码：EdgeOne Makers 自带[项目指标分析](https://pages.edgeone.ai/document/metric-analysis)，可看请求数、流量、带宽峰值、状态码和地区。这能回答“站点是否有流量、有无异常”，但静态资源会产生多个请求，因此请求数不等于访客数，也无法知道是否开局或过关。

首选腾讯云 RUM。它通过 Web SDK 直接上报，无需自建接口；自动提供 PV／UV、地域、设备、页面性能、资源错误和 JavaScript 错误，也支持 [`reportEvent` 自定义事件](https://cloud.tencent.com/document/product/248/87190)。单个主账号当前每天共享 50 万条免费上报量，超出后中国内地按 0.34 元／万条计费；[额度与价格见官方计费页](https://cloud.tencent.com/document/product/248/87074)。发布时选广州地域，先降低中国内地上报失败率；海外上报失败不得阻塞游戏。

建议只上报以下低基数事件：

| 事件                | 触发时机           | 字段                                                  |
| ------------------- | ------------------ | ----------------------------------------------------- |
| `game_started`      | 每局第一次有效猜测 | `mode`、`locale`                                      |
| `game_finished`     | 猜中或六次用尽     | `mode`、`result`、`attempts`、`eligibility`、`locale` |
| `collection_opened` | 实际展示图鉴       | `mode`、`eligibility`                                 |
| `glossary_opened`   | 展示线索字典       | `mode`                                                |
| `share_copied`      | 复制分享结果成功   | `mode`、`result`                                      |

`eligibility` 只取 `scored`、`assisted`、`practice`。RUM 的额外参数键固定为 `ext1`–`ext10`，接入时由一个小型适配层把上表的业务字段映射进去，并在仓库文档里固定映射；使用 `ext4`–`ext10` 前需在 RUM 控制台配好枚举。

不上传答案、小丑牌猜测、自由文本、姓名、账号、精确地址或本地存档。每日结算事件要用本地键去重，避免刷新重复上报。这些前端事件适合看趋势，网络中断、隐私拦截或用户关闭页面都可能造成少量丢失，因此不能当作计费或排行榜的权威记录。

上线后可直接得到：请求量与流量（EdgeOne），以及已同意统计用户的访问量（PV／UV）、开局量（`game_started`）、完成率（`game_finished / game_started`）、计分日常局过关率、猜测次数分布、图鉴辅助率与分享率（RUM）。

其他现成方案的取舍：

- Vercel Web Analytics 无 Cookie、基础访问统计覆盖所有套餐，但[自定义事件仅 Pro／Enterprise](https://vercel.com/docs/analytics/custom-events)，且站点与统计链路都没有中国内地保证。
- Plausible Cloud 隐私清晰、支持自定义事件和属性，但事件也计入月度用量，稳定穿透中国内地通常还要代理；[官方事件说明](https://plausible.io/docs/custom-event-goals)。
- PostHog Cloud 的漏斗和留存更强，首版所需能力明显过量，且其海外采集端在中国内地的可达性需要实测。
- Cloudflare Web Analytics 适合基础流量和性能观察，不能单独覆盖本项目需要的游戏事件漏斗。

腾讯 RUM SDK 会处理网络类型、操作系统、运营商、地区和设备 UA 等信息；其[官方 SDK 隐私保护指引](https://cloud.tencent.com/document/product/248/87595)
要求开发者履行告知义务，并依法获得充分、必要且明确的同意。因此正式接入时需遵守以下边界：

- 首次同意前不下载、不初始化 RUM SDK，拒绝后游戏仍完整可玩。
- 在隐私说明里列清供应商、数据类型、用途、保存期、退出方式和用户权利路径，并提供随时撤回同意的入口。
- 尊重 `Do Not Track`；不设置自定义用户 ID，并关闭不需要的自动采集。统计脚本加载失败时，所有游戏逻辑仍须正常工作。

## 验收后执行顺序

1. 用户确认玩法、素材公开边界和 `balatrue.fun`。
2. 注册域名并完成实名认证；购买或复用满足条件的腾讯云备案资源。
3. 提交 ICP 备案；等待期间只使用本地或受控预览，不把境外免费平台当作正式中国站。
4. 创建 EdgeOne Pages 项目，选择全球可用区（含中国大陆），绑定根域名与 HTTPS，配置静态资源长缓存、`index.html` 短缓存，并完成内容审核。
5. 添加 GitHub Actions 发布流程和 RUM 事件适配层；密钥只保存在 GitHub Actions Secrets。若 EdgeOne 稳定性不满足要求，再评估 CloudBase 个人版。
6. 用中国电信／联通／移动和至少一个海外节点实测首屏、卡图、图鉴与统计上报。
7. 发布后设置流量预算告警，30 日内完成公安联网备案。

在用户最终验收前，不执行以上外部操作。
