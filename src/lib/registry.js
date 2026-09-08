// Shared register/verify orchestration. Used by the real Register/Verify pages
// and by the /demo page, so the demo can never drift from production behavior.
import { hashBytes } from "./crypto.js";
import { supabaseQuery, currentUserId } from "./supabase.js";

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

export async function verifyHash(hash) {
  const found = await supabaseQuery("documents", { filters: `hash=eq.${hash}&select=public_id` });
  if (found.length) return { match: true, publicId: found[0].public_id };
  // Log the miss for the audit trail (best-effort; matches current Verify.jsx).
  await supabaseQuery("verifications", {
    method: "POST", body: { checked_hash: hash, result: "not_found", document_id: null },
  }).catch(() => {});
  return { match: false, publicId: null };
}
