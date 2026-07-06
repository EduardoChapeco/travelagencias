# 07. Lacunas, Duplicações e Código Legado (Gaps, Duplications, and Legacy)

Este documento identifica os desvios entre os requisitos do PRD do motor inteligente e a base de código do Turis, determinando o que deve ser criado e o que deve ser preservado.

---

## 1. Mapeamento de Gaps de Implementação (Status Atualizado)

Comparando o PRD com o codebase atual:

- **Entidade Cotação Isolada**: **CONCLUÍDO**. Tabelas `quote_requests`, `quote_search_plans`, `quote_scenarios` foram criadas e integradas com tipos TypeScript.
- **Cache de Resultados de Busca**: **CONCLUÍDO**. A tabela `quote_raw_results` está operacional atuando como cache de busca.
- **Motor de Regras e Pesos (Scoring)**: **CONCLUÍDO**. A tabela `score_profiles` e `package_scorecards` estão em funcionamento. Scoring determinístico baseado em companhias, refeições, e conexões logísticas implementado em `quotes-scoring.ts`.
- **Regras de Negócio Dinâmicas (Decision Rules)**: **LACUNA**. As regras dinâmicas em `decision_rules` e versionamentos (`decision_rule_versions`) ainda não estão implementados.
- **Decision Learning (Aprendizado de Decisões)**: **LACUNA**. Fluxo de feedback e sugestão automática de regras baseado em decisões anteriores (`decision_records` e `rule_candidates`) pendente.
- **WatchProfile (Promoções)**: **LACUNA**. Tabelas e jobs de busca automática de promoções terrestres e aéreas (`promotion_watch_profiles` e `promotion_candidates`) pendentes.
- **Snapshots de Cotação**: **LACUNA**. Travamento imutável de tarifas para conversão final (`quote_snapshots`) pendente.

---

## 2. Riscos de Duplicação a Evitar

- **Vouchers e Passageiros**: Não crie novas tabelas para guardar passageiros finais ou itinerários. O motor inteligente normaliza os resultados na estrutura existente de vouchers/viagens para garantir compatibilidade com o financeiro e o portal do cliente.
- **Interface do Chat**: Não crie uma nova caixa de diálogo de chat agêntico. O assistente de cotações está incorporado no ActionRegistry do chat omnichannel já integrado.
- **OCR de Documentos**: O motor de leitura inteligente via IA (`processOcrFile`) está implementado e é mantido como o conector canônico para vouchers e faturas.
