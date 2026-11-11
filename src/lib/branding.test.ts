import { afterEach, expect, it, vi } from 'vitest';
import { pagesEnvironment } from '../../scripts/pages-environment.mjs';
import { resolveSiteUrl } from './seo';
import { brand } from './brand';
afterEach(()=>{vi.unstubAllEnvs();vi.resetModules();});
it('keeps Nexutool branding localized without inventing a publisher',()=>{
 expect(brand.name).toBe('Nexutool');expect(brand.tagline.en).toBe('Smart Tools. Simple Solutions.');expect(brand.tagline.tr).toBe('Akıllı Araçlar. Basit Çözümler.');
});
it('refuses temporary pages.dev canonical origins',()=>{
 for(const url of ['https://nexutool.pages.dev','https://branch.nexutool.pages.dev','https://pages.dev'])expect(()=>resolveSiteUrl(url)).toThrow();
});
it('keeps previews noindex even when a real origin was inherited',async()=>{
 vi.stubEnv('SITE_URL','https://tools.acme.dev');vi.stubEnv('DEPLOYMENT_ENV','preview');vi.resetModules();
 const {pageMetadata}=await import('./tool-metadata');const m=pageMetadata('en','JSON Diff','Compare JSON','/tools/json-diff');
 expect(m.title).toBe('JSON Diff | Nexutool');expect(m.openGraph).toMatchObject({siteName:'Nexutool'});expect(m.robots).toEqual({index:false,follow:false});expect(m.alternates).toBeUndefined();
 const {default:sitemap}=await import('../app/sitemap');const {default:robots}=await import('../app/robots');expect(sitemap()).toEqual([]);expect(robots().rules).toEqual({userAgent:'*',disallow:'/'});
});
it('enables Pages production only for an explicitly approved matching branch/context',()=>{
 const env={SITE_URL:'https://tools.acme.dev',DEPLOYMENT_ENV:'production',PRODUCTION_BRANCH:'release',CF_PAGES_BRANCH:'feature'};
 expect(pagesEnvironment(env)).toMatchObject({DEPLOYMENT_ENV:'preview',SITE_URL:''});
 expect(pagesEnvironment({...env,CF_PAGES_BRANCH:'release'})).toMatchObject({DEPLOYMENT_ENV:'production',SITE_URL:env.SITE_URL});
 expect(pagesEnvironment({...env,CF_PAGES_BRANCH:'release',DEPLOYMENT_ENV:'preview'}).SITE_URL).toBe('');
 expect(pagesEnvironment({SITE_URL:env.SITE_URL})).toMatchObject({DEPLOYMENT_ENV:'preview',SITE_URL:''});
});
