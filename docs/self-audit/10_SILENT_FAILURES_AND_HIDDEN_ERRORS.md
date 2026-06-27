# 10. Falhas Silenciosas e Supressões de Erros

Este documento audita os blocos de captura de exceções (`try/catch`), supressões de erros de banco e falhas de rede silenciosas que podem comprometer a observabilidade em produção.

---

## 1. Inventário de Falhas Silenciosas Identificadas

### A. Falha Silenciosa na Criação de Sessão de Chat (Meta Webhook)
* **Localização**: [supabase/functions/whatsapp-webhook/index.ts](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/functions/whatsapp-webhook/index.ts)
* **Comportamento anterior**: Ao receber uma mensagem e não encontrar a sessão correspondente no banco, a Edge Function ignorava o objeto `error` da inserção, podendo causar exceção nula subsequente sem registrar a causa real do banco de dados nos logs.
* **Correção Aplicada (Resolvido)**: Refatoramos a criação de leads e sessões para verificar explicitamente o objeto `error` e propagá-lo via exceção legível que é capturada pelo logger estruturado.
* **Impacto**:Logs do Deno agora registram falhas exatas de inserção ou integridade com o banco de dados.

---

### B. Supressão de Erro Secundário no Envio de WhatsApp (`whatsapp-sender`) (Resolvido)
* **Localização**: `supabase/functions/whatsapp-sender/index.ts` (linhas 177-179)
* **Comportamento anterior**: Se a tentativa de atualizar o status da mensagem para `failed` no banco falhasse, o erro era capturado e engolido por um `catch (_) {}` vazio.
* **Correção Aplicada (Resolvido)**: Adicionamos um tratamento explícito para o objeto `updateErr` retornado da query. Agora, falhas na escrita secundária do status no banco de dados são reportadas por `console.error` estruturado, preservando a observabilidade da telemetria da aplicação sem arriscar loops.
* **Impacto**: Logs registram falhas na persistência de status de erro.

---

### C. Tratamento de Erros da IA no Frontend (Corrigido)
* **Localização**: [src/routes/agency.$slug.quotes.$id.tsx](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.quotes.$id.tsx) (Linha 369)
* **Antes**: O catch de erro da IA engolia o objeto de exceção `e`, exibindo apenas um Toast genérico para o usuário.
* **Correção Aplicada**: Adicionado o log explícito `console.error("Erro ao gerar explicação por IA:", e)` no bloco correspondente, garantindo a observabilidade do desenvolvedor comercial via Console de desenvolvedor.
