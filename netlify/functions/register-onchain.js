// Netlify Function: ancla una huella en el contrato DocSealRegistry.
// Requiere sesión de aseguradora (token de Supabase). La clave privada del
// operador vive solo en variables de entorno del servidor.
// Env vars: OPERATOR_PRIVATE_KEY, CONTRACT_ADDRESS, RPC_URL, CHAIN_ID,
//           SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
const { ethers } = require("ethers");
const { toBytes32 } = require("./utils/bytes32.js");

const ABI = [
  "function register(bytes32 documentHash) external",
  "function verify(bytes32 documentHash) external view returns (bool exists, uint64 timestamp, address registrar)",
];
const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

// Valida el token de sesión del solicitante. Devuelve el user id o null.
async function validateUser(token) {
  if (!token) return null;
  const res = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: process.env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const user = await res.json();
  return user.id || null;
}

// Escribe el resultado del anclaje en la fila del documento (service role omite RLS).
async function updateAnchor(hash, fields) {
  await fetch(`${process.env.SUPABASE_URL}/rest/v1/documents?hash=eq.${hash}`, {
    method: "PATCH",
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(fields),
  });
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: HEADERS, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: "Method not allowed" }) };

  try {
    const token = (event.headers.authorization || event.headers.Authorization || "").replace(/^Bearer\s+/i, "");
    const userId = await validateUser(token);
    if (!userId) return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ error: "No autorizado." }) };

    const { hash } = JSON.parse(event.body || "{}");
    if (!hash) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: "Falta el campo 'hash'." }) };
    const documentHash = toBytes32(hash);
    const cleanHash = documentHash.slice(2);

    const { RPC_URL, CONTRACT_ADDRESS, OPERATOR_PRIVATE_KEY } = process.env;
    const CHAIN_ID = parseInt(process.env.CHAIN_ID || "84532", 10);
    if (!RPC_URL || !CONTRACT_ADDRESS || !OPERATOR_PRIVATE_KEY) {
      return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: "Faltan variables de entorno en el servidor." }) };
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID);
    const wallet = new ethers.Wallet(OPERATOR_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);
    const explorerBase = CHAIN_ID === 8453 ? "https://basescan.org" : "https://sepolia.basescan.org";

    // ¿Ya está anclado? (evita gastar gas)
    const [exists] = await contract.verify(documentHash);
    if (exists) {
      await updateAnchor(cleanHash, { anchor_status: "anchored" });
      return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({ status: "already_registered", hash: documentHash, explorerUrl: `${explorerBase}/address/${CONTRACT_ADDRESS}` }),
      };
    }

    const tx = await contract.register(documentHash);
    const receipt = await tx.wait(1);
    await updateAnchor(cleanHash, { anchor_status: "anchored", anchor_tx: receipt.hash, anchored_at: new Date().toISOString() });
    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        status: "registered",
        hash: documentHash,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        explorerUrl: `${explorerBase}/tx/${receipt.hash}`,
        contractUrl: `${explorerBase}/address/${CONTRACT_ADDRESS}`,
      }),
    };
  } catch (err) {
    console.error("register-onchain error:", err);
    try {
      const { hash } = JSON.parse(event.body || "{}");
      if (hash) await updateAnchor(toBytes32(hash).slice(2), { anchor_status: "failed" });
    } catch {}
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: "Error interno." }) };
  }
};
