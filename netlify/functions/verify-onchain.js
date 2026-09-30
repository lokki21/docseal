// Netlify Function: verifica una huella contra el contrato (solo lectura, sin gas).
// Se mantiene pública: no consume gas ni requiere sesión.
// Variables de entorno: RPC_URL, CONTRACT_ADDRESS, CHAIN_ID
import { ethers } from "ethers";
import { toBytes32 } from "./utils/bytes32.js";

const ABI = [
  "function verify(bytes32 documentHash) external view returns (bool exists, uint64 timestamp, address registrar)",
];
const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

export const handler = async (event) => {
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

    // Config guard: surface our own misconfiguration loudly, never as a verdict.
    const net = await provider.getNetwork();
    if (Number(net.chainId) !== CHAIN_ID) {
      return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ kind: "config", error: `Chain id mismatch: expected ${CHAIN_ID}, got ${Number(net.chainId)}.` }) };
    }
    const code = await provider.getCode(CONTRACT_ADDRESS);
    if (!code || code === "0x") {
      return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ kind: "config", error: "No contract code at CONTRACT_ADDRESS." }) };
    }

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
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ kind: "network", error: err.message || "Error interno." }) };
  }
};
