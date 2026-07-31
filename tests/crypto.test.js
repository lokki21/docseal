import { it, expect } from "vitest";
import { hashBytes } from "../src/lib/crypto.js";

it("hashes empty input to the known SHA-256 vector", async () => {
  expect(await hashBytes(new Uint8Array([]))).toBe(
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  );
});

it("hashes 'abc' to the known SHA-256 vector", async () => {
  expect(await hashBytes(new TextEncoder().encode("abc"))).toBe(
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
  );
});
