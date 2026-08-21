import { Link } from "react-router-dom";
import { useLang } from "../i18n/useLang.jsx";
import WhatItDoesNot from "../components/WhatItDoesNot.jsx";

export default function Aseguradoras() {
  const { t } = useLang();
  return (
    <>
      <div className="card">
        <div className="eyebrow-line">{t.laneIssuerRole}</div>
        <h2 style={{ marginTop: 0, marginBottom: 8 }}>{t.asegHeading}</h2>
        <p style={{ color: "var(--muted)", fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>
          {t.asegBody}
        </p>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>{t.asegGetTitle}</h3>
        <ul className="get-list">
          <li>{t.asegGet1}</li>
          <li>{t.asegGet2}</li>
          <li>{t.asegGet3}</li>
          <li>{t.asegGet4}</li>
        </ul>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>{t.flowTitle}</h3>
        <ol className="flow-steps">
          <li>{t.flowStep1}</li>
          <li>{t.flowStep2}</li>
          <li className="sealed">{t.flowStep3}<span className="tag">{t.flowTagSeal}</span></li>
          <li className="sealed">{t.flowStep4}<span className="tag">{t.flowTagSeal}</span></li>
        </ol>
        <p className="hint" style={{ textAlign: "left", marginTop: 12 }}>{t.flowSealLegend}</p>
      </div>

      <div className="card">
        <WhatItDoesNot />
      </div>

      <Link className="btn" to="/login">{t.homeIssuerCta}</Link>
    </>
  );
}
