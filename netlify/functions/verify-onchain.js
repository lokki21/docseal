// Netlify Function: verifica una huella contra el contrato (solo lectura, sin gas).
// Útil para mostrar en el flujo del verificador que el registro está on-chain.
//
// Variables de entorno: RPC_URL, CONTRACT_ADDRESS, CHAIN_ID

const { ethers } = require("ethers");

const ABI = [
  "function verify(bytes32 documentHash) external view returns (bool exists, uint64 timestamp, address registrar)",
];

function toBytes32(hash) {
  const clean = hash.startsWith("0x") ? hash.slice(2) : hash;
  if (!/^[0-9a-fA-F]{64}$/.test(clean)) {
    throw new Error("El hash debe ser SHA-256 (64 caracteres hexadecimales).");
  }
  return "0x" + clean.toLowerCase();
}

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  try {
    const { hash } = JSON.parse(event.body || "{}");
    if (!hash) return { statusCode: 400, headers, body: JSON.stringify({ error: "Falta el campo 'hash'." }) };

    const documentHash = toBytes32(hash);
    const RPC_URL = process.env.RPC_URL;
    const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
    const CHAIN_ID = parseInt(process.env.CHAIN_ID || "84532", 10);

    if (!RPC_URL || !CONTRACT_ADDRESS) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: "Faltan variables de entorno." }) };
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
    const [exists, ts, registrar] = await contract.verify(documentHash);

    const explorerBase = CHAIN_ID === 8453 ? "https://basescan.org" : "https://sepolia.basescan.org";

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        exists,
        timestamp: Number(ts),
        registrar,
        contractUrl: `${explorerBase}/address/${CONTRACT_ADDRESS}`,
      }),
    };
  } catch (err) {
    console.error("verify-onchain error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message || "Error interno." }) };
  }
};
aegir@aegirs-MacBook-Pro docseal-blockchain % cat netlify/functions/verify-onchain.js
// Netlify Function: verifica una huella contra el contrato (solo lectura, sin gas).
// Útil para mostrar en el flujo del verificador que el registro está on-chain.
//
// Variables de entorno: RPC_URL, CONTRACT_ADDRESS, CHAIN_ID

const { ethers } = require("ethers");

const ABI = [
  "function verify(bytes32 documentHash) external view returns (bool exists, uint64 timestamp, address registrar)",
];

function toBytes32(hash) {
  const clean = hash.startsWith("0x") ? hash.slice(2) : hash;
  if (!/^[0-9a-fA-F]{64}$/.test(clean)) {
    throw new Error("El hash debe ser SHA-256 (64 caracteres hexadecimales).");
  }
  return "0x" + clean.toLowerCase();
}

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  try {
    const { hash } = JSON.parse(event.body || "{}");
    if (!hash) return { statusCode: 400, headers, body: JSON.stringify({ error: "Falta el campo 'hash'." }) };

    const documentHash = toBytes32(hash);
    const RPC_URL = process.env.RPC_URL;
    const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
    const CHAIN_ID = parseInt(process.env.CHAIN_ID || "84532", 10);

    if (!RPC_URL || !CONTRACT_ADDRESS) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: "Faltan variables de entorno." }) };
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
    const [exists, ts, registrar] = await contract.verify(documentHash);

    const explorerBase = CHAIN_ID === 8453 ? "https://basescan.org" : "https://sepolia.basescan.org";

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        exists,
        timestamp: Number(ts),
        registrar,
        contractUrl: `${explorerBase}/address/${CONTRACT_ADDRESS}`,
      }),
    };
  } catch (err) {
    console.error("verify-onchain error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message || "Error interno." }) };
  }
};

