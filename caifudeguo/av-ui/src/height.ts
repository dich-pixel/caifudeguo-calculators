import { HEIGHT_MESSAGE_TYPE, HEIGHT_REQUEST_TYPE } from './params'

/** The few browser objects the reporter touches (a real page passes window / documentElement / ResizeObserver). */
export interface HeightEnv {
  win: Pick<Window, 'parent' | 'addEventListener'>
  root: Pick<HTMLElement, 'getBoundingClientRect' | 'classList'>
  observe: (onResize: () => void) => void
}

/** Iframe height → parent (postMessage). Sent on start, whenever it changes, and again on request: the host's embed.js
 *  can start after our first message (delay/defer plugins such as WP Rocket "Delay JavaScript execution"), and an
 *  unchanged height is never sent again on its own. A request counts only when it comes from window.parent. */
export function startHeightReporting(env: HeightEnv): void {
  const { win, root } = env
  if (win.parent === win)
    return
  root.classList.add('embedded')
  let last = 0
  const send = (force = false) => {
    const height = Math.ceil(root.getBoundingClientRect().height)
    if (force || height !== last) {
      last = height
      win.parent.postMessage({ type: HEIGHT_MESSAGE_TYPE, height }, '*')
    }
  }
  env.observe(() => send())
  win.addEventListener('load', () => send())
  win.addEventListener('message', (event) => {
    if (event.source === win.parent && event.data && typeof event.data === 'object' && event.data.type === HEIGHT_REQUEST_TYPE)
      send(true)
  })
  send(true)
}
