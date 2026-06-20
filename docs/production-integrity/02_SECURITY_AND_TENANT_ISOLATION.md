# 02. Segurança e Isolamento Multi-Tenant

Este relatório documenta as falhas estruturais de isolamento de dados e segurança identificadas no modelo zero-trust do TravelOS, focando no risco de vazamento de informações e consumo de recursos entre agências concorrentes.

## 1. Vazamento Cross-Tenant nas Edge Functions

As Edge Functions de OCR (`ocr-proposal`, `ocr-passenger-document`, `ocr-boleto`, `ai-voucher-ocr`) foram alteradas localmente para contornar um problema de RLS na tabela `api_keys`. Essa alteração introduziu uma brecha crítica de isolamento:

1. **Autenticação Superficial:** As funções validam apenas se o cabeçalho `Authorization` contém um token JWT válido no Supabase (`supabaseClient.auth.getUser()`). Elas **não** validam se o usuário autenticado é membro da agência especificada no corpo da requisição (`agency_id`).
2. **Uso Indevido do Cliente Admin:** Após a validação do JWT, as funções inicializam um cliente administrativo (`supabaseAdmin`) com a secret `SUPABASE_SERVICE_ROLE_KEY`, que ignora todas as restrições de RLS.
3. **Exploração do Risco:** Um usuário malicioso de uma Agência A pode chamar as Edge Functions passando o `agency_id` de uma Agência B no JSON da requisição. O script recuperará e descriptografará a chave Gemini/Groq da Agência B e executará chamadas de IA usando a cota e os recursos financeiros da Agência B.
4. **Falta de Associação Recurso-Agência:** A função `ocr-proposal` aceita `proposal_id` e `agency_id`. Não há verificação no banco de dados para atestar que a proposta informada pertence de fato àquela agência, permitindo processamento arbitrário de dados de terceiros.

## 2. Inexistência de Isolamento no Bucket de Comprovantes

O bucket `payment-receipts` armazena comprovantes de transferências PIX enviadas por passageiros nos checkouts públicos. O isolamento de dados neste bucket é nulo:

1. **Acesso Público Total:** O bucket possui o parâmetro `public` configurado como `true`. Isso faz com que qualquer arquivo enviado receba uma URL estática e pública que ignora a política de leitura (SELECT) do RLS no nível de CDN do Supabase.
2. **Listagem Pública Permitida:** A política RLS `payment_receipts_public_read` permite leitura irrestrita baseando-se apenas na checagem de que o `bucket_id` é `'payment-receipts'`. Isso permite que qualquer agente ou usuário anônimo execute chamadas de listagem de arquivos e obtenha a relação completa de comprovantes de todos os clientes de todas as agências.

## 3. Vulnerabilidade de Modificação de Contratos Assinados

O contrato gerado para uma viagem é um documento jurídico de alta sensibilidade. No entanto, o banco de dados falha em garantir sua integridade:

1. **Políticas de Update Flácidas:** A política de alteração (`contracts strict update`) no RLS apenas atesta que o usuário logado é membro da agência ou administrador financeiro.
2. **Ausência de Trava de Status:** Não há qualquer restrição (no nível do RLS ou triggers no banco de dados) que bloqueie updates caso o contrato esteja com `status = 'signed'`. Um agente pode modificar os dados estruturados e cláusulas diretamente na tabela mesmo após a coleta da assinatura do passageiro, quebrando a validade jurídica do fluxo de KYC.

## 4. Vazamento Visual via LocalStorage Indefinido

O `AgencyProvider` lê o Brand Kit de forma síncrona do `localStorage` para evitar flicker de renderização.

1. **Falta de Invalidação de Sessão:** A chave do cache contém o `agency_id`, mas em nenhum momento do fluxo de logout o cache é limpo.
2. **Vazamento Visual:** Se um operador utilizar um terminal compartilhado (comum em recepções e agências físicas), logar na Agência A e deslogar, e em seguida outro usuário logar na Agência B, o cabeçalho e elementos da tela poderão carregar as cores e logotipo da Agência A antes da reconciliação com o servidor, vazando a identidade e dados corporativos da agência anterior.
