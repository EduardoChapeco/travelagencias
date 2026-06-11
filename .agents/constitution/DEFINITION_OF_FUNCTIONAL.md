# Definition of Functional

**A palavra "Funcional" só pode ser usada se TODOS os itens aplicáveis forem verdadeiros.**

---

## Critérios Obrigatórios

### Camada de UI
- [ ] A UI existe e é renderizada sem erro
- [ ] O botão executa ação real (não é estático)
- [ ] A validação de formulário existe (campos obrigatórios, tipos)
- [ ] Empty state existe e faz sentido
- [ ] Loading state existe e não é infinito
- [ ] Error state existe e mostra causa

### Camada de Dados
- [ ] A mutation/query existe e é chamada
- [ ] O service/hook existe
- [ ] O dado persiste após refresh (não é apenas state local)
- [ ] O dado aparece na listagem após criação
- [ ] A edição altera registro real no banco
- [ ] A exclusão/arquivamento segue regra definida (soft delete ou hard delete)

### Camada de Banco
- [ ] A tabela existe
- [ ] A migration existe em `supabase/migrations/`
- [ ] As colunas usadas no frontend existem no schema
- [ ] A RLS/policy existe quando necessário
- [ ] O Storage existe quando há upload

### Integridade
- [ ] A operação respeita permissões (quem pode fazer o quê)
- [ ] A operação é auditável quando crítica (log de quem fez)
- [ ] O erro do backend é tratado no frontend (não engole silenciosamente)

---

## Teste Conceitual Obrigatório

Para cada feature marcada como "funcional", responder:

1. **Criar:** Consigo criar um registro novo? Ele aparece na lista?
2. **Ler:** Consigo ver os detalhes? Os dados estão corretos?
3. **Editar:** Consigo alterar? A alteração persiste?
4. **Excluir:** Consigo remover? O registro some da lista?
5. **Permissão:** Outro usuário sem permissão consegue fazer isso?
6. **Erro:** O que acontece se o backend falhar? A UI mostra algo útil?
7. **Refresh:** Depois de F5, o dado ainda está lá?
