# AV-Depot UI — core rules used / 核心规则（带行号）

**All line numbers in this file refer to `src/calculators/av-depot.ts` and `src/constants/av-depot.ts` at upstream
commit [`dcc29a69bdd8a3943d092e4c86ad42bff2767e1a`](https://github.com/finanzfluss/calculators/blob/dcc29a69bdd8a3943d092e4c86ad42bff2767e1a/src/calculators/av-depot.ts)
(dcc29a6), re-verified 2026-10-17.** `src/` in this fork is byte-identical (`pnpm run check:core`, CI
`git diff --exit-code dcc29a6 -- src`), so the numbers stay valid.

**In plain words: the page runs a mechanically generated copy of the dcc29a6 core in which only `depotPair()` returns raw numbers instead of formatted strings. Everything else is the core's code. `pnpm run check:core` fails if the copy is not exactly the transform of the unchanged core.**

The UI (`caifudeguo/av-ui/src`) parses German input, validates with the core's zod schema and calculates with the core's
formulas. To get unrounded amounts it uses `src/generated/av-depot-precise.ts`, a mechanical copy of the core produced
by `scripts/precise-core.mjs`: the only change is that `depotPair()` (`av-depot.ts:192-197`) returns the raw numbers
instead of `formatCurrencyAdaptive()` strings; imports are re-pointed to `src/`. Tests check (1) the generated file
equals the transform of the current core (`test/precise-core.test.mjs`) and (2) formatting every UI number with the
core's `formatCurrencyAdaptive` reproduces the core's own output exactly, for 14 input combinations plus all boundary
cases (`test/ui.test.ts`, `expectMatchesCore`).

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

Note: zod may report a cross-field error together with a range error; the UI then shows only the range error, so e.g. "age ≥ retirement age" is
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
- `taxSavingsMode` (`372-378`): `avDepot` reinvests the saving into the AV account up to 13.680 € total;
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

- **Precision.** The public core output (`avDepot.calculate`) is strings from `formatCurrencyAdaptive`
  (`src/utils/formatters.ts:32-47`): |x| < 1.000 € with 2 decimals, larger amounts already rounded to whole euros. The UI
  therefore uses the unrounded numbers of the generated precise copy (see top). Rounding happens only once, for display.
- **Monthly net** = unrounded `regularPayoutYear.net` ÷ 12, rounded once at display. Switch:
  `MONTHLY_FROM_ROUNDED_ANNUAL` in `src/model.ts` (default `false`). Defaults: normal 10.469,795… / 12 = 872,48 → **872 €**;
  AV 11.864,645… / 12 = 988,72 → **989 €**. The Finanzfluss web page shows 873 € because it divides the annual amount that is
  already rounded to whole euros (10.470 / 12 = 872,50 → 873); setting the constant to `true` reproduces that.
- **Verdict** (`src/model.ts` `verdict`): D = AV net payout total − normal net payout total, both unrounded;
  `|D| < 1 %` of the larger total (strict) → 两者基本相同 (still naming the higher side and the amount). The text says
  "按税后比较". Before this change the verdict used the core's rounded output and could flip within ~1 € of the threshold
  (tester example: tax saving spent („Konsumieren“), ETF 5,99503 % → rounded values gave „普通账户多拿约 1.883 €“,
  unrounded |D| is 0,047 € below 1 % → 基本相同). With unrounded values this cannot happen any more; the case is a unit test.
  Remaining limit: values are IEEE doubles from the core's own arithmetic (incl. its income-tax function, which returns
  whole euros by law); a flip is only possible if |D| is within floating-point error (~1e-9 €) of exactly 1 %.
- **D shown** = |D| rounded once (defaults: 25.107 €). Finanzfluss shows 25.108 € = difference of the two rounded totals
  (213.564 − 188.456).
- **Rounding for display** (`src/format.ts`): summary amounts whole euros, half up (x,50 → up; negatives away from zero);
  yearly table 2 decimals (real cents, also above 1.000 €).
- **Two-contract hint**: shown when the parsed amount is > `AV_CONTRIBUTION_CAP / 2` = 6.840 € (`constants/av-depot.ts:5`).
- **Cross-field errors** (age ≥ retirement age etc., `av-depot.ts:63-78`) are shown once, on the field changed last.

## Stage 3: comparison of savings amounts / 阶段 3：不同存钱额的比较

Plan: `PLAN_stage3.md` (v2, approved 2026-10-18). Lines below: `compare.ts` = `src/compare.ts`, core lines = dcc29a6.

- **Tiers** (`compare.ts:17`): 120 · 300 · 360 · 600 · 1.200 · 1.800 · 2.400 · 3.600 · 6.840 · 8.400 · 10.000 · 13.680 €,
  plus the user's amount (inserted by size, merged when equal). Real kinks in the core: 120 € minimum (`av-depot.ts:23`),
  300 € Kinderzulage cap (`597`), 360 € Grundzulage 50 % → 25 % (`589-590`), 1.800 € subsidy/deduction cap (`590`, `363`;
  Überzahlung = `ownContribToAv` above 1.800, `380-382`), 13.680 € input cap (`const.ts:5`). 6.840 € is not a kink in the
  core (only the comment at `const.ts:5`); the chart draws a dashed line and rows above it show `hint-two-contracts`.
- **One full core run per amount** (`sweep`, `compare.ts:166`): `evaluate()` with the user's other inputs, only
  `savingsRate` replaced. Every number in the table is a field of that run, unrounded; rounding once at display.
- **Förderung** (`foerderung`, `compare.ts:94`) = Σ `savingsPerYear[].contribution.avDepot` − `totalContributions.avDepot`.
  Label by tax-saving mode (`foerderungKey`, `compare.ts:90`): with `secondaryDepot` the sum contains the tax saving
  because the core adds the side account's inflow to `contribution.avDepot` (`428-441`).
- **Verdict per row** = stage-2 `verdict()` (`model.ts:246-252`). **Flips, largest difference, 多存 1 €** use only the 12
  fixed tiers (plan b3): flip = tier whose verdict differs from the previous tier; largest difference = tier with the
  largest D if any tier is „AV 多拿“, else „普通账户都多拿“ / „AV 都没有多拿…“; 多存 1 € = Δ`payoutTotal.net` ÷
  Δ`totalContributions` against the nearest fixed tier at least 100 € lower (`baseTier`, `compare.ts:152`; user row the
  same, never used as a base). „回报更高“ only if every tier after k has AV < normal and k is not the last tier.
- **b2 column** (`compare.ts:166`, `fillSplit`): S(a) = `payoutTotal.net.avDepot`(1.800 €) + `payoutTotal.net.normalDepot`(a − 1.800 €),
  „—“ for a ≤ 1.800 € and for a remainder < 120 €. Approximate (plan b2): never used for verdicts, flips, chart or summary.
- **Sentences** (`compare.ts:283-325`): f6 sensitivity sentence (at most 3 flips, then „，详见下表“), summary line 2,
  figcaption sentence 1 = the stage-2 verdict sentence for the user's amount.
- **Scheduling** (`cmp3.ts:33`): main result immediately; the comparison round starts 300 ms after the last input, one
  core run per `setTimeout 0` (`pendingAmounts` / `prefetch`, `compare.ts:120-137`), newer input cancels the round.
  Cache: results per amount while all other inputs are unchanged (`compare.ts:99-117`); the user row reuses the main
  result. Core runs per round ≤ 17 (only savingsRate changed: 0 or 1). Marks `cmp3-round-start` / `cmp3-round-end`,
  `data-round` on summary and table container, updated when a round finishes.
- **Chart** (`chart.ts:67`): inline SVG, D per row, evenly spaced; band = ±1 % × larger net total (same rule as `verdict()`).
- **Kid rows** (`model.ts:292-305`): rows count once typed into or blurred; untouched rows are not calculated.
- **Narrow error banner** (`main.ts:150`): < 1000 px; the button expands „更多设置“ if needed and focuses the first
  `aria-invalid="true"` input.
- No new formulas beyond these sums, differences and quotients of core outputs; `src/` unchanged (`pnpm run check:core`).

## Reference (defaults, start 2027)

Endkapital AV 228.547 €, normal 163.602 €; monthly net AV 989 €, normal 872 € (873 € with the web page's double
rounding); net payout total 213.564 € vs 188.456 €; D = 25.107 € (web: 25.108 €). Test `defaults` in `test/ui.test.ts`.
