/*
 * caifudeguo AV-Depot embed: sets the iframe height reported by the calculator page.
 * Trust model: a message is used only if BOTH hold: (a) event.source is the contentWindow of one of our iframes and
 * (b) event.origin is the origin of that iframe, taken from new URL(data-lazy-src || src, page base URI), or an origin
 * listed in the optional window.caifudeguoAvDepot.origins. The page's own origin is never accepted implicitly; if the
 * iframe origin cannot be determined (no src, about:blank, data:, invalid URL) nothing is accepted for that iframe.
 * The config is read at message time, never at script start, so it works even if the inline config script runs later
 * (WP Rocket "Delay JavaScript execution", defer, async). On start the script asks every iframe to repeat its height,
 * because the calculator may have reported before this script ran. Copyright (C) 2026 Rich Dr (caifudeguo.de). AGPL-3.0-only.
 */
(function () {
  'use strict'
  const MIN = 100
  // High cap, clamped (not ignored): the expanded yearly table at 317px with a long payout can exceed 20.000px.
  const MAX = 200000
  const SELECTOR = 'iframe.caifudeguo-av-depot'
  // Origin of the iframe's own address; '' when it cannot be determined (opaque origins "null" included).
  const originOf = (frame) => {
    const raw = frame.getAttribute('data-lazy-src') || frame.getAttribute('src')
    if (!raw)
      return '' // an empty address would resolve to the page itself
    try {
      const o = new URL(raw, document.baseURI).origin
      return o === 'null' ? '' : o
    }
    // eslint-disable-next-line unused-imports/no-unused-vars -- keep the catch binding (older browsers)
    catch (e) {
      return ''
    }
  }
  window.addEventListener('message', (event) => {
    const data = event.data
    if (!data || typeof data !== 'object' || data.type !== 'caifudeguo-av-depot:height')
      return
    let height = data.height
    if (typeof height !== 'number' || !Number.isFinite(height) || height < MIN)
      return
    height = Math.min(height, MAX)
    const cfg = window.caifudeguoAvDepot
    const extra = cfg && Array.isArray(cfg.origins) ? cfg.origins : []
    // Query on every message: Rocket / other plugins may swap or lazy-load the iframe after parse time.
    const frames = document.querySelectorAll(SELECTOR)
    for (let i = 0; i < frames.length; i++) {
      if (!event.source || frames[i].contentWindow !== event.source)
        continue
      const own = originOf(frames[i])
      if (own === '' || (event.origin !== own && !extra.includes(event.origin)))
        continue
      frames[i].style.height = `${Math.ceil(height)  }px`
    }
  })
  // This script can start after the calculator already reported its height. Ask each iframe once to repeat it.
  const frames0 = document.querySelectorAll(SELECTOR)
  for (let i = 0; i < frames0.length; i++) {
    const target = originOf(frames0[i])
    if (target !== '' && frames0[i].contentWindow)
      frames0[i].contentWindow.postMessage({ type: 'caifudeguo-av-depot:resend' }, target)
  }
})()
