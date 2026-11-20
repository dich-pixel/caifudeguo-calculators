export const HEIGHT_MESSAGE_TYPE = 'caifu-buy-vs-rent:height'
export const HEIGHT_REQUEST_TYPE = 'caifu-buy-vs-rent:resend'

export function startHeightReporting(): void {
  if (window.parent === window)
    return
  document.documentElement.classList.add('embedded')
  document.body.classList.add('embedded')
  let last = 0
  const send = (force = false) => {
    const height = Math.ceil(document.documentElement.getBoundingClientRect().height)
    if (force || height !== last) {
      last = height
      window.parent.postMessage({ type: HEIGHT_MESSAGE_TYPE, height }, '*')
    }
  }
  if (typeof ResizeObserver !== 'undefined')
    new ResizeObserver(() => send()).observe(document.documentElement)
  window.addEventListener('load', () => send())
  window.addEventListener('message', (event) => {
    if (event.source === window.parent && event.data && typeof event.data === 'object' && event.data.type === HEIGHT_REQUEST_TYPE)
      send(true)
  })
  send(true)
}
