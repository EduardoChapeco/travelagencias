# Workflow 10 — Release Gate

## Gatilho
Etapa final ANTES de declarar qualquer tarefa como concluída para o usuário.

## Etapas Específicas
1. **Invocar o False Claims Investigator (`13_false_claims_investigator.md`)**.
2. **Revisar Evidências:**
   - Build rodou? Cadê o log?
   - Tem banco? Cadê a migration?
   - Tem UI? Cadê o checklist Flat Premium?
3. **Preencher DEFINITION OF DONE:** Checar cada checkbox do `DEFINITION_OF_DONE.md`.
4. **Preencher DEFINITION OF FUNCTIONAL:** O código atual funciona ponta a ponta?
5. **Decisão do Juiz (Release Gate Judge):**
   - Se falhou: Retornar à implementação.
   - Se passou: Gerar `artifact_release_gate.md`.
6. Comunicar usuário apenas após aprovação, usando linguagem baseada em fatos.
