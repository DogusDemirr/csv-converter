import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { readSheet } from 'read-excel-file/node';
for(const locale of ['en','tr']) test(`${locale}: legal drafts, footer navigation and no fictitious contact`,async({page})=>{
 for(const document of ['privacy','terms','contact']){
  expect((await page.goto(`/${locale}/${document}`))?.status()).toBe(200);
  await expect(page.locator('h1')).toHaveCount(1);await expect(page.locator('main .notice')).toContainText(locale==='en'?'Draft':'Taslak');
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content','noindex, follow');
  await expect(page.locator('a[href^="mailto:"], form')).toHaveCount(0);
  await expect(page.locator('footer nav a')).toHaveCount(3);
  await page.locator('header .language').click();await expect(page).toHaveURL(new RegExp(`/${locale==='en'?'tr':'en'}/${document}$`));
 }
});
test('larger CSV export exercises browser compression and preserves text cells',async({page})=>{
 await page.goto('/en/tools/csv-to-excel');
 const rows=Array.from({length:3500},(_,i)=>[`Çağrı ${i} ${'İstanbul '.repeat(8)}`,'2026-11-11','001.50','', '=1+1']);
 const csv='name,date,number,empty,formula\n'+rows.map(row=>row.join(',')).join('\n');
 await page.locator('input[type=file]').setInputFiles({name:'large.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
 await expect(page.locator('table')).toContainText('Çağrı 0');await page.getByRole('button',{name:'Convert to Excel'}).click();
 const pending=page.waitForEvent('download');await page.getByRole('link',{name:'Download Excel'}).click();const download=await pending;
 const sheet=await readSheet(await readFile((await download.path())!),{trim:false});
 expect(sheet).toHaveLength(3501);expect(sheet[1]).toEqual([rows[0][0],'2026-11-11','001.50',null,'=1+1']);expect(sheet[3500][0]).toBe(rows[3499][0]);
});
