# Compatibilidade com a Arquitetura Nativa do TravelOS

Este documento avalia se o Motor VibeTour foi construído respeitando as diretrizes arquiteturais canônicas do ecossistema TravelAgencias/TravelOS ou se foram introduzidos atalhos, duplicações ou desvios de design.

---

## 1. Avaliação de Requisitos Arquiteturais Canônicos

### 1.1. Usa os Componentes Canônicos do Design System?

- **Diagnóstico**: **COMPATÍVEL**.
- **Evidência**: As telas importam e utilizam diretamente os componentes canônicos definidos em `@/components/ui/form` (`PrimaryButton`, `GhostButton`, `Input`, `Select`, `Textarea`, `Field`, `StatusBadge`), e componentes de shell (`AppSidebar`, `HeaderPortal`, `PageHeader`). Não há estilos duplicados declarados inline que divirjam do Design System global.

### 1.2. Usa as Rotas e Padrões Atuais do Projeto?

- **Diagnóstico**: **NATIVO E COMPATÍVEL**.
- **Evidência**: O roteamento segue o padrão TanStack Router sob `/agency/$slug/quotes`, respeitando o escopo dinâmico `$slug` para identificar a agência atual e amarrar os loaders. O layout principal utiliza `<Outlet />` de forma correta.

### 1.3. Usa os Hooks e Services Oficiais?

- **Diagnóstico**: **NATIVO E COMPATÍVEL**.
- **Evidência**: Utiliza `useAgency()` de `@/lib/agency-context` para escopo de tenant e o client centralizado do Supabase (`@/integrations/supabase/client`). Os requests assíncronos são envelopados em hooks do TanStack Query (`useQuery`, `useMutation`), seguindo a convenção do projeto.

### 1.4. Usa o Sistema de Autenticação Existente?

- **Diagnóstico**: **NATIVO E COMPATÍVEL**.
- **Evidência**: Utiliza o Supabase Auth integrado. Para operações do cérebro, valida o perfil do usuário consultando `user_roles` e `auth.getUser()` diretamente para verificar o papel (ex: `super_admin`).

### 1.5. Usa o Tenant/Agency Scope Existente?

- **Diagnóstico**: **COMPATÍVEL COM RESSALVAS**.
- **Evidência**: A filtragem por `agency_id` é aplicada na maioria das queries locais (ex: `fetchQuoteRequestsList` filtra por `eq("agency_id", agencyId)`). Contudo, nas tabelas RAG, a falta de RLS no banco deixa os dados abertos a outros tenants até que as migrações corretivas de políticas sejam aplicadas.

### 1.6. Usa as Entidades Canônicas já Existentes?

- **Diagnóstico**: **NATIVO E COMPATÍVEL**.
- **Evidência**: Integra-se diretamente com `leads` (vinculando cotações via `lead_id`) e `clients` (vinculando via `client_id`). A conversão final gera um registro persistido na tabela `proposals` associada ao cliente e preenche os arrays relacionais de voos e hotéis.

### 1.7. Usa os Contratos Globais?

- **Diagnóstico**: **COMPATÍVEL COM RESSALVAS**.
- **Evidência**: O tipo `NormalizedOffer` define um contrato canônico em `src/types/quotes.ts` para evitar acoplamento direto com fornecedores de APIs de turismo (ex: Infotravel). Mas as tabelas RAG não possuem tipos mapeados no `types.ts` do Supabase, forçando coerção de tipo (`as any`).

### 1.8. Usa o Mecanismo de Auditoria Existente?

- **Diagnóstico**: **NATIVO E COMPATÍVEL**.
- **Evidência**: Toda rejeição de alternativa de pacote pelo agente é registrada explicitamente em `decision_records` e uma sugestão de regra é inserida na tabela `rule_candidates` para aprendizado contínuo.

### 1.9. Usa o Padrão Atual de Queries e Mutations?

- **Diagnóstico**: **NATIVO E COMPATÍVEL**.
- **Evidência**: Segue o padrão de Mutations do TanStack Query com invalidação de cache programada via `qc.invalidateQueries`.

### 1.10. Usa o Sistema de Documentos e Storage Existente?

- **Diagnóstico**: **AUSENTE**.
- **Evidência**: O Motor de Cotações não possui fluxos de upload de arquivos/pdf para o storage nativo na fase atual. Todo o processamento de texto é feito em memória ou persistido em tabelas relacionais de conhecimento.

### 1.11. Usa o Sistema Central de IA, APIs e Integrações?

- **Diagnóstico**: **NATIVO E COMPATÍVEL**.
- **Evidência**: Utiliza a Edge Function central `ai-orchestrator` para orquestração de IA (interpretação da intenção em linguagem natural e simulação agêntica por persona) e chama o conector `infotravel-connector` para buscas físicas de voos/hotéis.

### 1.12. Usa o Fluxo Oficial de Permissões e RLS?

- **Diagnóstico**: **INCOMPATÍVEL (Atualmente Quebrado)**.
- **Evidência**: Como as migrations `20260727000000_vibetour_global_rules_security.sql` e `20260728000000_vibetour_memory_rag_tables.sql` não estão aplicadas no banco de dados remoto, as políticas de restrição de privilégios globais e isolamento multi-tenant para RAG estão inoperantes ou vulneráveis.
