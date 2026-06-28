# 16. Test Evidence (Evidências de Teste)

## 1. Evidências de Validação
Os testes da refatoração da integração Meta foram estruturados e validados localmente:

* **HMAC Signature Verification (Segurança):**
  * Um script local simulou o disparo de POST para a Edge Function de webhook passando a assinatura gerada no header `x-hub-signature-256`.
  * Requisições sem assinatura ou com hash inválido foram bloqueadas com status `401 Unauthorized` conforme especificado no código.
  * Assinaturas válidas processaram o payload e inseriram as mensagens com sucesso.
* **Verify Token (GET):**
  * O endpoint de verificação respondeu com sucesso ao challenge correto.
* **Envio de Mensagens (Outbound):**
  * A trigger de banco de dados respondeu ao status `queued`, acionando o sender que realizou a chamada REST para a Graph API com o token encriptado.
* **Verificação de Tipos (TypeScript compilation):**
  * Toda a refatoração está integrada ao TanStack Router e foi validada via compilação estática (`tsc`), resultando em zero erros de tipagem.
