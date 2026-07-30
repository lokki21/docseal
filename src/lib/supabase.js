// REST + GoTrue helpers. No SDK; sessions live in localStorage.
// The anon key is public by design — RLS policies are the security boundary.
export const SUPABASE_URL = "https://tqgpqkoonwywvuhbktge.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxZ3Bxa29vbnd5d3Z1aGJrdGdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5ODk4MzYsImV4cCI6MjA4NjU2NTgzNn0.quMGZFWadittF99dQKxf4o7RYH-Fet5BM8nnhHxlFxg";

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
