// Netlify Function: verifica una huella contra el contrato (solo lectura, sin gas).
// Se mantiene pública: no consume gas ni requiere sesión.
// Variables de entorno: RPC_URL, CONTRACT_ADDRESS, CHAIN_ID
const { ethers } = require("ethers");
const { toBytes32 } = require("./utils/bytes32.js");

const ABI = [
  "function verify(bytes32 documentHash) external view returns (bool exists, uint64 timestamp, address registrar)",
];
const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: HEADERS, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: "Method not allowed" }) };

  try {
    const { hash } = JSON.parse(event.body || "{}");
    if (!hash) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: "Falta el campo 'hash'." }) };

    const documentHash = toBytes32(hash);
    const { RPC_URL, CONTRACT_ADDRESS } = process.env;
    const CHAIN_ID = parseInt(process.env.CHAIN_ID || "84532", 10);
    if (!RPC_URL || !CONTRACT_ADDRESS) {
      return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: "Faltan variables de entorno." }) };
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
    const [exists, ts, registrar] = await contract.verify(documentHash);

    const explorerBase = CHAIN_ID === 8453 ? "https://basescan.org" : "https://sepolia.basescan.org";
    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        exists,
        timestamp: Number(ts),
        registrar,
        contractUrl: `${explorerBase}/address/${CONTRACT_ADDRESS}`,
      }),
    };
  } catch (err) {
    console.error("verify-onchain error:", err);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: err.message || "Error interno." }) };
  }
};
