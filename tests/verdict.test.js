// tests/verdict.test.js
import { it, expect } from "vitest";
import { VERDICT, decideVerdict } from "../src/lib/verdict.js";

const chainOk = (exists) => ({ ok: true, exists });
const idx = (available, found) => ({ available, found });

it("ALTERED when an uploaded copy does not match, regardless of chain", () => {
  expect(decideVerdict({ chain: { ok: false, kind: "network" }, index: idx(true, true), uploadedHash: "aa", hashMatches: false })).toBe(VERDICT.ALTERED);
});

it("CHAIN_CONFIG_ERROR when chain kind is config", () => {
  expect(decideVerdict({ chain: { ok: false, kind: "config" }, index: idx(true, true) })).toBe(VERDICT.CHAIN_CONFIG_ERROR);
});

it("UNVERIFIABLE when the chain is unreachable (network)", () => {
  expect(decideVerdict({ chain: { ok: false, kind: "network" }, index: idx(true, true) })).toBe(VERDICT.UNVERIFIABLE);
});

it("AUTHENTIC when the chain says exists, even with the DB offline", () => {
  expect(decideVerdict({ chain: chainOk(true), index: idx(false, false) })).toBe(VERDICT.AUTHENTIC);
});

it("NOT_ANCHORED when chain says no but the index knows the hash", () => {
  expect(decideVerdict({ chain: chainOk(false), index: idx(true, true) })).toBe(VERDICT.NOT_ANCHORED);
});

it("NOT_FOUND when neither chain nor index knows the hash", () => {
  expect(decideVerdict({ chain: chainOk(false), index: idx(true, false) })).toBe(VERDICT.NOT_FOUND);
});

it("UNVERIFIABLE when chain says no and the index is offline", () => {
  expect(decideVerdict({ chain: chainOk(false), index: idx(false, false) })).toBe(VERDICT.UNVERIFIABLE);
});

it("a matching uploaded copy does not force ALTERED", () => {
  expect(decideVerdict({ chain: chainOk(true), index: idx(true, true), uploadedHash: "aa", hashMatches: true })).toBe(VERDICT.AUTHENTIC);
});
