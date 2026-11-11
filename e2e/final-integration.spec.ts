import { test, expect } from '@playwright/test';
import { tools } from '../src/lib/tools';

for (const locale of ['en','tr'] as const) test(`${locale}: active catalog, landmarks, examples and related links`, async ({ page }) => {
 await page.goto(`/${locale}`);
 await expect(page.getByRole('heading', { name: locale === 'en' ? 'Popular tools · curated' : 'Popüler araçlar · editör seçkisi' })).toBeVisible();
 await expect(page.locator('main')).toHaveCount(1);
 for (const tool of tools) {
  const response = await page.goto(`/${locale}/tools/${tool.id}`); expect(response?.status()).toBe(200);
  await expect(page.locator('main')).toHaveCount(1); await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: locale === 'en' ? 'Practical example' : 'Uygulama örneği' })).toBeVisible();
  const related = page.getByRole('region', { name: locale === 'en' ? 'Related tools' : 'İlgili araçlar' });
  await expect(related.locator('.tool-card')).toHaveCount(3);
  for (const href of await related.locator('.tool-card').evaluateAll(links => links.map(a => a.getAttribute('href')))) {
   expect(href).not.toContain(tool.id); expect(href).not.toMatch(/excel-to-/);
   expect(tools.some(t => href === `/${locale}/tools/${t.id}`)).toBe(true);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
 }
});

test('keyboard skip link, download feedback and worker recovery after size limit', async ({ page }) => {
 await page.goto('/en/tools/json-to-typescript');
 await page.keyboard.press('Tab'); await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
 await page.keyboard.press('Enter'); await expect(page).toHaveURL(/#main$/);
 await page.locator('#json-left').fill(JSON.stringify({ text: 'ğ'.repeat(530000) }));
 await page.getByRole('button', { name: 'Generate TypeScript', exact: true }).click();
 await expect(page.locator('.workbench [role=alert]')).toBeVisible();
 await page.getByRole('button', { name: 'Clear', exact: true }).click();
 await page.locator('#json-left').fill('{"id":1}');
 await page.getByRole('button', { name: 'Generate TypeScript', exact: true }).click();
 await expect(page.locator('#developer-output')).toHaveValue(/id: number/);
 const download = page.waitForEvent('download'); await page.getByRole('link', { name: 'Download ↓' }).click();
 expect((await download).suggestedFilename()).toBe('json-to-typescript.ts');
 await expect(page.getByTestId('download-feedback')).toContainText('Download requested');
});
