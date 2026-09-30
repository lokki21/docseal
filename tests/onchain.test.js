// tests/onchain.test.js
import { it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkOnChain } from "../src/lib/onchain.js";

beforeEach(() => { global.fetch = vi.fn(); });
afterEach(() => { vi.restoreAllMocks(); });

it("returns ok:true with exists on success", async () => {
  global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ exists: true, timestamp: 1, contractUrl: "u" }) });
  const r = await checkOnChain("aa");
  expect(r).toMatchObject({ ok: true, exists: true, contractUrl: "u" });
});

it("passes through a config kind from the server", async () => {
  global.fetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ kind: "config", error: "wrong chain" }) });
  const r = await checkOnChain("aa");
  expect(r).toEqual({ ok: false, kind: "config", error: "wrong chain" });
});

it("maps a thrown fetch to a network failure", async () => {
  global.fetch.mockRejectedValueOnce(new Error("boom"));
  const r = await checkOnChain("aa");
  expect(r).toMatchObject({ ok: false, kind: "network" });
});

it("defaults an unlabeled non-ok response to network", async () => {
  global.fetch.mockResolvedValueOnce({ ok: false, status: 502, json: async () => ({}) });
  const r = await checkOnChain("aa");
  expect(r).toMatchObject({ ok: false, kind: "network" });
});
