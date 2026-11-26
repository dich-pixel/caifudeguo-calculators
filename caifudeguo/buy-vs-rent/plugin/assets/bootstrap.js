/**
 * Per-instance helper printed after each calculator iframe.
 * Runs even when embed.js is still delayed (nowprocket / exclusion).
 * Copies this instance’s share params onto the iframe src before it loads,
 * and postMessages official settings from data-cbr-settings.
 * Never replaces src after the iframe has loaded.
 */
;(function () {
  const script = document.currentScript
  const frame = script ? script.previousElementSibling : null
  if (!frame || !frame.classList) return
  if (!frame.classList.contains('caifu-buy-vs-rent')) return

  const share = window.caifuBvrShareParams
  if (!share || typeof share.extractInstanceSearch !== 'function') return

  const alreadyLoaded = () => {
    if (frame.getAttribute('data-cbr-attached') === '1') return true
    try {
      const w = frame.contentWindow
      if (!w || !w.location) return false
      const href = w.location.href
      return href !== '' && href !== 'about:blank'
    } catch {
      const src = frame.getAttribute('src')
      return Boolean(src && src !== 'about:blank')
    }
  }

  const postSettings = () => {
    const raw = frame.getAttribute('data-cbr-settings')
    const w = frame.contentWindow
    if (!raw || !w) return
    let settings
    try {
      settings = JSON.parse(raw)
    } catch {
      return
    }
    if (!settings || typeof settings !== 'object') return
    const frames = document.querySelectorAll('iframe.caifu-buy-vs-rent')
    let index = -1
    for (let i = 0; i < frames.length; i++) {
      if (frames[i] === frame) index = i
    }
    const instanceId = frame.getAttribute('data-cbr-id') || ''
    const multi = frames.length > 1
    const first = index === 0
    // Always pass the raw parent query. The iframe runs the shared
    // extractInstanceSearch so unprefixed keys cannot leak to later instances.
    try {
      w.postMessage(
        {
          type: 'caifu-buy-vs-rent:settings',
          settings,
          pageUrl: location.href,
          instanceId,
          namespaced: multi,
          first,
          search: location.search,
        },
        '*',
      )
    } catch {
      // ignore a detached frame
    }
  }

  if (!alreadyLoaded()) {
    const raw =
      frame.getAttribute('data-lazy-src') ||
      frame.getAttribute('data-src') ||
      frame.getAttribute('src')
    if (raw && raw !== 'about:blank') {
      let url
      try {
        url = new URL(raw, document.baseURI)
      } catch {
        url = null
      }
      if (url) {
        const id = frame.getAttribute('data-cbr-id') || ''
        const frames = document.querySelectorAll('iframe.caifu-buy-vs-rent')
        let index = -1
        for (let i = 0; i < frames.length; i++) {
          if (frames[i] === frame) index = i
        }
        const first = index === 0
        const extra = share.extractInstanceSearch(location.search, {
          instanceId: id,
          multi: frames.length > 1,
          first,
        })
        Object.keys(share.INPUT_KEYS).forEach((k) => {
          url.searchParams.delete(k)
        })
        extra.forEach((v, k) => {
          url.searchParams.set(k, v)
        })
        const next = url.toString()
        let cur = raw
        try {
          cur = new URL(raw, document.baseURI).toString()
        } catch {
          // keep the raw attribute value
        }
        if (cur !== next) {
          const attr = frame.hasAttribute('data-lazy-src')
            ? 'data-lazy-src'
            : frame.hasAttribute('data-src')
              ? 'data-src'
              : 'src'
          frame.setAttribute(attr, next)
          if (attr !== 'src') {
            const curSrc = frame.getAttribute('src')
            if (curSrc && curSrc !== 'about:blank')
              frame.setAttribute('src', next)
          }
        }
      }
    }
  }

  postSettings()
  frame.addEventListener('load', () => {
    frame.setAttribute('data-cbr-attached', '1')
    postSettings()
  })
})()
