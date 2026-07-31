// Normaliza un hash SHA-256 (64 hex chars) al formato bytes32 (0x-prefijado).
// CommonJS: compartido por las dos Netlify Functions.
function toBytes32(hash) {
  const clean = hash.startsWith("0x") ? hash.slice(2) : hash;
  if (!/^[0-9a-fA-F]{64}$/.test(clean)) {
    throw new Error("El hash debe ser SHA-256 (64 caracteres hexadecimales).");
  }
  return "0x" + clean.toLowerCase();
}

module.exports = { toBytes32 };
