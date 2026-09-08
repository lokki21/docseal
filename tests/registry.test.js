import { it, expect, vi, beforeEach } from "vitest";

const q = vi.fn();
vi.mock("../src/lib/supabase.js", () => ({
  supabaseQuery: (...a) => q(...a),
  currentUserId: () => "issuer-123",
}));

const { registerDocument, verifyHash } = await import("../src/lib/registry.js");

beforeEach(() => q.mockReset());

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
  expect(insert[1].body).toMatchObject({ file_name: "b.pdf", file_size: 1 });
});

it("verifyHash returns match with publicId when found", async () => {
  q.mockResolvedValueOnce([{ public_id: "pub9" }]);
  const r = await verifyHash("deadbeef");
  expect(r).toEqual({ match: true, publicId: "pub9" });
  expect(q).toHaveBeenCalledTimes(1);
});

it("verifyHash logs not_found and returns match:false when absent", async () => {
  q.mockResolvedValueOnce([]);  // lookup
  q.mockResolvedValueOnce([]);  // verifications insert
  const r = await verifyHash("beef");
  expect(r.match).toBe(false);
  expect(r.publicId).toBe(null);
  expect(q).toHaveBeenCalledTimes(2);
  expect(q.mock.calls[1][0]).toBe("verifications");
  expect(q.mock.calls[1][1].body.result).toBe("not_found");
});
