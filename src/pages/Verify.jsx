import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLang } from "../i18n/useLang.jsx";
import { hashFile } from "../lib/crypto.js";
import { verifyHash } from "../lib/registry.js";
import Dropzone from "../components/Dropzone.jsx";
import Verdict from "../components/Verdict.jsx";
import Busy from "../components/Busy.jsx";

export default function Verify() {
  const { t } = useLang();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [miss, setMiss] = useState(null);

  const onFile = async (file) => {
    if (file.type !== "application/pdf") { setErr(t.invalidPdf); return; }
    setErr("");
    setBusy(true);
    setMiss(null);
    try {
      const hash = await hashFile(file);
      const { match, publicId } = await verifyHash(hash);
      if (match) {
        // The public page logs the "authentic" verification with the document id.
        nav(`/verify/${publicId}?match=1`);
      } else {
        setMiss(hash);
      }
    } catch (e) { setErr(t.connectionError + e.message); }
    setBusy(false);
  };

  if (busy) return <Busy msg={t.checking} />;
  return (
    <div className="card">
      <h2>{t.verifierFlowTitle}</h2>
      {err && <div className="error-box">{err}</div>}
      {miss && (<>
        <Verdict kind="bad" title={t.notFound} detail={t.notFoundHint} />
        <div className="hashbox">{miss}</div>
      </>)}
      <Dropzone label={t.dropPdfVerify + " " + t.browse} sub={t.verifySubtext} onFile={onFile} />
    </div>
  );
}
