import type {Page} from '@playwright/test';
import { mkdirSync } from 'node:fs'
import { expect,  test } from '@playwright/test'

const SHOT = '/workspace/wp-release/screens/buy-vs-rent'
mkdirSync(SHOT, { recursive: true })

const VIEWPORTS = [
  { name: '300x640', width: 300, height: 640 },
  { name: '390x844', width: 390, height: 844 },
  { name: '800x1000', width: 800, height: 1000 },
  { name: '1280x800', width: 1280, height: 800 },
]

async function frame(page: Page) {
  const iframe = page.locator('iframe.caifu-buy-vs-rent')
  await expect(iframe).toBeVisible()
  const h = await iframe.elementHandle()
  const content = await h?.contentFrame()
  if (!content)
    throw new Error('missing iframe document')
  return content
}

test.describe('buy-vs-rent smoke (WP-like host)', () => {
  for (const vp of VIEWPORTS) {
    test(`renders at ${vp.name} without page overflow`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto('/host-wp-column.html')
      const doc = await frame(page)
      await expect(doc.locator('h1')).toContainText(/买房还是租房|Kaufen oder mieten/)
      await expect(doc.locator('#cbr-banner')).toBeVisible({ timeout: 15_000 })
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow).toBeLessThanOrEqual(2)
      const innerOverflow = await doc.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(innerOverflow).toBeLessThanOrEqual(2)
      await page.screenshot({ path: `${SHOT}/host-${vp.name}.png`, fullPage: true })
      await doc.locator('.cbr-app').screenshot({ path: `${SHOT}/app-${vp.name}.png` })
    })
  }

  test('deterministic result updates after an input change', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/host-wp-column.html')
    const doc = await frame(page)
    const banner = doc.locator('#cbr-banner')
    await expect(banner).toBeVisible({ timeout: 15_000 })
    const before = await banner.innerText()
    await doc.locator('#cbr-price').fill('350000')
    await doc.locator('#cbr-price').blur()
    await expect.poll(async () => banner.innerText(), { timeout: 5000 }).not.toBe(before)
  })

  test('test API is exposed when cbr_test=1 and can compute + seed a PRNG', async ({ page }) => {
    await page.goto('/index.html?cbr_test=1')
    const api = await page.evaluate(async () => {
      const g = window as unknown as { CaifuBuyVsRentTest?: {
        compute: (i: object) => { ok: boolean, derived?: { cost: number } }
        createPrng: (s: number) => { nextU32: () => number }
        TAX_RATE: number
      } }
      const t = g.CaifuBuyVsRentTest
      if (!t)
        return { present: false }
      const r = t.compute({})
      const rng = t.createPrng(42)
      return { present: true, ok: r.ok, cost: r.derived?.cost, first: rng.nextU32(), rate: t.TAX_RATE }
    })
    expect(api.present).toBe(true)
    expect(api.ok).toBe(true)
    expect(api.cost).toBeCloseTo(468_280, 5)
    expect(api.first).toBe(0xA15C02B7)
    expect(api.rate).toBe(0.26375)
  })

  test('German locale can be selected', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 1000 })
    await page.goto('/host-wp-column.html')
    const doc = await frame(page)
    await expect(doc.locator('h1')).toBeVisible({ timeout: 15_000 })
    await doc.locator('button[data-lang="de"]').click()
    await expect(doc.locator('h1')).toHaveText(/Kaufen oder mieten/)
    await page.screenshot({ path: `${SHOT}/host-de-800x1000.png`, fullPage: true })
  })
})
