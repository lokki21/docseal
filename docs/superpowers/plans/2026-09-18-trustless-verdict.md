# Trustless Verdict Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make on-chain `verify(hash)` the sole authority for an "authentic" verdict, with Supabase demoted to optional enrichment that degrades gracefully.

**Architecture:** A pure `decideVerdict` function is the single source of truth, consumed by both verify pages and the certificate. `resolveVerdict` gathers facts (chain first, DB best-effort). The QR link carries the hash so scans are DB-independent. Anchoring becomes mandatory-but-visible. The audit trail records that the verdict was chain-backed.

**Tech Stack:** React 18 + Vite, Vitest, Netlify Functions (Node + ethers v6), Supabase (PostgreSQL, raw REST), Base Sepolia.

**Spec:** `docs/superpowers/specs/2026-09-18-onchain-verdict-trustless-verification-design.md`

**Working branch:** `feat/trustless-verdict` (already created).

---

## File Structure

- `src/lib/verdict.js` (new) — `VERDICT` enum + pure `decideVerdict`. One responsibility: decide the verdict from facts.
- `tests/verdict.test.js` (new) — exhaustive unit tests for `decideVerdict`.
- `src/lib/onchain.js` (modify) — `checkOnChain` returns a normalized `{ ok, exists, kind, ... }` instead of throwing.
- `tests/onchain.test.js` (new) — tests `checkOnChain` normalization with `fetch` mocked.
- `netlify/functions/verify-onchain.js` (modify) — distinguish `config` vs `network` failures.
- `tests/verify-onchain.test.js` (new) — tests the handler with `ethers` mocked.
- `src/lib/registry.js` (modify) — add `resolveVerdict`; retire `verifyHash`.
- `tests/registry.test.js` (modify) — replace `verifyHash` tests with `resolveVerdict` tests.
- `src/i18n/translations.js` (modify) — new ES/EN keys.
- `src/components/Verdict.jsx` (no code change) + `src/styles/theme.css` (modify) — add `warn` (amber) kind.
- `src/lib/certificate.js` (modify) — `autentico` comes from the caller, never hard-coded.
- `src/pages/Verify.jsx` (modify) — DB-independent path via `resolveVerdict`.
- `src/pages/VerifyDocument.jsx` (modify) — hash-from-URL, `resolveVerdict`, amber states, retry, cert gating, degrade.
- `src/pages/Register.jsx` (modify) — hash-bearing link/QR + mandatory-but-visible anchoring.
- `src/pages/Demo.jsx` (modify) — same link + anchoring flow.
- `netlify/functions/register-onchain.js` (modify) — persist `anchor_block`.
- `supabase/migrations/0002_verdict_audit.sql` (new) — audit-trail + `anchor_block` columns.

---

## Task 1: Pure `decideVerdict`

**Files:**
- Create: `src/lib/verdict.js`
- Test: `tests/verdict.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/verdict.test.js
import { it, expect } from "vitest";
import { VERDICT, decideVerdict } from "../src/lib/verdict.js";

const chainOk = (exists) => ({ ok: true, exists });
const idx = (available, found) => ({ available, found });

it("ALTERED when an uploaded copy does not match, regardless of chain", () => {
  expect(decideVerdict({ chain: { ok: false, kind: "network" }, index: idx(true, true), uploadedHash: "aa", hashMatches: false })).toBe(VERDICT.ALTERED);
});

it("CHAIN_CONFIG_ERROR when chain kind is config", () => {
  expect(decideVerdict({ chain: { ok: false, kind: "config" }, index: idx(true, true) })).toBe(VERDICT.CHAIN_CONFIG_ERROR);
});

it("UNVERIFIABLE when the chain is unreachable (network)", () => {
  expect(decideVerdict({ chain: { ok: false, kind: "network" }, index: idx(true, true) })).toBe(VERDICT.UNVERIFIABLE);
});

it("AUTHENTIC when the chain says exists, even with the DB offline", () => {
  expect(decideVerdict({ chain: chainOk(true), index: idx(false, false) })).toBe(VERDICT.AUTHENTIC);
});

it("NOT_ANCHORED when chain says no but the index knows the hash", () => {
  expect(decideVerdict({ chain: chainOk(false), index: idx(true, true) })).toBe(VERDICT.NOT_ANCHORED);
});

it("NOT_FOUND when neither chain nor index knows the hash", () => {
  expect(decideVerdict({ chain: chainOk(false), index: idx(true, false) })).toBe(VERDICT.NOT_FOUND);
});

it("UNVERIFIABLE when chain says no and the index is offline", () => {
  expect(decideVerdict({ chain: chainOk(false), index: idx(false, false) })).toBe(VERDICT.UNVERIFIABLE);
});

it("a matching uploaded copy does not force ALTERED", () => {
  expect(decideVerdict({ chain: chainOk(true), index: idx(true, true), uploadedHash: "aa", hashMatches: true })).toBe(VERDICT.AUTHENTIC);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/verdict.test.js`
Expected: FAIL — cannot import `VERDICT`/`decideVerdict` (module not found).

- [ ] **Step 3: Write minimal implementation**

```javascript
// src/lib/verdict.js
// Single source of truth for the authenticity verdict. Pure: no I/O.
// AUTHENTIC requires the on-chain check to pass; Supabase is enrichment only.
export const VERDICT = {
  AUTHENTIC: "AUTHENTIC",
  ALTERED: "ALTERED",
  NOT_FOUND: "NOT_FOUND",
  NOT_ANCHORED: "NOT_ANCHORED",
  UNVERIFIABLE: "UNVERIFIABLE",
  CHAIN_CONFIG_ERROR: "CHAIN_CONFIG_ERROR",
};

// facts:
//   chain: { ok: boolean, exists?: boolean, kind?: 'config'|'network' }
//   index: { available: boolean, found: boolean }
//   uploadedHash?: string   // present only when a copy was uploaded to compare
//   hashMatches?: boolean   // uploadedHash === referenced hash
export function decideVerdict({ chain, index, uploadedHash, hashMatches } = {}) {
  if (uploadedHash && !hashMatches) return VERDICT.ALTERED;
  if (chain?.kind === "config") return VERDICT.CHAIN_CONFIG_ERROR;
  if (!chain?.ok) return VERDICT.UNVERIFIABLE;
  if (chain.exists) return VERDICT.AUTHENTIC;
  if (!index?.available) return VERDICT.UNVERIFIABLE;
  if (index.found) return VERDICT.NOT_ANCHORED;
  return VERDICT.NOT_FOUND;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/verdict.test.js`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/verdict.js tests/verdict.test.js
git commit -m "feat: pure decideVerdict — on-chain is the authority"
```

---

## Task 2: Normalize `checkOnChain` (client)

Today `checkOnChain` throws on `!res.ok`. The verdict needs a normalized object it can reason about without try/catch at every call site.

**Files:**
- Modify: `src/lib/onchain.js:25-37` (the `checkOnChain` function)
- Test: `tests/onchain.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/onchain.test.js
import { it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkOnChain } from "../src/lib/onchain.js";

beforeEach(() => { global.fetch = vi.fn(); });
afterEach(() => { vi.restoreAllMocks(); });

it("returns ok:true with exists on success", async () => {
  global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ exists: true, timestamp: 1, contractUrl: "u" }) });
  const r = await checkOnChain("aa");
  expect(r).toMatchObject({ ok: true, exists: true, contractUrl: "u" });
});

it("passes through a config kind from the server", async () => {
  global.fetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ kind: "config", error: "wrong chain" }) });
  const r = await checkOnChain("aa");
  expect(r).toEqual({ ok: false, kind: "config", error: "wrong chain" });
});

it("maps a thrown fetch to a network failure", async () => {
  global.fetch.mockRejectedValueOnce(new Error("boom"));
  const r = await checkOnChain("aa");
  expect(r).toMatchObject({ ok: false, kind: "network" });
});

it("defaults an unlabeled non-ok response to network", async () => {
  global.fetch.mockResolvedValueOnce({ ok: false, status: 502, json: async () => ({}) });
  const r = await checkOnChain("aa");
  expect(r).toMatchObject({ ok: false, kind: "network" });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/onchain.test.js`
Expected: FAIL — current `checkOnChain` throws instead of returning `{ ok:false, ... }`.

- [ ] **Step 3: Replace `checkOnChain`**

Replace the existing `checkOnChain` (currently `src/lib/onchain.js:25-37`) with:

```javascript
// Read-only, public, DB-independent. Never throws — returns a normalized result
// so the verdict layer can reason about it. kind is 'config' (our misconfig) or
// 'network' (unreachable/timeout).
export async function checkOnChain(hash) {
  try {
    const res = await fetch("/.netlify/functions/verify-onchain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hash }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, kind: data.kind === "config" ? "config" : "network", error: data.error || `Error ${res.status}` };
    return { ok: true, ...data };
  } catch (e) {
    return { ok: false, kind: "network", error: e.message };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/onchain.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/onchain.js tests/onchain.test.js
git commit -m "feat: checkOnChain returns a normalized {ok,exists,kind} result"
```

---

## Task 3: `verify-onchain` distinguishes config vs network

**Files:**
- Modify: `netlify/functions/verify-onchain.js`
- Test: `tests/verify-onchain.test.js`

- [ ] **Step 1: Write the failing test** (mock `ethers`)

```javascript
// tests/verify-onchain.test.js
import { it, expect, vi, beforeEach } from "vitest";

const getNetwork = vi.fn();
const getCode = vi.fn();
const verify = vi.fn();

vi.mock("ethers", () => ({
  ethers: {
    JsonRpcProvider: class { getNetwork() { return getNetwork(); } getCode(a) { return getCode(a); } },
    Contract: class { constructor() { this.verify = verify; } },
  },
}));

const { handler } = await import("../netlify/functions/verify-onchain.js");
const ev = (hash) => ({ httpMethod: "POST", body: JSON.stringify({ hash }) });

beforeEach(() => {
  getNetwork.mockReset(); getCode.mockReset(); verify.mockReset();
  process.env.RPC_URL = "http://rpc"; process.env.CONTRACT_ADDRESS = "0xabc"; process.env.CHAIN_ID = "84532";
});

it("returns kind:config when the chain id does not match", async () => {
  getNetwork.mockResolvedValue({ chainId: 1n });
  getCode.mockResolvedValue("0xcode");
  const res = await handler(ev("a".repeat(64)));
  expect(res.statusCode).toBe(500);
  expect(JSON.parse(res.body).kind).toBe("config");
});

it("returns kind:config when the contract has no code", async () => {
  getNetwork.mockResolvedValue({ chainId: 84532n });
  getCode.mockResolvedValue("0x");
  const res = await handler(ev("a".repeat(64)));
  expect(JSON.parse(res.body).kind).toBe("config");
});

it("returns exists on a healthy call", async () => {
  getNetwork.mockResolvedValue({ chainId: 84532n });
  getCode.mockResolvedValue("0xcode");
  verify.mockResolvedValue([true, 123n, "0xregistrar"]);
  const res = await handler(ev("a".repeat(64)));
  expect(res.statusCode).toBe(200);
  const b = JSON.parse(res.body);
  expect(b.exists).toBe(true);
  expect(b.timestamp).toBe(123);
});

it("returns kind:network when the RPC throws", async () => {
  getNetwork.mockRejectedValue(new Error("timeout"));
  const res = await handler(ev("a".repeat(64)));
  expect(JSON.parse(res.body).kind).toBe("network");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/verify-onchain.test.js`
Expected: FAIL — no chain-id/code checks, no `kind` in the error body.

- [ ] **Step 3: Add the pre-checks and error classification**

In `netlify/functions/verify-onchain.js`, inside the `try`, after building `provider` and before `contract.verify(...)`, insert the config guard; and change the `catch` to classify. The relevant region becomes:

```javascript
    const provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID);

    // Config guard: surface our own misconfiguration loudly, never as a verdict.
    const net = await provider.getNetwork();
    if (Number(net.chainId) !== CHAIN_ID) {
      return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ kind: "config", error: `Chain id mismatch: expected ${CHAIN_ID}, got ${Number(net.chainId)}.` }) };
    }
    const code = await provider.getCode(CONTRACT_ADDRESS);
    if (!code || code === "0x") {
      return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ kind: "config", error: "No contract code at CONTRACT_ADDRESS." }) };
    }

    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
    const [exists, ts, registrar] = await contract.verify(documentHash);
```

And replace the final `catch` block with:

```javascript
  } catch (err) {
    console.error("verify-onchain error:", err);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ kind: "network", error: err.message || "Error interno." }) };
  }
```

(Keep the existing missing-env-vars guard as-is — that already returns 500 before any network call.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/verify-onchain.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add netlify/functions/verify-onchain.js tests/verify-onchain.test.js
git commit -m "feat: verify-onchain classifies config vs network failures"
```

---

## Task 4: `resolveVerdict` in registry

**Files:**
- Modify: `src/lib/registry.js` (add `resolveVerdict`; remove `verifyHash`)
- Test: `tests/registry.test.js` (replace the two `verifyHash` tests)

- [ ] **Step 1: Write the failing test**

Replace the two `verifyHash` tests (lines 36-52) in `tests/registry.test.js` with the block below, and add the mock for `onchain.js` and `verdict` import at the top of the file (after the existing `supabase` mock):

```javascript
// add near the other imports/mocks at the top:
const check = vi.fn();
vi.mock("../src/lib/onchain.js", () => ({ checkOnChain: (...a) => check(...a) }));

// add after `const { registerDocument, verifyHash } = ...` — update that import line to:
const { registerDocument, resolveVerdict } = await import("../src/lib/registry.js");
import { VERDICT } from "../src/lib/verdict.js";

// in beforeEach, also reset check:
// beforeEach(() => { q.mockReset(); check.mockReset(); });
```

```javascript
it("resolveVerdict is AUTHENTIC from the chain even when the DB throws", async () => {
  check.mockResolvedValueOnce({ ok: true, exists: true });
  q.mockRejectedValueOnce(new Error("db down")); // findByHash enrichment fails
  const r = await resolveVerdict("deadbeef");
  expect(r.verdict).toBe(VERDICT.AUTHENTIC);
  expect(r.doc).toBe(null);
});

it("resolveVerdict is NOT_ANCHORED when chain says no but the index knows it", async () => {
  check.mockResolvedValueOnce({ ok: true, exists: false });
  q.mockResolvedValueOnce([{ public_id: "p1", hash: "deadbeef" }]); // findByHash
  const r = await resolveVerdict("deadbeef");
  expect(r.verdict).toBe(VERDICT.NOT_ANCHORED);
  expect(r.doc.public_id).toBe("p1");
});

it("resolveVerdict passes uploadedHash through for ALTERED", async () => {
  check.mockResolvedValueOnce({ ok: true, exists: true });
  q.mockResolvedValueOnce([{ public_id: "p1", hash: "deadbeef" }]);
  const r = await resolveVerdict("deadbeef", { uploadedHash: "0000" });
  expect(r.verdict).toBe(VERDICT.ALTERED);
});
```

Also update the `beforeEach` line to `beforeEach(() => { q.mockReset(); check.mockReset(); });`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/registry.test.js`
Expected: FAIL — `resolveVerdict` not exported.

- [ ] **Step 3: Implement `resolveVerdict`; remove `verifyHash`**

In `src/lib/registry.js`: add the import and the function, and delete the entire existing `verifyHash` function.

```javascript
// at the top, alongside existing imports:
import { checkOnChain } from "./onchain.js";
import { decideVerdict } from "./verdict.js";
```

```javascript
// resolves the verdict for `hash`. Chain first (the authority); the DB lookup is
// best-effort enrichment. `uploadedHash` (a copy being compared) drives ALTERED.
export async function resolveVerdict(hash, { uploadedHash } = {}) {
  const chain = await checkOnChain(hash);
  let doc = null;
  let index = { available: false, found: false };
  try {
    doc = await findByHash(hash);
    index = { available: true, found: !!doc };
  } catch {
    index = { available: false, found: false };
  }
  const verdict = decideVerdict({
    chain,
    index,
    uploadedHash: uploadedHash || null,
    hashMatches: uploadedHash ? uploadedHash === hash : undefined,
  });
  return { verdict, chain, doc };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/registry.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/registry.js tests/registry.test.js
git commit -m "feat: resolveVerdict (chain-first, DB best-effort); retire verifyHash"
```

---

## Task 5: i18n keys

**Files:**
- Modify: `src/i18n/translations.js` (ES block and EN block)

- [ ] **Step 1: Add the ES keys**

In the ES object, next to the existing verify strings (e.g. after `matchFail`), add:

```javascript
    vUnverifiable: "No se pudo confirmar en la cadena",
    vUnverifiableHint: "La huella coincide con el registro, pero la confirmación en blockchain no está disponible ahora. Intente de nuevo.",
    vNotAnchored: "Registrado, aún sin anclar",
    vNotAnchoredHint: "El documento está registrado pero todavía no confirmado en blockchain. Aún no puede certificarse como auténtico.",
    vConfigError: "Error de configuración del verificador",
    vConfigErrorHint: "Es un problema de nuestra configuración, no de su documento. Ya fuimos notificados.",
    vAuthNoRegistry: "Auténtico — datos del registro no disponibles",
    vRetry: "Reintentar",
    vCheckingChain: "Confirmando en blockchain…",
    vRegistryUnavailable: "Registro no disponible temporalmente. Puede verificar su copia directamente subiéndola.",
```

- [ ] **Step 2: Add the EN keys**

In the EN object, at the matching place, add:

```javascript
    vUnverifiable: "Could not confirm on-chain",
    vUnverifiableHint: "The fingerprint matches the registry, but on-chain confirmation is unavailable right now. Try again.",
    vNotAnchored: "Registered, not yet anchored",
    vNotAnchoredHint: "The document is registered but not yet confirmed on-chain. It cannot be certified authentic yet.",
    vConfigError: "Verifier configuration error",
    vConfigErrorHint: "This is a problem with our configuration, not your document. We have been notified.",
    vAuthNoRegistry: "Authentic — registry details unavailable",
    vRetry: "Retry",
    vCheckingChain: "Confirming on-chain…",
    vRegistryUnavailable: "Registry temporarily unavailable. You can verify your copy directly by uploading it.",
```

- [ ] **Step 3: Verify parity**

Run: `grep -c "vUnverifiable:" src/i18n/translations.js`
Expected: `2` (once in the ES block, once in EN). Do the same spot-check for `vRetry:` and `vNotAnchored:` — each must be `2`.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/translations.js
git commit -m "feat: i18n keys for amber/unverifiable/config verdict states"
```

---

## Task 6: Amber `warn` verdict colour

`Verdict.jsx` already renders `banner ${kind}`, so no JSX change is needed — only the CSS for a `warn` kind.

**Files:**
- Modify: `src/styles/theme.css` (colour vars line ~4, and after the `.banner.info` rule line ~43)

- [ ] **Step 1: Add the colour vars**

On the vars line that defines `--ok`/`--bad` (currently line 4), append:

```css
  --warn: #b7791f; --warn-bg: #fdf6ec;
```

- [ ] **Step 2: Add the banner rule**

After the `.banner.info { ... }` rule (currently line 43), add:

```css
.banner.warn { border-color: var(--warn); background: var(--warn-bg); } .banner.warn .eyebrow { color: var(--warn); }
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/styles/theme.css
git commit -m "feat: amber 'warn' verdict banner colour"
```

---

## Task 7: Certificate derives `autentico` from the verdict

**Files:**
- Modify: `src/lib/certificate.js` (the `autentico` inputs are already read from `data.autentico`; the fix is at the *callers*, which must pass it from the verdict — and the certificate must never be offered unless AUTHENTIC).

The certificate already consumes `data.autentico` (lines ~55-92). The defect is that callers hard-code `true`. This task makes the certificate refuse to claim authenticity without an explicit truthy `autentico`, so a caller omission fails safe.

- [ ] **Step 1: Make the certificate fail safe**

In `src/lib/certificate.js`, find the verification-banner derivation (around line 55: `const bannerOk = isReg ? true : data.autentico;`). Leave it, but add a guard at the top of the function body (right after the function opens), so a verification certificate with no explicit `autentico` throws rather than silently printing "AUTÉNTICO":

```javascript
  if (data.kind === "verificacion" && data.autentico !== true) {
    throw new Error("Refusing to issue a verification certificate without an AUTHENTIC verdict.");
  }
```

(Confirm the field name used for the certificate type — the callers pass `kind: "verificacion"` / `kind: "registro"`. Match that exact field.)

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds. (Callers are wired in Tasks 8-9 to pass `autentico: verdict === VERDICT.AUTHENTIC` and to only render the button when AUTHENTIC.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/certificate.js
git commit -m "feat: certificate refuses to claim authenticity without an explicit verdict"
```

---

## Task 8: `Verify.jsx` — DB-independent verdict

**Files:**
- Modify: `src/pages/Verify.jsx`

- [ ] **Step 1: Rewrite the file**

```jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLang } from "../i18n/useLang.jsx";
import { hashFile } from "../lib/crypto.js";
import { resolveVerdict } from "../lib/registry.js";
import { VERDICT } from "../lib/verdict.js";
import Dropzone from "../components/Dropzone.jsx";
import Verdict from "../components/Verdict.jsx";
import Busy from "../components/Busy.jsx";

export default function Verify() {
  const { t } = useLang();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState(null); // { verdict, hash, doc }

  const onFile = async (file) => {
    if (file.type !== "application/pdf") { setErr(t.invalidPdf); return; }
    setErr(""); setBusy(true); setResult(null);
    try {
      const hash = await hashFile(file);
      const { verdict, doc } = await resolveVerdict(hash);
      if (verdict === VERDICT.AUTHENTIC && doc?.public_id) {
        nav(`/verify/${doc.public_id}?h=${hash}&match=1`);
        return;
      }
      setResult({ verdict, hash, doc });
    } catch (e) { setErr(t.connectionError + e.message); }
    setBusy(false);
  };

  if (busy) return <Busy msg={t.vCheckingChain} />;

  const banner = result && ({
    [VERDICT.AUTHENTIC]: { kind: "ok", title: t.matchOk },
    [VERDICT.NOT_ANCHORED]: { kind: "warn", title: t.vNotAnchored, detail: t.vNotAnchoredHint },
    [VERDICT.UNVERIFIABLE]: { kind: "warn", title: t.vUnverifiable, detail: t.vUnverifiableHint },
    [VERDICT.CHAIN_CONFIG_ERROR]: { kind: "bad", title: t.vConfigError, detail: t.vConfigErrorHint },
    [VERDICT.NOT_FOUND]: { kind: "bad", title: t.notFound, detail: t.notFoundHint },
  }[result.verdict]);

  return (
    <div className="card">
      <h2>{t.verifierFlowTitle}</h2>
      {err && <div className="error-box">{err}</div>}
      {banner && (<>
        <Verdict kind={banner.kind} title={banner.title} detail={banner.detail} />
        <div className="hashbox">{result.hash}</div>
      </>)}
      <Dropzone label={t.dropPdfVerify + " " + t.browse} sub={t.verifySubtext} onFile={onFile} />
    </div>
  );
}
```

Note: the blind-upload page has no persistent file to "retry" — on `UNVERIFIABLE` the user simply re-drops the file (the amber banner + hint tell them to try again). The explicit retry button lives on the enriched page (Task 9), which holds the authoritative hash.

- [ ] **Step 2: Verify build + existing tests**

Run: `npm run build && npx vitest run`
Expected: build succeeds; tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Verify.jsx
git commit -m "feat: Verify.jsx uses chain-first resolveVerdict (DB-independent)"
```

---

## Task 9: `VerifyDocument.jsx` — verdict, amber states, retry, cert gating, degrade

**Files:**
- Modify: `src/pages/VerifyDocument.jsx`

This is the enriched/QR page. Key changes: (a) read the hash from `?h=`; (b) the authority is the hash, not the DB row; (c) verdict via `resolveVerdict`; (d) amber states + a retry button; (e) certificate button only when AUTHENTIC; (f) degrade when the DB is down.

- [ ] **Step 1: Load the hash + verdict**

Replace the data-loading `useEffect` and `onFile` with hash-driven logic. At the top, read the hash param:

```jsx
  const hashFromUrl = params.get("h");
```

Replace the loading effect so it (1) fetches the doc by `publicId` best-effort for enrichment, and (2) computes the verdict from the authoritative hash (URL hash if present, else the fetched doc's hash):

```jsx
  const [verdict, setVerdict] = useState(null);
  const [checking, setChecking] = useState(false);

  const runVerdict = async (authorityHash, uploadedHash) => {
    setChecking(true);
    const { verdict, chain } = await resolveVerdict(authorityHash, uploadedHash ? { uploadedHash } : {});
    setVerdict(verdict); setChain(chain); setChecking(false);
    return verdict;
  };

  const [dbDown, setDbDown] = useState(false);

  useEffect(() => {
    (async () => {
      let row = null;
      try {
        const rows = await supabaseQuery("documents",
          { filters: `public_id=eq.${publicId}&select=*,profiles(company_name)` });
        row = rows[0] || null;
        setDoc(row);                       // null here means "not found" (DB reachable)
      } catch {
        setDbDown(true); setDoc(null);     // DB unreachable — degrade
      }
      if (row) rpc("verification_count", { doc_id: row.id }).then(setCount).catch(() => {});
      const authority = hashFromUrl || row?.hash;
      if (authority) await runVerdict(authority);
    })();
  }, [publicId]);
```

Existing state semantics are preserved: `doc === undefined` = loading, `doc === null` = not found. A new `dbDown` flag drives the "registry unavailable" banner. Import `resolveVerdict` and `VERDICT` at the top: `import { resolveVerdict } from "../lib/registry.js"; import { VERDICT } from "../lib/verdict.js";`.

- [ ] **Step 2: Verdict banners + retry**

Replace the three existing `match`-based `<Verdict>` lines with a verdict-driven banner and a retry button for `UNVERIFIABLE`:

```jsx
      {checking && <Verdict kind="info" title={t.vCheckingChain} />}
      {!checking && verdict === VERDICT.AUTHENTIC && <Verdict kind="ok" title={doc ? t.matchOk : t.vAuthNoRegistry} />}
      {!checking && verdict === VERDICT.NOT_ANCHORED && <Verdict kind="warn" title={t.vNotAnchored} detail={t.vNotAnchoredHint} />}
      {!checking && verdict === VERDICT.UNVERIFIABLE && (<>
        <Verdict kind="warn" title={t.vUnverifiable} detail={t.vUnverifiableHint} />
        <button className="btn quiet" onClick={() => runVerdict(hashFromUrl || doc?.hash)}>{t.vRetry}</button>
      </>)}
      {!checking && verdict === VERDICT.CHAIN_CONFIG_ERROR && <Verdict kind="bad" title={t.vConfigError} detail={t.vConfigErrorHint} />}
      {!checking && verdict === VERDICT.ALTERED && <Verdict kind="bad" title={t.matchFail} detail={t.notFoundHint} />}
      {!checking && verdict === VERDICT.NOT_FOUND && <Verdict kind="bad" title={t.recordNotFound} detail={t.recordNotFoundHint} />}
      {dbDown && <Verdict kind="warn" title={t.vRegistryUnavailable} />}
```

- [ ] **Step 3: Copy-upload recomputes the verdict**

Replace the old `onFile` (local compare) with one that recomputes via `resolveVerdict`, passing the uploaded hash so a mismatch yields ALTERED, and logs the audit row with the chain outcome:

```jsx
  const onFile = async (file) => {
    const authority = hashFromUrl || doc?.hash;
    if (!authority) return;
    setBusy(true);
    const uploaded = await hashFile(file);
    const v = await runVerdict(authority, uploaded);
    await supabaseQuery("verifications", { method: "POST", body: {
      checked_hash: authority,
      result: v === VERDICT.AUTHENTIC ? "authentic" : v === VERDICT.ALTERED ? "altered" : v === VERDICT.NOT_FOUND ? "not_found" : "unverifiable",
      document_id: v === VERDICT.AUTHENTIC && doc ? doc.id : null,
      decided_by: "onchain", chain_exists: v === VERDICT.AUTHENTIC,
      anchor_tx: doc?.anchor_tx || null,
      verifier_name: vName.trim() || null, verifier_role: vRole.trim() || null, verifier_entity: vEntity.trim() || null,
    }}).catch(() => {});
    setBusy(false);
  };
```

- [ ] **Step 4: Gate the certificate on AUTHENTIC**

Change the certificate button condition and the `downloadCert` payload so `autentico` comes from the verdict:

```jsx
  const downloadCert = () => generateCertificatePdf({
    kind: "verificacion", lang, autentico: verdict === VERDICT.AUTHENTIC,
    archivo: doc.file_name, hash: hashFromUrl || doc.hash,
    verificadorNombre: vName.trim(), verificadorCargo: vRole.trim(), verificadorEntidad: vEntity.trim(),
    fechaVerificacion: fmtCertDate(new Date().toISOString(), lang),
    emisorNombre: "", emisorCargo: "", emisorCompania: doc.profiles?.company_name || "",
    fechaRegistro: doc.registered_at ? fmtCertDate(doc.registered_at, lang) : "",
    txHash: doc.anchor_tx || null,
    txExplorerUrl: doc.anchor_tx ? txUrl(doc.anchor_tx) : null, red: "Base",
    explorerUrl: chain?.contractUrl || null,
    publicUrl: `${window.location.origin}/verify/${doc.public_id}`,
  });
```

And render the certificate button (and the upload dropzone / identity fields) only for the appropriate verdicts:

```jsx
      {verdict === VERDICT.AUTHENTIC && doc && <button className="btn gold" onClick={downloadCert}>{t.downloadCertVer}</button>}
```

Keep the existing "independent proof" section (hash + BaseScan link) as-is — it must always show.

- [ ] **Step 5: Verify build + tests + browser**

Run: `npm run build && npx vitest run`
Expected: build + tests pass.
Then use the **run** skill to load `/verify/<a real public_id>` and confirm the AUTHENTIC (green) and an amber state render correctly.

- [ ] **Step 6: Commit**

```bash
git add src/pages/VerifyDocument.jsx
git commit -m "feat: VerifyDocument verdict states, retry, cert gating, DB-degrade"
```

---

## Task 10: Hash-bearing verification link + QR

**Files:**
- Modify: `src/pages/Register.jsx` (the `publicUrl` derivation, ~line 22)
- Modify: `src/pages/Demo.jsx` (its equivalent public-URL derivation)

- [ ] **Step 1: Register.jsx — append the hash**

Change the `publicUrl` derivation so the link (and therefore its QR) carries the hash:

```jsx
  const publicUrl = rec ? `${window.location.origin}/verify/${rec.public_id}?h=${rec.hash}` : "";
```

- [ ] **Step 2: Demo.jsx — same change**

Find the equivalent `/verify/${...public_id}` URL construction in `Demo.jsx` and append `?h=${rec.hash}` (use the demo record's hash field).

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: build succeeds. Old links without `?h=` still work (Task 9 falls back to the fetched doc's hash).

- [ ] **Step 4: Commit**

```bash
git add src/pages/Register.jsx src/pages/Demo.jsx
git commit -m "feat: verification link/QR carries the hash (DB-independent scan)"
```

---

## Task 11: Mandatory-but-visible anchoring

**Files:**
- Modify: `src/pages/Register.jsx` (auto-anchor after register; drop the opt-in gate; insert as `pending`)
- Modify: `src/pages/Demo.jsx` (same auto-anchor flow)
- Modify: `src/lib/registry.js` (`registerDocument` inserts `anchor_status: "pending"`)

- [ ] **Step 1: Insert as pending**

In `src/lib/registry.js` `registerDocument`, add `anchor_status: "pending"` to the insert body:

```javascript
    body: { hash, file_name: fileName, file_size: size, issuer_id: currentUserId(), anchor_status: "pending" },
```

- [ ] **Step 2: Auto-anchor in Register.jsx**

In `registerBytes` (after `setRec(...)` on a fresh registration), invoke `doAnchor()` automatically so anchoring always runs. Keep the visible `anchor === "busy"` / `anchoredOk` UI. Remove the opt-in button `{!anchor && <button ... onClick={doAnchor}>{t.anchorBtn}</button>}` (line ~84) — anchoring is no longer optional; the visible progress remains.

Concretely, at the end of the success path in `registerBytes`, add:

```jsx
      if (!already) doAnchor();
```

and delete the `{!anchor && <button className="btn" onClick={doAnchor} ...>{t.anchorBtn}</button>}` line.

- [ ] **Step 3: Demo.jsx — auto-anchor**

Mirror Step 2 in `Demo.jsx`: after a fresh demo registration, call its `anchorOnChain` step automatically and keep the visible progress.

- [ ] **Step 4: Verify build + tests + browser**

Run: `npm run build && npx vitest run`
Expected: build + tests pass. (Note: `registry.test.js` asserts the insert body — update the `toMatchObject` in the "inserts and returns already:false" test to include `anchor_status: "pending"`.)
Then use the **run** skill to register a document and watch the `pending → anchored` transition.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Register.jsx src/pages/Demo.jsx src/lib/registry.js tests/registry.test.js
git commit -m "feat: mandatory-but-visible anchoring at registration"
```

---

## Task 12: Audit-trail migration + `anchor_block`

**Files:**
- Create: `supabase/migrations/0002_verdict_audit.sql`
- Modify: `netlify/functions/register-onchain.js` (persist `anchor_block`)

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/0002_verdict_audit.sql
-- Extend the audit trail so a verification row shows the verdict was chain-backed,
-- and record the anchoring block on the document. Apply via Supabase SQL Editor.

alter table documents add column if not exists anchor_block bigint;

alter table verifications drop constraint if exists verifications_result_check;
alter table verifications
  add constraint verifications_result_check
  check (result in ('authentic','not_found','altered','unverifiable'));

alter table verifications add column if not exists decided_by text;
alter table verifications add column if not exists chain_exists boolean;
alter table verifications add column if not exists anchor_tx text;
alter table verifications add column if not exists chain_timestamp bigint;
alter table verifications add column if not exists error_class text;
```

- [ ] **Step 2: Persist `anchor_block` on a successful anchor**

In `netlify/functions/register-onchain.js`, in the success path where `updateAnchor(cleanHash, { anchor_status: "anchored", anchor_tx: receipt.hash, anchored_at: ... })` is called, add the block number:

```javascript
    await updateAnchor(cleanHash, { anchor_status: "anchored", anchor_tx: receipt.hash, anchored_at: new Date().toISOString(), anchor_block: receipt.blockNumber });
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: build succeeds. (The migration is applied manually in the Supabase SQL Editor against project `tqgpqkoonwywvuhbktge` — note this in the PR/handoff; it is not run by the app.)

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0002_verdict_audit.sql netlify/functions/register-onchain.js
git commit -m "feat: audit-trail columns + anchor_block persistence"
```

---

## Task 13: Full verification pass

- [ ] **Step 1: Run the whole suite**

Run: `npx vitest run`
Expected: all tests pass (existing + new: verdict, onchain, verify-onchain, registry).

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Browser smoke via the run skill**

Use the **run** skill (`npm run dev`) and check, at minimum: an AUTHENTIC verify (green), an amber `UNVERIFIABLE` (simulate by pointing the RPC env at an unreachable URL, or a not-yet-anchored doc for `NOT_ANCHORED`), the retry button, and that the certificate button appears only on AUTHENTIC.

- [ ] **Step 4: Finish the branch**

Use the **superpowers:finishing-a-development-branch** skill to decide merge/PR. Remember the DB migration (Task 12) must be applied in Supabase before this reaches a live environment.

---

## Notes for the implementer

- **DB migration is manual.** `0002_verdict_audit.sql` is applied by hand in the Supabase SQL Editor; the app never runs it. Until it is applied, the new `verifications` columns (`decided_by`, etc.) will be rejected by PostgREST — so apply it before exercising the QR page against the real project, or the audit insert will fail (harmless: it is `.catch`-swallowed, but the audit row won't be written).
- **Git identity & safety:** commit as `lokki21` per the project's identity note. Never `git add .` — stage the explicit files each task lists, and run `git status` before each commit per CLAUDE.md's LOCATE→LOOK→ACT rule. (`templates polizas/` is already ignored on this branch, since it was branched from `main` which carries the `.gitignore` rule — but still verify status each time.)
- **Out of scope, do not build:** T3 purge, mainnet cutover, Powerhouse/accredited real-product track.
```
