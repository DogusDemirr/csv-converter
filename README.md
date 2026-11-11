# CSV Converter

Browser-only developer tools platform: Next.js App Router, TypeScript strict, Tailwind, Papa Parse and excel-builder-vanilla. Twelve tools are active; XLSX import is disabled.

## Current release preparation

Phase 6A replaces ExcelJS with an export-only writer. EN/TR Privacy, Terms and Contact pages are unfinished legal drafts. Production remains blocked by domain, publisher/contact and legal/hosting readiness. See PHASE6A_REPORT.md and DEPLOYMENT.md. The phase sections below are historical snapshots, not current counts or security status.

Static preview: `npm run build:static`. Future production static build: `npm run build:static:production` with a real SITE_URL. Never publish the synthetic SEO test domain.

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

## Phase 3.1 — Security status (historical)

XLSX imports (Excel to CSV and Excel to JSON) are temporarily disabled because the current ExcelJS/JSZip load path cannot enforce a reliable decompression resource budget. Existing URLs show a noindex safety notice with no file control; worker and engine calls reject imports before reading file bytes. They are excluded from the active catalog and sitemap. Seven tools remain active, including CSV to Excel export.

Current checks: 90 unit tests and 32 desktop/mobile Chromium E2E tests passed. The lower unit count replaces discontinued import-success cases with fail-closed security cases. Two moderate audit entries remain for the same ExcelJS -> uuid advisory; no force fix or unassessed major upgrade was applied. See PHASE3_1_SECURITY_REPORT.md for the NO-GO production decision, dependency analysis and reopening requirements. The configured sitemap now contains 16 URLs; without SITE_URL it remains empty.

## Phase 5.1 — JSON Diff and C# models

New active routes: /en/tools/json-diff, /tr/tools/json-diff, /en/tools/json-to-csharp and /tr/tools/json-to-csharp. Nine tools are active; both XLSX import tools remain disabled. Configured production sitemap: 20 active URLs. No new npm dependency was added.

JSON Diff ignores object key order and compares arrays by index. C# generation supports nested models/lists, int/long/double, nullable references, optional JsonPropertyName attributes and safe custom names. Models are inferred from samples; fractional numbers use double, not exact decimal semantics.

New tools run in a dedicated worker with a 1 MiB input/output budget and a 5-second lifecycle timeout. See PHASE5_1_REPORT.md for limits, 135 unit tests, 46 Chromium E2E tests and eight compiled C# fixtures. To repeat the Windows .NET compilation check, run npm run test:csharp with an installed SDK/reference pack. Artifacts go to ignored artifacts/csharp/.

## Phase 5.2 — TypeScript and SQL

New EN/TR slugs: json-to-typescript and sql-formatter. Eleven tools are active; configured production sitemap has 24 URLs. TypeScript generation supports interfaces/type aliases, nested models, unions, optional properties and null strategies. Output uses text-node syntax highlighting with a plain-text alternative.

SQL Formatter uses exact-pinned MIT sql-formatter 15.9.0, lazy loaded in a browser worker. T-SQL and general SQL have protected-token checks; no query is executed. Procedures, GO batches and minify are explicitly unavailable. Current results and limitations: PHASE5_2_REPORT.md (173 unit tests, 58 Chromium E2E tests). Existing XLSX imports stay disabled and the previous two dependency audit warnings remain.

## Phase 5.3 — Regex Tester

New routes: /en/tools/regex-tester and /tr/tools/regex-tester. Native JavaScript regex compilation and matching run only in disposable workers, with flag support probes, a 1.5-second job deadline, pattern/text/capture/report caps and explicit zero-length progress handling. Highlighting, named/positional captures, indices, copy, clear/reset and EN/TR are available.

Limits reduce exposure but do not eliminate ReDoS or create a hard CPU/memory sandbox. The 1,000-match limit produces an explicitly partial report. See PHASE5_3_REPORT.md for 194 passing unit tests, 70 Chromium E2E tests and the small controlled ReDoS experiment. Twelve tools are active; the configured sitemap contains 26 active URLs. XLSX imports remain disabled. No new dependency was added.
