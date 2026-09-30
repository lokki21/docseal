// Llamadas a las Netlify Functions. El anclaje requiere sesión de aseguradora;
// la verificación on-chain es pública (solo lectura).
import { accessToken } from "./supabase.js";

// Debe coincidir con CHAIN_ID del servidor: sepolia (testnet) hoy; cambiar a
// https://basescan.org al pasar a mainnet.
export const EXPLORER_BASE = "https://sepolia.basescan.org";
export function txUrl(txHash) {
  return `${EXPLORER_BASE}/tx/${txHash}`;
}

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
