// tests/verify-onchain.test.js
import { it, expect, vi, beforeEach } from "vitest";

const getNetwork = vi.fn();
const getCode = vi.fn();
const verify = vi.fn();

vi.mock("ethers", () => ({
  ethers: {
    JsonRpcProvider: class { getNetwork() { return getNetwork(); } getCode(a) { return getCode(a); } },
    Contract: class { constructor() { this.verify = verify; } },
  },
}));

const { handler } = await import("../netlify/functions/verify-onchain.js");
const ev = (hash) => ({ httpMethod: "POST", body: JSON.stringify({ hash }) });

beforeEach(() => {
  getNetwork.mockReset(); getCode.mockReset(); verify.mockReset();
  process.env.RPC_URL = "http://rpc"; process.env.CONTRACT_ADDRESS = "0xabc"; process.env.CHAIN_ID = "84532";
});

it("returns kind:config when the chain id does not match", async () => {
  getNetwork.mockResolvedValue({ chainId: 1n });
  getCode.mockResolvedValue("0xcode");
  const res = await handler(ev("a".repeat(64)));
  expect(res.statusCode).toBe(500);
  expect(JSON.parse(res.body).kind).toBe("config");
});

it("returns kind:config when the contract has no code", async () => {
  getNetwork.mockResolvedValue({ chainId: 84532n });
  getCode.mockResolvedValue("0x");
  const res = await handler(ev("a".repeat(64)));
  expect(JSON.parse(res.body).kind).toBe("config");
});

it("returns exists on a healthy call", async () => {
  getNetwork.mockResolvedValue({ chainId: 84532n });
  getCode.mockResolvedValue("0xcode");
  verify.mockResolvedValue([true, 123n, "0xregistrar"]);
  const res = await handler(ev("a".repeat(64)));
  expect(res.statusCode).toBe(200);
  const b = JSON.parse(res.body);
  expect(b.exists).toBe(true);
  expect(b.timestamp).toBe(123);
});

it("returns kind:network when the RPC throws", async () => {
  getNetwork.mockRejectedValue(new Error("timeout"));
  const res = await handler(ev("a".repeat(64)));
  expect(JSON.parse(res.body).kind).toBe("network");
});
