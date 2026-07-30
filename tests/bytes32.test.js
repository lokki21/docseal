import { it, expect } from "vitest";
import { toBytes32 } from "../netlify/functions/utils/bytes32.js";

it("normalizes a bare 64-hex hash", () => {
  expect(toBytes32("A".repeat(64))).toBe("0x" + "a".repeat(64));
});

it("accepts 0x-prefixed input", () => {
  expect(toBytes32("0x" + "b".repeat(64))).toBe("0x" + "b".repeat(64));
});

it("rejects invalid input", () => {
  expect(() => toBytes32("zz")).toThrow();
});
