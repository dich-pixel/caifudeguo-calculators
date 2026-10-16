/*
 * caifudeguo AV-Depot embed: sets the iframe height reported by the calculator page.
 * Accepts messages only from allowed origins (window.caifudeguoAvDepot.origins) and only from
 * one of our iframes. Copyright (C) 2026 Rich Dr (caifudeguo.de). AGPL-3.0-only.
 */
(function () {
  'use strict'
  const cfg = window.caifudeguoAvDepot || { origins: [] }
  const origins = Array.isArray(cfg.origins) ? cfg.origins : []
  const MIN = 100
  // High cap, clamped (not ignored): the expanded yearly table at 317px with a long payout can exceed 20.000px.
  const MAX = 200000
  window.addEventListener('message', (event) => {
    if (!origins.includes(event.origin))
      return
    const data = event.data
    if (!data || typeof data !== 'object' || data.type !== 'caifudeguo-av-depot:height')
      return
    let height = data.height
    if (typeof height !== 'number' || !Number.isFinite(height) || height < MIN)
      return
    height = Math.min(height, MAX)
    const frames = document.querySelectorAll('iframe.caifudeguo-av-depot')
    for (let i = 0; i < frames.length; i++) {
      if (frames[i].contentWindow === event.source) {
        frames[i].style.height = `${Math.ceil(height)  }px`
      }
    }
  })
})()
