# DocSeal Re-engineering — Design Spec

**Date:** 2026-07-30
**Status:** Approved in brainstorming; pending implementation plan
**Repo:** https://github.com/lokki21/docseal

## 1. Context

DocSeal authenticates insurance policies for Colombian public contracting: an insurer registers a PDF's SHA-256 fingerprint; a contracting entity later verifies that the PDF they received matches. Fingerprints live in Supabase and can be anchored on the Base blockchain. Files never leave the browser — only hashes are stored.

Current state: a working demo used for **pitching insurers and state entities**. No real production data exists; breaking changes are acceptable.

Current problems:

1. `netlify/functions/verify-onchain.js` is corrupted (a pasted terminal session duplicated the file content) — it cannot run.
2. The entire app is one 1,398-line `App.jsx` (translations, crypto, PDF generation, API calls, all screens, all styles).
3. No authentication: anyone can register documents under any insurer's name; the Supabase anon key permits direct inserts; the blockchain-anchor endpoint is open (anyone can spend the operator wallet's gas).
4. Dark neon "crypto" aesthetic mismatched to a conservative institutional audience.
5. Single screen, no URLs — nothing is shareable or linkable.

## 2. Goals (user priority order)

1. **UX / design polish** — institutional, official, trustworthy look.
2. **New features** — public verification links (QR-openable) and issuer accounts with history.
3. **Security & trust model** — real issuer identity, locked-down database, protected anchor endpoint.
4. **Code structure** — split the monolith into focused modules.

**Chosen approach:** incremental re-engineering on the current stack (Vite + React + Supabase + Netlify). No framework migration. Only new dependency: `react-router-dom`.

Out of scope (recorded as future work, not built now): issuer vetting (invite-only signup, domain verification), email notifications, auto-anchoring on registration, server-side rendering for rich link previews, browser-automation test suite.

## 3. Pages & user flows

Two lanes. Issuers authenticate; the public never does.

### Issuer lane (login required)

| Route | Page | Purpose |
|---|---|---|
| `/login` | Login | Supabase Auth email + password; sign-up creates a `profiles` row (company, contact name, role title). |
| `/dashboard` | Dashboard | The issuer's registered documents: file name, date, anchor status (with retry button on failure), verification count. "Register new document" action. |
| `/register` | Register | Drop PDF / take photo (photo → canonical PDF, unchanged logic) → hash → save → anchor on Base. Result shows the **public link + QR + downloadable registration certificate**. |

### Public lane (no login, ever)

| Route | Page | Purpose |
|---|---|---|
| `/` | Home | What DocSeal is (welcome-modal content moves here), primary action "Verificar un documento", secondary "Acceso para aseguradoras". |
| `/verify` | Upload & verify | Drop the received PDF → local hash → compared against the registry → verdict. |
| `/verify/:id` | Public verification page | Opened from QR or shared link (`id` = the document's `public_id`). Shows the record (file name, issuer company, registration date, hash, blockchain status) and a prominent "upload your copy to confirm it matches" action. Verdict only after local hash comparison. |

Flow decisions:

- The QR on every certificate points to `/verify/:id` — the public link **is** the product demo.
- "Authentic" is only ever declared after the visitor's own file hashes to a match, locally. Displaying the record alone never claims authenticity of any copy.
- **Optional verifier identity:** anonymous verification is always allowed. Filling in name/role/entity is required only to (a) download a named verification certificate and (b) appear named in the issuer's audit trail. Anonymous verifications are still logged (timestamp + result, identity fields null).
- The old role-selection screen and welcome modal are removed; the URL structure and Home page replace them.
- Existing ES/EN bilingual support is preserved on all pages; Spanish remains the default.

## 4. Data model & authentication

Fresh Supabase schema (no migration — demo data is re-registered by hand).

### Tables

**`profiles`** — one row per issuer account.
- `id` (uuid, = `auth.users.id`), `company_name`, `contact_name`, `role_title`, `created_at`.
- RLS: owner can insert/update own row; public can `select` `company_name` only (via a view or column grant) for display on verification pages.

**`documents`** — one row per registered document. Immutable.
- `id` (uuid), `public_id` (unique 10-char base62 slug, generated at insert, used in `/verify/:id` URLs), `hash` (unique, 64 hex chars), `file_name`, `file_size`, `issuer_id` → `profiles.id`, `registered_at`, `anchor_status` (`none` | `pending` | `anchored` | `failed`), `anchor_tx`, `anchored_at`.
- RLS: `insert` only authenticated users with `issuer_id = auth.uid()`; `select` public; **no client update or delete** (immutability is the notarial guarantee). Anchor fields are written only by the Netlify function using the service-role key.

**`verifications`** — audit trail.
- `id`, `document_id` → `documents.id` (nullable — "not found" checks store the hash only), `checked_hash`, `result` (`authentic` | `not_found`), `verifier_name` / `verifier_role` / `verifier_entity` (all nullable), `verified_at`.
- RLS: `insert` public (anonymous allowed); `select` restricted to the issuer who owns the referenced document. Public pages may show an aggregate verification count via an RPC/view.

### Auth

Supabase built-in email + password auth. No custom auth code. Session handled by the Supabase JS client; expired sessions redirect to `/login`.

Open sign-up is acceptable for the pitch phase: "verified insurer" means "has an account". Real vetting is future work (see §2).

## 5. Netlify functions

**`register-onchain`** (writes on-chain, costs gas):
- Requires `Authorization: Bearer <supabase JWT>`; the function validates the token against Supabase before doing anything. Invalid/missing token → 401.
- After a successful anchor, updates the document's `anchor_status` / `anchor_tx` / `anchored_at` via the service-role key.
- Env vars unchanged: `OPERATOR_PRIVATE_KEY`, `CONTRACT_ADDRESS`, `RPC_URL`, `CHAIN_ID`; adds `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

**`verify-onchain`** (read-only, free): stays public. **Rewritten from scratch** — the current file is corrupted and non-functional.

The deployed smart contract (`register(bytes32)` / `verify(bytes32)`) is unchanged.

## 6. Code structure

```
src/
  main.jsx                 entry + router
  App.jsx                  routes + shared frame (header, footer, lang switch)
  i18n/
    translations.js        ES/EN strings (moved, then updated for new pages)
    useLang.js             language hook (localStorage persistence)
  lib/
    supabase.js            client + auth + table helpers
    crypto.js              hashBytes / hashFile
    imageToPdf.js          photo → canonical PDF (logic unchanged)
    onchain.js             fetchers for the two Netlify functions
    certificate.js         jsPDF certificate generator (restyled to match app)
    format.js              dates, file sizes, hash truncation
  components/              Dropzone, StatusBanner, HashDisplay, Spinner, Icons, …
  pages/
    Home.jsx  Login.jsx  Dashboard.jsx  Register.jsx  Verify.jsx  VerifyDocument.jsx
  styles/
    theme.css              design tokens (CSS variables) + shared styles
netlify/functions/
  register-onchain.js      + JWT validation + anchor-status writeback
  verify-onchain.js        clean rewrite
```

- Styling: plain CSS with variables in `theme.css`; the inline JS style object is retired. No Tailwind or CSS-in-JS.
- Behavior-preserving moves: `crypto.js`, `imageToPdf.js`, and the certificate generator move without logic changes, so the meaning of a hash cannot silently change.
- Netlify redirect rule added so deep links (`/verify/:id`) serve `index.html`.

## 7. Visual design — "Institutional Registry"

- **Palette:** navy `#0b1f3a` + gold `#c9a961` on white/near-white — matching the existing certificate PDFs so app and certificates form one brand. Emerald green survives only as the "authentic ✓" verdict color; red for mismatch/not-found.
- **Type:** serif (Georgia stack) for headings; clean sans (system/Helvetica stack) for UI; monospace only for hashes and IDs.
- **Signature elements:** navy top bar with a gold hairline on every page; circular seal mark in the header.
- **Verdict-first:** on any verification screen, the verdict banner (registered / authentic / no match / not found) is the first element, details below.
- Mobile-first: the public page must look right on a phone — that's where QR scans land.

## 8. Error handling

- All failures show bilingual human-readable messages; no raw error dumps.
- Registration succeeds even if anchoring fails: `anchor_status = failed`, dashboard offers retry. (Preserves current behavior.)
- `/verify/:id` with unknown id → proper "record not found" page.
- Hash mismatch is a first-class verdict (red "does not match the registered document" + guidance), not an error state.
- Expired/missing session on issuer pages → redirect to `/login` with a notice.
- Anchor function returns 401 for bad tokens, 400 for malformed hashes, 500 with a generic message otherwise (details only in function logs).

## 9. Testing

- **Vitest unit tests** for logic where silent bugs are catastrophic: SHA-256 hashing against known test vectors; hash → bytes32 normalization (valid, 0x-prefixed, invalid input); certificate ID generation; formatters.
- **Manual E2E checklist** (kept in `docs/superpowers/`): sign up → register PDF → anchor → certificate QR opens `/verify/:id` on a phone → upload matching copy → authentic; upload altered copy → mismatch; anonymous vs named verification; audit trail visible on dashboard; ES/EN toggle on every page.
- No browser-automation suite at this stage.

## 10. Delivery notes

- Work happens on a feature branch off `main`; the Netlify demo deploy stays functional until cutover.
- Supabase changes (tables + RLS) are captured as a SQL migration file in the repo (`supabase/migrations/…`) so the schema is reproducible.
- The corrupted `verify-onchain.js` fix ships with this work (it is rewritten as part of §5).
