# Matriz de Contratos: UI vs. Banco de Dados vs. TypeScript

Este documento expõe as divergências técnicas entre as definições de schemas do banco (PostgreSQL), os tipos estáticos do SDK do frontend (`types.ts`), as validações do Zod e os payloads passados pela UI.

---

## ⚡ Tabela de Divergências Encontradas

| Elemento / Tabela | Banco de Dados (SQL) | Tipo TypeScript (`types.ts`) | UI / Zod Schema | Status de Integridade | Evidência Técnica |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`ai_api_credentials`** | Criada via DDL local (`20260710000000_ai_orchestrator_schema.sql`) | **Ausente** | Não usa Zod (usa raw JSON no frontend) | 🔴 **QUEBRADA** | Exigiu cast para `(supabase as any)` em [settings.ts:L114](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/services/settings.ts#L114-L124) |
| **`ai_jobs`** | Criada via DDL local (`20260710000000_ai_orchestrator_schema.sql`) | **Ausente** | Sem Zod no frontend (resolvido por Edge Function) | 🔴 **QUEBRADA** | Chamado direto na Edge Function [index.ts:L851](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/supabase/functions/ai-orchestrator/index.ts#L851) sem espelhamento de tipo. |
| **`proposals` (group_tour_id)** | Adicionado via DDL | Sincronizado localmente em `types.ts` | **Ausente do `proposalSchema`** | 🟡 **PARCIAL** | `proposalSchema` em [proposals.new.tsx:L30-L43](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.proposals.new.tsx#L30-L43) não possui o campo `group_tour_id`, impossibilitando salvar o vínculo diretamente pelo formulário de criação padrão sem custom calls. |
| **`leads` (pax_adults, pax_children, pax_infants)** | Colunas adicionadas via migrations | Sincronizado localmente em `types.ts` | `leadSchema` em [crm.tsx:L473-L491](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.crm.tsx#L473-L491) | 🟢 **REAL** | Perfeitamente mapeado e propagado do formulário para o banco. |
| **`group_tours` (rooming_list_status)** | Adicionado via DDL | Sincronizado localmente em `types.ts` | Sem Zod no frontend | 🟢 **REAL** | Mapeado no frontend em rooming list. |

---

## ⚠️ Impacto dos Contratos Quebrados

1. **Quebra de Type Safety**: A ausência das tabelas centrais do Orquestrador de IA no arquivo de tipos estáticos (`types.ts`) força o uso de bypass de compilação (`as any`), aumentando a chance de erros silenciosos caso o schema das tabelas mude e o frontend continue chamando campos inexistentes.
2. **Desalinhamento da Camada de Validação**: A ausência de mapeamento das novas relações (como o `group_tour_id` no Zod das cotações) faz com que validações de dados rechem campos novos, dependendo exclusivamente de requisições paralelas sem validação sanitária no lado do cliente.
