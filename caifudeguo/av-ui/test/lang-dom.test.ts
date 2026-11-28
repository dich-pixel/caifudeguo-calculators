// @vitest-environment happy-dom
// Boots the real page: ?lang=de, no Han in the rendered text, toggle keeps inputs and euro amounts.
import { expect, it, vi } from 'vitest'

if (typeof ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

try {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get() { return 900 },
  })
}
catch {
  // happy-dom may already expose a layout width; charts then draw at that width
}

window.history.replaceState(null, '', '/index.html?lang=de')

await import('../src/main')

const HAN = /\p{Script=Han}/u

function renderedText(): string {
  const parts: string[] = [document.title]
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  let node = walker.nextNode()
  while (node) {
    const parent = node.parentElement
    if (!parent?.closest('[data-allow-cjk]'))
      parts.push(node.textContent ?? '')
    node = walker.nextNode()
  }
  document.body.querySelectorAll<HTMLElement>('[aria-label]').forEach((el) => {
    if (!el.closest('[data-allow-cjk]'))
      parts.push(el.getAttribute('aria-label') ?? '')
  })
  return parts.join('\n')
}

function button(id: string): HTMLButtonElement {
  const el = document.querySelector(`[data-testid="${id}"]`)
  if (!(el instanceof HTMLButtonElement))
    throw new Error(`missing button ${id}`)
  return el
}

function field(id: string): HTMLInputElement {
  const el = document.querySelector(`[data-testid="${id}"]`)
  if (!(el instanceof HTMLInputElement))
    throw new Error(`missing input ${id}`)
  return el
}

async function waitForSweep(): Promise<void> {
  await vi.waitFor(() => {
    expect(document.querySelector('[data-testid="cmp3-summary"]')?.getAttribute('data-round')).not.toBe('0')
  }, 20000)
}

it('?lang=de renders German, the toggle keeps inputs and the same euro amounts', async () => {
  expect(document.documentElement.lang).toBe('de')
  expect(document.title).toBe('Altersvorsorgedepot-Rechner · caifudeguo.de')
  expect(document.querySelector('h1')?.textContent).toBe('Altersvorsorgedepot-Rechner')
  expect(button('lang-de').getAttribute('aria-pressed')).toBe('true')
  expect(button('lang-zh').getAttribute('aria-pressed')).toBe('false')
  expect(button('lang-zh').getAttribute('lang')).toBe('zh-Hans')
  expect(button('lang-de').textContent).toBe('Deutsch')
  expect(button('lang-zh').textContent).toBe('中文')

  await waitForSweep()
  for (const id of ['cmp3-toggle', 'ee-toggle', 'toggle-yearly', 'toggle-more']) {
    const b = button(id)
    if (b.getAttribute('aria-expanded') !== 'true')
      b.click()
  }

  const savings = field('input-savingsRate')
  savings.value = '2.400'
  savings.dispatchEvent(new Event('input', { bubbles: true }))
  button('kid-add').click()
  const kid = field('input-kid-0')
  kid.value = '2015'
  kid.dispatchEvent(new Event('input', { bubbles: true }))
  const monthly = document.querySelector('[data-testid="result-monthly-av"]')?.textContent
  expect(monthly).toMatch(/€/)

  expect(renderedText()).not.toMatch(HAN)

  button('lang-zh').click()
  expect(document.documentElement.lang).toBe('zh-Hans')
  expect(document.title).toBe('养老投资账户计算器（Altersvorsorgedepot）· caifudeguo.de')
  expect(document.querySelector('h1')?.textContent).toBe('养老投资账户计算器（Altersvorsorgedepot）')
  expect(button('lang-zh').getAttribute('aria-pressed')).toBe('true')
  expect(button('lang-de').getAttribute('aria-pressed')).toBe('false')
  expect(new URL(location.href).searchParams.get('lang')).toBe('zh')
  expect(field('input-savingsRate').value).toBe('2.400')
  expect(field('input-kid-0').value).toBe('2015')
  expect(document.querySelector('[data-testid="result-monthly-av"]')?.textContent).toBe(monthly)
  expect(document.body.textContent).toContain('养老投资账户计算器')
  expect(document.body.textContent).toContain('不同存钱额的比较')

  button('lang-de').click()
  expect(document.documentElement.lang).toBe('de')
  expect(new URL(location.href).searchParams.get('lang')).toBe('de')
  expect(field('input-savingsRate').value).toBe('2.400')
  expect(field('input-kid-0').value).toBe('2015')
  expect(document.querySelector('[data-testid="result-monthly-av"]')?.textContent).toBe(monthly)
  expect(button('lang-de').getAttribute('aria-pressed')).toBe('true')
  expect(renderedText()).not.toMatch(HAN)
}, 30000)
