import { useState, useRef, useCallback } from "react";

const SUPABASE_URL = "https://tqgpqkoonwywvuhbktge.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxZ3Bxa29vbnd5d3Z1aGJrdGdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5ODk4MzYsImV4cCI6MjA4NjU2NTgzNn0.quMGZFWadittF99dQKxf4o7RYH-Fet5BM8nnhHxlFxg";

async function supabaseQuery(table, { method = "GET", body, filters } = {}) {
  let url = `${SUPABASE_URL}/rest/v1/${table}`;
  if (filters) url += `?${filters}`;
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
    Prefer: method === "POST" ? "return=representation" : undefined,
  };
  Object.keys(headers).forEach((k) => headers[k] === undefined && delete headers[k]);
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Supabase error: ${res.status}`);
  }
  return res.json();
}

async function hashFile(file) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function formatDate(iso) {
  return new Date(iso).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function truncateHash(hash) { return hash.slice(0, 12) + "..." + hash.slice(-12); }

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

const ShieldIcon = ({ size = 24 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>);
const UploadIcon = () => (<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>);
const CheckIcon = () => (<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>);
const XIcon = () => (<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>);
const FileIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>);
const ClockIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>);
const HashIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" /><line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" /></svg>);
const CloudIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" /></svg>);
const DatabaseIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>);

export default function DocumentAuthenticator() {
  const [mode, setMode] = useState("register");
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [registrantName, setRegistrantName] = useState("");
  const [recentRecords, setRecentRecords] = useState([]);
  const [loadedRecords, setLoadedRecords] = useState(false);
  const fileInputRef = useRef(null);

  const loadRecords = useCallback(async () => {
    if (loadedRecords) return;
    try {
      const data = await supabaseQuery("documents", { filters: "select=*&order=registered_at.desc&limit=10" });
      setRecentRecords(data);
      setLoadedRecords(true);
    } catch (err) { console.error("Failed to load records:", err); setLoadedRecords(true); }
  }, [loadedRecords]);

  if (!loadedRecords) loadRecords();

  const handleFile = useCallback(async (file) => {
    if (!file || file.type !== "application/pdf") { setResult({ type: "error", message: "Please upload a PDF file." }); return; }
    setProcessing(true); setResult(null);
    try {
      const hash = await hashFile(file);
      if (mode === "register") {
        const existing = await supabaseQuery("documents", { filters: `hash=eq.${hash}&select=*` });
        if (existing.length > 0) { setResult({ type: "already", message: "This document is already registered.", record: existing[0] }); }
        else {
          const inserted = await supabaseQuery("documents", { method: "POST", body: { hash, file_name: file.name, file_size: file.size, registered_by: registrantName.trim() || "Anonymous" } });
          const record = inserted[0];
          setResult({ type: "registered", message: "Document registered successfully!", record });
          setRecentRecords((prev) => [record, ...prev].slice(0, 10));
        }
      } else {
        const found = await supabaseQuery("documents", { filters: `hash=eq.${hash}&select=*` });
        if (found.length > 0) { setResult({ type: "authentic", message: "Document is authentic!", record: found[0] }); }
        else { setResult({ type: "not_found", message: "Document not found in registry.", hash }); }
      }
    } catch (err) { setResult({ type: "error", message: "Connection error: " + err.message }); }
    setProcessing(false);
  }, [mode, registrantName]);

  const onDrop = useCallback((e) => { e.preventDefault(); setDragging(false); const file = e.dataTransfer?.files?.[0]; if (file) handleFile(file); }, [handleFile]);
  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);
  const onFileSelect = (e) => { const file = e.target.files?.[0]; if (file) handleFile(file); e.target.value = ""; };
  const resetResult = () => setResult(null);

  return (
    <div style={styles.container}>
      <div style={styles.bgTexture} />
      <header style={styles.header}>
        <div style={styles.logoRow}>
          <div style={styles.logoIcon}><ShieldIcon /></div>
          <div>
            <h1 style={styles.title}>DocSeal</h1>
            <p style={styles.subtitle}>Cryptographic Document Authenticator</p>
          </div>
        </div>
        <div style={styles.connectionBadge}><CloudIcon /><span>Connected to cloud database</span></div>
      </header>

      <div style={styles.toggleContainer}>
        <div style={styles.toggleTrack}>
          <div style={{ ...styles.toggleSlider, transform: mode === "verify" ? "translateX(100%)" : "translateX(0)" }} />
          <button onClick={() => { setMode("register"); resetResult(); }} style={{ ...styles.toggleBtn, color: mode === "register" ? "#0a0f1a" : "#8892a6" }}>Register</button>
          <button onClick={() => { setMode("verify"); resetResult(); }} style={{ ...styles.toggleBtn, color: mode === "verify" ? "#0a0f1a" : "#8892a6" }}>Verify</button>
        </div>
      </div>

      <p style={styles.modeDescription}>
        {mode === "register"
          ? "Upload a PDF to register its SHA-256 fingerprint. The hash is stored in a cloud database accessible from any device."
          : "Upload a PDF to check if it matches a previously registered document. Anyone, from any device, can verify authenticity."}
      </p>

      {mode === "register" && !result && (
        <div style={styles.nameInputContainer}>
          <label style={styles.nameLabel}>Registered by (optional)</label>
          <input type="text" placeholder="Enter your name..." value={registrantName} onChange={(e) => setRegistrantName(e.target.value)} style={styles.nameInput} />
        </div>
      )}

      {!result && (
        <div onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave} onClick={() => fileInputRef.current?.click()}
          style={{ ...styles.dropzone, borderColor: dragging ? "#56e39f" : "#2a3148", background: dragging ? "rgba(86, 227, 159, 0.04)" : "rgba(20, 26, 42, 0.5)", transform: dragging ? "scale(1.01)" : "scale(1)" }}>
          <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" onChange={onFileSelect} style={{ display: "none" }} />
          {processing ? (
            <div style={styles.processingContainer}>
              <div style={styles.spinner} />
              <p style={styles.processingText}>Computing SHA-256 hash...</p>
              <p style={styles.processingSubtext}>{mode === "register" ? "Registering to database..." : "Checking database..."}</p>
            </div>
          ) : (
            <>
              <div style={{ ...styles.uploadIconWrap, color: dragging ? "#56e39f" : "#4a5578" }}><UploadIcon /></div>
              <p style={styles.dropText}>Drop your PDF here or <span style={styles.browseLink}>browse</span></p>
              <p style={styles.dropSubtext}>Only PDF files · Hashed locally · Never uploaded</p>
            </>
          )}
        </div>
      )}

      {result && (
        <div style={{ ...styles.resultCard, borderColor: result.type === "authentic" || result.type === "registered" ? "#56e39f" : result.type === "already" ? "#f0c846" : "#ef5350" }}>
          <div style={styles.resultIconWrap}>
            {(result.type === "authentic" || result.type === "registered") && <div style={{ color: "#56e39f" }}><CheckIcon /></div>}
            {(result.type === "not_found" || result.type === "error") && <div style={{ color: "#ef5350" }}><XIcon /></div>}
            {result.type === "already" && <div style={{ color: "#f0c846" }}><ShieldIcon size={48} /></div>}
          </div>
          <h3 style={{ ...styles.resultTitle, color: result.type === "authentic" || result.type === "registered" ? "#56e39f" : result.type === "already" ? "#f0c846" : "#ef5350" }}>{result.message}</h3>
          {result.record && (
            <div style={styles.recordDetails}>
              <div style={styles.detailRow}><FileIcon /><span style={styles.detailLabel}>File:</span><span style={styles.detailValue}>{result.record.file_name}</span></div>
              {result.record.file_size && <div style={styles.detailRow}><DatabaseIcon /><span style={styles.detailLabel}>Size:</span><span style={styles.detailValue}>{formatFileSize(result.record.file_size)}</span></div>}
              <div style={styles.detailRow}><ClockIcon /><span style={styles.detailLabel}>Registered:</span><span style={styles.detailValue}>{formatDate(result.record.registered_at)}</span></div>
              <div style={styles.detailRow}><span style={{ fontSize: 14 }}>👤</span><span style={styles.detailLabel}>By:</span><span style={styles.detailValue}>{result.record.registered_by}</span></div>
              <div style={styles.hashRow}><HashIcon /><span style={styles.detailLabel}>SHA-256:</span><code style={styles.hashValue}>{result.record.hash}</code></div>
            </div>
          )}
          {result.type === "not_found" && result.hash && (
            <div style={styles.recordDetails}>
              <div style={styles.hashRow}><HashIcon /><span style={styles.detailLabel}>SHA-256:</span><code style={styles.hashValue}>{result.hash}</code></div>
              <p style={styles.notFoundHint}>This hash does not match any registered document. The file may have been modified or was never registered.</p>
            </div>
          )}
          {result.type === "error" && <p style={styles.notFoundHint}>{result.message}</p>}
          <button onClick={resetResult} style={styles.resetBtn}>{mode === "register" ? "Register another" : "Verify another"}</button>
        </div>
      )}

      {recentRecords.length > 0 && (
        <div style={styles.registrySection}>
          <h3 style={styles.registryTitle}>Recent Registry<span style={styles.registryCount}>{recentRecords.length}</span></h3>
          <div style={styles.registryList}>
            {recentRecords.map((r) => (
              <div key={r.id} style={styles.registryItem}>
                <div style={styles.registryItemTop}><span style={styles.registryFileName}>{r.file_name}</span><span style={styles.registryDate}>{formatDate(r.registered_at)}</span></div>
                <div style={styles.registryItemBottom}><code style={styles.registryHash}>{truncateHash(r.hash)}</code><span style={styles.registryBy}>{r.registered_by}</span></div>
              </div>
            ))}
          </div>
        </div>
      )}

      <footer style={styles.footer}><p style={styles.footerText}>SHA-256 · Client-side hashing · Cloud-synced registry · No files are uploaded</p></footer>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Outfit:wght@300;400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

const styles = {
  container: { position: "relative", minHeight: "100vh", background: "#0a0f1a", fontFamily: "'Outfit', sans-serif", color: "#c8ceda", padding: "40px 20px", display: "flex", flexDirection: "column", alignItems: "center", overflow: "hidden" },
  bgTexture: { position: "absolute", inset: 0, opacity: 0.03, backgroundImage: "radial-gradient(circle at 25% 25%, #56e39f 1px, transparent 1px), radial-gradient(circle at 75% 75%, #56e39f 1px, transparent 1px)", backgroundSize: "60px 60px", pointerEvents: "none" },
  header: { textAlign: "center", marginBottom: 32, zIndex: 1, animation: "fadeIn 0.6s ease-out", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 },
  logoRow: { display: "flex", alignItems: "center", gap: 16 },
  logoIcon: { width: 48, height: 48, borderRadius: 12, background: "linear-gradient(135deg, #56e39f 0%, #2ab673 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#0a0f1a", flexShrink: 0 },
  title: { fontSize: 28, fontWeight: 700, color: "#e8ecf4", margin: 0, letterSpacing: "-0.5px", textAlign: "left" },
  subtitle: { fontSize: 13, color: "#5a6580", margin: 0, fontFamily: "'DM Mono', monospace", letterSpacing: "0.5px", textAlign: "left" },
  connectionBadge: { display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", background: "rgba(86, 227, 159, 0.08)", border: "1px solid rgba(86, 227, 159, 0.2)", borderRadius: 20, fontSize: 11, color: "#56e39f", fontFamily: "'DM Mono', monospace" },
  toggleContainer: { marginBottom: 20, zIndex: 1, animation: "fadeIn 0.6s ease-out 0.1s both" },
  toggleTrack: { position: "relative", display: "flex", background: "#141a2a", borderRadius: 10, padding: 4, border: "1px solid #1e2740", width: 260 },
  toggleSlider: { position: "absolute", top: 4, left: 4, width: "calc(50% - 4px)", height: "calc(100% - 8px)", background: "#56e39f", borderRadius: 7, transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)" },
  toggleBtn: { flex: 1, padding: "10px 0", border: "none", background: "transparent", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "'Outfit', sans-serif", zIndex: 1, transition: "color 0.3s ease" },
  modeDescription: { maxWidth: 440, textAlign: "center", fontSize: 14, lineHeight: 1.6, color: "#6b7a96", marginBottom: 24, zIndex: 1, animation: "fadeIn 0.6s ease-out 0.2s both" },
  nameInputContainer: { width: "100%", maxWidth: 440, marginBottom: 16, zIndex: 1, animation: "fadeIn 0.4s ease-out" },
  nameLabel: { display: "block", fontSize: 12, fontWeight: 500, color: "#5a6580", marginBottom: 6, fontFamily: "'DM Mono', monospace" },
  nameInput: { width: "100%", padding: "10px 14px", background: "#141a2a", border: "1px solid #2a3148", borderRadius: 8, color: "#c8ceda", fontSize: 14, fontFamily: "'Outfit', sans-serif", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s ease" },
  dropzone: { width: "100%", maxWidth: 440, padding: "48px 32px", borderRadius: 16, border: "2px dashed", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.3s ease", zIndex: 1, animation: "fadeIn 0.6s ease-out 0.3s both" },
  uploadIconWrap: { marginBottom: 16, transition: "color 0.3s ease" },
  dropText: { fontSize: 15, color: "#8892a6", margin: "0 0 6px" },
  browseLink: { color: "#56e39f", textDecoration: "underline", textUnderlineOffset: 3 },
  dropSubtext: { fontSize: 12, color: "#4a5578", margin: 0, fontFamily: "'DM Mono', monospace" },
  processingContainer: { display: "flex", flexDirection: "column", alignItems: "center", gap: 10 },
  spinner: { width: 36, height: 36, border: "3px solid #1e2740", borderTopColor: "#56e39f", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  processingText: { fontSize: 14, color: "#56e39f", margin: 0, fontFamily: "'DM Mono', monospace" },
  processingSubtext: { fontSize: 12, color: "#4a5578", margin: 0, fontFamily: "'DM Mono', monospace" },
  resultCard: { width: "100%", maxWidth: 440, padding: 32, background: "rgba(20, 26, 42, 0.8)", borderRadius: 16, border: "1px solid", textAlign: "center", zIndex: 1, animation: "fadeIn 0.5s ease-out", backdropFilter: "blur(8px)" },
  resultIconWrap: { marginBottom: 16 },
  resultTitle: { fontSize: 20, fontWeight: 600, margin: "0 0 20px" },
  recordDetails: { textAlign: "left", background: "#0d1220", borderRadius: 10, padding: 16, marginBottom: 20 },
  detailRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 10, color: "#8892a6", fontSize: 13 },
  detailLabel: { color: "#5a6580", fontFamily: "'DM Mono', monospace", fontSize: 12, minWidth: 75 },
  detailValue: { color: "#c8ceda", fontSize: 13, wordBreak: "break-all" },
  hashRow: { display: "flex", alignItems: "flex-start", gap: 8, color: "#8892a6", fontSize: 13 },
  hashValue: { fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#56e39f", wordBreak: "break-all", lineHeight: 1.5 },
  notFoundHint: { fontSize: 12, color: "#6b7a96", marginTop: 12, marginBottom: 0, lineHeight: 1.5 },
  resetBtn: { padding: "10px 24px", background: "transparent", border: "1px solid #2a3148", borderRadius: 8, color: "#8892a6", fontSize: 13, fontFamily: "'Outfit', sans-serif", fontWeight: 500, cursor: "pointer", transition: "all 0.2s ease" },
  registrySection: { width: "100%", maxWidth: 440, marginTop: 40, zIndex: 1, animation: "fadeIn 0.6s ease-out" },
  registryTitle: { fontSize: 14, fontWeight: 600, color: "#6b7a96", margin: "0 0 12px", display: "flex", alignItems: "center", gap: 8, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "1px" },
  registryCount: { background: "#1e2740", color: "#56e39f", fontSize: 11, padding: "2px 8px", borderRadius: 10, fontWeight: 500 },
  registryList: { display: "flex", flexDirection: "column", gap: 8 },
  registryItem: { padding: "12px 16px", background: "rgba(20, 26, 42, 0.6)", borderRadius: 10, border: "1px solid #1e2740" },
  registryItemTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  registryItemBottom: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  registryFileName: { fontSize: 13, color: "#c8ceda", fontWeight: 500 },
  registryDate: { fontSize: 11, color: "#4a5578", fontFamily: "'DM Mono', monospace" },
  registryHash: { fontSize: 11, color: "#3d7a5a", fontFamily: "'DM Mono', monospace" },
  registryBy: { fontSize: 11, color: "#4a5578", fontFamily: "'DM Mono', monospace" },
  footer: { marginTop: 48, zIndex: 1 },
  footerText: { fontSize: 11, color: "#2a3148", fontFamily: "'DM Mono', monospace", textAlign: "center", letterSpacing: "0.5px" },
};
