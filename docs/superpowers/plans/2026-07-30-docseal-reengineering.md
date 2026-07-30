# DocSeal Re-engineering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-engineer DocSeal per the approved spec: institutional redesign, public verification links, issuer accounts, locked-down database, protected anchor endpoint, and a modular codebase.

**Architecture:** Incremental re-engineering of the existing Vite + React SPA. The 1,398-line `App.jsx` is split into `lib/`, `i18n/`, `components/`, and `pages/` modules routed with React Router. Supabase gains auth + RLS via a SQL migration. The two Netlify functions are rewritten (one is corrupted today). Only new runtime dependency: `react-router-dom`.

**Tech Stack:** Vite 5, React 18, react-router-dom, Supabase (REST + GoTrue, no client SDK), Netlify Functions (CommonJS, ethers v6), jsPDF, qrcode, Vitest (dev).

**Spec:** `docs/superpowers/specs/2026-07-30-docseal-reengineering-design.md`

**Conventions for every task:** work on branch `reengineering`. Run commands from the repo root `/Users/aegir/projects/docseal`. "Move lines A–B of `src/App.jsx`" refers to the file as it exists on `main` at commit `d03a33a` — copy those lines verbatim, they are deleted from `App.jsx` only in Task 15.

---

### Task 1: Branch and tooling

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Create the branch and install existing deps**

```bash
git checkout -b reengineering && npm install
```
Expected: `node_modules/` created, no errors.

- [ ] **Step 2: Add the two new packages**

```bash
npm install react-router-dom && npm install -D vitest
```

- [ ] **Step 3: Add the test script**

In `package.json`, change the `scripts` block to:

```json
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
```

- [ ] **Step 4: Verify tooling**

Run: `npm test`
Expected: Vitest exits with "No test files found" (that's fine) — proves the runner works.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add react-router-dom and vitest"
```

---

### Task 2: Extract `lib/crypto.js` (TDD)

**Files:**
- Create: `src/lib/crypto.js`
- Test: `tests/crypto.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/crypto.test.js
import { it, expect } from "vitest";
import { hashBytes } from "../src/lib/crypto.js";

it("hashes empty input to the known SHA-256 vector", async () => {
  expect(await hashBytes(new Uint8Array([]))).toBe(
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  );
});

it("hashes 'abc' to the known SHA-256 vector", async () => {
  expect(await hashBytes(new TextEncoder().encode("abc"))).toBe(
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
  );
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `../src/lib/crypto.js`.

- [ ] **Step 3: Implement**

```js
// src/lib/crypto.js
// SHA-256 fingerprinting. These two functions define what a "huella" means —
// they are moved verbatim from the original App.jsx and must never change silently.
export async function hashBytes(bytes) {
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashFile(file) {
  return hashBytes(await file.arrayBuffer());
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test` — Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/crypto.js tests/crypto.test.js
git commit -m "refactor: extract crypto helpers with known-vector tests"
```

---

### Task 3: Extract `lib/format.js` (TDD)

**Files:**
- Create: `src/lib/format.js`
- Test: `tests/format.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/format.test.js
import { it, expect } from "vitest";
import { formatFileSize, truncateHash, makeCertId } from "../src/lib/format.js";

it("formats file sizes", () => {
  expect(formatFileSize(512)).toBe("512 B");
  expect(formatFileSize(2048)).toBe("2.0 KB");
  expect(formatFileSize(3 * 1024 * 1024)).toBe("3.0 MB");
});

it("truncates hashes to 12+12 chars", () => {
  const h = "a".repeat(64);
  expect(truncateHash(h)).toBe("aaaaaaaaaaaa...aaaaaaaaaaaa");
});

it("builds certificate ids from date and hash tail", () => {
  expect(makeCertId("DS-REG", "ff00aa11bb22", "2026-03-12T10:00:00Z")).toBe(
    "DS-REG-20260312-AA11BB22".slice(0, 7) + "-20260312-" + "11BB22"
  );
});
```

Note: `makeCertId` uses the **last 6** hash chars uppercased; the expected value is `DS-REG-20260312-11BB22`. Write the assertion literally as:

```js
  expect(makeCertId("DS-REG", "ff00aa11bb22", "2026-03-12T10:00:00Z"))
    .toBe("DS-REG-20260312-11BB22");
```

- [ ] **Step 2: Run to verify it fails** — `npm test` → cannot resolve module.

- [ ] **Step 3: Implement**

Move these functions verbatim from `src/App.jsx` into the new file and export each: `formatDate` (lines 292–295), `truncateHash` (line 296), `fmtCertDate` (lines 308–315), `makeCertId` (lines 317–322), `formatFileSize` (lines 566–570). Result:

```js
// src/lib/format.js
export function formatDate(iso, lang) {
  const locale = lang === "es" ? "es-ES" : "en-US";
  return new Date(iso).toLocaleString(locale, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
export function truncateHash(h) { return h.slice(0, 12) + "..." + h.slice(-12); }
export function fmtCertDate(iso, lang) {
  const locale = lang === "es" ? "es-ES" : "en-US";
  try {
    return new Date(iso).toLocaleString(locale, { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return String(iso); }
}
export function makeCertId(prefix, hash, iso) {
  const d = new Date(iso);
  const ymd = isNaN(d) ? "00000000" : `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const tail = (hash || "").slice(-6).toUpperCase();
  return `${prefix}-${ymd}-${tail}`;
}
export function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = fileName;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
```

(`downloadBlob` is moved from App.jsx lines 282–291; DOM-dependent, not unit-tested.)

- [ ] **Step 4: `npm test`** — Expected: all pass (UTC note: if the `makeCertId` test fails locally because of timezone, change the test input to `"2026-03-12T12:00:00Z"` — midday avoids date rollover).

- [ ] **Step 5: Commit** — `git add src/lib/format.js tests/format.test.js && git commit -m "refactor: extract format helpers with tests"`

---

### Task 4: bytes32 util + clean `verify-onchain.js` rewrite

The deployed `verify-onchain.js` is corrupted (contains a pasted terminal session; the code appears twice). Rewrite it and share `toBytes32` between both functions.

**Files:**
- Create: `netlify/functions/utils/bytes32.js`
- Rewrite: `netlify/functions/verify-onchain.js`
- Test: `tests/bytes32.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/bytes32.test.js
import { it, expect } from "vitest";
import { toBytes32 } from "../netlify/functions/utils/bytes32.js";

it("normalizes a bare 64-hex hash", () => {
  expect(toBytes32("A".repeat(64))).toBe("0x" + "a".repeat(64));
});
it("accepts 0x-prefixed input", () => {
  expect(toBytes32("0x" + "b".repeat(64))).toBe("0x" + "b".repeat(64));
});
it("rejects invalid input", () => {
  expect(() => toBytes32("zz")).toThrow();
});
```

- [ ] **Step 2: `npm test`** — Expected: FAIL, module missing.

- [ ] **Step 3: Implement the util (CommonJS — Netlify functions require it)**

```js
// netlify/functions/utils/bytes32.js
function toBytes32(hash) {
  const clean = hash.startsWith("0x") ? hash.slice(2) : hash;
  if (!/^[0-9a-fA-F]{64}$/.test(clean)) {
    throw new Error("El hash debe ser SHA-256 (64 caracteres hexadecimales).");
  }
  return "0x" + clean.toLowerCase();
}
module.exports = { toBytes32 };
```

- [ ] **Step 4: `npm test`** — Expected: pass.

- [ ] **Step 5: Rewrite `verify-onchain.js` (replace the entire file)**

```js
// Netlify Function: read-only on-chain check. No gas, stays public.
// Env vars: RPC_URL, CONTRACT_ADDRESS, CHAIN_ID
const { ethers } = require("ethers");
const { toBytes32 } = require("./utils/bytes32.js");

const ABI = ["function verify(bytes32 documentHash) external view returns (bool exists, uint64 timestamp, address registrar)"];
const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: HEADERS, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: "Method not allowed" }) };
  try {
    const { hash } = JSON.parse(event.body || "{}");
    if (!hash) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: "Falta el campo 'hash'." }) };
    const documentHash = toBytes32(hash);
    const { RPC_URL, CONTRACT_ADDRESS } = process.env;
    const CHAIN_ID = parseInt(process.env.CHAIN_ID || "84532", 10);
    if (!RPC_URL || !CONTRACT_ADDRESS) return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: "Faltan variables de entorno." }) };
    const provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
    const [exists, ts, registrar] = await contract.verify(documentHash);
    const explorerBase = CHAIN_ID === 8453 ? "https://basescan.org" : "https://sepolia.basescan.org";
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ exists, timestamp: Number(ts), registrar, contractUrl: `${explorerBase}/address/${CONTRACT_ADDRESS}` }) };
  } catch (err) {
    console.error("verify-onchain error:", err);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: err.message || "Error interno." }) };
  }
};
```

- [ ] **Step 6: Sanity check it parses**

Run: `node --check netlify/functions/verify-onchain.js && node --check netlify/functions/utils/bytes32.js`
Expected: no output (the corrupted original fails this check — that's the bug being fixed).

- [ ] **Step 7: Commit**

```bash
git add netlify/functions/utils/bytes32.js netlify/functions/verify-onchain.js tests/bytes32.test.js
git commit -m "fix: rewrite corrupted verify-onchain function, share bytes32 util"
```

---

### Task 5: Supabase schema + RLS migration

**Files:**
- Create: `supabase/migrations/0001_schema.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/0001_schema.sql
-- Fresh schema for DocSeal re-engineering. Demo data is NOT migrated.
-- Apply via Supabase Dashboard > SQL Editor (paste and run).

-- Drop the old open tables from the prototype
drop table if exists verifications;
drop table if exists documents;

-- ============ profiles ============
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_name text not null,
  contact_name text not null,
  role_title text not null,
  created_at timestamptz not null default now()
);
alter table profiles enable row level security;
create policy "profiles are publicly readable" on profiles for select using (true);
create policy "users insert own profile" on profiles for insert with check (auth.uid() = id);
create policy "users update own profile" on profiles for update using (auth.uid() = id);

-- ============ public_id generator ============
create or replace function gen_public_id() returns text
language sql volatile as $$
  select string_agg(
    substr('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
           (get_byte(gen_random_bytes(1), 0) % 62) + 1, 1), '')
  from generate_series(1, 10);
$$;

-- ============ documents (immutable) ============
create table documents (
  id uuid primary key default gen_random_uuid(),
  public_id text unique not null default gen_public_id(),
  hash text unique not null check (hash ~ '^[0-9a-f]{64}$'),
  file_name text not null,
  file_size bigint,
  issuer_id uuid not null references profiles(id),
  registered_at timestamptz not null default now(),
  anchor_status text not null default 'none' check (anchor_status in ('none','pending','anchored','failed')),
  anchor_tx text,
  anchored_at timestamptz
);
alter table documents enable row level security;
create policy "documents are publicly readable" on documents for select using (true);
create policy "issuers insert own documents" on documents for insert
  with check (auth.uid() = issuer_id);
-- No update/delete policies: rows are immutable to clients.
-- Anchor fields are written by the Netlify function via the service-role key (bypasses RLS).

-- ============ verifications (audit trail) ============
create table verifications (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id),
  checked_hash text not null,
  result text not null check (result in ('authentic','not_found')),
  verifier_name text,
  verifier_role text,
  verifier_entity text,
  verified_at timestamptz not null default now()
);
alter table verifications enable row level security;
create policy "anyone can log a verification" on verifications for insert with check (true);
create policy "issuers read own documents audit trail" on verifications for select
  using (exists (select 1 from documents d where d.id = document_id and d.issuer_id = auth.uid()));

-- Public aggregate count for the /verify/:id page (bypasses RLS deliberately)
create or replace function verification_count(doc_id uuid) returns bigint
language sql security definer set search_path = public as $$
  select count(*) from verifications where document_id = doc_id;
$$;
grant execute on function verification_count(uuid) to anon, authenticated;
```

- [ ] **Step 2: Apply it**

Open Supabase Dashboard → project `tqgpqkoonwywvuhbktge` → SQL Editor → paste the file → Run. Expected: "Success. No rows returned".
Also enable email auth: Dashboard → Authentication → Providers → Email → ensure **Email + password** is enabled and **Confirm email** is OFF (demo-friendly).

- [ ] **Step 3: Verify RLS actually blocks anonymous inserts**

```bash
curl -s -X POST "https://tqgpqkoonwywvuhbktge.supabase.co/rest/v1/documents" \
  -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"hash":"'"$(printf 'a%.0s' {1..64})"'","file_name":"x.pdf","issuer_id":"00000000-0000-0000-0000-000000000000"}'
```
(Substitute `<ANON_KEY>` with the anon key from `src/App.jsx` line 6.)
Expected: an error response mentioning row-level security — **this failing is the success condition.** In the old schema this insert succeeded; that was finding #3 in the spec.

- [ ] **Step 4: Commit** — `git add supabase/migrations/0001_schema.sql && git commit -m "feat: auth-ready schema with RLS and immutable documents"`

---

### Task 6: Protected `register-onchain.js` with anchor writeback

**Files:**
- Rewrite: `netlify/functions/register-onchain.js`

- [ ] **Step 1: Replace the entire file**

```js
// Netlify Function: anchors a hash on-chain. Requires a logged-in issuer.
// Env vars: OPERATOR_PRIVATE_KEY, CONTRACT_ADDRESS, RPC_URL, CHAIN_ID,
//           SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
const { ethers } = require("ethers");
const { toBytes32 } = require("./utils/bytes32.js");

const ABI = [
  "function register(bytes32 documentHash) external",
  "function verify(bytes32 documentHash) external view returns (bool exists, uint64 timestamp, address registrar)",
];
const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

// Validate the caller's Supabase session token. Returns the user id or null.
async function validateUser(token) {
  if (!token) return null;
  const res = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: process.env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const user = await res.json();
  return user.id || null;
}

// Write anchor result back to the document row (service role bypasses RLS).
async function updateAnchor(hash, fields) {
  await fetch(`${process.env.SUPABASE_URL}/rest/v1/documents?hash=eq.${hash}`, {
    method: "PATCH",
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(fields),
  });
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: HEADERS, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: "Method not allowed" }) };
  try {
    const token = (event.headers.authorization || event.headers.Authorization || "").replace(/^Bearer\s+/i, "");
    const userId = await validateUser(token);
    if (!userId) return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ error: "No autorizado." }) };

    const { hash } = JSON.parse(event.body || "{}");
    if (!hash) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: "Falta el campo 'hash'." }) };
    const documentHash = toBytes32(hash);
    const cleanHash = documentHash.slice(2);

    const { RPC_URL, CONTRACT_ADDRESS, OPERATOR_PRIVATE_KEY } = process.env;
    const CHAIN_ID = parseInt(process.env.CHAIN_ID || "84532", 10);
    if (!RPC_URL || !CONTRACT_ADDRESS || !OPERATOR_PRIVATE_KEY) {
      return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: "Faltan variables de entorno en el servidor." }) };
    }
    const provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID);
    const wallet = new ethers.Wallet(OPERATOR_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);
    const explorerBase = CHAIN_ID === 8453 ? "https://basescan.org" : "https://sepolia.basescan.org";

    const [exists] = await contract.verify(documentHash);
    if (exists) {
      await updateAnchor(cleanHash, { anchor_status: "anchored" });
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ status: "already_registered", hash: documentHash, explorerUrl: `${explorerBase}/address/${CONTRACT_ADDRESS}` }) };
    }

    const tx = await contract.register(documentHash);
    const receipt = await tx.wait(1);
    await updateAnchor(cleanHash, { anchor_status: "anchored", anchor_tx: receipt.hash, anchored_at: new Date().toISOString() });
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ status: "registered", hash: documentHash, txHash: receipt.hash, blockNumber: receipt.blockNumber, explorerUrl: `${explorerBase}/tx/${receipt.hash}`, contractUrl: `${explorerBase}/address/${CONTRACT_ADDRESS}` }) };
  } catch (err) {
    console.error("register-onchain error:", err);
    try { const { hash } = JSON.parse(event.body || "{}"); if (hash) await updateAnchor(toBytes32(hash).slice(2), { anchor_status: "failed" }); } catch {}
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: "Error interno." }) };
  }
};
```

- [ ] **Step 2: Parse check** — `node --check netlify/functions/register-onchain.js` → no output.

- [ ] **Step 3: Configure the new env vars in Netlify**

Netlify → Site settings → Environment variables: add `SUPABASE_URL` (`https://tqgpqkoonwywvuhbktge.supabase.co`), `SUPABASE_ANON_KEY` (anon key), `SUPABASE_SERVICE_ROLE_KEY` (Dashboard → Settings → API → service_role — **never** put this in frontend code or git).

- [ ] **Step 4: Commit** — `git add netlify/functions/register-onchain.js && git commit -m "feat: require issuer auth for anchoring, write anchor status back"`

---

### Task 7: Institutional theme + `index.html`

**Files:**
- Create: `src/styles/theme.css`
- Modify: `index.html`

- [ ] **Step 1: Create the theme**

```css
/* src/styles/theme.css — Institutional Registry design tokens */
:root {
  --navy: #0b1f3a; --navy-soft: #16304f; --gold: #c9a961; --gold-soft: #e5cf9a;
  --ok: #1d8f5a; --ok-bg: #f2faf6; --bad: #c0392b; --bad-bg: #fdf3f2;
  --ink: #1d2a3a; --muted: #55637a; --faint: #8a96a8;
  --line: #e4e9f0; --bg: #eef1f6; --card: #ffffff;
  --serif: Georgia, "Times New Roman", serif;
  --sans: "Helvetica Neue", Helvetica, Arial, sans-serif;
  --mono: "SF Mono", ui-monospace, Menlo, monospace;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); font-family: var(--sans); }
h1, h2, h3 { font-family: var(--serif); color: var(--navy); }
a { color: var(--navy); }

.topbar { height: 6px; background: var(--navy); }
.goldline { height: 3px; background: linear-gradient(90deg, var(--gold), var(--gold-soft), var(--gold)); }
.frame { max-width: 560px; margin: 0 auto; padding: 0 16px 48px; }
.site-header { display: flex; align-items: center; gap: 12px; padding: 18px 0; border-bottom: 1px solid var(--line); margin-bottom: 24px; }
.seal { width: 40px; height: 40px; border-radius: 50%; background: var(--navy); color: var(--gold); display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
.site-title { font-family: var(--serif); font-weight: 700; font-size: 20px; color: var(--navy); margin: 0; }
.site-sub { font-size: 10px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--faint); }
.header-spacer { margin-left: auto; display: flex; gap: 8px; align-items: center; }

.card { background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: 20px; margin-bottom: 16px; box-shadow: 0 2px 10px rgba(11,31,58,.06); }
.btn { display: flex; width: 100%; justify-content: center; align-items: center; gap: 8px; padding: 12px 18px; border-radius: 6px; border: none; background: var(--navy); color: #fff; font-size: 15px; font-weight: 600; font-family: var(--sans); cursor: pointer; text-decoration: none; }
.btn.gold { background: #fff; color: var(--navy); border: 1.5px solid var(--gold); }
.btn.quiet { background: transparent; color: var(--muted); border: 1px solid var(--line); }
.btn:disabled { opacity: .5; cursor: default; }
.btn-row { display: flex; gap: 10px; }
.btn-row .btn { flex: 1; }

.field { margin-bottom: 14px; }
.field label { display: block; font-size: 12px; font-weight: 600; color: var(--muted); margin-bottom: 6px; }
.field input { width: 100%; padding: 10px 12px; border: 1px solid var(--line); border-radius: 6px; font-size: 14px; font-family: var(--sans); }
.field input:focus { outline: 2px solid var(--gold-soft); border-color: var(--gold); }

.banner { border-radius: 6px; padding: 14px 16px; text-align: center; margin-bottom: 16px; border: 1.5px solid; }
.banner .eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 1.2px; }
.banner .detail { font-size: 12px; color: var(--muted); margin-top: 4px; }
.banner.ok { border-color: var(--ok); background: var(--ok-bg); } .banner.ok .eyebrow { color: var(--ok); }
.banner.bad { border-color: var(--bad); background: var(--bad-bg); } .banner.bad .eyebrow { color: var(--bad); }
.banner.info { border-color: var(--navy); background: #f4f6fa; } .banner.info .eyebrow { color: var(--navy); }

.kv { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; padding: 8px 0; border-bottom: 1px dashed var(--line); }
.kv span { color: var(--muted); } .kv b { color: var(--navy); text-align: right; word-break: break-word; }
.hashbox { font-family: var(--mono); font-size: 11px; word-break: break-all; background: #f4f6fa; border: 1px solid var(--line); border-radius: 4px; padding: 8px 10px; margin: 10px 0; color: var(--navy); }

.dropzone { border: 2px dashed var(--line); border-radius: 8px; padding: 36px 20px; text-align: center; cursor: pointer; color: var(--muted); background: #fbfcfe; }
.dropzone.drag { border-color: var(--gold); background: #fdfaf3; }
.error-box { color: var(--bad); background: var(--bad-bg); border: 1px solid var(--bad); border-radius: 6px; padding: 10px 12px; font-size: 13px; margin-bottom: 12px; }
.hint { font-size: 12px; color: var(--faint); text-align: center; margin-top: 8px; }
.spinner { width: 28px; height: 28px; border: 3px solid var(--line); border-top-color: var(--gold); border-radius: 50%; animation: spin .8s linear infinite; margin: 0 auto; }
@keyframes spin { to { transform: rotate(360deg); } }
.site-footer { margin-top: 40px; padding-top: 14px; border-top: 1px solid var(--line); font-size: 10.5px; color: var(--faint); text-align: center; letter-spacing: .5px; }
.doc-list-item { display: block; text-decoration: none; }
```

- [ ] **Step 2: Update `index.html`**

Replace the whole file with:

```html
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>DocSeal — Registro de autenticidad documental</title>
    <meta name="description" content="Verifique la autenticidad de pólizas y documentos mediante huellas criptográficas SHA-256 ancladas en blockchain." />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

(The Google-fonts import in the old inline styles is retired — the theme uses system fonts.)

- [ ] **Step 3: Commit** — `git add src/styles/theme.css index.html && git commit -m "feat: institutional theme tokens and cleaned index.html"`

---

### Task 8: i18n module

**Files:**
- Create: `src/i18n/translations.js`, `src/i18n/useLang.jsx`

- [ ] **Step 1: Move the strings**

Create `src/i18n/translations.js` containing exactly the `T` object from `src/App.jsx` lines 9–222 (`const T = { es: {...}, en: {...} };`), changing the declaration to `export const T =`.

- [ ] **Step 2: Add the new page keys**

Append these keys inside **both** `es:` and `en:` blocks (es first value, en second):

| key | es | en |
|---|---|---|
| `homeTagline` | Verifique la autenticidad de un documento en segundos | Verify a document's authenticity in seconds |
| `homeVerifyCta` | Verificar un documento | Verify a document |
| `homeIssuerCta` | Acceso para aseguradoras | Insurer access |
| `loginTitle` | Acceso de aseguradoras | Insurer sign-in |
| `emailLabel` | Correo electrónico | Email |
| `passwordLabel` | Contraseña | Password |
| `signIn` | Ingresar | Sign in |
| `signUp` | Crear cuenta | Create account |
| `signOut` | Salir | Sign out |
| `needAccount` | ¿No tiene cuenta? Regístrese | No account? Sign up |
| `haveAccount` | ¿Ya tiene cuenta? Ingrese | Have an account? Sign in |
| `dashboardTitle` | Mis documentos | My documents |
| `registerNew` | Registrar nuevo documento | Register new document |
| `anchorNone` | Sin anclar | Not anchored |
| `anchorPending` | Anclando… | Anchoring… |
| `anchorAnchored` | Anclado en Base | Anchored on Base |
| `anchorFailed` | Anclaje falló — reintentar | Anchor failed — retry |
| `verifCountLabel` | Verificaciones | Verifications |
| `publicLinkLabel` | Enlace público de verificación | Public verification link |
| `copyLink` | Copiar enlace | Copy link |
| `copied` | ¡Copiado! | Copied! |
| `recordNotFound` | Registro no encontrado | Record not found |
| `recordNotFoundHint` | Este enlace no corresponde a ningún documento registrado. | This link does not match any registered document. |
| `uploadYourCopy` | Subir mi copia para confirmar que coincide | Upload my copy to confirm it matches |
| `matchOk` | Su copia coincide — documento auténtico | Your copy matches — authentic document |
| `matchFail` | Su copia NO coincide con el documento registrado | Your copy does NOT match the registered document |
| `optIdTitle` | Certificado de verificación a su nombre (opcional) | Named verification certificate (optional) |
| `optIdHint` | Complete sus datos solo si desea un certificado a su nombre y aparecer en el registro de auditoría. | Fill in your details only if you want a named certificate and to appear in the audit trail. |
| `registeredOn` | Registrado el | Registered on |
| `issuedBy` | Emisor | Issuer |
| `noDocsYet` | Aún no ha registrado documentos. | You haven't registered any documents yet. |
| `sessionExpired` | Su sesión expiró. Ingrese de nuevo. | Your session expired. Please sign in again. |
| `profileCompany` | Compañía | Company |
| `profileContact` | Nombre de contacto | Contact name |
| `profileRole` | Cargo | Role title |

- [ ] **Step 3: Create the language hook (context + localStorage, logic from App.jsx lines 596–603/637–639/676)**

```jsx
// src/i18n/useLang.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { T } from "./translations.js";

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem("docseal_lang") === "en" ? "en" : "es"; } catch { return "es"; }
  });
  useEffect(() => { try { localStorage.setItem("docseal_lang", lang); } catch {} }, [lang]);
  const toggle = () => setLang((l) => (l === "es" ? "en" : "es"));
  return <LangContext.Provider value={{ lang, t: T[lang], toggle }}>{children}</LangContext.Provider>;
}

export function useLang() { return useContext(LangContext); }
```

- [ ] **Step 4: Verify it compiles** — `npm run build` will fail until Task 12 wires everything (old App.jsx still references nothing new), so just check syntax: `npx vite build --logLevel error 2>&1 | head -5` — the build should still succeed because nothing imports the new files yet.

- [ ] **Step 5: Commit** — `git add src/i18n && git commit -m "feat: i18n module with new page strings"`

---

### Task 9: Supabase client + auth (`lib/supabase.js`, `lib/onchain.js`)

**Files:**
- Create: `src/lib/supabase.js`, `src/lib/onchain.js`

- [ ] **Step 1: Create `src/lib/supabase.js`**

```js
// src/lib/supabase.js — REST + GoTrue helpers. No SDK; sessions in localStorage.
export const SUPABASE_URL = "https://tqgpqkoonwywvuhbktge.supabase.co";
export const SUPABASE_ANON_KEY = "<copy the anon key from src/App.jsx line 6 verbatim>";

const SKEY = "docseal_session";
export function getSession() {
  try { return JSON.parse(localStorage.getItem(SKEY)) || null; } catch { return null; }
}
function saveSession(s) { try { localStorage.setItem(SKEY, JSON.stringify(s)); } catch {} }
export function clearSession() { try { localStorage.removeItem(SKEY); } catch {} }

async function authRequest(path, body) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error_description || data.msg || data.message || `Auth error ${res.status}`);
  return data;
}

export async function signUp(email, password) {
  const data = await authRequest("signup", { email, password });
  if (data.access_token) saveSession(data);
  return data;
}
export async function signIn(email, password) {
  const data = await authRequest("token?grant_type=password", { email, password });
  saveSession(data);
  return data;
}
export function signOut() { clearSession(); }
export function currentUserId() { return getSession()?.user?.id || null; }
export function accessToken() { return getSession()?.access_token || null; }

async function tryRefresh() {
  const s = getSession();
  if (!s?.refresh_token) return false;
  try {
    const data = await authRequest("token?grant_type=refresh_token", { refresh_token: s.refresh_token });
    saveSession(data);
    return true;
  } catch { clearSession(); return false; }
}

// REST query. auth:true sends the user's token (needed for RLS-protected ops).
export async function supabaseQuery(table, { method = "GET", body, filters, auth = false } = {}, _retried = false) {
  let url = `${SUPABASE_URL}/rest/v1/${table}`;
  if (filters) url += `?${filters}`;
  const token = auth ? accessToken() : null;
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
    ...(method === "POST" ? { Prefer: "return=representation" } : {}),
  };
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (res.status === 401 && auth && !_retried && (await tryRefresh())) {
    return supabaseQuery(table, { method, body, filters, auth }, true);
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Supabase error: ${res.status}`);
  }
  return res.json();
}

export async function rpc(fn, args) {
  return supabaseQuery(`rpc/${fn}`, { method: "POST", body: args });
}
```

**Note:** replace the placeholder in `SUPABASE_ANON_KEY` with the actual JWT string from `src/App.jsx` line 6 — it is a public key by design.

- [ ] **Step 2: Create `src/lib/onchain.js`** (moved from App.jsx lines 541–565, anchor call now sends the session token)

```js
// src/lib/onchain.js
import { accessToken } from "./supabase.js";

export async function anchorOnChain(hash) {
  const res = await fetch("/.netlify/functions/register-onchain", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken() || ""}` },
    body: JSON.stringify({ hash }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error ${res.status}`);
  }
  return res.json();
}

export async function checkOnChain(hash) {
  const res = await fetch("/.netlify/functions/verify-onchain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hash }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error ${res.status}`);
  }
  return res.json();
}
```

- [ ] **Step 3: Commit** — `git add src/lib/supabase.js src/lib/onchain.js && git commit -m "feat: supabase auth/session client and onchain fetchers"`

---

### Task 10: Move `imageToPdf` and certificate generator

**Files:**
- Create: `src/lib/imageToPdf.js`, `src/lib/certificate.js`

- [ ] **Step 1: `src/lib/imageToPdf.js`** — move App.jsx lines 253–281 verbatim, with header:

```js
import jsPDF from "jspdf";
export async function imageToPdf(imageFile) { /* lines 254–281 body, unchanged */ }
```

- [ ] **Step 2: `src/lib/certificate.js`** — move App.jsx lines 303–536 (the `CERT_COLORS` const, `generateCertificatePdf` function) verbatim, with header:

```js
import jsPDF from "jspdf";
import QRCode from "qrcode";
import { makeCertId } from "./format.js";
export { generateCertificatePdf };
```

Delete the local `fmtCertDate`/`makeCertId` copies inside the moved block if present (they now live in `format.js`; `fmtCertDate` is imported by callers, not by this file).

**One functional change:** the QR code should point to the public verification page, not BaseScan. In the moved `generateCertificatePdf`, change:

```js
  if (data.explorerUrl) {
    try {
      const qrDataUrl = await QRCode.toDataURL(data.explorerUrl, { margin: 1, width: 200 });
```
to:
```js
  const qrTarget = data.publicUrl || data.explorerUrl;
  if (qrTarget) {
    try {
      const qrDataUrl = await QRCode.toDataURL(qrTarget, { margin: 1, width: 200 });
```

Callers (Tasks 13–14) pass `publicUrl: `${window.location.origin}/verify/${record.public_id}``.

- [ ] **Step 3: Commit** — `git add src/lib/imageToPdf.js src/lib/certificate.js && git commit -m "refactor: extract imageToPdf and certificate generator; QR targets public link"`

---

### Task 11: Shared components

**Files:**
- Create: `src/components/Icons.jsx`, `src/components/Dropzone.jsx`, `src/components/Verdict.jsx`, `src/components/Busy.jsx`

- [ ] **Step 1: `Icons.jsx`** — move all icon components from App.jsx lines 573–592 verbatim, prefixing each with `export`.

- [ ] **Step 2: `Dropzone.jsx`**

```jsx
import { useRef, useState } from "react";

export default function Dropzone({ label, sub, accept = ".pdf,application/pdf", onFile }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  return (
    <>
      <input ref={inputRef} type="file" accept={accept} style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
      <div className={"dropzone" + (drag ? " drag" : "")}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer?.files?.[0]; if (f) onFile(f); }}>
        <p style={{ margin: "0 0 6px", fontSize: 15 }}>{label}</p>
        {sub && <p className="hint" style={{ margin: 0 }}>{sub}</p>}
      </div>
    </>
  );
}
```

- [ ] **Step 3: `Verdict.jsx`**

```jsx
export default function Verdict({ kind, title, detail }) {
  return (
    <div className={`banner ${kind}`}>
      <div className="eyebrow">{title}</div>
      {detail && <div className="detail">{detail}</div>}
    </div>
  );
}
```

- [ ] **Step 4: `Busy.jsx`**

```jsx
export default function Busy({ msg }) {
  return (
    <div className="card" style={{ textAlign: "center" }}>
      <div className="spinner" />
      <p className="hint">{msg}</p>
    </div>
  );
}
```

- [ ] **Step 5: Commit** — `git add src/components && git commit -m "feat: shared UI components"`

---

### Task 12: Router, app frame, redirects

**Files:**
- Rewrite: `src/main.jsx`, `src/App.jsx`
- Modify: `netlify.toml`
- Create: `src/pages/Home.jsx` (placeholder for now, real content Task 13)

- [ ] **Step 1: `src/main.jsx`**

```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./styles/theme.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

- [ ] **Step 2: Replace `src/App.jsx` entirely** (the monolith's remaining pieces have all been extracted by now)

```jsx
import { Routes, Route, Link, Navigate, useLocation } from "react-router-dom";
import { LangProvider, useLang } from "./i18n/useLang.jsx";
import { getSession, signOut } from "./lib/supabase.js";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Register from "./pages/Register.jsx";
import Verify from "./pages/Verify.jsx";
import VerifyDocument from "./pages/VerifyDocument.jsx";

function RequireAuth({ children }) {
  return getSession() ? children : <Navigate to="/login" replace />;
}

function Frame({ children }) {
  const { t, lang, toggle } = useLang();
  const loggedIn = !!getSession();
  const { pathname } = useLocation();
  return (
    <>
      <div className="topbar" /><div className="goldline" />
      <div className="frame">
        <header className="site-header">
          <Link to="/" style={{ textDecoration: "none" }}><div className="seal">✦</div></Link>
          <div>
            <h1 className="site-title">DocSeal</h1>
            <div className="site-sub">{t.appSubtitle}</div>
          </div>
          <div className="header-spacer">
            {loggedIn && pathname.startsWith("/dash") && (
              <a className="btn quiet" style={{ width: "auto", padding: "6px 12px", fontSize: 12 }}
                 href="/" onClick={(e) => { e.preventDefault(); signOut(); window.location.href = "/"; }}>{t.signOut}</a>
            )}
            <button className="btn quiet" style={{ width: "auto", padding: "6px 12px", fontSize: 12 }} onClick={toggle}>
              {lang === "es" ? "EN" : "ES"}
            </button>
          </div>
        </header>
        {children}
        <footer className="site-footer">{t.footerText}</footer>
      </div>
    </>
  );
}

export default function App() {
  return (
    <LangProvider>
      <Frame>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/register" element={<RequireAuth><Register /></RequireAuth>} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/verify/:publicId" element={<VerifyDocument />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Frame>
    </LangProvider>
  );
}
```

- [ ] **Step 3: Placeholder pages so the build passes** — create six files `src/pages/{Home,Login,Dashboard,Register,Verify,VerifyDocument}.jsx`, each temporarily:

```jsx
export default function Home() { return <div className="card">Home</div>; }
```
(adjust the function name per file — real implementations land in Tasks 13–15).

- [ ] **Step 4: SPA redirect** — replace `netlify.toml` with:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[functions]
  directory = "netlify/functions"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

- [ ] **Step 5: Verify** — `npm run build` → succeeds. `npm run dev` → open http://localhost:5173 → navy/gold frame renders with "Home" card; `/verify` shows "Verify".

- [ ] **Step 6: Commit** — `git add -A src netlify.toml && git commit -m "feat: router, institutional frame, SPA redirects"`

---

### Task 13: Home + Login pages

**Files:**
- Rewrite: `src/pages/Home.jsx`, `src/pages/Login.jsx`

- [ ] **Step 1: `Home.jsx`**

```jsx
import { Link } from "react-router-dom";
import { useLang } from "../i18n/useLang.jsx";

export default function Home() {
  const { t } = useLang();
  return (
    <>
      <div className="card" style={{ textAlign: "center" }}>
        <h2 style={{ marginTop: 4 }}>{t.homeTagline}</h2>
        <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6 }}>{t.welcomeIntro}</p>
        <Link className="btn" to="/verify" style={{ marginBottom: 8 }}>🔍&nbsp;{t.homeVerifyCta}</Link>
        <Link className="btn gold" to="/dashboard">🏛&nbsp;{t.homeIssuerCta}</Link>
      </div>
      <div className="card">
        <h3>{t.welcomeQ2}</h3>
        {[1, 2, 3].map((n) => (
          <div className="kv" key={n}>
            <span>{t[`welcomeStep${n}Title`]}</span>
            <b style={{ fontWeight: 400, textAlign: "left", flex: 1 }}>{t[`welcomeStep${n}Body`]}</b>
          </div>
        ))}
        <p className="hint">{t.welcomeNote}</p>
      </div>
    </>
  );
}
```
(Note `/dashboard` is behind `RequireAuth`, so "Insurer access" lands on login when logged out — intended.)

- [ ] **Step 2: `Login.jsx`** (sign-in + sign-up with profile creation)

```jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLang } from "../i18n/useLang.jsx";
import { signIn, signUp, supabaseQuery, currentUserId } from "../lib/supabase.js";

export default function Login() {
  const { t } = useLang();
  const nav = useNavigate();
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [company, setCompany] = useState(""); const [contact, setContact] = useState(""); const [roleTitle, setRoleTitle] = useState("");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      if (mode === "signup") {
        if (!company.trim() || !contact.trim() || !roleTitle.trim()) throw new Error(t.validationError);
        await signUp(email, password);
        await supabaseQuery("profiles", { method: "POST", auth: true, body: {
          id: currentUserId(), company_name: company.trim(), contact_name: contact.trim(), role_title: roleTitle.trim(),
        }});
      } else {
        await signIn(email, password);
      }
      nav("/dashboard");
    } catch (e2) { setErr(e2.message); }
    setBusy(false);
  };

  return (
    <div className="card">
      <h2>{t.loginTitle}</h2>
      {err && <div className="error-box">{err}</div>}
      <form onSubmit={submit}>
        <div className="field"><label>{t.emailLabel}</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="field"><label>{t.passwordLabel}</label>
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        {mode === "signup" && (<>
          <div className="field"><label>{t.profileCompany}</label>
            <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder={t.companyIssuerPlaceholder} /></div>
          <div className="field"><label>{t.profileContact}</label>
            <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder={t.namePlaceholder} /></div>
          <div className="field"><label>{t.profileRole}</label>
            <input value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} placeholder={t.roleIssuerPlaceholder} /></div>
        </>)}
        <button className="btn" disabled={busy}>{mode === "signup" ? t.signUp : t.signIn}</button>
      </form>
      <p className="hint" style={{ cursor: "pointer" }} onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
        {mode === "signin" ? t.needAccount : t.haveAccount}
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Verify manually** — `npm run dev`: sign up with a test email/password + company details; expect redirect to `/dashboard` placeholder. Check Supabase Dashboard → Table editor → `profiles` has the row.

- [ ] **Step 4: Commit** — `git add src/pages/Home.jsx src/pages/Login.jsx && git commit -m "feat: home and login pages"`

---

### Task 14: Register + Dashboard pages

**Files:**
- Rewrite: `src/pages/Register.jsx`, `src/pages/Dashboard.jsx`

- [ ] **Step 1: `Register.jsx`**

```jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { useLang } from "../i18n/useLang.jsx";
import { hashBytes } from "../lib/crypto.js";
import { imageToPdf } from "../lib/imageToPdf.js";
import { supabaseQuery, currentUserId } from "../lib/supabase.js";
import { anchorOnChain } from "../lib/onchain.js";
import { generateCertificatePdf } from "../lib/certificate.js";
import { fmtCertDate, downloadBlob } from "../lib/format.js";
import Dropzone from "../components/Dropzone.jsx";
import Verdict from "../components/Verdict.jsx";
import Busy from "../components/Busy.jsx";

export default function Register() {
  const { t, lang } = useLang();
  const [busy, setBusy] = useState(""); const [err, setErr] = useState("");
  const [rec, setRec] = useState(null); const [already, setAlready] = useState(false);
  const [pdfBlob, setPdfBlob] = useState(null); const [anchor, setAnchor] = useState(null);
  const [copied, setCopied] = useState(false);

  const publicUrl = rec ? `${window.location.origin}/verify/${rec.public_id}` : "";

  const registerBytes = async (bytes, fileName, size, blob) => {
    const hash = await hashBytes(bytes);
    const existing = await supabaseQuery("documents", { filters: `hash=eq.${hash}&select=*` });
    if (existing.length > 0) { setRec(existing[0]); setAlready(true); return; }
    setBusy(t.registering);
    const inserted = await supabaseQuery("documents", { method: "POST", auth: true, body: {
      hash, file_name: fileName, file_size: size, issuer_id: currentUserId(),
    }});
    setRec(inserted[0]); setPdfBlob(blob || null);
  };

  const onPdf = async (file) => {
    if (file.type !== "application/pdf") { setErr(t.invalidPdf); return; }
    setErr(""); setBusy(t.computingHash);
    try { await registerBytes(await file.arrayBuffer(), file.name, file.size); }
    catch (e) { setErr(t.genericError + e.message); }
    setBusy("");
  };

  const onImage = async (file) => {
    if (!file.type.startsWith("image/")) { setErr(t.invalidImage); return; }
    setErr(""); setBusy(t.buildingPdf);
    try {
      const { pdfBlob: blob, pdfBytes, fileName } = await imageToPdf(file);
      await registerBytes(pdfBytes, fileName, pdfBytes.byteLength, blob);
    } catch (e) { setErr(t.genericError + e.message); }
    setBusy("");
  };

  const doAnchor = async () => {
    setAnchor("busy");
    try { setAnchor(await anchorOnChain(rec.hash)); }
    catch { setAnchor({ error: true }); }
  };

  const downloadCert = () => generateCertificatePdf({
    kind: "registro", lang, archivo: rec.file_name, hash: rec.hash,
    emisorNombre: "", emisorCargo: "", emisorCompania: "",
    fechaRegistro: fmtCertDate(rec.registered_at, lang),
    txHash: anchor?.txHash || null, red: "Base",
    explorerUrl: anchor?.explorerUrl || null, publicUrl,
  });

  if (busy) return <Busy msg={busy} />;

  if (rec) return (
    <div className="card">
      <Verdict kind={already ? "info" : "ok"} title={already ? t.alreadyRegistered : t.registeredOk} />
      <div className="kv"><span>{t.fileLabel}</span><b>{rec.file_name}</b></div>
      <div className="hashbox">{rec.hash}</div>
      <div className="field"><label>{t.publicLinkLabel}</label>
        <div className="hashbox" style={{ fontSize: 13 }}>{publicUrl}</div>
        <button className="btn quiet" onClick={() => { navigator.clipboard.writeText(publicUrl); setCopied(true); }}>
          {copied ? t.copied : t.copyLink}</button>
      </div>
      {!anchor && <button className="btn" onClick={doAnchor} style={{ marginBottom: 8 }}>{t.anchorBtn}</button>}
      {anchor === "busy" && <Busy msg={t.anchoring} />}
      {anchor?.error && <div className="error-box">{t.anchorError}</div>}
      {anchor?.status && (<>
        <Verdict kind="ok" title={anchor.status === "registered" ? t.anchoredOk : t.anchoredAlready} />
        <a className="hint" href={anchor.explorerUrl} target="_blank" rel="noopener noreferrer">{t.anchorView}</a>
      </>)}
      <button className="btn gold" onClick={downloadCert} style={{ marginTop: 8 }}>{t.downloadCertReg}</button>
      {pdfBlob && <button className="btn quiet" style={{ marginTop: 8 }}
        onClick={() => downloadBlob(pdfBlob, rec.file_name)}>{t.downloadPdf}</button>}
      <div className="btn-row" style={{ marginTop: 12 }}>
        <button className="btn quiet" onClick={() => { setRec(null); setAnchor(null); setAlready(false); setCopied(false); }}>{t.registerAnother}</button>
        <Link className="btn quiet" to="/dashboard">{t.dashboardTitle}</Link>
      </div>
    </div>
  );

  return (
    <div className="card">
      <h2>{t.issuerFlowTitle}</h2>
      <p style={{ color: "var(--muted)", fontSize: 13 }}>{t.issuerFlowDesc}</p>
      {err && <div className="error-box">{err}</div>}
      <Dropzone label={t.dropPdf + " " + t.browse} sub={t.dropSubtext} onFile={onPdf} />
      <div style={{ margin: "10px 0" }} />
      <Dropzone label={t.pickImage} sub={t.captureHint} accept="image/*" onFile={onImage} />
    </div>
  );
}
```

- [ ] **Step 2: `Dashboard.jsx`**

```jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLang } from "../i18n/useLang.jsx";
import { supabaseQuery, currentUserId } from "../lib/supabase.js";
import { anchorOnChain } from "../lib/onchain.js";
import { formatDate } from "../lib/format.js";

export default function Dashboard() {
  const { t, lang } = useLang();
  const [docs, setDocs] = useState(null); const [err, setErr] = useState("");

  const load = async () => {
    try {
      setDocs(await supabaseQuery("documents", { auth: true,
        filters: `issuer_id=eq.${currentUserId()}&select=*,verifications(count)&order=registered_at.desc` }));
    } catch (e) { setErr(e.message); }
  };
  useEffect(() => { load(); }, []);

  const retry = async (doc) => {
    setDocs((d) => d.map((x) => x.id === doc.id ? { ...x, anchor_status: "pending" } : x));
    try { await anchorOnChain(doc.hash); } catch {}
    load();
  };

  const anchorLabel = { none: t.anchorNone, pending: t.anchorPending, anchored: t.anchorAnchored, failed: t.anchorFailed };

  return (
    <>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>{t.dashboardTitle}</h2>
        <Link className="btn" to="/register">{t.registerNew}</Link>
      </div>
      {err && <div className="error-box">{err}</div>}
      {docs && docs.length === 0 && <p className="hint">{t.noDocsYet}</p>}
      {docs && docs.map((d) => (
        <Link key={d.id} to={`/verify/${d.public_id}`} className="card doc-list-item">
          <div className="kv"><span>{t.fileLabel}</span><b>{d.file_name}</b></div>
          <div className="kv"><span>{t.registeredLabel}</span><b>{formatDate(d.registered_at, lang)}</b></div>
          <div className="kv"><span>{t.verifCountLabel}</span><b>{d.verifications?.[0]?.count ?? 0}</b></div>
          <div className="kv" style={{ borderBottom: "none" }}><span>⛓</span>
            <b>{d.anchor_status === "failed"
              ? <button className="btn quiet" style={{ width: "auto", padding: "4px 10px", fontSize: 12 }}
                  onClick={(e) => { e.preventDefault(); retry(d); }}>{anchorLabel.failed}</button>
              : anchorLabel[d.anchor_status]}</b></div>
        </Link>
      ))}
    </>
  );
}
```

- [ ] **Step 3: Verify manually** — dev server: log in → register a small PDF → public link + copy button appear → anchor (needs Netlify env; if running locally without functions, expect the anchor error box — that's the designed failure path) → dashboard lists the doc with count 0.

- [ ] **Step 4: Commit** — `git add src/pages/Register.jsx src/pages/Dashboard.jsx && git commit -m "feat: register and dashboard pages"`

---

### Task 15: Verify pages + delete the monolith remains

**Files:**
- Rewrite: `src/pages/Verify.jsx`, `src/pages/VerifyDocument.jsx`

- [ ] **Step 1: `Verify.jsx`** (upload-first public verification)

```jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLang } from "../i18n/useLang.jsx";
import { hashFile } from "../lib/crypto.js";
import { supabaseQuery } from "../lib/supabase.js";
import Dropzone from "../components/Dropzone.jsx";
import Verdict from "../components/Verdict.jsx";
import Busy from "../components/Busy.jsx";

export default function Verify() {
  const { t } = useLang();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const [miss, setMiss] = useState(null);

  const onFile = async (file) => {
    if (file.type !== "application/pdf") { setErr(t.invalidPdf); return; }
    setErr(""); setBusy(true); setMiss(null);
    try {
      const hash = await hashFile(file);
      const found = await supabaseQuery("documents", { filters: `hash=eq.${hash}&select=public_id` });
      await supabaseQuery("verifications", { method: "POST", body: {
        checked_hash: hash, result: found.length ? "authentic" : "not_found",
        document_id: found.length ? undefined : null,
      }}).catch(() => {});
      if (found.length) nav(`/verify/${found[0].public_id}?match=1`);
      else setMiss(hash);
    } catch (e) { setErr(t.connectionError + e.message); }
    setBusy(false);
  };

  if (busy) return <Busy msg={t.checking} />;
  return (
    <div className="card">
      <h2>{t.verifierFlowTitle}</h2>
      {err && <div className="error-box">{err}</div>}
      {miss && (<>
        <Verdict kind="bad" title={t.notFound} detail={t.notFoundHint} />
        <div className="hashbox">{miss}</div>
      </>)}
      <Dropzone label={t.dropPdfVerify + " " + t.browse} sub={t.verifySubtext} onFile={onFile} />
    </div>
  );
}
```

Note: when found, the verification row is logged from `VerifyDocument` (which knows `document_id`); the `not_found` case logs here with `document_id: null`. Change the insert above to only run in the not-found branch:

```js
      if (found.length) { nav(`/verify/${found[0].public_id}?match=1`); }
      else {
        await supabaseQuery("verifications", { method: "POST", body: {
          checked_hash: hash, result: "not_found", document_id: null,
        }}).catch(() => {});
        setMiss(hash);
      }
```
Use this corrected version, not the first insert block.

- [ ] **Step 2: `VerifyDocument.jsx`** (the QR/public-link page)

```jsx
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useLang } from "../i18n/useLang.jsx";
import { hashFile } from "../lib/crypto.js";
import { supabaseQuery, rpc } from "../lib/supabase.js";
import { checkOnChain } from "../lib/onchain.js";
import { generateCertificatePdf } from "../lib/certificate.js";
import { fmtCertDate, formatDate } from "../lib/format.js";
import Dropzone from "../components/Dropzone.jsx";
import Verdict from "../components/Verdict.jsx";
import Busy from "../components/Busy.jsx";

export default function VerifyDocument() {
  const { t, lang } = useLang();
  const { publicId } = useParams();
  const [params] = useSearchParams();
  const [doc, setDoc] = useState(undefined); // undefined=loading, null=not found
  const [count, setCount] = useState(null);
  const [match, setMatch] = useState(params.get("match") === "1" ? true : null);
  const [busy, setBusy] = useState(false);
  const [chain, setChain] = useState(null);
  const [vName, setVName] = useState(""); const [vRole, setVRole] = useState(""); const [vEntity, setVEntity] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const rows = await supabaseQuery("documents",
          { filters: `public_id=eq.${publicId}&select=*,profiles(company_name)` });
        setDoc(rows[0] || null);
        if (rows[0]) {
          rpc("verification_count", { doc_id: rows[0].id }).then(setCount).catch(() => {});
          checkOnChain(rows[0].hash).then(setChain).catch(() => {});
        }
      } catch { setDoc(null); }
    })();
  }, [publicId]);

  const onFile = async (file) => {
    setBusy(true);
    const ok = (await hashFile(file)) === doc.hash;
    setMatch(ok);
    await supabaseQuery("verifications", { method: "POST", body: {
      checked_hash: doc.hash, result: ok ? "authentic" : "not_found",
      document_id: ok ? doc.id : null,
      verifier_name: vName.trim() || null, verifier_role: vRole.trim() || null, verifier_entity: vEntity.trim() || null,
    }}).catch(() => {});
    setBusy(false);
  };

  const downloadCert = () => generateCertificatePdf({
    kind: "verificacion", lang, autentico: true, archivo: doc.file_name, hash: doc.hash,
    verificadorNombre: vName.trim(), verificadorCargo: vRole.trim(), verificadorEntidad: vEntity.trim(),
    fechaVerificacion: fmtCertDate(new Date().toISOString(), lang),
    emisorNombre: "", emisorCargo: "", emisorCompania: doc.profiles?.company_name || "",
    fechaRegistro: fmtCertDate(doc.registered_at, lang),
    txHash: doc.anchor_tx || null, red: "Base",
    explorerUrl: chain?.contractUrl || null,
    publicUrl: `${window.location.origin}/verify/${doc.public_id}`,
  });

  if (doc === undefined) return <Busy msg={t.working} />;
  if (doc === null) return <div className="card"><Verdict kind="bad" title={t.recordNotFound} detail={t.recordNotFoundHint} /></div>;

  return (
    <div className="card">
      {match === null && <Verdict kind="info" title={t.registeredOk.replace("!", "")}
        detail={`${t.registeredOn} ${formatDate(doc.registered_at, lang)}${doc.anchor_status === "anchored" ? " · ⛓ Base" : ""}`} />}
      {match === true && <Verdict kind="ok" title={t.matchOk} />}
      {match === false && <Verdict kind="bad" title={t.matchFail} detail={t.notFoundHint} />}

      <div className="kv"><span>{t.fileLabel}</span><b>{doc.file_name}</b></div>
      <div className="kv"><span>{t.issuedBy}</span><b>{doc.profiles?.company_name || "—"}</b></div>
      {count !== null && <div className="kv"><span>{t.verifCountLabel}</span><b>{count}</b></div>}
      <div className="hashbox">{doc.hash}</div>
      {chain?.exists && <p className="hint"><a href={chain.contractUrl} target="_blank" rel="noopener noreferrer">{t.onchainYes} — {t.onchainView}</a></p>}

      {busy && <Busy msg={t.checking} />}
      {match !== true && !busy && (<>
        <Dropzone label={t.uploadYourCopy} sub={t.verifySubtext} onFile={onFile} />
        <div style={{ marginTop: 14 }}>
          <p className="hint" style={{ textAlign: "left" }}><b>{t.optIdTitle}</b><br />{t.optIdHint}</p>
          <div className="field"><input placeholder={t.nameLabel} value={vName} onChange={(e) => setVName(e.target.value)} /></div>
          <div className="field"><input placeholder={t.roleLabel} value={vRole} onChange={(e) => setVRole(e.target.value)} /></div>
          <div className="field"><input placeholder={t.companyLabel} value={vEntity} onChange={(e) => setVEntity(e.target.value)} /></div>
        </div>
      </>)}
      {match === true && <button className="btn gold" onClick={downloadCert}>{t.downloadCertVer}</button>}
    </div>
  );
}
```

- [ ] **Step 3: Full build + tests**

Run: `npm test && npm run build`
Expected: all unit tests pass; build succeeds with no warnings about missing imports.

- [ ] **Step 4: Commit** — `git add src/pages/Verify.jsx src/pages/VerifyDocument.jsx && git commit -m "feat: public verification pages with optional identity"`

---

### Task 16: E2E checklist + wrap-up

**Files:**
- Create: `docs/superpowers/e2e-checklist.md`

- [ ] **Step 1: Write the manual E2E checklist**

```markdown
# DocSeal Manual E2E Checklist

Run on the Netlify deploy preview of the `reengineering` branch.

- [ ] Sign up as a new issuer (email+password+company) → lands on dashboard
- [ ] Register a PDF → success banner, public link + QR-ready URL shown
- [ ] Anchor on Base → status becomes "Anclado", BaseScan link opens
- [ ] Download registration certificate → QR opens /verify/:id on a phone
- [ ] Open the public link on a phone (no login) → record + issuer shown
- [ ] Upload the ORIGINAL pdf on /verify/:id → green "coincide" verdict
- [ ] Upload an ALTERED pdf → red "NO coincide" verdict
- [ ] Verify anonymously vs with name filled → named one appears in dashboard audit count
- [ ] /verify (upload-first) with an unregistered pdf → "no encontrado"
- [ ] /verify/xxxxxxxxxx (bogus id) → "Registro no encontrado" page
- [ ] Anchor endpoint refuses curl without token (401)
- [ ] ES/EN toggle works on every page
- [ ] Old anon insert into documents is blocked (RLS curl from Task 5)
```

- [ ] **Step 2: Run the full local gate** — `npm test && npm run build` → green.

- [ ] **Step 3: Commit and push the branch**

```bash
git add docs/superpowers/e2e-checklist.md
git commit -m "docs: manual E2E checklist"
git push -u origin reengineering
```
Netlify builds a deploy preview for the branch; run the checklist there. Merge to `main` only after the checklist passes.

---

## Self-review notes (already applied)

- Spec coverage: §3 pages → Tasks 12–15; §4 schema/RLS → Task 5; §5 functions → Tasks 4, 6; §6 modules → Tasks 2–3, 8–11; §7 theme → Task 7; §8 error handling → inline in pages (error boxes, failed-anchor retry, not-found page); §9 testing → Tasks 2–4 + 16.
- Certificate issuer fields: the new schema has no per-document issuer name/role (identity now lives in `profiles`), so certificate calls pass `emisorCompania` from the profile and empty strings for name/cargo — acceptable for the demo; noted as a future refinement to add profile contact details to certificates.
- Type consistency: `public_id`/`anchor_status` names match between SQL (Task 5), functions (Task 6), and pages (Tasks 14–15). `verifications(count)` embed relies on the FK created in Task 5.
