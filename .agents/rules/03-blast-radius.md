# Rule 03 — Análise de Impacto (Blast Radius)

## Princípio: Efeito Borboleta Zero
Antes de tocar qualquer elemento existente (botão, campo, hook, rota, tabela, coluna), mapear o raio de impacto completo.

## Mapeamento Obrigatório (6 perguntas antes de qualquer mudança)
1. **Onde é renderizado?** Buscar todos os imports/usos — não apenas o arquivo óbvio.
   ```bash
   grep -r "NomeDoComponente\|nomeDoHook" src/ --include="*.tsx" --include="*.ts" -l
   ```
2. **O que dispara?** Quais handlers, hooks, contexts, stores são acionados?
3. **Quais APIs chama?** Rotas/Edge Functions envolvidas e o que fazem a jusante?
4. **Quais tabelas/colunas/RLS?** Inclusive tabelas relacionadas via foreign key.
5. **Quais contratos TypeScript/Zod dependem desse dado?** A mudança quebra a forma em outro consumidor?
6. **Quais outros fluxos compartilham essa lógica?** Ex.: botão reutilizado em checkout E em cadastro.

## Componentes de Alto Risco Identificados (requerem auditoria completa antes de editar)
| Componente | Risco | Motivo |
|---|---|---|
| `src/components/ui/button.tsx` | 🔴 Crítico | Usado em praticamente 100% das rotas |
| `src/components/ui/sheet.tsx` | 🔴 Crítico | 24+ wizards/drawers de criação |
| `src/components/ui/sidebar.tsx` | 🔴 Crítico | Núcleo do shell |
| `src/routes/__root.tsx` | 🔴 Crítico | Pai global — auth, providers, error boundaries |
| `src/routes/agency.$slug.tsx` | 🔴 Crítico | Layout pai de 80+ rotas de agência |
| `src/integrations/supabase/client.ts` | 🔴 Crítico | Instância compartilhada do client |
| `TaskDetailDrawer.tsx` | 🟡 Alto | Inbox + tasks + calendar |
| `agency.$slug.inbox.tsx` | 🟡 Alto | WhatsApp + email + AI + support (100KB) |

## O relatório de impacto aparece no plano
O resultado desse mapeamento (mesmo resumido) deve aparecer no plano **antes** da implementação — não depois.

## Consequência prática
> "Trocar a cor do botão de login" tem o mesmo rigor de auditoria que alterar uma coluna do banco — até confirmar que não é reutilizado em fluxo crítico.
