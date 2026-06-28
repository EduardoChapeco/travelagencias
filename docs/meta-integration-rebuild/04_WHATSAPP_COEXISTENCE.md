# 04. WhatsApp Coexistence (Coexistência com WhatsApp Business App)

## 1. Regras de Coexistência da Meta
Um número de telefone usado na Cloud API oficial normalmente não pode ser usado simultaneamente no aplicativo WhatsApp Business padrão do celular. No entanto, a Meta fornece um fluxo de onboarding oficial específico para coexistência (coexistence setup) que permite migrar ou configurar números mantendo acessibilidade híbrida ou controlada.

## 2. Abordagem no TravelOS
* **Indicação Clara de Modo:** Ao criar ou registrar a conexão de WhatsApp, adicionamos a coluna `coexistence_enabled` boolean na tabela `whatsapp_connections`.
* **Tratamento de Echoes:** Quando a coexistência está ativa, o operador pode enviar mensagens pelo próprio celular. O webhook do WhatsApp envia esse evento ao TravelOS como um "echo" (mensagem enviada pelo próprio número, mas fora da plataforma).
  * O webhook do TravelOS deve processar e salvar esses echoes com `direction = 'outbound'` e `source = 'whatsapp_business_app'` para que a conversa seja mantida 100% atualizada na tela do Inbox do agente.
* **Prevenção de Respostas Automáticas:** Mensagens vindas do celular do cliente como echoes não devem ativar o auto-responder de Inteligência Artificial, evitando loops infinitos e respostas redundantes.
