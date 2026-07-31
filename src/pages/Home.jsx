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
