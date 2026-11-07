-- Safe on plain Postgres as well as Supabase: the Supabase roles / auth.uid() are created ONLY if they do not already exist
-- (on Supabase they exist and are left untouched).
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'auth' and p.proname = 'uid') then
    create schema if not exists auth;
    create function auth.uid() returns uuid language sql stable as 'select nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
  end if;
end $$;

-- Defence in depth. The REAL access decision lives in the API (app/core/access.py: role + ownership + care
-- relationship + consent + audit). RLS here is deny-by-default so that nothing is readable through Supabase's
-- public REST/Realtime endpoints; the API connects with a privileged server-side role that bypasses RLS.
do $$
declare t text;
begin
  foreach t in array array['profiles','otp_codes','role_applications','patient_profiles','patient_preferences',
    'patient_conditions','medications_allergies','consents','care_relationships','audit_logs','break_glass_events',
    'documents','extractions','observations','appointments','appointment_events','clinical_notes',
    'clinical_note_versions','referrals','notifications','triage_sessions','ai_outputs','verification_cases',
    'system_settings','facility_staff','facility_prices','availability_slots']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('revoke all on %I from anon, authenticated', t);
  end loop;
end $$;

-- Patients may read only their own rows through Supabase Auth (optional; API remains the main path).
-- NOTE: profiles.id must equal auth.users.id if you use Supabase Auth instead of the built-in OTP fallback.
create policy patient_own_profile on patient_profiles for select to authenticated using (user_id = auth.uid()::text);
create policy patient_own_observations on observations for select to authenticated using (patient_id = auth.uid()::text);
grant select on patient_profiles, observations to authenticated;

-- audit_logs is append-only: nobody (including the API role) may update or delete rows.
revoke update, delete, truncate on audit_logs from public;
create or replace function audit_logs_immutable() returns trigger language plpgsql as $$
begin raise exception 'audit_logs is append-only'; end $$;
create trigger audit_logs_no_update before update or delete on audit_logs
  for each row execute function audit_logs_immutable();

-- pgvector for approved-source RAG (M13). Embeddings are filled by your embedding job; MVP retrieval is by test_code.
alter table knowledge_chunks add column if not exists embedding vector(1024);
create index if not exists knowledge_chunks_embedding_idx on knowledge_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 10);
