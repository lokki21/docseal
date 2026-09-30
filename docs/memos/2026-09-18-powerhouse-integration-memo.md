# Memo — Building DocSeal's next stage on Powerhouse

**To:** Partner
**From:** DocSeal
**Date:** 18 September 2026
**Re:** How we make document verification independent, trustworthy, and legally solid

---

## The bottom line

DocSeal already proves that a compliance bond (*póliza de cumplimiento*) is authentic and unaltered. To turn that from a convincing demo into a product an institution can rely on in court, we need to close one gap — **proving *who* issued a document, not just that it wasn't changed** — and we need verification to keep working **even if DocSeal's own systems are offline**.

We have decided to build the next stage on **Powerhouse**, an open-source software toolkit, combined with a **formal accreditation** (cooperating with a national accreditation body). Powerhouse gives us the independence and the tamper-proof record; the accreditation gives us the legal weight. Together they make DocSeal something an insurer, a state entity, and a judge can all trust without having to trust *us*.

---

## What DocSeal must guarantee

The heart of the product is one promise: **anyone who receives a document can check that it is genuine — by themselves, without trusting DocSeal.** Think of a notary's seal that any citizen can verify on their own, at any time, even years later, even if the notary's office has closed.

Today we deliver most of that: the document's unique "fingerprint" is recorded on a public blockchain (a shared, permanent, tamper-proof ledger), so integrity and date can be checked independently. What's still missing is **verified identity** and **full independence from our servers.** That's what this next stage adds.

---

## The gap we're closing

Right now, when an insurer registers a policy, they *state* who they are — but that identity is not cryptographically proven. It's the difference between a name typed on a form and a signature the law recognizes. For a document that protects public funds and may be contested, "typed name" is not enough. Powerhouse plus accreditation turns it into a proven, legally-recognized signature.

---

## What Powerhouse is, in plain terms

Powerhouse is a set of open-source building blocks for running trustworthy digital records. We use three of them:

| Component | What it is (plain language) | What it does for DocSeal |
|---|---|---|
| **Renown** | A digital identity that belongs to the holder — like a passport they carry and sign with, not an account we control | Lets each insurer sign what they issue with a **provable, portable identity**. Closes the "who issued it" gap. |
| **Document Models** | A record where every action is permanently written down and cryptographically signed — an unfalsifiable logbook | Gives every registration and verification a **tamper-evident, signed audit trail**. Nobody — not even DocSeal — can quietly rewrite history. |
| **Reactor** | Software that runs on the *user's own* computer or server, works offline, and stays in sync | A state entity can **run verification itself**, keep its own copy, and confirm a document without depending on DocSeal being online. This is the "works even if we disappear" property. |

The important idea: with Powerhouse, **the proof travels with the document and the user**, instead of living only on DocSeal's servers.

---

## The trust model — where legal weight comes from

Cryptography can prove that a key signed something. It cannot, by itself, prove that the signer is a *licensed insurer*. Someone trusted has to vouch for that. **DocSeal becomes that credential-issuing authority** — we vet and accredit issuers — and we anchor our own authority under a **national accreditation body**, aligning with Colombia's existing rules for electronic guarantees (Circular Conjunta 001 de 2021 and the accredited digital-certification regime).

So the trust runs in a clean chain: **national accreditation body → DocSeal → the insurer → the specific document.** Each link is verifiable, and the whole thing sits on top of the public blockchain that guarantees the document itself was never altered.

---

## Why this matters — the value we add

- **Independence.** Verification survives outages, our company's ups and downs, even our disappearance. The guarantee doesn't depend on any single company staying alive.
- **Legal strength.** Moving from "the document wasn't changed" to "*this accredited insurer* issued this exact document" is what makes it hold up in a dispute.
- **Autonomy for institutions.** A state entity can verify on its own infrastructure — attractive to public bodies wary of depending on a private vendor.
- **Alignment with existing law.** Colombia already requires guarantees to be signed, timestamped, and verifiable online. We fit that mandate rather than inventing a new one.
- **No lock-in, open standards.** Built on open-source components and portable identities — a stronger, more credible position than a closed proprietary system.

---

## Honest limitations (so we're clear-eyed)

- Powerhouse gives us the identity and record-keeping *rails*; the **accreditation and legal recognition still require the partnership and compliance work** — the software alone doesn't confer legal status.
- Recording fingerprints on the blockchain has a small ongoing cost (fractions of a cent per document today); at high volume we batch them to keep it negligible.
- Powerhouse is a young, fast-moving toolkit — but it is open-source and our team already works with it, which lowers the risk.

---

## What happens now

We are proceeding in two tracks:

1. **Now — the demo/product foundation.** We are hardening the current app so that the blockchain is the sole authority for an "authentic" verdict and verification keeps working even if our database is offline. This is bounded work, already specified and underway.
2. **Next — the real product on Powerhouse + accreditation.** The architecture described above becomes its own design and build track, and it shares building blocks with our related document-provenance work.

**In one sentence:** Powerhouse lets DocSeal prove *who* issued a document and lets anyone verify it independently and offline; the accreditation makes that proof legally recognized — together they turn a compelling demo into infrastructure institutions can depend on.
