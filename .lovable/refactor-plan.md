# PLANO DE REFATORAÇÃO E ESTABILIZAÇÃO TOTAL (FASE B)
Data: 2026-06-28
Baseado no inventário gerado na FASE A.

## 2.1. Matriz de Decisão

| ID | Problema | Severidade | Ação | Risco de quebra | Dependentes |
|----|----------|------------|------|-----------------|-------------|
| P01 | Tipagens Quebradas (`ticket_timeline`, `knowledge_documents`) | P0 | **IMPLEMENTAR REAL** | Alto | Support, AI Brain |
| P02 | 156+ Mocks e Valores Falsos (`Math.random()`, TODOs) | P1 | **REMOVER/IMPLEMENTAR** | Médio | Componentes Visuais, CMS |
| P03 | Múltiplas instâncias de `createClient()` | P1 | **MERGEAR** | Médio | Auth, APIs |
| P04 | Edge Functions (Lógica Interna) | P2 | **MIGRAR** | Baixo | Client-side calls |
| P05 | Dependências Órfãs no package.json | P2 | **REMOVER** | Baixo | - |

## 2.2. Ordem de Execução (DAG)

1. **Onda 1 — Contratos & Tipagens (Schema & Segurança)**
   - Corrigir a divergência de schema entre o banco e o `database.types.ts` (especialmente `ticket_timeline` e `knowledge_documents`).
   - Sincronizar o banco via migrations e atualizar as views de Supabase local.

2. **Onda 2 — Consolidação de Clients e Server Functions**
   - Centralizar todas as instâncias isoladas de `createClient()` em 3 arquivos sagrados (browser, auth, admin).
   - Iniciar o mapeamento das Edge Functions que são chamadas via SDK no frontend e convertê-las para `createServerFn` (TanStack Router server-side execution), isolando chaves privadas.

3. **Onda 3 — O Expurgo de Mocks e UI Real**
   - Substituir as 156 ocorrências mapeadas (ex: `Math.random` para ID, revisões fakes no CMS) pelas queries reais, usando Supabase e React Suspense.

4. **Onda 4 — Tratamento de Erros de Rotas**
   - Inserir `errorComponent` e `notFoundComponent` em todas as rotas que dependem de dados remotos.

5. **Onda 5 — Validação (Build & Segurança)**
   - Rodar build final `bun run build`.
   - Rodar `tsc --noEmit` garantindo Zero Warnings.

## 2.3. Feature Flags
Todas as substituições visuais do Expurgo de Mocks (Onda 3) que não tiverem endpoint pronto serão escondidas sob Feature Flags (ex: exibição do Chatbot na landing page) ao invés de exibir "dados de brinquedo".
