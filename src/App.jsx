import { Routes, Route, Link, Navigate, useLocation } from "react-router-dom";
import { LangProvider, useLang } from "./i18n/useLang.jsx";
import { getSession, signOut } from "./lib/supabase.js";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Register from "./pages/Register.jsx";
import Verify from "./pages/Verify.jsx";
import VerifyDocument from "./pages/VerifyDocument.jsx";
import Aseguradoras from "./pages/Aseguradoras.jsx";
import Entidades from "./pages/Entidades.jsx";

function RequireAuth({ children }) {
  return getSession() ? children : <Navigate to="/login" replace />;
}

/* The two lanes of the product, visible on every screen: the surety registers
   the policy it issues, the public entity verifies the copy it receives. */
function LaneBar() {
  const { t } = useLang();
  const { pathname } = useLocation();
  const issuerLane = ["/login", "/dashboard", "/register"].some((p) => pathname.startsWith(p));
  const entityLane = pathname.startsWith("/verify");
  return (
    <nav className="lanebar" aria-label={t.laneNavLabel}>
      <Link className={"lane-tab" + (issuerLane ? " active" : "")} to="/dashboard">
        <span className="who">{t.laneIssuerShort}</span>
        <span className="does">{t.laneIssuerAction}</span>
      </Link>
      <Link className={"lane-tab" + (entityLane ? " active" : "")} to="/verify">
        <span className="who">{t.laneEntityShort}</span>
        <span className="does">{t.laneEntityAction}</span>
      </Link>
    </nav>
  );
}

function Frame({ children }) {
  const { t, lang, toggle } = useLang();
  const loggedIn = !!getSession();
  const { pathname } = useLocation();
  return (
    <>
      <div className="topbar" /><div className="goldline" />
      <div className="frame">
        <header className="site-header">
          <Link to="/" style={{ textDecoration: "none" }}><div className="seal">✦</div></Link>
          <div>
            <h1 className="site-title">DocSeal</h1>
            <div className="site-sub">{t.appSubtitle}</div>
          </div>
          <div className="header-spacer">
            {loggedIn && pathname.startsWith("/dash") && (
              <a className="btn quiet" style={{ width: "auto", padding: "6px 12px", fontSize: 12 }}
                 href="/" onClick={(e) => { e.preventDefault(); signOut(); window.location.href = "/"; }}>{t.signOut}</a>
            )}
            <button className="btn quiet" style={{ width: "auto", padding: "6px 12px", fontSize: 12 }} onClick={toggle}>
              {lang === "es" ? "EN" : "ES"}
            </button>
          </div>
        </header>
        {pathname !== "/" && <LaneBar />}
        {children}
        <footer className="site-footer">{t.footerText}</footer>
      </div>
    </>
  );
}

export default function App() {
  return (
    <LangProvider>
      <Frame>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/aseguradoras" element={<Aseguradoras />} />
          <Route path="/entidades" element={<Entidades />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/register" element={<RequireAuth><Register /></RequireAuth>} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/verify/:publicId" element={<VerifyDocument />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Frame>
    </LangProvider>
  );
}
