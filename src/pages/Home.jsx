import { Link } from "react-router-dom";
import { useLang } from "../i18n/useLang.jsx";

// Colors are inlined via style objects (not presentation attributes) so that
// CSS custom properties resolve reliably across browsers, Safari included.
const NAVY = "var(--navy)";
const GOLD = "var(--gold)";
const MUTED = "var(--muted)";
const sNode = { fill: NAVY, fontFamily: "var(--serif)", fontSize: 16 };
const sSub = { fill: MUTED, fontFamily: "var(--sans)", fontSize: 12 };
const sArrowLabel = { fill: NAVY, fontFamily: "var(--sans)", fontSize: 12.5 };
const sPath = { fill: "none", stroke: GOLD, strokeWidth: 1.6 };

function Node({ x, name, sub, sealed }) {
  return (
    <g>
      <rect x={x} y={140} width={124} height={54} rx={6}
            style={{ fill: "#ffffff", stroke: NAVY, strokeWidth: 1.5 }} />
      <text x={x + 62} y={163} textAnchor="middle" style={sNode}>{name}</text>
      <text x={x + 62} y={181} textAnchor="middle" style={sSub}>{sub}</text>
      {sealed && (
        <g>
          <circle cx={x + 13} cy={140} r={11}
                  style={{ fill: NAVY, stroke: GOLD, strokeWidth: 1.5 }} />
          <text x={x + 13} y={144.5} textAnchor="middle"
                style={{ fill: GOLD, fontSize: 11 }}>✦</text>
        </g>
      )}
    </g>
  );
}

function FlowDiagram({ t }) {
  return (
    <div className="flow-wrap">
      <svg viewBox="0 0 440 300" className="flow-svg" role="img" aria-label={t.flowTitle}>
        <defs>
          <marker id="ds-arrow" viewBox="0 0 10 10" refX="9" refY="5"
                  markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" style={{ fill: GOLD }} />
          </marker>
        </defs>

        {/* 3 — the surety issues the guarantee in favour of the beneficiary */}
        <path d="M 68 140 Q 220 42 372 140" style={sPath} markerEnd="url(#ds-arrow)" />
        <text x="220" y="66" textAnchor="middle" style={sArrowLabel}>{t.flowArrow3}</text>

        <Node x={6} name={t.roleSurety} sub={t.roleSuretySub} sealed />
        <Node x={158} name={t.rolePrincipal} sub={t.rolePrincipalSub} />
        <Node x={310} name={t.roleBeneficiary} sub={t.roleBeneficiarySub} sealed />

        {/* 2 — the principal requests the guarantee */}
        <path d="M 190 196 Q 130 252 76 204" style={sPath} markerEnd="url(#ds-arrow)" />
        <text x="126" y="276" textAnchor="middle" style={sArrowLabel}>{t.flowArrow2}</text>

        {/* 1 — the principal contracts with the public entity */}
        <path d="M 250 196 Q 310 252 364 204" style={sPath} markerEnd="url(#ds-arrow)" />
        <text x="314" y="276" textAnchor="middle" style={sArrowLabel}>{t.flowArrow1}</text>
      </svg>
    </div>
  );
}

export default function Home() {
  const { t } = useLang();
  return (
    <>
      <div className="card">
        <div className="eyebrow-line">{t.homeEyebrow}</div>
        <h2 style={{ marginTop: 0, marginBottom: 8 }}>{t.homeTagline}</h2>
        <p style={{ color: "var(--muted)", fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>
          {t.homeLead}
        </p>
      </div>

      <div className="lanes">
        <Link className="lane-card" to="/dashboard">
          <div className="role">{t.laneIssuerRole}</div>
          <div className="act">{t.laneIssuerAction}</div>
          <p>{t.laneIssuerDesc}</p>
          <span className="cta">{t.homeIssuerCta} →</span>
        </Link>
        <Link className="lane-card gold" to="/verify">
          <div className="role">{t.laneEntityRole}</div>
          <div className="act">{t.laneEntityAction}</div>
          <p>{t.laneEntityDesc}</p>
          <span className="cta">{t.homeVerifyCta} →</span>
        </Link>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>{t.flowTitle}</h3>
        <p style={{ color: "var(--muted)", fontSize: 12.5, lineHeight: 1.55, marginTop: 0 }}>
          {t.flowIntro}
        </p>
        <FlowDiagram t={t} />
        <ol className="flow-steps">
          <li>{t.flowStep1}</li>
          <li>{t.flowStep2}</li>
          <li className="sealed">{t.flowStep3}<span className="tag">{t.flowTagSeal}</span></li>
          <li className="sealed">{t.flowStep4}<span className="tag">{t.flowTagSeal}</span></li>
        </ol>
        <p className="hint" style={{ textAlign: "left", marginTop: 12 }}>{t.flowSealLegend}</p>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>{t.fitTitle}</h3>
        <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.6, marginTop: 0 }}>
          {t.fitBody}
        </p>
        <div className="banner info" style={{ textAlign: "left", marginBottom: 0 }}>
          <div className="eyebrow">{t.fitLimitTitle}</div>
          <div className="detail">{t.fitLimitBody}</div>
        </div>
      </div>

      <p className="hint">{t.welcomeNote}</p>
    </>
  );
}
