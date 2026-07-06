# BUILDER INVENTORY - TRAVELOS PORTAL BUILDER & BRAND KIT

This document registers the mapping of all resources, database structures, and frontend components related to the Site/Portal Builder, AI Builder, and Brand Module of Turis.

---

## 1. DATABASE SCHEMA (SUPABASE)

### 1.1 `portal_pages`

Stores the individual pages of the agency portals.

- **Columns**:
  - `id` (`UUID`, PK, default: `gen_random_uuid()`)
  - `agency_id` (`UUID`, FK -> `agencies.id` ON DELETE CASCADE)
  - `slug` (`TEXT`): URL identifier.
  - `title` (`TEXT`): Page display/internal title.
  - `description` (`TEXT`, optional): Page description.
  - `cover_image_url` (`TEXT`, optional)
  - `category` (`TEXT`, default: `'roteiro'`): Page type grouping.
  - `content` (`JSONB`, default: `'[]'`): Legacy content blocks storage.
  - `canvas_format` (`TEXT`, default: `'web-page'`)
  - `status` (`TEXT`, default: `'draft'`): Page lifecycle stage.
  - `published_at` (`TIMESTAMPTZ`, optional)
  - `created_at` (`TIMESTAMPTZ`, default: `now()`)
  - `updated_at` (`TIMESTAMPTZ`, default: `now()`)
  - `is_published` (`BOOLEAN`, generated: `status = 'published'`)
  - `blocks` (`JSONB`, default: `'[]'`): Current working blocks (Zod-validated).
  - `seo` (`JSONB`, default: `'{}'`): Current page SEO configurations.
  - `template` (`TEXT`, default: `'default'`): Visual layout reference.
  - `published_title` (`TEXT`, optional): Title of the public live page.
  - `published_blocks` (`JSONB`, optional): Copied from `blocks` upon publishing.
  - `published_seo` (`JSONB`, optional): Copied from `seo` upon publishing.
- **Constraints**:
  - `unique_site_page_slug` / `portal_pages_agency_id_slug_key`: `UNIQUE(agency_id, slug)`
- **RLS Policies**:
  - `agency members read portal_pages` (SELECT)
  - `agency members create portal_pages` (INSERT)
  - `agency members update portal_pages` (UPDATE)
  - `agency members delete portal_pages` (DELETE)
  - `public can read published portal_pages` (SELECT for anon and authenticated if `is_published = true`)

### 1.2 `portal_page_versions`

Stores historical snapshots of published pages.

- **Columns**:
  - `id` (`UUID`, PK)
  - `page_id` (`UUID`, FK -> `portal_pages.id` ON DELETE CASCADE)
  - `agency_id` (`UUID`)
  - `title` (`TEXT`)
  - `slug` (`TEXT`)
  - `template` (`TEXT`)
  - `blocks` (`JSONB`)
  - `seo` (`JSONB`)
  - `created_by` (`UUID`)
  - `created_at` (`TIMESTAMPTZ`)
- **RLS Policies**:
  - `ppv read` (SELECT for authenticated agency members)
  - `ppv insert` (INSERT for authenticated agency members)

### 1.3 `portal_settings`

Global configurations for agency portals.

- **Columns**:
  - `id` (`UUID`, PK)
  - `agency_id` (`UUID`, FK -> `agencies.id` ON DELETE CASCADE, UNIQUE)
  - `seo_title_suffix` (`TEXT`, default: `''`)
  - `seo_default_description` (`TEXT`, default: `''`)
  - `seo_og_image_url` (`TEXT`)
  - `header_style` (`TEXT`, default: `'full'`, CHECK in `('simple', 'full', 'minimal')`)
  - `header_cta_label` (`TEXT`, default: `'Fale conosco'`)
  - `header_cta_url` (`TEXT`, default: `'#contato'`)
  - `nav_links` (`JSONB`, default: `'[{"label":"Início","url":"/"},{"label":"Blog","url":"/blog"}]'`)
  - `footer_text` (`TEXT`)
  - `footer_links` (`JSONB`, default: `'[]'`)
  - `analytics_id` (`TEXT`)
  - `meta_pixel_id` (`TEXT`)
  - `custom_head_script` (`TEXT`)
  - `created_at` / `updated_at` (`TIMESTAMPTZ`)
- **RLS Policies**:
  - `Agency members can manage portal settings` (ALL)
  - `Public can read portal settings` (SELECT)

### 1.4 `brand_kit`

Agency-level branding visual assets and design tokens.

- **Columns**:
  - `id` (`UUID`, PK)
  - `agency_id` (`UUID`, UNIQUE, FK -> `agencies.id` ON DELETE CASCADE)
  - `logo_url` (`TEXT`): Main brand logo URL.
  - `logo_dark_url` (`TEXT`): Dark/White variant for dark backgrounds.
  - `favicon_url` (`TEXT`)
  - `brand_color` (`TEXT`, default: `'#1E293B'`): Primary brand color.
  - `brand_color_light` (`TEXT`, default: `'#F1F5F9'`): Light accent color.
  - `brand_color_fg` (`TEXT`, default: `'#FFFFFF'`): Foreground color over brand color.
  - `font_heading` (`TEXT`, default: `'Inter'`)
  - `font_body` (`TEXT`, default: `'Inter'`)
  - `proposal_template` / `proposal_header_img` / `voucher_theme` / `contract_header_img`
  - `instagram` / `facebook` / `whatsapp` / `website`
  - `google_business_id` / `google_analytics_id`
  - `updated_at` (`TIMESTAMPTZ`)
- **RLS Policies**:
  - `brand read` (SELECT for agency members)
  - `brand upsert` (INSERT for agency members)
  - `brand update` (UPDATE for agency members)

### 1.5 `portal_page_analytics`

Tracks view/click events on public portals.

- **Columns**:
  - `id` (`UUID`, PK)
  - `page_id` (`UUID`)
  - `agency_id` (`UUID`)
  - `event_type` (`TEXT`): e.g. `'view'`, `'click'`
  - `link_url` (`TEXT`)
  - `device_type` (`TEXT`): `'desktop'` or `'mobile'`
  - `created_at` (`TIMESTAMPTZ`)

---

## 2. FRONTEND ARCHITECTURE & DIRECTORY STRUCTURE

### 2.1 File Map

- [types/builder.ts](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/types/builder.ts): **[NEW]** Base visual builder types (as described in Phase 2).
- [lib/cms-types.ts](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/lib/cms-types.ts): Current file defining blocks validation types, schemas and defaults. We will extend/update this with Zod schemas matching new sections.
- [lib/cms-templates.ts](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/lib/cms-templates.ts): Home templates configurations.
- [lib/sections/registry.ts](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/lib/sections/registry.ts): **[NEW]** Static registry of sections (Phase 2).
- [components/portal/BlockRenderer.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/components/portal/BlockRenderer.tsx): Renders all visual blocks. Needs major additions for new sections and anim scroll/parallax hook.
- [components/portal/BlockFormEditors.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/components/portal/BlockFormEditors.tsx): Right sidebar form inputs for sections configuration. Needs major additions.
- [hooks/use-block-editor.ts](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/hooks/use-block-editor.ts): Handles active block states, edits, deletion, and movement.
- [routes/agency.$slug.portal.pages.$page_id.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.portal.pages.$page_id.tsx): Visual page editor workspace. Needs tabs for properties/style/animations/responsive, and pages bar on top.
- [routes/agency.$slug.portal.pages.index.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.portal.pages.index.tsx): Portal pages list.
- [routes/agency.$slug.brand.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.brand.tsx): Identidade visual editor. Needs visual facelift and 2-panel preview.
- [routes/builder.ai.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/builder.ai.tsx): **[NEW]** Chat AI Builder interface.
- [routes/p.$agency_slug.$page_slug.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/p.$agency_slug.$page_slug.tsx): Public portal page detail.
- [routes/p.$agency_slug.index.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/p.$agency_slug.index.tsx): Public portal home.

### 2.2 Global State & Flow

Page editing is managed locally using React state encapsulated in `useBlockEditor` inside `agency.$slug.portal.pages.$page_id.tsx`.

- It fetches raw page details using react-query `["portal-page", page_id]`.
- Edits trigger local state mutation.
- Auto-saving is triggered with a debounce or manually via the "Salvar Rascunho" and "Publicar Página" buttons.
- Publishing copies the current blocks into `published_blocks` and copies slug/title/seo.

---

## 3. SECTIONS TO BUILD / EXPAND

All block types will follow the design token settings:

- Core hero layout variations.
- Destination cards grid & slider strip.
- About sections, bento cards and numbered lists.
- Multi-layout Testimonials & Speeches.
- Image galleries and Map-contacts.
- Form CTA integrations.
- Standard and dark header/footer navigation.

---

## 4. ACTIONS FOR SYNCHRONIZATION & PREPARATION

1. **Database migrations**:
   - Create `public_leads` table for CTA contact forms.
   - Create `ai_generation_logs` table.
   - Add any missing columns to `brand_kit` (e.g. `secondary_color`, `accent_color`, `logo_dark_url`).
2. **TypeScript Declarations**:
   - Standardize `src/types/builder.ts` and ensure it's imported correctly.
3. **AI Builder Routing**:
   - Add `builder.ai.tsx` to handle visual chat generation.
