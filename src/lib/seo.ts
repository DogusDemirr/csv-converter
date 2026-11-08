export function resolveSiteUrl(value?: string): string | undefined {
 if (!value?.trim()) return undefined;
 const url = new URL(value);
 if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash || /(^|\.)(localhost|example\.(com|org|net))$|\.(example|invalid|test)$/i.test(url.hostname)) throw new Error('SITE_URL must be a real HTTPS production origin, without a path.');
 return url.origin;
}
export const siteUrl = resolveSiteUrl(process.env.SITE_URL);
