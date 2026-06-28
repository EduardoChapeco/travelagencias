# 14. Meta App Dashboard Checklist (Checklist do Painel da Meta)

## 1. Passos Operacionais no Painel Meta Developer
Este checklist serve para orientar o administrador da plataforma a configurar os ativos necessários no Meta App Dashboard antes de colocar a aplicação em ambiente de produção:

* [ ] **App Type:** Configurar o aplicativo como do tipo **Business** (Negócios), requisito obrigatório para acessar WhatsApp e Instagram Professional.
* [ ] **Business Verification:** O portfólio de negócios da agência mantenedora precisa estar verificado.
* [ ] **App Domains:** Declarar o domínio canônico de produção (ex: `app.vibetour.com.br`) na seção básica de configurações.
* [ ] **URLs Legais:** Preencher as URLs de Política de Privacidade e Termos de Serviço apontando para os caminhos correspondentes da aplicação.
* [ ] **Oauth Redirect URIs:** Adicionar o endereço de callback na configuração de Login do Facebook.
* [ ] **Config ID:** Copiar o ID de configuração do Embedded Signup gerado no painel e setar na interface administrativa do TravelOS.
* [ ] **Webhook Subscriptions:** Inscrever o webhook nas alterações do objeto `whatsapp_business_account` (campos `messages`, `message_deliveries`) e `instagram` (campo `messages`).
