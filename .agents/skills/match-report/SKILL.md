---
name: match-report
description: >
  Gera o relatório de sincronismo pós-tarefa (Match Report) para qualquer
  alteração de código no TravelOS. Dispare ao final de qualquer tarefa de
  implementação para confirmar que nada foi quebrado silenciosamente.
---

# Skill: Match Report

## Quando disparar
Ao final de TODA tarefa de código — não apenas quando solicitado explicitamente.

## Protocolo de Verificação

### 1. TypeScript
```bash
npm run typecheck
# Resultado esperado: 0 errors
```

### 2. Schema ↔ Tipos
Se houve migration:
```bash
npx supabase gen types typescript --linked > src/types/supabase.ts
# Verificar se gerou diferença (git diff src/types/supabase.ts)
```

### 3. RLS
```sql
SELECT tablename FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false;
-- Resultado esperado: 0 linhas
```

### 4. Contratos de Props
Para cada componente modificado: verificar se todos os consumidores foram atualizados.
```bash
grep -r "NomeDoComponente" src/ --include="*.tsx" -l
# Inspecionar cada um para confirmar compatibilidade
```

### 5. Código Morto
```bash
# Verificar se algum export ficou órfão
grep -r "export.*NomeDaFuncaoRemovida" src/ --include="*.ts" --include="*.tsx"
```

### 6. Build de Produção (se houve mudança de componente crítico)
```bash
npm run build
# Deve completar sem erros
```

## Template de Relatório (emitir ao final de cada tarefa)

```markdown
## ✅ Match Report — [Nome da Tarefa] — [data]

### Qualidade de Código
- TypeScript: ✅ 0 erros / ❌ N erros (listar)
- Build: ✅ sucesso / ❌ falhou (motivo)

### Sincronismo de Dados
- Schema ↔ Types: ✅ regenerado / ✅ não necessário / ❌ pendente
- Tabelas afetadas: [lista ou "nenhuma"]
- RLS auditado: ✅ 0 tabelas sem RLS / ❌ X tabelas expostas (corrigidas/pendentes)

### Sincronia de UI
- Componentes alterados: [lista]
- Consumidores atualizados: ✅ todos / ❌ faltam: [lista]
- Props quebrados: ✅ nenhum / ❌ [lista]
- Código morto: ✅ nenhum / ❌ removido: [lista]

### Segurança
- service_role no frontend: ✅ não encontrado
- Secrets hardcoded: ✅ não encontrado
- IDOR verificado: ✅ / ❌ pendente

### Sugestões de Ida Além
1. [Melhoria 1 identificada — motivo]
2. [Melhoria 2 — débito técnico encontrado]
```
