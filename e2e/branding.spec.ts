import { test, expect } from '@playwright/test';
for(const locale of ['en','tr']) test(`${locale}: Nexutool branding, local assets and keyboard navigation`,async({page,request})=>{
 await page.goto(`/${locale}`);await expect(page).toHaveTitle(/Nexutool$/);
 await expect(page.locator('header .brand')).toHaveAccessibleName(locale==='en'?'Nexutool home':'Nexutool ana sayfa');
 await expect(page.locator('header .brand')).toContainText('Nexutool');await expect(page.locator('footer .brand')).toContainText('Nexutool');
 await expect(page.locator('.platform-hero .eyebrow')).toContainText(locale==='en'?'Smart Tools. Simple Solutions.':'Akıllı Araçlar. Basit Çözümler.');
 await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute('content','Nexutool');
 await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute('content',/Nexutool$/);
 for(const path of ['/icon.svg','/favicon.ico','/icons/nexutool-192.png','/icons/nexutool-512.png'])expect((await request.get(path)).status()).toBe(200);
 await page.keyboard.press('Tab');await expect(page.locator('.skip')).toBeFocused();
 await page.getByRole('link',{name:locale==='en'?'Privacy Policy':'Gizlilik',exact:true}).click();await expect(page).toHaveURL(new RegExp(`/${locale}/privacy$`));await page.reload();
 await expect(page.locator('main')).toContainText('Nexutool');await expect(page.locator('main .notice')).toContainText(locale==='en'?'Draft':'Taslak');
 await page.locator('header .language').click();await expect(page).toHaveURL(new RegExp(`/${locale==='en'?'tr':'en'}/privacy$`));await page.reload();await expect(page.locator('html')).toHaveAttribute('lang',locale==='en'?'tr':'en');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect((await page.goto('/unavailable-nexutool-page'))?.status()).toBe(404);await expect(page.getByRole('heading',{name:'Page not found'})).toBeVisible();await expect(page.locator('main')).toContainText('Nexutool');
});
