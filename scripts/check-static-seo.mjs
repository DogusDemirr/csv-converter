// Synthetic origin is used only to inspect generated files, never deployed.
import { spawnSync } from 'node:child_process';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const origin='https://tools.acme.dev';
function build(site) { const r=spawnSync(process.execPath,['scripts/build-static.mjs'],{stdio:'inherit',windowsHide:true,env:{...process.env,SITE_URL:site}});assert.equal(r.status,0,'Static build failed'); }
try {
 build(origin);
 const files=(await readdir('out/en/tools')).filter(name=>name.endsWith('.html')&&!name.startsWith('excel-to-')).map(name=>name.slice(0,-5));assert.equal(files.length,12);
 const paths=['',...files.map(id=>`/tools/${id}`)]; const sitemap=await readFile('out/sitemap.xml','utf8');const robots=await readFile('out/robots.txt','utf8');
 assert.match(robots,/Allow: \//);assert.ok(robots.includes(`${origin}/sitemap.xml`));
 assert.equal((sitemap.match(/<loc>/g)||[]).length,26);
 for(const locale of ['en','tr']) for(const path of paths){
  const html=await readFile(`out/${locale}${path}.html`,'utf8');const tags=html.match(/<link\b[^>]*>/g)||[];
  assert.ok(tags.some(t=>t.includes('rel="canonical"')&&t.includes(`href="${origin}/${locale}${path}"`)));
  for(const [lang,target] of [['en','en'],['tr','tr'],['x-default','en']]) assert.ok(tags.some(t=>new RegExp(`hreflang="${lang}"`,'i').test(t)&&t.includes(`href="${origin}/${target}${path}"`)));
  assert.ok(html.includes(`content="${origin}/${locale}${path}"`));assert.ok(sitemap.includes(`<loc>${origin}/${locale}${path}</loc>`));
 }
 for(const locale of ['en','tr'])for(const slug of ['excel-to-csv','excel-to-json']){const html=await readFile(`out/${locale}/tools/${slug}.html`,'utf8');assert.match(html,/content="noindex, follow"/);assert.ok(!sitemap.includes(`/tools/${slug}`));}
 for(const locale of ['en','tr'])for(const slug of ['privacy','terms','contact']){const html=await readFile(`out/${locale}/${slug}.html`,'utf8');assert.match(html,/content="noindex, follow"/);assert.ok(!sitemap.includes(`/${locale}/${slug}`));}
 await mkdir('artifacts',{recursive:true});await writeFile('artifacts/phase6a-configured-static-seo.json',JSON.stringify({fixtureOrigin:origin,activeUrls:26,closedImports:4,legalDrafts:6,canonical:true,hreflang:true,openGraphUrl:true,robots:true,sitemap:true},null,2));
 console.log('Configured-origin static SEO: 26 active URLs, 4 disabled imports and 6 legal drafts checked.');
}finally{build(process.env.SITE_URL||'');}
