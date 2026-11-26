import type { Frame, Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

const ORIGIN = 'http://127.0.0.1:4177'

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
        CaifuBuyVsRentTest?: {
          shareUrl?: () => string
          getInputs?: () => { price: number, rent: number, cash_monthly: number, inflation: number }
        }
      }
      return Boolean(g.CaifuBuyVsRentTest?.shareUrl && g.CaifuBuyVsRentTest?.getInputs)
    },
    null,
    { timeout: 15_000 },
  )
}

async function inputsOf(doc: Frame) {
  return doc.evaluate(() => {
    const g = window as unknown as {
      CaifuBuyVsRentTest?: {
        getInputs?: () => {
          price: number
          rent: number
          cash_monthly: number
          inflation: number
        }
      }
    }
    return g.CaifuBuyVsRentTest!.getInputs!()
  })
}

async function shareOf(doc: Frame) {
  return doc.evaluate(() => {
    const g = window as unknown as { CaifuBuyVsRentTest?: { shareUrl?: () => string } }
    return g.CaifuBuyVsRentTest!.shareUrl!()
  })
}

async function fillField(doc: Frame, key: string, value: string) {
  const loc = doc.locator(`#cbr-${key}`)
  const groupBtn = loc.locator(
    'xpath=ancestor::div[contains(@class,"cbr-group")]//button[contains(@class,"cbr-toggle")]',
  )
  if (
    (await groupBtn.count()) &&
    (await groupBtn.getAttribute('aria-expanded')) === 'false'
  ) {
    await groupBtn.click()
  }
  await expect(loc).toBeVisible({ timeout: 15_000 })
  await loc.fill(value)
  await loc.blur()
}

async function open(page: Page, path: string, n: number) {
  await page.goto(`${ORIGIN}${path}`)
  const frames: Frame[] = []
  for (let i = 0; i < n; i++) {
    const doc = await frameAt(page, i)
    await waitApi(doc)
    frames.push(doc)
  }
  return frames
}

test.describe('multi-instance share params (bootstrap + shared extractor)', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('c2: a legacy unprefixed link on a two-instance page restores only the first', async ({
    page,
  }) => {
    const [first, second] = await open(
      page,
      '/multi-host.html?price=420000&rent=1350',
      2,
    )
    await expect.poll(async () => (await inputsOf(first)).price).toBe(420_000)
    await expect.poll(async () => (await inputsOf(first)).rent).toBe(1350)
    await expect.poll(async () => (await inputsOf(second)).price).toBe(400_000)
    await expect.poll(async () => (await inputsOf(second)).rent).toBe(1850)
  })

  test('c3: a prefixed key on the second instance wins over an unprefixed price', async ({
    page,
  }) => {
    const [first, second] = await open(
      page,
      '/multi-host.html?price=410000&bvr2.price=430000',
      2,
    )
    await expect.poll(async () => (await inputsOf(first)).price).toBe(410_000)
    await expect.poll(async () => (await inputsOf(second)).price).toBe(430_000)
  })

  test('c3b: a prefix for the first instance wins that field; the second stays default', async ({
    page,
  }) => {
    const [first, second] = await open(
      page,
      '/multi-host.html?price=410000&bvr1.rent=1400',
      2,
    )
    await expect.poll(async () => (await inputsOf(first)).price).toBe(410_000)
    await expect.poll(async () => (await inputsOf(first)).rent).toBe(1400)
    await expect.poll(async () => (await inputsOf(second)).price).toBe(400_000)
    await expect.poll(async () => (await inputsOf(second)).rent).toBe(1850)
  })

  test('c5c: a legacy unprefixed link on a three-instance page restores only the first', async ({
    page,
  }) => {
    const frames = await open(page, '/multi-host-three.html?price=420000', 3)
    await expect.poll(async () => (await inputsOf(frames[0])).price).toBe(420_000)
    await expect.poll(async () => (await inputsOf(frames[1])).price).toBe(400_000)
    await expect.poll(async () => (await inputsOf(frames[2])).price).toBe(400_000)
  })

  test('c6c: custom ids apply a legacy link only to the first instance in document order', async ({
    page,
  }) => {
    const [first, second] = await open(
      page,
      '/multi-host-custom.html?price=420000',
      2,
    )
    await expect.poll(async () => (await inputsOf(first)).price).toBe(420_000)
    await expect.poll(async () => (await inputsOf(second)).price).toBe(400_000)
  })

  test('c12: reverting the first instance and copying drops leftover unprefixed keys', async ({
    page,
  }) => {
    const [first, second] = await open(page, '/multi-host.html?price=420000', 2)
    await expect.poll(async () => (await inputsOf(first)).price).toBe(420_000)
    await expect.poll(async () => (await inputsOf(second)).price).toBe(400_000)
    await fillField(first, 'price', '400000')
    await expect.poll(async () => (await inputsOf(first)).price).toBe(400_000)
    const url = await shareOf(first)
    const parsed = new URL(url)
    expect(parsed.searchParams.get('price')).toBeNull()
    expect(parsed.searchParams.get('bvr1.price')).toBeNull()
    await page.goto(url)
    const first2 = await frameAt(page, 0)
    const second2 = await frameAt(page, 1)
    await waitApi(first2)
    await waitApi(second2)
    await expect.poll(async () => (await inputsOf(first2)).price).toBe(400_000)
    await expect.poll(async () => (await inputsOf(second2)).price).toBe(400_000)
  })

  test('c13: a generated mixed link restores prefixed values on the second instance', async ({
    page,
  }) => {
    const [first, second] = await open(page, '/multi-host.html?price=420000', 2)
    await expect.poll(async () => (await inputsOf(first)).price).toBe(420_000)
    await fillField(second, 'price', '310000')
    await fillField(second, 'cash_monthly', '2800')
    await fillField(second, 'inflation', '2,5')
    await expect.poll(async () => (await inputsOf(second)).price).toBe(310_000)
    await expect.poll(async () => (await inputsOf(second)).cash_monthly).toBe(2800)
    await expect.poll(async () => (await inputsOf(second)).inflation).toBe(0.025)
    const url = await shareOf(second)
    const parsed = new URL(url)
    expect(parsed.searchParams.get('price')).toBe('420000')
    expect(parsed.searchParams.get('bvr2.price')).toBe('310000')
    expect(parsed.searchParams.get('bvr2.cash_monthly')).toBe('2800')
    expect(parsed.searchParams.get('bvr2.inflation')).toBe('0.025')
    await page.goto(url)
    const first2 = await frameAt(page, 0)
    const second2 = await frameAt(page, 1)
    await waitApi(first2)
    await waitApi(second2)
    await expect.poll(async () => (await inputsOf(first2)).price).toBe(420_000)
    await expect.poll(async () => (await inputsOf(second2)).price).toBe(310_000)
    await expect.poll(async () => (await inputsOf(second2)).cash_monthly).toBe(2800)
    await expect.poll(async () => (await inputsOf(first2)).price).not.toBe(310_000)
  })
})
