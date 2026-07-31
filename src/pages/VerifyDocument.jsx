import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useLang } from "../i18n/useLang.jsx";
import { hashFile } from "../lib/crypto.js";
import { supabaseQuery, rpc } from "../lib/supabase.js";
import { checkOnChain, txUrl } from "../lib/onchain.js";
import { generateCertificatePdf } from "../lib/certificate.js";
import { fmtCertDate, formatDate } from "../lib/format.js";
import Dropzone from "../components/Dropzone.jsx";
import Verdict from "../components/Verdict.jsx";
import Busy from "../components/Busy.jsx";

export default function VerifyDocument() {
  const { t, lang } = useLang();
  const { publicId } = useParams();
  const [params] = useSearchParams();
  const [doc, setDoc] = useState(undefined); // undefined=loading, null=not found
  const [count, setCount] = useState(null);
  const [match, setMatch] = useState(params.get("match") === "1" ? true : null);
  const [busy, setBusy] = useState(false);
  const [chain, setChain] = useState(null);
  const [vName, setVName] = useState("");
  const [vRole, setVRole] = useState("");
  const [vEntity, setVEntity] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const rows = await supabaseQuery("documents",
          { filters: `public_id=eq.${publicId}&select=*,profiles(company_name)` });
        setDoc(rows[0] || null);
        if (rows[0]) {
          rpc("verification_count", { doc_id: rows[0].id }).then(setCount).catch(() => {});
          checkOnChain(rows[0].hash).then(setChain).catch(() => {});
        }
      } catch { setDoc(null); }
    })();
  }, [publicId]);

  const onFile = async (file) => {
    setBusy(true);
    const ok = (await hashFile(file)) === doc.hash;
    setMatch(ok);
    await supabaseQuery("verifications", { method: "POST", body: {
      checked_hash: doc.hash, result: ok ? "authentic" : "not_found",
      document_id: ok ? doc.id : null,
      verifier_name: vName.trim() || null, verifier_role: vRole.trim() || null, verifier_entity: vEntity.trim() || null,
    }}).catch(() => {});
    setBusy(false);
  };

  const downloadCert = () => generateCertificatePdf({
    kind: "verificacion", lang, autentico: true, archivo: doc.file_name, hash: doc.hash,
    verificadorNombre: vName.trim(), verificadorCargo: vRole.trim(), verificadorEntidad: vEntity.trim(),
    fechaVerificacion: fmtCertDate(new Date().toISOString(), lang),
    emisorNombre: "", emisorCargo: "", emisorCompania: doc.profiles?.company_name || "",
    fechaRegistro: fmtCertDate(doc.registered_at, lang),
    txHash: doc.anchor_tx || null,
    txExplorerUrl: doc.anchor_tx ? txUrl(doc.anchor_tx) : null, red: "Base",
    explorerUrl: chain?.contractUrl || null,
    publicUrl: `${window.location.origin}/verify/${doc.public_id}`,
  });

  if (doc === undefined) return <Busy msg={t.working} />;
  if (doc === null) return <div className="card"><Verdict kind="bad" title={t.recordNotFound} detail={t.recordNotFoundHint} /></div>;

  return (
    <div className="card">
      {match === null && <Verdict kind="info" title={t.registeredOk.replace("!", "").replace("¡", "")}
        detail={`${t.registeredOn} ${formatDate(doc.registered_at, lang)}${doc.anchor_status === "anchored" ? " · ⛓ Base" : ""}`} />}
      {match === true && <Verdict kind="ok" title={t.matchOk} />}
      {match === false && <Verdict kind="bad" title={t.matchFail} detail={t.notFoundHint} />}

      <div className="kv"><span>{t.fileLabel}</span><b>{doc.file_name}</b></div>
      <div className="kv"><span>{t.issuedBy}</span><b>{doc.profiles?.company_name || "—"}</b></div>
      {count !== null && <div className="kv"><span>{t.verifCountLabel}</span><b>{count}</b></div>}

      {/* Independent proof: verifiable without trusting DocSeal */}
      <div style={{ marginTop: 16, marginBottom: 16 }}>
        <p className="hint" style={{ textAlign: "left", margin: "0 0 4px", fontWeight: 600 }}>{t.proofTitle}</p>
        <div className="hashbox">SHA-256: {doc.hash}</div>
        {doc.anchor_tx ? (
          <p style={{ margin: "6px 0", fontSize: 13, textAlign: "center" }}>
            <a href={txUrl(doc.anchor_tx)} target="_blank" rel="noopener noreferrer">{t.proofTxLink}</a>
            {chain?.exists && <span style={{ color: "var(--ok)", marginLeft: 8 }}>{t.onchainYes}</span>}
          </p>
        ) : (
          <p className="hint" style={{ margin: "6px 0" }}>{t.notAnchoredHonest}</p>
        )}
        <p className="hint" style={{ margin: 0 }}>{t.proofNote}</p>
      </div>

      {busy && <Busy msg={t.checking} />}
      {match !== true && !busy && (<>
        <Dropzone label={t.uploadYourCopy} sub={t.verifySubtext} onFile={onFile} />
        <div style={{ marginTop: 14 }}>
          <p className="hint" style={{ textAlign: "left" }}><b>{t.optIdTitle}</b><br />{t.optIdHint}</p>
          <div className="field"><input placeholder={t.nameLabel} value={vName} onChange={(e) => setVName(e.target.value)} /></div>
          <div className="field"><input placeholder={t.roleLabel} value={vRole} onChange={(e) => setVRole(e.target.value)} /></div>
          <div className="field"><input placeholder={t.companyLabel} value={vEntity} onChange={(e) => setVEntity(e.target.value)} /></div>
        </div>
      </>)}
      {match === true && <button className="btn gold" onClick={downloadCert}>{t.downloadCertVer}</button>}
    </div>
  );
}
