import { useState, useRef, useCallback, useEffect } from "react";
import jsPDF from "jspdf";

const SUPABASE_URL = "https://tqgpqkoonwywvuhbktge.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxZ3Bxa29vbnd5d3Z1aGJrdGdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5ODk4MzYsImV4cCI6MjA4NjU2NTgzNn0.quMGZFWadittF99dQKxf4o7RYH-Fet5BM8nnhHxlFxg";

// ================== i18n ==================
const T = {
  es: {
    appSubtitle: "Autenticador criptográfico de documentos",
    cloudConnected: "Conectado a la base de datos",

    // Welcome screen
    welcomeTitle: "¿Qué es DocSeal?",
    welcomeIntro: "DocSeal es una herramienta para garantizar la autenticidad de pólizas y documentos. Cada documento recibe una huella criptográfica única, registrada en una base verificable desde cualquier dispositivo.",
    welcomeQ1: "¿Qué es la huella criptográfica?",
    welcomeA1: "Es una secuencia única de 64 caracteres que se calcula a partir del contenido exacto de un archivo, usando el algoritmo SHA-256. Funciona como una huella digital: dos archivos idénticos producen la misma huella; basta cambiar un solo carácter para que la huella sea completamente distinta. Es matemáticamente inviable falsificarla.",
    welcomeQ2: "¿Cómo funciona?",
    welcomeStep1Title: "1. Emisión",
    welcomeStep1Body: "La aseguradora registra la póliza original. El sistema calcula su huella SHA-256 y la guarda con el emisor, rol y fecha.",
    welcomeStep2Title: "2. Entrega",
    welcomeStep2Body: "El contratista recibe el PDF y lo presenta a la entidad contratante como parte del proceso.",
    welcomeStep3Title: "3. Verificación",
    welcomeStep3Body: "La entidad contratante sube el PDF recibido. Si la huella coincide con el registro original, el documento es auténtico.",
    welcomeNote: "Los archivos nunca se suben al servidor. La huella se calcula localmente en tu navegador.",
    welcomeStart: "Comenzar",

    // Role selection
    welcomeBack: "Bienvenido",
    chooseRole: "¿Cuál es su rol?",
    issuerTitle: "Soy Aseguradora",
    issuerSubtitle: "Emisora de pólizas",
    issuerDesc: "Registre la póliza original y genere su huella criptográfica en el registro.",
    verifierTitle: "Soy Entidad Contratante",
    verifierSubtitle: "Verificador / Beneficiario",
    verifierDesc: "Verifique si una póliza presentada por un contratista es auténtica o ha sido alterada.",

    // Issuer flow
    backToRoles: "Cambiar de rol",
    issuerFlowTitle: "Aseguradora",
    issuerFlowDesc: "Identifíquese, luego suba el PDF original o tome una foto del documento.",
    yourDetails: "Sus datos",
    nameLabel: "Nombre",
    namePlaceholder: "Nombre completo",
    roleLabel: "Cargo",
    roleIssuerPlaceholder: "Ej. Suscriptora, Compliance Officer",
    roleVerifierPlaceholder: "Ej. Jefe de Contratos, Auditor",
    companyLabel: "Compañía / Entidad",
    companyIssuerPlaceholder: "Nombre de la aseguradora",
    companyVerifierPlaceholder: "Nombre de la entidad estatal",
    validationError: "Por favor complete nombre, cargo y compañía antes de continuar.",
    dropPdf: "Suelte el PDF aquí o",
    browse: "elija un archivo",
    dropSubtext: "El PDF se procesa localmente · Nunca se sube al servidor",
    or: "O",
    takePhoto: "Tomar una foto",
    pickImage: "Elegir imagen del dispositivo",
    captureHint: "En móvil, \"Tomar una foto\" abre la cámara. Las imágenes se convierten a un PDF canónico antes de calcular la huella.",

    // Verifier flow
    verifierFlowTitle: "Entidad Contratante",
    verifierFlowDesc: "Identifíquese, luego suba el PDF recibido del contratista para verificar su autenticidad. Cada verificación queda registrada para auditoría.",
    dropPdfVerify: "Suelte el PDF a verificar o",
    verifySubtext: "Procesado localmente · Resultado registrado para auditoría",

    // Processing
    computingHash: "Calculando huella SHA-256...",
    buildingPdf: "Generando PDF desde imagen...",
    registering: "Registrando en la base de datos...",
    checking: "Comprobando en el registro...",
    working: "Procesando...",

    // Results
    registeredOk: "¡Documento registrado exitosamente!",
    alreadyRegistered: "Este documento ya está registrado.",
    authentic: "¡Documento auténtico!",
    notFound: "Documento no encontrado en el registro.",
    notFoundHint: "Esta huella no coincide con ningún documento registrado. El archivo puede haber sido modificado o nunca fue registrado.",
    fileLabel: "Archivo:",
    sizeLabel: "Tamaño:",
    registeredLabel: "Registrado:",
    byLabel: "Por:",
    roleLabelResult: "Cargo:",
    companyLabelResult: "Compañía:",
    hashLabel: "SHA-256:",
    downloadPdf: "Descargar PDF canónico",
    registerAnother: "Registrar otro",
    verifyAnother: "Verificar otro",
    switchRole: "Cambiar rol",
    invalidPdf: "Por favor suba un archivo PDF.",
    invalidImage: "Por favor seleccione una imagen (JPG o PNG).",
    connectionError: "Error de conexión: ",
    genericError: "Error: ",

    // Footer
    recentRegistry: "Registro reciente",
    footerText: "SHA-256 · Procesamiento local · Registro en la nube · Verificaciones auditadas",

    // Tooltips
    infoTooltip: "¿Qué es DocSeal?",
    langTooltip: "English",

    // Blockchain
    anchorBtn: "Anclar en blockchain",
    anchoring: "Anclando en Base…",
    anchoredOk: "Anclado en Base (blockchain)",
    anchoredAlready: "Ya estaba anclado en Base",
    anchorView: "Ver prueba en BaseScan →",
    anchorError: "No se pudo anclar en blockchain. El registro local sigue siendo válido.",
    anchorExplain: "Ancla la huella en la blockchain de Base: un registro público e inmutable que nadie —ni nosotros— puede modificar.",
    onchainCheck: "Verificar en blockchain",
    onchainChecking: "Consultando Base…",
    onchainYes: "Confirmado en Base ✓",
    onchainNo: "No está anclado en Base",
    onchainView: "Ver en BaseScan →",
  },
  en: {
    appSubtitle: "Cryptographic Document Authenticator",
    cloudConnected: "Connected to cloud database",

    welcomeTitle: "What is DocSeal?",
    welcomeIntro: "DocSeal is a tool for guaranteeing the authenticity of policies and documents. Each document gets a unique cryptographic fingerprint, recorded in a database verifiable from any device.",
    welcomeQ1: "What is the cryptographic fingerprint?",
    welcomeA1: "A unique 64-character sequence calculated from the exact contents of a file, using the SHA-256 algorithm. It works like a fingerprint: identical files produce the same fingerprint; changing a single character produces a completely different one. It is mathematically infeasible to forge.",
    welcomeQ2: "How does it work?",
    welcomeStep1Title: "1. Issuance",
    welcomeStep1Body: "The insurer registers the original policy. The system computes its SHA-256 fingerprint and stores it with the issuer, role and date.",
    welcomeStep2Title: "2. Delivery",
    welcomeStep2Body: "The contractor receives the PDF and presents it to the contracting entity as part of the process.",
    welcomeStep3Title: "3. Verification",
    welcomeStep3Body: "The contracting entity uploads the received PDF. If the fingerprint matches the original record, the document is authentic.",
    welcomeNote: "Files are never uploaded to the server. The fingerprint is computed locally in your browser.",
    welcomeStart: "Get started",

    welcomeBack: "Welcome",
    chooseRole: "What is your role?",
    issuerTitle: "I'm an Insurer",
    issuerSubtitle: "Policy Issuer",
    issuerDesc: "Register the original policy and generate its cryptographic fingerprint in the registry.",
    verifierTitle: "I'm a Contracting Entity",
    verifierSubtitle: "Verifier / Beneficiary",
    verifierDesc: "Verify whether a policy presented by a contractor is authentic or has been altered.",

    backToRoles: "Change role",
    issuerFlowTitle: "Insurer",
    issuerFlowDesc: "Identify yourself, then upload the original PDF or take a photo of the document.",
    yourDetails: "Your details",
    nameLabel: "Name",
    namePlaceholder: "Full name",
    roleLabel: "Role",
    roleIssuerPlaceholder: "e.g. Underwriter, Compliance Officer",
    roleVerifierPlaceholder: "e.g. Contracts Manager, Auditor",
    companyLabel: "Company / Entity",
    companyIssuerPlaceholder: "Insurance company name",
    companyVerifierPlaceholder: "State entity name",
    validationError: "Please fill in name, role, and company before continuing.",
    dropPdf: "Drop the PDF here or",
    browse: "browse",
    dropSubtext: "Processed locally · Never uploaded to the server",
    or: "OR",
    takePhoto: "Take a photo",
    pickImage: "Pick image from device",
    captureHint: "On mobile, \"Take a photo\" opens the camera. Images are converted to a canonical PDF before fingerprinting.",

    verifierFlowTitle: "Contracting Entity",
    verifierFlowDesc: "Identify yourself, then upload the PDF received from the contractor to check authenticity. Every verification is logged for audit.",
    dropPdfVerify: "Drop the PDF to verify or",
    verifySubtext: "Processed locally · Result logged for audit",

    computingHash: "Computing SHA-256 fingerprint...",
    buildingPdf: "Generating PDF from image...",
    registering: "Registering to database...",
    checking: "Checking against registry...",
    working: "Working...",

    registeredOk: "Document registered successfully!",
    alreadyRegistered: "This document is already registered.",
    authentic: "Document is authentic!",
    notFound: "Document not found in registry.",
    notFoundHint: "This fingerprint doesn't match any registered document. The file may have been modified or was never registered.",
    fileLabel: "File:",
    sizeLabel: "Size:",
    registeredLabel: "Registered:",
    byLabel: "By:",
    roleLabelResult: "Role:",
    companyLabelResult: "Company:",
    hashLabel: "SHA-256:",
    downloadPdf: "Download canonical PDF",
    registerAnother: "Register another",
    verifyAnother: "Verify another",
    switchRole: "Switch role",
    invalidPdf: "Please upload a PDF file.",
    invalidImage: "Please select an image (JPG or PNG).",
    connectionError: "Connection error: ",
    genericError: "Error: ",

    recentRegistry: "Recent Registry",
    footerText: "SHA-256 · Local processing · Cloud-synced registry · Verifications audited",

    infoTooltip: "What is DocSeal?",
    langTooltip: "Español",

    // Blockchain
    anchorBtn: "Anchor on blockchain",
    anchoring: "Anchoring on Base…",
    anchoredOk: "Anchored on Base (blockchain)",
    anchoredAlready: "Already anchored on Base",
    anchorView: "View proof on BaseScan →",
    anchorError: "Could not anchor on blockchain. The local record is still valid.",
    anchorExplain: "Anchors the fingerprint on the Base blockchain: a public, immutable record that nobody — not even us — can alter.",
    onchainCheck: "Check on blockchain",
    onchainChecking: "Querying Base…",
    onchainYes: "Confirmed on Base ✓",
    onchainNo: "Not anchored on Base",
    onchainView: "View on BaseScan →",
  },
};

// ================== Supabase helper ==================
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

// ================== Crypto + file helpers ==================
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
  const pageW = 210, pageH = 297, margin = 10;
  const maxW = pageW - margin * 2, maxH = pageH - margin * 2;
  const ratio = img.width / img.height;
  let drawW = maxW, drawH = drawW / ratio;
  if (drawH > maxH) { drawH = maxH; drawW = drawH * ratio; }
  const x = (pageW - drawW) / 2, y = (pageH - drawH) / 2;
  const mime = imageFile.type.toLowerCase();
  let format = "JPEG";
  if (mime.includes("png")) format = "PNG";
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: false });
  pdf.addImage(dataUrl, format, x, y, drawW, drawH, undefined, "NONE");
  const pdfBlob = pdf.output("blob");
  const pdfBytes = await pdfBlob.arrayBuffer();
  const baseName = (imageFile.name || "capture").replace(/\.[^/.]+$/, "");
  return { pdfBlob, pdfBytes, fileName: `${baseName}.pdf` };
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
function formatDate(iso, lang) {
  const locale = lang === "es" ? "es-ES" : "en-US";
  return new Date(iso).toLocaleString(locale, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
function truncateHash(h) { return h.slice(0, 12) + "..." + h.slice(-12); }

// ================== Blockchain helpers ==================
// Llaman a las Netlify Functions. La clave privada del operador vive
// solo en el servidor (variables de entorno), nunca en el navegador.
async function anchorOnChain(hash) {
  const res = await fetch("/.netlify/functions/register-onchain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hash }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error ${res.status}`);
  }
  return res.json(); // { status, txHash, explorerUrl, ... }
}

async function checkOnChain(hash) {
  const res = await fetch("/.netlify/functions/verify-onchain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hash }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error ${res.status}`);
  }
  return res.json(); // { exists, timestamp, registrar, contractUrl }
}
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

// ================== Icons ==================
const ShieldIcon = ({ size = 24 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>);
const UploadIcon = ({ size = 40 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>);
const CameraIcon = ({ size = 40 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>);
const CheckIcon = ({ size = 48 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>);
const XIcon = () => (<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>);
const FileIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>);
const ClockIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>);
const HashIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" /><line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" /></svg>);
const CloudIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" /></svg>);
const DatabaseIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>);
const DownloadIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>);
const BriefcaseIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>);
const BuildingIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="9" y1="22" x2="9" y2="18"/><line x1="15" y1="22" x2="15" y2="18"/></svg>);
const BackIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>);
const IssuerIcon = ({ size = 32 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="7.5 4.21 12 6.81 16.5 4.21"/><polyline points="7.5 19.79 7.5 14.6 3 12"/><polyline points="21 12 16.5 14.6 16.5 19.79"/></svg>);
const VerifierIcon = ({ size = 32 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>);
const InfoIcon = ({ size = 16 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>);
const GlobeIcon = ({ size = 16 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>);
const LinkIcon = ({ size = 16 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>);
const CubeIcon = ({ size = 18 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>);

// ================== App ==================
export default function DocumentAuthenticator() {
  // Language: default Spanish, persisted
  const [lang, setLang] = useState(() => {
    try {
      const stored = localStorage.getItem("docseal_lang");
      return stored === "en" ? "en" : "es";
    } catch { return "es"; }
  });
  const t = T[lang];

  // Welcome screen: shown on first visit, persisted as "seen"
  const [showWelcome, setShowWelcome] = useState(() => {
    try {
      return localStorage.getItem("docseal_welcome_seen") !== "1";
    } catch { return true; }
  });

  // Role: null (role selection) | "issuer" | "verifier"
  const [role, setRole] = useState(null);

  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processingMsg, setProcessingMsg] = useState("");
  const [result, setResult] = useState(null);

  // Blockchain state
  const [anchorState, setAnchorState] = useState(null); // null | "anchoring" | result obj | { error }
  const [onchainCheck, setOnchainCheck] = useState(null); // verifier side: null | "checking" | result obj

  const [name, setName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [company, setCompany] = useState("");
  const [validationError, setValidationError] = useState("");

  const [recentRecords, setRecentRecords] = useState([]);
  const [loadedRecords, setLoadedRecords] = useState(false);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  // Persist language
  useEffect(() => {
    try { localStorage.setItem("docseal_lang", lang); } catch {}
  }, [lang]);

  // Load recent records
  const loadRecords = useCallback(async () => {
    if (loadedRecords) return;
    try {
      const data = await supabaseQuery("documents", { filters: "select=*&order=registered_at.desc&limit=10" });
      setRecentRecords(data);
      setLoadedRecords(true);
    } catch (err) { console.error("Failed to load records:", err); setLoadedRecords(true); }
  }, [loadedRecords]);

  if (!loadedRecords) loadRecords();

  const identityFilled = () => name.trim() && userRole.trim() && company.trim();
  const validateIdentity = () => {
    if (!identityFilled()) {
      setValidationError(t.validationError);
      return false;
    }
    setValidationError("");
    return true;
  };

  const goHome = () => {
    setRole(null);
    setResult(null);
    setValidationError("");
  };

  const dismissWelcome = () => {
    setShowWelcome(false);
    try { localStorage.setItem("docseal_welcome_seen", "1"); } catch {}
  };

  const openWelcome = () => setShowWelcome(true);

  const toggleLang = () => setLang(lang === "es" ? "en" : "es");

  // ===== Issuer =====
  const registerPdf = useCallback(async ({ pdfBytes, pdfBlob, fileName }) => {
    const hash = await hashBytes(pdfBytes);
    const existing = await supabaseQuery("documents", { filters: `hash=eq.${hash}&select=*` });
    if (existing.length > 0) {
      setResult({ type: "already", message: t.alreadyRegistered, record: existing[0], pdfBlob, pdfFileName: fileName });
      return;
    }
    const inserted = await supabaseQuery("documents", {
      method: "POST",
      body: { hash, file_name: fileName, file_size: pdfBytes.byteLength, registered_by: name.trim(), role: userRole.trim(), company: company.trim() },
    });
    const record = inserted[0];
    setResult({ type: "registered", message: t.registeredOk, record, pdfBlob, pdfFileName: fileName });
    setRecentRecords((prev) => [record, ...prev].slice(0, 10));
  }, [name, userRole, company, t]);

  const handlePdfRegister = useCallback(async (file) => {
    if (!file || file.type !== "application/pdf") {
      setResult({ type: "error", message: t.invalidPdf });
      return;
    }
    setProcessing(true);
    setProcessingMsg(t.computingHash);
    setResult(null);
    try {
      const pdfBytes = await file.arrayBuffer();
      const hash = await hashBytes(pdfBytes);
      const existing = await supabaseQuery("documents", { filters: `hash=eq.${hash}&select=*` });
      if (existing.length > 0) {
        setResult({ type: "already", message: t.alreadyRegistered, record: existing[0] });
      } else {
        setProcessingMsg(t.registering);
        const inserted = await supabaseQuery("documents", {
          method: "POST",
          body: { hash, file_name: file.name, file_size: file.size, registered_by: name.trim(), role: userRole.trim(), company: company.trim() },
        });
        const record = inserted[0];
        setResult({ type: "registered", message: t.registeredOk, record });
        setRecentRecords((prev) => [record, ...prev].slice(0, 10));
      }
    } catch (err) {
      setResult({ type: "error", message: t.genericError + err.message });
    }
    setProcessing(false);
  }, [name, userRole, company, t]);

  const handleImageRegister = useCallback(async (file) => {
    if (!file || !file.type.startsWith("image/")) {
      setResult({ type: "error", message: t.invalidImage });
      return;
    }
    setProcessing(true);
    setResult(null);
    try {
      setProcessingMsg(t.buildingPdf);
      const { pdfBlob, pdfBytes, fileName } = await imageToPdf(file);
      setProcessingMsg(t.registering);
      await registerPdf({ pdfBytes, pdfBlob, fileName });
    } catch (err) {
      setResult({ type: "error", message: t.genericError + err.message });
    }
    setProcessing(false);
  }, [registerPdf, t]);

  // ===== Verifier =====
  const handlePdfVerify = useCallback(async (file) => {
    if (!file || file.type !== "application/pdf") {
      setResult({ type: "error", message: t.invalidPdf });
      return;
    }
    setProcessing(true);
    setProcessingMsg(t.checking);
    setResult(null);
    try {
      const hash = await hashFile(file);
      const found = await supabaseQuery("documents", { filters: `hash=eq.${hash}&select=*` });
      const isAuthentic = found.length > 0;
      try {
        await supabaseQuery("verifications", {
          method: "POST",
          body: {
            hash,
            result: isAuthentic ? "authentic" : "not_found",
            document_id: isAuthentic ? found[0].id : null,
            verified_by: name.trim(),
            verifier_role: userRole.trim(),
            verifier_company: company.trim(),
            verified_file_name: file.name,
          },
        });
      } catch (logErr) {
        console.error("Failed to log verification:", logErr);
      }
      if (isAuthentic) {
        setResult({ type: "authentic", message: t.authentic, record: found[0] });
      } else {
        setResult({ type: "not_found", message: t.notFound, hash });
      }
    } catch (err) {
      setResult({ type: "error", message: t.connectionError + err.message });
    }
    setProcessing(false);
  }, [name, userRole, company, t]);

  // ===== Pickers =====
  const tryOpenPdfRegister = () => { if (!validateIdentity()) return; fileInputRef.current?.click(); };
  const tryOpenCamera = () => { if (!validateIdentity()) return; cameraInputRef.current?.click(); };
  const tryOpenGallery = () => { if (!validateIdentity()) return; galleryInputRef.current?.click(); };
  const tryOpenVerifyPicker = () => { if (!validateIdentity()) return; fileInputRef.current?.click(); };

  const onDropRegister = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    if (!identityFilled()) { setValidationError(t.validationError); return; }
    setValidationError("");
    const file = e.dataTransfer?.files?.[0];
    if (file) handlePdfRegister(file);
  }, [handlePdfRegister, name, userRole, company, t]);

  const onDropVerify = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    if (!identityFilled()) { setValidationError(t.validationError); return; }
    setValidationError("");
    const file = e.dataTransfer?.files?.[0];
    if (file) handlePdfVerify(file);
  }, [handlePdfVerify, name, userRole, company, t]);

  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);
  const onPdfRegisterSelect = (e) => { const f = e.target.files?.[0]; if (f) handlePdfRegister(f); e.target.value = ""; };
  const onPdfVerifySelect = (e) => { const f = e.target.files?.[0]; if (f) handlePdfVerify(f); e.target.value = ""; };
  const onImageSelect = (e) => { const f = e.target.files?.[0]; if (f) handleImageRegister(f); e.target.value = ""; };
  const resetResult = () => { setResult(null); setValidationError(""); setAnchorState(null); setOnchainCheck(null); };

  // ===== Blockchain handlers =====
  const handleAnchor = useCallback(async (hash) => {
    setAnchorState("anchoring");
    try {
      const res = await anchorOnChain(hash);
      setAnchorState(res); // { status: "registered"|"already_registered", explorerUrl, ... }
    } catch (e) {
      console.error("Anchor failed:", e);
      setAnchorState({ error: e.message });
    }
  }, []);

  const handleCheckOnChain = useCallback(async (hash) => {
    setOnchainCheck("checking");
    try {
      const res = await checkOnChain(hash);
      setOnchainCheck(res); // { exists, timestamp, registrar, contractUrl }
    } catch (e) {
      console.error("On-chain check failed:", e);
      setOnchainCheck({ error: e.message });
    }
  }, []);

  // ============ RENDER ============
  return (
    <div style={styles.container}>
      <div style={styles.bgTexture} />

      <header style={styles.header}>
        <div style={styles.logoRow}>
          <div style={styles.logoIcon}><ShieldIcon /></div>
          <div>
            <h1 style={styles.title}>DocSeal</h1>
            <p style={styles.subtitle}>{t.appSubtitle}</p>
          </div>
        </div>
        <div style={styles.headerActions}>
          <div style={styles.connectionBadge}><CloudIcon /><span>{t.cloudConnected}</span></div>
          <div style={styles.headerButtons}>
            <button onClick={openWelcome} title={t.infoTooltip} style={styles.iconBtn}><InfoIcon /></button>
            <button onClick={toggleLang} title={t.langTooltip} style={styles.langBtn}>
              <GlobeIcon />
              <span style={{ marginLeft: 4 }}>{lang === "es" ? "EN" : "ES"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ============ WELCOME / EXPLAINER ============ */}
      {showWelcome && (
        <div style={styles.welcomeWrap}>
          <div style={styles.welcomeIconWrap}>
            <ShieldIcon size={36} />
          </div>
          <h2 style={styles.welcomeTitle}>{t.welcomeTitle}</h2>
          <p style={styles.welcomeIntro}>{t.welcomeIntro}</p>

          <div style={styles.welcomeSection}>
            <h3 style={styles.welcomeSectionTitle}>
              <HashIcon /><span>{t.welcomeQ1}</span>
            </h3>
            <p style={styles.welcomeBody}>{t.welcomeA1}</p>
            <code style={styles.hashExample}>a8f3c2d49e1b7c5f...4d2e9f7b4d</code>
          </div>

          <div style={styles.welcomeSection}>
            <h3 style={styles.welcomeSectionTitle}>
              <FileIcon /><span>{t.welcomeQ2}</span>
            </h3>
            <div style={styles.stepsList}>
              <div style={styles.stepItem}>
                <div style={styles.stepNum}>1</div>
                <div style={styles.stepBody}>
                  <div style={styles.stepTitle}>{t.welcomeStep1Title}</div>
                  <div style={styles.stepDesc}>{t.welcomeStep1Body}</div>
                </div>
              </div>
              <div style={styles.stepItem}>
                <div style={styles.stepNum}>2</div>
                <div style={styles.stepBody}>
                  <div style={styles.stepTitle}>{t.welcomeStep2Title}</div>
                  <div style={styles.stepDesc}>{t.welcomeStep2Body}</div>
                </div>
              </div>
              <div style={styles.stepItem}>
                <div style={styles.stepNum}>3</div>
                <div style={styles.stepBody}>
                  <div style={styles.stepTitle}>{t.welcomeStep3Title}</div>
                  <div style={styles.stepDesc}>{t.welcomeStep3Body}</div>
                </div>
              </div>
            </div>
          </div>

          <div style={styles.welcomeNote}>{t.welcomeNote}</div>

          <button onClick={dismissWelcome} style={styles.welcomeBtn}>
            {t.welcomeStart} →
          </button>
        </div>
      )}

      {/* ============ ROLE SELECTION ============ */}
      {!showWelcome && role === null && (
        <div style={styles.roleSelectWrap}>
          <h2 style={styles.flowTitleCenter}>{t.welcomeBack}</h2>
          <p style={styles.welcomeText}>{t.chooseRole}</p>

          <div style={styles.roleCardList}>
            <button onClick={() => setRole("issuer")} style={styles.roleCard}>
              <div style={styles.roleCardIcon}><IssuerIcon size={36} /></div>
              <div style={styles.roleCardBody}>
                <h3 style={styles.roleCardTitle}>{t.issuerTitle}</h3>
                <div style={styles.roleCardSub}>{t.issuerSubtitle}</div>
                <p style={styles.roleCardDesc}>{t.issuerDesc}</p>
              </div>
            </button>

            <button onClick={() => setRole("verifier")} style={styles.roleCard}>
              <div style={styles.roleCardIcon}><VerifierIcon size={36} /></div>
              <div style={styles.roleCardBody}>
                <h3 style={styles.roleCardTitle}>{t.verifierTitle}</h3>
                <div style={styles.roleCardSub}>{t.verifierSubtitle}</div>
                <p style={styles.roleCardDesc}>{t.verifierDesc}</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ============ ISSUER ============ */}
      {!showWelcome && role === "issuer" && (
        <>
          <button onClick={goHome} style={styles.backLink}><BackIcon /><span>{t.backToRoles}</span></button>
          <h2 style={styles.flowTitle}>{t.issuerFlowTitle}</h2>
          <p style={styles.modeDescription}>{t.issuerFlowDesc}</p>

          {!result && (
            <div style={styles.identityCard}>
              <h4 style={styles.identityTitle}>{t.yourDetails}</h4>
              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>{t.nameLabel} <span style={styles.required}>*</span></label>
                <input type="text" placeholder={t.namePlaceholder} value={name} onChange={(e) => setName(e.target.value)} style={styles.fieldInput} />
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>{t.roleLabel} <span style={styles.required}>*</span></label>
                <input type="text" placeholder={t.roleIssuerPlaceholder} value={userRole} onChange={(e) => setUserRole(e.target.value)} style={styles.fieldInput} />
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>{t.companyLabel} <span style={styles.required}>*</span></label>
                <input type="text" placeholder={t.companyIssuerPlaceholder} value={company} onChange={(e) => setCompany(e.target.value)} style={styles.fieldInput} />
              </div>
              {validationError && <div style={styles.validationErrorBox}>{validationError}</div>}
            </div>
          )}

          {!result && !processing && (
            <div style={styles.captureWrap}>
              <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" onChange={onPdfRegisterSelect} style={{ display: "none" }} />
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={onImageSelect} style={{ display: "none" }} />
              <input ref={galleryInputRef} type="file" accept="image/*" onChange={onImageSelect} style={{ display: "none" }} />

              <div
                onClick={tryOpenPdfRegister}
                onDrop={onDropRegister}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                style={{ ...styles.dropzone, borderColor: dragging ? "#56e39f" : "#2a3148", background: dragging ? "rgba(86, 227, 159, 0.04)" : "rgba(20, 26, 42, 0.5)" }}
              >
                <div style={{ ...styles.uploadIconWrap, color: dragging ? "#56e39f" : "#4a5578" }}><UploadIcon /></div>
                <p style={styles.dropText}>{t.dropPdf} <span style={styles.browseLink}>{t.browse}</span></p>
                <p style={styles.dropSubtext}>{t.dropSubtext}</p>
              </div>

              <div style={styles.divider}><span style={styles.dividerText}>{t.or}</span></div>

              <button onClick={tryOpenCamera} style={styles.captureBtnPrimary}>
                <CameraIcon size={20} />
                <span>{t.takePhoto}</span>
              </button>

              <button onClick={tryOpenGallery} style={styles.captureBtnSecondary}>
                <UploadIcon size={18} />
                <span style={{ marginLeft: 8 }}>{t.pickImage}</span>
              </button>

              <p style={styles.captureHint}>{t.captureHint}</p>
            </div>
          )}

          {processing && (
            <div style={styles.processingCard}>
              <div style={styles.spinner} />
              <p style={styles.processingText}>{processingMsg || t.working}</p>
            </div>
          )}
        </>
      )}

      {/* ============ VERIFIER ============ */}
      {!showWelcome && role === "verifier" && (
        <>
          <button onClick={goHome} style={styles.backLink}><BackIcon /><span>{t.backToRoles}</span></button>
          <h2 style={styles.flowTitle}>{t.verifierFlowTitle}</h2>
          <p style={styles.modeDescription}>{t.verifierFlowDesc}</p>

          {!result && (
            <div style={styles.identityCard}>
              <h4 style={styles.identityTitle}>{t.yourDetails}</h4>
              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>{t.nameLabel} <span style={styles.required}>*</span></label>
                <input type="text" placeholder={t.namePlaceholder} value={name} onChange={(e) => setName(e.target.value)} style={styles.fieldInput} />
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>{t.roleLabel} <span style={styles.required}>*</span></label>
                <input type="text" placeholder={t.roleVerifierPlaceholder} value={userRole} onChange={(e) => setUserRole(e.target.value)} style={styles.fieldInput} />
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>{t.companyLabel} <span style={styles.required}>*</span></label>
                <input type="text" placeholder={t.companyVerifierPlaceholder} value={company} onChange={(e) => setCompany(e.target.value)} style={styles.fieldInput} />
              </div>
              {validationError && <div style={styles.validationErrorBox}>{validationError}</div>}
            </div>
          )}

          {!result && !processing && (
            <>
              <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" onChange={onPdfVerifySelect} style={{ display: "none" }} />
              <div
                onClick={tryOpenVerifyPicker}
                onDrop={onDropVerify}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                style={{ ...styles.dropzone, borderColor: dragging ? "#56e39f" : "#2a3148", background: dragging ? "rgba(86, 227, 159, 0.04)" : "rgba(20, 26, 42, 0.5)" }}
              >
                <div style={{ ...styles.uploadIconWrap, color: dragging ? "#56e39f" : "#4a5578" }}><UploadIcon /></div>
                <p style={styles.dropText}>{t.dropPdfVerify} <span style={styles.browseLink}>{t.browse}</span></p>
                <p style={styles.dropSubtext}>{t.verifySubtext}</p>
              </div>
            </>
          )}

          {processing && (
            <div style={styles.processingCard}>
              <div style={styles.spinner} />
              <p style={styles.processingText}>{processingMsg || t.working}</p>
            </div>
          )}
        </>
      )}

      {/* ============ RESULT ============ */}
      {!showWelcome && result && (
        <div style={{
          ...styles.resultCard,
          borderColor:
            result.type === "authentic" || result.type === "registered" ? "#56e39f"
            : result.type === "already" ? "#f0c846" : "#ef5350"
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
          }}>{result.message}</h3>

          {result.record && (
            <div style={styles.recordDetails}>
              <div style={styles.detailRow}><FileIcon /><span style={styles.detailLabel}>{t.fileLabel}</span><span style={styles.detailValue}>{result.record.file_name}</span></div>
              {result.record.file_size && <div style={styles.detailRow}><DatabaseIcon /><span style={styles.detailLabel}>{t.sizeLabel}</span><span style={styles.detailValue}>{formatFileSize(result.record.file_size)}</span></div>}
              <div style={styles.detailRow}><ClockIcon /><span style={styles.detailLabel}>{t.registeredLabel}</span><span style={styles.detailValue}>{formatDate(result.record.registered_at, lang)}</span></div>
              <div style={styles.detailRow}><span style={{ fontSize: 14 }}>👤</span><span style={styles.detailLabel}>{t.byLabel}</span><span style={styles.detailValue}>{result.record.registered_by}</span></div>
              {result.record.role && <div style={styles.detailRow}><BriefcaseIcon /><span style={styles.detailLabel}>{t.roleLabelResult}</span><span style={styles.detailValue}>{result.record.role}</span></div>}
              {result.record.company && <div style={styles.detailRow}><BuildingIcon /><span style={styles.detailLabel}>{t.companyLabelResult}</span><span style={styles.detailValue}>{result.record.company}</span></div>}
              <div style={styles.hashRow}><HashIcon /><span style={styles.detailLabel}>{t.hashLabel}</span><code style={styles.hashValue}>{result.record.hash}</code></div>
            </div>
          )}

          {result.type === "not_found" && result.hash && (
            <div style={styles.recordDetails}>
              <div style={styles.hashRow}><HashIcon /><span style={styles.detailLabel}>{t.hashLabel}</span><code style={styles.hashValue}>{result.hash}</code></div>
              <p style={styles.notFoundHint}>{t.notFoundHint}</p>
            </div>
          )}

          {result.type === "error" && <p style={styles.notFoundHint}>{result.message}</p>}

          {result.pdfBlob && (
            <button onClick={() => downloadBlob(result.pdfBlob, result.pdfFileName)} style={styles.downloadBtn}>
              <DownloadIcon />
              <span>{t.downloadPdf}</span>
            </button>
          )}

          {/* ===== Blockchain: anclaje (emisor) ===== */}
          {(result.type === "registered" || result.type === "already") && (result.record?.hash) && (
            <div style={styles.chainBlock}>
              {!anchorState && (
                <>
                  <button onClick={() => handleAnchor(result.record.hash)} style={styles.anchorBtn}>
                    <CubeIcon size={16} />
                    <span style={{ marginLeft: 8 }}>{t.anchorBtn}</span>
                  </button>
                  <p style={styles.chainExplain}>{t.anchorExplain}</p>
                </>
              )}
              {anchorState === "anchoring" && (
                <div style={styles.chainStatusRow}>
                  <div style={styles.miniSpinner} />
                  <span style={styles.chainStatusText}>{t.anchoring}</span>
                </div>
              )}
              {anchorState && anchorState.error && (
                <div style={styles.chainError}>{t.anchorError}</div>
              )}
              {anchorState && (anchorState.status === "registered" || anchorState.status === "already_registered") && (
                <div style={styles.chainSuccess}>
                  <div style={styles.chainSuccessTitle}>
                    <CubeIcon size={14} />
                    <span style={{ marginLeft: 6 }}>
                      {anchorState.status === "registered" ? t.anchoredOk : t.anchoredAlready}
                    </span>
                  </div>
                  <a href={anchorState.explorerUrl} target="_blank" rel="noopener noreferrer" style={styles.chainLink}>
                    {t.anchorView}
                  </a>
                </div>
              )}
            </div>
          )}

          {/* ===== Blockchain: verificación (verificador) ===== */}
          {result.type === "authentic" && (result.record?.hash) && (
            <div style={styles.chainBlock}>
              {!onchainCheck && (
                <button onClick={() => handleCheckOnChain(result.record.hash)} style={styles.anchorBtnSecondary}>
                  <LinkIcon size={16} />
                  <span style={{ marginLeft: 8 }}>{t.onchainCheck}</span>
                </button>
              )}
              {onchainCheck === "checking" && (
                <div style={styles.chainStatusRow}>
                  <div style={styles.miniSpinner} />
                  <span style={styles.chainStatusText}>{t.onchainChecking}</span>
                </div>
              )}
              {onchainCheck && onchainCheck.error && (
                <div style={styles.chainError}>{t.anchorError}</div>
              )}
              {onchainCheck && onchainCheck.exists === true && (
                <div style={styles.chainSuccess}>
                  <div style={styles.chainSuccessTitle}>
                    <CubeIcon size={14} />
                    <span style={{ marginLeft: 6 }}>{t.onchainYes}</span>
                  </div>
                  <a href={onchainCheck.contractUrl} target="_blank" rel="noopener noreferrer" style={styles.chainLink}>
                    {t.onchainView}
                  </a>
                </div>
              )}
              {onchainCheck && onchainCheck.exists === false && (
                <div style={styles.chainNeutral}>{t.onchainNo}</div>
              )}
            </div>
          )}

          <div style={styles.resultActions}>
            <button onClick={resetResult} style={styles.resetBtn}>
              {role === "issuer" ? t.registerAnother : t.verifyAnother}
            </button>
            <button onClick={goHome} style={styles.resetBtnSecondary}>{t.switchRole}</button>
          </div>
        </div>
      )}

      {/* Registry Log - only on role selection */}
      {!showWelcome && role === null && recentRecords.length > 0 && (
        <div style={styles.registrySection}>
          <h3 style={styles.registryTitle}>{t.recentRegistry}<span style={styles.registryCount}>{recentRecords.length}</span></h3>
          <div style={styles.registryList}>
            {recentRecords.map((r) => (
              <div key={r.id} style={styles.registryItem}>
                <div style={styles.registryItemTop}><span style={styles.registryFileName}>{r.file_name}</span><span style={styles.registryDate}>{formatDate(r.registered_at, lang)}</span></div>
                <div style={styles.registryItemBottom}><code style={styles.registryHash}>{truncateHash(r.hash)}</code><span style={styles.registryBy}>{r.registered_by}{r.role ? ` · ${r.role}` : ""}{r.company ? ` · ${r.company}` : ""}</span></div>
              </div>
            ))}
          </div>
        </div>
      )}

      <footer style={styles.footer}>
        <p style={styles.footerText}>{t.footerText}</p>
      </footer>

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
  headerActions: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8 },
  connectionBadge: { display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", background: "rgba(86, 227, 159, 0.08)", border: "1px solid rgba(86, 227, 159, 0.2)", borderRadius: 20, fontSize: 11, color: "#56e39f", fontFamily: "'DM Mono', monospace" },
  headerButtons: { display: "flex", gap: 8 },
  iconBtn: { background: "transparent", border: "1px solid #2a3148", borderRadius: 8, color: "#8892a6", padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s ease" },
  langBtn: { background: "transparent", border: "1px solid #2a3148", borderRadius: 8, color: "#8892a6", padding: "5px 10px", cursor: "pointer", display: "flex", alignItems: "center", fontSize: 11, fontFamily: "'DM Mono', monospace", fontWeight: 600, letterSpacing: 1, transition: "all 0.2s ease" },

  // Welcome
  welcomeWrap: { width: "100%", maxWidth: 520, zIndex: 1, animation: "fadeIn 0.5s ease-out", background: "rgba(20, 26, 42, 0.6)", border: "1px solid #1e2740", borderRadius: 16, padding: "28px 24px", boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 },
  welcomeIconWrap: { width: 64, height: 64, borderRadius: 16, background: "linear-gradient(135deg, #56e39f 0%, #2ab673 100%)", color: "#0a0f1a", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  welcomeTitle: { fontSize: 26, fontWeight: 600, color: "#e8ecf4", margin: "4px 0 12px", letterSpacing: "-0.3px", textAlign: "center" },
  welcomeIntro: { fontSize: 14, color: "#a3acc2", lineHeight: 1.55, textAlign: "center", margin: "0 0 18px", maxWidth: 440 },
  welcomeSection: { width: "100%", marginTop: 12, padding: "14px 16px", background: "rgba(13, 18, 32, 0.6)", borderRadius: 10, boxSizing: "border-box" },
  welcomeSectionTitle: { fontSize: 13, fontWeight: 600, color: "#56e39f", margin: "0 0 10px", display: "flex", alignItems: "center", gap: 8, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: 1 },
  welcomeBody: { fontSize: 13, color: "#b3bbcb", lineHeight: 1.6, margin: "0 0 10px" },
  hashExample: { display: "block", fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#56e39f", background: "rgba(86,227,159,0.05)", padding: "8px 10px", borderRadius: 6, wordBreak: "break-all", textAlign: "center", border: "1px solid rgba(86,227,159,0.15)" },
  stepsList: { display: "flex", flexDirection: "column", gap: 12, marginTop: 4 },
  stepItem: { display: "flex", alignItems: "flex-start", gap: 12 },
  stepNum: { minWidth: 26, height: 26, borderRadius: 13, background: "rgba(86,227,159,0.12)", border: "1px solid rgba(86,227,159,0.3)", color: "#56e39f", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 600 },
  stepBody: { flex: 1 },
  stepTitle: { fontSize: 13, fontWeight: 600, color: "#e8ecf4", marginBottom: 2 },
  stepDesc: { fontSize: 12, color: "#8892a6", lineHeight: 1.5 },
  welcomeNote: { width: "100%", marginTop: 14, padding: "10px 14px", background: "rgba(86,227,159,0.06)", border: "1px solid rgba(86,227,159,0.18)", borderRadius: 8, fontSize: 11, color: "#56e39f", lineHeight: 1.5, fontFamily: "'DM Mono', monospace", textAlign: "center", boxSizing: "border-box" },
  welcomeBtn: { marginTop: 20, padding: "12px 32px", background: "linear-gradient(135deg, #56e39f 0%, #2ab673 100%)", color: "#0a0f1a", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, fontFamily: "'Outfit', sans-serif", cursor: "pointer", transition: "transform 0.2s ease" },

  // Role selection
  roleSelectWrap: { width: "100%", maxWidth: 480, zIndex: 1, animation: "fadeIn 0.5s ease-out", display: "flex", flexDirection: "column", alignItems: "center" },
  flowTitleCenter: { fontSize: 24, fontWeight: 600, color: "#e8ecf4", margin: "8px 0 6px", letterSpacing: "-0.3px", textAlign: "center" },
  welcomeText: { fontSize: 14, color: "#6b7a96", margin: "0 0 28px", fontFamily: "'DM Mono', monospace" },
  roleCardList: { width: "100%", display: "flex", flexDirection: "column", gap: 14 },
  roleCard: { width: "100%", padding: "20px 22px", background: "rgba(20, 26, 42, 0.6)", border: "1px solid #2a3148", borderRadius: 14, cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 16, textAlign: "left", color: "inherit", fontFamily: "inherit", transition: "all 0.25s ease" },
  roleCardIcon: { color: "#56e39f", flexShrink: 0, marginTop: 2 },
  roleCardBody: { flex: 1 },
  roleCardTitle: { fontSize: 17, fontWeight: 600, color: "#e8ecf4", margin: "0 0 2px" },
  roleCardSub: { fontSize: 11, color: "#56e39f", marginBottom: 6, fontFamily: "'DM Mono', monospace", letterSpacing: 1, textTransform: "uppercase" },
  roleCardDesc: { fontSize: 13, color: "#8892a6", margin: 0, lineHeight: 1.5 },

  flowTitle: { fontSize: 22, fontWeight: 600, color: "#e8ecf4", margin: "4px 0 8px", letterSpacing: "-0.3px", zIndex: 1 },
  backLink: { background: "transparent", border: "none", color: "#5a6580", fontSize: 12, fontFamily: "'DM Mono', monospace", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, marginBottom: 8, padding: "4px 8px", zIndex: 1, transition: "color 0.2s ease" },

  modeDescription: { maxWidth: 440, textAlign: "center", fontSize: 14, lineHeight: 1.6, color: "#6b7a96", marginBottom: 24, zIndex: 1, animation: "fadeIn 0.6s ease-out 0.2s both", padding: "0 8px" },

  identityCard: { width: "100%", maxWidth: 440, marginBottom: 20, zIndex: 1, animation: "fadeIn 0.4s ease-out", background: "rgba(20, 26, 42, 0.5)", border: "1px solid #1e2740", borderRadius: 12, padding: "16px 18px", boxSizing: "border-box" },
  identityTitle: { fontSize: 12, fontWeight: 600, color: "#6b7a96", margin: "0 0 14px", fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "1px" },
  fieldGroup: { marginBottom: 12 },
  fieldLabel: { display: "block", fontSize: 12, fontWeight: 500, color: "#8892a6", marginBottom: 6, fontFamily: "'DM Mono', monospace" },
  required: { color: "#ef5350" },
  fieldInput: { width: "100%", padding: "10px 12px", background: "#0d1220", border: "1px solid #2a3148", borderRadius: 8, color: "#c8ceda", fontSize: 14, fontFamily: "'Outfit', sans-serif", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s ease" },
  validationErrorBox: { fontSize: 12, color: "#ef5350", marginTop: 8, fontFamily: "'DM Mono', monospace", padding: "8px 10px", background: "rgba(239, 83, 80, 0.08)", border: "1px solid rgba(239, 83, 80, 0.25)", borderRadius: 6 },

  captureWrap: { width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, zIndex: 1, animation: "fadeIn 0.6s ease-out 0.3s both" },
  dropzone: { width: "100%", padding: "36px 24px", borderRadius: 16, border: "2px dashed", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.3s ease", boxSizing: "border-box" },
  uploadIconWrap: { marginBottom: 12, transition: "color 0.3s ease" },
  dropText: { fontSize: 15, color: "#8892a6", margin: "0 0 6px", textAlign: "center" },
  browseLink: { color: "#56e39f", textDecoration: "underline", textUnderlineOffset: 3 },
  dropSubtext: { fontSize: 12, color: "#4a5578", margin: 0, fontFamily: "'DM Mono', monospace", textAlign: "center" },
  divider: { width: "100%", display: "flex", alignItems: "center", margin: "4px 0", gap: 12 },
  dividerText: { fontSize: 11, color: "#3d4660", fontFamily: "'DM Mono', monospace", letterSpacing: 2 },

  captureBtnPrimary: { width: "100%", padding: "16px 24px", background: "linear-gradient(135deg, #56e39f 0%, #2ab673 100%)", color: "#0a0f1a", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 600, fontFamily: "'Outfit', sans-serif", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, transition: "transform 0.2s ease" },
  captureBtnSecondary: { width: "100%", padding: "14px 24px", background: "rgba(20, 26, 42, 0.5)", color: "#8892a6", border: "1px solid #2a3148", borderRadius: 12, fontSize: 14, fontWeight: 500, fontFamily: "'Outfit', sans-serif", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s ease" },
  captureHint: { fontSize: 12, color: "#4a5578", textAlign: "center", marginTop: 8, fontFamily: "'DM Mono', monospace", lineHeight: 1.5 },

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
  resultActions: { display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" },
  resetBtn: { padding: "10px 24px", background: "transparent", border: "1px solid #2a3148", borderRadius: 8, color: "#8892a6", fontSize: 13, fontFamily: "'Outfit', sans-serif", fontWeight: 500, cursor: "pointer", transition: "all 0.2s ease" },
  resetBtnSecondary: { padding: "10px 24px", background: "transparent", border: "1px solid #2a3148", borderRadius: 8, color: "#5a6580", fontSize: 13, fontFamily: "'Outfit', sans-serif", fontWeight: 500, cursor: "pointer", transition: "all 0.2s ease" },

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

  // Blockchain UI
  chainBlock: { width: "100%", marginBottom: 16, paddingTop: 4 },
  anchorBtn: { width: "100%", padding: "12px 20px", background: "linear-gradient(135deg, #6b8cff 0%, #4361ee 100%)", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontFamily: "'Outfit', sans-serif", fontWeight: 600, cursor: "pointer", transition: "all 0.2s ease", display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box" },
  anchorBtnSecondary: { width: "100%", padding: "11px 20px", background: "rgba(107, 140, 255, 0.1)", border: "1px solid rgba(107, 140, 255, 0.35)", borderRadius: 8, color: "#8fa6ff", fontSize: 13, fontFamily: "'Outfit', sans-serif", fontWeight: 500, cursor: "pointer", transition: "all 0.2s ease", display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box" },
  chainExplain: { fontSize: 11, color: "#5a6580", marginTop: 8, marginBottom: 0, lineHeight: 1.5, textAlign: "center", fontFamily: "'DM Mono', monospace" },
  chainStatusRow: { display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "10px 0" },
  miniSpinner: { width: 18, height: 18, border: "2px solid #1e2740", borderTopColor: "#6b8cff", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  chainStatusText: { fontSize: 13, color: "#8fa6ff", fontFamily: "'DM Mono', monospace" },
  chainSuccess: { padding: "12px 14px", background: "rgba(107, 140, 255, 0.08)", border: "1px solid rgba(107, 140, 255, 0.3)", borderRadius: 8, textAlign: "center" },
  chainSuccessTitle: { fontSize: 13, fontWeight: 600, color: "#8fa6ff", marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Mono', monospace" },
  chainLink: { fontSize: 12, color: "#8fa6ff", textDecoration: "underline", textUnderlineOffset: 3, fontFamily: "'DM Mono', monospace", wordBreak: "break-all" },
  chainError: { fontSize: 12, color: "#e0a04d", padding: "10px 14px", background: "rgba(224, 160, 77, 0.08)", border: "1px solid rgba(224, 160, 77, 0.3)", borderRadius: 8, textAlign: "center", lineHeight: 1.4 },
  chainNeutral: { fontSize: 12, color: "#8892a6", padding: "10px 14px", background: "rgba(136, 146, 166, 0.08)", border: "1px solid rgba(136, 146, 166, 0.25)", borderRadius: 8, textAlign: "center" },
};
