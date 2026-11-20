import type { ComputeSuccess, MonteCarloResult, ScenarioCell, YearRow } from '../engine/types'
import type { Dict } from '../i18n'
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'
import { formatEUR } from './format'

Chart.register(
  LineController, LineElement, PointElement,
  BarController, BarElement,
  CategoryScale, LinearScale,
  Filler, Legend, Tooltip, ArcElement,
)

Chart.defaults.font.family = "system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif"
Chart.defaults.color = '#1d2327'

const BUY = '#0b5cad'
const RENT = '#6b4e00'
const MUT = '#6c7781'
const POS = '#1e7a46'
const NEG = '#b32d2e'

export interface ChartState {
  liquidated: boolean
  real: boolean
  yearMax: number
  inflation?: number
}

function yearRows(result: ComputeSuccess, yearMax: number): YearRow[] {
  const all = [result.start, ...result.yearly]
  return all.filter(r => r.year <= yearMax)
}

function pick(row: YearRow, who: 'buyer' | 'renter' | 'diff', st: ChartState): number {
  const suffix = st.liquidated
    ? (st.real ? '_liq_real' : '_liq')
    : (st.real ? '_nonliq_real' : '_nonliq')
  const key = `${who}${suffix}` as keyof YearRow
  return row[key] as number
}

export function destroyChart(chart: Chart | null): null {
  chart?.destroy()
  return null
}

export function renderNetChart(canvas: HTMLCanvasElement, result: ComputeSuccess, st: ChartState, dict: Dict, prev: Chart | null): Chart {
  prev?.destroy()
  const rows = yearRows(result, st.yearMax)
  return new Chart(canvas, {
    type: 'line',
    data: {
      labels: rows.map(r => String(r.year)),
      datasets: [
        { label: dict.buyer, data: rows.map(r => pick(r, 'buyer', st)), borderColor: BUY, backgroundColor: BUY, tension: 0.1, pointRadius: 0, borderWidth: 2 },
        { label: dict.renter, data: rows.map(r => pick(r, 'renter', st)), borderColor: RENT, backgroundColor: RENT, tension: 0.1, pointRadius: 0, borderWidth: 2 },
        {
          label: dict.other_capital,
          data: rows.map(r => st.real && r.year > 0 ? r.other_capital_gross / (1 + (st.inflation ?? 0)) ** r.year : r.other_capital_gross),
          borderColor: MUT,
          borderDash: [6, 4],
          pointRadius: 0,
          borderWidth: 1.5,
          tension: 0.1,
        },
      ],
    },
    options: lineOpts(),
  })
}

function lineOpts() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' as const, labels: { boxWidth: 12, font: { size: 11 } } },
      tooltip: { callbacks: { label: (c: { dataset: { label?: string }, parsed: { y: number | null } }) => `${c.dataset.label ?? ''}: ${formatEUR(c.parsed.y ?? 0)}` } },
    },
    scales: {
      x: { title: { display: false }, ticks: { maxTicksLimit: 12, font: { size: 11 } } },
      y: { ticks: { callback: (v: string | number) => formatAxis(Number(v)), font: { size: 11 } } },
    },
  }
}

function formatAxis(v: number): string {
  const a = Math.abs(v)
  if (a >= 1_000_000)
    return `${(v / 1_000_000).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Mio.`
  if (a >= 1000)
    return `${(v / 1000).toLocaleString('de-DE', { maximumFractionDigits: 0 })} k`
  return v.toLocaleString('de-DE', { maximumFractionDigits: 0 })
}

export function renderComposition(canvas: HTMLCanvasElement, result: ComputeSuccess, st: ChartState, dict: Dict, prev: Chart | null): Chart {
  prev?.destroy()
  const rows = yearRows(result, st.yearMax)
  const deflator = (y: number) => (st.real && y > 0) ? (1 + /* filled below */ 1) : 1
  void deflator
  const factor = (row: YearRow) => {
    if (!st.real || row.year === 0)
      return 1
    return row.buyer_liq === 0 ? 1 : row.buyer_liq_real / row.buyer_liq
  }
  // The composition is a stock view; apply the same real deflator as buyer_liq.
  return new Chart(canvas, {
    type: 'line',
    data: {
      labels: rows.map(r => String(r.year)),
      datasets: [
        { label: dict.house_end, data: rows.map(r => r.house * factor(r)), borderColor: '#2a7f62', backgroundColor: 'rgba(42,127,98,0.25)', fill: true, pointRadius: 0, tension: 0.1, borderWidth: 1.5 },
        { label: dict.restschuld, data: rows.map(r => -r.balance * factor(r)), borderColor: NEG, backgroundColor: 'rgba(179,45,46,0.2)', fill: true, pointRadius: 0, tension: 0.1, borderWidth: 1.5 },
        { label: 'ETF', data: rows.map(r => r.buyer_etf * factor(r)), borderColor: BUY, backgroundColor: 'rgba(11,92,173,0.2)', fill: true, pointRadius: 0, tension: 0.1, borderWidth: 1.5 },
        { label: dict.table.buyer_debt, data: rows.map(r => -r.buyer_debt * factor(r)), borderColor: '#8a4b00', backgroundColor: 'rgba(138,75,0,0.2)', fill: true, pointRadius: 0, tension: 0.1, borderWidth: 1.5 },
      ],
    },
    options: lineOpts(),
  })
}

export function renderLoan(canvas: HTMLCanvasElement, result: ComputeSuccess, st: ChartState, dict: Dict, fixYears: number | null, prev: Chart | null): Chart {
  prev?.destroy()
  const rows = yearRows(result, st.yearMax)
  const chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: rows.map(r => String(r.year)),
      datasets: [
        { label: dict.restschuld, data: rows.map(r => r.balance), borderColor: NEG, pointRadius: 0, borderWidth: 2, tension: 0.1 },
        { label: dict.table.cum_principal, data: rows.map(r => r.cum_principal), borderColor: BUY, pointRadius: 0, borderWidth: 2, tension: 0.1 },
        { label: dict.cum_interest, data: rows.map(r => r.cum_interest), borderColor: RENT, pointRadius: 0, borderWidth: 2, tension: 0.1 },
      ],
    },
    options: lineOpts(),
  })
  void fixYears
  return chart
}

export function renderCash(canvas: HTMLCanvasElement, result: ComputeSuccess, st: ChartState, dict: Dict, prev: Chart | null): Chart {
  prev?.destroy()
  const rows = result.yearly.filter(r => r.year <= st.yearMax)
  return new Chart(canvas, {
    type: 'line',
    data: {
      labels: rows.map(r => String(r.year)),
      datasets: [
        { label: dict.fields.cash_monthly, data: rows.map(r => r.cash_month), borderColor: MUT, pointRadius: 0, borderWidth: 2, tension: 0.1 },
        { label: dict.table.buyer_cost_month, data: rows.map(r => r.buyer_cost_month), borderColor: BUY, pointRadius: 0, borderWidth: 2, tension: 0.1 },
        { label: dict.table.renter_cost_month, data: rows.map(r => r.renter_cost_month), borderColor: RENT, pointRadius: 0, borderWidth: 2, tension: 0.1 },
      ],
    },
    options: lineOpts(),
  })
}

export function renderTax(canvas: HTMLCanvasElement, result: ComputeSuccess, st: ChartState, dict: Dict, prev: Chart | null): Chart {
  prev?.destroy()
  const rows = yearRows(result, st.yearMax)
  return new Chart(canvas, {
    type: 'line',
    data: {
      labels: rows.map(r => String(r.year)),
      datasets: [
        { label: `${dict.taxes_paid} · ${dict.buyer}`, data: rows.map(r => r.taxes_paid_buyer), borderColor: BUY, pointRadius: 0, borderWidth: 2, tension: 0.1 },
        { label: `${dict.taxes_paid} · ${dict.renter}`, data: rows.map(r => r.taxes_paid_renter), borderColor: RENT, pointRadius: 0, borderWidth: 2, tension: 0.1 },
        { label: `${dict.latent_tax} · ${dict.buyer}`, data: rows.map(r => r.latent_tax_buyer), borderColor: BUY, borderDash: [4, 3], pointRadius: 0, borderWidth: 1.5, tension: 0.1 },
        { label: `${dict.latent_tax} · ${dict.renter}`, data: rows.map(r => r.latent_tax_renter), borderColor: RENT, borderDash: [4, 3], pointRadius: 0, borderWidth: 1.5, tension: 0.1 },
      ],
    },
    options: lineOpts(),
  })
}

export function renderMatrix(container: HTMLElement, cells: ScenarioCell[], liquidated: boolean, dict: Dict): void {
  container.replaceChildren()
  const table = document.createElement('table')
  table.className = 'cbr-matrix'
  table.setAttribute('role', 'table')
  const etfVals = [cells[0]!, cells[1]!, cells[2]!].map(c => c.etf_return)
  const houseVals = [cells[0]!, cells[3]!, cells[6]!].map(c => c.house_growth)
  const thead = document.createElement('thead')
  const hr = document.createElement('tr')
  hr.append(th(`${dict.fields.house_growth} \\ ${dict.fields.etf_return}`))
  for (const r of etfVals)
    hr.append(th(pctLabel(r)))
  thead.append(hr)
  table.append(thead)
  const tb = document.createElement('tbody')
  for (let i = 0; i < 3; i++) {
    const tr = document.createElement('tr')
    tr.append(th(pctLabel(houseVals[i]!)))
    for (let j = 0; j < 3; j++) {
      const cell = cells[i * 3 + j]!
      const v = liquidated ? cell.diff_liq : cell.diff_nonliq
      const td = document.createElement('td')
      td.textContent = formatEUR(v, 0)
      td.style.background = heat(v, cells.map(c => liquidated ? c.diff_liq : c.diff_nonliq))
      td.style.color = Math.abs(v) > maxAbs(cells.map(c => liquidated ? c.diff_liq : c.diff_nonliq)) * 0.35 ? '#fff' : '#1d2327'
      td.title = `${dict.buyer}: ${formatEUR(cell.buyer_liq)} · ${dict.renter}: ${formatEUR(cell.renter_liq)}`
      tr.append(td)
    }
    tb.append(tr)
  }
  table.append(tb)
  const note = document.createElement('p')
  note.className = 'cbr-help'
  note.textContent = dict.help.matrix ?? ''
  container.append(table, note)
}

function th(text: string): HTMLTableCellElement {
  const el = document.createElement('th')
  el.setAttribute('scope', 'col')
  el.textContent = text
  return el
}

function pctLabel(d: number): string {
  return `${(d * 100).toLocaleString('de-DE', { maximumFractionDigits: 2 })} %`
}

function maxAbs(xs: number[]): number {
  return Math.max(1, ...xs.map(v => Math.abs(v)))
}

function heat(v: number, all: number[]): string {
  const m = maxAbs(all)
  const t = Math.max(-1, Math.min(1, v / m))
  if (t >= 0) {
    const a = 0.15 + 0.7 * t
    return `rgba(30,122,70,${a})`
  }
  const a = 0.15 + 0.7 * (-t)
  return `rgba(179,45,46,${a})`
}

export function renderMc(canvas: HTMLCanvasElement, mc: MonteCarloResult, dict: Dict, prev: Chart | null): Chart {
  prev?.destroy()
  const stats = mc.diff_liq
  const labels = ['P5', 'P10', 'P25', 'P50', 'P75', 'P90', 'P95']
  const data = [stats.p5, stats.p10, stats.p25, stats.p50, stats.p75, stats.p90, stats.p95]
  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: dict.hist,
        data,
        backgroundColor: data.map(v => v >= 0 ? POS : NEG),
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (c: { parsed: { y: number | null } }) => formatEUR(c.parsed.y ?? 0) } },
      },
      scales: {
        y: { ticks: { callback: (v: string | number) => formatAxis(Number(v)) } },
      },
    },
  })
}

export function renderMcBands(canvas: HTMLCanvasElement, mc: MonteCarloResult, dict: Dict, prev: Chart | null): Chart {
  prev?.destroy()
  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels: [dict.buyer, dict.renter],
      datasets: [
        {
          label: 'P10',
          data: [mc.buyer_liq.p10, mc.renter_liq.p10],
          backgroundColor: 'rgba(11,92,173,0.25)',
        },
        {
          label: 'P50',
          data: [mc.buyer_liq.p50, mc.renter_liq.p50],
          backgroundColor: BUY,
        },
        {
          label: 'P90',
          data: [mc.buyer_liq.p90, mc.renter_liq.p90],
          backgroundColor: 'rgba(11,92,173,0.55)',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' as const },
        tooltip: { callbacks: { label: (c: { dataset: { label?: string }, parsed: { y: number | null } }) => `${c.dataset.label}: ${formatEUR(c.parsed.y ?? 0)}` } },
      },
      scales: { y: { ticks: { callback: (v: string | number) => formatAxis(Number(v)) } } },
    },
  })
}
