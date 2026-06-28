# 14. Legal Pages and Data Deletion (Páginas Legais e Exclusão de Dados)

## 1. Rotas Públicas Criadas
As seguintes rotas foram implementadas para conformidade legal:
* **`/privacy`:** Exibe a política de privacidade buscando de `policy_documents` ou renderizando fallbacks estruturados em português.
* **`/terms`:** Exibe os termos de uso.
* **`/data-deletion`:** Oferece formulário público de exclusão gerando código de protocolo e tela para acompanhamento de status.

## 2. Callback de Exclusão da Meta (`/api/meta/data-deletion`)
* O endpoint de callback REST oficial ainda não está publicado/implantado no Supabase remoto por conta do desvio de deploy das Edge Functions locais.
* Quando implantado, ele receberá a requisição assinada da Meta, validará usando a chave secreta em Deno e criará uma solicitação em `data_subject_requests`.
