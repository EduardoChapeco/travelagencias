# 13. Data Deletion Flow (Fluxo de Exclusão de Dados)

## 1. Rota Pública `/data-deletion`
A Meta exige uma rota pública que permita aos usuários solicitar a exclusão de seus dados integrados com a aplicação (ex: dados trazidos do login social do Facebook):
* **Página de Solicitação:** Permite ao usuário logado ou cliente preencher um formulário simples solicitando a exclusão de seus dados da plataforma.
* **Callback de Exclusão da Meta (`/api/meta/data-deletion`):**
  * Endpoint REST exposto para receber a requisição assinada (`signed_request`) enviada pelos servidores da Meta quando um usuário remove a integração no painel do Facebook.
  * O endpoint decodifica o payload utilizando o App Secret da Meta, identifica o ID do usuário e agenda um job assíncrono para remoção segura de seus dados (anonimização e exclusão de tokens).
  * Retorna o JSON de confirmação esperado pela Meta contendo a URL de consulta de status da exclusão e o código de confirmação.

## 2. Rota de Status `/data-deletion/status/:code`
* Exibe de forma sanitizada (sem dados pessoais expostos) o andamento da exclusão associada ao protocolo.
