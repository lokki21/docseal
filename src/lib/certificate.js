import jsPDF from "jspdf";
import QRCode from "qrcode";
import { makeCertId } from "./format.js";

// ================== Generador de certificados PDF ==================
// Genera dos tipos de certificado, misma familia visual:
//  - "registro": constancia de emisión + anclaje (banner navy/dorado)
//  - "verificacion": certificado de verificación (banner verde)
// Helvetica de jsPDF soporta acentos (WinAnsi), así que no hace falta fuente embebida.
const CERT_COLORS = {
  navy: [11, 31, 58], emerald: [42, 182, 115], gold: [201, 169, 97],
  red: [192, 57, 43], gray: [110, 116, 128], lightgray: [240, 242, 247], dark: [34, 34, 34],
};

// data: { kind, archivo, hash, lang,
//   verificadorNombre, verificadorCargo, verificadorEntidad, fechaVerificacion,
//   emisorNombre, emisorCargo, emisorCompania, fechaRegistro,
//   txHash, red, explorerUrl, autentico }
export async function generateCertificatePdf(data) {
  const C = CERT_COLORS;
  const isReg = data.kind === "registro";
  const lang = data.lang || "es";
  const es = lang === "es";
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210, M = 18;
  let y = 0;

  const accent = isReg ? C.gold : C.emerald;
  const certId = makeCertId(isReg ? "DS-REG" : "DS-VER", data.hash, isReg ? data.fechaRegistro : data.fechaVerificacion);

  // top bar
  doc.setFillColor(...C.navy); doc.rect(0, 0, W, 6, "F");

  // header
  y = 20;
  doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.setTextColor(...C.navy);
  doc.text("DocSeal", M, y);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...C.gray);
  const subt = isReg
    ? (es ? "Constancia de Registro y Anclaje en Blockchain" : "Registration & Blockchain Anchoring Certificate")
    : (es ? "Certificado de Verificación de Autenticidad" : "Authenticity Verification Certificate");
  doc.text(subt, M, y + 6);
  doc.setFontSize(8); doc.setTextColor(...C.gray);
  const idLabel = es ? "N.º" : "No.";
  doc.text(`${es ? "Documento" : "Document"} ${idLabel} ${certId}`, W - M, y - 2, { align: "right" });
  const dateLabel = isReg ? (es ? "Registrado" : "Registered") : (es ? "Verificado" : "Verified");
  doc.text(`${dateLabel}: ${isReg ? data.fechaRegistro : data.fechaVerificacion}`, W - M, y + 2.5, { align: "right" });

  // divider
  y += 12;
  doc.setDrawColor(...accent); doc.setLineWidth(0.8); doc.line(M, y, W - M, y);

  // verdict banner
  y += 10;
  const bannerOk = isReg ? true : data.autentico;
  const bannerColor = isReg ? C.navy : (data.autentico ? C.emerald : C.red);
  doc.setFillColor(...bannerColor);
  doc.roundedRect(M, y, W - 2 * M, 26, 2, 2, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.setTextColor(...(isReg ? C.gold : [255, 255, 255]));
  const eyebrow = isReg
    ? (es ? "CONSTANCIA DE REGISTRO" : "REGISTRATION RECORD")
    : (es ? "RESULTADO DE LA VERIFICACIÓN" : "VERIFICATION RESULT");
  doc.text(eyebrow, M + 8, y + 9);
  doc.setTextColor(255, 255, 255); doc.setFontSize(20);
  const verdict = isReg
    ? (es ? "PÓLIZA REGISTRADA" : "POLICY REGISTERED")
    : (data.autentico ? (es ? "DOCUMENTO AUTÉNTICO" : "AUTHENTIC DOCUMENT") : (es ? "DOCUMENTO NO VERIFICADO" : "NOT VERIFIED"));
  doc.text(verdict, M + 8, y + 19);
  // seal/circle
  doc.setFillColor(...(isReg ? C.gold : [255, 255, 255]));
  doc.circle(W - M - 16, y + 13, 7, "F");
  doc.setTextColor(...(isReg ? C.navy : bannerColor));
  doc.setFontSize(13); doc.setFont("helvetica", "bold");
  doc.text(bannerOk ? "OK" : "X", W - M - 16, y + 15.5, { align: "center" });

  // summary
  y += 34;
  doc.setTextColor(...C.dark); doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  let resumen;
  if (isReg && data.txHash) {
    resumen = es
      ? "Esta póliza fue registrada en DocSeal y su huella criptográfica quedó anclada de forma permanente en la blockchain de Base. A partir de esta fecha, cualquier copia idéntica puede verificarse como auténtica; cualquier alteración, por mínima que sea, será detectada."
      : "This policy was registered in DocSeal and its cryptographic fingerprint was permanently anchored on the Base blockchain. From this date, any identical copy can be verified as authentic; any alteration, however small, will be detected.";
  } else if (isReg) {
    // Honestidad: sin anclaje on-chain, la constancia no debe afirmar que existe.
    resumen = es
      ? "Esta póliza fue registrada en DocSeal (sin anclaje en blockchain). Su huella criptográfica permite detectar cualquier alteración: cualquier copia idéntica puede verificarse como auténtica contra el registro de DocSeal."
      : "This policy was registered in DocSeal (no blockchain anchor). Its cryptographic fingerprint allows any alteration to be detected: any identical copy can be verified as authentic against the DocSeal registry.";
  } else if (data.autentico) {
    resumen = es
      ? "El documento verificado coincide exactamente con el documento original registrado. No ha sido modificado desde su emisión. Su autenticidad está respaldada por un registro criptográfico público e inalterable."
      : "The verified document matches the original registered document exactly. It has not been modified since issuance. Its authenticity is backed by a public, immutable cryptographic record.";
  } else {
    resumen = es
      ? "El documento verificado NO coincide con ningún registro original. Puede haber sido alterado o no haber sido registrado nunca. Se recomienda confirmar con la entidad emisora."
      : "The verified document does NOT match any original record. It may have been altered or never registered. Confirm with the issuing entity.";
  }
  const lines = doc.splitTextToSize(resumen, W - 2 * M);
  doc.text(lines, M, y);
  y += lines.length * 5 + 6;

  const colW = (W - 2 * M - 8) / 2;
  const col2x = M + colW + 8;
  function sectionTitle(text, yy, x = M, w = W - 2 * M) {
    doc.setFillColor(...C.lightgray); doc.rect(x, yy - 4, w, 7, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...C.navy);
    doc.text(text.toUpperCase(), x + 3, yy + 1);
    return yy + 10;
  }
  function field(label, value, x, yy, valBold = false) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...C.gray);
    doc.text(label.toUpperCase(), x, yy);
    doc.setFont("helvetica", valBold ? "bold" : "normal"); doc.setFontSize(9.5); doc.setTextColor(...C.dark);
    doc.text(value || "—", x, yy + 4.5);
  }

  // document section
  y = sectionTitle(es ? "Documento" : "Document", y);
  field(es ? "Archivo" : "File", data.archivo, M, y, true);
  y += 13;

  if (isReg) {
    // registered by (single protagonist)
    y = sectionTitle(es ? "Registrado por" : "Registered by", y);
    field(es ? "Nombre" : "Name", data.emisorNombre, M, y);
    field(es ? "Cargo" : "Role", data.emisorCargo, col2x, y);
    y += 11;
    field(es ? "Compañía" : "Company", data.emisorCompania, M, y);
    field(es ? "Fecha de registro" : "Registration date", data.fechaRegistro, col2x, y);
    y += 14;
  } else {
    // two columns: verifier / issuer
    sectionTitle(es ? "Verificado por" : "Verified by", y, M, colW);
    const yStart = sectionTitle(es ? "Emitido originalmente por" : "Originally issued by", y, col2x, colW);
    let yy = yStart;
    field(es ? "Nombre" : "Name", data.verificadorNombre, M, yy);
    field(es ? "Nombre" : "Name", data.emisorNombre, col2x, yy);
    yy += 11;
    field(es ? "Cargo" : "Role", data.verificadorCargo, M, yy);
    field(es ? "Cargo" : "Role", data.emisorCargo, col2x, yy);
    yy += 11;
    field(es ? "Entidad" : "Entity", data.verificadorEntidad, M, yy);
    field(es ? "Compañía" : "Company", data.emisorCompania, col2x, yy);
    yy += 11;
    field(es ? "Fecha de verificación" : "Verification date", data.fechaVerificacion, M, yy);
    field(es ? "Fecha de registro" : "Registration date", data.fechaRegistro, col2x, yy);
    yy += 14;
    y = yy;
  }

  // cryptographic proof
  y = sectionTitle(es ? "Prueba criptográfica" + (isReg ? " (anclaje en blockchain)" : " (para auditoría independiente)") : "Cryptographic proof", y);
  const qrSize = 34;
  let qrOk = false;
  const qrTarget = data.publicUrl || data.explorerUrl;
  if (qrTarget) {
    try {
      const qrDataUrl = await QRCode.toDataURL(qrTarget, { margin: 1, width: 200 });
      doc.addImage(qrDataUrl, "PNG", W - M - qrSize, y - 2, qrSize, qrSize);
      doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...C.gray);
      doc.text(es ? "Escanee para verificar" : "Scan to verify", W - M - qrSize / 2, y + qrSize + 2, { align: "center" });
      qrOk = true;
    } catch (e) { qrOk = false; }
  }
  const proofW = W - 2 * M - (qrOk ? qrSize + 6 : 0);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...C.gray);
  doc.text(es ? "HUELLA DIGITAL DEL DOCUMENTO (SHA-256)" : "DOCUMENT FINGERPRINT (SHA-256)", M, y);
  doc.setFont("courier", "normal"); doc.setFontSize(7.5); doc.setTextColor(...C.dark);
  const hashLines = doc.splitTextToSize(data.hash || "—", proofW);
  doc.text(hashLines, M, y + 4);
  let yProof = y + 4 + hashLines.length * 3.5 + 4;
  if (data.txHash) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...C.gray);
    doc.text(`${es ? "REGISTRO EN BLOCKCHAIN" : "BLOCKCHAIN RECORD"} (${es ? "RED" : "NETWORK"} ${(data.red || "BASE").toUpperCase()})`, M, yProof);
    doc.setFont("courier", "normal"); doc.setFontSize(7.5); doc.setTextColor(...C.dark);
    const txLines = doc.splitTextToSize(data.txHash, proofW);
    doc.text(txLines, M, yProof + 4);
    // La URL en texto plano hace la prueba autosuficiente: verificable aunque
    // docseal.app deje de existir.
    if (data.txExplorerUrl) {
      const urlY = yProof + 4 + txLines.length * 3.5 + 2;
      const urlLines = doc.splitTextToSize(data.txExplorerUrl, proofW);
      doc.text(urlLines, M, urlY);
    }
  } else {
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...C.gray);
    doc.text(es ? "Registrado en DocSeal (sin anclaje en blockchain)" : "Registered in DocSeal (no blockchain anchor)", M, yProof);
  }

  // how to verify
  y = y + qrSize + 8;
  doc.setDrawColor(...C.gold); doc.setLineWidth(0.4); doc.line(M, y, W - M, y);
  y += 6;
  doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(...C.navy);
  const howTitle = isReg
    ? (es ? "CÓMO PUEDE VERIFICARSE ESTA PÓLIZA" : "HOW THIS POLICY CAN BE VERIFIED")
    : (es ? "CÓMO VERIFICAR ESTE CERTIFICADO USTED MISMO" : "HOW TO VERIFY THIS CERTIFICATE YOURSELF");
  doc.text(howTitle, M, y);
  y += 5;
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...C.dark);
  let steps;
  if (isReg) {
    steps = es
      ? ["1. Cualquier receptor de esta póliza puede comprobar su autenticidad en DocSeal o escaneando el QR.",
         "2. El sistema calcula la huella SHA-256 del documento y la compara con la registrada en blockchain.",
         "3. Si las huellas coinciden, el documento es idéntico al registrado en esta fecha y es auténtico.",
         "Este registro es público e inalterable. No requiere confiar en DocSeal ni en ningún intermediario."]
      : ["1. Any recipient of this policy can verify its authenticity in DocSeal or by scanning the QR code.",
         "2. The system computes the document's SHA-256 fingerprint and compares it to the one recorded on-chain.",
         "3. If the fingerprints match, the document is identical to the one registered on this date and is authentic.",
         "This record is public and immutable. It requires no trust in DocSeal or any intermediary."];
  } else {
    steps = es
      ? ["1. Escanee el código QR o visite el enlace de la transacción en la blockchain de Base.",
         "2. Confirme que la huella (SHA-256) registrada coincide con la que aparece en este certificado.",
         "3. Para comprobar el documento: calcule la huella SHA-256 del PDF original y verifique que sea idéntica a la de arriba.",
         "Este registro es público e inalterable. No requiere confiar en DocSeal ni en ningún intermediario."]
      : ["1. Scan the QR code or open the transaction link on the Base blockchain.",
         "2. Confirm the recorded SHA-256 fingerprint matches the one shown on this certificate.",
         "3. To check the document: compute the SHA-256 fingerprint of the original PDF and verify it matches the one above.",
         "This record is public and immutable. It requires no trust in DocSeal or any intermediary."];
  }
  const stepLines = doc.splitTextToSize(steps.join("\n"), W - 2 * M);
  doc.text(stepLines, M, y);

  // footer
  const footY = 280;
  doc.setDrawColor(...C.gray); doc.setLineWidth(0.3); doc.line(M, footY, W - M, footY);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...C.gray);
  const footMsg = isReg
    ? (es ? "Esta constancia fue generada por DocSeal. El registro se basa en una huella SHA-256 anclada en la blockchain de Base."
          : "This record was generated by DocSeal. It is based on a SHA-256 fingerprint anchored on the Base blockchain.")
    : (es ? "Este certificado fue generado por DocSeal. La autenticidad se basa en una huella SHA-256 anclada en la blockchain de Base."
          : "This certificate was generated by DocSeal. Authenticity is based on a SHA-256 fingerprint anchored on the Base blockchain.");
  doc.text(footMsg, M, footY + 4);
  doc.text(`docseal.app  ·  ${es ? "Documento" : "Document"} ${idLabel} ${certId}`, M, footY + 8);
  doc.setFillColor(...C.navy); doc.rect(0, 293, W, 4, "F");

  const safeArchivo = (data.archivo || "documento").replace(/\.[^/.]+$/, "");
  const fileName = `${isReg ? (es ? "Constancia" : "Registration") : (es ? "Certificado" : "Certificate")}-${safeArchivo}.pdf`;
  doc.save(fileName);
}
