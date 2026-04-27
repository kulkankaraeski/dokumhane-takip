# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Dökümhane Proses Analiz ve Takip" — a Turkish-language PWA dashboard for tracking foundry production, scrap (fire), and machine downtime. Single-file static web app, no build step, no tests, no package manager.

User-facing strings, sheet column headers, and variable names are Turkish. Preserve Turkish spelling (including diacritics like `Çalışan`, `Vardiya`, `Makine`, `Üretim`, `Fire`, `Duruş`, `Fason`) when reading/writing sheet data — column-name matching depends on it.

## Architecture

Everything lives in [index.html](index.html). HTML, Tailwind config (via CDN), CSS, and JS are inline. The script is divided by banner comments into 5 sections: settings, fetch+process, dashboard render, form/modal, offline sync.

**Data backend is a Google Sheet** (`SHEET_ID` constant in [index.html:164](index.html#L164)) with three tabs accessed by index:
- Tab 1 `Sabitler` — dropdown options (employees, shifts, machines, fasonlar, colors, defect reasons, fault types)
- Tab 2 `Detaylar` — line items, joined to master via `Bağlı Form ID` → `Form ID`
- Tab 3 `Ana Form` — header rows (date, shift, machine, employee per submission)

**Reads use a two-tier fallback** in `fetchSheetData` ([index.html:175](index.html#L175)): first `opensheet.elk.sh/{id}/{index}` (simple JSON), then Google Visualization `gviz/tq` as backup when opensheet quota is exhausted. The gviz branch hand-parses the JSONP-ish response by slicing between the first `{` and last `}` and normalizes `Date(...)` cells. If you change schema, both code paths must keep working.

**Writes go to a Google Apps Script Web App** (`WEB_APP_URL` in [index.html:163](index.html#L163)) via `POST` with `Content-Type: text/plain;charset=utf-8` (intentional — avoids CORS preflight against Apps Script). The Apps Script source is **not in this repo**; it's maintained separately in the linked Google project. Payload shape:
```js
{ formData: { formId, tarih, vardiya, makine, calisan }, fasonlar: [{ detayId, formId, fasonKodu, renk, uretim, fire, fireNedeni, arizaTuru, durus }, ...] }
```
`formId` / `detayId` are client-generated random IDs (`FRM-XXXXXX` / `D-XXXXXX`). The Apps Script appends rows to Tabs 2 and 3.

**Offline queue** ([index.html:432](index.html#L432)) — failed POSTs (or any POST while `!navigator.onLine`) are stored in `localStorage` under `dokumhane_offline_queue` and replayed by `syncOfflineData()` on the `window 'online'` event and at page load.

**Daily 2-record limit per employee** ([index.html:378](index.html#L378)) — counted across both already-synced rows in `joinedData` and the offline queue. Compared on `YYYY-MM-DD` strings via `formatYMD`.

**Constants normalization** — `processConstants` ([index.html:227](index.html#L227)) accepts multiple Turkish header spellings per column (e.g. `Çalışanlar` / `Çalışan` / `Çalışan Adı`). When adding a new constant column, add all reasonable header variants there, because users edit the sheet by hand.

## Develop / deploy

No build, no install. To preview locally, open `index.html` in a browser, or serve it over HTTP (some browsers restrict `manifest.json` / service-worker behavior on `file://`):
```bash
python -m http.server 8000
```

Deployment is automatic: pushing to `main` triggers [.github/workflows/static.yml](.github/workflows/static.yml), which uploads the entire repo as a GitHub Pages artifact. There is no staging environment — `main` is production.

## When editing

- Keep everything in the single `index.html` unless the user explicitly asks to split files; the deploy workflow uploads the repo root verbatim and external assets must be paths reachable from there.
- The Tailwind CDN script (`cdn.tailwindcss.com`) is what supplies utility classes — there is no `tailwind.config.js` on disk; the config is the inline `<script>` near the top of `index.html`.
- Column headers in `processConstants` and the field reads in `processJoinedData` are the contract with the spreadsheet. Changing them silently breaks live data — confirm with the user before renaming.
- `WEB_APP_URL` and `SHEET_ID` are committed in source (this is a public-data internal tool); do not treat them as secrets to scrub, but also do not invent new ones.
