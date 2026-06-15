# INVENTORY_ROUTES.md — Rotas do Sistema

## 🌐 Frontend (TanStack Router)

| Rota | Tipo | Arquivo | Parâmetros | Descrição |
|---|---|---|---|---|
| `/` | Pública | `src/routes/index.tsx` | - | Homepage da plataforma corporativa / landing page |
| `/auth/login` | Pública | `src/routes/auth.login.tsx` | - | Login de usuário da agência |
| `/auth/onboarding` | Privada | `src/routes/auth.onboarding.tsx` | - | Fluxo de onboarding da agência |
| `/agency/$slug` | Privada | `src/routes/agency.$slug.index.tsx` | `slug` | Dashboard principal da agência |
| `/agency/$slug/crm` | Privada | `src/routes/agency.$slug.crm.tsx` | `slug` | Kanban de CRM e gerenciamento de leads |
| `/agency/$slug/portal/settings` | Privada | `src/routes/agency.$slug.portal.settings.tsx` | `slug` | Configurações do Portal Público e SEO |
| `/p/$agency_slug` | Pública | `src/routes/p.$agency_slug.index.tsx` | `agency_slug` | Portal público principal da agência / Biolink |
| `/p/$agency_slug/contact` | Pública | `src/routes/p.$agency_slug.contact.tsx` | `agency_slug` | Formulário de contato público |
| `/p/$agency_slug/tour/$id` | Pública | `src/routes/p.$agency_slug.tour.$id.tsx` | `agency_slug`, `id` | Detalhes públicos de uma excursão |

## ⚡ Edge Functions (Backend)

Expostas sob `https://esmppoxxnyiscidzsjvy.supabase.co/functions/v1/`:

- `/whatsapp-sender` — Processamento e envio de mensagens outbound de WhatsApp.
- `/ai-message-processor` — Processamento de mensagens inbound por IA.
- `/meta-capi-sync` — Sincronização de conversões com a API de conversões do Meta (CAPI).
- `/meta-catalog-feed` — Geração dinâmica de feed XML para Meta/Google Catalog Ads.
- `/generate-site-ai` — Assistente de IA que constrói páginas e estruturas CMS dinamicamente.
