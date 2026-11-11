import { describe, expect, it, vi } from 'vitest';
import Papa from 'papaparse';
import { runTool } from './tool-engine';
import { readUtf8 } from './file-validation';
import { resolveSiteUrl } from './seo';
describe('Production regressions', () => {
 it('does not read inherited values for missing JSON fields', async () => {
  const result = await runTool('json-to-csv', '[{"toString":"own","constructor":"own","__proto__":"own"},{"name":"Çağrı"}]');
  expect(Papa.parse<string[]>(result.text).data[2]).toEqual(['', '', '', 'Çağrı']);
 });
 it('preserves nested Unicode and null JSON values', async () => {
  const data = { nested: { text: 'İstanbul 🌍', value: null }, values: [null, true, false] };
  for (const id of ['json-formatter','json-minifier'] as const) expect(JSON.parse((await runTool(id, JSON.stringify(data))).text)).toEqual(data);
  expect(Papa.parse<string[]>((await runTool('json-to-csv', '[{"a":null,"b":{"text":"İstanbul 🌍"}}]')).text).data[1]).toEqual(['', '{"text":"İstanbul 🌍"}']);
 });
 it('reads UTF-8 BOM and Unicode without silently replacing corrupt bytes', async () => {
  expect(await readUtf8(new Blob(['\uFEFFÇağrı 🌍']))).toBe('Çağrı 🌍');
  await expect(readUtf8(new Blob([new Uint8Array([0xff])]))).rejects.toThrow('encoding');
 });
 it('requires a real production origin', () => {
  expect(resolveSiteUrl()).toBeUndefined(); expect(resolveSiteUrl('https://tools.acme.dev/')).toBe('https://tools.acme.dev');
  for (const url of ['http://tools.acme.dev', 'https://csvconverter.example', 'https://example.com', 'https://localhost', 'https://tools.acme.dev/path', 'https://user:pass@tools.acme.dev']) expect(() => resolveSiteUrl(url)).toThrow();
 });
 it('disables indexing when production domain is unset', async () => {
  vi.resetModules(); vi.stubEnv('DEPLOYMENT_ENV','production'); vi.stubEnv('SITE_URL','');
  try {
   const { pageMetadata } = await import('./tool-metadata');
   const metadata = pageMetadata('en', 'Test', 'Description'); expect(metadata.robots).toEqual({index:false,follow:false}); expect(metadata.alternates).toBeUndefined();
  } finally { vi.unstubAllEnvs(); vi.resetModules(); }
 });
 it('uses the configured origin for canonical and alternates', async () => {
  vi.resetModules(); vi.stubEnv('DEPLOYMENT_ENV','production'); vi.stubEnv('SITE_URL','https://tools.acme.dev');
  try {
   const { pageMetadata } = await import('./tool-metadata'); const metadata = pageMetadata('tr','Test','Description','/tools/base64');
   expect(new URL(String(metadata.metadataBase)).origin).toBe('https://tools.acme.dev'); expect(metadata.alternates?.canonical).toBe('/tr/tools/base64'); expect(metadata.robots).toEqual({index:true,follow:true});
  } finally { vi.unstubAllEnvs(); vi.resetModules(); }
 });
 it.each(['', 'https://tools.acme.dev'])('keeps sitemap and robots aligned with SITE_URL=%s', async origin => {
  vi.resetModules(); vi.stubEnv('DEPLOYMENT_ENV','production'); vi.stubEnv('SITE_URL',origin);
  try {
   const { default: sitemap } = await import('../app/sitemap'); const { default: robots } = await import('../app/robots');
   const entries = sitemap(); const policy = robots();
   expect(entries).toHaveLength(origin ? 26 : 0);
   expect(entries.some(e=>/\/excel-to-(csv|json)$/.test(e.url))).toBe(false);
   if (origin) { expect(policy.sitemap).toBe(`${origin}/sitemap.xml`); expect(entries.every(e=>e.url.startsWith(origin))).toBe(true); expect(entries[0].alternates?.languages?.tr).toBe(`${origin}/tr`); }
   else { expect(policy.rules).toEqual({userAgent:'*',disallow:'/'}); expect(policy.sitemap).toBeUndefined(); }
  } finally { vi.unstubAllEnvs(); vi.resetModules(); }
 });
});
