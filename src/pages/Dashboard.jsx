import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLang } from "../i18n/useLang.jsx";
import { supabaseQuery, currentUserId } from "../lib/supabase.js";
import { anchorOnChain } from "../lib/onchain.js";
import { formatDate } from "../lib/format.js";

export default function Dashboard() {
  const { t, lang } = useLang();
  const [docs, setDocs] = useState(null);
  const [err, setErr] = useState("");

  const load = async () => {
    try {
      setDocs(await supabaseQuery("documents", { auth: true,
        filters: `issuer_id=eq.${currentUserId()}&select=*,verifications(count)&order=registered_at.desc` }));
    } catch (e) { setErr(e.message); }
  };
  useEffect(() => { load(); }, []);

  const retry = async (doc) => {
    setDocs((d) => d.map((x) => x.id === doc.id ? { ...x, anchor_status: "pending" } : x));
    try { await anchorOnChain(doc.hash); } catch {}
    load();
  };

  const anchorLabel = { none: t.anchorNone, pending: t.anchorPending, anchored: t.anchorAnchored, failed: t.anchorFailed };

  return (
    <>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>{t.dashboardTitle}</h2>
        <Link className="btn" to="/register">{t.registerNew}</Link>
      </div>
      {err && <div className="error-box">{err}</div>}
      {docs && docs.length === 0 && <p className="hint">{t.noDocsYet}</p>}
      {docs && docs.map((d) => (
        <Link key={d.id} to={`/verify/${d.public_id}`} className="card doc-list-item">
          <div className="kv"><span>{t.fileLabel}</span><b>{d.file_name}</b></div>
          <div className="kv"><span>{t.registeredLabel}</span><b>{formatDate(d.registered_at, lang)}</b></div>
          <div className="kv"><span>{t.verifCountLabel}</span><b>{d.verifications?.[0]?.count ?? 0}</b></div>
          <div className="kv" style={{ borderBottom: "none" }}><span>⛓</span>
            <b>{d.anchor_status === "failed"
              ? <button className="btn quiet" style={{ width: "auto", padding: "4px 10px", fontSize: 12 }}
                  onClick={(e) => { e.preventDefault(); retry(d); }}>{anchorLabel.failed}</button>
              : anchorLabel[d.anchor_status]}</b></div>
        </Link>
      ))}
    </>
  );
}
