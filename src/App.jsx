import { useState, useRef, useCallback } from "react";
import jsPDF from "jspdf";

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

async function hashBytes(bytes) {
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashFile(file) {
  const buffer = await file.arrayBuffer();
  return hashBytes(buffer);
}

async function imageToPdf(imageFile) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(imageFile);
  });

  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });

  const pageW = 210;
  const pageH = 297;
  const margin = 10;
  const maxW = pageW - margin * 2;
  const maxH = pageH - margin * 2;

  const ratio = img.width / img.height;
  let drawW = maxW;
  let drawH = drawW / ratio;
  if (drawH > maxH) {
    drawH = maxH;
    drawW = drawH * ratio;
  }
  const x = (pageW - drawW) / 2;
  const y = (pageH - drawH) / 2;

  const mime = imageFile.type.toLowerCase();
  let format = "JPEG";
  if (mime.includes("png")) format = "PNG";

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: false,
  });

  pdf.addImage(dataUrl, format, x, y, drawW, drawH, undefined, "NONE");

  const pdfBlob = pdf.output("blob");
  const pdfBytes = await pdfBlob.arrayBuffer();

  const baseName = (imageFile.name || "capture").replace(/\.[^/.]+$/, "");
  const fileName = `${baseName}.pdf`;

  return { pdfBlob, pdfBytes, fileName };
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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
const CameraIcon = ({ size = 40 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>);
const CheckIcon = () => (<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>);
const XIcon = () => (<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>);
const FileIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>);
const ClockIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>);
const HashIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" /><line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" /></svg>);
const CloudIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" /></svg>);
const DatabaseIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>);
const DownloadIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>);
const BriefcaseIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>);
const BuildingIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="9" y1="22" x2="9" y2="18"/><line x1="15" y1="22" x2="15" y2="18"/><line x1="9" y1="6" x2="9.01" y2="6"/><line x1="15" y1="6" x2="15.01" y2="6"/><line x1="9" y1="10" x2="9.01" y2="10"/><line x1="15" y1="10" x2="15.01" y2="10"/><line x1="9" y1="14" x2="9.01" y2="14"/><line x1="15" y1="14" x2="15.01" y2="14"/></svg>);

export default function DocumentAuthenticator() {
  const [mode, setMode] = useState("register");
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processingMsg, setProcessingMsg] = useState("");
  const [result, setResult] = useState(null);
  const [registrantName, setRegistrantName] = useState("");
  const [registrantRole, setRegistrantRole] = useState("");
  const [registrantCompany, setRegistrantCompany] = useState("");
  const [validationError, setValidationError] = useState("");
  const [recentRecords, setRecentRecords] = useState([]);
  const [loadedRecords, setLoadedRecords] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const loadRecords = useCallback(async () => {
    if (loadedRecords) return;
    try {
      const data = await supabaseQuery("documents", { filters: "select=*&order=registered_at.desc&limit=10" });
      setRecentRecords(data);
      setLoadedRecords(true);
    } catch (err) { console.error("Failed to load records:", err); setLoadedRecords(true); }
  }, [loadedRecords]);

  if (!loadedRecords) loadRecords();

  const requiresIdentity = (mode === "register" || mode === "capture");

  const validateIdentity = () => {
    if (!requiresIdentity) return true;
    if (!registrantName.trim() || !registrantRole.trim() || !registrantCompany.trim()) {
      setValidationError("Please fill in name, role, and company before continuing.");
      return false;
    }
    setValidationError("");
    return true;
  };

  const registerPdf = useCallback(async ({ pdfBytes, pdfBlob, fileName }) => {
    const hash = await hashBytes(pdfBytes);
    const existing = await supabaseQuery("documents", { filters: `hash=eq.${hash}&select=*` });
    if (existing.length > 0) {
      setResult({
        type: "already",
        message: "This document is already registered.",
        record: existing[0],
        pdfBlob,
        pdfFileName: fileName,
      });
      return;
    }
    const inserted = await supabaseQuery("documents", {
      method: "POST",
      body: {
        hash,
        file_name: fileName,
        file_size: pdfBytes.byteLength,
        registered_by: registrantName.trim(),
        role: registrantRole.trim(),
        company: registrantCompany.trim(),
      },
    });
    const record = inserted[0];
    setResult({
      type: "registered",
      message: "Document registered successfully!",
      record,
      pdfBlob,
      pdfFileName: fileName,
    });
    setRecentRecords((prev) => [record, ...prev].slice(0, 10));
  }, [registrantName, registrantRole, registrantCompany]);

  const handlePdfFile = useCallback(async (file) => {
    if (!file || file.type !== "application/pdf") {
      setResult({ type: "error", message: "Please upload a PDF file." });
      return;
    }
    setProcessing(true);
    setProcessingMsg("Computing SHA-256 hash...");
    setResult(null);
    try {
      const hash = await hashFile(file);
      if (mode === "register") {
        const existing = await supabaseQuery("documents", { filters: `hash=eq.${hash}&select=*` });
        if (existing.length > 0) {
          setResult({ type: "already", message: "This document is already registered.", record: existing[0] });
        } else {
          const inserted = await supabaseQuery("documents", {
            method: "POST",
            body: {
              hash,
              file_name: file.name,
              file_size: file.size,
              registered_by: registrantName.trim(),
              role: registrantRole.trim(),
              company: registrantCompany.trim(),
            },
          });
          const record = inserted[0];
          setResult({ type: "registered", message: "Document registered successfully!", record });
          setRecentRecords((prev) => [record, ...prev].slice(0, 10));
        }
      } else {
        const found = await supabaseQuery("documents", { filters: `hash=eq.${hash}&select=*` });
        if (found.length > 0) {
          setResult({ type: "authentic", message: "Document is authentic!", record: found[0] });
        } else {
          setResult({ type: "not_found", message: "Document not found in registry.", hash });
        }
      }
    } catch (err) {
      setResult({ type: "error", message: "Connection error: " + err.message });
    }
    setProcessing(false);
  }, [mode, registrantName, registrantRole, registrantCompany]);

  const handleImageFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith("image/")) {
      setResult({ type: "error", message: "Please select an image (JPG or PNG)." });
      return;
    }
    setProcessing(true);
    setResult(null);
    try {
      setProcessingMsg("Building PDF from image...");
      const { pdfBlob, pdfBytes, fileName } = await imageToPdf(file);
      setProcessingMsg("Computing SHA-256 and registering...");
      await registerPdf({ pdfBytes, pdfBlob, fileName });
    } catch (err) {
      setResult({ type: "error", message: "Error: " + err.message });
    }
    setProcessing(false);
  }, [registerPdf]);

  const tryOpenPdfPicker = () => {
    if (!validateIdentity()) return;
    fileInputRef.current?.click();
  };
  const tryOpenCamera = () => {
    if (!validateIdentity()) return;
    cameraInputRef.current?.click();
  };
  const tryOpenGallery = () => {
    if (!validateIdentity()) return;
    galleryInputRef.current?.click();
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    if ((mode === "register" || mode === "capture")) {
      if (!registrantName.trim() || !registrantRole.trim() || !registrantCompany.trim()) {
        setValidationError("Please fill in name, role, and company before continuing.");
        return;
      }
      setValidationError("");
    }
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    if (mode === "capture") handleImageFile(file);
    else handlePdfFile(file);
  }, [handlePdfFile, handleImageFile, mode, registrantName, registrantRole, registrantCompany]);

  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);

  const onPdfFileSelect = (e) => { const f = e.target.files?.[0]; if (f) handlePdfFile(f); e.target.value = ""; };
  const onImageFileSelect = (e) => { const f = e.target.files?.[0]; if (f) handleImageFile(f); e.target.value = ""; };

  const resetResult = () => { setResult(null); setValidationError(""); };

  const switchMode = (m) => {
    setMode(m);
    resetResult();
  };

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
        <div style={styles.toggleTrack3}>
          <div
            style={{
              ...styles.toggleSlider3,
              transform:
                mode === "register" ? "translateX(0)"
                : mode === "verify" ? "translateX(100%)"
                : "translateX(200%)",
            }}
          />
          <button onClick={() => switchMode("register")} style={{ ...styles.toggleBtn3, color: mode === "register" ? "#0a0f1a" : "#8892a6" }}>Register</button>
          <button onClick={() => switchMode("verify")} style={{ ...styles.toggleBtn3, color: mode === "verify" ? "#0a0f1a" : "#8892a6" }}>Verify</button>
          <button onClick={() => switchMode("capture")} style={{ ...styles.toggleBtn3, color: mode === "capture" ? "#0a0f1a" : "#8892a6" }}>Capture</button>
        </div>
      </div>

      <p style={styles.modeDescription}>
        {mode === "register" && "Upload a PDF to register its SHA-256 fingerprint. The hash is stored in a cloud database accessible from any device."}
        {mode === "verify" && "Upload a PDF to check if it matches a previously registered document. Anyone, from any device, can verify authenticity."}
        {mode === "capture" && "Take a photo or pick an image of a document. The app builds a PDF, registers its fingerprint, and lets you download the canonical PDF for sharing."}
      </p>

      {requiresIdentity && !result && (
        <div style={styles.identityCard}>
          <h4 style={styles.identityTitle}>Registering Actor</h4>

          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>Name <span style={styles.required}>*</span></label>
            <input
              type="text"
              placeholder="Full name"
              value={registrantName}
              onChange={(e) => setRegistrantName(e.target.value)}
              style={styles.fieldInput}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>Role <span style={styles.required}>*</span></label>
            <input
              type="text"
              placeholder="e.g. CFO, Legal Counsel, Notary"
              value={registrantRole}
              onChange={(e) => setRegistrantRole(e.target.value)}
              style={styles.fieldInput}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>Company <span style={styles.required}>*</span></label>
            <input
              type="text"
              placeholder="Organization name"
              value={registrantCompany}
              onChange={(e) => setRegistrantCompany(e.target.value)}
              style={styles.fieldInput}
            />
          </div>

          {validationError && (
            <div style={styles.validationError}>{validationError}</div>
          )}
        </div>
      )}

      {mode === "capture" && !result && !processing && (
        <div style={styles.captureWrap}>
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={onImageFileSelect} style={{ display: "none" }} />
          <input ref={galleryInputRef} type="file" accept="image/*" onChange={onImageFileSelect} style={{ display: "none" }} />

          <button onClick={tryOpenCamera} style={styles.captureBtnPrimary}>
            <CameraIcon size={20} />
            <span>Take a photo</span>
          </button>

          <button onClick={tryOpenGallery} style={styles.captureBtnSecondary}>
            <UploadIcon />
            <span style={{ marginLeft: 8 }}>Pick from device</span>
          </button>

          <p style={styles.captureHint}>
            On mobile, "Take a photo" opens your camera. On desktop, both options open a file picker.
          </p>
        </div>
      )}

      {(mode === "register" || mode === "verify") && !result && (
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={mode === "register" ? tryOpenPdfPicker : () => fileInputRef.current?.click()}
          style={{
            ...styles.dropzone,
            borderColor: dragging ? "#56e39f" : "#2a3148",
            background: dragging ? "rgba(86, 227, 159, 0.04)" : "rgba(20, 26, 42, 0.5)",
            transform: dragging ? "scale(1.01)" : "scale(1)",
          }}
        >
          <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" onChange={onPdfFileSelect} style={{ display: "none" }} />
          {processing ? (
            <div style={styles.processingContainer}>
              <div style={styles.spinner} />
              <p style={styles.processingText}>{processingMsg || "Working..."}</p>
            </div>
          ) : (
            <>
              <div style={{ ...styles.uploadIconWrap, color: dragging ? "#56e39f" : "#4a5578" }}>
                <UploadIcon />
              </div>
              <p style={styles.dropText}>Drop your PDF here or <span style={styles.browseLink}>browse</span></p>
              <p style={styles.dropSubtext}>Only PDF files · Hashed locally · Never uploaded</p>
            </>
          )}
        </div>
      )}

      {mode === "capture" && processing && (
        <div style={styles.processingCard}>
          <div style={styles.spinner} />
          <p style={styles.processingText}>{processingMsg || "Working..."}</p>
        </div>
      )}

      {result && (
        <div style={{
          ...styles.resultCard,
          borderColor:
            result.type === "authentic" || result.type === "registered" ? "#56e39f"
            : result.type === "already" ? "#f0c846"
            : "#ef5350"
        }}>
          <div style={styles.resultIconWrap}>
            {(result.type === "authentic" || result.type === "registered") && <div style={{ color: "#56e39f" }}><CheckIcon /></div>}
            {(result.type === "not_found" || result.type === "error") && <div style={{ color: "#ef5350" }}><XIcon /></div>}
            {result.type === "already" && <div style={{ color: "#f0c846" }}><ShieldIcon size={48} /></div>}
          </div>
          <h3 style={{
            ...styles.resultTitle,
            color: result.type === "authentic" || result.type === "registered" ? "#56e39f"
              : result.type === "already" ? "#f0c846" : "#ef5350"
          }}>
            {result.message}
          </h3>

          {result.record && (
            <div style={styles.recordDetails}>
              <div style={styles.detailRow}><FileIcon /><span style={styles.detailLabel}>File:</span><span style={styles.detailValue}>{result.record.file_name}</span></div>
              {result.record.file_size && <div style={styles.detailRow}><DatabaseIcon /><span style={styles.detailLabel}>Size:</span><span style={styles.detailValue}>{formatFileSize(result.record.file_size)}</span></div>}
              <div style={styles.detailRow}><ClockIcon /><span style={styles.detailLabel}>Registered:</span><span style={styles.detailValue}>{formatDate(result.record.registered_at)}</span></div>
              <div style={styles.detailRow}><span style={{ fontSize: 14 }}>👤</span><span style={styles.detailLabel}>By:</span><span style={styles.detailValue}>{result.record.registered_by}</span></div>
              {result.record.role && <div style={styles.detailRow}><BriefcaseIcon /><span style={styles.detailLabel}>Role:</span><span style={styles.detailValue}>{result.record.role}</span></div>}
              {result.record.company && <div style={styles.detailRow}><BuildingIcon /><span style={styles.detailLabel}>Company:</span><span style={styles.detailValue}>{result.record.company}</span></div>}
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

          {result.pdfBlob && (
            <button
              onClick={() => downloadBlob(result.pdfBlob, result.pdfFileName)}
              style={styles.downloadBtn}
            >
              <DownloadIcon />
              <span>Download canonical PDF</span>
            </button>
          )}

          <button onClick={resetResult} style={styles.resetBtn}>
            {mode === "register" ? "Register another" : mode === "verify" ? "Verify another" : "Capture another"}
          </button>
        </div>
      )}

      {recentRecords.length > 0 && (
        <div style={styles.registrySection}>
          <h3 style={styles.registryTitle}>Recent Registry<span style={styles.registryCount}>{recentRecords.length}</span></h3>
          <div style={styles.registryList}>
            {recentRecords.map((r) => (
              <div key={r.id} style={styles.registryItem}>
                <div style={styles.registryItemTop}><span style={styles.registryFileName}>{r.file_name}</span><span style={styles.registryDate}>{formatDate(r.registered_at)}</span></div>
                <div style={styles.registryItemBottom}><code style={styles.registryHash}>{truncateHash(r.hash)}</code><span style={styles.registryBy}>{r.registered_by}{r.role ? ` · ${r.role}` : ""}{r.company ? ` · ${r.company}` : ""}</span></div>
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
  container: { position: "relative", minHeight: "100vh", background: "#0a0f1a", fontFamily: "'Outfit', sans-serif", color: "#c8ceda", padding: "32px 16px", display: "flex", flexDirection: "column", alignItems: "center", overflow: "hidden" },
  bgTexture: { position: "absolute", inset: 0, opacity: 0.03, backgroundImage: "radial-gradient(circle at 25% 25%, #56e39f 1px, transparent 1px), radial-gradient(circle at 75% 75%, #56e39f 1px, transparent 1px)", backgroundSize: "60px 60px", pointerEvents: "none" },
  header: { textAlign: "center", marginBottom: 28, zIndex: 1, animation: "fadeIn 0.6s ease-out", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 },
  logoRow: { display: "flex", alignItems: "center", gap: 16 },
  logoIcon: { width: 48, height: 48, borderRadius: 12, background: "linear-gradient(135deg, #56e39f 0%, #2ab673 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#0a0f1a", flexShrink: 0 },
  title: { fontSize: 28, fontWeight: 700, color: "#e8ecf4", margin: 0, letterSpacing: "-0.5px", textAlign: "left" },
  subtitle: { fontSize: 13, color: "#5a6580", margin: 0, fontFamily: "'DM Mono', monospace", letterSpacing: "0.5px", textAlign: "left" },
  connectionBadge: { display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", background: "rgba(86, 227, 159, 0.08)", border: "1px solid rgba(86, 227, 159, 0.2)", borderRadius: 20, fontSize: 11, color: "#56e39f", fontFamily: "'DM Mono', monospace" },
  toggleContainer: { marginBottom: 20, zIndex: 1, animation: "fadeIn 0.6s ease-out 0.1s both", width: "100%", maxWidth: 380, display: "flex", justifyContent: "center" },
  toggleTrack3: { position: "relative", display: "flex", background: "#141a2a", borderRadius: 10, padding: 4, border: "1px solid #1e2740", width: "100%", maxWidth: 360 },
  toggleSlider3: { position: "absolute", top: 4, left: 4, width: "calc(33.333% - 2.667px)", height: "calc(100% - 8px)", background: "#56e39f", borderRadius: 7, transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)" },
  toggleBtn3: { flex: 1, padding: "10px 0", border: "none", background: "transparent", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "'Outfit', sans-serif", zIndex: 1, transition: "color 0.3s ease" },
  modeDescription: { maxWidth: 440, textAlign: "center", fontSize: 14, lineHeight: 1.6, color: "#6b7a96", marginBottom: 24, zIndex: 1, animation: "fadeIn 0.6s ease-out 0.2s both", padding: "0 8px" },

  identityCard: { width: "100%", maxWidth: 440, marginBottom: 20, zIndex: 1, animation: "fadeIn 0.4s ease-out", background: "rgba(20, 26, 42, 0.5)", border: "1px solid #1e2740", borderRadius: 12, padding: "16px 18px", boxSizing: "border-box" },
  identityTitle: { fontSize: 12, fontWeight: 600, color: "#6b7a96", margin: "0 0 14px", fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "1px" },
  fieldGroup: { marginBottom: 12 },
  fieldLabel: { display: "block", fontSize: 12, fontWeight: 500, color: "#8892a6", marginBottom: 6, fontFamily: "'DM Mono', monospace" },
  required: { color: "#ef5350" },
  fieldInput: { width: "100%", padding: "10px 12px", background: "#0d1220", border: "1px solid #2a3148", borderRadius: 8, color: "#c8ceda", fontSize: 14, fontFamily: "'Outfit', sans-serif", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s ease" },
  validationError: { fontSize: 12, color: "#ef5350", marginTop: 8, fontFamily: "'DM Mono', monospace", padding: "8px 10px", background: "rgba(239, 83, 80, 0.08)", border: "1px solid rgba(239, 83, 80, 0.25)", borderRadius: 6 },

  dropzone: { width: "100%", maxWidth: 440, padding: "48px 24px", borderRadius: 16, border: "2px dashed", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.3s ease", zIndex: 1, animation: "fadeIn 0.6s ease-out 0.3s both" },
  uploadIconWrap: { marginBottom: 16, transition: "color 0.3s ease" },
  dropText: { fontSize: 15, color: "#8892a6", margin: "0 0 6px", textAlign: "center" },
  browseLink: { color: "#56e39f", textDecoration: "underline", textUnderlineOffset: 3 },
  dropSubtext: { fontSize: 12, color: "#4a5578", margin: 0, fontFamily: "'DM Mono', monospace", textAlign: "center" },

  captureWrap: { width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, zIndex: 1, animation: "fadeIn 0.6s ease-out 0.3s both" },
  captureBtnPrimary: { width: "100%", padding: "16px 24px", background: "linear-gradient(135deg, #56e39f 0%, #2ab673 100%)", color: "#0a0f1a", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 600, fontFamily: "'Outfit', sans-serif", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, transition: "transform 0.2s ease" },
  captureBtnSecondary: { width: "100%", padding: "14px 24px", background: "rgba(20, 26, 42, 0.5)", color: "#8892a6", border: "1px solid #2a3148", borderRadius: 12, fontSize: 14, fontWeight: 500, fontFamily: "'Outfit', sans-serif", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s ease" },
  captureHint: { fontSize: 12, color: "#4a5578", textAlign: "center", marginTop: 8, fontFamily: "'DM Mono', monospace", lineHeight: 1.5 },

  processingContainer: { display: "flex", flexDirection: "column", alignItems: "center", gap: 10 },
  processingCard: { width: "100%", maxWidth: 440, padding: 32, background: "rgba(20, 26, 42, 0.6)", borderRadius: 16, border: "1px solid #1e2740", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, zIndex: 1 },
  spinner: { width: 36, height: 36, border: "3px solid #1e2740", borderTopColor: "#56e39f", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  processingText: { fontSize: 14, color: "#56e39f", margin: 0, fontFamily: "'DM Mono', monospace", textAlign: "center" },

  resultCard: { width: "100%", maxWidth: 440, padding: 24, background: "rgba(20, 26, 42, 0.8)", borderRadius: 16, border: "1px solid", textAlign: "center", zIndex: 1, animation: "fadeIn 0.5s ease-out", backdropFilter: "blur(8px)", boxSizing: "border-box" },
  resultIconWrap: { marginBottom: 16 },
  resultTitle: { fontSize: 20, fontWeight: 600, margin: "0 0 20px" },
  recordDetails: { textAlign: "left", background: "#0d1220", borderRadius: 10, padding: 16, marginBottom: 20 },
  detailRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 10, color: "#8892a6", fontSize: 13, flexWrap: "wrap" },
  detailLabel: { color: "#5a6580", fontFamily: "'DM Mono', monospace", fontSize: 12, minWidth: 75 },
  detailValue: { color: "#c8ceda", fontSize: 13, wordBreak: "break-all" },
  hashRow: { display: "flex", alignItems: "flex-start", gap: 8, color: "#8892a6", fontSize: 13, flexWrap: "wrap" },
  hashValue: { fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#56e39f", wordBreak: "break-all", lineHeight: 1.5 },
  notFoundHint: { fontSize: 12, color: "#6b7a96", marginTop: 12, marginBottom: 0, lineHeight: 1.5 },
  downloadBtn: { width: "100%", padding: "12px 20px", background: "rgba(86, 227, 159, 0.1)", border: "1px solid rgba(86, 227, 159, 0.3)", borderRadius: 8, color: "#56e39f", fontSize: 14, fontFamily: "'Outfit', sans-serif", fontWeight: 500, cursor: "pointer", transition: "all 0.2s ease", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 12, boxSizing: "border-box" },
  resetBtn: { padding: "10px 24px", background: "transparent", border: "1px solid #2a3148", borderRadius: 8, color: "#8892a6", fontSize: 13, fontFamily: "'Outfit', sans-serif", fontWeight: 500, cursor: "pointer", transition: "all 0.2s ease" },
  registrySection: { width: "100%", maxWidth: 440, marginTop: 40, zIndex: 1, animation: "fadeIn 0.6s ease-out" },
  registryTitle: { fontSize: 14, fontWeight: 600, color: "#6b7a96", margin: "0 0 12px", display: "flex", alignItems: "center", gap: 8, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "1px" },
  registryCount: { background: "#1e2740", color: "#56e39f", fontSize: 11, padding: "2px 8px", borderRadius: 10, fontWeight: 500 },
  registryList: { display: "flex", flexDirection: "column", gap: 8 },
  registryItem: { padding: "12px 16px", background: "rgba(20, 26, 42, 0.6)", borderRadius: 10, border: "1px solid #1e2740" },
  registryItemTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 6 },
  registryItemBottom: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 },
  registryFileName: { fontSize: 13, color: "#c8ceda", fontWeight: 500, wordBreak: "break-all" },
  registryDate: { fontSize: 11, color: "#4a5578", fontFamily: "'DM Mono', monospace" },
  registryHash: { fontSize: 11, color: "#3d7a5a", fontFamily: "'DM Mono', monospace" },
  registryBy: { fontSize: 11, color: "#4a5578", fontFamily: "'DM Mono', monospace" },
  footer: { marginTop: 48, zIndex: 1 },
  footerText: { fontSize: 11, color: "#2a3148", fontFamily: "'DM Mono', monospace", textAlign: "center", letterSpacing: "0.5px" },
};
