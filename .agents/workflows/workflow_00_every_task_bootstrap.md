# Workflow 00 — Every Task Bootstrap

**Status:** OBRIGATÓRIO PARA TODA TAREFA

## Etapas Obrigatórias

1. **Ler Pedido Original**
   Ler o prompt do usuário com atenção plena.

2. **Reescrever em Requisitos (Prompt Intake Architect)**
   Transformar o pedido vago em `artifact_intent_brief.md`.

3. **Rodar Inventário (Inventory First Architect)**
   Executar scripts de busca para mapear o que já existe. Gerar `artifact_inventory_report.md`.

4. **Identificar Módulos Impactados**
   Listar quais páginas, components, tabelas e hooks serão tocados.

5. **Verificar Regras Pétreas**
   Consultar `NON_NEGOTIABLE_RULES.md` para garantir que o pedido não fere nenhuma regra basal.

6. **Decisão de Arquitetura**
   Decidir entre reutilizar, refatorar, estender, remover ou criar novo.

7. **Criar Implementation Plan**
   Gerar plano detalhado passo a passo.

8. **Pedir Aprovação (Se aplicável)**
   Se for mudança estrutural, criar artefato de plano e pedir review do usuário.

9. **Implementar (Código)**
   Escrever o código seguindo as regras de UI, Supabase e Negócio.

10. **Validar UI / Backend / Banco**
    Auditoria de Flat Premium, Supabase Zero Trust e Business Rules.

11. **Rodar Build e Typecheck**
    `npm run build` ou `tsc --noEmit`.

12. **Gerar Match Artifact**
    Comparar o que foi pedido (Passo 2) com o que foi entregue. `artifact_prompt_to_code_match.md`.

13. **Rodar Release Gate**
    Executar `workflow_10_release_gate.md`. Invocar o **False Claims Investigator**.

14. **Declarar Conclusão**
    Apenas se o Release Gate aprovar, informar o usuário usando linguagem de sucesso comprovada.
