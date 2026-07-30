import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLang } from "../i18n/useLang.jsx";
import { hashFile } from "../lib/crypto.js";
import { supabaseQuery } from "../lib/supabase.js";
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
      const found = await supabaseQuery("documents", { filters: `hash=eq.${hash}&select=public_id` });
      if (found.length) {
        // The public page logs the "authentic" verification with the document id.
        nav(`/verify/${found[0].public_id}?match=1`);
      } else {
        await supabaseQuery("verifications", { method: "POST", body: {
          checked_hash: hash, result: "not_found", document_id: null,
        }}).catch(() => {});
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
