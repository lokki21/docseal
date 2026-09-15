# DocSeal — Handoff for the next Claude instance

**Written:** 2026-08-14 · **Repo:** `/Users/aegir/Projects/docseal` · **Remote:** `git@github-lokki21:lokki21/docseal.git` (branch `main`, clean, up to date)

This document brings you up to speed on the re-engineering we (the user + a previous Claude) just completed. Read it before touching code. The authoritative design/plan/test docs live in `docs/superpowers/` — cite those for detail; this is the map.

---

## 1. What DocSeal is (30 seconds)

Notarization for insurance policies in **Colombian public contracting**. An insurer registers a PDF's **SHA-256 fingerprint**; a contracting entity later verifies the PDF they received hashes to the same value. Fingerprints live in **Supabase** and are optionally anchored on the **Base blockchain**. **Files never leave the browser — only hashes are stored.** Bilingual ES/EN, Spanish default. Currently a **demo used to pitch insurers and state entities** — no real production data, so breaking changes were (and are) acceptable.

Stack: Vite 5 + React 18 SPA · react-router-dom · Supabase (REST + GoTrue, **no SDK**) · Netlify Functions (CommonJS, ethers v6) · jsPDF + qrcode · Vitest. Deployed on Netlify.

---

## 2. What the re-engineering did

The whole app used to be a single **1,398-line `App.jsx`**. It is now **62 lines** (routes + frame), with logic split into `lib/`, `i18n/`, `components/`, `pages/`. All the work is **merged to `main`** (merge commits `71072f4` and `6433d53`). The `reengineering` branch still exists on the remote but `main` is the source of truth now.

Five problems it fixed (from the spec §1):

1. **`verify-onchain.js` was corrupted** (a pasted terminal session duplicated the file) — rewritten from scratch, now parses and runs.
2. **Monolith** → modular codebase (see §4).
3. **No auth / open database** → Supabase email+password auth + **Row-Level Security**. Anonymous users can no longer insert documents or spend the operator wallet's gas.
4. **Dark neon "crypto" look** → **"Institutional Registry"** theme (navy `#0b1f3a` + gold `#c9a961` on white, serif headings), matching the certificate PDFs.
5. **Single screen, no URLs** → real routes; public verification links (`/verify/:id`) that open from a QR — this **is** the product demo now.

---

## 3. The two lanes (mental model for the routes)

**Issuers authenticate; the public never does.**

| Route | Page | Lane | Purpose |
|---|---|---|---|
| `/` | Home | public | What DocSeal is + primary "Verify a document" CTA |
| `/verify` | Verify | public | Drop a PDF → local hash → checked against registry → verdict |
| `/verify/:id` | VerifyDocument | public | Opened from QR/shared link (`id` = `public_id`). Shows the record; **only declares "authentic" after the visitor's own file hashes to a match, locally** |
| `/login` | Login | issuer | Supabase email+password; sign-up also creates a `profiles` row |
| `/dashboard` | Dashboard | issuer | Issuer's documents: anchor status (+retry), verification count |
| `/register` | Register | issuer | Drop PDF / photo → hash → save → anchor on Base → public link + QR + certificate |

Key invariant: **displaying a record never claims a copy is authentic.** Authenticity is asserted only after a local hash match. Verifier identity is **optional** (anonymous verification always allowed; name/role/entity only needed for a named certificate + to appear in the audit trail). Anonymous verifications are still logged (identity fields null).

---

## 4. Where everything lives

```
src/
  main.jsx              entry + <BrowserRouter>
  App.jsx               routes + shared frame (header/footer/lang switch), RequireAuth — 62 lines
  i18n/
    translations.js     ES/EN strings (T object)
    useLang.jsx         language context + localStorage persistence
  lib/
    crypto.js           hashBytes / hashFile — DEFINES what a fingerprint means; moved verbatim, never change silently
    format.js           dates, file sizes, truncateHash, makeCertId, downloadBlob
    imageToPdf.js        photo → canonical PDF (logic unchanged from original)
    certificate.js       jsPDF certificate generator; QR now targets the public /verify/:id link
    supabase.js          REST + GoTrue client, session in localStorage, RLS-aware query helper
    onchain.js           fetchers for the two Netlify functions
  components/            Dropzone, Verdict, Busy, Icons
  pages/                 Home, Login, Dashboard, Register, Verify, VerifyDocument
  styles/theme.css       design tokens (CSS variables) + shared styles — no Tailwind, no CSS-in-JS
netlify/functions/
  register-onchain.js    anchors on-chain; REQUIRES a valid Supabase JWT; writes anchor status back via service-role key
  verify-onchain.js      read-only on-chain check; public; clean rewrite
  utils/bytes32.js       shared hash → bytes32 normalizer (CommonJS)
supabase/migrations/
  0001_schema.sql        profiles / documents / verifications + RLS + gen_public_id() + verification_count()
tests/                   crypto.test.js, format.test.js, bytes32.test.js
docs/superpowers/
  specs/2026-07-30-docseal-reengineering-design.md    ← full design rationale
  plans/2026-07-30-docseal-reengineering.md           ← task-by-task build plan (line-level detail)
  e2e-checklist.md                                    ← manual test script
```

---

## 5. Data model & security (what RLS actually enforces)

Three tables (schema in `supabase/migrations/0001_schema.sql`):

- **`profiles`** — one per issuer. Publicly readable (so verification pages can show the issuer's company name); each user writes only their own row.
- **`documents`** — **immutable**. `public_id` (10-char base62 slug for `/verify/:id`), unique `hash`, `issuer_id`, `anchor_status` (`none|pending|anchored|failed`), `anchor_tx`, `anchored_at`. Public `select`; **insert only by the authenticated owner** (`auth.uid() = issuer_id`); **no client update/delete** — immutability is the notarial guarantee. Anchor fields are written **only** by the Netlify function via the service-role key (bypasses RLS).
- **`verifications`** — audit trail. Anyone can insert (anonymous allowed, identity nullable); only the owning issuer can `select` their documents' trail. Public pages get an aggregate count via the `verification_count()` RPC.

**Netlify functions:**
- `register-onchain` (costs gas) validates `Authorization: Bearer <supabase JWT>` against Supabase before doing anything → 401 if missing/invalid. Then anchors and writes status back with `SUPABASE_SERVICE_ROLE_KEY`.
- `verify-onchain` (free, read-only) stays public.

**Env vars (Netlify):** `OPERATOR_PRIVATE_KEY`, `CONTRACT_ADDRESS`, `RPC_URL`, `CHAIN_ID`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. ⚠️ **The service-role key must never appear in frontend code or git** — functions only.

The Base smart contract (`register(bytes32)` / `verify(bytes32)`) is **unchanged** by this work.

---

## 6. Current state (verified 2026-08-14)

- `git status`: **clean**, `main` up to date with origin.
- `npm test`: **8/8 pass** (3 files). Covers SHA-256 known vectors, bytes32 normalization, formatters — the logic where a silent bug is catastrophic.
- `dist/` built successfully.
- One fix landed **after** the main merge: `f063680` — sign-up now **fails loudly** when Supabase returns no session (happens when "Confirm email" is ON). Relevant because the demo assumes confirm-email is OFF; if a real Supabase project has it ON, sign-up won't auto-create a session.

---

## 7. Known caveats / gotchas

- **Supabase project id `tqgpqkoonwywvuhbktge`** is referenced in code and the migration. The anon key is embedded in `src/lib/supabase.js` **by design** (it's a public key). Confirm the live project matches before debugging auth.
- Migration is applied **manually** (Supabase Dashboard → SQL Editor), not via CLI. Re-running it **drops `documents` and `verifications`** — it starts with `drop table if exists`. Don't run it against anything with real data.
- **"Confirm email" must be OFF** in Supabase Auth for the demo sign-up flow to hand back a session immediately (see fix `f063680`).
- Tests emit noisy Vite CJS/deprecation warnings — **harmless**, tests still pass. `vite.config.js` uses ESM in a CJS-loaded file; a future cleanup is to add `"type": "module"` or rename to `.mjs`.
- No browser-automation E2E — verification is the **manual** checklist in `docs/superpowers/e2e-checklist.md`. Run it before any cutover.

---

## 8. Explicitly out of scope (future work, NOT built)

Issuer vetting (invite-only signup, domain verification — right now "verified insurer" just means "has an account"), email notifications, auto-anchoring on registration, server-side rendering for rich link previews, and a browser-automation test suite. Don't assume these exist.

---

## 9. If you're picking up work

1. `npm install` (if `node_modules` is stale), then `npm test` — expect 8/8.
2. `npm run dev` for the SPA. Netlify functions need the env vars in §5 to work locally (use `netlify dev` if testing anchoring).
3. Read `docs/superpowers/specs/…-design.md` for the *why* behind any decision, and the plan doc for line-level history of how each module was extracted.
4. Follow the git safety rules in the user's global CLAUDE.md before any `add`/`commit`/`push` (LOCATE → LOOK → ACT). Never bulk `git add .` without reading `git status` together first.
