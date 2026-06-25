# Matriz de Realidade de Entregas (Reality Matrix)

Este documento classifica a maturidade e integridade operacional real de todas as features declaradas como implementadas no Motor VibeTour.

---

## Matriz de Realidade

| Feature                               | Classificação de Realidade | Evidência Científica / Diagnóstico                                                  | Gaps Restantes                                                                          |
| :------------------------------------ | :------------------------- | :---------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------- |
| **Workspace de Cotações (UI)**        | **REAL PONTA A PONTA**     | A rota `/agency/$slug/quotes` compila e renderiza utilizando o Design System.       | Scroll lateral necessário em dispositivos móveis (responsividade).                      |
| **Persistência de Cotações**          | **REAL PONTA A PONTA**     | Os dados são gravados com sucesso nas tabelas de cotação core no banco remoto.      | Falta Soft Delete nas tabelas de cotação.                                               |
| **Geração de Cenários de Busca**      | **REAL PONTA A PONTA**     | Os cenários `exact_dates` e `gateway_overnight` são salvos corretamente.            | Cenários fixos em código, sem parametrização dinâmica pela UI.                          |
| **Buscas GDS (Conector)**             | **REAL NÃO TESTADA**       | O backend invoca a Edge Function do Infotravel.                                     | Handshake quebrado (405) devido a URL HTTP com redirecionamento para HTTPS.             |
| **Motor de Qualificação (Scorecard)** | **REAL PONTA A PONTA**     | Os bônus e penalidades logísticas são gravados nas tabelas correspondentes.         | Erros de arredondamento Javascript na soma de parcelas.                                 |
| **Simulação Agêntica**                | **REAL PONTA A PONTA**     | A Edge Function `ai-orchestrator` responde com avaliações das personas.             | Custo altíssimo de 15 chamadas HTTP consecutivas por simulação (15 tokens/chamadas IA). |
| **Controle de Duplicidade (Clique)**  | **QUEBRADA**               | O botão de converter em proposta permite múltiplos cliques durante o loading.       | Propostas duplicadas geradas no banco de dados.                                         |
| **Segurança RLS Global**              | **INSEGURA / VULNERÁVEL**  | Qualquer usuário autenticado pode alterar regras de decisão e scorecards globais.   | Faltou aplicar a migration `20260727000000_vibetour_global_rules_security.sql`.         |
| **Cérebro Semântico RAG (Banco)**     | **AUSENTE / QUEBRADA**     | Tabelas RAG não existem no banco de dados remoto. A UI falha ao indexar diretrizes. | Faltou aplicar a migration `20260728000000_vibetour_memory_rag_tables.sql`.             |
| **Cérebro Semântico RAG (Código)**    | **INCOMPATÍVEL**           | O service usa tipagens manuais (`as any`) para contornar a falta de tipos Supabase. | Mapear RAG no arquivo de tipos do Supabase e remover coerções.                          |
