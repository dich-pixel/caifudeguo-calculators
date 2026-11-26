/**
 * ETF investment account (CALC-20 … CALC-26).
 * Buyer and renter each have one instance; the rules are identical.
 */

export interface AccountConfig {
  taxRate: number
  teilfreistellung: number
  sparerpauschbetrag: number
  borrowMonthlyFactor: number
}

interface Lot {
  miy: number
  du: number
}

const EPS = 1e-12

export class EtfAccount {
  /** Share price, starts at 1. */
  S = 1
  /** Number of shares. */
  u = 0
  /** Average cost basis, including credited Vorabpauschale. */
  B = 0
  debt = 0
  loss_pot = 0
  allow_rem: number
  u_old = 0
  lots: Lot[] = []
  S_ys = 1
  taxes_paid = 0
  first_debt_month: number | null = null
  /** Vorabpauschale tax base of the year just closed; 0 if none. */
  last_vp = 0

  private readonly cfg: AccountConfig

  constructor(cfg: AccountConfig) {
    this.cfg = cfg
    this.allow_rem = cfg.sparerpauschbetrag
  }

  get V(): number {
    return this.u * this.S
  }

  /** CALC-20: taxable amount after loss pot and allowance. Mutates those pots. */
  taxable(g: number): number {
    if (g < 0) {
      this.loss_pot += -g
      return 0
    }
    const x = Math.min(this.loss_pot, g)
    this.loss_pot -= x
    g -= x
    const y = Math.min(this.allow_rem, g)
    this.allow_rem -= y
    g -= y
    return g
  }

  /** CALC-21 */
  deposit(x: number, miy: number): void {
    if (this.debt > 0) {
      const p = Math.min(x, this.debt)
      this.debt -= p
      x -= p
    }
    if (x <= 0)
      return
    const du = x / this.S
    this.u += du
    this.B += x
    this.lots.push({ miy, du })
  }

  /** CALC-22: withdraw a net-of-tax amount w. */
  withdraw(w: number, k: number): void {
    const { taxRate: rate, teilfreistellung: TF } = this.cfg
    while (w > EPS) {
      const V = this.u * this.S
      if (V <= EPS) {
        this.addDebt(w, k)
        return
      }
      const gf = (V - this.B) / V
      const gfz = gf * (1 - TF)
      let s: number
      if (gfz <= 0) {
        s = Math.min(w, V)
      }
      else {
        const head = this.loss_pot + this.allow_rem
        s = w * gfz <= head ? w : (w - rate * head) / (1 - rate * gfz)
        s = Math.min(s, V)
      }
      const tax = rate * this.taxable(s * gf * (1 - TF))
      const du = s / this.S
      this.B -= this.B * (s / V)
      this.u -= du
      this.fifo(du)
      this.taxes_paid += tax
      w -= (s - tax)
      if (s >= V - 1e-9) {
        this.u = 0
        this.B = 0
        if (w > 1e-9)
          this.addDebt(w, k)
        return
      }
    }
  }

  /** FIFO reduction of u_old, then lots in purchase order. */
  fifo(du: number): void {
    let rest = du
    if (this.u_old > 0) {
      const take = Math.min(rest, this.u_old)
      this.u_old -= take
      rest -= take
    }
    while (rest > 1e-15 && this.lots.length > 0) {
      const lot = this.lots[0]!
      const take = Math.min(rest, lot.du)
      lot.du -= take
      rest -= take
      if (lot.du <= 1e-15)
        this.lots.shift()
    }
  }

  addDebt(w: number, k: number): void {
    this.debt += w
    if (this.first_debt_month === null)
      this.first_debt_month = k
  }

  /** CALC-23 */
  grow(f: number): void {
    this.S *= f
    if (this.debt > 0)
      this.debt *= this.cfg.borrowMonthlyFactor
  }

  /**
   * CALC-25, after month 12y growth. Returns the Vorabpauschale tax base (0 if none).
   */
  yearEnd(k: number, basiszins: number): number {
    const { taxRate: rate, teilfreistellung: TF, sparerpauschbetrag } = this.cfg
    let vp = 0
    if (this.u > 0) {
      const perUnit = Math.max(0, Math.min(this.S_ys * basiszins * 0.7, this.S - this.S_ys))
      let unitsEff = this.u_old
      for (const lot of this.lots)
        unitsEff += lot.du * (13 - lot.miy) / 12
      vp = perUnit * unitsEff
      if (vp > 0) {
        this.B += vp
        const tax = rate * this.taxable(vp * (1 - TF))
        if (tax > 0) {
          this.taxes_paid += tax
          this.withdraw(tax, k)
        }
      }
    }
    this.last_vp = vp
    this.allow_rem = sparerpauschbetrag
    this.u_old = this.u
    this.lots = []
    this.S_ys = this.S
    return vp
  }

  /** CALC-26, does not mutate state. */
  latentTax(): number {
    const V = this.V
    if (V <= 0)
      return 0
    const g = Math.max(0, (V - this.B) * (1 - this.cfg.teilfreistellung) - this.loss_pot - this.allow_rem)
    return this.cfg.taxRate * g
  }
}

export function makeAccount(cfg: AccountConfig): EtfAccount {
  return new EtfAccount(cfg)
}
