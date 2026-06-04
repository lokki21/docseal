// Netlify Function: registra una huella (hash) en el contrato DocSealRegistry.
//
// El cliente NUNCA ve una wallet. Esta función firma con la wallet del operador,
// que vive solo como variable de entorno en Netlify.
//
// Variables de entorno necesarias (Netlify → Site settings → Environment variables):
//   OPERATOR_PRIVATE_KEY  -> clave privada de la wallet del operador
//   CONTRACT_ADDRESS      -> dirección del contrato desplegado
//   RPC_URL               -> https://sepolia.base.org (testnet) o https://mainnet.base.org
//   CHAIN_ID              -> 84532 (testnet) o 8453 (mainnet)
//
// Dependencia: ethers v6  (agregar "ethers" a package.json)

const { ethers } = require("ethers");

// ABI mínimo: solo las funciones que usamos
const ABI = [
  "function register(bytes32 documentHash) external",
  "function verify(bytes32 documentHash) external view returns (bool exists, uint64 timestamp, address registrar)",
];

// Normaliza un hash SHA-256 (64 hex chars) al formato bytes32 (0x-prefijado)
function toBytes32(hash) {
  const clean = hash.startsWith("0x") ? hash.slice(2) : hash;
  if (!/^[0-9a-fA-F]{64}$/.test(clean)) {
    throw new Error("El hash debe ser SHA-256 (64 caracteres hexadecimales).");
  }
  return "0x" + clean.toLowerCase();
}

exports.handler = async (event) => {
  // CORS básico
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const { hash } = JSON.parse(event.body || "{}");
    if (!hash) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Falta el campo 'hash'." }) };
    }

    const documentHash = toBytes32(hash);

    const RPC_URL = process.env.RPC_URL;
    const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
    const OPERATOR_PRIVATE_KEY = process.env.OPERATOR_PRIVATE_KEY;
    const CHAIN_ID = parseInt(process.env.CHAIN_ID || "84532", 10);

    if (!RPC_URL || !CONTRACT_ADDRESS || !OPERATOR_PRIVATE_KEY) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: "Faltan variables de entorno en el servidor." }) };
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID);
    const wallet = new ethers.Wallet(OPERATOR_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

    // ¿Ya está registrado? (evita gastar gas y da una respuesta clara)
    const [exists, ts, registrar] = await contract.verify(documentHash);
    if (exists) {
      const explorerBase = CHAIN_ID === 8453 ? "https://basescan.org" : "https://sepolia.basescan.org";
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: "already_registered",
          hash: documentHash,
          timestamp: Number(ts),
          registrar,
          explorerUrl: `${explorerBase}/address/${CONTRACT_ADDRESS}`,
        }),
      };
    }

    // Firmar y enviar la transacción
    const tx = await contract.register(documentHash);
    const receipt = await tx.wait(1); // esperar 1 confirmación

    const explorerBase = CHAIN_ID === 8453 ? "https://basescan.org" : "https://sepolia.basescan.org";

    return {
      statusCode: 200,
      headers,
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
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || "Error interno." }),
    };
  }
};
