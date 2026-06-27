# 15. Plano Corretivo Incremental (Refactoring Roadmap)

Este documento estabelece o roteiro de refatorações corretivas estruturado por nível de severidade (P0 a P3), definindo as causas raízes, arquivos afetados, planos de rollback e critérios de pronto para cada item.

---

## 1. Severidade P0 — Riscos de Segurança e Integridade

### CORREÇÃO P0.1: Fechamento de Brecha de Assinatura no Webhook do WhatsApp
* **Causa Raiz**: A Edge Function de webhook verifica a assinatura utilizando `if (appSecret && signature)`. Se as credenciais não estiverem cadastradas ou a variável de ambiente estiver ausente, ela processa payloads não assinados silenciosamente.
* **Módulo/Arquivos**: [supabase/functions/whatsapp-webhook/index.ts](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/functions/whatsapp-webhook/index.ts) (Linhas 65-72)
* **Correção**:
  * Tornar obrigatório o preenchimento de `appSecret` e a presença do cabeçalho `signature`.
  * Se estiverem ausentes, lançar erro imediato `401 Unauthorized` e abortar a execução.
* **Critério de Pronto**: Webhook rejeita requisições sem assinatura ou sem segredo configurado com status `401`.

---

## 2. Severidade P1 — Vazamentos de Segredos e Falhas Silenciosas

### CORREÇÃO P1.1: Restrição de Leitura de Tokens Meta (Exposição de Segredos)
* **Causa Raiz**: A RLS da tabela `whatsapp_connections` concede privilégio de `SELECT` para qualquer membro da agência, expondo tokens da Meta Cloud API a atendentes comuns.
* **Módulo/Arquivos**: [supabase/migrations/20260729000001_inbox_and_whatsapp_architecture.sql](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/migrations/20260729000001_inbox_and_whatsapp_architecture.sql) (Linhas 41-43)
* **Correção**: 
  * Dividir a política de RLS de leitura de forma que apenas administradores (`has_role(..., 'agency_admin')`) possam visualizar as colunas confidenciais `secret_reference`, `token_reference` e `verify_token_reference`, ou omiti-las nas consultas comuns do frontend.
* **Critério de Pronto**: Query SELECT executada por um agente comum em `whatsapp_connections` retorna os campos de segredo vazios ou bloqueados.

### CORREÇÃO P1.2: Tratamento de Erro na Criação de Sessões (Hiding Errors)
* **Causa Raiz**: O webhook do WhatsApp ignora o objeto `error` ao tentar inserir novas sessões, causando quebras fatais de runtime posteriores.
* **Módulo/Arquivos**: [supabase/functions/whatsapp-webhook/index.ts](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/functions/whatsapp-webhook/index.ts) (Linhas 158-173)
* **Correção**: Verificar explicitamente o `error` retornado pelo Supabase Client após o insert da sessão e lançar uma exceção descritiva.
* **Critério de Pronto**: Logs do Deno registram falhas exatas do insert se houver queda ou violação de integridade.

---

## 3. Severidade P2 — Otimização e Escalabilidade

### CORREÇÃO P2.1: Eliminação de Waterfall na Página de Detalhes
* **Causa Raiz**: A query de cenários é executada de forma síncrona e sequencial após a conclusão de outras quatro consultas paralelas.
* **Módulo/Arquivos**: [src/services/quotes.ts](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/src/services/quotes.ts) (Linha 116)
* **Correção**: Ajustar a query de planos de busca para trazer os cenários aninhados em um único round-trip de rede.
* **Critério de Pronto**: Tempo de carregamento da rota `quotes.$id` reduzido pela eliminação da latência de conexão secundária.

### CORREÇÃO P2.2: Criação de Índices em Chaves Estrangeiras Críticas
* **Causa Raiz**: Ausência de índices explícitos sobre colunas de join frequentes (`session_id`, `agency_id`) nas tabelas omnichannel.
* **Módulo/Arquivos**: Criação de nova migração física no banco.
* **Correção**: Adicionar índices B-Tree (`CREATE INDEX`) sobre todas as chaves estrangeiras que sofrem joins ou filtros nas queries frequentes.
* **Critério de Pronto**: Consultas complexas em omnichannel utilizam `Index Scan` ao invés de `Seq Scan` em planos de execução `EXPLAIN`.

---

## 4. Status de Implementação das Refatorações (100% Concluído)

Todas as correções descritas neste plano corretivo foram implementadas com sucesso e validadas:
* **P0.1 Webhook HMAC Bypass**: Corrigido na Edge Function com a Web Crypto API nativa do Deno. Deployed.
* **P1.1 Restrição de Tokens Meta**: Nova migração aplicada restringindo visualização de chaves confidenciais apenas para `agency_admin`.
* **P1.2 WhatsApp webhook session error handling**: Verificação explícita do objeto `error` adicionada ao criar sessões. Deployed.
* **P2.1 Waterfall de Detalhes**: Resolvido em `quotes.ts` usando join nested em `quote_search_plans`.
* **P2.2 Índices FK**: Nova migração física com os índices necessários (`20260730000002_p2_critical_fk_indexes.sql`) aplicada no banco de dados remoto.
* **Typecheck e Build**: Validados localmente com sucesso absoluto (zero erros).
