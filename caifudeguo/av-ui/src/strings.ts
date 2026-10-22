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

const TBD = 'Begriff des Finanzfluss-Rechners (dcc29a6), kein Normzitat'

export const STR = {
  title: s('title', '养老投资账户计算器', 'Altersvorsorgedepot', '§1 Abs. 1b AltZertG n.F. (BGBl. 2026 I Nr. 156)'),
  subtitle: s('subtitle', '对比：同样每年存钱，放进有国家补贴的 AV 账户，和放进普通 ETF 账户（normales Depot），退休后每月各能拿多少。'),
  numberFormat: s('notice-number-format', '本页数字用德式写法：1.800 € = 一千八百欧元，6,0 % = 六点零 %'),

  // notices (plan §4)
  noticeStart: s('notice-start-2027', '2027-01-01 起才能开户。'),
  noticeLock: s('notice-lock-65', '最早 65 岁开始领（若更早领法定养老金可同时开始），最晚 70 岁。', 'Beginn der Auszahlungsphase', '§1 Abs. 1 S. 1 Nr. 2a AltZertG n.F.'),
  noticeLockDetails: s('notice-lock-65-details', '本计算器只算 65–70 岁开始领取的情况。依据：§1 Abs. 1 S. 1 Nr. 2a AltZertG n.F.。'),
  noticeSchaedlich: s('notice-schaedlich', '提前取出（schädliche Verwendung）要退还取出部分对应的补贴和省下的税；自住房、转合同、领取开始时最多 30 % 一次性取出除外；缴费可随时暂停。', 'schädliche Verwendung', '§93 Abs. 1 EStG（2027 年起版本）'),
  noticeSchaedlichDetails: s('notice-schaedlich-details', '提前取出属于有害使用（schädliche Verwendung）：取出的那部分所对应的补贴和多省的税要退还，其中的收益还要交个人所得税。例外：用来买自住房（§92a EStG）、转到另一份合同、领取开始时一次性取出最多 30 %（Teilkapitalauszahlung）。缴费随时可以暂停。依据：§93 Abs. 1 EStG（2027 年起版本）、§92a EStG、§22 Nr. 5 EStG、§1 AltZertG n.F.。'),
  noticeKids: s('notice-kids-18', '只要还在为孩子领 Kindergeld（一般最长到 25 岁，§32 Abs. 4 EStG），子女补贴就一直有。本计算器只算到 18 岁，所以结果偏保守。', 'Kindergeld / Kinderzulage', '§85 Abs. 1 EStG（2027 年起版本）; §32 Abs. 4 EStG'),
  noticeKidsDetails: s('notice-kids-18-details', '子女补贴（Kinderzulage）发给领取 Kindergeld 的那位家长。依据：§85 Abs. 1 EStG（2027 年起版本）、§32 Abs. 4 EStG。', 'Kinderzulage', '§85 Abs. 1 EStG（2027 年起版本）'),
  noticeDetailsSummary: s('notice-details', '详情与依据'),
  noticeSingle: s('notice-single-2026', '本计算器只按单人的基本税率（Grundtarif）和 2026 年税表计算，不支持已婚合并报税（Zusammenveranlagung）。合并报税时退税和领取时的税可能不同。', 'Grundtarif', '§32a Abs. 1 EStG（Grundtarif）；§26b EStG（Zusammenveranlagung）'),
  noticeParams: s('notice-params-date', '参数核对日期：{date}（计算参数版本 {sha}）'),
  noticeDisclaimer: s('notice-disclaimer', '本计算结果仅供参考，不构成投资或税务建议（keine Anlage- oder Steuerberatung）。', 'keine Anlage- oder Steuerberatung'),
  noticeBrowser: s('notice-browser-only', '只在你的浏览器里计算，不上传任何数据，不用 cookie。'),
  noticeSource: s('notice-source-license', '计算方法来自 finanzfluss/calculators（AGPL-3.0）commit dcc29a6。页面运行的是这份计算代码的机器生成副本，只改了输出取整（计算方法不变）。本页面的完整源代码（AGPL-3.0）：'),
  noticeSourceLink: s('notice-source-link', '源代码（fork，固定 commit {sha}）'),
  noticeNotAffiliated: s('notice-not-affiliated', '本站与 Finanzfluss / Finflow GmbH 无关，没有合作或背书关系。'),

  // basic inputs
  age: s('label-age', '当前年龄', 'Alter'),
  retirementAge: s('label-retirementAge', '退休年龄', 'Renteneintrittsalter'),
  savingsRate: s('label-savingsRate', '每年存入（€）', 'Sparbetrag'),
  savingsHelp: s('help-savingsRate', '补贴（Grundzulage）只算前 1.800 €；一份合同每年最多 6.840 €（§1 Abs. 1 S. 1 Nr. 5 AltZertG n.F.），13.680 € 是两份合同合计的上限。', 'Grundzulage; Höchstbeitrag je Vertrag', '1.800 €: §84 / §10a Abs. 1 EStG（2027 年起版本）; 6.840 €: §1 Abs. 1 S. 1 Nr. 5 AltZertG n.F.'),
  quickPrefix: s('quick-savingsRate', '快捷：'),
  twoContracts: s('hint-two-contracts', '超过 6.840 € 需要开两份合同', 'Höchstbeitrag je Vertrag', '§1 Abs. 1 S. 1 Nr. 5 AltZertG n.F.'),
  zveSavings: s('label-zveSavingsPhase', '工作期应税收入（€）', 'zu versteuerndes Einkommen (zvE) Ansparphase', '§2 Abs. 5 EStG'),
  zveHelp: s('help-zveSavingsPhase', '扣除各种减免后的应税收入，不是税前工资。', 'zu versteuerndes Einkommen', '§2 Abs. 5 EStG'),
  kids: s('label-kids', '孩子出生年份', 'Geburtsjahre der Kinder'),
  kidsHelp: s('help-kids', '有子女补贴（Kinderzulage）时填写，每个孩子一行；不填就是没有孩子。', 'Kinderzulage', '§85 EStG（2027 年起版本）'),
  kidAdd: s('kid-add', '+ 添加孩子'),
  kidRemove: s('kid-remove', '删除'),
  kidLabel: s('label-kid', '第 {x} 个孩子的出生年份'),

  // advanced inputs
  more: s('toggle-more', '更多设置'),
  zveRetirement: s('label-zveRetirement', '退休期应税收入（€）', 'zvE Rentenphase', '§2 Abs. 5 EStG'),
  etfReturnRate: s('label-etfReturnRate', 'ETF 年收益率（%）', 'Rendite', 'Alltagsbegriff, kein Normzitat'),
  avDepotCosts: s('label-avDepotCosts', 'AV 账户费用（% / 年）', 'Kosten', '§1 Abs. 1 S. 1 Nr. 8 AltZertG n.F.'),
  exemptionOrder: s('label-exemptionOrder', '储蓄者免税额（€）', 'Sparerpauschbetrag', '§20 Abs. 9 EStG'),
  exemptionHelp: s('help-exemptionOrder', '在银行开户时可以通过免税委托（Freistellungsauftrag）直接使用这个额度。', 'Freistellungsauftrag', '§44a Abs. 2 S. 1 Nr. 1 EStG'),
  taxSavingsMode: s('label-taxSavingsMode', '退税去向', 'Verwendung der Steuerersparnis', 'Alltagsbegriff, kein Normzitat'),
  modeAv: s('mode-avDepot', '再存进 AV 账户', 'Altersvorsorgedepot', 'Alltagsbegriff, kein Normzitat'),
  modeSecondary: s('mode-secondaryDepot', '另开账户投资', 'Nebendepot', 'Alltagsbegriff, kein Normzitat'),
  modeConsume: s('mode-consume', '花掉', 'Konsumieren', 'Alltagsbegriff, kein Normzitat'),
  baseRate: s('label-baseRate', '基准利率（%）', 'Basiszins', '§18 Abs. 4 InvStG'),
  baseRateHelp: s('help-baseRate', '财政部每年公布（Bundesministerium der Finanzen）。', 'Basiszins', '§18 Abs. 4 InvStG'),
  oneTimePayout: s('label-oneTimePayout', '领取开始时一次性取出（最多 30 %）', 'Teilkapitalauszahlung', '§1 Abs. 1 S. 1 Nr. 4 AltZertG n.F.; Besteuerung §22 Nr. 5 EStG'),
  payoutReturnRate: s('label-payoutReturnRate', '领取期收益率（%）', 'Rendite Auszahlphase', 'Alltagsbegriff, kein Normzitat'),
  payoutUntilAge: s('label-payoutUntilAge', '领取到几岁', 'Auszahlung bis (mindestens bis 85)', '§1 Abs. 1 S. 1 Nr. 4b aa AltZertG n.F.'),
  moreHelp: s('help-more', '起始年份不显示，固定取 2027 和今年中较大的一年（与 Finanzfluss 网页相同）。'),

  // results
  resultsHeading: s('results-heading', '结果'),
  verdictSame: s('result-verdict', '两者基本相同：AV-Depot 多约 {x}，不到税后总额的 1 %（指两者中较大的领取期税后合计）。'),
  verdictSameNormal: s('result-verdict', '两者基本相同：普通 ETF 账户多约 {x}，不到税后总额的 1 %（指两者中较大的领取期税后合计）。'),
  verdictEqual: s('result-verdict', '两者基本相同：差额不到 1 €。'),
  verdictAv: s('result-verdict', '按你的假设，AV-Depot 税后共多拿约 {x}。'),
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
  bonusNote: s('result-bonus-note', '已算进新手奖励：按你输入的年龄判断（法律规定是开始缴费那一年年初还不满 25 岁），Grundzulage 一次性多加 200 €（§84 S. 2 EStG n.F.）。「Berufseinsteigerbonus」是 BMF FAQ 用语，不是法律用语。', 'Erhöhung der Grundzulage um 200 € (BMF-Bezeichnung „Berufseinsteigerbonus“)', '§84 S. 2 EStG n.F.'),
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
  taxNote: s('result-tax-note', '领取时税（AV 账户：§22 Nr. 5 EStG）按个人所得税边际税率（Grenzsteuersatz）算；普通账户按资本利得税（Abgeltungsteuer）与个税取低者（Günstigerprüfung），先扣部分免税（Teilfreistellung）和储蓄者免税额。超过补贴上限多存的部分（Überzahlung）单独计算。', 'Günstigerprüfung', `§32d Abs. 6 EStG; Abgeltungsteuer §32d Abs. 1 EStG; Teilfreistellung §20 InvStG; Überzahlung: ${  TBD}`),

  // yearly table
  yearly: s('toggle-yearly', '逐年明细'),
  colYear: s('col-year', '年份'),
  colAge: s('col-age', '年龄'),
  colContribution: s('col-contribution', '当年存入（含补贴和再投资的退税）'),
  colReturn: s('col-grossReturn', '当年收益'),
  colVorab: s('col-vorabpauschale', '每年先按 Basiszins × 0,7 算出的假定收益', 'Vorabpauschale', '§18 Abs. 1 InvStG'),
  colVorabTax: s('col-vorabpauschaleTax', '假定收益的税', 'Steuer auf die Vorabpauschale', '§18 Abs. 1 InvStG'),
  colEnd: s('col-capitalEnd', '年末余额'),
  yearlyNote: s('yearly-note', '表中金额精确到分（2 位小数，1.000 € 以下和以上都一样）；上方汇总数字四舍五入到整欧元。'),
  yearlyContribNote: s('yearly-contribution-note', '「当年存入」包含国家补贴和再投入 AV 账户的退税，所以和上面只算你自己存的钱的「自己存入合计」不同。'),

  // errors
  errEmpty: s('error', '请填写此项。'),
  errAmount: s('error', '格式不对：请用德式写法，例如 1.800 或 1.800,50（点只用作千分位，点后面必须正好 3 位数字）。'),
  errPercent: s('error', '格式不对：请输入数字，例如 6,5。'),
  errInt: s('error', '请输入整数。'),
  errMin: s('error', '不能小于 {min}。'),
  errGt: s('error', '必须大于 {min}。'),
  errMax: s('error', '不能大于 {max}。'),
  errAgeRetire: s('error', '当前年龄必须小于退休年龄。'),
  errRetireAge: s('error', '退休年龄必须大于当前年龄。'),
  errRetirePayout: s('error', '退休年龄必须小于领取截止年龄。'),
  errCostsEtf: s('error', '费用必须低于 ETF 年收益率。'),
  errCostsPayout: s('error', '费用必须低于领取期收益率。'),
  errFuture: s('error', '出生年份不能晚于今年（{year}）。'),
  errInvalid: s('error', '输入无效。'),

  // stage 3: Förderung row/column (PLAN_stage3.md b „Förderung 列名“, f5)
  foerAv: s('row-foerderung', '国家补贴*', 'Förderung (Zulagen + Steuerersparnis)', 'Zulagen §§83–85 EStG, Sonderausgabenabzug §10a EStG（2027 年起版本）'),
  foerSecondary: s('row-foerderung', '国家补贴*', 'Förderung (Zulagen + Steuerersparnis)', 'Zulagen §§83–85 EStG, Sonderausgabenabzug §10a EStG（2027 年起版本）'),
  foerConsume: s('row-foerderung', '国家补贴*', 'Zulagen', '§§83–85 EStG（2027 年起版本）'),
  foerBonus: s('foerderung-bonus-note', '开始存钱那年年初未满 25 岁的话，已含一次性 200 € 新手奖励（Erhöhung der Grundzulage，§84 S. 2 EStG n.F.）。', 'Erhöhung der Grundzulage', '§84 S. 2 EStG n.F.'),
  foerKids: s('foerderung-kids-note', '假设孩子的补贴记在你名下。', 'Kinderzulage', '§85 EStG（2027 年起版本）'),
  dash: s('dash', '—'),

  // stage 3: comparison of savings amounts (PLAN_stage3.md b3, e, f6)
  kindAv: s('cmp3-kind', 'AV 多拿'),
  kindSame: s('cmp3-kind', '两者基本相同'),
  kindNormal: s('cmp3-kind', '普通账户多拿'),
  flipMark: s('cmp3-flip', '在 {x}–{y} € 之间变成『{k}』'),
  sensNone: s('cmp3-summary-sensitivity', '在 120–13.680 € 之间，结论都是『{k}』。'),
  sensPrefix: s('cmp3-summary-sensitivity', '按你现在的其他输入，'),
  sensStart: s('cmp3-summary-sensitivity', '120 € 时{k}，'),
  sensFirst: s('cmp3-summary-sensitivity', '在 {x}–{y} € 之间变成{k}'),
  sensAgain: s('cmp3-summary-sensitivity', '在 {x}–{y} € 之间又变成{k}'),
  sensMore: s('cmp3-summary-sensitivity', '，详见下表'),
  maxAv: s('cmp3-summary-max', '在这些档位里，差额最大的是 {a} €（AV 多拿约 {x}，税后）。'),
  maxSame: s('cmp3-summary-max', '在这些档位里，差额最大的是 {a} €（两者基本相同，AV 多约 {x}，税后）。'),
  maxAllNormal: s('cmp3-summary-max', '在这些档位里，普通账户都多拿。'),
  maxNoAv: s('cmp3-summary-max', '在这些档位里，AV 都没有多拿（普通账户多拿或两者基本相同）。'),
  marginalHigher: s('cmp3-summary-marginal', '超过这个数，多存的部分放普通 ETF 账户税后回报更高。'),

  // stage 3: comparison block UI (PLAN_stage3.md a, b, b2, e)
  cmp3Heading: s('cmp3-heading', '不同存钱额的比较'),
  cmp3Single: s('cmp3-single', '按单人报税（Grundtarif）', 'Grundtarif', '§32a Abs. 1 EStG'),
  cmp3Toggle: s('cmp3-toggle', '不同存钱额的比较（表格 + 曲线）'),
  cmp3Invalid: s('cmp3-status', '输入有误，暂无比较'),
  cmp3Busy: s('cmp3-summary-busy', '正在计算…'),
  cmp3Rebusy: s('cmp3-status-recalc', '正在重新计算…'),
  cmp3Intro: s('cmp3-intro', '其他输入都按你现在填的值；只按单人报税（Grundtarif）计算，不支持合并报税（Zusammenveranlagung）。'),
  cmp3ColAmount: s('cmp3-col-amount', '每年自己存入（税前，没算补贴）', 'Sparbetrag', 'Begriff des Finanzfluss-Rechners (dcc29a6), kein Normzitat'),
  cmp3ColFoer: s('cmp3-col-foerderung', '国家补贴*'),
  // Footnote under the comparison table.
  subsidyFootnote: s('cmp3-subsidy-footnote', '* 整个存钱期的合计，是存进去的钱（税前），不是领取时到手的钱。选『花掉』时只算补贴，选另外两种时也算上退税。其他『合计』都指整个领取期。'),
  // Footnote under the main result (without the 『合计』 sentence).
  resultSubsidyFootnote: s('result-subsidy-footnote', '* 整个存钱期的合计，是存进去的钱（税前），不是领取时到手的钱。选『花掉』时只算补贴，选另外两种时也算上退税。'),
  // Stage 4 (PLAN_stage4.md 2.2, Q10): shown after resultSubsidyFootnote and after subsidyFootnote (same text in both places).
  singleOnlyFootnote: s('single-only-footnote', '已婚合并报税（Zusammenveranlagung，§26b EStG）按 Splittingtarif（§32a Abs. 5 EStG）算税，夫妻的储蓄者免税额合计 2.000 €（§20 Abs. 9 S. 2 EStG），配偶自己的合同和补贴也要另算（只靠配偶才有资格的一方，补贴最多 175 €，存的钱算进配偶的抵税额度里）。这些计算器都没有算，结果只适用于单人。', 'Zusammenveranlagung; Splittingtarif; Sparerpauschbetrag', '§26b EStG; §32a Abs. 5 EStG; §20 Abs. 9 S. 2 EStG; §10a Abs. 3 EStG; BMF FAQ Reform der privaten Altersvorsorge (175 €)'),
  spouseOnlyNotice: s('spouse-only-notice', '如果你自己没有交法定养老保险，只是因为配偶有资格才能拿补贴（mittelbar zulageberechtigt，§79 S. 2 EStG），这个计算器不适合你：你的补贴最多 175 €，存的钱也要算进配偶的抵税额度，计算器算不出这些。', 'mittelbar zulageberechtigt', '§79 S. 2 EStG; §10a Abs. 3 EStG; BMF FAQ Reform der privaten Altersvorsorge (175 €)'),
  cmp3ColAv: s('cmp3-col-av', 'AV-Depot 领取期合计（税后）', 'netto', 'Alltagsbegriff, kein Normzitat'),
  cmp3ColNormal: s('cmp3-col-normal', '普通 ETF 账户领取期合计（税后）', 'netto', 'Alltagsbegriff, kein Normzitat'),
  cmp3ColDiff: s('cmp3-col-diff', '差额（税后，AV − 普通）'),
  cmp3ColVerdict: s('cmp3-col-verdict', '结论（按税后）'),
  cmp3ColMarginal: s('cmp3-col-marginal', '每多存 1 €，整个领取期税后一共多拿约 … €（没有按时间折算）'),
  cmp3ColMonthly: s('cmp3-col-monthly', '每月到手（税后）', 'netto pro Monat', 'Alltagsbegriff, kein Normzitat'),
  cmp3ColSplit: s('cmp3-col-split', 'AV 存 1.800 €，其余放普通 ETF 账户（领取期合计，税后）（约数）'),
  cmp3MarginalCell: s('cmp3-cell-marginal', 'AV 约 {a} € · 普通 约 {b} €'),
  cmp3MonthlyCell: s('cmp3-cell-monthly', 'AV {a} · 普通 {b}'),
  cmp3UserTag: s('cmp3-user-tag', '你的金额'),
  cmp3Label360: s('cmp3-label-360', '360 € 以上的部分每存 1 € 补 0,25 €（前 360 € 仍是每 1 € 补 0,50 €）', 'Grundzulage', '§84 EStG（2027 年起版本）; BMF FAQ Reform der privaten Altersvorsorge'),
  cmp3Label1800: s('cmp3-label-1800', '补贴和抵税都到顶：超过 1.800 € 的部分没有补贴，也不能抵税，领钱时按另一套规则交税', 'Grundzulage; Sonderausgabenabzug', '§84 / §10a Abs. 1 EStG（2027 年起版本）; BMF FAQ Reform der privaten Altersvorsorge'),
  cmp3Note1800Reinvest: s('cmp3-note-1800-reinvest', '选『再存进 AV』时，再存进去的退税也算在超出的部分里。'),
  cmp3Note13680: s('cmp3-note-13680', '存入 13.680 € 时，选『存回 AV』和『另存普通账户』结果相同，选『花掉』不同（这是计算核心的处理办法，不是法律规定）。'),
  cmp3DiffNote: s('cmp3-diff-note', '差额按未取整的金额计算，可能和两个合计相减差 1 €；百分比 = 差额 ÷ 两者中较大的领取期税后合计。'),
  cmp3SplitUnder: s('cmp3-splitnote-under', '按你的收入和收益率假设计算，换了假设结果可能不同。'),
  cmp3SplitNote: s('cmp3-splitnote-approx', '分两次计算后相加。普通账户那部分的税没有把 AV 领取的钱算进收入，所以这一列可能偏高，退休后收入越低偏得越多（例如退休后收入 10.000 € 时约 3,4 %；工作期收入 30.000 € 时约 3,5 %）。'),
  cmp3SplitNoteSecondary: s('cmp3-splitnote-secondary', '选『另开账户投资』时，储蓄者免税额（Sparerpauschbetrag）重复算了一次。', 'Sparerpauschbetrag', '§20 Abs. 9 EStG'),
  cmp3SplitLe1800: s('cmp3-splitnote-le1800', '—：每年存入不超过 1.800 € 时，这一列和『全部存进 AV』相同。'),
  cmp3SplitLt120: s('cmp3-splitnote-lt120', '—：剩下的不到 120 €，计算器只能算每年至少 120 € 的金额，所以这一格不显示。'),
  cmp3Share: s('cmp3-share', '（{p} %）'),

  // stage 3: chart (PLAN_stage3.md c)
  chartTitle: s('cmp3-chart-title', '税后差额（AV − 普通，领取期合计，€）'),
  chartXAxis: s('cmp3-chart-xaxis', '档位（不按比例）'),
  chartYAxis: s('cmp3-chart-yaxis', '税后差额（€）'),
  chartBand: s('cmp3-chart-band', '浅色带 = 两者基本相同'),
  chartCap: s('cmp3-marker-6840', '一份合同每年的上限'),
  chartKink: s('cmp3-marker', '拐点 {a} €'),
  chartTableFirst: s('cmp3-chart-caption', '具体数字以表格为准。'),

  // stage 3: narrow-screen error banner (plan f3)
  errBanner: s('form-error-banner', '请先改正标红的项目'),
  errJump: s('form-error-jump', '跳到第一个标红项'),

  notesHeading: s('notes-heading', '提示 · 免责 · 来源'),
} satisfies Record<string, UiString>

export type StrKey = keyof typeof STR

export function t(key: StrKey, vars: Record<string, string | number> = {}): string {
  return STR[key].zh.replace(/\{(\w+)\}/g, (m, k: string) =>
    k in vars ? String(vars[k]) : m,
  )
}
