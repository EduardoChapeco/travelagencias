# Auditoria de Migrations: Local vs Remoto

Este documento compara o estado das migrations de banco de dados registradas no diretório local de desenvolvimento (`supabase/migrations`), no branch `main` e aplicadas na instância remota do Supabase.

---

## Matriz de Auditoria de Migrations

| Migration | Arquivo Local | Commit em Main | Aplicada Remoto | Status | Divergência / Impacto |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **20260715000000_ai_chat_improvements** | Sim | Sim (Modificado) | **Não** | Pendente | Não aplicada no banco. Funções de chat melhoradas ausentes no remote. |
| **20260716000000_financial_rearchitecture_core** | Sim | Sim (Modificado) | **Não** | Pendente | Core financeiro ausente. Pode quebrar fluxos de pagamentos novos. |
| **20260717000000_financial_rearchitecture_logic** | Sim | Sim (Modificado) | **Não** | Pendente | Lógica e triggers financeiras ausentes. |
| **20260718000000_financial_security_fixes** | Sim | Sim (Modificado) | **Não** | Pendente | Políticas RLS de segurança financeira ausentes. |
| **20260719000000_financial_ledger_triggers** | Sim | Sim (Modificado) | **Não** | Pendente | Triggers de livro razão ausentes. |
| **20260720000000_group_tours_financial_summary_view** | Sim | Sim (Modificado) | **Não** | Pendente | View de resumo financeiro ausente. |
| **20260721000000_destination_intelligence_extensions** | Sim | Sim (Modificado) | **Não** | Pendente | Extensões de inteligência de destino ausentes. |
| **20260722000000_flight_reaccommodation_workflow** | Sim | Sim (Modificado) | **Não** | Pendente | Tabelas de fluxo de reacomodação de voo ausentes. |
| **20260723000000_drop_legacy_columns** | Sim | Sim (Modificado) | **Não** | Pendente | Remoção de colunas antigas pendente. |
| **20260724000000_omnichannel_and_cash_audit** | Sim | Sim (Modificado) | **Não** | Pendente | Omnichannel e auditoria de caixa ausentes. |
| **20260725000000_save_infotravel_booking_atomic** | Sim | Sim (Modificado) | **Não** | Pendente | Função atômica de gravação de reserva ausente. |
| **20260726000000_vibetour_quote_tables** | Sim | Sim (Modificado) | **Não** | **Executada Manualmente** | A migration não está registrada na tabela `schema_migrations` do Supabase, mas as tabelas físicas foram criadas manualmente no console SQL. Risco de desalinhamento de histórico. |
| **20260727000000_vibetour_global_rules_security** | Sim | Sim (Modificado) | **Não** | Pendente | Políticas RLS seguras para score_profiles e decision_rules ausentes no banco. RLS vulnerável ativa. |
| **20260728000000_vibetour_memory_rag_tables** | Sim | Sim (Modificado) | **Não** | **Faltante** | Tabelas de RAG e RPC vetorial completamente ausentes da base remota. |

---

## Análise de Causa Raiz e Diagnóstico

1. **Atraso de Sincronia de Deploy**: As migrations criadas a partir do dia 15 de Julho de 2026 nunca foram enviadas/aplicadas via CLI oficial (`supabase db push`) para a base de produção, restando apenas no workspace local.
2. **Execução SQL Manual (Ad-hoc)**: A migration `20260726000000` foi colada e executada diretamente no Editor SQL do Painel Supabase. Como resultado, as tabelas físicas existem, mas a tabela interna de controle de migração (`supabase_migrations.schema_migrations`) não registrou o ID da migration local. 
3. **Quebra de Deploy Automático**: Qualquer tentativa futura de executar `supabase db push` ou `supabase db remote commit` falhará deterministicamente porque as tabelas criadas manualmente pela migration `20260726000000` já existem na base remota, gerando erro de duplicidade (`relation "quote_requests" already exists`).
