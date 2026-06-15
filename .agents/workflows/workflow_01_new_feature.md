# Workflow 01 — New Feature

## Gatilho

Quando o usuário pede para criar algo totalmente novo (módulo, página, integração).

## Etapas Específicas

1. Executar `workflow_00_every_task_bootstrap.md`.
2. **Tourism Operations Review:** Validar o caso de uso na rotina real de agência.
3. **Database Migration:** Criar nova tabela/colunas em `supabase/migrations/`.
4. **RLS Definition:** Escrever policies para a nova tabela filtrando `agency_id`.
5. **Backend Services:** Criar hooks e RPCs necessários.
6. **UI Implementation:** Criar views seguindo Flat Premium. Nenhum componente sem utilidade.
7. **States Implementation:** Implementar Empty, Loading e Error states.
8. Executar `workflow_10_release_gate.md`.
