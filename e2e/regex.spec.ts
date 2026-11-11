import {test,expect,type Page} from '@playwright/test';
async function open(page:Page,locale='en'){
 await page.goto(`/${locale}/tools/regex-tester`);await expect(page.getByRole('button',{name:locale==='en'?'Test regex':'Regex test et',exact:true})).toBeEnabled();
}
for(const locale of ['en','tr'])test(`${locale}: Unicode named captures, indices, highlights, copy and mobile`,async({page,context,baseURL})=>{
 const issues:string[]=[];page.on('pageerror',e=>issues.push(e.message));page.on('request',r=>{if(!['GET','HEAD'].includes(r.method())||(/^https?:/.test(r.url())&&!r.url().startsWith(baseURL!)))issues.push('Unexpected network');});page.on('console',m=>{if(m.text().includes('Çağrı'))issues.push('Input logged');});
 await context.grantPermissions(['clipboard-read','clipboard-write'],{origin:baseURL!});await open(page,locale);await page.locator('#regex-pattern').fill('(?<word>\\p{L}+)');await page.locator('#regex-input').fill('Çağrı İzmir 🌍');await page.getByRole('checkbox',{name:'Flag u',exact:true}).check();const indices=await page.getByRole('checkbox',{name:'Flag d',exact:true}).isEnabled();if(indices)await page.getByRole('checkbox',{name:'Flag d',exact:true}).check();
 await page.getByRole('button',{name:locale==='en'?'Test regex':'Regex test et',exact:true}).click();await expect(page.getByTestId('match-count')).toHaveText('2');await expect(page.locator('.regex-highlight mark')).toHaveCount(2);await expect(page.locator('.regex-highlight mark').first()).toHaveText('Çağrı');
 const report=JSON.parse(await page.locator('#regex-output').inputValue());expect(report.matches[0].namedGroups.word).toBe('Çağrı');expect(report.matches[1].index).toBe(6);if(indices)expect(report.matches[0].indices.namedGroups.word).toEqual([0,5]);
 await page.getByRole('button',{name:locale==='en'?'Copy matches':'Eşleşmeleri kopyala',exact:true}).click();await expect.poll(async()=>JSON.parse(await page.evaluate(()=>navigator.clipboard.readText()))).toEqual(report);expect(await page.evaluate(()=>JSON.stringify(localStorage))).not.toContain('Çağrı');
 const theme=await page.locator('html').getAttribute('data-theme');await page.locator('header .theme').click();await expect(page.locator('html')).not.toHaveAttribute('data-theme',theme!);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:locale==='en'?'Clear':'Temizle',exact:true}).click();await expect(page.locator('#regex-pattern')).toHaveValue('');await expect(page.getByTestId('match-count')).toHaveCount(0);await expect(page.getByRole('checkbox',{name:'Flag u',exact:true})).toBeChecked();await page.getByRole('button',{name:locale==='en'?'Reset':'Sıfırla',exact:true}).click();await expect(page.getByRole('checkbox',{name:'Flag u',exact:true})).not.toBeChecked();await expect(page.getByRole('checkbox',{name:'Flag g',exact:true})).toBeChecked();
 await page.locator('header .language').click();await expect(page).toHaveURL(new RegExp(`/${locale==='en'?'tr':'en'}/tools/regex-tester$`));expect(issues).toEqual([]);
});
test('syntax errors, zero-length Unicode, bounded matches and inert HTML',async({page})=>{
 await open(page);await page.locator('#regex-pattern').fill('(');await page.getByRole('button',{name:'Test regex',exact:true}).click();await expect(page.locator('.workbench [role=alert]')).toContainText('Invalid regular expression');
 await page.locator('#regex-pattern').fill('');await page.locator('#regex-input').fill('😀a');await page.getByRole('checkbox',{name:'Flag u',exact:true}).check();await page.getByRole('button',{name:'Test regex',exact:true}).click();await expect(page.getByTestId('match-count')).toHaveText('3');await expect(page.locator('.zero-match')).toHaveCount(3);
 await page.locator('#regex-pattern').fill('a');await page.locator('#regex-input').fill('a'.repeat(1001));await page.getByRole('button',{name:'Test regex',exact:true}).click();await expect(page.getByTestId('match-count')).toHaveText('1000');await expect(page.locator('.notice').filter({hasText:'Stopped at 1,000'})).toBeVisible();await expect(page.locator('.regex-highlight mark')).toHaveCount(100);
 await page.locator('#regex-pattern').fill('.+');await page.locator('#regex-input').fill('<img src=x onerror=alert(1)>');await page.getByRole('button',{name:'Test regex',exact:true}).click();await expect(page.locator('.regex-highlight mark')).toHaveText('<img src=x onerror=alert(1)>');await expect(page.locator('.workbench img')).toHaveCount(0);
});
test('deterministic worker timeout terminates and rejects queued late results/errors',async({page})=>{
 await page.addInitScript(()=>{window.Worker=class{
  onmessage:((event:unknown)=>void)|null=null;onerror:((event:unknown)=>void)|null=null;onmessageerror=null;
  postMessage(data:{operation:string;requestId:number}){
   if(data.operation==='capabilities')queueMicrotask(()=>this.onmessage?.({data:{version:1,requestId:data.requestId,result:{text:'',extension:'json',warnings:[],supportedFlags:['g','i','m','s','u','y','d']}}}));
   else setTimeout(()=>{document.documentElement.dataset.lateRegex='delivered';this.onmessage?.({data:{version:1,requestId:data.requestId,result:{text:'late',extension:'json',warnings:[],regex:{count:1,limited:false,indexUnit:'UTF-16',matches:[]}}}});this.onerror?.(new ErrorEvent('error'));},1800);
  }
  terminate(){document.documentElement.dataset.regexTerminations=String(Number(document.documentElement.dataset.regexTerminations??'0')+1);}
 }as unknown as typeof Worker;});
 await open(page);await page.locator('#regex-pattern').fill('a');await page.locator('#regex-input').fill('a');await page.getByRole('button',{name:'Test regex',exact:true}).click();await expect(page.locator('.workbench [role=alert]')).toContainText('1.5-second',{timeout:5000});await expect(page.locator('html')).toHaveAttribute('data-late-regex','delivered');await expect(page.getByTestId('match-count')).toHaveCount(0);await expect(page.locator('.workbench [role=alert]')).toContainText('1.5-second');expect(Number(await page.locator('html').getAttribute('data-regex-terminations'))).toBeGreaterThanOrEqual(2);await page.getByRole('button',{name:'Reset',exact:true}).click();await expect(page.locator('.workbench [role=alert]')).toHaveCount(0);
});
test('small controlled ReDoS stays off the UI thread and recovers with a new worker',async({page},testInfo)=>{
 test.setTimeout(15000);await open(page);await page.locator('#regex-pattern').fill('^(a+)+$');await page.locator('#regex-input').fill('a'.repeat(32)+'!');const start=Date.now();await page.getByRole('button',{name:'Test regex',exact:true}).click();
 const theme=await page.locator('html').getAttribute('data-theme');await page.locator('header .theme').click();await expect(page.locator('html')).not.toHaveAttribute('data-theme',theme!);
 await expect.poll(async()=>await page.locator('.workbench [role=alert]').count()||await page.getByTestId('match-count').count(),{timeout:6000}).toBeGreaterThan(0);
 const timedOut=await page.locator('.workbench [role=alert]').count()>0;if(timedOut)await expect(page.locator('.workbench [role=alert]')).toContainText('1.5-second');else await expect(page.getByTestId('match-count')).toHaveText('0');
 await testInfo.attach('controlled-redos-result',{body:JSON.stringify({inputLength:33,pattern:'^(a+)+$',outcome:timedOut?'worker-timeout':'bounded-completion',elapsedMs:Date.now()-start}),contentType:'application/json'});
 await page.getByRole('button',{name:'Reset',exact:true}).click();await page.locator('#regex-pattern').fill('a+');await page.locator('#regex-input').fill('aaaa');await page.getByRole('button',{name:'Test regex',exact:true}).click();await expect(page.getByTestId('match-count')).toHaveText('1');
});
test('flag capability failures are retryable and unavailable flags stay disabled',async({page})=>{
 await page.addInitScript(()=>{let attempts=0;window.Worker=class{
  onmessage:((event:unknown)=>void)|null=null;onerror=null;onmessageerror=null;
  constructor(){if(++attempts===1)throw new Error('Synthetic capability startup failure');}
  postMessage(data:{requestId:number}){queueMicrotask(()=>this.onmessage?.({data:{version:1,requestId:data.requestId,result:{text:'',extension:'json',warnings:[],supportedFlags:['g','i','m']}}}));}
  terminate(){}
 }as unknown as typeof Worker;});
 await page.goto('/en/tools/regex-tester');await expect(page.locator('.workbench [role=alert]')).toContainText('Unable to check');await page.getByRole('button',{name:'Retry flag check'}).click();await expect(page.getByRole('button',{name:'Test regex',exact:true})).toBeEnabled();await expect(page.getByRole('checkbox',{name:'Flag d',exact:true})).toBeDisabled();await expect(page.getByRole('checkbox',{name:'Flag u',exact:true})).toBeDisabled();await expect(page.getByRole('checkbox',{name:'Flag g',exact:true})).toBeEnabled();
});
