# 线索分类规范

本文是 Balatrue 小丑牌分类、玩家线索投影与分类回归的权威入口。它规定一张牌如何从原始效果拆成
可审计能力，三列分类分别回答什么问题，以及每次规则升级必须怎样复核。产品玩法见
[`product.md`](product.md)，来源与生成边界见 [`data-sources.md`](data-sources.md)，玩家界面与字典
呈现见 [`design.md`](design.md)。

项目内部维护两个彼此独立的迁移编号：

- **能力数据模型第 12 版**（存档短码 `c12`）：记录每张牌完整的能力子句。
- **玩家线索规则第 11 版**（存档短码 `g11`）：把能力数据投影成棋盘上的大类、细项和绿黄灰反馈。

这两个编号只服务数据迁移和旧牌局重算，与 Balatrue 产品版本、`7 / 7 / 7` 的分类数量无关。日常
文档优先使用完整名称，只有存档键和迁移测试保留短码。分类和投影必须来自同一份版本化数据，
棋盘、线索字典、图鉴和分类复核表不得各自维护另一套名称或判断。

## 设计目标

这套分类同时满足四件事：

1. **严谨：**多段能力分别记录，条件只约束它实际所属的能力段。
2. **好懂：**玩家先看到少量稳定大类，再从猜测牌自己的细项继续推理。
3. **可比较：**同一列只回答一个问题；每个大类需要覆盖足够多的牌，能够缩小范围。
4. **公平：**颜色和候选数只使用页面已经展示的内容，不引入玩家看不见的隐藏判定。

## 从原文拆成能力子句

一张牌可以有一段或多段能力。每段能力都按下面的顺序审计：

> 触发事件 + 能力动作 + 产生效果 + 事件筛选 + 外部读取 + 自身门槛

| 部分     | 回答的问题               | 例子                                             |
| -------- | ------------------------ | ------------------------------------------------ |
| 触发事件 | 这段能力何时检查或更新   | 整手计分、打出手牌、弃牌、回合结束               |
| 能力动作 | 这段能力怎样改变状态     | 生效、成长、递减、重置、换目标、离场             |
| 产生效果 | 最终改变了什么           | 增加筹码、提供 ×倍率、生成扑克牌、改变规则       |
| 事件筛选 | 哪类事件实例才算         | 打出的牌型是两对、计分牌是幸运牌、弃牌为指定花色 |
| 外部读取 | 还要读取什么已有局面     | 全牌组钢铁牌数量、本局使用塔罗牌数、其他小丑牌   |
| 自身门槛 | 自身累计到什么状态才发动 | 满 2 回合、每累计弃 23 张、剩余次数              |

能力动作的审计词汇固定为：

- 生效 / Apply
- 成长 / Grow
- 递减 / Decay
- 重置 / Reset
- 换目标 / Retarget
- 离场 / Remove

拆解时遵循这些规则：

- 精确事件只在能力数据中记录。玩家触发时机只保留大阶段；需要区分同阶段动作时，动作进入判定依据。
- 生成物、转化结果和规则作用对象属于主效果，不写成判定依据。
- 牌自身已经累计的筹码、倍率、剩余效力和普通计数属于内部状态，不写成判定依据。
- 真正影响玩家判断的累计门槛仍是判定依据，例如“满 2 回合”或“每累计弃 23 张”。
- 随机概率、空小丑栏和空消耗牌栏是内部执行限制，不作为玩家线索；指定牌型、已有牌组状态和真正改变能力是否发动的数量门槛仍保留。
- 判定必须绑定到所属能力子句。它不能因为同一张牌还有另一段能力，就被误写成整张牌的共同前提。

例如：

- **全息影像 / Hologram：**“加入牌组”让自身 ×倍率成长，“整手计分”应用已有 ×倍率；触发时机
  归入“整手计分、卡牌动作”，判定依据保留“单牌／牌组：加入牌组”。
- **备用裤子 / Spare Trousers：**“打出手牌且包含两对”让自身 +倍率成长，“整手计分”应用已有
  +倍率；判定依据为“出牌／牌型：两对”，只约束成长段。
- **城堡 / Castle：**弃掉当回合指定花色的牌时成长，整手计分时应用已有筹码，回合结束时更换
  指定花色；“指定花色”只约束弃牌成长段。

## 玩家线索投影

玩家仍看到稀有度、基础价格／获取、主效果、触发时机和判定依据五列。本节只定义当前玩家线索
规则的后三列；所有中英文名称都是产品词汇，变更时必须同步棋盘、字典、图鉴、测试和版本。

### 主效果：做什么

| 大类         | English            | 收纳范围                                                   |
| ------------ | ------------------ | ---------------------------------------------------------- |
| 筹码         | Chips              | 提供筹码                                                   |
| +倍率        | +Mult              | 提供加法倍率                                               |
| ×倍率        | X Mult             | 提供乘法倍率                                               |
| 金钱         | Money              | 赚钱、节省金钱或增加出售价值                               |
| 生成／复制   | Create / copy      | 生成或复制扑克牌、小丑牌、消耗牌或标签                     |
| 改牌／资源   | Cards / resources  | 改造、升级或摧毁牌；改变手牌上限、出牌、弃牌、重掷等资源   |
| 规则／再触发 | Rules / retriggers | 改变牌型、身份、盲注、生存、概率或复制规则；再触发其他能力 |

成长等动态性质作为主效果细项展示和比较，不再升为大类：

| 细项   | English        | 含义                         |
| ------ | -------------- | ---------------------------- |
| 成长   | Scales up      | 自身效果随事件累积增强       |
| 递减   | Decays         | 自身效果随事件衰减           |
| 重置   | Resets         | 累计状态在指定事件清零或恢复 |
| 换目标 | Changes target | 检查目标会随事件更新         |
| 自毁   | Self-destructs | 满足事件或概率后移除自身     |

### 触发时机：何时发生

| 玩家标签       | English           | 边界                                   |
| -------------- | ----------------- | -------------------------------------- |
| 持续生效       | Always active     | 不等待某个事件，持续影响牌局           |
| 整手计分       | Hand scored       | 一手牌或其他小丑进入小丑牌结算         |
| 逐牌计分       | Card scored       | 单张已出牌参与计分                     |
| 卡牌动作       | Card actions      | 打出、留住、弃掉、使用、加入或摧毁卡牌 |
| 盲注阶段       | Blind events      | 选择、跳过、击败或未能通过盲注         |
| 商店／补充包   | Shop / packs      | 商店物品、开包、重掷、出售或离店       |
| 回合开始／结束 | Round start / end | 回合开始或结束                         |

同一张牌可以拥有多个触发阶段。例如备用裤子同时显示“整手计分、卡牌动作”，分别承接已有倍率的
应用和两对出牌带来的成长。精确内部事件不参与该列绿黄灰比较，也不在棋盘重复展示；需要区分
“打出”“留手”“加牌”等动作时，由判定依据负责。

### 判定依据：届时看什么

| 大类         | English                  | 边界与例子                                                   |
| ------------ | ------------------------ | ------------------------------------------------------------ |
| 单牌／牌组   | Playing cards / deck     | 花色、点数、增强、蜡封、版本、留手状态、加牌动作或全牌组构成 |
| 出牌／牌型   | Played hand / poker hand | 本次出牌的牌型、张数、顺序、计分牌、首手／末手或出牌记录     |
| 弃牌         | Discards                 | 弃牌张数、顺序、剩余次数或真正影响发动的累计门槛             |
| 金钱／商店   | Money / shop             | 当前金钱、出售价值、利息或商店／补充包动作                   |
| 小丑／消耗牌 | Jokers / consumables     | 其他小丑、相对位置、消耗牌类型、使用动作或全局使用记录       |
| 盲注／进度   | Blinds / progress        | 盲注类型、Boss 状态、得分进度、跳过记录、回合门槛或阶段动作  |
| 无需额外判定 | No extra check           | 到达所列时机后，不再判断其他牌、资源或局面                   |

投影逐段进行：先保留事件筛选、外部读取和有推理价值的自身门槛；若一段能力没有这些条件，而所属
触发阶段包含多种动作，则用该动作作为判定依据，例如“加入牌组”“选择盲注”“打开补充包”。
持续生效、整手计分和逐牌计分自身已经足够明确，不重复补动作。若整张牌最终仍无依据，才显示
“无需额外判定”。

“单牌／牌组”看牌是什么或牌组怎样变化；“出牌／牌型”看这一手如何打出。触发时机回答发生在
哪个阶段，判定依据回答届时具体看什么，二者共享来源但承担不同层级。

## 反馈与公平性

三列使用同一套颜色语言，但完整判定范围不同：

- **绿色：**主效果与判定依据的大类和完整细项集合相同；触发时机的大类集合相同。
- **黄色：**完整集合不同，但至少一个玩家大类有交集。
- **灰色：**玩家大类没有交集。

棋盘显示猜测牌自己的分类：主效果与判定依据展示大类和完整细项，触发时机只展示大类。黄色本身
表达“同类但不完全相同”，格内不再逐项标明哪里吻合或不同，也不显示谜底独有的细项。能力子句
之间的绑定关系只用于生成这些可见线索，不成为玩家看不见的隐藏判定。

剩余候选数只能依据已展示的大类、细项、颜色和数值方向计算。每次分类升级还必须证明：

- 150 张牌的五维比较签名保持 `150/150` 唯一；
- 7 个主效果大类各覆盖至少 10 张牌；
- 7 个触发时机大类各覆盖至少 5 张牌；
- 7 个判定依据大类各覆盖至少 6 张牌；
- 新增细项确有语义价值，不以服务单张牌为由新增玩家大类。

## 重点牌回归制度

重点牌分成两组，二者都必须复核：

1. **代表牌：**覆盖能力子句、多段事件、生成与读取、成长／递减／重置、规则改变、条件绑定等
   核心边界。
2. **历史调整牌：**曾由玩家反馈、人工审计或分类修复触发讨论。即使后续规则看似无关，也不能从
   回归范围移除。

### 代表牌

- `j_hologram` — 全息影像 / Hologram
- `j_trousers` — 备用裤子 / Spare Trousers
- `j_green_joker` — 绿色小丑 / Green Joker
- `j_ramen` — 拉面 / Ramen
- `j_castle` — 城堡 / Castle
- `j_constellation` — 星座 / Constellation
- `j_certificate` — 证书 / Certificate
- `j_stone` — 石头小丑 / Stone Joker
- `j_marble` — 大理石小丑 / Marble Joker
- `j_lucky_cat` — 招财猫 / Lucky Cat
- `j_mime` — 哑剧演员 / Mime
- `j_four_fingers` — 四指 / Four Fingers
- `j_cartomancer` — 卡牌术士 / Cartomancer
- `j_burnt` — 烧焦小丑 / Burnt Joker
- `j_steel_joker` — 钢铁小丑 / Steel Joker
- `j_midas_mask` — 迈达斯面具 / Midas Mask
- `j_sock_and_buskin` — 喜与悲 / Sock and Buskin
- `j_dusk` — 黄昏 / Dusk
- `j_supernova` — 超新星 / Supernova
- `j_fortune_teller` — 占卜师 / Fortune Teller
- `j_throwback` — 回溯 / Throwback
- `j_blackboard` — 黑板 / Blackboard
- `j_baron` — 男爵 / Baron
- `j_satellite` — 卫星 / Satellite
- `j_loyalty_card` — 积分卡 / Loyalty Card
- `j_invisible` — 隐形小丑 / Invisible Joker
- `j_yorick` — 约里克 / Yorick
- `j_gros_michel` — 大麦克香蕉 / Gros Michel
- `j_popcorn` — 爆米花 / Popcorn
- `j_campfire` — 篝火 / Campfire
- `j_ring_master` — 马戏团长 / Showman
- `j_fibonacci` — 斐波那契 / Fibonacci
- `j_hack` — 烂脱口秀演员 / Hack
- `j_flower_pot` — 花盆 / Flower Pot

### 历史调整牌

以下清单覆盖当前已有反馈、语义审计和历史分类修复，后续只增不删。与代表牌重叠的条目同时拥有
两种身份；生成报告只展示一次，但必须标明全部身份。

- `j_hologram` — 全息影像 / Hologram
- `j_trousers` — 备用裤子 / Spare Trousers
- `j_green_joker` — 绿色小丑 / Green Joker
- `j_ramen` — 拉面 / Ramen
- `j_castle` — 城堡 / Castle
- `j_constellation` — 星座 / Constellation
- `j_certificate` — 证书 / Certificate
- `j_stone` — 石头小丑 / Stone Joker
- `j_marble` — 大理石小丑 / Marble Joker
- `j_lucky_cat` — 招财猫 / Lucky Cat
- `j_mime` — 哑剧演员 / Mime
- `j_four_fingers` — 四指 / Four Fingers
- `j_cartomancer` — 卡牌术士 / Cartomancer
- `j_burnt` — 烧焦小丑 / Burnt Joker
- `j_steel_joker` — 钢铁小丑 / Steel Joker
- `j_midas_mask` — 迈达斯面具 / Midas Mask
- `j_sock_and_buskin` — 喜与悲 / Sock and Buskin
- `j_dusk` — 黄昏 / Dusk
- `j_supernova` — 超新星 / Supernova
- `j_fortune_teller` — 占卜师 / Fortune Teller
- `j_throwback` — 回溯 / Throwback
- `j_blackboard` — 黑板 / Blackboard
- `j_baron` — 男爵 / Baron
- `j_satellite` — 卫星 / Satellite
- `j_loyalty_card` — 积分卡 / Loyalty Card
- `j_invisible` — 隐形小丑 / Invisible Joker
- `j_yorick` — 约里克 / Yorick
- `j_gros_michel` — 大麦克香蕉 / Gros Michel
- `j_popcorn` — 爆米花 / Popcorn
- `j_campfire` — 篝火 / Campfire
- `j_ring_master` — 马戏团长 / Showman
- `j_fibonacci` — 斐波那契 / Fibonacci
- `j_hack` — 烂脱口秀演员 / Hack
- `j_flower_pot` — 花盆 / Flower Pot
- `j_ride_the_bus` — 搭乘巴士 / Ride the Bus
- `j_runner` — 跑步选手 / Runner
- `j_square` — 方形小丑 / Square Joker
- `j_vampire` — 吸血鬼 / Vampire
- `j_obelisk` — 方尖石塔 / Obelisk
- `j_wee` — 小小丑 / Wee Joker
- `j_hit_the_road` — 上路吧杰克 / Hit the Road
- `j_caino` — 卡尼奥 / Canio
- `j_ceremonial` — 仪式匕首 / Ceremonial Dagger
- `j_ice_cream` — 冰淇淋 / Ice Cream
- `j_red_card` — 红牌 / Red Card
- `j_madness` — 疯狂 / Madness
- `j_flash` — 闪示卡 / Flash Card
- `j_glass` — 玻璃小丑 / Glass Joker
- `j_turtle_bean` — 黑龟豆 / Turtle Bean
- `j_rocket` — 火箭 / Rocket
- `j_selzer` — 苏打水 / Seltzer
- `j_cavendish` — 卡文迪什 / Cavendish
- `j_todo_list` — 待办清单 / To Do List
- `j_mail` — 邮件回扣 / Mail-In Rebate
- `j_ancient` — 古老小丑 / Ancient Joker
- `j_idol` — 偶像 / The Idol
- `j_egg` — 鸡蛋 / Egg
- `j_gift` — 礼品卡 / Gift Card
- `j_photograph` — 照片 / Photograph
- `j_faceless` — 无面小丑 / Faceless Joker
- `j_trading` — 交易卡 / Trading Card

### 每次规则升级的必做输出

任何影响分类语义、投影、比较、双语标签或来源解释的改动，都必须：

1. 重建全部 150 张牌的分类，不只修补被反馈的个案。
2. 重新生成 `docs/classification-review.generated.md`；该文件必须用一张表逐行列出全部代表牌和
   历史调整牌在玩家侧看到的五维最终分类。
3. 由维护者人工复核报告中的每一张重点牌；未变化的牌也要确认，不能只看 diff。
4. 在分类数据和自动化夹具中复核完整能力子句；对所有实际变化记录理由。
5. 核对棋盘、图鉴和线索字典使用同一份分类与中英文标签。
6. 通过覆盖门槛、`150/150` 唯一性、存档迁移和中英文界面验收后，才可发布。

`docs/classification-review.generated.md` 是由当前玩家展示函数生成的复核承接物，不接受手写修订。
完整能力子句继续保留在分类数据中，不重复堆进人类报告。若报告与本文冲突，先修正分类规则或
生成逻辑，再重新生成报告；本文只维护长期分类原则和重点牌范围。
