# MAPA MASTER DA PLATAFORMA (Self-Confrontation Loop)
Gerado em: 2026-06-29

## MÓDULOS IDENTIFICADOS
| Módulo | Páginas Base | Tabelas Core | Componentes/Features | Edge Functions | Status Aparente |
|--------|--------------|--------------|----------------------|----------------|-----------------|
| **Admin** | `/admin.*` | `agencies`, `plans`, `global_configs` | Gestão de agências, auditoria SaaS, templates globais | `admin-secure-keys` | Administrativo Master |
| **Agência (Workspace)** | `/agency.$slug.*` | N/A (agrega tudo) | Dashboard, settings, integrações | N/A | Núcleo do sistema |
| **Auth / Onboarding** | `/auth.*` | `users`, `agencies` | Login, cadastro, onboarding wizards | `client-token-login` | Gateway |
| **Boarding / Trips** | `/agency.$slug.trips.*`, `/agency.$slug.boarding.tsx` | `trips`, `boarding_cards`, `passengers` | Gestão de embarque, vouchers, passagens, financeiro de viagem | `generate-voucher-pdf` | Operacional Alto Risco |
| **CRM / Leads** | `/agency.$slug.crm.*`, `m.lead.*` | `leads`, `lead_activities` | Kanban de Vendas, Funil, Integração WhatsApp/Meta | `meta-capi-sync`, `whatsapp-sender` | Comercial Core |
| **Cotações & Propostas** | `/agency.$slug.proposals.*`, `/agency.$slug.quotes.*` | `proposals`, `quotes`, `proposal_items` | Builder IA de cotações, leitura de OCR PDF | `ai-quote-engine`, `ocr-proposal` | Motor de Vendas |
| **Contratos & KYC** | `/agency.$slug.contracts.*`, `m.contract.*` | `contracts`, `contract_audit_chain` | Assinatura digital, tracking comportamental, Adendos | N/A | Jurídico / Compliance |
| **Financeiro (Agência)** | `/agency.$slug.financial.*` | `financial_records`, `financial_accounts` | DRE, Ledger, Conciliação, Fluxo de Caixa | N/A | Alto Risco / Double-Entry |
| **Grupos & Pacotes** | `/agency.$slug.group-tours.*` | `group_tours`, `bus_layouts`, `bus_virtual` | Excursões terrestres, mapas de assento, controle financeiro de grupo | N/A | Operacional |
| **Caixa de Entrada / Omnichannel**| `/agency.$slug.inbox.*`, `/agency.$slug.omnichannel.*` | `omnichannel_sessions`, `messages` | Chat AI, Integração WhatsApp WABA, Instagram | `whatsapp-webhook`, `ai-message-processor` | Comunicação Core |
| **Portal / CMS** | `/agency.$slug.portal.*`, `p.$agency_slug.*` | `portal_pages`, `portal_settings` | Construtor Visual, Páginas Web Públicas, Blog | `generate-site-ai` | Aquisição |
| **Mobile / Clientes** | `/client.*`, `m.checkin.*`, `m.passenger.*` | `client_documents`, `checkin_links` | WebApp do viajante final, check-in e pagamentos | `client-token-login` | Experiência do Cliente |

## DEPENDÊNCIAS CRÍTICAS
| Biblioteca | Versão | Usada para | Alternativa interna? |
|------------|--------|-----------|----------------------|
| `@tanstack/react-router` | ^1.168.25 | File-based routing | Não (Estrutura Base) |
| `@supabase/supabase-js` | ^2.106.2 | Autenticação e Queries Pós-Build | Supabase RPCs customizadas |
| `@radix-ui/react-*` | Várias | Acessibilidade (Primitivas UI) | Não |
| `tailwindcss` | ^4.2.1 | Design System v4 Inline CSS | CSS Vanilla/Style attributes |
| `@dnd-kit/core` | ^6.3.1 | Kanban e Construtor Visual (Drag & Drop) | HTML5 Drag/Drop |

## INTEGRAÇÕES ENTRE MÓDULOS
| De | Para | Como | Campo de vínculo | Verificado? |
|----|------|------|------------------|-------------|
| **Cotações** | **Trips/Grupos** | "Converter Cotação" | `trip_id` no `proposals` | Parcial |
| **CRM** | **Cotações** | Histórico no Lead | `lead_id` em `proposals` | Parcial |
| **Trips** | **Financeiro** | Faturamento de reservas | `trip_id` em `financial_records` | Pendente R1 |
| **Omnichannel** | **CRM** | Link de Chat com Perfil de Vendas | `lead_id` em `omnichannel_sessions` | Pendente |
| **Grupos** | **Frota/Bus Layouts**| Mapa de Assentos | `bus_layout_id` em `group_tours` | ✅ (Bug B004 fixado) |

## FLAGS DE RISCO (identificados na varredura inicial)
| Arquivo / Módulo | Risco | Tipo | Severidade |
|---------|-------|------|------------|
| `financial_records` / `trips` | Lógica de conciliação cruzada (Double-Entry) pode ser bypassada no cliente se não tratada em RLS ou RPC estrito. | Arquitetura / Integridade | ALTO |
| `omnichannel_sessions` | Concorrência de mensagens no webhook de WhatsApp vs Chat UI | Concorrência de Dados | MÉDIO |
| `portal_pages` | Carregamento dinâmico do JSON dos componentes `NewSectionsRenderer` sem verificação de sanitização extrema pode quebrar grid SSR. | Renderização | MÉDIO |

---
*Fase 0 concluída com sucesso.*
