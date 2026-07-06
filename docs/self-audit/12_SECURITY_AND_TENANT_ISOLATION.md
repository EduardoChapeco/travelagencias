# 12. Auditoria de Segurança e Isolamento Multi-Tenant (RLS)

Este documento avalia a segurança do sistema contra acessos não autorizados (IDOR, Cross-Tenant), exposição de segredos e vazamento de privilégios em nível de banco de dados e microsserviços.

---

## 1. Isolamento Multi-Tenant no Banco de Dados (Row Level Security)

O **Turis** utiliza o mecanismo nativo de **Row Level Security (RLS)** do PostgreSQL para isolar dados de agências diferentes:
* **Políticas Core**: As tabelas críticas (`quote_requests`, `omnichannel_sessions`, `cash_sessions`) usam a função `is_agency_member(auth.uid(), agency_id)` para validar a pertença do operador à agência antes de retornar ou alterar qualquer registro.
* **RLS Omnichannel Avançado**: A migração `20260729000001` introduziu políticas de granularidade fina de acesso para agentes versus administradores na tabela `omnichannel_sessions`:
  * **Administradores da Agência**: Podem ver todos os atendimentos da agência.
  * **Agentes de Atendimento**: Só podem visualizar conversas atribuídas diretamente a eles (`assigned_to = auth.uid()`) ou que estejam na fila sem atribuição e pertençam à sua equipe específica (`team_id`).
  * **Status**: **MUITO SEGURO**. Estas restrições evitam vazamento de informações e blindam o painel de atendimento contra acessos indevidos de operadores de nível básico.

---

## 2. Vulnerabilidades e Riscos de Segurança Resolvidos

### A. Risco P0 — Bypass Silencioso de Assinatura HMAC (WhatsApp Webhook) (Resolvido)
* **Arquivo**: [supabase/functions/whatsapp-webhook/index.ts](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/functions/whatsapp-webhook/index.ts) (Linhas 110-123)
* **Correção**: A assinatura HMAC agora é estritamente obrigatória. Se nem o `secret_reference` na tabela nem a variável global estiverem configurados, o webhook rejeita imediatamente a requisição. Se a assinatura for inválida ou divergente, retorna `401 Unauthorized`. A validação é feita sem dependências de rede externas utilizando a API nativa `crypto.subtle`.
* **Estado**: **COMPROVADO E SEGURO**.

### B. Risco P1 — Exposição de Tokens e Secrets para Operadores Comuns (Resolvido)
* **Módulo/Arquivos**: [20260730000001_p1_rls_whatsapp_token_restriction.sql](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/migrations/20260730000001_p1_rls_whatsapp_token_restriction.sql)
* **Correção**: Implementamos RLS separada por colunas sensíveis na tabela `whatsapp_connections`. Apenas administradores com privilégio administrativo (`'agency_admin'`) podem visualizar tokens e referências secretas da Meta Cloud API. Para operadores e atendentes comuns, essas colunas retornam nulas.
* **Estado**: **COMPROVADO E SEGURO**.

### C. Uso Seguro da `serviceRoleKey` na Borda
* **Módulo**: `ai-quote-engine`
* **Estado**: **SEGURO**. A Edge Function valida a identidade do operador com seu JWT na RLS do banco antes de usar os privilégios totais de escrita do `supabaseAdmin`, eliminando o risco de Cross-Tenant por requisição de corpo arbitrária.
