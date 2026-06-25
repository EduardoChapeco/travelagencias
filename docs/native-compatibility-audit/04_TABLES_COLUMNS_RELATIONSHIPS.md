# Auditoria de Tabelas, Colunas e Relacionamentos

Este documento apresenta a análise de integridade física de todas as tabelas criadas ou modificadas para o Motor VibeTour no Supabase, detalhando sua estrutura relacional, chaves, índices e gaps identificados.

---

## 1. Mapeamento de Tabelas Físicas Existentes (Criadas via Scripts Manuais)

Abaixo estão as tabelas que foram criadas manualmente no banco de dados remoto (vêm do arquivo `20260726000000_vibetour_quote_tables.sql`):

### 1.1. `quote_requests`
* **Finalidade**: Armazena as intenções de viagem e o estado da cotação.
* **Mapeamento de Chaves**:
  - `id`: UUID (Primary Key)
  - `agency_id`: UUID (Foreign Key -> `public.agencies(id) ON DELETE CASCADE`)
  - `lead_id`: UUID (Foreign Key -> `public.leads(id) ON DELETE SET NULL`)
  - `client_id`: UUID (Foreign Key -> `public.clients(id) ON DELETE SET NULL`)
* **Auditabilidade**: Possui `created_at` e `updated_at`.
* **Gaps**: Não implementa Soft Delete (deleta fisicamente).

### 1.2. `quote_travelers`
* **Finalidade**: Armazena a lista de passageiros associados à cotação.
* **Mapeamento de Chaves**:
  - `id`: UUID (Primary Key)
  - `quote_request_id`: UUID (Foreign Key -> `public.quote_requests(id) ON DELETE CASCADE`)
  - `client_traveler_id`: UUID (Foreign Key -> `public.clients(id) ON DELETE SET NULL`)

### 1.3. `quote_preferences`
* **Finalidade**: Preferências logísticas de conforto e marcas coletadas do cliente.
* **Mapeamento de Chaves**:
  - `id`: UUID (Primary Key)
  - `quote_request_id`: UUID (Foreign Key -> `public.quote_requests(id) ON DELETE CASCADE`)

### 1.4. `quote_search_plans` & `quote_scenarios`
* **Finalidade**: Organiza os cenários de busca concorrente GDS.
* **Mapeamento de Chaves**:
  - `search_plan_id`: UUID (Foreign Key -> `public.quote_search_plans(id) ON DELETE CASCADE`)

### 1.5. `normalized_offers`
* **Finalidade**: Cache local das ofertas de voos e hotéis retornadas pelos fornecedores.
* **Mapeamento de Chaves**:
  - `id`: UUID (Primary Key)
  - `quote_request_id`: UUID (Foreign Key -> `public.quote_requests(id) ON DELETE CASCADE`)
  - `search_scenario_id`: UUID (Foreign Key -> `public.quote_scenarios(id) ON DELETE CASCADE`)
* **Campos Relacionais vs JSONB**: As ofertas armazenam o payload canônico em formato JSONB (`normalized_data`).
  - *Avaliação*: Adequado, pois o contrato `NormalizedOffer` é altamente dinâmico e aninhado (voos com múltiplos trechos, hotéis com múltiplos quartos e regimes).

### 1.6. `package_candidates` & `package_candidate_components`
* **Finalidade**: Alternativas consolidadas de pacotes e seus itens (voos + hotéis).
* **Mapeamento de Chaves**:
  - `offer_id`: UUID (Foreign Key -> `public.normalized_offers(id) ON DELETE CASCADE`)

### 1.7. `package_scorecards`
* **Finalidade**: Armazena o detalhamento de pontuação, bônus e penalidades calculados de forma determinística pelo motor.
* **Mapeamento de Chaves**:
  - `package_candidate_id`: UUID (Foreign Key -> `public.package_candidates(id) ON DELETE CASCADE`, Unique Constraint)
* **Estrutura**: Penalidades e bônus são armazenados em colunas JSONB. Isso é adequado, pois servem apenas para exibição e explicação na UI, não havendo queries que filtrem por sub-propriedades desses arrays.

---

## 2. Tabelas Faltantes (Ausentes no Banco de Dados Remoto)

As tabelas de RAG definidas no arquivo `20260728000000_vibetour_memory_rag_tables.sql` **NÃO EXISTEM** no banco remoto:

1. **`knowledge_sources`** (Fontes de conhecimento: PDFs, URLs, Manuais).
2. **`knowledge_documents`** (Documentos estruturados por categoria).
3. **`knowledge_chunks`** (Trechos de texto resultantes do chunking).
4. **`knowledge_embeddings`** (Vetores `vector(1536)` para busca de similaridade).

### Consequência Técnica
Qualquer tentativa de indexar diretrizes de conexão terrestres ou políticas de agência resultará em falha silenciosa ou erro de requisição HTTP 400 (PGRST202 - Table not found) no cliente frontend.
