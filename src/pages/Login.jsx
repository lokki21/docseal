import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLang } from "../i18n/useLang.jsx";
import { signIn } from "../lib/supabase.js";

export default function Login() {
  const { t } = useLang();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await signIn(email, password);
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
        <button className="btn" disabled={busy}>{t.signIn}</button>
      </form>
      <p className="hint">{t.accountsProvisioned}</p>
    </div>
  );
}
