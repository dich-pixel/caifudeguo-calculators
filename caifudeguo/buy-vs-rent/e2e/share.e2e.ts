import type { Frame, Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

const PARENT = 'http://127.0.0.1:4178'
const IFRAME_ORIGIN = 'http://127.0.0.1:4177'

async function frameAt(page: Page, index = 0): Promise<Frame> {
  const loc = page.locator('iframe.caifu-buy-vs-rent').nth(index)
  await expect(loc).toBeVisible()
  const handle = await loc.elementHandle()
  const content = await handle?.contentFrame()
  if (!content) throw new Error(`missing iframe document #${index}`)
  return content
}

async function waitApi(doc: Frame) {
  await doc.waitForFunction(
    () => {
      const g = window as unknown as {
        CaifuBuyVsRentTest?: { shareUrl?: () => string, getInputs?: () => { price: number } }
      }
      return Boolean(g.CaifuBuyVsRentTest?.shareUrl && g.CaifuBuyVsRentTest?.getInputs)
    },
    null,
    { timeout: 15_000 },
  )
}

async function priceOf(doc: Frame): Promise<number> {
  return doc.evaluate(() => {
    const g = window as unknown as { CaifuBuyVsRentTest?: { getInputs?: () => { price: number } } }
    return g.CaifuBuyVsRentTest!.getInputs!().price
  })
}

async function copiedShareUrl(doc: Frame): Promise<string> {
  return doc.evaluate(() => {
    const g = window as unknown as { CaifuBuyVsRentTest?: { shareUrl?: () => string } }
    return g.CaifuBuyVsRentTest!.shareUrl!()
  })
}

async function setPrice(doc: Frame, value: string) {
  const input = doc.locator('#cbr-price')
  await expect(input).toBeVisible({ timeout: 15_000 })
  await input.fill(value)
  await input.blur()
}

test.describe('share link uses the parent page URL', () => {
  test.use({
    viewport: { width: 1280, height: 800 },
    permissions: ['clipboard-read', 'clipboard-write'],
  })

  test('copied URL is the parent URL plus unprefixed params, and reopening restores inputs', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: PARENT })
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: IFRAME_ORIGIN })
    await page.goto(`${PARENT}/share-host.html?utm=keep#faq`)
    expect(new URL(page.url()).origin).toBe(PARENT)
    const doc = await frameAt(page)
    expect(new URL(doc.url()).origin).toBe(IFRAME_ORIGIN)
    await waitApi(doc)
    await expect.poll(async () => priceOf(doc)).toBe(400_000)
    await setPrice(doc, '350000')
    await expect.poll(async () => priceOf(doc)).toBe(350_000)

    const url = await copiedShareUrl(doc)
    const parsed = new URL(url)
    expect(parsed.origin).toBe(PARENT)
    expect(parsed.pathname).toBe('/share-host.html')
    expect(parsed.searchParams.get('utm')).toBe('keep')
    expect(parsed.searchParams.get('price')).toBe('350000')
    expect(parsed.hash).toBe('#faq')
    expect(url).not.toContain('4177')
    expect(url).not.toContain('index.html')

    await doc.locator('#cbr-copy').click()
    const fallback = doc.locator('#cbr-copy + input.cbr-input')
    await expect.poll(async () => {
      try {
        const clip = await doc.evaluate(async () => {
          try {
            return await navigator.clipboard.readText()
          }
          catch {
            return ''
          }
        })
        if (clip) return clip
      }
      catch {
        // clipboard may be blocked in a cross-origin iframe
      }
      const text = await doc.locator('#cbr-copy').innerText()
      if (/已复制|Link kopiert/.test(text)) return url
      if (await fallback.count()) return fallback.inputValue()
      return ''
    }, { timeout: 4000 }).toBe(url)

    await page.goto(url)
    const again = await frameAt(page)
    await waitApi(again)
    await expect.poll(async () => priceOf(again)).toBe(350_000)
  })

  test('two instances: a namespaced link restores only the matching calculator', async ({ page }) => {
    await page.goto(`${PARENT}/share-host-two.html`)
    const first = await frameAt(page, 0)
    const second = await frameAt(page, 1)
    await waitApi(first)
    await waitApi(second)
    await expect.poll(async () => priceOf(first)).toBe(400_000)
    await expect.poll(async () => priceOf(second)).toBe(400_000)

    await setPrice(second, '350000')
    await expect.poll(async () => priceOf(second)).toBe(350_000)
    await expect.poll(async () => priceOf(first)).toBe(400_000)

    const url = await copiedShareUrl(second)
    const parsed = new URL(url)
    expect(parsed.origin).toBe(PARENT)
    expect(parsed.pathname).toBe('/share-host-two.html')
    expect(parsed.searchParams.get('price')).toBeNull()
    expect(parsed.searchParams.get('extra.price')).toBe('350000')
    expect(parsed.searchParams.get('bvr1.price')).toBeNull()

    await page.goto(url)
    const first2 = await frameAt(page, 0)
    const second2 = await frameAt(page, 1)
    await waitApi(first2)
    await waitApi(second2)
    await expect.poll(async () => priceOf(first2)).toBe(400_000)
    await expect.poll(async () => priceOf(second2)).toBe(350_000)
  })

  test('an unprefixed legacy link on a two-instance page restores only the first calculator', async ({
    page,
  }) => {
    await page.goto(`${PARENT}/share-host-two.html?price=350000`)
    const first = await frameAt(page, 0)
    const second = await frameAt(page, 1)
    await waitApi(first)
    await waitApi(second)
    await expect.poll(async () => priceOf(first)).toBe(350_000)
    await expect.poll(async () => priceOf(second)).toBe(400_000)
  })
})
