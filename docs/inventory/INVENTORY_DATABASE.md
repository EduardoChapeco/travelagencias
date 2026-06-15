# INVENTORY_DATABASE.md — Banco de Dados (Supabase)

## 🗄️ Tabelas e Colunas Principais

### Tabela: `public.portal_settings`
- **Colunas**:
  - `id` (uuid, PK)
  - `agency_id` (uuid, FK -> agencies.id)
  - `custom_domain` (text, nullable) — *Adicionado na migration 20260616000003_portal_settings_custom_domain.sql*
  - `created_at` (timestamp with time zone)
  - `updated_at` (timestamp with time zone)

### Tabela: `public.leads`
- **Colunas**:
  - `id` (uuid, PK)
  - `agency_id` (uuid, FK -> agencies.id)
  - `stage_id` (uuid, FK -> lead_stages.id)
  - `name` (text)
  - `email` (text)
  - `phone` (text)
  - `destination` (text)
  - `travel_start` (date)
  - `travel_end` (date)
  - `pax_count` (int, default 1)
  - `estimated_value` (numeric, default 0)
  - `source` (text)
  - `notes` (text)
  - `tags` (text[], default '{}') — *Suporta tags de CRM automático como 'Lead Form Site', 'Newsletter Site', etc.*
  - `created_at` (timestamp with time zone)

### Tabela: `public.group_tours`
- **Colunas**:
  - `id` (uuid, PK)
  - `agency_id` (uuid, FK -> agencies.id)
  - `title` (text)
  - `description` (text)
  - `cover_image_url` (text)
  - `base_price` (numeric)
  - `total_seats` (int)
  - `reserved_seats` (int)
  - `status` (text) — *Restrições de valor: 'draft', 'open', 'confirmed', 'completed', 'cancelled'*
  - `is_public` (boolean)

## ⚙️ RPCs e Funções Customizadas

| Nome da Função | Argumentos | Retorno | Segurança | Descrição |
|---|---|---|---|---|
| `submit_public_lead` | `_agency_slug text, _name text, _email text, _phone text, _destination text, _travel_start date, _travel_end date, _pax_count int, _estimated_value numeric, _source text, _notes text, _tags text[] DEFAULT '{}'` | `uuid` | SECURITY DEFINER | Cria lead e associa tags automaticamente |
| `calculate_dre_summary` | `_agency_id uuid, _start_date date, _end_date date` | `jsonb` | SECURITY DEFINER | Calcula DRE da agência |
| `duplicate_portal_page` | `p_page_id uuid` | `uuid` | SECURITY DEFINER | Duplica página no portal |

## 🔒 Segurança (RLS e Policies)
- RLS ativado em todas as tabelas públicas (`portal_settings`, `leads`, `group_tours`, etc.)
- Políticas específicas permitem inserção pública via RPC sem expor chaves confidenciais.
