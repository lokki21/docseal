// One-off build-time script (NOT imported by the app). Produces a visibly
// altered copy of an authentic demo policy so its SHA-256 differs, to
// demonstrate a failing verification. Run once from the repo root; commit the
// output PDF.
//   node scripts/make-tampered-demo.mjs
// NOTE: SRC reads the original from templates polizas/. The app and the
// demo-assets test consume public/demo/, so the same authentic PDF must be
// copied there (see plan Task 3). Keep the two in sync if the original changes.
import { readFileSync, writeFileSync } from "node:fs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const SRC = "templates polizas/poliza-seriedad-oferta-demostrativa-DEMO.pdf";
const OUT = "public/demo/poliza-seriedad-oferta-TAMPERED-DEMO.pdf";

const pdf = await PDFDocument.load(readFileSync(SRC));
const page = pdf.getPages()[0];
const font = await pdf.embedFont(StandardFonts.HelveticaBold);
const { height } = page.getSize();
page.drawText("VALOR ASEGURADO: $999.999.999  (COPIA ALTERADA)", {
  x: 36, y: height - 110, size: 13, font, color: rgb(0.78, 0.05, 0.05),
});
writeFileSync(OUT, await pdf.save());
console.log("Wrote", OUT);
