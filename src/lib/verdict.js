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
