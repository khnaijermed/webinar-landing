-- =============================================================================
--  10x10 Webinar CMS — full schema reference
--  Project: izzxupiukzbmgmijqvru (10x10-webinar)
--  This file is a snapshot of what was applied via the Supabase MCP migrations:
--      cms_initial_schema
--      cms_rls_policies
--      cms_storage_buckets
-- =============================================================================

-- ---------------------------------------------------------------------
-- Shared updated_at trigger
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 1. pages
-- ---------------------------------------------------------------------
create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  meta_description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists pages_set_updated_at on public.pages;
create trigger pages_set_updated_at
  before update on public.pages
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 3. media (declared before sections — sections references it)
-- ---------------------------------------------------------------------
create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('image','video')),
  file_path text not null,
  file_name text not null,
  mime_type text not null,
  size bigint not null,
  alt_text text,
  thumbnail_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists media_set_updated_at on public.media;
create trigger media_set_updated_at
  before update on public.media
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 2. sections
-- ---------------------------------------------------------------------
create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  section_key text not null,
  title text,
  subtitle text,
  content text,
  image_id uuid references public.media(id) on delete set null,
  video_id uuid references public.media(id) on delete set null,
  button_text text,
  button_link text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (page_id, section_key)
);
create index if not exists sections_page_id_sort_idx
  on public.sections (page_id, sort_order);
drop trigger if exists sections_set_updated_at on public.sections;
create trigger sections_set_updated_at
  before update on public.sections
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 4. webinar_days
-- ---------------------------------------------------------------------
create table if not exists public.webinar_days (
  id uuid primary key default gen_random_uuid(),
  day_number integer not null unique,
  title text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists webinar_days_set_updated_at on public.webinar_days;
create trigger webinar_days_set_updated_at
  before update on public.webinar_days
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 5. stats
-- ---------------------------------------------------------------------
create table if not exists public.stats (
  id uuid primary key default gen_random_uuid(),
  number text not null,
  label text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists stats_set_updated_at on public.stats;
create trigger stats_set_updated_at
  before update on public.stats
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 6. faqs
-- ---------------------------------------------------------------------
create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists faqs_set_updated_at on public.faqs;
create trigger faqs_set_updated_at
  before update on public.faqs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 7. leads
-- ---------------------------------------------------------------------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  source text,
  created_at timestamptz not null default now()
);
create index if not exists leads_email_idx on public.leads (email);
create index if not exists leads_created_at_idx on public.leads (created_at desc);

-- ---------------------------------------------------------------------
-- 8. design_settings (singleton)
-- ---------------------------------------------------------------------
create table if not exists public.design_settings (
  id uuid primary key default gen_random_uuid(),
  primary_color text default '#F59E0B',
  secondary_color text default '#39b54a',
  background_color text default '#0D0D0D',
  section_background text default '#141414',
  card_background text default '#1A1A1A',
  text_color text default '#E8E8E8',
  heading_color text default '#FFFFFF',
  border_color text default '#2A2A2A',
  font_family text default 'Cairo, Inter, sans-serif',
  hero_title_size text default '68px',
  section_title_size text default '44px',
  body_text_size text default '17px',
  paragraph_spacing text default '1.7',
  section_spacing text default '90px',
  video_width text default '960px',
  video_height text default '540px',
  button_radius text default '12px',
  card_radius text default '16px',
  shadow_enabled boolean default true,
  whatsapp_number text,
  whatsapp_message text,
  whatsapp_position text default 'right' check (whatsapp_position in ('left','right')),
  sticky_cta_enabled boolean default true,
  faq_popup_enabled boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists design_settings_set_updated_at on public.design_settings;
create trigger design_settings_set_updated_at
  before update on public.design_settings
  for each row execute function public.set_updated_at();

insert into public.design_settings
select where not exists (select 1 from public.design_settings);

-- =============================================================================
--  RLS — enable + policies
-- =============================================================================
alter table public.pages           enable row level security;
alter table public.sections        enable row level security;
alter table public.media           enable row level security;
alter table public.webinar_days    enable row level security;
alter table public.stats           enable row level security;
alter table public.faqs            enable row level security;
alter table public.leads           enable row level security;
alter table public.design_settings enable row level security;

-- Public read (anon + authenticated) — only is_active rows for content tables
create policy "public read active pages"          on public.pages          for select to anon, authenticated using (is_active = true);
create policy "public read active sections"       on public.sections       for select to anon, authenticated using (is_active = true);
create policy "public read media"                 on public.media          for select to anon, authenticated using (true);
create policy "public read active webinar_days"   on public.webinar_days   for select to anon, authenticated using (is_active = true);
create policy "public read active stats"          on public.stats          for select to anon, authenticated using (is_active = true);
create policy "public read active faqs"           on public.faqs           for select to anon, authenticated using (is_active = true);
create policy "public read design_settings"       on public.design_settings for select to anon, authenticated using (true);

-- Authenticated (admin) full access
create policy "admin all pages"           on public.pages           for all to authenticated using (true) with check (true);
create policy "admin all sections"        on public.sections        for all to authenticated using (true) with check (true);
create policy "admin all media"           on public.media           for all to authenticated using (true) with check (true);
create policy "admin all webinar_days"    on public.webinar_days    for all to authenticated using (true) with check (true);
create policy "admin all stats"           on public.stats           for all to authenticated using (true) with check (true);
create policy "admin all faqs"            on public.faqs            for all to authenticated using (true) with check (true);
create policy "admin all design_settings" on public.design_settings for all to authenticated using (true) with check (true);

-- Leads: anon insert (landing form), authenticated manage
create policy "anon insert leads"  on public.leads for insert to anon, authenticated with check (true);
create policy "admin read leads"   on public.leads for select to authenticated using (true);
create policy "admin update leads" on public.leads for update to authenticated using (true) with check (true);
create policy "admin delete leads" on public.leads for delete to authenticated using (true);

-- =============================================================================
--  Storage buckets + policies
--  images: 5 MB,  image/jpeg, image/png, image/webp
--  videos: 100 MB, video/mp4, video/webm
--  + extension blocklist (.php .exe .js .jsp .sh .bat .cmd .vbs .htm .html .svg)
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('images', 'images', true, 5242880,   array['image/jpeg','image/png','image/webp']),
  ('videos', 'videos', true, 104857600, array['video/mp4','video/webm'])
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "public read images" on storage.objects for select to anon, authenticated using (bucket_id = 'images');
create policy "public read videos" on storage.objects for select to anon, authenticated using (bucket_id = 'videos');

create policy "admin upload images" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'images'
    and name !~* '\.(php|exe|js|jsp|sh|bat|cmd|vbs|html?|svg)$'
  );

create policy "admin upload videos" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'videos'
    and name !~* '\.(php|exe|js|jsp|sh|bat|cmd|vbs|html?|svg)$'
  );

create policy "admin update images" on storage.objects for update to authenticated using (bucket_id = 'images') with check (bucket_id = 'images');
create policy "admin update videos" on storage.objects for update to authenticated using (bucket_id = 'videos') with check (bucket_id = 'videos');
create policy "admin delete images" on storage.objects for delete to authenticated using (bucket_id = 'images');
create policy "admin delete videos" on storage.objects for delete to authenticated using (bucket_id = 'videos');
