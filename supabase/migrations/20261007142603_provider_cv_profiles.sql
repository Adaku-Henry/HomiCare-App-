create table if not exists public.provider_cv_profiles (
  provider_id uuid primary key references public.providers(id) on delete cascade,
  summary text not null default '',
  experiences jsonb not null default '[]'::jsonb,
  education jsonb not null default '[]'::jsonb,
  skills text[] not null default '{}',
  certifications jsonb not null default '[]'::jsonb,
  licenses jsonb not null default '[]'::jsonb,
  achievements jsonb not null default '[]'::jsonb,
  languages jsonb not null default '[]'::jsonb,
  template text not null default 'Service Professional',
  is_published boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.provider_cv_profiles enable row level security;

drop policy if exists "public_read_published_provider_cvs" on public.provider_cv_profiles;
create policy "public_read_published_provider_cvs"
  on public.provider_cv_profiles for select to anon, authenticated
  using (
    is_published
    or exists (
      select 1 from public.providers
      where providers.id = provider_cv_profiles.provider_id
        and providers.user_id = (select auth.uid())
    )
  );

drop policy if exists "owners_manage_provider_cvs" on public.provider_cv_profiles;
create policy "owners_manage_provider_cvs"
  on public.provider_cv_profiles for all to authenticated
  using (
    exists (
      select 1 from public.providers
      where providers.id = provider_cv_profiles.provider_id
        and providers.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.providers
      where providers.id = provider_cv_profiles.provider_id
        and providers.user_id = (select auth.uid())
    )
  );

grant select on public.provider_cv_profiles to anon, authenticated;
grant insert, update, delete on public.provider_cv_profiles to authenticated;

create table if not exists public.provider_cv_references (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  name text not null,
  role text not null default '',
  organization text not null default '',
  phone text not null default '',
  email text not null default '',
  created_at timestamptz not null default now()
);

alter table public.provider_cv_references enable row level security;

drop policy if exists "owners_manage_provider_cv_references" on public.provider_cv_references;
create policy "owners_manage_provider_cv_references"
  on public.provider_cv_references for all to authenticated
  using (
    exists (
      select 1 from public.providers
      where providers.id = provider_cv_references.provider_id
        and providers.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.providers
      where providers.id = provider_cv_references.provider_id
        and providers.user_id = (select auth.uid())
    )
  );

grant select, insert, update, delete on public.provider_cv_references to authenticated;
