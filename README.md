# CSV Converter

Browser-only CSV to Excel converter. Next.js App Router, TypeScript strict, Tailwind, Papa Parse and ExcelJS.

## Start

```sh
npm install
npm run dev
```

Open http://localhost:3000/en or /tr. On restricted Windows PowerShell use npm.cmd and npx.cmd.

## Checks

```sh
npm run lint
npx tsc --noEmit
npm run test
npm run build
```

Production: npm run build, then npm run start. Configure SITE_URL with the real HTTPS production origin before building; see .env.example. Without SITE_URL the build intentionally emits noindex, blocks robots and produces an empty sitemap. The old NEXT_PUBLIC_SITE_URL setting is no longer used.

Files stay in a browser worker. No upload endpoints, analytics, database or authentication. All XLSX values are text to preserve leading zeros and prevent formula injection. Limits: 5 MiB, 20,000 total rows, 200,000 cells, 1,000 columns and 32,767 characters/cell. Empty rows are skipped; the first row is styled as a header. CR line endings may normalize to LF.

See PHASE1_REPORT.md for implementation details and verification limits.

## Phase 2 — Online Tools

The homepage now includes search, category filters and nine active tools. New tools: JSON Formatter & Validator, JSON Minifier, JSON to CSV, CSV to JSON, Excel to CSV, Excel to JSON, Base64 Encode/Decode and JWT Decoder.

Each tool has /en/tools/{slug} and /tr/tools/{slug} pages. The original CSV to Excel remains available on /en and /tr at #converter, plus /tools/csv-to-excel pages. JWT decoding does not verify a token. XLSX formulas are not calculated; only cached results are exported.

No new dependencies or backend endpoints were added. See PHASE2_REPORT.md for routes, security rules, 89 passing tests and browser verification limits.

## Phase 3 — Verification

```sh
npx playwright install chromium
npm run build
npm run test:e2e
npm run perf
```

The E2E suite runs against a production build on port 3100, with desktop Chromium and Pixel 7 emulation. Current E2E SEO expectations use the safe, unconfigured SITE_URL mode. Configured production canonical/sitemap/robots branches are covered by unit tests. Run the E2E suite on a build without SITE_URL; production must subsequently be rebuilt with the real domain and smoke-tested on hosting.

Lighthouse starts a separate production server on port 3200 and Chromium debugging on 9224; keep those ports free. Reports are written to ignored artifacts/. Playwright HTML and JSON results are in playwright-report/ and test-results/. On restricted Windows PowerShell use npm.cmd/npx.cmd. Sandboxed environments may require permission for browser processes and Windows process cleanup.

Latest results and release blockers are documented in PHASE3_REPORT.md. Unit tests, E2E tests, Lighthouse and audit reports have different scopes; local scores do not guarantee hosting performance or security certification.

## Phase 3.1 — Security status (current)

XLSX imports (Excel to CSV and Excel to JSON) are temporarily disabled because the current ExcelJS/JSZip load path cannot enforce a reliable decompression resource budget. Existing URLs show a noindex safety notice with no file control; worker and engine calls reject imports before reading file bytes. They are excluded from the active catalog and sitemap. Seven tools remain active, including CSV to Excel export.

Current checks: 90 unit tests and 32 desktop/mobile Chromium E2E tests passed. The lower unit count replaces discontinued import-success cases with fail-closed security cases. Two moderate audit entries remain for the same ExcelJS -> uuid advisory; no force fix or unassessed major upgrade was applied. See PHASE3_1_SECURITY_REPORT.md for the NO-GO production decision, dependency analysis and reopening requirements. The configured sitemap now contains 16 URLs; without SITE_URL it remains empty.
