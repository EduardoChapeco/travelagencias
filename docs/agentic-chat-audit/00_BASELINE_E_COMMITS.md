# Baseline e Commits Recentes

Este documento mapeia o estado atual do repositório após a implementação do plano corretivo do Chat Agêntico.

---

## 1. Status do Repositório Local (`git status`)

O repositório está no seguinte estado após a estabilização e correções de tipos:

* **Modificações Locais (Não commitadas)**:
  * [AIChatPanel.tsx](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/components/shell/AIChatPanel.tsx): Lógica do chat responsiva com parser de blocos e persistência de estados.
  * [SlimSidebar.tsx](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/components/shell/SlimSidebar.tsx): Layout split dual-column com colapso de menu superior e chat, persistidos em `localStorage`.
  * [AppSidebar.tsx](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/components/shell/AppSidebar.tsx): Link para "Auditoria de IA" sob a seção de Configurações, restrito por papel administrativo (`isAdmin`).
  * [ai-chat.functions.ts](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/lib/api/ai-chat.functions.ts): API do servidor com tool calling, injeção RAG de memórias e fallback local simulado.
  * [styles.css](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/styles.css): Variáveis CSS de contraste de itens ativos (`--color-accent-foreground`).
  * [routeTree.gen.ts](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/routeTree.gen.ts): Árvore de rotas TanStack regenerada.

* **Arquivos Não Rastreados (Untracked)**:
  * [ChatBlockRenderer.tsx](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/components/shell/ChatBlockRenderer.tsx): Parser e renderizador de blocos de decisão do chat com persistência em `localStorage`.
  * [ActionRegistry.ts](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/lib/ai/ActionRegistry.ts): Registro central das 23 ações operacionais e esquemas Zod.
  * [ActionExecutor.ts](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/lib/ai/ActionExecutor.ts): Executor de banco, verificação de RLS/RBAC e logs de auditoria.
  * [AgentRouter.ts](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/lib/ai/AgentRouter.ts): Roteador de personas especialistas.
  * [ai-audit.tsx](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.settings.ai-audit.tsx): Painel administrativo do gestor de auditoria de IA.
  * [20260715000000_ai_chat_improvements.sql](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/migrations/20260715000000_ai_chat_improvements.sql): Migração SQL com schemas de feedback, memórias, pgvector, match_memories e RLS restritivos.

---

## 2. Histórico de Commits Recentes

Os commits recentes mapeiam correções na autenticação e nas funções server-side:
* `8e68dc9` (HEAD -> main) - *fix(edge-functions): strip ===== prefix in decryptData to resolve base64 decoding error*
* `0c1e4ad` - *feat(integrations): support multiple API credentials per provider with unique fingerprints and custom labels*
* `8e7bdf6` - *fix(ocr,ui): resolve Edge Functions 401 auth by explicitly passing JWT to getUser, convert popups/dialogs to SheetPages, split contextual sidebar with vertical drag resizer*

---

## 3. Tabela de Promessas vs. Implementação Encontrada

| Promessa | Arquivo | Implementação Encontrada | Teste | Estado Real |
| :--- | :--- | :--- | :--- | :--- |
| **Contraste da Sidebar** | [styles.css](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/styles.css) | Mapeamento de variáveis `--color-accent-foreground` em tema claro e escuro. | Compilado e gerado em build. | **REAL PONTA A PONTA** |
| **Layout Recolhível / Split** | [SlimSidebar.tsx](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/components/shell/SlimSidebar.tsx) | Estados de navegação e chat recolhíveis com divisor vertical drag, persistidos no `localStorage`. | Compilado e gerado em build. | **REAL PONTA A PONTA** |
| **Feedback de IA** | [20260715000000_ai_chat_improvements.sql](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/migrations/20260715000000_ai_chat_improvements.sql) | Tabela `ai_chat_feedback` criada com RLS restritivo. | Migração estática. | **SÓ BANCO** |
| **Memória e RAG Vetorial** | [match_memories RPC](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/migrations/20260715000000_ai_chat_improvements.sql) | Extensão vector ativada e RPC match_memories implementada para busca de cossenos. | Migração estática e injeção de RAG no handler. | **REAL, MAS NÃO TESTADA** |
| **IA Revisora** | [ai-chat.functions.ts](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/lib/api/ai-chat.functions.ts) | Segunda chamada ao LLM com prompt de auditoria e segurança. | Verificado em tempo de compilação. | **REAL, MAS NÃO TESTADA** |
| **Action Registry (Tools)** | [ActionRegistry.ts](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/lib/ai/ActionRegistry.ts) | 23 ferramentas de negócio registradas com esquemas Zod e mapeadas nas chamadas de rede da IA. | Testado localmente via simulator. | **REAL PONTA A PONTA** |
| **Painel de Gestor** | [ai-audit.tsx](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.settings.ai-audit.tsx) | Painel de monitoramento de tokens, falhas, filtros de operador e JSON viewer transacional. | Compilado e gerado em build. | **REAL PONTA A PONTA** |
