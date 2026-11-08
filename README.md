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

Production: npm run build, then npm run start. Configure NEXT_PUBLIC_SITE_URL with the real production origin before building; see .env.example.

Files stay in a browser worker. No upload endpoints, analytics, database or authentication. All XLSX values are text to preserve leading zeros and prevent formula injection. Limits: 5 MiB, 20,000 total rows, 200,000 cells, 1,000 columns and 32,767 characters/cell. Empty rows are skipped; the first row is styled as a header. CR line endings may normalize to LF.

See PHASE1_REPORT.md for implementation details and verification limits.
