// SHA-256 fingerprinting. These two functions define what a "huella" means —
// they are moved verbatim from the original App.jsx and must never change silently.
export async function hashBytes(bytes) {
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashFile(file) {
  return hashBytes(await file.arrayBuffer());
}
