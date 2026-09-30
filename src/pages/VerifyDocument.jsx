import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useLang } from "../i18n/useLang.jsx";
import { hashFile } from "../lib/crypto.js";
import { supabaseQuery, rpc } from "../lib/supabase.js";
import { txUrl } from "../lib/onchain.js";
import { resolveVerdict } from "../lib/registry.js";
import { VERDICT } from "../lib/verdict.js";
import { generateCertificatePdf } from "../lib/certificate.js";
import { fmtCertDate } from "../lib/format.js";
import Dropzone from "../components/Dropzone.jsx";
import Verdict from "../components/Verdict.jsx";
import Busy from "../components/Busy.jsx";

export default function VerifyDocument() {
  const { t, lang } = useLang();
  const { publicId } = useParams();
  const [params] = useSearchParams();
  const hashFromUrl = params.get("h");
  const [doc, setDoc] = useState(undefined); // undefined=loading, null=not found
  const [count, setCount] = useState(null);
  const [busy, setBusy] = useState(false);
  const [chain, setChain] = useState(null);
  const [verdict, setVerdict] = useState(null);
  const [checking, setChecking] = useState(false);
  const [dbDown, setDbDown] = useState(false);
  const [vName, setVName] = useState("");
  const [vRole, setVRole] = useState("");
  const [vEntity, setVEntity] = useState("");

  const runVerdict = async (authorityHash, uploadedHash) => {
    setChecking(true);
    const res = await resolveVerdict(authorityHash, uploadedHash ? { uploadedHash } : {});
    setVerdict(res.verdict); setChain(res.chain); setChecking(false);
    return res.verdict;
  };

  useEffect(() => {
    (async () => {
      let row = null;
      try {
        const rows = await supabaseQuery("documents",
          { filters: `public_id=eq.${publicId}&select=*,profiles(company_name)` });
        row = rows[0] || null;
        setDoc(row);                       // null here means "not found" (DB reachable)
      } catch {
        setDbDown(true); setDoc(null);     // DB unreachable — degrade
      }
      if (row) rpc("verification_count", { doc_id: row.id }).then(setCount).catch(() => {});
      const authority = hashFromUrl || row?.hash;
      if (authority) await runVerdict(authority);
    })();
  }, [publicId]);

  const onFile = async (file) => {
    const authority = hashFromUrl || doc?.hash;
    if (!authority) return;
    setBusy(true);
    const uploaded = await hashFile(file);
    const v = await runVerdict(authority, uploaded);
    await supabaseQuery("verifications", { method: "POST", body: {
      checked_hash: authority,
      result: v === VERDICT.AUTHENTIC ? "authentic" : v === VERDICT.ALTERED ? "altered" : v === VERDICT.NOT_FOUND ? "not_found" : "unverifiable",
      document_id: v === VERDICT.AUTHENTIC && doc ? doc.id : null,
      decided_by: "onchain", chain_exists: v === VERDICT.AUTHENTIC,
      anchor_tx: doc?.anchor_tx || null,
      verifier_name: vName.trim() || null, verifier_role: vRole.trim() || null, verifier_entity: vEntity.trim() || null,
    }}).catch(() => {});
    setBusy(false);
  };

  const downloadCert = () => generateCertificatePdf({
    kind: "verificacion", lang, autentico: verdict === VERDICT.AUTHENTIC,
    archivo: doc.file_name, hash: hashFromUrl || doc.hash,
    verificadorNombre: vName.trim(), verificadorCargo: vRole.trim(), verificadorEntidad: vEntity.trim(),
    fechaVerificacion: fmtCertDate(new Date().toISOString(), lang),
    emisorNombre: "", emisorCargo: "", emisorCompania: doc.profiles?.company_name || "",
    fechaRegistro: doc.registered_at ? fmtCertDate(doc.registered_at, lang) : "",
    txHash: doc.anchor_tx || null,
    txExplorerUrl: doc.anchor_tx ? txUrl(doc.anchor_tx) : null, red: "Base",
    explorerUrl: chain?.contractUrl || null,
    publicUrl: `${window.location.origin}/verify/${doc.public_id}`,
  });

  if (doc === undefined) return <Busy msg={t.working} />;

  // Verdict-driven banners, shared across the normal and DB-degraded renders.
  const authorityHash = hashFromUrl || doc?.hash;
  const verdictBanners = (<>
    {checking && <Verdict kind="info" title={t.vCheckingChain} />}
    {!checking && verdict === VERDICT.AUTHENTIC && <Verdict kind="ok" title={doc ? t.matchOk : t.vAuthNoRegistry} />}
    {!checking && verdict === VERDICT.NOT_ANCHORED && <Verdict kind="warn" title={t.vNotAnchored} detail={t.vNotAnchoredHint} />}
    {!checking && verdict === VERDICT.UNVERIFIABLE && (<>
      <Verdict kind="warn" title={t.vUnverifiable} detail={t.vUnverifiableHint} />
      <button className="btn quiet" onClick={() => runVerdict(authorityHash)}>{t.vRetry}</button>
    </>)}
    {!checking && verdict === VERDICT.CHAIN_CONFIG_ERROR && <Verdict kind="bad" title={t.vConfigError} detail={t.vConfigErrorHint} />}
    {!checking && verdict === VERDICT.ALTERED && <Verdict kind="bad" title={t.matchFail} detail={t.notFoundHint} />}
    {!checking && verdict === VERDICT.NOT_FOUND && <Verdict kind="bad" title={t.recordNotFound} detail={t.recordNotFoundHint} />}
    {dbDown && <Verdict kind="warn" title={t.vRegistryUnavailable} />}
  </>);

  // DB unreachable but the QR carried a hash: still show the chain verdict + proof.
  if (doc === null && dbDown && authorityHash) {
    return (
      <div className="card">
        {verdictBanners}
        {/* Independent proof: verifiable without trusting DocSeal or its registry */}
        <div style={{ marginTop: 16, marginBottom: 16 }}>
          <p className="hint" style={{ textAlign: "left", margin: "0 0 4px", fontWeight: 600 }}>{t.proofTitle}</p>
          <div className="hashbox">SHA-256: {authorityHash}</div>
          <p className="hint" style={{ margin: 0 }}>{t.proofNote}</p>
        </div>
        {busy && <Busy msg={t.checking} />}
        {!busy && (<>
          <Dropzone label={t.uploadYourCopy} sub={t.verifySubtext} onFile={onFile} />
          <div style={{ marginTop: 14 }}>
            <p className="hint" style={{ textAlign: "left" }}><b>{t.optIdTitle}</b><br />{t.optIdHint}</p>
            <div className="field"><input placeholder={t.nameLabel} value={vName} onChange={(e) => setVName(e.target.value)} /></div>
            <div className="field"><input placeholder={t.roleLabel} value={vRole} onChange={(e) => setVRole(e.target.value)} /></div>
            <div className="field"><input placeholder={t.companyLabel} value={vEntity} onChange={(e) => setVEntity(e.target.value)} /></div>
          </div>
        </>)}
      </div>
    );
  }

  if (doc === null) return <div className="card"><Verdict kind="bad" title={t.recordNotFound} detail={t.recordNotFoundHint} /></div>;

  return (
    <div className="card">
      {verdictBanners}

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
      {verdict !== VERDICT.AUTHENTIC && !busy && (<>
        <Dropzone label={t.uploadYourCopy} sub={t.verifySubtext} onFile={onFile} />
        <div style={{ marginTop: 14 }}>
          <p className="hint" style={{ textAlign: "left" }}><b>{t.optIdTitle}</b><br />{t.optIdHint}</p>
          <div className="field"><input placeholder={t.nameLabel} value={vName} onChange={(e) => setVName(e.target.value)} /></div>
          <div className="field"><input placeholder={t.roleLabel} value={vRole} onChange={(e) => setVRole(e.target.value)} /></div>
          <div className="field"><input placeholder={t.companyLabel} value={vEntity} onChange={(e) => setVEntity(e.target.value)} /></div>
        </div>
      </>)}
      {verdict === VERDICT.AUTHENTIC && doc && <button className="btn gold" onClick={downloadCert}>{t.downloadCertVer}</button>}
    </div>
  );
}
