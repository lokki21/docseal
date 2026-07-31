import { Routes, Route, Link, Navigate, useLocation } from "react-router-dom";
import { LangProvider, useLang } from "./i18n/useLang.jsx";
import { getSession, signOut } from "./lib/supabase.js";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Register from "./pages/Register.jsx";
import Verify from "./pages/Verify.jsx";
import VerifyDocument from "./pages/VerifyDocument.jsx";

function RequireAuth({ children }) {
  return getSession() ? children : <Navigate to="/login" replace />;
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
