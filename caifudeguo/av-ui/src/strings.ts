/*
 * caifudeguo AV-Depot UI — Copyright (C) 2026 Rich Dr (caifudeguo.de)
 * Based on finanzfluss/calculators (AGPL-3.0). Licensed under AGPL-3.0-only.
 *
 * Single source of every user-visible string. The UI renders only from here,
 * and COPY.md is generated from this file (see test/copy.test.mjs).
 * `id` is the data-testid (or its pattern) of the element showing the string.
 * `terms` lists German words and citations in that string, with the legal source.
 * Placeholders: {x} {min} {max} {year} {date} {sha} {a} {b} {n} {field}.
 */

export interface GermanTerm {
  /** German word or statutory citation as it appears in the UI. */
  term: string
  /** Legal or official source. Empty when the word is not a statutory term. */
  source: string
}

export interface UiString {
  id: string
  zh: string
  /** Bracket term the yearly table and the title append. Not every label prints it. */
  de?: string
  source?: string
  /**
   * Every German term or citation in the visible string.
   * When omitted, `de` / `source` are that term.
   */
  terms?: GermanTerm[]
}

function s(id: string, zh: string, de?: string, source?: string, terms?: GermanTerm[]): UiString {
  return { id, zh, de, source, terms }
}

const TBD = 'Begriff des Finanzfluss-Rechners (dcc29a6), kein Normzitat'
const EVERYDAY = 'Alltagsbegriff, kein Normzitat'
const FIRM = 'Firmenname, kein Normzitat'
const AV_DEPOT: GermanTerm = {
  term: 'AV-Depot',
  source: '§1 Abs. 1b AltZertG n.F.（Altersvorsorgedepot, BGBl. 2026 I Nr. 156）',
}

export const STR = {
  title: s('title', '养老投资账户计算器', 'Altersvorsorgedepot', '§1 Abs. 1b AltZertG n.F. (BGBl. 2026 I Nr. 156)'),
  subtitle: s('subtitle', '对比：同样每年存钱，放进有国家补贴的 AV 账户，和放进普通 ETF 账户（normales Depot），退休后每月各能拿多少。', 'normales Depot', 'Alltagsbegriff, kein Normzitat'),
  numberFormat: s('notice-number-format', '本页数字用德式写法：1.800 € = 一千八百欧元，6,0 % = 六点零 %'),

  // notices (plan §4)
  noticeStart: s('notice-start-2027', '2027-01-01 起才能开户。'),
  noticeLock: s('notice-lock-65', '最早 65 岁开始领（若更早领法定养老金可同时开始），最晚 70 岁。', 'Beginn der Auszahlungsphase', '§1 Abs. 1 S. 1 Nr. 2a AltZertG n.F.'),
  noticeLockDetails: s('notice-lock-65-details', '本计算器只算 65–70 岁开始领取的情况。依据：§1 Abs. 1 S. 1 Nr. 2a AltZertG n.F.。', '§1 Abs. 1 S. 1 Nr. 2a AltZertG n.F.', '§1 Abs. 1 S. 1 Nr. 2a AltZertG n.F.'),
  noticeSchaedlich: s('notice-schaedlich', '提前取出（schädliche Verwendung）要退还取出部分对应的补贴和省下的税；自住房、转合同、领取开始时最多 30 % 一次性取出除外；缴费可随时暂停。', 'schädliche Verwendung', '§93 Abs. 1 EStG（2027 年起版本）'),
  noticeSchaedlichDetails: s(
    'notice-schaedlich-details',
    '提前取出属于有害使用（schädliche Verwendung）：取出的那部分所对应的补贴和多省的税要退还，其中的收益还要交个人所得税。例外：用来买自住房（§92a EStG）、转到另一份合同、领取开始时一次性取出最多 30 %（Teilkapitalauszahlung）。缴费随时可以暂停。依据：§93 Abs. 1 EStG（2027 年起版本）、§92a EStG、§22 Nr. 5 EStG、§1 AltZertG n.F.。',
    'schädliche Verwendung',
    '§93 Abs. 1 EStG（2027 年起版本）',
    [
      { term: 'schädliche Verwendung', source: '§93 Abs. 1 EStG（2027 年起版本）' },
      { term: '§93 Abs. 1 EStG', source: '§93 Abs. 1 EStG（2027 年起版本）' },
      { term: '§92a EStG', source: '§92a EStG' },
      { term: 'Teilkapitalauszahlung', source: '§1 Abs. 1 S. 1 Nr. 4 AltZertG n.F.' },
      { term: '§22 Nr. 5 EStG', source: '§22 Nr. 5 EStG' },
      { term: '§1 AltZertG n.F.', source: '§1 AltZertG n.F. (BGBl. 2026 I Nr. 156)' },
    ],
  ),
  noticeKids: s(
    'notice-kids-18',
    '只要还在为孩子领 Kindergeld（一般最长到 25 岁，§32 Abs. 4 EStG），子女补贴就一直有。本计算器只算到 18 岁，所以结果偏保守。',
    'Kindergeld',
    '§32 Abs. 4 EStG',
    [
      { term: 'Kindergeld', source: '§32 Abs. 4 EStG' },
      { term: '§32 Abs. 4 EStG', source: '§32 Abs. 4 EStG' },
      { term: 'Kinderzulage', source: '§85 Abs. 1 EStG（2027 年起版本）' },
    ],
  ),
  noticeKidsDetails: s(
    'notice-kids-18-details',
    '子女补贴（Kinderzulage）发给领取 Kindergeld 的那位家长。依据：§85 Abs. 1 EStG（2027 年起版本）、§32 Abs. 4 EStG。',
    'Kinderzulage',
    '§85 Abs. 1 EStG（2027 年起版本）',
    [
      { term: 'Kinderzulage', source: '§85 Abs. 1 EStG（2027 年起版本）' },
      { term: 'Kindergeld', source: '§32 Abs. 4 EStG' },
      { term: '§85 Abs. 1 EStG', source: '§85 Abs. 1 EStG（2027 年起版本）' },
      { term: '§32 Abs. 4 EStG', source: '§32 Abs. 4 EStG' },
    ],
  ),
  noticeDetailsSummary: s('{notice}-details-toggle', '详情与依据'),
  noticeSingle: s('notice-single-2026', '目前只按未婚单人的基本税率（Grundtarif）和 2026 年税表计算，已婚合并报税的结果可能不同。', 'Grundtarif', '§32a Abs. 1 EStG'),
  noticeParams: s('notice-params-date', '参数核对日期：{date}（计算参数版本 {sha}）'),
  noticeDisclaimer: s('notice-disclaimer', '本计算结果仅供参考，不构成投资或税务建议（keine Anlage- oder Steuerberatung）。', 'keine Anlage- oder Steuerberatung', 'kein Normzitat'),
  noticeBrowser: s('notice-browser-only', '只在你的浏览器里计算，不上传任何数据，不用 cookie。'),
  noticeSource: s(
    'notice-source-license',
    '计算方法来自 finanzfluss/calculators（AGPL-3.0）commit dcc29a6。页面运行的是这份计算代码的机器生成副本，只改了输出取整（计算方法不变）。本页面的完整源代码（AGPL-3.0）：',
    undefined,
    undefined,
    [{ term: 'finanzfluss/calculators', source: '上游仓库名，AGPL-3.0-only，kein Normzitat' }],
  ),
  noticeSourceLink: s('notice-source-link', '源代码（fork，固定 commit {sha}）'),
  noticeNotAffiliated: s(
    'notice-not-affiliated',
    '本站与 Finanzfluss / Finflow GmbH 无关，没有合作或背书关系。',
    undefined,
    undefined,
    [
      { term: 'Finanzfluss', source: FIRM },
      { term: 'Finflow GmbH', source: FIRM },
    ],
  ),

  // basic inputs
  age: s('label-age', '当前年龄', 'Alter', EVERYDAY),
  retirementAge: s('label-retirementAge', '退休年龄', 'Renteneintrittsalter', EVERYDAY),
  savingsRate: s('label-savingsRate', '每年存入（€）', 'Sparbetrag', EVERYDAY),
  savingsHelp: s(
    'help-savingsRate',
    '补贴（Grundzulage）只算前 1.800 €；一份合同每年最多 6.840 €（§1 Abs. 1 S. 1 Nr. 5 AltZertG n.F.），13.680 € 是两份合同合计的上限。',
    'Grundzulage',
    '§84 / §10a Abs. 1 EStG（2027 年起版本）',
    [
      { term: 'Grundzulage', source: '§84 / §10a Abs. 1 EStG（2027 年起版本）' },
      { term: '§1 Abs. 1 S. 1 Nr. 5 AltZertG n.F.', source: '§1 Abs. 1 S. 1 Nr. 5 AltZertG n.F.（一份合同每年 6.840 €）' },
    ],
  ),
  quickPrefix: s('quick-savingsRate', '快捷：'),
  twoContracts: s('hint-two-contracts', '超过 6.840 € 需要开两份合同', 'Höchstbeitrag je Vertrag', '§1 Abs. 1 S. 1 Nr. 5 AltZertG n.F.'),
  zveSavings: s('label-zveSavingsPhase', '工作期应税收入（€）', 'zu versteuerndes Einkommen (zvE) Ansparphase', '§2 Abs. 5 EStG'),
  zveHelp: s('help-zveSavingsPhase', '扣除各种减免后的应税收入，不是税前工资。', 'zu versteuerndes Einkommen', '§2 Abs. 5 EStG'),
  kids: s('label-kids', '孩子出生年份', 'Geburtsjahre der Kinder', EVERYDAY),
  kidsHelp: s('help-kids', '有子女补贴（Kinderzulage）时填写，每个孩子一行；不填就是没有孩子。', 'Kinderzulage', '§85 EStG（2027 年起版本）'),
  kidAdd: s('kid-add', '+ 添加孩子'),
  kidRemove: s('kid-remove-{n}', '删除'),
  kidLabel: s('label-kid-{n}', '第 {x} 个孩子的出生年份'),

  joint: s(
    'placeholder-joint',
    '合并报税（Zusammenveranlagung）· 即将推出',
    'Zusammenveranlagung',
    '§26b EStG, Splittingtarif §32a Abs. 5 EStG',
    [
      { term: 'Zusammenveranlagung', source: '§26b EStG' },
      { term: 'Splittingtarif', source: '§32a Abs. 5 EStG' },
    ],
  ),

  // advanced inputs
  more: s('toggle-more', '更多设置'),
  zveRetirement: s('label-zveRetirement', '退休期应税收入（€）', 'zvE Rentenphase', '§2 Abs. 5 EStG'),
  etfReturnRate: s('label-etfReturnRate', 'ETF 年收益率（%）', 'Rendite', 'Alltagsbegriff, kein Normzitat'),
  avDepotCosts: s('label-avDepotCosts', 'AV 账户费用（% / 年）', 'Kosten', '§1 Abs. 1 S. 1 Nr. 8 AltZertG n.F.'),
  exemptionOrder: s('label-exemptionOrder', '储蓄者免税额（€）', 'Sparerpauschbetrag', '§20 Abs. 9 EStG'),
  exemptionHelp: s('help-exemptionOrder', '在银行开户时可以通过免税委托（Freistellungsauftrag）直接使用这个额度。', 'Freistellungsauftrag', '§44a Abs. 2 S. 1 Nr. 1 EStG'),
  taxSavingsMode: s('label-taxSavingsMode', '退税去向', 'Verwendung der Steuerersparnis', 'Alltagsbegriff, kein Normzitat'),
  modeAv: s('mode-avDepot', '再存进 AV 账户', 'Altersvorsorgedepot', '§1 Abs. 1b AltZertG n.F. (BGBl. 2026 I Nr. 156)'),
  modeSecondary: s('mode-secondaryDepot', '另开账户投资', 'Nebendepot', 'Alltagsbegriff, kein Normzitat'),
  modeConsume: s('mode-consume', '花掉', 'Konsumieren', 'Alltagsbegriff, kein Normzitat'),
  baseRate: s('label-baseRate', '基准利率（%）', 'Basiszins', '§18 Abs. 4 InvStG'),
  baseRateHelp: s(
    'help-baseRate',
    '财政部每年公布（Bundesministerium der Finanzen）。',
    'Basiszins',
    '§18 Abs. 4 InvStG',
    [
      { term: 'Bundesministerium der Finanzen', source: '§18 Abs. 4 InvStG（每年公布 Basiszins 的机关）' },
      { term: 'Basiszins', source: '§18 Abs. 4 InvStG' },
    ],
  ),
  oneTimePayout: s(
    'label-oneTimePayout',
    '领取开始时一次性取出（最多 30 %）',
    'Teilkapitalauszahlung',
    '§1 Abs. 1 S. 1 Nr. 4 AltZertG n.F.; Besteuerung §22 Nr. 5 EStG',
    [
      { term: 'Teilkapitalauszahlung', source: '§1 Abs. 1 S. 1 Nr. 4 AltZertG n.F.' },
      { term: 'Besteuerung der Teilkapitalauszahlung', source: '§22 Nr. 5 EStG' },
    ],
  ),
  payoutReturnRate: s('label-payoutReturnRate', '领取期收益率（%）', 'Rendite Auszahlphase', 'Alltagsbegriff, kein Normzitat'),
  payoutUntilAge: s('label-payoutUntilAge', '领取到几岁', 'Auszahlung bis (mindestens bis 85)', '§1 Abs. 1 S. 1 Nr. 4b aa AltZertG n.F.'),
  moreHelp: s(
    'help-more',
    '起始年份不显示，固定取 2027 和今年中较大的一年（与 Finanzfluss 网页相同）。',
    undefined,
    undefined,
    [{ term: 'Finanzfluss', source: FIRM }],
  ),

  // results
  resultsHeading: s('results-heading', '结果'),
  verdictSame: s('result-verdict', '两者基本相同：AV-Depot 多约 {x}，不到税后总额的 1 %（指两者中较大的领取期税后合计）。', undefined, undefined, [AV_DEPOT]),
  verdictSameNormal: s('result-verdict', '两者基本相同：普通 ETF 账户多约 {x}，不到税后总额的 1 %（指两者中较大的领取期税后合计）。'),
  verdictEqual: s('result-verdict', '两者基本相同：差额不到 1 €。'),
  verdictAv: s('result-verdict', '按你的假设，AV-Depot 税后共多拿约 {x}。', undefined, undefined, [AV_DEPOT]),
  verdictNormal: s('result-verdict', '按你的假设，普通 ETF 账户税后共多拿约 {x}。'),
  verdictBasis: s('result-basis', '按税后比较（领取期税后合计）。'),
  diffNote: s('result-diff-note', '差额按未取整的金额计算，可能和两个合计相减差 1 €。'),
  barAv: s('verdict-bar-text', 'AV 多拿约 {x}'),
  barNormal: s('verdict-bar-text', '普通账户多拿约 {x}'),
  barSame: s('verdict-bar-text', '基本相同（AV 多约 {x}）'),
  barSameNormal: s('verdict-bar-text', '基本相同（普通账户多约 {x}）'),
  barEqual: s('verdict-bar-text', '基本相同（相差不到 1 €）'),
  barInvalid: s('verdict-bar-text', '输入有误，暂无结果'),
  barMonthly: s('verdict-bar-monthly', '每月到手（税后）：AV {a} · 普通 {b}'),
  inlineAv: s('inline-result', '结果：AV 多拿约 {x}（税后合计）'),
  inlineNormal: s('inline-result', '结果：普通账户多拿约 {x}（税后合计）'),
  inlineSameAv: s('inline-result', '结果：基本相同（AV 多约 {x}）'),
  inlineSameNormal: s('inline-result', '结果：基本相同（普通账户多约 {x}）'),
  inlineEqual: s('inline-result', '结果：基本相同（相差不到 1 €）'),
  inlineInvalid: s('inline-result', '结果：输入有误，暂无结果'),
  sensitivity: s('result-sensitivity', '这个结果对退休期收入和收益率的假设很敏感。'),
  bonusNote: s(
    'result-bonus-note',
    '已算进新手奖励：按你输入的年龄判断（法律规定是开始缴费那一年年初还不满 25 岁），Grundzulage 一次性多加 200 €（§84 S. 2 EStG n.F.）。「Berufseinsteigerbonus」是 BMF FAQ 用语，不是法律用语。',
    'Erhöhung der Grundzulage um 200 € (BMF-Bezeichnung „Berufseinsteigerbonus“)',
    '§84 S. 2 EStG n.F.',
    [
      { term: 'Grundzulage', source: '§84 EStG n.F.' },
      { term: '§84 S. 2 EStG n.F.', source: '§84 S. 2 EStG n.F.（Erhöhung der Grundzulage um 200 €）' },
      { term: 'Berufseinsteigerbonus', source: 'BMF FAQ 用语，kein Normzitat' },
      { term: 'BMF', source: 'Bundesministerium der Finanzen' },
    ],
  ),
  noResult: s('result-invalid', '输入有误，请先改正标红的项目，改好后自动出结果。'),
  colAv: s('col-av', 'AV 账户（Altersvorsorgedepot）', 'Altersvorsorgedepot', '§1 Abs. 1b AltZertG n.F.'),
  colNormal: s('col-normal', '普通 ETF 账户（normales Depot）', 'normales Depot', 'Alltagsbegriff, kein Normzitat'),
  monthly: s('result-monthly', '每月到手（税后）', 'netto pro Monat', 'Alltagsbegriff, kein Normzitat'),
  rowContrib: s('row-totalContributions', '自己存入合计', 'Eigenbeiträge gesamt', 'Alltagsbegriff, kein Normzitat'),
  rowFinal: s('row-finalCapital', '退休时总额（税前）', 'Endkapital', 'Alltagsbegriff, kein Normzitat'),
  rowFirst: s('row-firstPayoutYear', '首年领取', 'erstes Auszahlungsjahr', 'Alltagsbegriff, kein Normzitat'),
  rowRegular: s('row-regularPayoutYear', '之后每年领取', 'jedes weitere Jahr', 'Alltagsbegriff, kein Normzitat'),
  rowTotal: s('row-payoutTotal', '领取期合计', 'Summe Auszahlphase', 'Alltagsbegriff, kein Normzitat'),
  gross: s('label-gross', '税前', 'brutto', 'Alltagsbegriff, kein Normzitat'),
  tax: s('label-tax', '税', 'Steuer', 'Alltagsbegriff, kein Normzitat'),
  net: s('label-net', '税后', 'netto', 'Alltagsbegriff, kein Normzitat'),
  taxNote: s(
    'result-tax-note',
    '领取时税（AV 账户：§22 Nr. 5 EStG）按个人所得税边际税率（Grenzsteuersatz）算；普通账户按资本利得税（Abgeltungsteuer）与个税取低者（Günstigerprüfung），先扣部分免税（Teilfreistellung）和储蓄者免税额。超过补贴上限多存的部分（Überzahlung）单独计算。',
    'Günstigerprüfung',
    '§32d Abs. 6 EStG',
    [
      { term: '§22 Nr. 5 EStG', source: '§22 Nr. 5 EStG' },
      { term: 'Grenzsteuersatz', source: '§32a EStG（边际税率，计算用语）' },
      { term: 'Abgeltungsteuer', source: '§32d Abs. 1 EStG' },
      { term: 'Günstigerprüfung', source: '§32d Abs. 6 EStG' },
      { term: 'Teilfreistellung', source: '§20 InvStG' },
      { term: 'Sparerpauschbetrag', source: '§20 Abs. 9 EStG' },
      { term: 'Überzahlung', source: TBD },
    ],
  ),
  chart: s('placeholder-chart', '图表即将推出'),

  // yearly table
  yearly: s('toggle-yearly', '逐年明细'),
  colYear: s('col-year', '年份', 'Jahr', EVERYDAY),
  colAge: s('col-age', '年龄', 'Alter', EVERYDAY),
  colContribution: s('col-contribution', '当年存入（含补贴和再投资的退税）'),
  colReturn: s('col-grossReturn', '当年收益'),
  colVorab: s(
    'col-vorabpauschale',
    '每年先按 Basiszins × 0,7 算出的假定收益',
    'Vorabpauschale',
    '§18 Abs. 1 InvStG',
    [
      { term: 'Basiszins', source: '§18 Abs. 4 InvStG' },
      { term: 'Vorabpauschale', source: '§18 Abs. 1 InvStG' },
    ],
  ),
  colVorabTax: s('col-vorabpauschaleTax', '假定收益的税', 'Steuer auf die Vorabpauschale', '§18 Abs. 1 InvStG'),
  colEnd: s('col-capitalEnd', '年末余额'),
  yearlyNote: s('yearly-note', '表中金额精确到分（2 位小数，1.000 € 以下和以上都一样）；上方汇总数字四舍五入到整欧元。'),
  yearlyContribNote: s('yearly-contribution-note', '「当年存入」包含国家补贴和再投入 AV 账户的退税，所以和上面只算你自己存的钱的「自己存入合计」不同。'),

  // errors
  errEmpty: s('error-{field}', '请填写此项。'),
  errAmount: s('error-{field}', '格式不对：请用德式写法，例如 1.800 或 1.800,50（点只用作千分位，点后面必须正好 3 位数字）。'),
  errPercent: s('error-{field}', '格式不对：请输入数字，例如 6,5。'),
  errInt: s('error-{field}', '请输入整数。'),
  errMin: s('error-{field}', '不能小于 {min}。'),
  errGt: s('error-{field}', '必须大于 {min}。'),
  errMax: s('error-{field}', '不能大于 {max}。'),
  errAgeRetire: s('error-age / error-retirementAge', '当前年龄必须小于退休年龄。'),
  errRetireAge: s('error-retirementAge', '退休年龄必须大于当前年龄。'),
  errRetirePayout: s('error-retirementAge / error-payoutUntilAge', '退休年龄必须小于领取截止年龄。'),
  errCostsEtf: s('error-avDepotCosts / error-etfReturnRate', '费用必须低于 ETF 年收益率。'),
  errCostsPayout: s('error-avDepotCosts / error-payoutReturnRate', '费用必须低于领取期收益率。'),
  errFuture: s('error-kid-{n}', '出生年份不能晚于今年（{year}）。'),
  errInvalid: s('error-form', '输入无效。'),

  notesHeading: s('notes-heading', '提示 · 免责 · 来源'),
} satisfies Record<string, UiString>

export type StrKey = keyof typeof STR

/** Notices that show the short sentence plus a collapsible legal-basis paragraph. */
export const NOTICE_DETAIL_KEYS = ['noticeLock', 'noticeSchaedlich', 'noticeKids'] as const

/** Yearly-table value columns, in on-screen order. Shared with COPY.md. */
export const YEARLY_COL_KEYS = ['colContribution', 'colReturn', 'colVorab', 'colVorabTax', 'colEnd'] as const

/** Payout blocks that repeat 税前 / 税 / 税后. */
export const PAYOUT_GROUPS = ['firstPayoutYear', 'regularPayoutYear', 'payoutTotal'] as const

export function t(key: StrKey, vars: Record<string, string | number> = {}): string {
  return STR[key].zh.replace(/\{(\w+)\}/g, (m, k: string) =>
    k in vars ? String(vars[k]) : m,
  )
}

/** German terms and citations that belong to this string, in reading order. */
export function termsOf(key: StrKey): GermanTerm[] {
  const item = STR[key]
  if (item.terms?.length)
    return item.terms
  if (item.de)
    return [{ term: item.de, source: item.source ?? '' }]
  return []
}

/** Visible `<h1>`: Chinese title plus the German product name in brackets. */
export function h1Text(): string {
  return `${STR.title.zh}（${STR.title.de}）`
}

/** Document title. Same words as `<title>` in index.html. */
export function documentTitle(): string {
  return `${h1Text()}· caifudeguo.de`
}

export function detailsToggleTestId(key: typeof NOTICE_DETAIL_KEYS[number]): string {
  return `${STR[key].id}-details-toggle`
}

export function payoutPartTestId(part: 'gross' | 'tax' | 'net', group: string): string {
  return `${STR[part].id}-${group}`
}

/** Header text for one yearly column. `de` is appended in brackets only here and on the title. */
export function yearlyHeadText(side: 'av' | 'normal', key: typeof YEARLY_COL_KEYS[number]): string {
  const base = STR[key].de ? `${STR[key].zh}（${STR[key].de}）` : STR[key].zh
  if (side === 'av')
    return `AV · ${base}`
  return `${STR.colNormal.zh.split('（')[0]} · ${base}`
}

export function yearlyHeadTestId(side: 'av' | 'normal', key: typeof YEARLY_COL_KEYS[number]): string {
  return `th-yearly-${side}-${STR[key].id}`
}
