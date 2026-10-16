/*
 * caifudeguo AV-Depot UI — Copyright (C) 2026 Rich Dr (caifudeguo.de)
 * Based on finanzfluss/calculators (AGPL-3.0). Licensed under AGPL-3.0-only.
 *
 * Single source of every user-visible string. The UI renders only from here,
 * and COPY.md is generated from this file (see test/copy.test.ts).
 * `id` is the data-testid of the element showing the string.
 * `de` is the German term shown in brackets, `source` the legal/official source of that term.
 * Placeholders: {x} {min} {max} {year} {date} {sha}.
 */

export interface UiString {
  id: string
  zh: string
  de?: string
  source?: string
}

function s(id: string, zh: string, de?: string, source?: string): UiString {
  return { id, zh, de, source }
}

const TBD = 'Begriff des Finanzfluss-Rechners (dcc29a6), kein eigener Gesetzesbegriff'

export const STR = {
  title: s('title', '养老投资账户计算器', 'Altersvorsorgedepot', 'Altersvorsorgereformgesetz 2026, neues AltZertG §1'),
  subtitle: s('subtitle', '对比：同样每年存钱，放进有国家补贴的 AV 账户，和放进普通 ETF 账户（normales Depot），退休后每月各能拿多少。'),

  // notices (plan §4)
  noticeStart: s('notice-start-2027', '2027-01-01 起才能开户。'),
  noticeLock: s('notice-lock-65', '钱锁定到 65 岁（最早）才能领取。'),
  noticeSchaedlich: s('notice-schaedlich', '提前取出属于有害使用（schädliche Verwendung）：要退还全部补贴和额外节省的税，收益还要交个人所得税。例外：用来买自住房（§92a EStG）、转到另一份合同时不受影响。缴费随时可以停。依据：新 §93 EStG、§92a EStG、§22 Nr. 5 EStG、新 AltZertG §1。', 'schädliche Verwendung', '§93 EStG (neu)'),
  noticeKids: s('notice-kids-18', '本计算器只算到孩子 18 岁。实际上孩子还在领 Kindergeld 的，补贴可以领到 25 岁（新 §85 EStG、§32 Abs. 4 EStG），所以结果偏保守。', 'Kindergeld', '§85 EStG (neu), §32 Abs. 4 EStG'),
  noticeSingle: s('notice-single-2026', '目前只按单身报税（Einzelveranlagung）和 2026 年税表计算，已婚合并报税的结果可能不同。', 'Einzelveranlagung', '§25 EStG; Grundtarif §32a Abs. 1 EStG'),
  noticeParams: s('notice-params-date', '参数核对日期：{date}（核心 commit {sha}）'),
  noticeDisclaimer: s('notice-disclaimer', '本计算结果仅供参考，不构成投资或税务建议（keine Anlage- oder Steuerberatung）。', 'keine Anlage- oder Steuerberatung'),
  noticeBrowser: s('notice-browser-only', '只在你的浏览器里计算，不上传任何数据，不用 cookie。'),
  noticeSource: s('notice-source-license', '计算核心来自 finanzfluss/calculators（AGPL-3.0），未作改动。本页面的完整源代码（AGPL-3.0）：'),
  noticeSourceLink: s('notice-source-link', '源代码（fork，固定 commit {sha}）'),
  noticeNotAffiliated: s('notice-not-affiliated', '本站与 Finanzfluss / Finflow GmbH 无关，没有合作或背书关系。'),

  // basic inputs
  age: s('label-age', '当前年龄', 'Alter'),
  retirementAge: s('label-retirementAge', '退休年龄', 'Renteneintrittsalter'),
  savingsRate: s('label-savingsRate', '每年存入（€）', 'Sparbetrag'),
  savingsHelp: s('help-savingsRate', '补贴（Grundzulage）只算前 1.800 €；一份合同每年最多 6.840 €，13.680 € 是两份合同合计的上限。', 'Grundzulage', '§84 EStG (neu)'),
  quickPrefix: s('quick-savingsRate', '快捷：'),
  twoContracts: s('hint-two-contracts', '超过 6.840 € 需要开两份合同'),
  zveSavings: s('label-zveSavingsPhase', '工作期应税收入（€）', 'zu versteuerndes Einkommen (zvE) Ansparphase', '§2 Abs. 5 EStG'),
  kids: s('label-kids', '孩子出生年份', 'Geburtsjahre der Kinder'),
  kidsHelp: s('help-kids', '有子女补贴（Kinderzulage）时填写，每个孩子一行；不填就是没有孩子。', 'Kinderzulage', '§85 EStG (neu)'),
  kidAdd: s('kid-add', '+ 添加孩子'),
  kidRemove: s('kid-remove', '删除'),
  kidLabel: s('label-kid', '第 {x} 个孩子的出生年份'),

  joint: s('placeholder-joint', '合并报税（Zusammenveranlagung）· 即将推出', 'Zusammenveranlagung', '§26b EStG, Splittingtarif §32a Abs. 5 EStG'),

  // advanced inputs
  more: s('toggle-more', '更多设置'),
  zveRetirement: s('label-zveRetirement', '退休期应税收入（€）', 'zvE Rentenphase', '§2 Abs. 5 EStG'),
  etfReturnRate: s('label-etfReturnRate', 'ETF 年收益率（%）', 'Rendite'),
  avDepotCosts: s('label-avDepotCosts', 'AV 账户费用（% / 年）', 'Kosten'),
  exemptionOrder: s('label-exemptionOrder', '储蓄者免税额（€）', 'Sparerpauschbetrag / Freistellungsauftrag', '§20 Abs. 9 EStG; §44a EStG'),
  taxSavingsMode: s('label-taxSavingsMode', '退税去向', 'Verwendung der Steuerersparnis'),
  modeAv: s('mode-avDepot', '再存进 AV 账户', 'Altersvorsorgedepot'),
  modeSecondary: s('mode-secondaryDepot', '另开账户投资', 'Nebendepot'),
  modeConsume: s('mode-consume', '花掉', 'Konsumieren'),
  baseRate: s('label-baseRate', '基准利率（%）', 'Basiszins', '§18 Abs. 4 InvStG'),
  oneTimePayout: s('label-oneTimePayout', '一次性提取（%）', 'Einmalauszahlung'),
  payoutReturnRate: s('label-payoutReturnRate', '领取期收益率（%）', 'Rendite Auszahlphase'),
  payoutUntilAge: s('label-payoutUntilAge', '领取到几岁', 'Auszahlung bis'),
  moreHelp: s('help-more', '起始年份不显示，固定取 2027 和今年中较大的一年（与 Finanzfluss 网页相同）。'),

  // results
  resultsHeading: s('results-heading', '结果'),
  verdictSame: s('result-verdict', '两者基本相同（差额不到 1 %）。'),
  verdictAv: s('result-verdict', '按你的假设，AV-Depot 税后共多拿约 {x}。'),
  verdictNormal: s('result-verdict', '按你的假设，普通 ETF 账户税后共多拿约 {x}。'),
  sensitivity: s('result-sensitivity', '这个结果对退休期收入和收益率的假设很敏感。'),
  bonusNote: s('result-bonus-note', '已算进 25 岁以前签约的新手奖励（Berufseinsteigerbonus，一次性 200 €）。', 'Berufseinsteigerbonus', '§84 EStG (neu)'),
  noResult: s('result-invalid', '输入有误，请先改正标红的项目，改好后自动出结果。'),
  colAv: s('col-av', 'AV 账户（Altersvorsorgedepot）'),
  colNormal: s('col-normal', '普通 ETF 账户（normales Depot）'),
  monthly: s('result-monthly', '每月到手（税后）'),
  rowContrib: s('row-totalContributions', '自己存入合计'),
  rowFinal: s('row-finalCapital', '退休时总额', 'Endkapital'),
  rowFirst: s('row-firstPayoutYear', '首年领取', 'erstes Auszahlungsjahr'),
  rowRegular: s('row-regularPayoutYear', '之后每年领取', 'jedes weitere Jahr'),
  rowTotal: s('row-payoutTotal', '领取期合计', 'Summe Auszahlphase'),
  gross: s('label-gross', '税前', 'brutto'),
  tax: s('label-tax', '税', 'Steuer'),
  net: s('label-net', '税后', 'netto'),
  taxNote: s('result-tax-note', '领取时税按个人所得税边际税率（Grenzsteuersatz）算；普通账户按资本利得税（Abgeltungsteuer）与个税取低者（Günstigerprüfung），先扣部分免税（Teilfreistellung）和储蓄者免税额。超过补贴上限多存的部分（Überzahlung）单独计算。', 'Günstigerprüfung', `§32d Abs. 6 EStG; Abgeltungsteuer §32d Abs. 1 EStG; Teilfreistellung §20 InvStG; Überzahlung: ${  TBD}`),
  chart: s('placeholder-chart', '图表（阶段 3）· 即将推出'),

  // yearly table
  yearly: s('toggle-yearly', '逐年明细'),
  colYear: s('col-year', '年份'),
  colAge: s('col-age', '年龄'),
  colContribution: s('col-contribution', '当年存入（含补贴和再投资的退税）'),
  colReturn: s('col-grossReturn', '当年收益'),
  colVorab: s('col-vorabpauschale', '预缴税基', 'Vorabpauschale', '§18 InvStG'),
  colVorabTax: s('col-vorabpauschaleTax', '预缴税基的税', 'Steuer auf Vorabpauschale', '§18 InvStG; §32d EStG'),
  colEnd: s('col-capitalEnd', '年末余额'),
  yearlyNote: s('yearly-note', '金额 1.000 € 以上的项目核心只给到整欧元，所以显示为 ,00。'),

  // errors
  errEmpty: s('error', '请填写此项。'),
  errAmount: s('error', '格式不对：请用德式写法，例如 1.800 或 1.800,50（点只用作千分位，点后面必须正好 3 位数字）。'),
  errPercent: s('error', '格式不对：请输入数字，例如 6,5。'),
  errInt: s('error', '请输入整数。'),
  errMin: s('error', '不能小于 {min}。'),
  errGt: s('error', '必须大于 {min}。'),
  errMax: s('error', '不能大于 {max}。'),
  errAgeRetire: s('error', '当前年龄必须小于退休年龄。'),
  errRetirePayout: s('error', '退休年龄必须小于领取截止年龄。'),
  errCostsEtf: s('error', '费用必须低于 ETF 年收益率。'),
  errCostsPayout: s('error', '费用必须低于领取期收益率。'),
  errFuture: s('error', '出生年份不能晚于今年（{year}）。'),
  errInvalid: s('error', '输入无效。'),

  notesHeading: s('notes-heading', '提示 · 免责 · 来源'),
} satisfies Record<string, UiString>

export type StrKey = keyof typeof STR

export function t(key: StrKey, vars: Record<string, string | number> = {}): string {
  return STR[key].zh.replace(/\{(\w+)\}/g, (m, k: string) =>
    k in vars ? String(vars[k]) : m,
  )
}
