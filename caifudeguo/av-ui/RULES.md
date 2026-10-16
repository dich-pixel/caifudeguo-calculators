# AV-Depot UI — core rules used / 核心规则（带行号）

All calculation rules come from the unchanged core at upstream commit
[`dcc29a69bdd8a3943d092e4c86ad42bff2767e1a`](https://github.com/finanzfluss/calculators/blob/dcc29a69bdd8a3943d092e4c86ad42bff2767e1a/src/calculators/av-depot.ts)
(`src/calculators/av-depot.ts`, `src/constants/av-depot.ts`). The UI (`caifudeguo/av-ui/src`) only parses German
input, calls `avDepot.schema.safeParse` and `avDepot.calculate`, and formats the result. Line numbers below refer to
that commit; `pnpm run check:core` and the CI `git diff --exit-code dcc29a6 -- src` guarantee they stay valid.

## Input ranges (zod schema, `av-depot.ts:17-78`)

| Field              | UI label                                                                         | Rule                                                                        | Line  |
| ------------------ | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ----- |
| `age`              | 当前年龄 (Alter)                                                                 | integer, 18–67                                                              | 19    |
| `retirementAge`    | 退休年龄 (Renteneintrittsalter)                                                  | integer, 65–70                                                              | 20    |
| `zveSavingsPhase`  | 工作期应税收入                                                                   | ≥ 0                                                                         | 21    |
| `zveRetirement`    | 退休期应税收入                                                                   | ≥ 0                                                                         | 22    |
| `savingsRate`      | 每年存入 (Sparbetrag)                                                            | 120 – `AV_CONTRIBUTION_CAP` = 13.680 (`constants/av-depot.ts:5`, 2 × 6.840) | 23    |
| `etfReturnRate`    | ETF 年收益率 (Rendite)                                                           | > 0, ≤ 100 (%)                                                              | 24-28 |
| `avDepotCosts`     | AV 账户费用 (Kosten)                                                             | 0–100 (%)                                                                   | 29-33 |
| `exemptionOrder`   | 储蓄者免税额 (Sparerpauschbetrag)                                                | 0–1.000, default 1.000                                                      | 34    |
| `taxSavingsMode`   | 退税去向                                                                         | `avDepot` / `secondaryDepot` / `consume`                                    | 35    |
| `baseRate`         | 基准利率 (Basiszins)                                                             | 0–100 (%), default 0                                                        | 36-41 |
| `oneTimePayout`    | 领取开始时一次性取出 (Teilkapitalauszahlung, §1 Abs. 1 S. 1 Nr. 4 AltZertG n.F.) | 0–30 (%)                                                                    | 42-46 |
| `payoutReturnRate` | 领取期收益率                                                                     | > 0, ≤ 100 (%)                                                              | 47-51 |
| `payoutUntilAge`   | 领取到几岁 (Auszahlung bis)                                                      | integer, 85–120                                                             | 52    |
| `childBirthYears`  | 孩子出生年份                                                                     | array of integers ≥ 1900                                                    | 53-56 |
| `currentYear`      | (hidden) start year                                                              | integer ≥ 2027, default `max(2027, current year)`                           | 57-61 |
| cross-field        |                                                                                  | `age < retirementAge`                                                       | 63-66 |
| cross-field        |                                                                                  | `retirementAge < payoutUntilAge`                                            | 67-70 |
| cross-field        |                                                                                  | `avDepotCosts < etfReturnRate`                                              | 71-74 |
| cross-field        |                                                                                  | `avDepotCosts < payoutReturnRate`                                           | 75-78 |

The UI passes `currentYear = max(2027, today's year)` explicitly (`src/params.ts` `startYear`), identical to the core
default, so that tests can fix "today". UI-only input check (no calculation rule): a child birth year after the current
calendar year is rejected (TESTPLAN T2-16); the core itself only requires ≥ 1900.

Note: zod refinements (cross-field rules) only run once every single field is valid, so e.g. "age ≥ retirement age" is
reported after other field errors are fixed.

## Subsidies — `calculateZulagen` (`av-depot.ts:573-602`)

- Below `MIN_OWN_CONTRIBUTION` = 120 € (`constants/av-depot.ts:7`) no subsidy (`585-586`; unreachable because the schema
  minimum is also 120).
- **Grundzulage** (`588-590`): 50 % of the first 360 € + 25 % of the part between 360 € and `AV_SUBSIDIZED_CAP` = 1.800 €
  (`constants/av-depot.ts:4`) → max 180 + 360 = 540 € per year. Contributions above 1.800 € get no further Grundzulage.
- **Erhöhung der Grundzulage um 200 € (§84 S. 2 EStG n.F.; colloquially „Berufseinsteigerbonus“; law: not yet 25 at the start of the contribution year — the core approximates this with the entered age `< 25`)** (`591-592`): `BERUFSEINSTEIGER_BONUS` = 200 € (`constants/av-depot.ts:8`) once, in savings
  year 1, if `age < 25` (age 24 → yes, 25 → no). The UI shows the note `result-bonus-note` under exactly this condition
  (`src/model.ts`, mirrors line 592; the amount itself comes from the core).
- **Kinderzulage** (`593-599`): calendar year = `currentYear + savingsYear − 1`; for each child with
  `0 ≤ calendarYear − birthYear < 18`, add `min(contribution, KINDERZULAGE_CAP)` with cap 300 € (`constants/av-depot.ts:6`).
  The child counts in the calendar year it turns 17 and stops in the year it turns 18. The core does not model the
  extension to 25 for children still receiving Kindergeld → notice `notice-kids-18`.

## Savings phase (`calculateAvDepotSavings`, `av-depot.ts:327-460`)

- Saving years = `retirementAge − age` (`342`).
- Tax saving (Sonderausgabenabzug / Günstigerprüfung vs. subsidies) (`362-370`): deduction base =
  `min(contribution, 1.800) + Grundzulage + Kinderzulage`; saving = `max(0, ESt(zvE) − ESt(zvE − base) − Grundzulage − Kinderzulage)`.
- `taxSavingsMode` (`372-379`): `avDepot` reinvests the saving into the AV account up to 13.680 € total;
  `secondaryDepot` invests it in a normal side depot; `consume` drops it.
- Überzahlung (`381-392`): inflow above `min(own contribution, 1.800) + subsidies` is tracked separately.
- Net return in the AV account = ETF return − costs (`343`); no Vorabpauschale inside the AV account.
- Normal depot (`calculateDepotSavings`, `230-274`): Vorabpauschale = `min(capital × Basiszins × 0,7, gross return)`,
  taxed after 30 % Teilfreistellung (`TEILFREISTELLUNG` 0,7) and Sparerpauschbetrag via Günstigerprüfung (`244-251`).

## Payout phase

- Payout years = `payoutUntilAge − retirementAge` (`291`, `485`); annuity via `pmt(…, type 1)` on capital after the
  one-time payout; one-time payout is added to the first payout year (`309-312`, `552-557`).
- AV account: subsidised part taxed at the marginal income tax rate (`grenzsteuer`, `604-606`); Überzahlung gains taxed
  with the half-income rule if `retirementAge ≥ 62` and ≥ 12 saving years (`521-522`, `528-536`).
- Normal depot: gain share × 0,7 − Sparerpauschbetrag, then `günstigerprüfung` = min(26,375 % flat tax, marginal income
  tax) (`293-306`, `608-612`).
- Income tax: 2026 tariff, single filing (`splitting: false`, `INCOME_TAX_YEAR` 2026; `616`, `constants/av-depot.ts:9`).
- Totals = first year + regular year × (payout years − 1) (`314-322`, `560-570`).

## What the UI adds (display only, no calculation rules)

- **Precision.** The core returns every amount as a string formatted by `formatCurrencyAdaptive`
  (`src/utils/formatters.ts:32-47`): amounts with |x| < 1.000 € have 2 decimals, larger amounts are whole euros. The UI
  parses these strings with the core's `parseCurrency` and uses them unchanged. "Unrounded" in the plan therefore means
  "at the precision the core outputs"; the UI does no further intermediate rounding.
- **Monthly net** = core `regularPayoutYear.net` ÷ 12 (Finanzfluss shows the same; reproduces 989 € / 873 €).
- **Verdict** (`src/model.ts` `verdict`): D = AV net payout total − normal net payout total; `|D| < 1 %` of the larger total
  (strict) → 两者基本相同; computed before display rounding.
- **Rounding for display** (`src/format.ts`): summary amounts whole euros, half up (x,50 → up; negatives away from zero);
  yearly table 2 decimals.
- **Two-contract hint**: shown when the parsed amount is > `AV_CONTRIBUTION_CAP / 2` = 6.840 €.

## Reference (defaults, start 2027)

Endkapital AV 228.547 €, normal 163.602 €; monthly net AV 989 €, normal 873 €; net payout total 213.564 € vs 188.456 €;
D = 25.108 € → matches the Finanzfluss web reference in plan §2 exactly (test `defaults` in `test/ui.test.ts`).
