# DocSeal Manual E2E Checklist

Run on the Netlify deploy preview of the `reengineering` branch.
Prerequisites: schema migration applied in Supabase (SQL Editor), Netlify env vars set
(`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`), email auth enabled with confirm-email off.

- [ ] Sign up as a new issuer (email + password + company) → lands on dashboard
- [ ] Register a PDF → success banner, public link shown, copy button works
- [ ] Anchor on Base → status becomes "Anclado", BaseScan link opens
- [ ] Download registration certificate → QR opens /verify/:id on a phone
- [ ] Open the public link on a phone (no login) → record + issuer shown
- [ ] Upload the ORIGINAL pdf on /verify/:id → green "coincide" verdict
- [ ] Upload an ALTERED pdf → red "NO coincide" verdict
- [ ] Verify anonymously vs with name filled → both increment the dashboard verification count
- [ ] /verify (upload-first) with an unregistered pdf → "no encontrado" + hash shown
- [ ] /verify/xxxxxxxxxx (bogus id) → "Registro no encontrado" page
- [ ] Anchor endpoint refuses curl without token (401)
- [ ] ES/EN toggle works on every page
- [ ] Anonymous insert into documents is blocked (RLS curl from plan Task 5)
- [ ] /verify/:id shows the independent-proof section: SHA-256 + BaseScan tx link + trustless note
- [ ] /verify/:id for an UNANCHORED document honestly shows "Registrado en DocSeal (sin anclaje en blockchain)"
- [ ] Certificate PDF contains the tx hash AND the BaseScan URL as readable text (not only the QR)
- [ ] Registration certificate for an unanchored document does NOT claim blockchain anchoring
