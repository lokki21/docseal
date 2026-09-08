// Describes the bundled demo policies and loads them as File objects so they
// flow through the exact same code path as a user-dropped file.
export const DEMO_POLICIES = [
  {
    id: "obra-publica",
    file: "/demo/poliza-obra-publica-andina-DEMO.pdf",
    titleEs: "Póliza de cumplimiento — obra pública",
    titleEn: "Performance bond — public works",
    descEs: "Contrato de obra pública andina (demostrativa).",
    descEn: "Andean public-works contract (demo).",
    policyType: "Cumplimiento",
    kind: "authentic",
  },
  {
    id: "seriedad-oferta",
    file: "/demo/poliza-seriedad-oferta-demostrativa-DEMO.pdf",
    titleEs: "Póliza de seriedad de la oferta",
    titleEn: "Bid bond",
    descEs: "Garantía de seriedad de oferta (demostrativa).",
    descEn: "Bid-seriousness guarantee (demo).",
    policyType: "Seriedad de oferta",
    kind: "authentic",
  },
  {
    id: "suministro",
    file: "/demo/poliza-suministro-fianzas-DEMO.pdf",
    titleEs: "Póliza de suministro — fianzas",
    titleEn: "Supply bond",
    descEs: "Garantía de suministro (demostrativa).",
    descEn: "Supply guarantee (demo).",
    policyType: "Suministro",
    kind: "authentic",
  },
];

// The tampered artefact is an altered copy of the seriedad-oferta policy.
export const TAMPERED = {
  file: "/demo/poliza-seriedad-oferta-TAMPERED-DEMO.pdf",
  basedOn: "seriedad-oferta",
};

export async function fetchDemoFile(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`No se pudo cargar el archivo demo (${res.status}): ${path}`);
  const blob = await res.blob();
  const name = path.split("/").pop();
  return new File([blob], name, { type: "application/pdf" });
}
