---
name: blast-radius-analysis
description: >
  Análise completa de raio de impacto antes de qualquer edição em componente,
  rota, hook, tabela ou coluna existente no TravelOS. Dispare esta skill antes
  de tocar em qualquer elemento que já existe no codebase.
---

# Skill: Blast Radius Analysis

## Quando disparar
Sempre que a tarefa envolver modificar (não criar do zero) qualquer:
- Componente de UI existente
- Rota/página existente
- Hook compartilhado
- Tabela ou coluna do banco
- Edge Function existente
- Tipo TypeScript compartilhado

## Protocolo de Execução (6 passos)

### Passo 1 — Mapa de Usos (onde é renderizado/importado)
```bash
# Buscar todos os arquivos que importam o elemento
grep -r "NomeDoElemento" src/ --include="*.tsx" --include="*.ts" -l

# Contar referências para ter noção do impacto
grep -r "NomeDoElemento" src/ --include="*.tsx" --include="*.ts" -c | grep -v ":0"
```

### Passo 2 — Mapa de Handlers (o que dispara)
- Listar todos os `onClick`, `onChange`, `onSubmit` do elemento
- Rastrear para qual hook/função cada handler aponta
- Verificar se algum desses handlers faz escrita no banco

### Passo 3 — Mapa de API (quais endpoints são chamados)
- Listar todas as chamadas `supabase.from()`, `supabase.functions.invoke()`, `fetch()`
- Para cada uma: qual tabela/Edge Function e o que ela faz a jusante

### Passo 4 — Mapa de Schema (banco)
- Quais colunas são lidas/escritas
- Quais foreign keys estão envolvidas
- Quais RLS policies cobrem esses acessos

### Passo 5 — Mapa de Contratos (TypeScript)
- Quais tipos TypeScript o elemento consome
- A mudança planejada quebra algum consumidor desse tipo?
- ```bash
  grep -r "NomeDoTipo" src/ --include="*.tsx" --include="*.ts" -l
  ```

### Passo 6 — Mapa de Fluxos de Negócio
- O elemento é reutilizado em mais de um fluxo?
- Ex.: mesmo botão em checkout E em cadastro de passageiro
- Identificar todos os contextos de uso para não quebrar nenhum

## Output esperado
```
BLAST RADIUS — [nome do elemento]
Usos diretos: X arquivos
Handlers envolvidos: [lista]
Tabelas afetadas: [lista]
Tipos dependentes: [lista]
Fluxos de negócio: [lista]
Nível de risco: 🔴 Crítico / 🟡 Alto / 🟠 Médio / 🟢 Baixo
Decisão: prosseguir / escalar para revisão
```
