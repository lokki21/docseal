import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLang } from "../i18n/useLang.jsx";
import { signIn, signUp, supabaseQuery, currentUserId } from "../lib/supabase.js";

export default function Login() {
  const { t } = useLang();
  const nav = useNavigate();
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  const [contact, setContact] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
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
