# Matriz da Verdade: Chat Agêntico

Este documento mapeia de forma detalhada o status de cada entrega do Chat Agêntico nas camadas de UI, Banco de Dados, Backend, Segurança e Testes.

---

## 1. Tabela de Conformidade Técnica

| Entrega Prometida | UI | Banco | Backend | Segurança | Persistência | Testada | Estado Real | Evidência |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- | :--- |
| **Contraste da Sidebar** | Sim | Não | Não | Sim | Não | Sim | **REAL PONTA A PONTA** | [SlimSidebar.tsx](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/components/shell/SlimSidebar.tsx#L385-L393) / `--accent` CSS |
| **Layout Split/Colapso** | Sim | Não | Não | Não | Sim | Sim | **REAL PONTA A PONTA** | Estados `isNavCollapsed` e `isChatCollapsed` no `localStorage` |
| **RAG Vetorial** | Não | Sim | Sim | Sim | Sim | Não | **REAL, MAS NÃO TESTADA** | RPC `match_memories` na migração e consulta de memórias no chat |
| **Auditoria do Gestor** | Sim | Sim | Sim | Sim | Sim | Sim | **REAL PONTA A PONTA** | Rota [ai-audit.tsx](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.settings.ai-audit.tsx) integrada ao `ActionRegistry` |
| **IA Revisora** | Não | Não | Sim | Sim | Não | Não | **REAL, MAS NÃO TESTADA** | Chamada sequencial com `REVIEWER_PROMPT` em `ai-chat.functions.ts` |
| **Defesa Prompt Injection**| Não | Não | Sim | Sim | Não | Sim | **REAL PONTA A PONTA** | Regex de tags, censura de tokens e tags de isolamento no scrap |
| **Tool Calling** | Não | Não | Sim | Não | Sim | Sim | **REAL PONTA A PONTA** | Mapeamento dinâmico via `tools` e parser no `ai-chat.functions.ts` |
| **Cards Interativos** | Sim | Não | Não | Não | Não | Sim | **REAL PONTA A PONTA** | [ChatBlockRenderer.tsx](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/components/shell/ChatBlockRenderer.tsx) contendo cards React |
| **Confirmação de Ação** | Sim | Não | Sim | Sim | Sim | Sim | **REAL PONTA A PONTA** | `ConfirmationCard` com persistência de status no `localStorage` |
| **Centenas de Ações** | Não | Não | Sim | Sim | Não | Sim | **REAL PONTA A PONTA** | Todas as 23 ações conectadas a mutações e consultas reais no banco |
| **Multiagentes/Personas** | Não | Não | Sim | Não | Não | Sim | **REAL PONTA A PONTA** | Intent router em [AgentRouter.ts](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/lib/ai/AgentRouter.ts) com prompts especialistas |
| **Auto-melhoria (Feedback)** | Sim | Sim | Sim | Sim | Sim | Sim | **REAL PONTA A PONTA** | Botões ThumbsUp/Down sob mensagens da IA gravando no `ai_chat_feedback` |
