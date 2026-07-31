import { useState } from "react";
import { Link } from "react-router-dom";
import { useLang } from "../i18n/useLang.jsx";
import { hashBytes } from "../lib/crypto.js";
import { imageToPdf } from "../lib/imageToPdf.js";
import { supabaseQuery, currentUserId } from "../lib/supabase.js";
import { anchorOnChain, txUrl } from "../lib/onchain.js";
import { generateCertificatePdf } from "../lib/certificate.js";
import { fmtCertDate, downloadBlob } from "../lib/format.js";
import Dropzone from "../components/Dropzone.jsx";
import Verdict from "../components/Verdict.jsx";
import Busy from "../components/Busy.jsx";

export default function Register() {
  const { t, lang } = useLang();
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [rec, setRec] = useState(null);
  const [already, setAlready] = useState(false);
  const [pdfBlob, setPdfBlob] = useState(null);
  const [anchor, setAnchor] = useState(null);
  const [copied, setCopied] = useState(false);

  const publicUrl = rec ? `${window.location.origin}/verify/${rec.public_id}` : "";

  const registerBytes = async (bytes, fileName, size, blob) => {
    const hash = await hashBytes(bytes);
    const existing = await supabaseQuery("documents", { filters: `hash=eq.${hash}&select=*` });
    if (existing.length > 0) { setRec(existing[0]); setAlready(true); return; }
    setBusy(t.registering);
    const inserted = await supabaseQuery("documents", { method: "POST", auth: true, body: {
      hash, file_name: fileName, file_size: size, issuer_id: currentUserId(),
    }});
    setRec(inserted[0]);
    setPdfBlob(blob || null);
  };

  const onPdf = async (file) => {
    if (file.type !== "application/pdf") { setErr(t.invalidPdf); return; }
    setErr("");
    setBusy(t.computingHash);
    try { await registerBytes(await file.arrayBuffer(), file.name, file.size); }
    catch (e) { setErr(t.genericError + e.message); }
    setBusy("");
  };

  const onImage = async (file) => {
    if (!file.type.startsWith("image/")) { setErr(t.invalidImage); return; }
    setErr("");
    setBusy(t.buildingPdf);
    try {
      const { pdfBlob: blob, pdfBytes, fileName } = await imageToPdf(file);
      await registerBytes(pdfBytes, fileName, pdfBytes.byteLength, blob);
    } catch (e) { setErr(t.genericError + e.message); }
    setBusy("");
  };

  const doAnchor = async () => {
    setAnchor("busy");
    try { setAnchor(await anchorOnChain(rec.hash)); }
    catch { setAnchor({ error: true }); }
  };

  const downloadCert = () => {
    const tx = anchor?.txHash || rec.anchor_tx || null;
    return generateCertificatePdf({
      kind: "registro", lang, archivo: rec.file_name, hash: rec.hash,
      emisorNombre: "", emisorCargo: "", emisorCompania: "",
      fechaRegistro: fmtCertDate(rec.registered_at, lang),
      txHash: tx, txExplorerUrl: tx ? txUrl(tx) : null, red: "Base",
      explorerUrl: anchor?.explorerUrl || null, publicUrl,
    });
  };

  if (busy) return <Busy msg={busy} />;

  if (rec) return (
    <div className="card">
      <Verdict kind={already ? "info" : "ok"} title={already ? t.alreadyRegistered : t.registeredOk} />
      <div className="kv"><span>{t.fileLabel}</span><b>{rec.file_name}</b></div>
      <div className="hashbox">{rec.hash}</div>
      <div className="field"><label>{t.publicLinkLabel}</label>
        <div className="hashbox" style={{ fontSize: 13 }}>{publicUrl}</div>
        <button className="btn quiet" onClick={() => { navigator.clipboard.writeText(publicUrl); setCopied(true); }}>
          {copied ? t.copied : t.copyLink}</button>
      </div>
      {!anchor && <button className="btn" onClick={doAnchor} style={{ marginBottom: 8 }}>{t.anchorBtn}</button>}
      {anchor === "busy" && <Busy msg={t.anchoring} />}
      {anchor?.error && <div className="error-box">{t.anchorError}</div>}
      {anchor?.status && (<>
        <Verdict kind="ok" title={anchor.status === "registered" ? t.anchoredOk : t.anchoredAlready} />
        <a className="hint" href={anchor.explorerUrl} target="_blank" rel="noopener noreferrer">{t.anchorView}</a>
      </>)}
      <button className="btn gold" onClick={downloadCert} style={{ marginTop: 8 }}>{t.downloadCertReg}</button>
      {pdfBlob && <button className="btn quiet" style={{ marginTop: 8 }}
        onClick={() => downloadBlob(pdfBlob, rec.file_name)}>{t.downloadPdf}</button>}
      <div className="btn-row" style={{ marginTop: 12 }}>
        <button className="btn quiet" onClick={() => { setRec(null); setAnchor(null); setAlready(false); setCopied(false); setPdfBlob(null); }}>{t.registerAnother}</button>
        <Link className="btn quiet" to="/dashboard">{t.dashboardTitle}</Link>
      </div>
    </div>
  );

  return (
    <div className="card">
      <h2>{t.issuerFlowTitle}</h2>
      <p style={{ color: "var(--muted)", fontSize: 13 }}>{t.issuerFlowDesc}</p>
      {err && <div className="error-box">{err}</div>}
      <Dropzone label={t.dropPdf + " " + t.browse} sub={t.dropSubtext} onFile={onPdf} />
      <div style={{ margin: "10px 0" }} />
      <Dropzone label={t.pickImage} sub={t.captureHint} accept="image/*" onFile={onImage} />
    </div>
  );
}
