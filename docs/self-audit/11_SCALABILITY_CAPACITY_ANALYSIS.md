# 11. Análise de Escalabilidade e Gargalos de Performance

Este documento analisa o comportamento do sistema sob alta carga e identifica gargalos de rede (waterfalls), consultas ineficientes (N+1) e a cobertura de índices físicos nas tabelas core.

---

## 1. Avaliação de Consultas e Redundâncias

### A. Otimização bem-sucedida contra Waterfalls
* **Localização**: [src/services/quotes.ts](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/src/services/quotes.ts) (Linhas 77-102)
* **Descrição**: A função `fetchQuoteRequestDetails` utiliza `Promise.all` para disparar em paralelo quatro consultas independentes de banco (`quote_requests`, `quote_travelers`, `quote_preferences`, `quote_search_plans`), reduzindo drasticamente a latência de carregamento inicial da página de detalhes.
* **Gargalo Identificado**: *Waterfal Secundário*. Após a conclusão do `Promise.all`, se existir um plano ativo, a função dispara uma consulta sequencial síncrona na linha 116 para obter os cenários (`quote_scenarios`):
  ```ts
  if (activePlan) {
    const { data: scenData } = await supabase.from("quote_scenarios").select("*").eq("search_plan_id", activePlan.id)...
  }
  ```
  Isso introduz um atraso de rede (round-trip) adicional de 1 etapa.
  * **Correção**: Pode ser otimizado realizando um join direto dos cenários na query de planos de busca, eliminando a chamada secundária.

---

### B. Evitação de N+1 Queries na Simulação
* **Localização**: [src/services/quotes-simulation.ts](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/src/services/quotes-simulation.ts) (Linhas 50-60)
* **Descrição**: O carregamento dos dados das alternativas e componentes para a simulação de personas evita totalmente o gargalo N+1. Toda a árvore de relacionamento (candidatos, cotações, componentes e ofertas normalizadas) é obtida através de uma única consulta select rica em relacionamentos do Supabase Client:
  ```ts
  .select(`
    *,
    quote_requests(*),
    components:package_candidate_components(
      *,
      offer:normalized_offers(*)
    ),
    scorecard:package_scorecards(*)
  `)
  ```
  Isso demonstra conformidade de boas práticas de arquitetura de dados.

---

## 2. Cobertura de Índices e Performance de Busca (Database Indexes)

* **Índices de Chaves Estrangeiras (FKs)**: As tabelas relacionais pesadas de omnichannel (`omnichannel_messages`, `omnichannel_sessions`, `package_candidate_components`) dependem fortemente de chaves estrangeiras. Embora o PostgreSQL crie restrições para FKs, ele **não cria índices automáticos** sobre elas.
* **Risco**: Em bancos de dados de produção com mais de 100.000 mensagens, buscas por `session_id` ou `agency_id` sem índices dispararão varreduras de tabela inteira (Sequential Table Scans), causando lentidão generalizada e estouro de memória no banco de dados.
* **Recomendação**: Adicionar índices explícitos sobre todas as colunas de FK mais consultadas (ex: `idx_omnichannel_messages_session_id`, `idx_package_candidate_components_candidate_id`).
