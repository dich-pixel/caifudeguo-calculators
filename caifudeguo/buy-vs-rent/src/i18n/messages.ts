export type Lang = 'zh' | 'de'

export interface Dict {
  title: string
  intro: string
  lang_zh: string
  lang_de: string
  groups: {
    basic: string
    loan: string
    costs: string
    growth: string
    sell: string
    risk: string
  }
  fields: Record<string, string>
  help: Record<string, string>
  ph_inherit: string
  full_term: string
  nk_detailed: string
  nk_total: string
  maint_total: string
  maint_building: string
  keep_payment: string
  new_tilgung: string
  yes: string
  no: string
  kirchen_8: string
  kirchen_9: string
  run_mc: string
  mc_running: string
  copy_link: string
  link_copied: string
  export_csv: string
  export_yearly: string
  export_monthly: string
  reset: string
  toggle_liq: string
  toggle_nonliq: string
  toggle_nom: string
  toggle_real: string
  buyer: string
  renter: string
  better_buy: string
  better_rent: string
  better_tie: string
  banner_more: string
  banner_less: string
  banner_tie: string
  breakeven: string
  breakeven_none: string
  persistent: string
  reversed: string
  net_worth: string
  of_which_latent: string
  house_end: string
  restschuld: string
  cum_interest: string
  taxes_paid: string
  latent_tax: string
  sell_cost: string
  spec_tax: string
  cost_total: string
  loan_amount: string
  payment: string
  nk_detail: string
  grest: string
  notary: string
  broker: string
  rent_factor: string
  charts: Record<string, string>
  years: string
  yearly_table: string
  monthly_table: string
  assumptions: string
  assume_items: string[]
  disclaimer: string
  version: string
  loading: string
  errors_heading: string
  warnings_heading: string
  other_capital: string
  progress: string
  p_buy: string
  hist: string
  band: string
  issues: Record<string, string>
  table: Record<string, string>
  csv_year: string
  csv_month: string
}

const zhHelp = {
  cash_monthly: '每个月你可以用于「住房 + 投资」的钱，两种选择下都一样。买房者用它付月供、维护费和其他持有成本，租房者用它付租金；剩下的钱都投入 ETF。如果某个月住房成本高于这个金额，差额会从该方的 ETF 中取出（取出时可能要交税）；ETF 用完以后计为负债，按透支利率计息。默认这笔钱每年按通胀率增长。',
  wealth: '总资产减去投入的自有资金（首付 + 附加费用 + 装修），就是剩余资金。两种选择下，剩余资金都从第一天起投入 ETF。图表中的虚线单独显示它的增长（税前示意）。',
  down_payment: '投入的自有资金包含附加费用和装修费。剩余资金 = 总资产 − 投入的自有资金，从第一天起投入 ETF。',
  liq: '「变现」假设比较期结束时卖掉房子、卖掉全部 ETF 并交税，得到的是真正能拿到手的钱，我们的主要结论用这个口径。「不变现」把房子按市价、ETF 按市值计算，没有扣除卖出时才会产生的税和费用；这些潜在的税和费用单独列出。',
  sell_cost_pct: '默认卖房成本为 0，假设你自己私下出售房子、不请中介。如果请中介，卖方通常要付约 3,57 % 的中介费（含增值税），你可以在「卖房成本」中填入。',
  self_use_exempt: '在德国，私人出售房产时，如果买入和卖出相隔不满 10 年，收益通常要按个人所得税率交税（§23 EStG）。但如果房子在卖出当年和之前两个日历年都由你自己居住，就可以免税。计算器默认你满足自住条件。如果你取消这个选项，并且比较期少于 10 年，卖房收益会按你填写的个人边际税率征税。',
  etf_return: 'ETF 收益按德国资本收益税计算：25 % Abgeltungsteuer 加 5,5 % 团结附加税，合计 26,375 %（不计教会税）。股票型 ETF 有 30 % 的收益免税（Teilfreistellung），所以实际税率约为收益的 18,46 %。累积型 ETF 每年还要按 Vorabpauschale 预先交一部分税，计算基准是联邦财政部每年公布的 Basiszins（当前为 3,20 %），预交的税会在卖出时抵扣。每次从 ETF 取钱时，按平均成本法计算收益并当场交税。',
  tax_note: '计算器**不考虑**每人每年 1.000 €（夫妻 2.000 €）的资本收益免税额（Sparerpauschbetrag），假设它已经被你的其他存款、基金或股票收益用完。如果你实际上还有未用完的免税额，ETF 的实际税负会略低于计算结果。',
  tax_note_on: '已按开关计入每年 1.000 €（单身）的 Sparerpauschbetrag，以及教会税。资本收益税按公式 rate(k) = 0,25/(1+0,25·k)·(1+0,055+k) 计算，k 为所选教会税率 8 % 或 9 %。当年未用完的免税额不结转到下一年。',
  use_sparer_kirchen: '默认关闭：不计 Sparerpauschbetrag，也不计教会税，资本收益税为 26,375 %。打开后，每年先扣除单身 Sparerpauschbetrag 1.000 €，并按所选 8 % 或 9 % 的教会税率用上述公式计算资本收益税。未用完的免税额不结转。',
  kirchen_rate: '巴登-符腾堡和巴伐利亚为 8 %，其余联邦州为 9 %。默认 9 %。',
  nk: '在德国买房，除了房价，还要付 Grunderwerbsteuer（按联邦州 3,5–6,5 %）、公证和土地登记费（约 2 %），以及可能的中介费（买方通常约 3,57 %）。这些费用和装修费一样，付出去就收不回来，不会增加房子的市值。',
  loan_rate: '贷款按德国常见的年金方式计算：每月还款额固定，包括利息和本金。利率锁定期（Zinsbindung）结束后，剩余贷款按你填写的续贷利率（Anschlusszins）继续计算。默认月供不变；如果新利率太高、月供连利息都不够付，计算器会把月供提高到「利息 + 1 % 还本」。',
  matrix: '房价增速和 ETF 收益是影响结论最大的两个假设。矩阵把这两个数分别调低和调高，组成 9 种组合，显示每种组合下买房比租房多（绿色）或少（红色）的金额。',
  mc: '现实中 ETF 收益每年都在波动。模拟用随机生成的月收益重复计算上千次（默认年化波动 15 %），显示结果的分布：P10 表示 10 % 的情况比它更差，P50 是中位数，P90 表示只有 10 % 的情况比它更好。尤其当某一方需要从 ETF 中取钱时，收益出现的先后顺序会影响结果。模拟使用固定种子，同样的输入每次得到同样的结果。',
  real: '「实际值」按你填写的通胀率折算成今天的购买力。30 年、2 % 通胀时，1 € 只相当于今天的约 0,55 €。',
  renovation: '购房时一次性支出，按沉没成本处理，不增加房屋市值。',
  renter_nebenkosten: '只填租房者独有、买房者没有的费用。',
  buyer_other_costs: '如 Grundsteuer、Gebäudeversicherung、nicht umlagefähiges Hausgeld。两边都要付的生活费用不要填。',
  house_growth: '理解为扣除建筑老化后的净增速。',
  rent: '同等房屋的市场租金。',
  broker_buy_pct: '没有中介填 0。',
} as const

export const zh: Dict = {
  title: '买房还是租房？',
  intro: '这个计算器比较两条路径：买房自住，或者继续租房并把钱投资到 ETF。两边起始资产相同，每个月可以花的钱也相同。我们模拟每个月的现金流、贷款、房价、租金、ETF 收益和德国的资本收益税，算出 N 年后两边各有多少净资产。结果取决于你的假设，不是对未来的预测。',
  lang_zh: '中文',
  lang_de: 'Deutsch',
  groups: {
    basic: '基本',
    loan: '贷款',
    costs: '费用',
    growth: '增长与投资',
    sell: '卖房与税',
    risk: '风险分析',
  },
  fields: {
    price: '房价（Kaufpreis）',
    renovation: '装修（Renovierung）',
    down_payment: '投入的自有资金（Eigenkapitaleinsatz）',
    wealth: '总资产（Gesamtvermögen）',
    nk_mode: '附加费用计算方式',
    nk_total_pct: '附加费用合计（Kaufnebenkosten gesamt）',
    grest_pct: 'Grunderwerbsteuer 税率',
    notary_pct: '公证 + 土地登记（Notar + Grundbuch）',
    broker_buy_pct: '买方中介费（Maklerprovision, Käufer）',
    maint_pct: '维护费率（Instandhaltung）',
    maint_base: '维护费基数',
    building_share: '建筑占比（Gebäudeanteil）',
    maint_growth: '维护费年增长',
    buyer_other_costs: '买房者其他持有成本（sonstige Eigentümerkosten）',
    buyer_other_growth: '其他持有成本年增长',
    house_growth: '房价年增长（Wertentwicklung）',
    loan_rate: '贷款利率（Sollzins）',
    init_tilgung: '初始本金还款率（anfängliche Tilgung）',
    fix_years: '利率锁定期（Zinsbindung）',
    follow_rate: '续贷利率（Anschlusszins）',
    follow_mode: '续贷月供规则',
    follow_tilgung: '续贷 Tilgung',
    sondertilgung_pct: '年度额外还款（Sondertilgung）',
    rent: '冷租（Kaltmiete）',
    rent_growth: '租金年增长（Mietsteigerung）',
    renter_nebenkosten: '租房者额外费用（Mieter-Nebenkosten）',
    renter_nk_growth: '租房者额外费用年增长',
    renter_renovation: '租房者一次性支出',
    cash_monthly: '每月可支配现金（monatlich verfügbares Geld）',
    cash_growth: '可支配现金年增长',
    etf_return: 'ETF 年收益（税前、名义）',
    inflation: '通胀率（Inflation）',
    horizon_years: '比较期限',
    house_err: '情景矩阵：房价步长 e₁',
    etf_err: '情景矩阵：ETF 步长 e₂',
    borrow_rate: '透支借款利率',
    sell_cost_pct: '卖房成本（Verkaufskosten）',
    self_use_exempt: '满足自住免税条件（§23 EStG）',
    personal_tax_rate: '个人边际税率',
    use_sparer_kirchen: 'Sparerpauschbetrag / 教会税',
    kirchen_rate: 'Kirchensteuer 税率',
    mc_runs: '模拟次数',
    mc_sigma: 'ETF 年化波动率 σ',
    mc_seed: '随机种子',
  },
  help: { ...zhHelp },
  ph_inherit: '= 通胀 {v}',
  full_term: '全期',
  nk_detailed: '分项',
  nk_total: '合计百分比',
  maint_total: '房价',
  maint_building: '房价 × 建筑占比',
  keep_payment: '月供不变',
  new_tilgung: '按新 Tilgung 重算',
  yes: '是',
  no: '否',
  kirchen_8: '8 %',
  kirchen_9: '9 %',
  run_mc: '运行模拟',
  mc_running: '正在模拟…',
  copy_link: '复制链接',
  link_copied: '已复制',
  export_csv: '导出 CSV',
  export_yearly: '导出年度表',
  export_monthly: '导出月度表',
  reset: '恢复默认',
  toggle_liq: '变现',
  toggle_nonliq: '不变现',
  toggle_nom: '名义',
  toggle_real: '实际',
  buyer: '买房',
  renter: '租房',
  better_buy: '买房更优',
  better_rent: '租房更优',
  better_tie: '两边相同',
  banner_more: '按变现口径，{n} 年后买房比租房多 {x}（今天购买力 {y}）',
  banner_less: '按变现口径，{n} 年后买房比租房少 {x}（今天购买力 {y}）',
  banner_tie: '按变现口径，{n} 年后买房与租房的净资产相同（今天购买力 {y}）',
  breakeven: '盈亏平衡年（变现）',
  breakeven_none: '比较期内买房不占优',
  persistent: '持续',
  reversed: '之后又反转',
  net_worth: '期末净资产',
  of_which_latent: '其中潜在税',
  house_end: '期末房价',
  restschuld: '剩余贷款（Restschuld）',
  cum_interest: '累计利息',
  taxes_paid: '累计已缴税',
  latent_tax: '潜在税',
  sell_cost: '卖房成本',
  spec_tax: '§23 税',
  cost_total: '买房总支出',
  loan_amount: '贷款额',
  payment: '初始月供',
  nk_detail: '附加费用明细',
  grest: 'Grunderwerbsteuer',
  notary: '公证 + 土地登记',
  broker: '买方中介费',
  rent_factor: '期初租售比',
  charts: {
    net: '净资产对比',
    composition: '买房者资产构成',
    loan: '贷款',
    cash: '每月现金流',
    tax: '税',
    matrix: '情景矩阵',
    mc: '蒙特卡洛',
  },
  years: '年',
  yearly_table: '年度表',
  monthly_table: '月度表',
  assumptions: '模型假设',
  assume_items: [
    '收益率和增长率是固定的年率（蒙特卡洛除外）。',
    '不考虑出租、KfW、Riester、分红型 ETF。',
    '两边都要付的生活费用（取暖、水电等）不计入。',
    'Vorabpauschale 在当年年末处理；模型年按日历年计算。',
    '负债按透支利率复利。',
  ],
  disclaimer: '本计算器仅用于教育和信息目的，基于简化模型和你输入的假设，不构成投资、税务、法律或融资建议。税法规定（例如 Basiszins、税率）可能变化；实际结果会因市场变化和个人情况而不同。重大决定前请咨询 Steuerberater、Finanzberater 或银行。所有计算都在你的浏览器中完成，不会上传任何输入数据。',
  version: 'v{v} · Basiszins {y}',
  loading: '计算中…',
  errors_heading: '请先修正以下输入',
  warnings_heading: '请注意',
  other_capital: '其中：剩余资金（税前示意）',
  progress: '{done} / {total}',
  p_buy: '买房占优的概率',
  hist: '差额（变现）分布',
  band: '净资产（变现）P10–P90',
  issues: {
    'E-HORIZON': '比较期限必须是 1 到 100 之间的整数年。',
    'E-RATE': '「{字段}」超出允许范围（{min} … {max}）。',
    'E-PRICE': '房价和冷租必须大于 0。',
    'E-NEG': '「{字段}」不能为负数。',
    'E-DOWN-GT-WEALTH': '投入的自有资金不能超过总资产。',
    'I-NO-LOAN': '自有资金已经超过买房总支出，不需要贷款；多出的 {x} € 计入买房者的投资账户。',
    'E-NO-AMORT': '贷款利率和 Tilgung 不能同时为 0。',
    'W-NOTILG': 'Tilgung 为 0，贷款永远还不清，期末会扣除全部剩余贷款。',
    'E-FIX': '利率锁定期必须是 1 到 40 年的整数，或选择「全期」。',
    'E-REFI-INPUT': '请填写续贷后的 Tilgung。',
    'W-REFI': '锁定期结束后，原月供不够支付利息，已按「续贷利率 + 1 % Tilgung」重新计算月供。',
    'W-DEBT': '{who}的投资账户在第 {k} 个月（第 {y} 年）用完，之后的缺口按 {rate} 计为负债。',
    'W-23': '持有不满 10 年且不满足自住条件，卖房收益按个人税率征税（§23 EStG）。',
    'I-CASH': '{who}每月住房成本超过可支配现金，差额从该方的投资账户中支取。',
    'W-RANGE': '「{字段}」高于常见水平，请确认。',
    'I-MC-SLOW': '次数较多，计算可能需要几秒钟。',
  },
  table: {
    year: '年',
    house: '房价',
    balance: '剩余贷款',
    cum_principal: '累计本金',
    cum_interest: '累计利息',
    rent_month: '冷租（12 月）',
    buyer_cost_month: '买房住房成本（12 月）',
    renter_cost_month: '租房住房成本（12 月）',
    cash_month: '可支配现金（12 月）',
    buyer_etf: '买房 ETF',
    renter_etf: '租房 ETF',
    buyer_debt: '买房负债',
    renter_debt: '租房负债',
    diff_liq: '差额（变现）',
    diff_nonliq: '差额（不变现）',
    buyer_liq: '买房（变现）',
    renter_liq: '租房（变现）',
    month: '月',
    rate: '利率',
    interest: '利息',
    principal: '本金',
    sonder: 'Sondertilgung',
  },
  csv_year: '年度表',
  csv_month: '月度表',
}

export const de: Dict = {
  title: 'Kaufen oder mieten?',
  intro: 'Dieser Rechner vergleicht zwei Wege: eine selbst genutzte Immobilie zu kaufen oder weiter zu mieten und das Geld in ETFs anzulegen. Beide Seiten starten mit dem gleichen Vermögen und haben jeden Monat denselben verfügbaren Betrag. Wir simulieren monatlich Cashflows, das Darlehen, Immobilienpreis, Miete, ETF-Rendite und die deutsche Kapitalertragsteuer und berechnen, wie hoch das Nettovermögen beider Seiten nach N Jahren ist. Das Ergebnis hängt von Ihren Annahmen ab und ist keine Prognose.',
  lang_zh: '中文',
  lang_de: 'Deutsch',
  groups: {
    basic: 'Grundangaben',
    loan: 'Darlehen',
    costs: 'Kosten',
    growth: 'Wachstum und Anlage',
    sell: 'Verkauf und Steuern',
    risk: 'Risikoanalyse',
  },
  fields: {
    price: 'Kaufpreis',
    renovation: 'Renovierung',
    down_payment: 'Eigenkapitaleinsatz',
    wealth: 'Gesamtvermögen',
    nk_mode: 'Berechnung der Kaufnebenkosten',
    nk_total_pct: 'Kaufnebenkosten gesamt',
    grest_pct: 'Grunderwerbsteuer',
    notary_pct: 'Notar + Grundbuch',
    broker_buy_pct: 'Maklerprovision (Käufer)',
    maint_pct: 'Instandhaltung',
    maint_base: 'Bemessungsgrundlage Instandhaltung',
    building_share: 'Gebäudeanteil',
    maint_growth: 'Jährliche Steigerung der Instandhaltung',
    buyer_other_costs: 'Sonstige Eigentümerkosten',
    buyer_other_growth: 'Jährliche Steigerung der sonstigen Eigentümerkosten',
    house_growth: 'Wertentwicklung der Immobilie',
    loan_rate: 'Sollzins',
    init_tilgung: 'Anfängliche Tilgung',
    fix_years: 'Zinsbindung',
    follow_rate: 'Anschlusszins',
    follow_mode: 'Anschlussrate',
    follow_tilgung: 'Anschluss-Tilgung',
    sondertilgung_pct: 'Jährliche Sondertilgung',
    rent: 'Kaltmiete',
    rent_growth: 'Mietsteigerung',
    renter_nebenkosten: 'Mieter-Nebenkosten',
    renter_nk_growth: 'Jährliche Steigerung der Mieter-Nebenkosten',
    renter_renovation: 'Einmalige Ausgaben der Mietseite',
    cash_monthly: 'Monatlich verfügbares Geld',
    cash_growth: 'Jährliche Steigerung des verfügbaren Geldes',
    etf_return: 'ETF-Rendite (vor Steuern, nominal)',
    inflation: 'Inflation',
    horizon_years: 'Vergleichszeitraum',
    house_err: 'Szenariomatrix: Schrittweite Immobilienpreis e₁',
    etf_err: 'Szenariomatrix: Schrittweite ETF e₂',
    borrow_rate: 'Überziehungszins',
    sell_cost_pct: 'Verkaufskosten',
    self_use_exempt: 'Selbstnutzung, steuerfrei nach §23 EStG',
    personal_tax_rate: 'Persönlicher Grenzsteuersatz',
    use_sparer_kirchen: 'Sparerpauschbetrag / Kirchensteuer',
    kirchen_rate: 'Kirchensteuersatz',
    mc_runs: 'Anzahl der Simulationen',
    mc_sigma: 'ETF-Volatilität σ (jährlich)',
    mc_seed: 'Zufallsstartwert',
  },
  help: {
    cash_monthly: 'Der Betrag, den Sie monatlich für Wohnen und Geldanlage verwenden können — in beiden Varianten gleich. Die Käuferseite zahlt damit Rate, Instandhaltung und sonstige Eigentümerkosten, die Mietseite die Miete; der Rest fließt in ETFs. Liegen die Wohnkosten in einem Monat darüber, wird die Differenz aus dem jeweiligen ETF entnommen (dabei kann Steuer anfallen); ist der ETF aufgebraucht, wird der Fehlbetrag als Verbindlichkeit zum Überziehungszins verzinst. Standardmäßig wächst dieser Betrag jährlich mit der Inflation.',
    wealth: 'Gesamtvermögen minus eingesetztes Eigenkapital (Anzahlungsanteil + Kaufnebenkosten + Renovierung) ist das Restkapital. In beiden Varianten wird es vom ersten Tag an in ETFs angelegt. Die gestrichelte Linie im Diagramm zeigt sein Wachstum (vor Steuern, zur Orientierung).',
    down_payment: 'Der Eigenkapitaleinsatz umfasst Kaufnebenkosten und Renovierung. Restkapital = Gesamtvermögen − Eigenkapitaleinsatz, ab dem ersten Tag in ETFs angelegt.',
    liq: '„Liquidiert“ nimmt an, dass Immobilie und sämtliche ETF-Anteile am Ende des Vergleichszeitraums verkauft und versteuert werden — das ist das Geld, das tatsächlich zur Verfügung stünde, und die Grundlage unserer Hauptaussage. „Nicht liquidiert“ setzt die Immobilie zum Marktwert und die ETFs zum Kurswert an, ohne Steuern und Kosten, die erst beim Verkauf entstehen; diese latenten Beträge werden gesondert ausgewiesen.',
    sell_cost_pct: 'Die Verkaufskosten stehen standardmäßig auf 0, unter der Annahme eines privaten Verkaufs ohne Makler. Bei einem Makler zahlt die Verkäuferseite üblicherweise rund 3,57 % Provision (inkl. Umsatzsteuer); diesen Satz können Sie unter „Verkaufskosten“ eintragen.',
    self_use_exempt: 'Beim privaten Verkauf einer Immobilie in Deutschland ist der Gewinn in der Regel einkommensteuerpflichtig (§23 EStG), wenn zwischen Kauf und Verkauf weniger als 10 Jahre liegen. Nutzen Sie die Immobilie im Jahr der Veräußerung und in den beiden vorangegangenen Kalenderjahren selbst, bleibt der Verkauf steuerfrei. Der Rechner nimmt das standardmäßig an. Deaktivieren Sie die Option und ist der Vergleichszeitraum kürzer als 10 Jahre, wird der Veräußerungsgewinn mit Ihrem persönlichen Grenzsteuersatz besteuert.',
    etf_return: 'ETF-Erträge werden nach deutscher Kapitalertragsteuer gerechnet: 25 % Abgeltungsteuer plus 5,5 % Solidaritätszuschlag, zusammen 26,375 % (ohne Kirchensteuer). Aktien-ETFs haben eine Teilfreistellung von 30 %, sodass der effektive Satz rund 18,46 % der Erträge beträgt. Thesaurierende ETFs zahlen außerdem jährlich eine Vorabpauschale; Bemessungsgrundlage ist der vom Bundesfinanzministerium veröffentlichte Basiszins (derzeit 3,20 %). Die vorausbezahlte Steuer wird beim Verkauf angerechnet. Bei jeder Entnahme aus dem ETF wird der Gewinn nach Durchschnittsmethode ermittelt und sofort versteuert.',
    tax_note: 'Der Rechner berücksichtigt den Sparerpauschbetrag von 1.000 € je Person (2.000 € bei Zusammenveranlagung) nicht und nimmt an, dass er bereits durch andere Kapitalerträge aufgebraucht ist. Haben Sie tatsächlich noch ungenutzten Pauschbetrag, liegt die tatsächliche Steuerbelastung der ETFs etwas unter dem Rechenergebnis.',
    tax_note_on: 'Der Schalter ist aktiv: Es werden der Sparerpauschbetrag von 1.000 € je Jahr (ledig) und die Kirchensteuer berücksichtigt. Die Kapitalertragsteuer folgt der Formel rate(k) = 0,25/(1+0,25·k)·(1+0,055+k) mit dem gewählten Kirchensteuersatz k von 8 % oder 9 %. Ein nicht ausgeschöpfter Pauschbetrag wird nicht ins Folgejahr übertragen.',
    use_sparer_kirchen: 'Standardmäßig aus: ohne Sparerpauschbetrag und ohne Kirchensteuer, Kapitalertragsteuer 26,375 %. Wenn eingeschaltet, wird jährlich zuerst der Sparerpauschbetrag von 1.000 € (ledig) abgezogen und die Kirchensteuer mit 8 % oder 9 % nach der genannten Formel einbezogen. Nicht ausgeschöpfter Pauschbetrag wird nicht vorgetragen.',
    kirchen_rate: 'In Baden-Württemberg und Bayern beträgt die Kirchensteuer 8 %, in den übrigen Ländern 9 %. Vorgabe ist 9 %.',
    nk: 'Beim Immobilienkauf in Deutschland fallen neben dem Kaufpreis die Grunderwerbsteuer (je nach Bundesland 3,5–6,5 %), Notar- und Grundbuchkosten (rund 2 %) und gegebenenfalls eine Maklerprovision (Käuferseite typischerweise rund 3,57 %) an. Diese Kosten und die Renovierung sind versunken: Sie erhöhen den Marktwert der Immobilie nicht.',
    loan_rate: 'Das Darlehen wird als typische deutsche Annuität gerechnet: Die monatliche Rate ist fest und enthält Zins und Tilgung. Nach Ende der Zinsbindung wird die Restschuld mit dem von Ihnen angegebenen Anschlusszins weitergerechnet. Standardmäßig bleibt die Rate unverändert; reicht sie beim neuen Zins nicht einmal für die Zinsen, hebt der Rechner sie auf „Zins + 1 % Tilgung“ an.',
    matrix: 'Immobilienpreis-Wachstum und ETF-Rendite sind die beiden Annahmen mit dem größten Einfluss. Die Matrix senkt und hebt beide Werte und zeigt in neun Kombinationen, um wie viel die Käuferseite besser (grün) oder schlechter (rot) abschneidet als die Mietseite.',
    mc: 'ETF-Renditen schwanken von Jahr zu Jahr. Die Simulation wiederholt die Rechnung mit zufälligen Monatsrenditen viele Male (Standard: 15 % jährliche Volatilität) und zeigt die Verteilung: P10 bedeutet, dass 10 % der Fälle schlechter sind, P50 ist der Median, P90 heißt, dass nur 10 % der Fälle besser sind. Besonders wenn eine Seite aus dem ETF entnehmen muss, beeinflusst die Reihenfolge der Renditen das Ergebnis. Die Simulation verwendet einen festen Startwert; gleiche Eingaben liefern immer dasselbe Ergebnis.',
    real: '„Reale Werte“ werden mit der von Ihnen angegebenen Inflationsrate in heutige Kaufkraft umgerechnet. Bei 30 Jahren und 2 % Inflation entspricht 1 € nur noch rund 0,55 € von heute.',
    renovation: 'Einmalige Ausgabe beim Kauf, als versunkene Kosten behandelt; sie erhöht den Marktwert der Immobilie nicht.',
    renter_nebenkosten: 'Nur Kosten eintragen, die allein die Mietseite trägt und die Käuferseite nicht.',
    buyer_other_costs: 'Zum Beispiel Grundsteuer, Gebäudeversicherung, nicht umlagefähiges Hausgeld. Lebenshaltungskosten, die beide Seiten zahlen, nicht eintragen.',
    house_growth: 'Zu verstehen als Nettowachstum nach Abnutzung der Bausubstanz.',
    rent: 'Marktmiete einer vergleichbaren Wohnung.',
    broker_buy_pct: 'Ohne Makler 0 eintragen.',
  },
  ph_inherit: '= Inflation {v}',
  full_term: 'gesamte Laufzeit',
  nk_detailed: 'Einzeln',
  nk_total: 'Gesamtprozentsatz',
  maint_total: 'Kaufpreis',
  maint_building: 'Kaufpreis × Gebäudeanteil',
  keep_payment: 'Rate unverändert',
  new_tilgung: 'Mit neuer Tilgung neu rechnen',
  yes: 'Ja',
  no: 'Nein',
  kirchen_8: '8 %',
  kirchen_9: '9 %',
  run_mc: 'Simulation starten',
  mc_running: 'Simulation läuft…',
  copy_link: 'Link kopieren',
  link_copied: 'Kopiert',
  export_csv: 'CSV exportieren',
  export_yearly: 'Jahrestabelle exportieren',
  export_monthly: 'Monatstabelle exportieren',
  reset: 'Standardwerte wiederherstellen',
  toggle_liq: 'Liquidiert',
  toggle_nonliq: 'Nicht liquidiert',
  toggle_nom: 'Nominal',
  toggle_real: 'Real',
  buyer: 'Kaufen',
  renter: 'Mieten',
  better_buy: 'Kaufen ist vorteilhafter',
  better_rent: 'Mieten ist vorteilhafter',
  better_tie: 'Beide gleich',
  banner_more: 'Nach liquidierter Betrachtung liegt Kaufen nach {n} Jahren um {x} über Mieten (heutige Kaufkraft {y}).',
  banner_less: 'Nach liquidierter Betrachtung liegt Kaufen nach {n} Jahren um {x} unter Mieten (heutige Kaufkraft {y}).',
  banner_tie: 'Nach liquidierter Betrachtung sind die Nettovermögen nach {n} Jahren gleich (heutige Kaufkraft {y}).',
  breakeven: 'Break-even-Jahr (liquidiert)',
  breakeven_none: 'Im Vergleichszeitraum ist Kaufen nicht im Vorteil',
  persistent: 'dauerhaft',
  reversed: 'danach wieder umgekehrt',
  net_worth: 'Nettovermögen am Ende',
  of_which_latent: 'davon latente Steuer',
  house_end: 'Immobilienwert am Ende',
  restschuld: 'Restschuld',
  cum_interest: 'Kumulierte Zinsen',
  taxes_paid: 'Bereits gezahlte Steuern',
  latent_tax: 'Latente Steuer',
  sell_cost: 'Verkaufskosten',
  spec_tax: 'Steuer nach §23 EStG',
  cost_total: 'Gesamtaufwand Kauf',
  loan_amount: 'Darlehensbetrag',
  payment: 'Anfängliche Monatsrate',
  nk_detail: 'Kaufnebenkosten im Einzelnen',
  grest: 'Grunderwerbsteuer',
  notary: 'Notar + Grundbuch',
  broker: 'Maklerprovision (Käufer)',
  rent_factor: 'Anfänglicher Kaufpreisfaktor',
  charts: {
    net: 'Nettovermögen im Vergleich',
    composition: 'Vermögensaufbau der Käuferseite',
    loan: 'Darlehen',
    cash: 'Monatliche Zahlungsströme',
    tax: 'Steuern',
    matrix: 'Szenariomatrix',
    mc: 'Monte-Carlo',
  },
  years: 'Jahre',
  yearly_table: 'Jahrestabelle',
  monthly_table: 'Monatstabelle',
  assumptions: 'Modellannahmen',
  assume_items: [
    'Renditen und Wachstumsraten sind feste Jahreswerte (außer in der Monte-Carlo-Simulation).',
    'Vermietung, KfW, Riester und ausschüttende ETFs werden nicht betrachtet.',
    'Lebenshaltungskosten, die beide Seiten tragen (Heizung, Strom und Wasser usw.), bleiben unberücksichtigt.',
    'Die Vorabpauschale wird am Ende des Modelljahres gebucht; Modelljahre entsprechen Kalenderjahren.',
    'Verbindlichkeiten werden mit dem Überziehungszins verzinst.',
  ],
  disclaimer: 'Dieser Rechner dient ausschließlich der Information und Bildung. Er beruht auf einem vereinfachten Modell und Ihren Eingaben und stellt keine Anlage-, Steuer-, Rechts- oder Finanzierungsberatung dar. Steuerliche Regeln (etwa Basiszins und Steuersätze) können sich ändern; tatsächliche Ergebnisse weichen durch Markt und persönliche Umstände ab. Bitte ziehen Sie vor wichtigen Entscheidungen eine Steuerberatung, Finanzberatung oder Ihre Bank hinzu. Alle Berechnungen laufen in Ihrem Browser; es werden keine Eingaben übertragen.',
  version: 'v{v} · Basiszins {y}',
  loading: 'Berechnung…',
  errors_heading: 'Bitte zuerst diese Eingaben korrigieren',
  warnings_heading: 'Hinweise',
  other_capital: 'davon: Restkapital (vor Steuern, zur Orientierung)',
  progress: '{done} / {total}',
  p_buy: 'Wahrscheinlichkeit, dass Kaufen vorteilhafter ist',
  hist: 'Verteilung der Differenz (liquidiert)',
  band: 'Nettovermögen (liquidiert) P10–P90',
  issues: {
    'E-HORIZON': 'Der Vergleichszeitraum muss eine ganze Zahl zwischen 1 und 100 Jahren sein.',
    'E-RATE': '„{字段}“ liegt außerhalb des zulässigen Bereichs ({min} … {max}).',
    'E-PRICE': 'Kaufpreis und Kaltmiete müssen größer als 0 sein.',
    'E-NEG': '„{字段}“ darf nicht negativ sein.',
    'E-DOWN-GT-WEALTH': 'Der Eigenkapitaleinsatz darf das Gesamtvermögen nicht übersteigen.',
    'I-NO-LOAN': 'Das Eigenkapital übersteigt den Gesamtaufwand; ein Darlehen ist nicht nötig. Die Differenz von {x} € wird dem Depot der Käuferseite gutgeschrieben.',
    'E-NO-AMORT': 'Sollzins und Tilgung dürfen nicht gleichzeitig 0 sein.',
    'W-NOTILG': 'Die Tilgung ist 0; das Darlehen wird nicht zurückgeführt. Am Ende wird die volle Restschuld abgezogen.',
    'E-FIX': 'Die Zinsbindung muss eine ganze Zahl zwischen 1 und 40 Jahren sein, oder wählen Sie „gesamte Laufzeit“.',
    'E-REFI-INPUT': 'Bitte geben Sie die Tilgung nach der Anschlussfinanzierung an.',
    'W-REFI': 'Nach Ende der Zinsbindung reicht die bisherige Rate nicht für die Zinsen. Die Rate wurde auf „Anschlusszins + 1 % Tilgung“ neu gerechnet.',
    'W-DEBT': 'Das Depot der {who} ist im {k}. Monat (Jahr {y}) aufgebraucht. Weitere Fehlbeträge werden mit {rate} als Verbindlichkeit verzinst.',
    'W-23': 'Die Haltedauer beträgt weniger als 10 Jahre und die Selbstnutzung ist nicht erfüllt. Der Veräußerungsgewinn wird mit dem persönlichen Steuersatz versteuert (§23 EStG).',
    'I-CASH': 'Die monatlichen Wohnkosten der {who} übersteigen das verfügbare Geld; die Differenz wird aus deren Depot entnommen.',
    'W-RANGE': '„{字段}“ liegt über dem üblichen Niveau. Bitte prüfen Sie die Angabe.',
    'I-MC-SLOW': 'Bei einer hohen Anzahl von Simulationen kann die Berechnung einige Sekunden dauern.',
  },
  table: {
    year: 'Jahr',
    house: 'Immobilie',
    balance: 'Restschuld',
    cum_principal: 'Kumulierte Tilgung',
    cum_interest: 'Kumulierte Zinsen',
    rent_month: 'Kaltmiete (Dez.)',
    buyer_cost_month: 'Wohnkosten Kaufen (Dez.)',
    renter_cost_month: 'Wohnkosten Mieten (Dez.)',
    cash_month: 'Verfügbares Geld (Dez.)',
    buyer_etf: 'ETF Kaufen',
    renter_etf: 'ETF Mieten',
    buyer_debt: 'Verbindlichkeit Kaufen',
    renter_debt: 'Verbindlichkeit Mieten',
    diff_liq: 'Differenz (liquidiert)',
    diff_nonliq: 'Differenz (nicht liquidiert)',
    buyer_liq: 'Kaufen (liquidiert)',
    renter_liq: 'Mieten (liquidiert)',
    month: 'Monat',
    rate: 'Zins',
    interest: 'Zinsen',
    principal: 'Tilgung',
    sonder: 'Sondertilgung',
  },
  csv_year: 'Jahrestabelle',
  csv_month: 'Monatstabelle',
}

export const dicts: Record<Lang, Dict> = { zh, de }
