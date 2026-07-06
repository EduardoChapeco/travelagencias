# 03. WhatsApp Embedded Signup (Fluxo de Onboarding WhatsApp)

## 1. Contexto do Embedded Signup
O WhatsApp Embedded Signup é o fluxo recomendado pela Meta para que clientes finais (neste caso, as agências de turismo operadoras do Turis) conectem suas próprias contas do WhatsApp Business diretamente à plataforma de forma self-service.

## 2. Implementação Necessária no Frontend
Falta carregar o SDK de JavaScript da Meta (`fbsdk.js`) de forma dinâmica ou estática e inicializar o fluxo usando o modal de login do Facebook com as permissões corretas:
* **Scopes necessários:** `whatsapp_business_management`, `whatsapp_business_messaging`.
* **Fluxo do Popup:**
  ```javascript
  FB.login(function(response) {
    if (response.authResponse) {
      const code = response.authResponse.code;
      // Enviar code para a Edge Function de conclusão
    }
  }, {
    scope: 'whatsapp_business_management,whatsapp_business_messaging',
    extras: {
      feature: 'whatsapp_embedded_signup',
      setup: {
        // IDs configurados no painel Meta App Dashboard
      }
    }
  });
  ```

## 3. Estados de Conexão no Banco de Dados
A conexão não deve ser ativada imediatamente após o fechamento do popup. Deve ser gravada com status intermediários:
1. `draft`: Usuário abriu o fluxo.
2. `authorizing`: Aguardando o code exchange no backend.
3. `pending_validation`: Validando WABA e Phone Number.
4. `pending_webhook`: Aguardando assinatura de webhook.
5. `active`: Canal totalmente funcional e validado.
