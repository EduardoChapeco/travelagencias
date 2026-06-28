# 16. Silent Failures (Falhas Silenciosas Detectadas)

## 1. Falhas Silenciosas e Loops
* **Erros de Webhook da Meta:** Se a assinatura HMAC falhar ou o token de acesso da Meta expirar, a Edge Function registra o erro no log interno, mas o frontend não recebe nenhuma notificação contextual. O operador simplesmente percebe que as mensagens pararam de chegar ou o status parou de atualizar.
* **Auto-Responder de IA em Webhook:** Se o auto-responder estiver ativo em uma conversa e a Edge Function de IA falhar ou sofrer rate limit, o webhook atual não possui mecanismo de retry controlado ou desativação de flag automática. A conversa simplesmente não recebe resposta e fica travada.
* **Cargos e RLS em Mudança de Status:** Alterações de status executadas sem validações robustas no banco podem falhar sob políticas RLS do Supabase sem retornar o real motivo da rejeição de forma explícita na UI (algumas queries tratam o erro RLS simplesmente como retorno de dados vazio).
