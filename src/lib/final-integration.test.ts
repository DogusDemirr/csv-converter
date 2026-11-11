import { afterEach, describe, expect, it, vi } from 'vitest';
import { tools, allTools } from './tools';
import { toolExamples } from './tool-examples';
import { runTool } from './tool-engine';
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
describe('Final integration and configured SEO', () => {
 it('keeps exactly twelve active tools with unique bilingual metadata and examples', () => {
  expect(tools).toHaveLength(12); expect(Object.keys(toolExamples).sort()).toEqual(tools.map(t => t.id).sort());
  expect(allTools.filter(t => !tools.includes(t))).toHaveLength(2);
  for (const locale of ['en','tr'] as const) {
   expect(new Set(tools.map(t => t.name[locale])).size).toBe(12);
   expect(new Set(tools.map(t => t.description[locale])).size).toBe(12);
   for (const tool of tools) { expect(tool.description[locale].length).toBeGreaterThan(30); expect(tool.usage[locale].length).toBeGreaterThan(30); }
  }
 });
 it('generates canonical, hreflang, Open Graph and sitemap from configured origin', async () => {
  vi.stubEnv('SITE_URL','https://tools.acme.dev'); vi.resetModules();
  const { pageMetadata } = await import('./tool-metadata'); const { default: sitemap } = await import('../app/sitemap');
  const urls = sitemap().map(entry => entry.url); expect(urls).toHaveLength(26);
  for (const locale of ['en','tr'] as const) for (const tool of tools) {
   const path = `/tools/${tool.id}`; const metadata = pageMetadata(locale,tool.name[locale],tool.description[locale],path);
   expect(metadata.alternates?.canonical).toBe(`/${locale}${path}`);
   expect(metadata.alternates?.languages).toEqual({ en:`/en${path}`,tr:`/tr${path}`,'x-default':`/en${path}` });
   expect(metadata.openGraph).toMatchObject({url:`https://tools.acme.dev/${locale}${path}`,title:tool.name[locale],description:tool.description[locale]});
   expect(urls).toContain(`https://tools.acme.dev/${locale}${path}`);
  }
  expect(urls.some(url => /excel-to-/.test(url))).toBe(false);
 });
 it('keeps documented legacy Unicode examples valid', async () => {
  expect((await runTool('base64',toolExamples.base64[0])).text).toBe(toolExamples.base64[1]);
  for (const id of ['json-formatter','json-minifier'] as const) expect(JSON.parse((await runTool(id,toolExamples[id][0])).text)).toEqual(JSON.parse(toolExamples[id][1]));
  expect(JSON.parse((await runTool('csv-to-json',toolExamples['csv-to-json'][0])).text)).toEqual([{name:'Çağrı',id:'001'}]);
 });
});
