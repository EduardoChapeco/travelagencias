# Qualidade do Código e Arquitetura — Rodada 2 (TravelOS)

Este documento avalia o acoplamento do código, a qualidade das tipagens, imports circulares, a presença de lógicas duplicadas e a conformidade com boas práticas de engenharia de software.

---

## 1. Problemas de Qualidade de Código e Dívida Técnica

### 1.1 Coerção de Tipagem (`as any`) em Consultas Supabase

- **Problema**: O arquivo [reconciliation.tsx](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.financial.reconciliation.tsx) e o executor [ActionExecutor.ts](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/src/lib/ai/ActionExecutor.ts) usam coerções explícitas de tipo como `(supabase as any).from('table')` e `as any` em várias chamadas de tabelas/RPCs.
- **Impacto**: Reduz a segurança estática de tipo do TypeScript. Mudanças de colunas no Supabase podem quebrar o frontend silenciosamente sem avisos do compilador.
- **Ação Recomendada**: Atualizar o arquivo global de tipos `src/integrations/supabase/types.ts` via Supabase CLI para incluir todas as novas tabelas e funções do Ledger e AI Chat.

### 1.2 Agrupamento Sem Paginação em Telas Financeiras

- **Problema**: No cálculo de ROI comercial e gastos de grupos terrestres em [groups.tsx](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.financial.groups.tsx), o frontend busca de uma só vez todas as informações do banco sem paginação, calculando as agregações em memória no cliente.
- **Impacto**: Sobrecarga de processamento e latência de rede em agências de turismo com histórico extenso de centenas de excursões.
- **Ação Recomendada**: Criar uma RPC ou View no PostgreSQL que devolva os dados financeiros consolidados e paginados diretamente do servidor.

### 1.3 Mocks Restantes no Mecanismo de RAG

- **Problema**: A busca de conhecimento no assistente de IA em `ai-chat.functions.ts` ignora o cálculo de cosseno por embeddings (RPC `match_memories`), limitando-se a um SELECT flat ordinário com `.limit(10)` em `ai_agency_memories`.
- **Impacto**: A resposta do assistente não é personalizada semanticamente ao prompt do usuário, perdendo a relevância da base de conhecimento da agência.
- **Ação Recomendada**: Implementar a geração de embeddings do prompt de entrada e invocar a RPC `match_memories` na server function.

### 1.4 Linter / Formatação

- **Problema**: A checagem automática do ESLint aponta mais de 10.000 erros de prettier (espaçamentos, novas linhas, aspas simples vs. duplas).
- **Impacto**: Poluição em diffs e quebra de builds automáticos CI/CD configurados de forma rígida.
- **Ação Recomendada**: Executar uma varredura geral de correção automática no diretório usando `npx prettier --write .` ou comando equivalente de formatação automática.
