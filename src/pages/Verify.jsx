import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLang } from "../i18n/useLang.jsx";
import { hashFile } from "../lib/crypto.js";
import { resolveVerdict } from "../lib/registry.js";
import { VERDICT } from "../lib/verdict.js";
import Dropzone from "../components/Dropzone.jsx";
import Verdict from "../components/Verdict.jsx";
import Busy from "../components/Busy.jsx";

export default function Verify() {
  const { t } = useLang();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState(null); // { verdict, hash, doc }

  const onFile = async (file) => {
    if (file.type !== "application/pdf") { setErr(t.invalidPdf); return; }
    setErr(""); setBusy(true); setResult(null);
    try {
      const hash = await hashFile(file);
      const { verdict, doc } = await resolveVerdict(hash);
      if (verdict === VERDICT.AUTHENTIC && doc?.public_id) {
        nav(`/verify/${doc.public_id}?h=${hash}&match=1`);
        return;
      }
      setResult({ verdict, hash, doc });
    } catch (e) { setErr(t.connectionError + e.message); }
    setBusy(false);
  };

  if (busy) return <Busy msg={t.vCheckingChain} />;

  const banner = result && ({
    [VERDICT.AUTHENTIC]: { kind: "ok", title: t.matchOk },
    [VERDICT.NOT_ANCHORED]: { kind: "warn", title: t.vNotAnchored, detail: t.vNotAnchoredHint },
    [VERDICT.UNVERIFIABLE]: { kind: "warn", title: t.vUnverifiable, detail: t.vUnverifiableHint },
    [VERDICT.CHAIN_CONFIG_ERROR]: { kind: "bad", title: t.vConfigError, detail: t.vConfigErrorHint },
    [VERDICT.NOT_FOUND]: { kind: "bad", title: t.notFound, detail: t.notFoundHint },
  }[result.verdict]);

  return (
    <div className="card">
      <h2>{t.verifierFlowTitle}</h2>
      {err && <div className="error-box">{err}</div>}
      {banner && (<>
        <Verdict kind={banner.kind} title={banner.title} detail={banner.detail} />
        <div className="hashbox">{result.hash}</div>
      </>)}
      <Dropzone label={t.dropPdfVerify + " " + t.browse} sub={t.verifySubtext} onFile={onFile} />
    </div>
  );
}
