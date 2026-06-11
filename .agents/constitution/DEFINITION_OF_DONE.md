# Definition of Done

**Uma entrega só está Done se TODOS os itens aplicáveis forem verdadeiros.**

---

## Checklist Obrigatório

### Captura e Planejamento
- [ ] O pedido original foi reescrito em requisitos verificáveis
- [ ] O inventário do código existente foi feito
- [ ] O plano foi aprovado pelo usuário (ou é alteração pequena justificada)
- [ ] Não houve duplicação de módulo/componente/rota/tabela sem justificativa

### Implementação
- [ ] UI foi implementada (se feature tem interface)
- [ ] Backend foi implementado (se feature tem lógica server-side)
- [ ] Banco/migration foi implementado (se há alteração de schema)
- [ ] RLS/policy foi revisada (se tabela sensível ou multi-tenant)
- [ ] Storage/policy foi revisado (se há upload)
- [ ] Logs/auditoria foram aplicados (se ação crítica)

### Qualidade
- [ ] Build/typecheck passaram ou falhas foram documentadas com plano
- [ ] A feature foi rastreada ponta a ponta (dado entra → persiste → aparece)
- [ ] Não há mock/fake/demo no código entregue
- [ ] Não há botão estático (botão visível sem ação)
- [ ] Não há hardcoded crítico (valores de negócio, URLs, chaves)
- [ ] Não há SQL solto (toda alteração em migration)
- [ ] Não há arquivos temporários ou de teste no commit

### Entrega
- [ ] Foi gerado relatório pedido vs entrega (o que foi pedido vs o que foi feito)
- [ ] Foi aplicado Release Gate
- [ ] Git delivery proof foi produzido (se houve commit/push)

### Estados da UI
- [ ] Empty state implementado
- [ ] Loading state implementado
- [ ] Error state implementado (mostra causa + ação sugerida)

---

## O Que NÃO Conta Como Done

- Arquivo criado mas vazio
- Componente que renderiza mas não persiste
- Botão que mostra toast mas não chama backend
- Migration criada mas não aplicada sem documentação
- "Funciona no dev server" sem build check
- Walkthrough escrito mas código não verificado
