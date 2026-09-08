# DocSeal — Demo Mode design

**Written:** 2026-09-08 · **Repo:** `/Users/aegir/Projects/docseal` · **Status:** approved for planning

## 1. Purpose

A dedicated, issuer-only `/demo` page that lets a salesperson walk an insurance-company prospect through the full DocSeal value story in one place: **notarize a policy → get its public link + QR → verify an authentic copy (pass) → verify a tampered copy (fail)**. No file prep during the pitch — the demo policies are bundled with the app.

The feature hits the **real backend** (Supabase + Base anchoring), so the demo is honest: real hashes, real rows, a real on-chain transaction. Registration is **idempotent** — re-running the demo with the same policy shows the existing record instead of erroring or spending gas twice.

## 2. Decisions (locked during brainstorming)

- **Form:** in-app Demo Mode (not a public sandbox, not automated E2E tests).
- **Entry point:** a dedicated `/demo` page, issuer-only.
- **Backend:** real (writes to Supabase, anchors on Base), idempotent on re-runs.
- **Tamper case:** included — a tampered policy that fails verification with the red "does NOT match" verdict.
- **Implementation approach (A):** extract the register/verify orchestration into a shared `lib/registry.js` used by both the real pages and `/demo`, so the demo can never drift from the real product. (Rejected approach C: an orchestrator that drives the real Register/Verify pages via preloaded router state — rejected because the narrative hops routes mid-pitch and it couples demo concerns into the production pages.)

## 3. Demo assets (`public/demo/`)

The four source templates live in `templates polizas/` at repo root. Copy the authentic ones into `public/demo/` so Vite serves them as static files the browser can `fetch`:

- `poliza-obra-publica-andina-DEMO.pdf` — authentic (hash `f9e474…`)
- `poliza-seriedad-oferta-demostrativa-DEMO.pdf` — authentic (hash `ef5df0…`)
- `poliza-suministro-fianzas-DEMO.pdf` — authentic (hash `6757dd…`)
- `poliza-seriedad-oferta-TAMPERED-DEMO.pdf` — generated (see §7)

`poliza-seriedad-oferta-demostrativa-DEMO_1.pdf` is **byte-identical** to `...DEMO.pdf` (same hash `ef5df0…`), so it is **not** shipped as a separate asset. The "authentic copy matches" case is demonstrated by re-verifying the same file.

## 4. Shared logic (`lib/registry.js`)

Extract the orchestration currently inline in `pages/Register.jsx` and `pages/Verify.jsx` into small, testable functions that wrap `supabaseQuery`:

- `findByHash(hash)` → the existing document record, or `null`.
- `registerDocument(bytes, fileName, size)` → `{ record, already }`. Hashes the bytes, checks `findByHash`; if found returns `{ record, already: true }`; otherwise inserts (authenticated) and returns `{ record, already: false }`. This is exactly the idempotent logic today in `Register.jsx:26–36`.
- `verifyHash(hash)` → `{ match: boolean, publicId: string|null }`. On no-match, logs a `not_found` verification row (best-effort, as `Verify.jsx:29–31` does today).

`Register.jsx` and `Verify.jsx` are refactored to call these. Observable behavior is unchanged; the extraction exists so `/demo` shares one code path with production.

## 5. The `/demo` page (`pages/Demo.jsx`)

Issuer-only (rendered behind the existing `RequireAuth`). A single guided page with four steps and bilingual (ES default / EN) narration. Reuses existing components (`Verdict`, `Busy`) and libs (`certificate.js` + `qrcode`, `onchain.js`).

1. **Pick a policy** — cards for the three authentic policies (title, policy type, short description from `lib/demoData.js`).
2. **Notarize** — fetch the chosen PDF from `/demo/…` → `File` → `registerDocument`. Show the hash, the public `/verify/:id` link, a QR to it, and an **Anchor on Base** button (reusing `anchorOnChain`). Idempotent: a second run shows the already-registered record.
3. **Verify authentic copy** — re-fetch the same authentic PDF → `verifyHash` → green pass verdict → link to `/verify/:id`.
4. **Verify tampered copy** — fetch `…TAMPERED-DEMO.pdf` → `verifyHash` → **red "does NOT match"** verdict, showing the tampered file's hash next to the registered hash. This "fail" is the intended, styled outcome of the demo — not an error state.

Supporting data:
- `lib/demoData.js` — array describing each demo policy: `{ id, file, titleEs, titleEn, descEs, descEn, policyType, kind: 'authentic' | 'tampered' }`.
- A helper `fetchDemoFile(path)` that fetches a `/demo/*.pdf` and returns a `File` (so it flows through the same code as a user-dropped file).

## 6. Wiring

- Add the `/demo` route in `App.jsx`, behind `RequireAuth`.
- Add a **Demo** link in the issuer `Dashboard` (and in the header when a session is present) so a salesperson can reach it quickly.
- Add the new UI strings to `i18n/translations.js` (ES + EN).

## 7. Tampered asset generation (build-time, not runtime)

A one-off Node script `scripts/make-tampered-demo.mjs` using **pdf-lib** (added as a **devDependency only** — never imported by the app). It loads the authentic `poliza-seriedad-oferta-demostrativa-DEMO.pdf`, applies a **visible alteration** (change the insured amount if the value's location can be determined from the PDF's text; otherwise overlay a clear red stamp indicating a modified value), and writes `poliza-seriedad-oferta-TAMPERED-DEMO.pdf` to `public/demo/`.

The script is run once and its output PDF is committed to the repo. No runtime dependency is added. The script is kept in `scripts/` so the asset is reproducible and documented.

## 8. Data flow & invariants

- **Files never leave the browser** — preserved. Demo PDFs are fetched from our own origin into the browser, hashed locally with the existing `crypto.js`, and only the hash is sent to Supabase. Identical to the production register/verify path.
- **Real backend** — notarizing the three demo policies writes three real `documents` rows and anchors them on Base (real gas, once each; idempotent thereafter).
- ⚠️ **Operational note:** the demo policies appear in the logged-in issuer's Dashboard as real documents. Run the demo under a **dedicated demo issuer account**, not a production/main account.

## 9. Error handling

- Not logged in → existing `RequireAuth` redirect to `/login`.
- Supabase / network / anchor failures → reuse the existing error-box and anchor-retry patterns from `Register.jsx`.
- Demo asset `fetch` failure → clear error message on the demo page.
- The tamper step's failing verdict is an **expected success** of the demo and is styled as the persuasive climax, not an error.

## 10. Testing

- Unit tests for `lib/registry.js` with `supabaseQuery` mocked:
  - `registerDocument` returns `{ already: true }` when the hash already exists and does not insert.
  - `registerDocument` inserts and returns `{ already: false }` when new.
  - `verifyHash` returns a match (with `publicId`) when found, and `{ match: false }` (logging `not_found`) when absent.
- A test asserting the authentic seriedad-oferta asset and the tampered asset **hash differently** — guards that the tamper asset is genuinely altered.
- The existing 8 tests remain green after the refactor.
- Add the `/demo` four-step walkthrough to `docs/superpowers/e2e-checklist.md`.

## 11. Out of scope (YAGNI)

- No demo-specific backend, tables, or seed scripts (the backend is real).
- No auto-login or demo credentials baked into the app.
- No new shared components beyond `Demo.jsx` and the small `lib/` additions.
- No changes to the smart contract, RLS, or the certificate format.
