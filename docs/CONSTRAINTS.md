# DocSeal — Hard Constraints

These are non-negotiable rules for DocSeal. They are not preferences or
style choices; they follow from Colombian financial regulation and from
what the product promises. Any change that violates one of them is a bug,
regardless of how convenient it is.

---

## 1. On-chain, store only the bare SHA-256 hash — nothing else

The only value ever anchored on-chain is the document's bare **SHA-256
hash**. Never anchor the policy number, the NIT, the issuer id, the
issue/expiry date, filenames, or any other metadata — not in the
transaction, not in calldata, not in event logs, not encoded into the
hash input.

**Why:** Colombian financial regulation requires that an entity's data be
**securely deleted** on request. A public blockchain is **indelible** —
once written, it cannot be erased. A bare SHA-256 hash contains no
recoverable information about the document (it is a one-way digest), so
anchoring it does not create an un-deletable record of anyone's data.
The moment any real-world identifier is placed on-chain, that guarantee
is broken and cannot be undone.

If you need to associate names, policy numbers, or dates with a hash,
that association lives in the **off-chain Supabase index only**, which can
be deleted.

---

## 2. The on-chain check is the source of truth for authenticity

An **"authentic" verdict must require that `verify(hash)` passes
on-chain.** The blockchain anchor is the authority on whether a document
is genuine.

The **Supabase index is not authoritative for authenticity.** It only
adds human-facing context on top of a hash that has already been
confirmed on-chain: issuer/entity names, verification links, and the
audit trail. A record existing in Supabase must never, on its own,
produce an "authentic" result.

**Do not change the verification logic in this commit.** This rule
documents the intended behavior; reconciling the current code with it is
a **separate task**.
