-- supabase/migrations/0002_verdict_audit.sql
-- Extend the audit trail so a verification row shows the verdict was chain-backed,
-- and record the anchoring block on the document. Apply via Supabase SQL Editor.

alter table documents add column if not exists anchor_block bigint;

alter table verifications drop constraint if exists verifications_result_check;
alter table verifications
  add constraint verifications_result_check
  check (result in ('authentic','not_found','altered','unverifiable'));

alter table verifications add column if not exists decided_by text;
alter table verifications add column if not exists chain_exists boolean;
alter table verifications add column if not exists anchor_tx text;
alter table verifications add column if not exists chain_timestamp bigint;
alter table verifications add column if not exists error_class text;
