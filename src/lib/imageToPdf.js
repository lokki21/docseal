import jsPDF from "jspdf";

// Convierte una imagen (foto de documento) en un PDF canónico A4 antes de calcular la huella.
export async function imageToPdf(imageFile) {
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
