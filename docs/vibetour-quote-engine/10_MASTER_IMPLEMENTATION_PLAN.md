# 10. Plano Mestre de Implementação (Master Implementation Plan)

Este documento descreve o roteiro de fases ordenadas por dependência técnica para a implementação completa e segura do motor inteligente de cotação VibeTour no TravelOS.

---

## 1. Roteiro de Fases e Dependências

Para garantir a estabilidade do sistema e evitar regressões, a execução seguirá o seguinte cronograma ordenado por dependência técnica:

*   **Fase 0 — Auditoria Inicial e Alinhamento**: Produção dos 11 documentos de diagnóstico (Concluído).
*   **Fase 1 — Camada Core (Modelos de Dados)**:
    *   Criação das migrações do banco com as tabelas de cotação (`quote_requests`, `quote_search_plans`, `quote_scenarios`) e regras RLS.
    *   Mapeamento das tipagens TypeScript e esquemas Zod correspondentes.
*   **Fase 2 — Camada de Provedores (Adapters)**:
    *   Refatoração do serviço de busca do Infotravel para retornar o DTO normalizado `NormalizedOffer` ao invés dos schemas proprietários do GDS.
    *   Implantação da tabela de cache de busca em lote (`quote_raw_results`).
*   **Fase 3 — Validador e Motor de Logística (Scoring)**:
    *   Implementação do motor de scoring logístico determinístico (layovers, gateways, buffers de transfer).
    *   Cálculo automático de cost-benefit incremental de tarifas.
*   **Fase 4 — Interface do Workspace de Cotação**:
    *   Painel de comparação lado a lado de até quatro alternativas.
    *   Componente de timeline interativa e preview de proposta para conversão em viagem.
*   **Fase 5 — Chat Agêntico e Orquestrador**:
    *   Integração no `ActionRegistry.ts` com comandos como `quote.create` e `quote.compare`.
    *   Implantação de orquestrador híbrido com revisão humana de segurança obrigatória.
*   **Fase 6 — Memória RAG e Decision Learning**:
    *   Pesquisa semântica baseada em pgvector para recuperação de conhecimento e sugestão de novas regras baseadas em feedbacks.

---

## 2. Estratégia de Verificação e Rollback
*   **Zero Mocks**: Cada fase contará com testes unitários cobrindo as saídas reais normalizadas de ofertas e triggers SQL de segurança.
*   **Rollback de Migração**: Toda migração SQL de alteração de schema deverá vir acompanhada do seu script de reversão (`down` migration) correspondente para resiliência de banco em produção.
