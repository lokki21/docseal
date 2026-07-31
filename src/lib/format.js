// Formatting helpers moved verbatim from the original App.jsx.
export function formatDate(iso, lang) {
  const locale = lang === "es" ? "es-ES" : "en-US";
  return new Date(iso).toLocaleString(locale, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function truncateHash(h) { return h.slice(0, 12) + "..." + h.slice(-12); }

export function fmtCertDate(iso, lang) {
  const locale = lang === "es" ? "es-ES" : "en-US";
  try {
    return new Date(iso).toLocaleString(locale, {
      year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch { return String(iso); }
}

export function makeCertId(prefix, hash, iso) {
  const d = new Date(iso);
  const ymd = isNaN(d) ? "00000000" : `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const tail = (hash || "").slice(-6).toUpperCase();
  return `${prefix}-${ymd}-${tail}`;
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
