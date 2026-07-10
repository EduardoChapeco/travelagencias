# 07_UI_ACTION_DATA_TRACEABILITY.md — Rastreabilidade de Ações de UI e Fluxos de Dados

## Fluxo de Registro de Ação Primária

```
Página (ex: crm.tsx)
  └── Declara `primaryAction` prop no <PageHeader>
        └── `PageHeader.tsx` intercepta e normaliza via `normalizePrimaryAction`
              └── Envia para o `useLayoutStore.setPrimaryAction`
                    └── `AppSidebar.tsx` detecta a ação ativa
                          └── Renderiza botão circular de 56px no topo
                                └── Ao clicar, executa o callback da Página
```

## Relação de Ações Declaradas por Módulo
- **Tarefas (Tasks)**: "Nova Tarefa" (Abre modal de criação, insere no banco, invalida cache re-renderizando a lista e o Kanban).
- **CRM**: "Novo Lead" (Abre formulário de criação de lead).
- **Orçamentos & Propostas (Proposals)**: "Nova Cotação" / "Nova Proposta" (Abre fluxo de criação no workspace).
- **Contratos (Contracts)**: "Novo Contrato" (Dispara modal de cláusulas e modelo).
- **Viagens (Trips)**: "Nova Viagem" (Abre criação de itinerário).
- **Financeiro (Financial)**: "Lançar Movimento" / "Novo Lançamento" (Abre fluxo de entrada/saída).
