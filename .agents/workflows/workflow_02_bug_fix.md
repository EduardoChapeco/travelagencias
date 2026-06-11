# Workflow 02 — Bug Fix

## Gatilho
Quando o usuário relata um erro, botão quebrado, tela branca ou falha de lógica.

## Etapas Específicas
1. **Reprodução Teórica:** Entender o caminho exato que causou o bug.
2. **Investigação de Causa Raiz:**
   - Erro de tipagem?
   - RLS bloqueando acesso?
   - Variável undefined?
   - Supabase retornando null?
3. **Isolamento do Problema:** Evitar "corrigir tudo", focar na causa raiz.
4. **Implementação do Fix:** Corrigir a lógica sem quebrar o entorno.
5. **Teste de Regressão (QA Regression Engineer):** Garantir que a correção não quebrou outras áreas.
6. Executar `workflow_10_release_gate.md`.
