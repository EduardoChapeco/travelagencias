# 02. Inventário da Integração Atual no Turis

Este documento cataloga todos os arquivos, rotas, tabelas, Edge Functions e regras de segurança que fazem referência direta ou indireta à API **Infotravel/Infotera** no repositório atual do **Turis**.

---

## 1. Inventário de Recursos Físicos

| Recurso                    | Arquivo                                            | Responsabilidade                                                                                  | Endpoint Usado (Mapeado)                                                                                    | Persistência                                      | Consumidores                           | Estado                                                                                |
| :------------------------- | :------------------------------------------------- | :------------------------------------------------------------------------------------------------ | :---------------------------------------------------------------------------------------------------------- | :------------------------------------------------ | :------------------------------------- | :------------------------------------------------------------------------------------ |
| **Frontend Service**       | `src/services/infotravel.ts`                       | Disparar chamadas para a Edge Function do Supabase.                                               | `search_hotels`, `search_flights`, `import_booking`, `test_connection`                                      | Nenhuma (Retorna JSON direto ao chamador)         | Wizards de Viagens e Propostas         | **ADAPTER EXISTE, SEM CONSUMIDOR REAL** (Interface apenas simulada)                   |
| **Supabase Edge Function** | `supabase/functions/infotravel-connector/index.ts` | Resolvedor de credenciais da agência, autenticação na API do GDS e encaminhamento de requisições. | `/auth/login` (Errado), `/search/hotel` (Errado), `/search/flight` (Errado), `/booking/{id}` (Incompatível) | Tabela `api_keys` (Apenas leitura de credenciais) | `src/services/infotravel.ts`           | **MOCK** / **QUEBRADO** (Funciona apenas sob o desvio de simulação/sandbox)           |
| **Configuração de UI**     | `src/routes/agency.$slug.integrations.tsx`         | Painel visual para operador salvar credenciais de integração.                                     | N/A                                                                                                         | Salva registros em `api_keys`                     | Painel do Administrador                | **UI EXISTE, SEM API REAL** (Salva dados, mas a API real não consome de forma válida) |
| **Tabela de Banco**        | `public.api_keys` (Gerenciada pelo Supabase)       | Armazenar credenciais de APIs externas vinculadas à agência.                                      | N/A                                                                                                         | Banco de Dados local/remoto                       | `infotravel-connector` (Edge Function) | **IMPLEMENTADO E TESTADO** (Acesso seguro com RLS ativo)                              |

---

## 2. Diagnóstico de Dívida Técnica Mapeada

- **Chamadas e Caminhos Errôneos (Bugs Estruturais)**:
  Como detalhado na baseline, os endpoints reais programados na Edge Function `infotravel-connector` divergem da especificação OpenAPI oficial da plataforma. O conector tenta realizar requisições para URLs inexistentes no servidor real (`/search/hotel`, `/search/flight`, `/auth/login`), resultando em falhas definitivas em caso de desativação do simulador de sandbox.
- **Tipos Tratados como `any`**:
  No arquivo `src/services/infotravel.ts`, a função de importação de reservas `infotravelImportBooking` retorna `Promise<any>`. Isso significa que os componentes que consomem a reserva importada não possuem garantias de tipo em tempo de compilação, o que abre margem para falhas silenciosas de propriedades nulas/indefinidas em produção.
- **Mocks e Respostas Fixas**:
  A Edge Function implementa a função `simulateInfotravelResponse` (Linhas 185-331), que possui registros estáticos em texto puro de hotéis (`Grand Palace Resort`, `Editorial Boutique Hotel`), voos (`Latam Airlines LA-8190`, `American Airlines AA-906`) e de uma reserva fictícia (`PNR-INF123` em nome de `Eduardo Silveira`). Embora útil para demonstrações estéticas, este mock oculta a ausência de um mapeamento real de classes no backend.
- **Falta de Persistência Lógica**:
  Quando a simulação de importação da reserva é executada, os dados são retornados diretamente para a UI, sem salvar os vínculos de entidades, identificadores de localizadores ou a criação das entidades correspondentes (`clients`, `trips`, `trip_passengers`) no PostgreSQL, tratando a importação como um recurso meramente visual.
