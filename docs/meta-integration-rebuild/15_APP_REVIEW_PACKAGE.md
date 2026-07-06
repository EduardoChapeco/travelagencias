# 15. App Review Package (Pacote de App Review)

## 1. Permissões Necessárias
Para operar em produção (Live Mode), o aplicativo da Meta exige o processo de **App Review** (Revisão do Aplicativo) para obtenção de Advanced Access (Acesso Avançado) às seguintes permissões:
* `whatsapp_business_management`: Para ler, descobrir e inscrever WABAs e números de telefone no Embedded Signup de forma programática.
* `whatsapp_business_messaging`: Para disparar e gerenciar conversas através da Cloud API.
* `instagram_basic`: Para ler informações básicas do perfil do Instagram Professional.
* `instagram_manage_messages`: Para receber webhooks e disparar mensagens directas de suporte no Instagram.

## 2. Conteúdo do Pacote de App Review
O pacote de submissão no painel da Meta deve incluir:
* **Vídeo Demonstrativo:** Roteiro do vídeo gravado provando o login com Facebook, fluxo de conexão, recebimento de uma mensagem inbound no Inbox do Turis e resposta outbound enviada pelo agente, e posterior desconexão.
* **Usuário de Teste:** Conta de teste do Facebook e WABA Sandbox fornecidos no painel para que a equipe de engenharia da Meta possa simular o fluxo.
* **Instruções de Reprodução:** Passo a passo detalhado em inglês ou português.
