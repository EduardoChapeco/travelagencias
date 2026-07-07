# 38 Matriz de Cobertura de Rotas e Páginas

Esta matriz documenta o status visual, geométrico e funcional de todas as rotas, layouts e módulos que compõem o ecossistema TravelOS.

## Legenda de Estados
* 🟢 **RECUPERADO:** Totalmente compatível com a autoridade AppShell, utilizando a hierarquia flex correta, sem overflow horizontal, com cascata CSS limpa e sem blurs empilhados.
* 🟡 **PARCIAL:** Módulo herdado com geometrias funcionais, mas ainda contendo estilos inline locais ou pendente de centralização de tokens semânticos.
* 🔴 **NÃO ALCANÇADO:** Páginas que ainda não foram auditadas visualmente, que possuem código semântico pendente ou que herdam layouts brutos antigos.

---

## Matriz de Cobertura de Layouts e Módulos

| Rota / Rota Física | Módulo | Layout | PageShell | Header | Toolbar | Sidebar Contextual | Surface | Grid | Responsivo | Testado | Estado |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/agency/$slug` | **Home / Dashboard** | AppShell | Padrão | Sim | Sim (Doutor) | Não | Glass | Flex | Sim | Sim | 🟢 RECUPERADO |
| `/agency/$slug/crm` | **CRM / Kanban** | AppShell | Módulo | Sim | Slot | Sim | Kanban-Col | Flex | Sim | Sim | 🟢 RECUPERADO |
| `/agency/$slug/crm/$lead_id` | **Leads Detalhes** | AppShell | Módulo | Sim | Slot | Sim | Glass | Flex | Sim | Não | 🟡 PARCIAL |
| `/agency/$slug/clients` | **Clientes / Viajantes** | AppShell | Módulo | Sim | Slot | Não | Tabela | Flex | Sim | Não | 🟡 PARCIAL |
| `/agency/$slug/clients/$id` | **Perfil 360 do Cliente**| AppShell | Módulo | Sim | Slot | Não | Glass | Flex | Sim | Não | 🟡 PARCIAL |
| `/agency/$slug/quotes` | **Cotações Lista** | AppShell | Módulo | Sim | Slot | Não | Tabela | Flex | Sim | Não | 🟡 PARCIAL |
| `/agency/$slug/quotes/$id` | **Detalhe Cotação** | AppShell | Módulo | Sim | Slot | Não | Glass | Flex | Sim | Não | 🟡 PARCIAL |
| `/agency/$slug/proposals` | **Propostas Lista** | AppShell | Módulo | Sim | Slot | Não | Tabela | Flex | Sim | Não | 🟡 PARCIAL |
| `/agency/$slug/proposals/new` | **Proposal Builder** | Custom | Builder | Não | Builder | Não | Sólido | Split | Não | Não | 🔴 NÃO ALCANÇADO |
| `/agency/$slug/trips` | **Viagens Lista** | AppShell | Módulo | Sim | Slot | Não | Tabela | Flex | Sim | Não | 🟡 PARCIAL |
| `/agency/$slug/trips/$id` | **Viagem Detalhe (Geral)**| AppShell | Módulo | Sim | Slot | Sim | Glass | Flex | Sim | Não | 🟡 PARCIAL |
| `/agency/$slug/trips/$id/passengers`| **Passageiros da Viagem**| AppShell | Módulo | Sim | Slot | Sim | Glass | Flex | Sim | Não | 🟡 PARCIAL |
| `/agency/$slug/trips/$id/financial`| **Financeiro Viagem** | AppShell | Módulo | Sim | Slot | Sim | Glass | Flex | Sim | Não | 🟡 PARCIAL |
| `/agency/$slug/trips/$id/contract` | **Assinatura Contrato** | AppShell | Módulo | Sim | Slot | Sim | Glass | Flex | Sim | Não | 🟡 PARCIAL |
| `/agency/$slug/trips/$id/vouchers` | **Vouchers de Embarque** | AppShell | Módulo | Sim | Slot | Sim | Glass | Flex | Sim | Não | 🟡 PARCIAL |
| `/agency/$slug/group-tours` | **Grupos / Ônibus** | AppShell | Módulo | Sim | Slot | Não | Glass | Flex | Sim | Não | 🟡 PARCIAL |
| `/agency/$slug/rooming-list` | **Rooming List** | AppShell | Módulo | Sim | Slot | Não | Glass | Flex | Sim | Não | 🟡 PARCIAL |
| `/agency/$slug/financial` | **Financeiro Principal** | AppShell | Módulo | Sim | Slot | Sim (Tabs) | Glass | Grid | Sim | Não | 🟡 PARCIAL |
| `/agency/$slug/financial/cash` | **Caixa diário** | AppShell | Módulo | Sim | Slot | Sim | Tabela | Flex | Sim | Não | 🟡 PARCIAL |
| `/agency/$slug/financial/ledger` | **Ledger Contábil** | AppShell | Módulo | Sim | Slot | Sim | Tabela | Flex | Sim | Não | 🟡 PARCIAL |
| `/agency/$slug/financial/reconciliation` | **Conciliação Bancária**| AppShell | Módulo | Sim | Slot | Sim | Tabela | Flex | Sim | Não | 🟡 PARCIAL |
| `/agency/$slug/daily-tasks` | **Tarefas diárias** | AppShell | Módulo | Sim | Slot | Não | Glass | Flex | Sim | Sim | 🟢 RECUPERADO |
| `/agency/$slug/calendar` | **Agenda / Calendário** | AppShell | Módulo | Sim | Slot | Não | Glass | Flex | Sim | Não | 🟡 PARCIAL |
| `/agency/$slug/inbox` | **Inbox WhatsApp/Omni** | AppShell | Módulo | Sim | Slot | Não | Glass | Split | Sim | Não | 🟡 PARCIAL |
| `/agency/$slug/support` | **Lista de Tickets** | AppShell | Módulo | Sim | Slot | Não | Tabela | Flex | Sim | Sim | 🟢 RECUPERADO |
| `/agency/$slug/support/$ticket_id` | **Chat do Ticket** | AppShell | Módulo | Sim | Slot | Sim (Meta) | Glass | Split | Sim | Sim | 🟢 RECUPERADO |
| `/agency/$slug/settings` | **Configurações Gerais** | AppShell | Módulo | Sim | Slot | Sim (Tabs) | Glass | Flex | Sim | Não | 🟡 PARCIAL |
| `/agency/$slug/settings/brand` | **Configuração Visual** | AppShell | Módulo | Sim | Slot | Sim | Glass | Flex | Sim | Não | 🟡 PARCIAL |
| `/portal` | **CMS Portal Admin** | AppShell | Módulo | Sim | Slot | Sim | Glass | Flex | Sim | Não | 🟡 PARCIAL |
| `/p/$agency_slug` | **Site Público Agência** | Público | CMS | Custom | Não | Não | Sólido | Flex | Sim | Não | 🔴 NÃO ALCANÇADO |
| `/client` | **Portal do Cliente Home**| ClientSh | Client | Custom | Não | Sim (Side) | Glass | Flex | Sim | Não | 🔴 NÃO ALCANÇADO |
| `/client/trips` | **Viagens do Cliente** | ClientSh | Client | Custom | Não | Sim | Glass | Flex | Sim | Não | 🔴 NÃO ALCANÇADO |
| `/admin` | **Portal Superadmin** | AdminSh | Admin | Custom | Não | Sim | Sólido | Flex | Sim | Não | 🔴 NÃO ALCANÇADO |
| `/verify/$serial` | **Validador de Voucher** | Público | Vazio | Não | Não | Não | Sólido | Flex | Sim | Não | 🔴 NÃO ALCANÇADO |

---

## Mapeamento de Gaps e Áreas Pendentes

1. **Gaps de Páginas de Impressão e Preview:**
   As páginas de geração de voucher e PDF (`/agency/$slug/proposals/$id/preview` e `/verify/$serial`) não possuem RLS auditado de frontend e usam estilos que ignoram o reset global do `.os-workspace`.
2. **Gaps nos Portais Públicos e do Cliente:**
   As rotas sob `/client` e `/p/$agency_slug` utilizam layouts de layout-store antigos. Embora tenham paridade funcional de banco, a UI não está integrada com o barramento do Glassmorphism.
3. **Gaps do Superadmin Master:**
   As rotas `/admin/*` de supergerenciamento de agências não possuem controle de viewports, sofrendo quebras quando visualizadas fora de resoluções de desktop comuns (1440x900).
