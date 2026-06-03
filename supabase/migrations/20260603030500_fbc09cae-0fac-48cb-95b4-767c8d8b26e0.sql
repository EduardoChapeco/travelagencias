
-- 1) Extend app_role with agent_viewer
do $$ begin
  if not exists (select 1 from pg_enum e join pg_type t on t.oid=e.enumtypid where t.typname='app_role' and e.enumlabel='agent_viewer') then
    alter type public.app_role add value 'agent_viewer';
  end if;
end $$;

-- 2) Helper: current user's default agency
create or replace function public.get_my_agency_id()
returns uuid language sql stable security definer set search_path = public as $$
  select coalesce(
    (select default_agency_id from public.profiles where id = auth.uid()),
    (select agency_id from public.user_roles where user_id = auth.uid() and agency_id is not null order by created_at asc limit 1)
  );
$$;

-- 3) Generic updated_at trigger reuses public.set_updated_at()

-- =========================================================
-- AGENCY TAGS
-- =========================================================
create table if not exists public.agency_tags (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null,
  name text not null,
  color text not null default '#94A3B8',
  created_at timestamptz not null default now(),
  unique (agency_id, name)
);
grant select, insert, update, delete on public.agency_tags to authenticated;
grant all on public.agency_tags to service_role;
alter table public.agency_tags enable row level security;
create policy "tags read" on public.agency_tags for select to authenticated using (public.is_agency_member(auth.uid(), agency_id));
create policy "tags insert" on public.agency_tags for insert to authenticated with check (public.is_agency_member(auth.uid(), agency_id));
create policy "tags update" on public.agency_tags for update to authenticated using (public.is_agency_member(auth.uid(), agency_id));
create policy "tags delete" on public.agency_tags for delete to authenticated using (public.has_role(auth.uid(), 'agency_admin', agency_id));

-- =========================================================
-- BRAND KIT
-- =========================================================
create table if not exists public.brand_kit (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null unique,
  logo_url text, logo_dark_url text, favicon_url text,
  brand_color text default '#1E293B',
  brand_color_light text default '#F1F5F9',
  brand_color_fg text default '#FFFFFF',
  font_heading text default 'Inter',
  font_body text default 'Inter',
  proposal_template text default 'default',
  proposal_header_img text,
  voucher_theme text default 'navy',
  contract_header_img text,
  instagram text, facebook text, whatsapp text, website text,
  google_business_id text, google_analytics_id text,
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.brand_kit to authenticated;
grant all on public.brand_kit to service_role;
alter table public.brand_kit enable row level security;
create policy "brand read" on public.brand_kit for select to authenticated using (public.is_agency_member(auth.uid(), agency_id));
create policy "brand upsert" on public.brand_kit for insert to authenticated with check (public.is_agency_member(auth.uid(), agency_id));
create policy "brand update" on public.brand_kit for update to authenticated using (public.is_agency_member(auth.uid(), agency_id));
create trigger brand_kit_touch before update on public.brand_kit for each row execute function public.set_updated_at();

-- =========================================================
-- CONTRACTS (immutable after signed_at)
-- =========================================================
create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null,
  trip_id uuid not null,
  version text not null default '1.0.0',
  content_hash text, signed_hash text, pdf_url text,
  agency_data jsonb not null default '{}'::jsonb,
  client_data jsonb not null default '{}'::jsonb,
  passengers_data jsonb not null default '[]'::jsonb,
  fixed_clauses jsonb not null default '[]'::jsonb,
  custom_clauses jsonb not null default '[]'::jsonb,
  package_summary text,
  total_value numeric not null default 0,
  payment_terms text,
  signatures jsonb not null default '[]'::jsonb,
  certificate jsonb,
  status text not null default 'draft' check (status in ('draft','sent','pending_signature','signed','cancelled')),
  created_at timestamptz not null default now(),
  signed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text
);
create index if not exists contracts_trip_idx on public.contracts(trip_id);
grant select, insert, update on public.contracts to authenticated;
grant all on public.contracts to service_role;
alter table public.contracts enable row level security;
create policy "contracts read" on public.contracts for select to authenticated using (public.is_agency_member(auth.uid(), agency_id));
create policy "contracts insert" on public.contracts for insert to authenticated with check (public.is_agency_member(auth.uid(), agency_id));
create policy "contracts update" on public.contracts for update to authenticated using (public.is_agency_member(auth.uid(), agency_id));
-- no DELETE policy — service role only

create or replace function public.contracts_immutable_after_signed()
returns trigger language plpgsql as $$
begin
  if old.signed_at is not null then
    raise exception 'Contrato assinado não pode ser modificado.';
  end if;
  return new;
end; $$;
create trigger contracts_immutable before update on public.contracts for each row execute function public.contracts_immutable_after_signed();

-- =========================================================
-- VOUCHERS
-- =========================================================
create table if not exists public.vouchers (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null,
  trip_id uuid not null,
  source_type text not null default 'manual' check (source_type in ('operator_pdf','manual')),
  source_file_url text,
  destination text,
  passengers jsonb not null default '[]'::jsonb,
  flights jsonb not null default '[]'::jsonb,
  accommodation jsonb not null default '[]'::jsonb,
  transfers jsonb not null default '[]'::jsonb,
  tours jsonb not null default '[]'::jsonb,
  insurance jsonb not null default '{}'::jsonb,
  emergency_contacts jsonb not null default '[]'::jsonb,
  general_locator text, observations text, cover_image_url text,
  template text not null default 'navy' check (template in ('navy','minimal','brand')),
  pdf_url text, generated_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists vouchers_trip_idx on public.vouchers(trip_id);
grant select, insert, update, delete on public.vouchers to authenticated;
grant all on public.vouchers to service_role;
alter table public.vouchers enable row level security;
create policy "vouchers read" on public.vouchers for select to authenticated using (public.is_agency_member(auth.uid(), agency_id));
create policy "vouchers insert" on public.vouchers for insert to authenticated with check (public.is_agency_member(auth.uid(), agency_id));
create policy "vouchers update" on public.vouchers for update to authenticated using (public.is_agency_member(auth.uid(), agency_id));
create policy "vouchers delete" on public.vouchers for delete to authenticated using (public.has_role(auth.uid(), 'agency_admin', agency_id));

-- =========================================================
-- FINANCIAL RECORDS
-- =========================================================
create table if not exists public.financial_records (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null,
  trip_id uuid,
  type text not null check (type in ('income','expense','transfer')),
  category text,
  description text,
  amount numeric not null default 0,
  currency text not null default 'BRL',
  exchange_rate numeric,
  amount_brl numeric,
  payment_method text,
  installments int not null default 1,
  installment_value numeric,
  status text not null default 'pending' check (status in ('pending','confirmed','cancelled')),
  due_date date, paid_at timestamptz,
  receipt_url text, invoice_number text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists fin_agency_due_idx on public.financial_records(agency_id, due_date);
create index if not exists fin_trip_idx on public.financial_records(trip_id);
grant select, insert, update, delete on public.financial_records to authenticated;
grant all on public.financial_records to service_role;
alter table public.financial_records enable row level security;
create policy "fin read" on public.financial_records for select to authenticated using (public.is_agency_member(auth.uid(), agency_id));
create policy "fin insert" on public.financial_records for insert to authenticated with check (public.is_agency_member(auth.uid(), agency_id));
create policy "fin update" on public.financial_records for update to authenticated using (public.is_agency_member(auth.uid(), agency_id));
create policy "fin delete" on public.financial_records for delete to authenticated using (public.has_role(auth.uid(), 'agency_admin', agency_id));
create trigger fin_touch before update on public.financial_records for each row execute function public.set_updated_at();

-- =========================================================
-- PAYMENT PLANS + INSTALLMENTS
-- =========================================================
create table if not exists public.payment_plans (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null,
  trip_id uuid,
  client_id uuid,
  total_amount numeric not null default 0,
  status text not null default 'active' check (status in ('active','paid','defaulted','cancelled')),
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.payment_plans to authenticated;
grant all on public.payment_plans to service_role;
alter table public.payment_plans enable row level security;
create policy "pp read" on public.payment_plans for select to authenticated using (public.is_agency_member(auth.uid(), agency_id));
create policy "pp insert" on public.payment_plans for insert to authenticated with check (public.is_agency_member(auth.uid(), agency_id));
create policy "pp update" on public.payment_plans for update to authenticated using (public.is_agency_member(auth.uid(), agency_id));
create policy "pp delete" on public.payment_plans for delete to authenticated using (public.has_role(auth.uid(), 'agency_admin', agency_id));

create table if not exists public.payment_installments (
  id uuid primary key default gen_random_uuid(),
  payment_plan_id uuid not null,
  agency_id uuid not null,
  number int not null,
  due_date date not null,
  amount numeric not null default 0,
  status text not null default 'pending' check (status in ('pending','paid','late','waived')),
  paid_at timestamptz,
  payment_method text,
  receipt_url text,
  late_fee numeric not null default 0
);
create index if not exists pi_plan_idx on public.payment_installments(payment_plan_id);
grant select, insert, update, delete on public.payment_installments to authenticated;
grant all on public.payment_installments to service_role;
alter table public.payment_installments enable row level security;
create policy "pi read" on public.payment_installments for select to authenticated using (public.is_agency_member(auth.uid(), agency_id));
create policy "pi insert" on public.payment_installments for insert to authenticated with check (public.is_agency_member(auth.uid(), agency_id));
create policy "pi update" on public.payment_installments for update to authenticated using (public.is_agency_member(auth.uid(), agency_id));
create policy "pi delete" on public.payment_installments for delete to authenticated using (public.has_role(auth.uid(), 'agency_admin', agency_id));

-- =========================================================
-- SUPPORT TICKETS
-- =========================================================
create sequence if not exists public.support_tickets_code_seq;
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null,
  trip_id uuid,
  client_id uuid,
  agent_id uuid,
  code text not null unique default ('TK-' || lpad(nextval('public.support_tickets_code_seq')::text, 6, '0')),
  title text not null,
  type text not null default 'general' check (type in ('flight_change','cancellation','complaint','request','refund','general')),
  priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  status text not null default 'open' check (status in ('open','in_progress','waiting_client','waiting_operator','resolved','closed')),
  description text,
  messages jsonb not null default '[]'::jsonb,
  attachments text[] not null default '{}',
  refund_requested boolean not null default false,
  refund_amount numeric,
  refund_status text,
  email_thread_id text,
  sla_deadline timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);
grant select, insert, update, delete on public.support_tickets to authenticated;
grant all on public.support_tickets to service_role;
alter table public.support_tickets enable row level security;
create policy "tk read" on public.support_tickets for select to authenticated using (public.is_agency_member(auth.uid(), agency_id));
create policy "tk insert" on public.support_tickets for insert to authenticated with check (public.is_agency_member(auth.uid(), agency_id));
create policy "tk update" on public.support_tickets for update to authenticated using (public.is_agency_member(auth.uid(), agency_id));
create policy "tk delete" on public.support_tickets for delete to authenticated using (public.has_role(auth.uid(), 'agency_admin', agency_id));
create trigger tk_touch before update on public.support_tickets for each row execute function public.set_updated_at();

-- =========================================================
-- BOARDING CARDS
-- =========================================================
create table if not exists public.boarding_cards (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null,
  trip_id uuid not null,
  pnr text, airline text,
  checklist jsonb not null default '[]'::jsonb,
  alerts text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending','in_progress','boarding','done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.boarding_cards to authenticated;
grant all on public.boarding_cards to service_role;
alter table public.boarding_cards enable row level security;
create policy "bc read" on public.boarding_cards for select to authenticated using (public.is_agency_member(auth.uid(), agency_id));
create policy "bc insert" on public.boarding_cards for insert to authenticated with check (public.is_agency_member(auth.uid(), agency_id));
create policy "bc update" on public.boarding_cards for update to authenticated using (public.is_agency_member(auth.uid(), agency_id));
create policy "bc delete" on public.boarding_cards for delete to authenticated using (public.has_role(auth.uid(), 'agency_admin', agency_id));
create trigger bc_touch before update on public.boarding_cards for each row execute function public.set_updated_at();

-- =========================================================
-- GROUP TOURS + ENROLLMENTS
-- =========================================================
create table if not exists public.group_tours (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null,
  agent_id uuid,
  title text not null,
  slug text not null,
  description text,
  destination text,
  cover_image_url text,
  gallery text[] not null default '{}',
  departure_date date, return_date date, registration_deadline date,
  transport_type text default 'air' check (transport_type in ('air','bus','cruise','train','mixed')),
  transport_details text,
  total_seats int not null default 0,
  reserved_seats int not null default 0,
  base_price numeric not null default 0,
  includes text[] not null default '{}',
  excludes text[] not null default '{}',
  payment_options jsonb not null default '{}'::jsonb,
  itinerary jsonb not null default '[]'::jsonb,
  financial jsonb not null default '{}'::jsonb,
  seat_map jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','open','confirmed','completed','cancelled')),
  is_public boolean not null default false,
  seo jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_id, slug)
);
grant select, insert, update, delete on public.group_tours to authenticated;
grant select on public.group_tours to anon;
grant all on public.group_tours to service_role;
alter table public.group_tours enable row level security;
create policy "gt public read" on public.group_tours for select to anon using (is_public = true and status in ('open','confirmed'));
create policy "gt member read" on public.group_tours for select to authenticated using (public.is_agency_member(auth.uid(), agency_id) or (is_public = true and status in ('open','confirmed')));
create policy "gt insert" on public.group_tours for insert to authenticated with check (public.is_agency_member(auth.uid(), agency_id));
create policy "gt update" on public.group_tours for update to authenticated using (public.is_agency_member(auth.uid(), agency_id));
create policy "gt delete" on public.group_tours for delete to authenticated using (public.has_role(auth.uid(), 'agency_admin', agency_id));
create trigger gt_touch before update on public.group_tours for each row execute function public.set_updated_at();

create table if not exists public.group_tour_enrollments (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null,
  group_tour_id uuid not null,
  client_id uuid,
  passenger_name text not null,
  passenger_cpf text,
  seat_number text,
  room_type text,
  status text not null default 'pending' check (status in ('pending','confirmed','cancelled')),
  payment_plan_id uuid,
  total_paid numeric not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.group_tour_enrollments to authenticated;
grant all on public.group_tour_enrollments to service_role;
alter table public.group_tour_enrollments enable row level security;
create policy "gte read" on public.group_tour_enrollments for select to authenticated using (public.is_agency_member(auth.uid(), agency_id));
create policy "gte insert" on public.group_tour_enrollments for insert to authenticated with check (public.is_agency_member(auth.uid(), agency_id));
create policy "gte update" on public.group_tour_enrollments for update to authenticated using (public.is_agency_member(auth.uid(), agency_id));
create policy "gte delete" on public.group_tour_enrollments for delete to authenticated using (public.has_role(auth.uid(), 'agency_admin', agency_id));
create trigger gte_touch before update on public.group_tour_enrollments for each row execute function public.set_updated_at();

-- =========================================================
-- VISA REQUESTS + REQUIREMENTS
-- =========================================================
create table if not exists public.visa_requests (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null,
  trip_id uuid,
  client_id uuid,
  country text not null,
  country_code text,
  visa_type text,
  travel_date date,
  requested_at timestamptz default now(),
  submitted_at timestamptz,
  expected_approval_at timestamptz,
  approved_at timestamptz,
  denied_at timestamptz,
  passport_number text,
  passport_expiry date,
  status text not null default 'pending_docs' check (status in ('pending_docs','docs_ready','submitted','approved','denied','cancelled')),
  agency_handling boolean not null default true,
  price numeric not null default 0,
  notes text,
  required_documents jsonb not null default '[]'::jsonb,
  checklist jsonb not null default '[]'::jsonb
);
grant select, insert, update, delete on public.visa_requests to authenticated;
grant all on public.visa_requests to service_role;
alter table public.visa_requests enable row level security;
create policy "vr read" on public.visa_requests for select to authenticated using (public.is_agency_member(auth.uid(), agency_id));
create policy "vr insert" on public.visa_requests for insert to authenticated with check (public.is_agency_member(auth.uid(), agency_id));
create policy "vr update" on public.visa_requests for update to authenticated using (public.is_agency_member(auth.uid(), agency_id));
create policy "vr delete" on public.visa_requests for delete to authenticated using (public.has_role(auth.uid(), 'agency_admin', agency_id));

create table if not exists public.visa_requirements (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid,
  destination_country text not null,
  origin_nationality text not null,
  visa_required boolean not null default true,
  visa_type text,
  processing_days int,
  price_estimate numeric,
  required_documents text[] not null default '{}',
  notes text,
  official_url text,
  last_updated timestamptz not null default now()
);
grant select on public.visa_requirements to anon, authenticated;
grant insert, update, delete on public.visa_requirements to authenticated;
grant all on public.visa_requirements to service_role;
alter table public.visa_requirements enable row level security;
create policy "vreq public read" on public.visa_requirements for select to anon, authenticated using (true);
create policy "vreq write" on public.visa_requirements for insert to authenticated with check (agency_id is null or public.is_agency_member(auth.uid(), agency_id));
create policy "vreq update" on public.visa_requirements for update to authenticated using (agency_id is null or public.is_agency_member(auth.uid(), agency_id));
create policy "vreq delete" on public.visa_requirements for delete to authenticated using (agency_id is not null and public.has_role(auth.uid(), 'agency_admin', agency_id));

-- =========================================================
-- CORPORATE CLIENTS
-- =========================================================
create table if not exists public.corporate_clients (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null,
  company_name text not null,
  cnpj text,
  industry text,
  contact_name text,
  contact_email text,
  contact_phone text,
  billing_address jsonb not null default '{}'::jsonb,
  travel_policy jsonb not null default '{}'::jsonb,
  billing_cycle text default 'monthly',
  payment_terms int default 30,
  credit_limit numeric not null default 0,
  status text not null default 'active' check (status in ('active','inactive','blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.corporate_clients to authenticated;
grant all on public.corporate_clients to service_role;
alter table public.corporate_clients enable row level security;
create policy "cc read" on public.corporate_clients for select to authenticated using (public.is_agency_member(auth.uid(), agency_id));
create policy "cc insert" on public.corporate_clients for insert to authenticated with check (public.is_agency_member(auth.uid(), agency_id));
create policy "cc update" on public.corporate_clients for update to authenticated using (public.is_agency_member(auth.uid(), agency_id));
create policy "cc delete" on public.corporate_clients for delete to authenticated using (public.has_role(auth.uid(), 'agency_admin', agency_id));
create trigger cc_touch before update on public.corporate_clients for each row execute function public.set_updated_at();

-- =========================================================
-- COMPANY PROFILES
-- =========================================================
create table if not exists public.company_profiles (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null unique,
  name text not null,
  description text,
  short_description text,
  category text,
  cnpj text,
  phone text, whatsapp text, email text, website text,
  address jsonb not null default '{}'::jsonb,
  business_hours jsonb not null default '{}'::jsonb,
  cover_image_url text, logo_url text,
  gallery text[] not null default '{}',
  instagram text, facebook text, youtube text, tiktok text, linkedin text,
  partner_operators jsonb not null default '[]'::jsonb,
  payment_methods text[] not null default '{}',
  google_business_id text,
  google_maps_url text,
  google_reviews_embed text,
  reviews jsonb not null default '[]'::jsonb,
  last_synced_google_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.company_profiles to anon, authenticated;
grant insert, update, delete on public.company_profiles to authenticated;
grant all on public.company_profiles to service_role;
alter table public.company_profiles enable row level security;
create policy "cp public read" on public.company_profiles for select to anon, authenticated using (true);
create policy "cp insert" on public.company_profiles for insert to authenticated with check (public.is_agency_member(auth.uid(), agency_id));
create policy "cp update" on public.company_profiles for update to authenticated using (public.is_agency_member(auth.uid(), agency_id));
create policy "cp delete" on public.company_profiles for delete to authenticated using (public.has_role(auth.uid(), 'agency_admin', agency_id));
create trigger cp_touch before update on public.company_profiles for each row execute function public.set_updated_at();

-- =========================================================
-- PORTAL PAGES
-- =========================================================
create table if not exists public.portal_pages (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null,
  slug text not null,
  title text not null,
  blocks jsonb not null default '[]'::jsonb,
  is_published boolean not null default false,
  template text default 'default',
  seo jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_id, slug)
);
grant select on public.portal_pages to anon, authenticated;
grant insert, update, delete on public.portal_pages to authenticated;
grant all on public.portal_pages to service_role;
alter table public.portal_pages enable row level security;
create policy "pp public read" on public.portal_pages for select to anon using (is_published = true);
create policy "pp member read" on public.portal_pages for select to authenticated using (is_published = true or public.is_agency_member(auth.uid(), agency_id));
create policy "pp insert" on public.portal_pages for insert to authenticated with check (public.is_agency_member(auth.uid(), agency_id));
create policy "pp update" on public.portal_pages for update to authenticated using (public.is_agency_member(auth.uid(), agency_id));
create policy "pp delete" on public.portal_pages for delete to authenticated using (public.has_role(auth.uid(), 'agency_admin', agency_id));
create trigger pp_touch before update on public.portal_pages for each row execute function public.set_updated_at();

-- =========================================================
-- BLOG POSTS
-- =========================================================
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null,
  author_id uuid,
  title text not null,
  slug text not null,
  excerpt text,
  content text,
  cover_image_url text,
  tags text[] not null default '{}',
  category text,
  status text not null default 'draft' check (status in ('draft','published','scheduled')),
  published_at timestamptz,
  scheduled_for timestamptz,
  seo jsonb not null default '{}'::jsonb,
  publish_to_gbp boolean not null default false,
  gbp_post_id text,
  views int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_id, slug)
);
grant select on public.blog_posts to anon, authenticated;
grant insert, update, delete on public.blog_posts to authenticated;
grant all on public.blog_posts to service_role;
alter table public.blog_posts enable row level security;
create policy "bp public read" on public.blog_posts for select to anon using (status = 'published');
create policy "bp member read" on public.blog_posts for select to authenticated using (status = 'published' or public.is_agency_member(auth.uid(), agency_id));
create policy "bp insert" on public.blog_posts for insert to authenticated with check (public.is_agency_member(auth.uid(), agency_id));
create policy "bp update" on public.blog_posts for update to authenticated using (public.is_agency_member(auth.uid(), agency_id));
create policy "bp delete" on public.blog_posts for delete to authenticated using (public.has_role(auth.uid(), 'agency_admin', agency_id));
create trigger bp_touch before update on public.blog_posts for each row execute function public.set_updated_at();

-- =========================================================
-- KNOWLEDGE ARTICLES
-- =========================================================
create table if not exists public.knowledge_articles (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null,
  title text not null,
  content text,
  category text,
  tags text[] not null default '{}',
  is_internal boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.knowledge_articles to authenticated;
grant all on public.knowledge_articles to service_role;
alter table public.knowledge_articles enable row level security;
create policy "ka read" on public.knowledge_articles for select to authenticated using (public.is_agency_member(auth.uid(), agency_id));
create policy "ka insert" on public.knowledge_articles for insert to authenticated with check (public.is_agency_member(auth.uid(), agency_id));
create policy "ka update" on public.knowledge_articles for update to authenticated using (public.is_agency_member(auth.uid(), agency_id));
create policy "ka delete" on public.knowledge_articles for delete to authenticated using (public.has_role(auth.uid(), 'agency_admin', agency_id));
create trigger ka_touch before update on public.knowledge_articles for each row execute function public.set_updated_at();

-- =========================================================
-- LEAD FORMS
-- =========================================================
create table if not exists public.lead_forms (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null,
  name text not null,
  slug text not null,
  target_stage_id uuid,
  fields jsonb not null default '[]'::jsonb,
  design jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  submissions_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_id, slug)
);
grant select on public.lead_forms to anon, authenticated;
grant insert, update, delete on public.lead_forms to authenticated;
grant all on public.lead_forms to service_role;
alter table public.lead_forms enable row level security;
create policy "lf public read" on public.lead_forms for select to anon using (is_active = true);
create policy "lf member read" on public.lead_forms for select to authenticated using (is_active = true or public.is_agency_member(auth.uid(), agency_id));
create policy "lf insert" on public.lead_forms for insert to authenticated with check (public.is_agency_member(auth.uid(), agency_id));
create policy "lf update" on public.lead_forms for update to authenticated using (public.is_agency_member(auth.uid(), agency_id));
create policy "lf delete" on public.lead_forms for delete to authenticated using (public.has_role(auth.uid(), 'agency_admin', agency_id));
create trigger lf_touch before update on public.lead_forms for each row execute function public.set_updated_at();

-- =========================================================
-- API KEYS
-- =========================================================
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid,
  provider text not null,
  label text,
  key_value text not null,
  monthly_limit int,
  used_count int not null default 0,
  is_active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.api_keys to authenticated;
grant all on public.api_keys to service_role;
alter table public.api_keys enable row level security;
create policy "ak read" on public.api_keys for select to authenticated using (agency_id is not null and public.has_role(auth.uid(), 'agency_admin', agency_id));
create policy "ak insert" on public.api_keys for insert to authenticated with check (agency_id is not null and public.has_role(auth.uid(), 'agency_admin', agency_id));
create policy "ak update" on public.api_keys for update to authenticated using (agency_id is not null and public.has_role(auth.uid(), 'agency_admin', agency_id));
create policy "ak delete" on public.api_keys for delete to authenticated using (agency_id is not null and public.has_role(auth.uid(), 'agency_admin', agency_id));
create trigger ak_touch before update on public.api_keys for each row execute function public.set_updated_at();

-- =========================================================
-- NOTIFICATIONS
-- =========================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null,
  user_id uuid not null,
  type text not null,
  title text not null,
  body text,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notif_user_idx on public.notifications(user_id, read_at);
grant select, insert, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "notif read own" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "notif insert agency" on public.notifications for insert to authenticated with check (public.is_agency_member(auth.uid(), agency_id));
create policy "notif update own" on public.notifications for update to authenticated using (user_id = auth.uid());
create policy "notif delete own" on public.notifications for delete to authenticated using (user_id = auth.uid());

-- =========================================================
-- AUDIT LOG (append-only)
-- =========================================================
create table if not exists public.audit_log (
  id bigserial primary key,
  agency_id uuid,
  actor_id uuid,
  actor_type text,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists audit_agency_idx on public.audit_log(agency_id, created_at desc);
grant select, insert on public.audit_log to authenticated;
grant all on public.audit_log to service_role;
alter table public.audit_log enable row level security;
create policy "audit read" on public.audit_log for select to authenticated using (agency_id is null or public.is_agency_member(auth.uid(), agency_id));
create policy "audit insert" on public.audit_log for insert to authenticated with check (agency_id is null or public.is_agency_member(auth.uid(), agency_id));
-- no UPDATE / DELETE policies → append-only
