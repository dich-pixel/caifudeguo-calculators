/**
 * Shared per-instance share-param extraction (Q-H).
 * Used by bootstrap.js and embed.js so every parent-side path applies the
 * same rule: unprefixed keys on a single instance; prefixed keys on a
 * multi-instance page; legacy unprefixed keys only on the first instance;
 * a prefix for this instance wins over unprefixed keys.
 */
;(function (root) {
  const INPUT_KEYS = {
    price: 1,
    renovation: 1,
    down_payment: 1,
    wealth: 1,
    nk_mode: 1,
    nk_total_pct: 1,
    grest_pct: 1,
    notary_pct: 1,
    broker_buy_pct: 1,
    maint_pct: 1,
    maint_base: 1,
    building_share: 1,
    maint_growth: 1,
    buyer_other_costs: 1,
    buyer_other_growth: 1,
    house_growth: 1,
    loan_rate: 1,
    init_tilgung: 1,
    fix_years: 1,
    follow_rate: 1,
    follow_mode: 1,
    follow_tilgung: 1,
    sondertilgung_pct: 1,
    rent: 1,
    rent_growth: 1,
    renter_nebenkosten: 1,
    renter_nk_growth: 1,
    renter_renovation: 1,
    cash_monthly: 1,
    cash_growth: 1,
    etf_return: 1,
    inflation: 1,
    horizon_years: 1,
    house_err: 1,
    etf_err: 1,
    borrow_rate: 1,
    sell_cost_pct: 1,
    self_use_exempt: 1,
    personal_tax_rate: 1,
    use_sparer_kirchen: 1,
    kirchen_rate: 1,
    mc_runs: 1,
    mc_sigma: 1,
    mc_seed: 1,
  }

  /**
   * @param {string} search
   * @param {{ instanceId: string, multi: boolean, first?: boolean }} opts
   * @returns {URLSearchParams} Params that belong to this instance.
   */
  function extractInstanceSearch(search, opts) {
    const raw = String(search || '')
    const params = new URLSearchParams(
      raw.charAt(0) === '?' ? raw.slice(1) : raw,
    )
    const id = opts && opts.instanceId ? String(opts.instanceId) : ''
    const prefix = id ? `${id}.` : ''
    const prefixed = new URLSearchParams()
    const unprefixed = new URLSearchParams()
    params.forEach((v, k) => {
      if (prefix && k.indexOf(prefix) === 0) {
        const key = k.slice(prefix.length)
        if (INPUT_KEYS[key]) prefixed.set(key, v)
        return
      }
      if (INPUT_KEYS[k]) unprefixed.set(k, v)
    })
    const out = new URLSearchParams()
    if (!opts || !opts.multi || opts.first) {
      unprefixed.forEach((v, k) => out.set(k, v))
    }
    prefixed.forEach((v, k) => out.set(k, v))
    return out
  }

  root.caifuBvrShareParams = {
    INPUT_KEYS,
    extractInstanceSearch,
  }
})(typeof window !== 'undefined' ? window : this)
