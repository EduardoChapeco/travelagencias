# Rule 04 — Verificação de Match Sistêmico

## Princípio
Depois de qualquer mudança, antes de considerar a tarefa concluída, rodar verificação de sincronismo entre todas as camadas.

## Checklist de Match (obrigatório ao final de cada tarefa)

### Camada de Dados
- [ ] **Schema ↔ Types:** Os tipos em `src/types/supabase.ts` foram regenerados após migration?
  ```bash
  supabase gen types typescript --linked > src/types/supabase.ts
  ```
- [ ] **Types ↔ Frontend:** Todos os campos acessados no frontend existem no schema real (sem `as any` escondendo erros)?
- [ ] **UUIDs intactos:** Nenhum UUID/ID se perdeu na cadeia pai → filho → serviço → DB?
- [ ] **Foreign keys válidas:** Nenhuma referência quebrada após mudança de schema?

### Camada de API
- [ ] **Rotas ↔ Chamadas:** Todo `supabase.from('tabela')` ou `supabase.functions.invoke('fn')` aponta para recurso que existe e está deployado?
- [ ] **Edge Functions ↔ Client:** Payload de input/output das Edge Functions sincronizado com o código que as invoca?
- [ ] **RPCs ↔ Chamadores:** Toda função RPC referenciada no frontend existe no banco?

### Camada de Segurança
- [ ] **RLS ↔ Novo fluxo:** As policies existentes cobrem o novo fluxo de dados? Se criou tabela/coluna nova, RLS foi habilitada?
- [ ] **Multi-tenancy:** A policy isola por `agency_id`? Usuário de agência A não acessa dados de agência B?

### Camada de UI
- [ ] **Contratos de Props:** Componentes que mudaram interface têm todos seus consumidores atualizados?
- [ ] **Código morto:** Nenhum import não usado, nenhum componente órfão após a alteração?
- [ ] **`npm run typecheck`:** Zero erros de TypeScript?

## Formato do Relatório de Match
Ao final de cada tarefa, emitir explicitamente:
```
✅ Match Global — [nome da tarefa]
- Schema ↔ Types: regenerado / não necessário (motivo)
- RLS: verificado — X tabelas afetadas, todas com policy
- Props: Y componentes consumidores atualizados
- Typecheck: 0 erros
- Código morto: nenhum encontrado / Z arquivos removidos
```
