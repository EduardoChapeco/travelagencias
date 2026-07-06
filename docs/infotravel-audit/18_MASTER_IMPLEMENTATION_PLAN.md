# 18. Plano Mestre de Implementação da Integração Infotravel

Este documento apresenta o planejamento estratégico e técnico detalhado de implementação para a integração completa do GDS **Infotravel** (Infotera) no ecossistema do **Turis**, estruturado em fases lógicas com foco em segurança, integridade e conformidade contábil.

---

## 1. Fases Técnicas de Desenvolvimento (P0 a P11)

### Fase P0: Segurança, Conexão e Hardening de Credenciais

- **Endpoints**: `POST /auth/login`, `POST /auth/refresh`.
- **Banco de Dados**: Criação de índices na tabela `api_keys`.
- **Ações**:
  - Implementação de criptografia simétrica (AES-256) na coluna `key_value` de `api_keys`.
  - Blindagem física na Edge Function `infotravel-connector` para validar o vínculo do `user_id` com a agência solicitante, eliminando riscos de IDOR.
- **Rollback**: Remoção de índices e restauração das variáveis de criptografia.
- **Critério de Pronto**: Sucesso em testes locais de conexão com chaves fictícias e bloqueio físico de requisições maliciosas entre tenants com 100% de eficácia.

### Fase P1: Camada de Adapter Canônico e Tipagens OpenAPI

- **Endpoints**: N/A.
- **Ações**:
  - Geração de tipagens TypeScript estáticas baseadas no `api-doc.json` local.
  - Criação do resolvedor de schemas e mapeadores (Mappers) para converter payloads GDS em entidades canônicas do Turis (NormalizedOffer).
- **Critério de Pronto**: Zero tipos `any` nas funções de serviço e typecheck compilado com sucesso.

### Fase P2: Catálogo de Serviços e Disponibilidade Real

- **Endpoints**: `POST /search/hotel`, `POST /search/flight`.
- **Ações**:
  - Conexão das funções de busca real do barramento Infotravel, substituindo o simulador mock em produção.
  - Implementação de limites de concorrência e throttling na Edge Function.
- **Critério de Pronto**: Respostas estruturadas retornadas em ambiente sandbox sem estouro de cota da API.

### Fase P3: Módulo de Cotação Rápida e Carrinho

- **Componentes**: `QuickQuotePanel`, `CompareOffersGrid`.
- **Ações**:
  - Interface para filtros de busca rápida e tabela de comparação lado a lado de até 4 ofertas.
  - Botões de ação para salvar cotação, associar a leads e gerar cards comerciais para WhatsApp.
- **Critério de Pronto**: Exibição correta de cards de cotação na UI com dados reais persistidos como snapshot.

### Fase P4: Transações de Reserva e Check-Rate

- **Endpoints**: `POST /booking/checkRate`, `POST /booking`.
- **Ações**:
  - Integração da validação de preços em tempo real no momento do clique de compra.
  - Fluxo de reserva e confirmação com tratamento automático de cancelamento em caso de erro local (compensação).
- **Critério de Pronto**: Reserva executada em ambiente sandbox com rollback de segurança validado em caso de timeout.

### Fase P5: Pipeline de Carga Histórica (Backfill)

- **Endpoints**: `GET /backoffice/booking`.
- **Tabelas**: `sync_checkpoints`, `external_entity_links`.
- **Ações**:
  - Sincronizador assíncrono em lote com controle de cursor, retentativas e rate limit.
  - Fila de revisão de conflitos de clientes no CRM.
- **Critério de Pronto**: Importação de 100 registros em lote sem duplicação de links e com relatório de dry run validado.

### Fase P6: Sincronização Periódica e Fila de Sync

- **Tabelas**: `sync_outbox`, `sync_attempts`.
- **Ações**:
  - Implementação da fila de mensageria local e polling incremental para atualizar status de reservas ativas no GDS.
- **Critério de Pronto**: Mudança de status no GDS refletida na base local do Turis em menos de 4 horas por polling.

### Fase P7: Integração de Documentos e Faturamento

- **Endpoints**: `GET /backoffice/invoice/{id}`, `GET /payment/pix`.
- **Ações**:
  - Download e salvamento de PDFs de faturas/contratos em bucket privado protegidos por RLS.
  - Importação de chaves Pix para pagamento e faturamento no Razão Contábil.
- **Critério de Pronto**: Documentos privados restritos aos membros da agência proprietária da reserva via RLS.

### Fase P8: Motor de Promoções e Oportunidades

- **Tabelas**: `promotional_deals`.
- **Ações**:
  - Cron job de varredura periódica para busca de ofertas populares com cálculo determinístico de Score de Oportunidade.
- **Critério de Pronto**: Publicação de promoções no painel B2C após aprovação do gestor.

### Fase P9: IA Assistiva e Composição de Pacotes

- **Ações**:
  - Integração opcional do chat com o validador lógico determinístico de pacotes, impedindo alucinações de preços.
- **Critério de Pronto**: A IA gera o roteiro comercial, mas o preço e disponibilidade exibidos provêm estritamente da API real.

### Fase P10: Geração de Artefatos de Venda (Mini Páginas e Stories)

- **Ações**:
  - Exportador de cotações para PDF A4, imagens PNG para WhatsApp e Stories de alta fidelidade visual.
- **Critério de Pronto**: Exportação gerada no servidor a partir do snapshot com layout editorial responsivo.

### Fase P11: Homologação e Hardening de Produção

- **Ações**:
  - Testes de carga, validação de limites de cota, testes E2E com Playwright cobrindo isolamento de tenants e imutabilidade de dados de importação.
- **Critério de Pronto**: 100% de aprovação física nas rotas e builds limpos.
