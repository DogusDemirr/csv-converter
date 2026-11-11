export function resolveSiteUrl(value?: string): string | undefined {
 if (!value?.trim()) return undefined;
 const url = new URL(value);
 if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash || /(^|\.)(localhost|example\.(com|org|net)|pages\.dev)$|\.(example|invalid|test)$/i.test(url.hostname)) throw new Error('SITE_URL must be a real HTTPS production origin, without a path or temporary pages.dev hostname.');
 return url.origin;
}
export const siteUrl = process.env.DEPLOYMENT_ENV === 'preview' ? undefined : resolveSiteUrl(process.env.SITE_URL);
