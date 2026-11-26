import type { Frame, Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

async function frameOf(page: Page): Promise<Frame> {
  const loc = page.locator('iframe.caifu-buy-vs-rent')
  await expect(loc).toBeVisible()
  const handle = await loc.elementHandle()
  const content = await handle?.contentFrame()
  if (!content) throw new Error('missing iframe document')
  return content
}

async function waitApi(doc: Frame) {
  await doc.waitForFunction(
    () => {
      const g = window as unknown as {
        CaifuBuyVsRentTest?: { shareUrl?: () => string, getInputs?: () => { price: number, rent: number } }
      }
      return Boolean(g.CaifuBuyVsRentTest?.shareUrl && g.CaifuBuyVsRentTest?.getInputs)
    },
    null,
    { timeout: 15_000 },
  )
}

async function inputsOf(doc: Frame): Promise<{ price: number, rent: number }> {
  return doc.evaluate(() => {
    const g = window as unknown as {
      CaifuBuyVsRentTest?: { getInputs?: () => { price: number, rent: number } }
    }
    return g.CaifuBuyVsRentTest!.getInputs!()
  })
}

async function shareOf(doc: Frame): Promise<string> {
  return doc.evaluate(() => {
    const g = window as unknown as { CaifuBuyVsRentTest?: { shareUrl?: () => string } }
    return g.CaifuBuyVsRentTest!.shareUrl!()
  })
}

test.describe('WP Rocket delayed parent scripts', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('F1: share params apply and survive when the user only taps inside the iframe', async ({
    page,
  }) => {
    const parent = new URL(
      '/rocket-host.html?foo=1&price=420000&rent=1350#sec',
      'http://127.0.0.1:4177',
    )
    await page.goto(parent.toString())
    // Delayed scripts must still be unexecuted before any parent interaction.
    expect(
      await page.locator('script[type="rocketlazyloadscript"]').count(),
    ).toBeGreaterThan(0)
    expect(
      await page.evaluate(() => Boolean((window as unknown as { caifuBuyVsRent?: unknown }).caifuBuyVsRent)),
    ).toBe(false)

    const doc = await frameOf(page)
    await waitApi(doc)
    await expect.poll(async () => (await inputsOf(doc)).price).toBe(420_000)
    await expect.poll(async () => (await inputsOf(doc)).rent).toBe(1350)

    const rent = doc.locator('#cbr-rent')
    await expect(rent).toBeVisible()
    await rent.fill('1500')
    await rent.blur()
    await expect.poll(async () => (await inputsOf(doc)).rent).toBe(1500)

    const url = await shareOf(doc)
    const parsed = new URL(url)
    expect(parsed.origin).toBe('http://127.0.0.1:4177')
    expect(parsed.pathname).toBe('/rocket-host.html')
    expect(parsed.searchParams.get('foo')).toBe('1')
    expect(parsed.searchParams.get('price')).toBe('420000')
    expect(parsed.searchParams.get('rent')).toBe('1500')
    expect(parsed.hash).toBe('#sec')
    expect(url).not.toContain('index.html')

    // First interaction outside the iframe starts delayed scripts; the iframe must not reload.
    await page.locator('#cbr-rocket-outside').click()
    await expect
      .poll(async () => page.evaluate(() => Boolean((window as unknown as { caifuBuyVsRent?: unknown }).caifuBuyVsRent)))
      .toBe(true)
    await expect.poll(async () => (await inputsOf(doc)).rent).toBe(1500)
    await expect.poll(async () => (await inputsOf(doc)).price).toBe(420_000)
  })

  test('F2 late: admin settings arrive after parent interaction without wiping edits', async ({
    page,
  }) => {
    await page.goto('http://127.0.0.1:4177/rocket-host.html')
    const doc = await frameOf(page)
    await waitApi(doc)
    await expect.poll(async () => (await inputsOf(doc)).price).toBe(400_000)
    await expect(doc.locator('.cbr-disclaimer')).not.toContainText('ADMIN-ZH-MARK')

    const rent = doc.locator('#cbr-rent')
    await rent.fill('1500')
    await rent.blur()
    await expect.poll(async () => (await inputsOf(doc)).rent).toBe(1500)

    await page.locator('#cbr-rocket-outside').click()
    await expect.poll(async () => (await inputsOf(doc)).price).toBe(350_000)
    await expect.poll(async () => (await inputsOf(doc)).rent).toBe(1500)
    await expect(doc.locator('.cbr-disclaimer')).toContainText('ADMIN-ZH-MARK')
  })

  test('F2 baked: admin defaults and disclaimer work without starting delayed parent scripts', async ({
    page,
  }) => {
    await page.goto('http://127.0.0.1:4177/rocket-host-cfg.html')
    expect(
      await page.evaluate(() => Boolean((window as unknown as { caifuBuyVsRent?: unknown }).caifuBuyVsRent)),
    ).toBe(false)
    const src = await page.locator('iframe.caifu-buy-vs-rent').getAttribute('src')
    expect(src ?? '').not.toContain('cbr_cfg')
    expect((src ?? '').length).toBeLessThan(2000)
    const doc = await frameOf(page)
    await waitApi(doc)
    await expect.poll(async () => (await inputsOf(doc)).price).toBe(350_000)
    await expect(doc.locator('.cbr-disclaimer')).toContainText('ADMIN-ZH-MARK')
  })
})

test.describe('unsigned cbr_cfg is ignored', () => {
  test('direct app URL cannot inject footer HTML or override defaults', async ({
    page,
  }) => {
    const cfg = {
      version: '<a href=https://evil.example/login>登录领取</a>',
      basiszins_year: '<img src=x onerror=alert(1)>',
      defaults: { price: 777000 },
      disclaimer_zh: 1,
      basiszins: 'nope',
    }
    await page.goto(
      `/index.html?cbr_test=1&cbr_cfg=${encodeURIComponent(JSON.stringify(cfg))}`,
    )
    await page.waitForFunction(
      () => {
        const g = window as unknown as {
          CaifuBuyVsRentTest?: { getInputs?: () => { price: number } }
        }
        return Boolean(g.CaifuBuyVsRentTest?.getInputs)
      },
      null,
      { timeout: 15_000 },
    )
    const price = await page.evaluate(() => {
      const g = window as unknown as {
        CaifuBuyVsRentTest?: { getInputs?: () => { price: number } }
      }
      return g.CaifuBuyVsRentTest!.getInputs!().price
    })
    expect(price).toBe(400_000)
    const footer = page.locator('.cbr-footer')
    await expect(footer).toBeVisible()
    await expect(footer.locator('a')).toHaveCount(0)
    await expect(footer.locator('img')).toHaveCount(0)
    await expect(footer).not.toContainText('evil.example')
    await expect(footer).not.toContainText('登录领取')
    await expect(page.locator('.cbr-disclaimer')).toBeVisible()
    await expect(page.locator('.cbr-disclaimer')).not.toHaveText('')
  })
})

test.describe('V8 two-instance legacy link under delayed embed', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('v8: unprefixed params apply only to the first instance while parent scripts stay delayed', async ({
    page,
  }) => {
    await page.goto(
      'http://127.0.0.1:4177/rocket-host-two.html?price=420000&rent=1350',
    )
    expect(
      await page.locator('script[type="rocketlazyloadscript"]').count(),
    ).toBeGreaterThan(0)
    const firstLoc = page.locator('iframe.caifu-buy-vs-rent').nth(0)
    await expect(firstLoc).toBeVisible()
    const firstHandle = await firstLoc.elementHandle()
    const first = await firstHandle?.contentFrame()
    if (!first) throw new Error('missing first iframe')
    const loc = page.locator('iframe.caifu-buy-vs-rent').nth(1)
    await expect(loc).toBeVisible()
    const handle = await loc.elementHandle()
    const second = await handle?.contentFrame()
    if (!second) throw new Error('missing second iframe')
    await waitApi(first)
    await waitApi(second)
    await expect.poll(async () => (await inputsOf(first)).price).toBe(420_000)
    await expect.poll(async () => (await inputsOf(first)).rent).toBe(1350)
    await expect.poll(async () => (await inputsOf(second)).price).toBe(400_000)
    await expect.poll(async () => (await inputsOf(second)).rent).toBe(1850)
  })
})
