# DocSeal — On-chain verdict & trustless verification (Target A)

**Date:** 2026-09-18 · **Branch:** `feat/trustless-verdict` · **Status:** design, pending user review

## 1. Purpose

Make the authenticity verdict **honour the product's non-negotiable principle** (Briefing §2): the
**blockchain is the proof and is never gated**; **Supabase is only an index** (names, links, audit) and
is *trusted but disposable*. Today the verdict is decided by the Supabase index and a local hash
compare; the on-chain `verify(hash)` result is decorative. This spec makes **on-chain `verify(hash)` the
sole authority for an "authentic" verdict**, and makes verification **survive the database going
offline**.

This is "Target A": the demo-grade, bounded implementation of the principle. The real-product
architecture (Powerhouse + ONAC/ECD-accredited identity) is a **separate track** and out of scope here.

Codifies `docs/CONSTRAINTS.md` rule (b). Rule (a) (bare-hash-only on-chain) is already respected and
unchanged.

## 2. Core principle

**AUTHENTIC ⟺ on-chain `verify(hash).exists === true`. Full stop.**

- The verdict path depends only on **the local file hash + the chain**. It never reads Supabase.
- Supabase is *enrichment only*: issuer name, public link, audit log, and disambiguating *why* a
  document is not authentic. Its absence degrades gracefully — it can never block or downgrade a green
  verdict, and can never *produce* one.
- `checkOnChain` (the `verify-onchain` Netlify function) is itself DB-independent (RPC + contract only).

## 3. Verdict model

Three colours, never more. Green = proven authentic. Red = genuine failure/forgery. Amber = "not green,
not a forgery" (a network hiccup or a not-yet-anchored doc must never read as a forgery to an official).

| Verdict | Condition | Colour | Certificate |
|---|---|---|---|
| `AUTHENTIC` | on-chain `verify(hash).exists === true` | green | ✅ |
| `ALTERED` | QR/enriched page: uploaded copy's hash ≠ the referenced document's hash | red | ❌ |
| `NOT_FOUND` | chain says not anchored, and the index doesn't know the hash either | red | ❌ |
| `NOT_ANCHORED` | chain says not anchored, but the index knows the hash (pending/failed anchor) — *transient* | amber | ❌ |
| `UNVERIFIABLE` | the on-chain check errored/timed out, OR the index is offline so we can't disambiguate | amber + retry | ❌ |
| `CHAIN_CONFIG_ERROR` | wrong chain id, or contract address has no code / mismatch — *our bug* | loud, distinct copy | ❌ |

### 3.1 `decideVerdict` (pure)

Input facts: `{ chain, index, uploadedHash, hashMatches, anchorStatus }` where
`chain = { ok, exists, timestamp, registrar, error, kind }` (`kind` ∈ `'config' | 'network'`) and
`index = { available, found }`.

```
if (uploadedHash && !hashMatches)   → ALTERED              // local & definitive: copy ≠ referenced doc; chain-independent
if (chain.kind === 'config')        → CHAIN_CONFIG_ERROR   // loud, our bug
if (!chain.ok)                      → UNVERIFIABLE          // authority unreachable → retry (fail closed)
if (chain.exists)                   → AUTHENTIC            // proven on-chain — DB irrelevant here
// chain says NOT anchored:
if (!index.available)               → UNVERIFIABLE          // DB down, can't disambiguate → neutral, not red
if (index.found)                    → NOT_ANCHORED          // transient / failed anchor
else                                → NOT_FOUND             // neither knows it
```

`ALTERED` is checked first because it's a purely local comparison (`uploadedHash === referencedHash`) and
is a definitive answer to "is my copy the genuine document?" — it must not be masked by a chain outage.
`chain` always pertains to the **referenced** hash (from the URL/DB on the enriched page, or the uploaded
file's own hash on the blind-upload page). `index.available` is derived by wrapping `findByHash` in
try/catch: a thrown/failed lookup ⇒ `available:false`; success ⇒ `available:true, found:!!row`.

Key behaviours locked in:

| Scenario | Verdict |
|---|---|
| on-chain `exists`, **DB offline** | 🟢 AUTHENTIC — "authentic; registry details unavailable" (no name/link) |
| on-chain `exists`, DB up | 🟢 AUTHENTIC + issuer name, link, audit logged |
| on-chain error (network) | 🟡 UNVERIFIABLE, retry — never green on an unreachable authority |
| not on-chain, DB knows it | 🟡 NOT_ANCHORED |
| not on-chain, DB offline | 🟡 UNVERIFIABLE — can't tell forgery from unanchored → neutral |
| QR page: copy ≠ referenced hash | 🔴 ALTERED |
| not on-chain, DB says unknown | 🔴 NOT_FOUND |

`decideVerdict` is a **pure function** — the single source of truth for authenticity, consumed by both
verify pages **and** the certificate.

## 4. Components & changes

1. **`src/lib/verdict.js` (new)** — `VERDICT` enum + pure `decideVerdict(facts)`. Fully unit-tested;
   this is where the risk lives.
2. **`src/lib/registry.js`** — new async `resolveVerdict(hash, { uploadedHash } = {})`:
   calls `checkOnChain(hash)` **first** (the authority), then best-effort `findByHash(hash)` for
   enrichment (wrapped so a DB failure yields `index.available = false`, never throws), then returns
   `{ verdict, chain, doc }`. `verifyHash` is retired in favour of this.
3. **`src/pages/Verify.jsx`** — the **DB-independent path**. Hash the file locally → `resolveVerdict`.
   Render the verdict in place; on AUTHENTIC, link to the enriched page if the index is available.
   No longer Supabase-gated.
4. **`src/pages/VerifyDocument.jsx`** — resolve the document by `publicId` **or** by hash from the URL
   (see §5). Verdict comes from `resolveVerdict` (chain-first), not a local compare alone. Adds the amber
   states and a **retry button** for `UNVERIFIABLE`. Certificate button only when `AUTHENTIC`. Degrades to
   "registry temporarily unavailable — verify your copy directly" when the DB is down.
5. **QR / verification link (§5)** — the link carries the **hash** so a scan is DB-independent.
6. **`src/lib/certificate.js`** — `autentico` is derived from `verdict === AUTHENTIC` (passed in from the
   caller), never hard-coded `true`. Same source of truth as the UI.
7. **`src/components/Verdict.jsx` + `src/styles/theme.css`** — add a `warn` (amber) kind and a `--warn`
   colour var, visually distinct from both `ok` (green) and `bad` (red).
8. **Mandatory anchoring (§6)** — registration auto-anchors; the opt-in "Anclar" button is removed as a
   gate but the anchoring step stays **visible** in the flow.
9. **`netlify/functions/verify-onchain.js`** — distinguish config errors from network errors (§7).
10. **`supabase/migrations/0002_verdict_audit.sql`** — extend the audit trail (§8).
11. **i18n** — new ES/EN keys for the amber / unverifiable / config-error / retry / "authentic but
    registry unavailable" copy.
12. **Tests** — unit tests for every `decideVerdict` transition (incl. DB-offline and chain-error), and
    update existing tests.

## 5. QR / link encodes the hash

New verification links carry the hash so a scan verifies without the DB:
`/verify/:publicId?h=<64-hex>` (keeps `publicId` for enrichment + backward compatibility). On the page,
the **hash from the URL is the authority** for `checkOnChain`; `publicId` is used only to fetch
enrichment. Old `publicId`-only links still resolve enrichment via the DB (and, once the doc is fetched,
its hash is checked on-chain as usual). `Register.jsx` and `Demo.jsx` build the hash-bearing URL and its
QR. Rationale: per Constraint (a) a bare hash leaks nothing and is already public on-chain, so putting it
in the URL costs no privacy.

## 6. Mandatory anchoring (reverses Briefing §5)

Anchoring becomes required, not optional — an unanchored document can never be `AUTHENTIC`, so it cannot
stay a permanent tier. `Register.jsx`: insert the document with `anchor_status = 'pending'`, then
auto-invoke anchoring; drop the manual opt-in gate. The anchoring step remains **visible** (a
`pending → anchored` transition the pitch can show live) — this preserves the demo value §5 wanted
without making anchoring optional. `Demo.jsx` follows the same flow. The Dashboard's existing
`failed → retry` control is the retry path for a failed anchor. Existing unanchored documents are **not**
grandfathered; they simply show `NOT_ANCHORED` until **T3** (purge/anchor) handles them.

## 7. Config vs network error in `verify-onchain`

Before calling `verify()`, the function checks `provider.getNetwork().chainId === CHAIN_ID` and
`provider.getCode(CONTRACT_ADDRESS) !== '0x'`. On mismatch it returns a distinct
`{ kind: 'config', error }`; genuine RPC/timeout failures return `{ kind: 'network', error }`. The client
maps `config → CHAIN_CONFIG_ERROR` (loud: "our configuration is wrong", not the network's fault) and
`network → UNVERIFIABLE` (retry). This ensures a misconfiguration is surfaced as our bug, never as a
verdict about the user's document.

## 8. Audit-trail migration (`0002`)

Migration file `supabase/migrations/0002_verdict_audit.sql`. Extend `verifications` so an auditor can see
the verdict was chain-backed:
- allow `result`/`outcome` value `'unverifiable'` (and `'altered'`); adjust the CHECK constraint;
- add `decided_by text` (e.g. `'onchain'`), `chain_exists boolean`, `anchor_tx text`,
  `chain_timestamp bigint`, `error_class text`.
- add `documents.anchor_block bigint` (populated by `register-onchain`, which already has
  `receipt.blockNumber`) so the audit row can carry the block.

Logging is best-effort (already `.catch`) — when the DB is offline the verdict still shows; only the
audit row is skipped.

## 9. Out of scope

- **T3** — purging/anchoring existing unanchored documents.
- **Base mainnet cutover** (env + deploy).
- **Real product** — Powerhouse (Renown DIDs, signed Document Models, self-hosted reactors) + ONAC/ECD
  accredited qualified-signature/timestamp layer. Separate track; the combine-trust-model decision is
  recorded but not built here.

## 10. Risks

- **Extra latency on the verify path**: `Verify.jsx` now always calls the chain (a Netlify function +
  RPC round-trip) instead of a fast Supabase read. Acceptable — it's the authority — but the UI must show
  a clear "checking on-chain…" state.
- **Mandatory anchoring costs gas** on mainnet per registration (negligible on Sepolia today). This is a
  deliberate acceptance; batching (Briefing §7) is the volume mitigation, out of scope here.
- **A document anchored per the DB but `exists === false` on-chain** (data inconsistency) resolves to
  `UNVERIFIABLE`, never green — fail closed.
```
