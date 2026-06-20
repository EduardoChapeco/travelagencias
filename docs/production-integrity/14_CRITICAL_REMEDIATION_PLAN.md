# 14. Plano de Remediação Crítica

Este plano descreve as ações imediatas e de médio prazo necessárias para restaurar a integridade, segurança, confidencialidade e operabilidade de produção do TravelOS, agrupadas por severidade.

---

## P0 — Incidentes e Exposição de Segurança

Estas falhas trazem risco iminente de segurança, vazamento de PII ou quebra severa de conformidade de isolamento de tenants (cross-tenant):

### 1. Vazamento de Credenciais no Histórico Git
* **Ação:** 
  1. Rotacionar a senha do banco de dados remota do Supabase (`SUPABASE_DB_PASSWORD`).
  2. Rotacionar a chave de serviço administrativa (`SUPABASE_SERVICE_ROLE_KEY`) do projeto Supabase.
  3. Rotacionar o token de acesso da CLI (`SUPABASE_ACCESS_TOKEN`).
  4. Apagar os scripts que contêm segredos em texto claro no diretório `scratch/` e executar limpeza do histórico Git (usando `git-filter-repo` ou `BFG Repo-Cleaner`) para expurgar permanentemente os hashes dos commits anteriores do branch principal.

### 2. Comprovantes Públicos no Storage e Políticas Abertas
* **Ação:**
  1. Alterar o bucket `payment-receipts` de `public: true` para `public: false` (privado).
  2. Remover as políticas `payment_receipts_public_read` e `payment_receipts_public_insert` que permitem acesso público irrestrito.
  3. Implementar fluxo de upload restrito por URLs assinadas (presigned URLs) geradas sob demanda no checkout.
  4. Restringir a leitura apenas a administradores da agência correspondente validando a pasta raiz do arquivo com o ID da agência do usuário.

### 3. Escalação de Privilégios Cross-Tenant nas Edge Functions
* **Ação:**
  1. Modificar as Edge Functions de OCR para incluir uma validação estrita de associação de agência: antes de chamar `pick_active_api_key` ou descriptografar chaves, consultar `public.user_roles` no banco de dados para confirmar se o `user.id` do JWT pertence à `agency_id` enviada no payload.
  2. Bloquear requisições para agências em que o usuário não possua vínculo operacional ativo.
  3. Restringir o CORS de `*` para a URL oficial de domínio da agência (`travelagencias.pages.dev`).

### 4. Mutabilidade de Contratos Assinados
* **Ação:**
  1. Adicionar uma restrição (CHECK CONSTRAINT) ou Trigger em nível de banco de dados na tabela `contracts` impedindo qualquer UPDATE caso a linha possua `status = 'signed'`.
  2. Criar uma política RLS específica no UPDATE que proíba a modificação dos campos `clause_snapshot` e `total_value` após o envio para assinatura.

---

## P1 — Operações Quebradas em Produção

Falhas que impedem a operação de módulos importantes ou corrompem dados durante a utilização:

### 1. Ingestion OCR sem Transações e Sem Proteção de Cliques
* **Ação:**
  1. Desabilitar o botão "Confirmar e persistir" na UI durante o andamento da inserção para evitar duplo clique e consequente duplicação de dados.
  2. Encapsular a ingestão de contatos e produtos em uma única Procedure PL/pgSQL com transação (`BEGIN ... EXCEPTION ... ROLLBACK`), garantindo integridade atômica.

### 2. Sincronização Omnichannel Fake (Mock)
* **Ação:**
  1. Substituir a lógica comentada do Gmail API no `gmail-sync` por uma consulta real baseada em tokens válidos de OAuth.
  2. Configurar o webhook do Pub/Sub do Google Cloud ou criar um job com `pg_cron` para invocar a sincronização de mensagens a cada 5 minutos, sincronizando as respostas recebidas de clientes e fornecedores.

### 3. Lost Update no Rooming List Concorrente
* **Ação:**
  1. Adicionar uma coluna de controle de versão (`version INT DEFAULT 1` ou `updated_at TIMESTAMP`) na tabela `boarding_rooming_list`.
  2. Modificar a query de update no serviço para validar se a versão ainda é a mesma lida inicialmente. Se a linha no banco foi modificada no meio do processo por outro operador, alertar o usuário para recarregar a tela, evitando sobrescrever dados alheios.

---

## P2 — Estabilidade e Performance

### 1. Heap Out of Memory no Build
* **Ação:**
  1. Substituir o import estático do `html2canvas` por `import()` assíncrono no `VoucherStudio.tsx` e `agency.$slug.trips.$id.vouchers.tsx`.
  2. Otimizar as dependências e ajustar a esteira do Vite para isolar chunks de exportadores, diminuindo o heap no build padrão.

### 2. Flicker Visual e Vazamento de Estilos (Brand Kit)
* **Ação:**
  1. Implementar limpeza completa das chaves de Brand Kit do `localStorage` no gatilho de logout da agência.
  2. Limpar explicitamente as variáveis CSS aplicadas no `documentElement` ao trocar de agência, evitando flash de design de outras tenants.

### 3. Falha de Imagens no VoucherStudio
* **Ação:**
  1. Adicionar um sequenciador que aguarda o carregamento de todas as imagens presentes no voucher antes de invocar o `html2canvas`.

---

## P3 — Padronização Visual e Código Limpo

### 1. Divergência de Design System
* **Ação:**
  1. Substituir os componentes customizados (botões e formulários) criados em `src/components/ui/form.tsx` pelos componentes canônicos do Shadcn baseados no Radix UI.
  2. Eliminar o div-based Sheet do formulário, unificando no componente de Sheet acessível.
  3. Remover os overrides agressivos com `!important` do `styles.css`.
