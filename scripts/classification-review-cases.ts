export const CLASSIFICATION_REVIEW_CASE_KINDS = [
  'user_reported',
  'representative',
  'historical_adjustment',
] as const

export type ClassificationReviewCaseKind = (typeof CLASSIFICATION_REVIEW_CASE_KINDS)[number]

export interface ClassificationReviewCase {
  id: string
  kinds: readonly ClassificationReviewCaseKind[]
  reasonZh: string
}

/**
 * Durable review cases that must remain visible across clue-model revisions.
 *
 * Keep this registry aligned with the representative and historical-adjustment
 * lists in docs/clue-taxonomy.md. Historical cases are append-only: once a
 * card enters this registry, future classification changes must review its
 * complete final projection even when that release does not change the card.
 */
export const CLASSIFICATION_REVIEW_CASES = [
  {
    id: 'j_hologram',
    kinds: ['user_reported', 'representative', 'historical_adjustment'],
    reasonZh: '与备用裤子对照：加牌是成长事件，不是额外条件。',
  },
  {
    id: 'j_trousers',
    kinds: ['user_reported', 'representative', 'historical_adjustment'],
    reasonZh: '含两对的出牌负责成长，整手计分负责应用已有倍率。',
  },
  {
    id: 'j_green_joker',
    kinds: ['representative', 'historical_adjustment'],
    reasonZh: '出牌成长、弃牌递减、整手应用，三段能力均无额外条件。',
  },
  {
    id: 'j_ramen',
    kinds: ['representative', 'historical_adjustment'],
    reasonZh: '整手应用已有倍率，弃牌只负责递减自身倍率。',
  },
  {
    id: 'j_castle',
    kinds: ['user_reported', 'representative', 'historical_adjustment'],
    reasonZh: '同时包含计分应用、指定花色弃牌成长和回合末换目标。',
  },
  {
    id: 'j_constellation',
    kinds: ['user_reported', 'representative', 'historical_adjustment'],
    reasonZh: '使用星球牌负责成长，整手计分只应用已有倍率。',
  },
  {
    id: 'j_certificate',
    kinds: ['user_reported', 'representative', 'historical_adjustment'],
    reasonZh: '蜡封牌是生成结果，回合开始时无需额外条件即可生效。',
  },
  {
    id: 'j_stone',
    kinds: ['user_reported', 'representative', 'historical_adjustment'],
    reasonZh: '读取全牌组石头牌数量，与生成石头牌的大理石小丑对照。',
  },
  {
    id: 'j_marble',
    kinds: ['user_reported', 'representative', 'historical_adjustment'],
    reasonZh: '石头牌是生成结果，选盲注后无需额外条件即可生效。',
  },
  {
    id: 'j_lucky_cat',
    kinds: ['user_reported', 'representative', 'historical_adjustment'],
    reasonZh: '幸运牌成功触发才让自身倍率成长，随机结果不能简化成裸计数。',
  },
  {
    id: 'j_mime',
    kinds: ['user_reported', 'representative', 'historical_adjustment'],
    reasonZh: '再触发留在手牌中的能力，需区分触发事件与所读取的牌。',
  },
  {
    id: 'j_four_fingers',
    kinds: ['representative', 'historical_adjustment'],
    reasonZh: '持续改变顺子与同花的成型规则，不依赖某次具体出牌。',
  },
  {
    id: 'j_cartomancer',
    kinds: ['representative', 'historical_adjustment'],
    reasonZh: '选择盲注后生成塔罗牌；空消耗牌栏只是内部执行限制。',
  },
  {
    id: 'j_burnt',
    kinds: ['representative', 'historical_adjustment'],
    reasonZh: '每回合第一次弃牌负责触发，升级牌型属于主效果而非额外条件。',
  },
  {
    id: 'j_steel_joker',
    kinds: ['user_reported', 'representative', 'historical_adjustment'],
    reasonZh: '读取全牌组钢铁牌数量，完整条件应落在单牌／牌组。',
  },
  {
    id: 'j_midas_mask',
    kinds: ['user_reported', 'representative', 'historical_adjustment'],
    reasonZh: '逐牌计分时改造人头牌，事件、对象和改造结果必须分清。',
  },
  {
    id: 'j_sock_and_buskin',
    kinds: ['user_reported', 'representative', 'historical_adjustment'],
    reasonZh: '再触发已打出的人头牌，用于复核规则效果与牌面条件。',
  },
  {
    id: 'j_dusk',
    kinds: ['user_reported', 'representative', 'historical_adjustment'],
    reasonZh: '最后一次出牌时再触发计分牌，需保留当前回合的出牌进度门槛。',
  },
  {
    id: 'j_supernova',
    kinds: ['user_reported', 'representative', 'historical_adjustment'],
    reasonZh: '计分时读取本局该牌型的出牌次数，不把历史读取写成触发事件。',
  },
  {
    id: 'j_fortune_teller',
    kinds: ['representative', 'historical_adjustment'],
    reasonZh: '只在计分时读取本局塔罗牌使用历史，使用塔罗牌不是独立触发。',
  },
  {
    id: 'j_throwback',
    kinds: ['representative', 'historical_adjustment'],
    reasonZh: '只在计分时读取本局跳过盲注历史，跳过盲注不是独立触发。',
  },
  {
    id: 'j_blackboard',
    kinds: ['representative', 'historical_adjustment'],
    reasonZh: '计分时读取留手牌状态，留在手牌不是它的独立触发事件。',
  },
  {
    id: 'j_baron',
    kinds: ['representative', 'historical_adjustment'],
    reasonZh: '与黑板对照：留在手牌中的 K 确实会逐张触发倍率。',
  },
  {
    id: 'j_satellite',
    kinds: ['representative', 'historical_adjustment'],
    reasonZh: '回合结束时读取不同星球牌使用历史，使用消耗牌不是独立触发。',
  },
  {
    id: 'j_loyalty_card',
    kinds: ['representative', 'historical_adjustment'],
    reasonZh: '每六次出牌发动一次，是玩家可见的自身累计门槛。',
  },
  {
    id: 'j_invisible',
    kinds: ['representative', 'historical_adjustment'],
    reasonZh: '持有满两个回合后出售才能复制，需保留自身门槛与复制目标。',
  },
  {
    id: 'j_yorick',
    kinds: ['representative', 'historical_adjustment'],
    reasonZh: '每累计弃掉二十三张牌后成长，是玩家可见的自身门槛。',
  },
  {
    id: 'j_gros_michel',
    kinds: ['representative', 'historical_adjustment'],
    reasonZh: '以概率自毁行为和爆米花的逐回合递减形成明确区分。',
  },
  {
    id: 'j_popcorn',
    kinds: ['representative', 'historical_adjustment'],
    reasonZh: '逐回合递减且耗尽后离场，与大麦克香蕉的概率自毁对照。',
  },
  {
    id: 'j_campfire',
    kinds: ['representative', 'historical_adjustment'],
    reasonZh: '售牌成长、Boss 后重置和计分应用必须拆成独立能力。',
  },
  {
    id: 'j_ring_master',
    kinds: ['user_reported', 'representative', 'historical_adjustment'],
    reasonZh: '持续允许重复牌出现，复杂作用对象不能变成虚假的依赖。',
  },
  {
    id: 'j_fibonacci',
    kinds: ['representative', 'historical_adjustment'],
    reasonZh: '五个指定点数同属单牌判定，用于复核较长细项列表仍然清晰。',
  },
  {
    id: 'j_hack',
    kinds: ['representative', 'historical_adjustment'],
    reasonZh: '再触发四个指定点数，用于复核规则效果与多点数判定。',
  },
  {
    id: 'j_flower_pot',
    kinds: ['representative', 'historical_adjustment'],
    reasonZh: '四种花色合并成自然短语，用于复核组合判定的展示边界。',
  },
  {
    id: 'j_ride_the_bus',
    kinds: ['historical_adjustment'],
    reasonZh: '无计分人头牌时成长、出现时重置，并在整手计分应用倍率。',
  },
  {
    id: 'j_runner',
    kinds: ['historical_adjustment'],
    reasonZh: '打出顺子时成长筹码，整手计分应用已累计的筹码。',
  },
  {
    id: 'j_square',
    kinds: ['historical_adjustment'],
    reasonZh: '恰好打出四张牌时成长筹码，需保留出牌张数条件。',
  },
  {
    id: 'j_vampire',
    kinds: ['historical_adjustment'],
    reasonZh: '移除计分牌增强并增长倍率，改牌结果不是额外依赖。',
  },
  {
    id: 'j_obelisk',
    kinds: ['historical_adjustment'],
    reasonZh: '根据是否打出最常用牌型分别成长或重置，条件需绑定各自能力。',
  },
  {
    id: 'j_wee',
    kinds: ['historical_adjustment'],
    reasonZh: '计分的 2 逐张增长筹码，整手计分再应用累计值。',
  },
  {
    id: 'j_hit_the_road',
    kinds: ['historical_adjustment'],
    reasonZh: '弃掉 J 时增长本回合倍率，回合开始／结束负责重置。',
  },
  {
    id: 'j_caino',
    kinds: ['historical_adjustment'],
    reasonZh: '人头牌被摧毁时增长倍率，摧毁对象是事件筛选。',
  },
  {
    id: 'j_ceremonial',
    kinds: ['historical_adjustment'],
    reasonZh: '选择盲注时摧毁右侧小丑，并按其售价增长自身倍率。',
  },
  {
    id: 'j_ice_cream',
    kinds: ['historical_adjustment'],
    reasonZh: '提供筹码并在每次出牌后递减，需保留动态行为。',
  },
  {
    id: 'j_red_card',
    kinds: ['historical_adjustment'],
    reasonZh: '跳过补充包时增长倍率，计分时应用累计值。',
  },
  {
    id: 'j_madness',
    kinds: ['historical_adjustment'],
    reasonZh: '选择非 Boss 盲注时成长并摧毁小丑，盲注筛选不能丢失。',
  },
  {
    id: 'j_flash',
    kinds: ['historical_adjustment'],
    reasonZh: '商店重掷负责增长倍率，整手计分负责应用累计值。',
  },
  {
    id: 'j_glass',
    kinds: ['historical_adjustment'],
    reasonZh: '玻璃牌被摧毁时增长倍率，需区分被摧毁对象与结果。',
  },
  {
    id: 'j_turtle_bean',
    kinds: ['historical_adjustment'],
    reasonZh: '增加手牌上限并在回合结束递减，耗尽后离场。',
  },
  {
    id: 'j_rocket',
    kinds: ['historical_adjustment'],
    reasonZh: '回合结束赚钱，击败 Boss 只负责增长后续收益。',
  },
  {
    id: 'j_selzer',
    kinds: ['historical_adjustment'],
    reasonZh: '再触发所有已打出的牌，并随出牌逐步递减剩余效力。',
  },
  {
    id: 'j_cavendish',
    kinds: ['historical_adjustment'],
    reasonZh: '持续提供倍率，并在回合结束进行低概率自毁判定。',
  },
  {
    id: 'j_todo_list',
    kinds: ['historical_adjustment'],
    reasonZh: '指定牌型得钱并在回合结束换目标，牌型只约束赚钱段。',
  },
  {
    id: 'j_mail',
    kinds: ['historical_adjustment'],
    reasonZh: '弃掉指定点数牌时得钱，并在回合开始／结束更换目标点数。',
  },
  {
    id: 'j_ancient',
    kinds: ['historical_adjustment'],
    reasonZh: '指定花色计分牌提供倍率，并在回合结束更换目标花色。',
  },
  {
    id: 'j_idol',
    kinds: ['historical_adjustment'],
    reasonZh: '指定花色与点数的计分牌提供倍率，目标会随回合更新。',
  },
  {
    id: 'j_egg',
    kinds: ['historical_adjustment'],
    reasonZh: '回合结束增长自身售价，读取售价与赚钱效果需要分清。',
  },
  {
    id: 'j_gift',
    kinds: ['historical_adjustment'],
    reasonZh: '回合结束增长所有小丑与消耗牌售价，作用对象不是判定依据。',
  },
  {
    id: 'j_photograph',
    kinds: ['historical_adjustment'],
    reasonZh: '每手第一张计分人头牌提供倍率，需保留顺序与牌面条件。',
  },
  {
    id: 'j_faceless',
    kinds: ['historical_adjustment'],
    reasonZh: '一次弃掉至少三张人头牌时得钱，张数与牌面条件缺一不可。',
  },
  {
    id: 'j_trading',
    kinds: ['historical_adjustment'],
    reasonZh: '每回合首次单张弃牌会摧毁该牌并得钱，需保留次数与张数门槛。',
  },
] as const satisfies readonly ClassificationReviewCase[]

export const CLASSIFICATION_REVIEW_CASE_IDS = CLASSIFICATION_REVIEW_CASES.map(({ id }) => id)

function caseIdsForKind(kind: ClassificationReviewCaseKind): string[] {
  return CLASSIFICATION_REVIEW_CASES.filter(({ kinds }) =>
    kinds.some((candidate) => candidate === kind),
  ).map(({ id }) => id)
}

export const CLASSIFICATION_REVIEW_CASE_IDS_BY_KIND = {
  user_reported: caseIdsForKind('user_reported'),
  representative: caseIdsForKind('representative'),
  historical_adjustment: caseIdsForKind('historical_adjustment'),
} as const satisfies Readonly<Record<ClassificationReviewCaseKind, readonly string[]>>
