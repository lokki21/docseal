import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { hashBytes } from "../src/lib/crypto.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => new Uint8Array(readFileSync(join(root, p)));

it("all four demo assets exist and the tampered copy hashes differently", async () => {
  const authentic = await hashBytes(read("public/demo/poliza-seriedad-oferta-demostrativa-DEMO.pdf"));
  const tampered = await hashBytes(read("public/demo/poliza-seriedad-oferta-TAMPERED-DEMO.pdf"));
  read("public/demo/poliza-obra-publica-andina-DEMO.pdf");   // exists (throws if not)
  read("public/demo/poliza-suministro-fianzas-DEMO.pdf");    // exists (throws if not)
  expect(tampered).not.toBe(authentic);
});
