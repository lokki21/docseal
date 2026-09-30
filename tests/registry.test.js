import { it, expect, vi, beforeEach } from "vitest";
import { VERDICT } from "../src/lib/verdict.js";

const q = vi.fn();
vi.mock("../src/lib/supabase.js", () => ({
  supabaseQuery: (...a) => q(...a),
  currentUserId: () => "issuer-123",
}));

const check = vi.fn();
vi.mock("../src/lib/onchain.js", () => ({ checkOnChain: (...a) => check(...a) }));

const { registerDocument, resolveVerdict } = await import("../src/lib/registry.js");

beforeEach(() => { q.mockReset(); check.mockReset(); });

it("registerDocument returns already:true when hash exists and does not insert", async () => {
  q.mockResolvedValueOnce([{ id: 1, hash: "x", public_id: "abc" }]); // findByHash
  const { record, already } = await registerDocument(new Uint8Array([1, 2, 3]), "a.pdf", 3);
  expect(already).toBe(true);
  expect(record.public_id).toBe("abc");
  expect(q).toHaveBeenCalledTimes(1);
});

it("registerDocument inserts and returns already:false when new", async () => {
  q.mockResolvedValueOnce([]);                              // findByHash -> none
  q.mockResolvedValueOnce([{ id: 2, public_id: "new1" }]);  // insert
  const { record, already } = await registerDocument(new Uint8Array([9]), "b.pdf", 1);
  expect(already).toBe(false);
  expect(record.public_id).toBe("new1");
  expect(q).toHaveBeenCalledTimes(2);
  const insert = q.mock.calls[1];
  expect(insert[0]).toBe("documents");
  expect(insert[1].method).toBe("POST");
  expect(insert[1].auth).toBe(true);
  expect(insert[1].body.issuer_id).toBe("issuer-123");
  expect(insert[1].body).toMatchObject({ file_name: "b.pdf", file_size: 1, anchor_status: "pending" });
});

it("resolveVerdict is AUTHENTIC from the chain even when the DB throws", async () => {
  check.mockResolvedValueOnce({ ok: true, exists: true });
  q.mockRejectedValueOnce(new Error("db down")); // findByHash enrichment fails
  const r = await resolveVerdict("deadbeef");
  expect(r.verdict).toBe(VERDICT.AUTHENTIC);
  expect(r.doc).toBe(null);
});

it("resolveVerdict is NOT_ANCHORED when chain says no but the index knows it", async () => {
  check.mockResolvedValueOnce({ ok: true, exists: false });
  q.mockResolvedValueOnce([{ public_id: "p1", hash: "deadbeef" }]); // findByHash
  const r = await resolveVerdict("deadbeef");
  expect(r.verdict).toBe(VERDICT.NOT_ANCHORED);
  expect(r.doc.public_id).toBe("p1");
});

it("resolveVerdict passes uploadedHash through for ALTERED", async () => {
  check.mockResolvedValueOnce({ ok: true, exists: true });
  q.mockResolvedValueOnce([{ public_id: "p1", hash: "deadbeef" }]);
  const r = await resolveVerdict("deadbeef", { uploadedHash: "0000" });
  expect(r.verdict).toBe(VERDICT.ALTERED);
});
