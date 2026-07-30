import { it, expect } from "vitest";
import { formatFileSize, truncateHash, makeCertId } from "../src/lib/format.js";

it("formats file sizes", () => {
  expect(formatFileSize(512)).toBe("512 B");
  expect(formatFileSize(2048)).toBe("2.0 KB");
  expect(formatFileSize(3 * 1024 * 1024)).toBe("3.0 MB");
});

it("truncates hashes to 12+12 chars", () => {
  const h = "a".repeat(64);
  expect(truncateHash(h)).toBe("aaaaaaaaaaaa...aaaaaaaaaaaa");
});

it("builds certificate ids from date and hash tail", () => {
  expect(makeCertId("DS-REG", "ff00aa11bb22", "2026-03-12T12:00:00Z"))
    .toBe("DS-REG-20260312-11BB22");
});
