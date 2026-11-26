import type { Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { expect, test } from '@playwright/test'

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
  if (!content) throw new Error('missing iframe document')
  return content
}

test.describe('buy-vs-rent smoke (WP-like host)', () => {
  for (const vp of VIEWPORTS) {
    test(`renders at ${vp.name} without page overflow`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto('/host-wp-column.html')
      const doc = await frame(page)
      await expect(doc.locator('h1')).toContainText(
        /买房还是租房|Kaufen oder mieten/,
      )
      await expect(doc.locator('#cbr-banner')).toBeVisible({ timeout: 15_000 })
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      )
      expect(overflow).toBeLessThanOrEqual(2)
      const innerOverflow = await doc.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      )
      expect(innerOverflow).toBeLessThanOrEqual(2)
      await page.screenshot({
        path: `${SHOT}/host-${vp.name}.png`,
        fullPage: true,
      })
      await doc
        .locator('.cbr-app')
        .screenshot({ path: `${SHOT}/app-${vp.name}.png` })
    })
  }

  test('deterministic result updates after an input change', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/host-wp-column.html')
    const doc = await frame(page)
    const banner = doc.locator('#cbr-banner')
    await expect(banner).toBeVisible({ timeout: 15_000 })
    const before = await banner.innerText()
    await doc.locator('#cbr-price').fill('350000')
    await doc.locator('#cbr-price').blur()
    await expect
      .poll(async () => banner.innerText(), { timeout: 5000 })
      .not.toBe(before)
  })

  test('test API is exposed when cbr_test=1 and can compute + seed a PRNG', async ({
    page,
  }) => {
    await page.goto('/index.html?cbr_test=1')
    const api = await page.evaluate(async () => {
      const g = window as unknown as {
        CaifuBuyVsRentTest?: {
          compute: (i: object) => { ok: boolean; derived?: { cost: number } }
          createPrng: (s: number) => { nextU32: () => number }
          TAX_RATE: number
        }
      }
      const t = g.CaifuBuyVsRentTest
      if (!t) return { present: false }
      const r = t.compute({})
      const rng = t.createPrng(42)
      return {
        present: true,
        ok: r.ok,
        cost: r.derived?.cost,
        first: rng.nextU32(),
        rate: t.TAX_RATE,
      }
    })
    expect(api.present).toBe(true)
    expect(api.ok).toBe(true)
    expect(api.cost).toBeCloseTo(468_280, 5)
    expect(api.first).toBe(0xa15c02b7)
    expect(api.rate).toBe(0.26375)
  })

  test('German locale can be selected', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 1000 })
    await page.goto('/host-wp-column.html')
    const doc = await frame(page)
    await expect(doc.locator('h1')).toBeVisible({ timeout: 15_000 })
    await doc.locator('button[data-lang="de"]').click()
    await expect(doc.locator('h1')).toHaveText(/Kaufen oder mieten/)
    await page.screenshot({
      path: `${SHOT}/host-de-800x1000.png`,
      fullPage: true,
    })
  })
})

test.describe('admin defaults reach the frontend', () => {
  test('a changed admin default shows up in the form and is restored by reset', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    const defaults = encodeURIComponent(
      JSON.stringify({ price: 350000, rent: 1600, grest_pct: 0.035 }),
    )
    await page.goto(`/host-wp-column.html?defaults=${defaults}`)
    const doc = await frame(page)
    await expect(doc.locator('#cbr-price')).toBeVisible({ timeout: 15_000 })
    await expect(doc.locator('#cbr-price')).toHaveValue('350.000')
    await expect(doc.locator('#cbr-rent')).toHaveValue('1.600')
    await expect(doc.locator('#cbr-grest_pct')).toHaveValue('3,50')
    await expect(doc.locator('#cbr-bundesland')).toHaveCount(0)
    await expect(doc.locator('#cbr-mc_sigma_house')).toHaveCount(0)
    await doc.locator('#cbr-price').fill('400000')
    await doc.locator('#cbr-price').blur()
    await doc.locator('#cbr-reset').click()
    await expect(doc.locator('#cbr-price')).toHaveValue('350.000')
    await expect(doc.locator('#cbr-rent')).toHaveValue('1.600')
    await expect(doc.locator('#cbr-grest_pct')).toHaveValue('3,50')
  })
})

test.describe('monte carlo probability cloud', () => {
  const cloudDir = `${SHOT}/mc-cloud`
  mkdirSync(cloudDir, { recursive: true })

  for (const vp of VIEWPORTS) {
    test(`MC tab + cloud chart at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto('/host-wp-column.html')
      const doc = await frame(page)
      await expect(doc.locator('#cbr-banner')).toBeVisible({ timeout: 15_000 })
      await doc.locator('#cbr-mc').click()
      await expect(doc.locator('#cbr-mc-cloud')).toBeVisible({
        timeout: 60_000,
      })
      await expect(doc.locator('#cbr-mc-cloud-title')).toHaveText(
        '净资产随时间的概率云（蒙特卡洛）',
      )
      await expect(doc.locator('#cbr-chart-mc-cloud')).toBeVisible()
      await expect(doc.locator('#cbr-mc-cloud-table-toggle')).toHaveText(
        '各年分位数（表格）',
      )
      const overflow = await doc.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      )
      expect(overflow).toBeLessThanOrEqual(2)
      const sizes = await doc.evaluate(() => {
        const el = document.getElementById('cbr-mc-cloud')
        if (!el) return { overflow: 99, width: 0, body: 0 }
        const r = el.getBoundingClientRect()
        return {
          overflow: el.scrollWidth - el.clientWidth,
          width: r.width,
          body: document.documentElement.clientWidth,
        }
      })
      expect(sizes.overflow).toBeLessThanOrEqual(2)
      expect(sizes.width).toBeLessThanOrEqual(sizes.body + 2)
      await page.screenshot({
        path: `${cloudDir}/host-${vp.name}.png`,
        fullPage: true,
      })
      await doc
        .locator('#cbr-mc-cloud')
        .screenshot({ path: `${cloudDir}/cloud-${vp.name}.png` })
    })
  }
})
