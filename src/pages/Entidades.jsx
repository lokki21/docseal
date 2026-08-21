import { Link } from "react-router-dom";
import { useLang } from "../i18n/useLang.jsx";
import WhatItDoesNot from "../components/WhatItDoesNot.jsx";

export default function Entidades() {
  const { t } = useLang();
  return (
    <>
      <div className="card">
        <div className="eyebrow-line">{t.laneEntityRole}</div>
        <h2 style={{ marginTop: 0, marginBottom: 8 }}>{t.entHeading}</h2>
        <p style={{ color: "var(--muted)", fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>
          {t.entBody}
        </p>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>{t.entCheckTitle}</h3>
        <ol className="flow-steps">
          <li>{t.entCheck1}</li>
          <li>{t.entCheck2}</li>
          <li>{t.entCheck3}</li>
        </ol>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>{t.entFileTitle}</h3>
        <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
          {t.entFileBody}
        </p>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>{t.fitTitle}</h3>
        <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.6, marginTop: 0, marginBottom: 16 }}>
          {t.fitBody}
        </p>
        <WhatItDoesNot />
      </div>

      <Link className="btn gold" to="/verify">{t.entVerifyCta}</Link>
    </>
  );
}
