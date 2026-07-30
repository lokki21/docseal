-- Fresh schema for DocSeal re-engineering. Demo data is NOT migrated.
-- Apply via Supabase Dashboard > SQL Editor (paste and run).

-- Drop the old open tables from the prototype
drop table if exists verifications;
drop table if exists documents;

-- ============ profiles ============
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_name text not null,
  contact_name text not null,
  role_title text not null,
  created_at timestamptz not null default now()
);
alter table profiles enable row level security;
create policy "profiles are publicly readable" on profiles for select using (true);
create policy "users insert own profile" on profiles for insert with check (auth.uid() = id);
create policy "users update own profile" on profiles for update using (auth.uid() = id);

-- ============ public_id generator ============
create or replace function gen_public_id() returns text
language sql volatile as $$
  select string_agg(
    substr('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
           (get_byte(gen_random_bytes(1), 0) % 62) + 1, 1), '')
  from generate_series(1, 10);
$$;

-- ============ documents (immutable) ============
create table documents (
  id uuid primary key default gen_random_uuid(),
  public_id text unique not null default gen_public_id(),
  hash text unique not null check (hash ~ '^[0-9a-f]{64}$'),
  file_name text not null,
  file_size bigint,
  issuer_id uuid not null references profiles(id),
  registered_at timestamptz not null default now(),
  anchor_status text not null default 'none' check (anchor_status in ('none','pending','anchored','failed')),
  anchor_tx text,
  anchored_at timestamptz
);
alter table documents enable row level security;
create policy "documents are publicly readable" on documents for select using (true);
create policy "issuers insert own documents" on documents for insert
  with check (auth.uid() = issuer_id);
-- No update/delete policies: rows are immutable to clients.
-- Anchor fields are written by the Netlify function via the service-role key (bypasses RLS).

-- ============ verifications (audit trail) ============
create table verifications (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id),
  checked_hash text not null,
  result text not null check (result in ('authentic','not_found')),
  verifier_name text,
  verifier_role text,
  verifier_entity text,
  verified_at timestamptz not null default now()
);
alter table verifications enable row level security;
create policy "anyone can log a verification" on verifications for insert with check (true);
create policy "issuers read own documents audit trail" on verifications for select
  using (exists (select 1 from documents d where d.id = document_id and d.issuer_id = auth.uid()));

-- Public aggregate count for the /verify/:id page (bypasses RLS deliberately)
create or replace function verification_count(doc_id uuid) returns bigint
language sql security definer set search_path = public as $$
  select count(*) from verifications where document_id = doc_id;
$$;
grant execute on function verification_count(uuid) to anon, authenticated;
