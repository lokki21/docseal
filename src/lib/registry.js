// Shared register/verify orchestration. Used by the real Register/Verify pages
// and by the /demo page, so the demo can never drift from production behavior.
import { hashBytes } from "./crypto.js";
import { supabaseQuery, currentUserId } from "./supabase.js";
import { checkOnChain } from "./onchain.js";
import { decideVerdict } from "./verdict.js";

export async function findByHash(hash) {
  const rows = await supabaseQuery("documents", { filters: `hash=eq.${hash}&select=*` });
  return rows.length ? rows[0] : null;
}

// Idempotent: if the hash is already registered, returns the existing record
// with already:true and performs no insert.
export async function registerDocument(bytes, fileName, size) {
  const hash = await hashBytes(bytes);
  const existing = await findByHash(hash);
  if (existing) return { record: existing, already: true };
  const inserted = await supabaseQuery("documents", {
    method: "POST", auth: true,
    body: { hash, file_name: fileName, file_size: size, issuer_id: currentUserId() },
  });
  return { record: inserted[0], already: false };
}

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
