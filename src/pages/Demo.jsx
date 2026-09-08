import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import QRCode from "qrcode";
import { useLang } from "../i18n/useLang.jsx";
import { hashBytes } from "../lib/crypto.js";
import { registerDocument, verifyHash } from "../lib/registry.js";
import { anchorOnChain } from "../lib/onchain.js";
import { DEMO_POLICIES, TAMPERED, fetchDemoFile } from "../lib/demoData.js";
import Verdict from "../components/Verdict.jsx";
import Busy from "../components/Busy.jsx";

export default function Demo() {
  const { t, lang } = useLang();
  const [sel, setSel] = useState(null);
  const [rec, setRec] = useState(null);
  const [already, setAlready] = useState(false);
  const [qr, setQr] = useState("");
  const [anchor, setAnchor] = useState(null);
  const [pass, setPass] = useState(null);
  const [fail, setFail] = useState(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  const publicUrl = rec ? `${window.location.origin}/verify/${rec.public_id}` : "";

  useEffect(() => {
    if (!publicUrl) { setQr(""); return; }
    QRCode.toDataURL(publicUrl, { margin: 1, width: 160 }).then(setQr).catch(() => setQr(""));
  }, [publicUrl]);

  const title = (p) => (lang === "en" ? p.titleEn : p.titleEs);
  const desc = (p) => (lang === "en" ? p.descEn : p.descEs);

  const pick = (p) => {
    setSel(p); setRec(null); setAlready(false); setAnchor(null);
    setPass(null); setFail(null); setErr("");
  };

  const notarize = async () => {
    setErr(""); setBusy(t.demoBusyNotarize);
    try {
      const file = await fetchDemoFile(sel.file);
      const { record, already } = await registerDocument(await file.arrayBuffer(), file.name, file.size);
      setRec(record); setAlready(already);
    } catch (e) { setErr(t.demoLoadError + e.message); }
    setBusy("");
  };

  const doAnchor = async () => {
    setAnchor("busy");
    try { setAnchor(await anchorOnChain(rec.hash)); }
    catch { setAnchor({ error: true }); }
  };

  const verifyAuthentic = async () => {
    setErr(""); setBusy(t.demoBusyVerify);
    try {
      const file = await fetchDemoFile(sel.file);
      setPass(await verifyHash(await hashBytes(await file.arrayBuffer())));
    } catch (e) { setErr(t.demoLoadError + e.message); }
    setBusy("");
  };

  const verifyTampered = async () => {
    setErr(""); setBusy(t.demoBusyVerify);
    try {
      const file = await fetchDemoFile(TAMPERED.file);
      const hash = await hashBytes(await file.arrayBuffer());
      setFail({ ...(await verifyHash(hash)), hash });
    } catch (e) { setErr(t.demoLoadError + e.message); }
    setBusy("");
  };

  if (busy) return <Busy msg={busy} />;

  return (
    <>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>{t.demoTitle}</h2>
        <p style={{ color: "var(--muted)", fontSize: 13 }}>{t.demoIntro}</p>
        {err && <div className="error-box">{err}</div>}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>{t.demoStepPick}</h3>
        {DEMO_POLICIES.map((p) => (
          <button key={p.id}
            className={"btn quiet" + (sel?.id === p.id ? " gold" : "")}
            style={{ textAlign: "left", marginBottom: 8 }}
            onClick={() => pick(p)}>
            <b>{title(p)}</b><br /><span style={{ fontSize: 12 }}>{desc(p)}</span>
          </button>
        ))}
      </div>

      {sel && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{t.demoStepNotarize}</h3>
          {!rec && <button className="btn" onClick={notarize}>{t.demoNotarizeBtn}</button>}
          {rec && (<>
            <Verdict kind={already ? "info" : "ok"} title={already ? t.demoAlready : t.demoRegistered} />
            <div className="hashbox">{rec.hash}</div>
            <div className="field"><label>{t.demoPublicLink}</label>
              <div className="hashbox" style={{ fontSize: 13 }}>{publicUrl}</div>
            </div>
            {qr && <img src={qr} alt="QR" style={{ display: "block", margin: "8px 0" }} />}
            {!anchor && <button className="btn" onClick={doAnchor}>{t.demoAnchorBtn}</button>}
            {anchor === "busy" && <Busy msg={t.anchoring} />}
            {anchor?.error && <div className="error-box">{t.anchorError}</div>}
            {anchor?.status && <Verdict kind="ok" title={t.anchoredOk} />}
          </>)}
        </div>
      )}

      {rec && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{t.demoStepVerify}</h3>
          {!pass && <button className="btn" onClick={verifyAuthentic}>{t.demoVerifyBtn}</button>}
          {pass?.match && (<>
            <Verdict kind="ok" title={t.demoPassTitle} detail={t.demoPassDetail} />
            <Link className="btn quiet" to={`/verify/${pass.publicId}?match=1`}>{t.demoOpenPublic}</Link>
          </>)}
        </div>
      )}

      {pass?.match && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{t.demoStepTamper}</h3>
          {!fail && <button className="btn" onClick={verifyTampered}>{t.demoVerifyTamperBtn}</button>}
          {fail && (<>
            <Verdict kind="bad" title={t.demoFailTitle} detail={t.demoFailDetail} />
            <div className="kv" style={{ borderBottom: "none" }}><span>{t.demoRegisteredHash}</span></div>
            <div className="hashbox">{rec.hash}</div>
            <div className="kv" style={{ borderBottom: "none" }}><span>{t.demoTamperedHash}</span></div>
            <div className="hashbox">{fail.hash}</div>
          </>)}
        </div>
      )}
    </>
  );
}
