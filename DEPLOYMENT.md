# Deployment preparation (not deployed)

The platform can be built as a static site or run with a Next.js server. Twelve tools remain active; XLSX imports stay disabled. Policy/contact pages are unfinished legal drafts and remain noindex, outside the sitemap. See PHASE6A_REPORT.md for release blockers.

## Recommended target

Cloudflare Pages **static assets**, publishing only `out/`, is a suitable target for this browser-only application. No Functions, Next server adapter, database or upload API is required. The checked-in `_headers` and `_redirects` files target Pages-compatible static hosting. This recommendation is based on the documented static hosting features, not a completed deployment.

Build environment: Node.js 24 was used locally; set `NODE_VERSION=24` on the chosen build provider and verify its supported build image. Use `npm ci` with the lockfile. Do not upload source, `.env`, `.next`, `node_modules`, test artifacts or reports as site assets.

## Environment

- `SITE_URL`: actual HTTPS production origin, without credentials, route, query or fragment. No domain has been purchased or supplied. Leave blank for local/preview builds. Set at **build time**, then rebuild after any change.
- `STATIC_EXPORT=1`: set automatically by the static build script; do not set it for the regular Next server build.
- `STATIC_TEST=1`: QA-only flag selecting the local static file server in Playwright.
- No `NEXT_PUBLIC_` variable, API key, database credential, publisher ID or contact email is required by the current application. Do not invent missing values.

## Build commands

```sh
npm ci
npm run build:static
```

This produces a preview in `out/` with safe noindex/blocked robots/empty sitemap when SITE_URL is blank. For a future authorized production build, set the real SITE_URL in the provider's environment and use:

```sh
npm run build:static:production
```

The production command refuses an empty SITE_URL. Shared metadata validation rejects malformed/non-HTTPS/known placeholder origins during build. A syntactically valid hostname does not prove ownership, DNS or TLS readiness. Do not use a test fixture domain for publication.

`npm run build` + `npm run start` remains the regular Next.js server path. `next start` cannot serve an export build; rebuild in regular mode first. Both build modes share `.next`, so do not build/test them concurrently. `out/` is independent static output, but rebuild it before any future publication to avoid stale assets.

## Static routing and headers

- `generateStaticParams` enumerates EN/TR home, tool and legal pages; `dynamicParams=false` rejects unknown paths.
- Root `_redirects` rule is a temporary 302 to `/en`, preserving the prior default language. Exported root HTML also contains language links as a fallback on hosts that do not interpret redirect files.
- On generic static hosts, map extensionless paths to `{path}.html` and unknown paths to `404.html` with HTTP 404. Do not enable SPA fallback that returns HTTP 200 for every unknown route. Keep Next's exported `.txt`/segment files and worker JS assets intact.
- Next `headers()` does not apply to static exports. `public/_headers`, copied to `out`, declares nosniff, frame protection, referrer and device-permission policy. Other hosts require equivalent configuration. Verify actual responses after deployment.
- No CSP/HSTS certification is claimed. If adding CSP, test Next's inline startup/theme code and compression workers, including blob workers; do not deploy a policy that breaks exports. Add HSTS only after actual HTTPS/domain scope is verified.

## Local static QA

After `npm run build:static`, in PowerShell:

```powershell
$env:STATIC_TEST='1'
npm.cmd run test:e2e
Remove-Item Env:STATIC_TEST
```

The QA server serves only local static files over GET/HEAD; it is not a production backend. It approximates clean HTML URLs, root redirection, 404 and security headers. It does not prove Cloudflare-specific behavior. `node scripts/check-static-seo.mjs` builds with a synthetic origin, checks canonical/hreflang/OG/sitemap/robots, then rebuilds with the original SITE_URL in a finally block. Never run it while serving `out/` for other tests or publication.

## Before publication

1. Complete controller/publisher identity, a real monitored contact channel and counsel-reviewed EN/TR legal documents. Draft pages must not be represented as final legal compliance.
2. Select domain and host; document hosting logs, retention, processors, locations and transfers. Review applicable KVKK/GDPR obligations.
3. Configure real SITE_URL, rebuild, inspect canonical/hreflang/OG, 26 active sitemap URLs and indexing policy. Disabled XLSX imports must remain noindex; unfinished legal drafts must stay out of the sitemap.
4. Re-run audit and release checks. Test direct deep links, language changes, download/copy, worker timeout, headers, 404 and network privacy on the actual host.
5. Advertising is not installed. Before any AdSense integration, review Google publisher/content and consent policies, applicable certified CMP requirements, privacy disclosures and performance. Add ads.txt only with verified account instructions/publisher data. No approval is guaranteed.

No deployment, Git push, domain registration or advertising activation is authorized by these instructions alone.
