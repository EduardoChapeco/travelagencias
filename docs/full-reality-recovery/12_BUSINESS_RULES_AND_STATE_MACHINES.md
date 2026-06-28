# 12 Regras de Negócio e Máquinas de Estado

Neste documento detalhamos o fluxo de transição de estados dos principais ciclos de vida do sistema e as triggers correspondentes no banco de dados.

---

## 1. Máquina de Estado de Tarefas (Tasks)
```mermaid
stateDiagram-v2
  [*] --> backlog : Criado sem prazo / Backlog
  backlog --> todo : Planejado (data de vencimento definida)
  todo --> in_progress : Iniciado (start_date ou time entry iniciada)
  in_progress --> in_review : Submetido para revisão
  in_review --> done : Concluído (resolved_at = NOW)
  in_progress --> done
  todo --> done
  todo --> cancelled : Cancelado / Arquivado
```

### Regras Críticas Associadas:
1. **Atualização Automática de `resolved_at`:** Disparada via trigger SQL sempre que o status muda para `done`. Se retrocedido de `done` para outro status, `resolved_at` é limpo (`NULL`).
2. **Registro de Carga de Trabalho:** O `estimated_minutes` e o `actual_minutes` de tempo logado (`task_time_entries`) são consolidados para gerar relatórios reais em `WorkloadView.tsx` e `ReportsView.tsx`.

---

## 2. Máquina de Estado de Conversas (Inbox Omnichannel)
```mermaid
stateDiagram-v2
  [*] --> open : Nova mensagem recebida (inbound)
  open --> pending : Resposta enviada pelo agente
  open --> snoozed : Adiado (tempo limite definido)
  pending --> closed : Encerrado pelo agente
```

### Regras Críticas Associadas:
1. **Auto-vínculo com Lead/Cliente:** O número de telefone do contato inbound é verificado na tabela `contacts`. Se houver correspondência exata, a conversa é vinculada ao cliente existente. Caso contrário, um novo contato é gerado no banco.
