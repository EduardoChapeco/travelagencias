# Regras de Supabase — TravelOS

**Regras obrigatórias para toda interação com banco, storage, RPC e edge functions.**

---

## Migrations

1. **Nenhum SQL solto como solução final.** Toda alteração de schema vai para `supabase/migrations/`.
2. **Toda alteração de banco vira migration.** Arquivo: `YYYYMMDDHHMMSS_descricao.sql`.
3. **Toda coluna usada no frontend precisa existir em migration.** Se o frontend usa `column_x`, ela precisa existir.
4. **Toda view usada precisa existir em migration.** Views criadas por SQL solto são dívida técnica.
5. **Toda RPC chamada precisa existir e ter assinatura compatível.** Frontend e RPC devem concordar em parâmetros e retorno.

## Multi-Tenancy

6. **Toda tabela multi-tenant precisa de `agency_id`** quando aplicável.
7. **Toda query multi-tenant filtra `agency_id`.** Sem exceção.
8. **Toda policy considera `agency_id`.** Policy sem filtro de tenant é falha de segurança.

## RLS (Row Level Security)

9. **Toda tabela sensível precisa de RLS ativado.**
10. **Policies devem cobrir todas as operações usadas** (SELECT, INSERT, UPDATE, DELETE).
11. **Policies devem ser testadas conceitualmente** com cenários de acesso permitido e bloqueado.

## Consistência

12. **Soft delete precisa ser consistente.** Se uma tabela usa `deleted_at`, todas as queries devem filtrar `.is("deleted_at", null)`.
13. **Se query filtra `deleted_at`, a coluna precisa existir na tabela.** Coluna fantasma = erro de runtime.
14. **Tipos gerados devem ser atualizados após migration** ou limitação documentada.

## Storage

15. **Todo upload precisa de bucket + policy de acesso.**
16. **Upload deve validar tipo de arquivo** (não aceitar executáveis, scripts).
17. **Upload deve validar tamanho** (limite por bucket).
18. **Path do upload deve ser controlado** (não permitir directory traversal).

## Edge Functions e RPC

19. **Edge Function sensível precisa validar JWT.**
20. **`SECURITY DEFINER` precisa de `search_path` seguro** (`SET search_path = public`).
21. **`service_role` NUNCA no frontend.** Apenas em edge functions server-side.

## TypeScript e Schema

22. **`as any` não pode ser usado para esconder schema quebrado.** Se o TypeScript reclama, corrigir o schema ou criar type override documentado.
23. **Depois de migration, atualizar types** (`supabase gen types`) ou documentar a limitação.

---

## Scan de Violação

```bash
# Verificar service_role no frontend
grep -rn "service_role" src/ --include="*.ts" --include="*.tsx"

# Verificar as any em queries
grep -rn "as any" src/ --include="*.ts" --include="*.tsx" | grep -i "supabase\|from\|rpc"

# Verificar queries sem filtro de agency_id
grep -rn ".from(" src/ --include="*.tsx" | grep -v "agency_id" | grep -v "node_modules"
```
