# 18 Recuperação do Kanban Board

## Auditoria Geométrica e Estética
**Evidência Real Encontrada:** 
A árvore do Kanban (`agency.$slug.crm.tsx` -> `CrmKanbanBoard.tsx` -> `LeadCard.tsx`) estava funcional, porém apresentava problemas no empilhamento visual (camadas de vidro sujas). As colunas usavam as classes `.glass .dark:glass-dark` que aplicam um fundo opaco pesado. Os cartões usavam classes de utilitário do Tailwind com `backdrop-blur-md` hardcoded que causavam "lag" de sobreposição de blur. 

O AppShell já garantia corretamente a largura total, permitindo o scroll horizontal da Board, mas as cores do Glassmorphism estavam ofuscando a distinção visual.

## Ações de Correção (Onda 7)
1. **Limpeza das Colunas:** O componente `Column` do Kanban foi atualizado para usar `.kanban-column`. Conforme configurado no CSS master (`styles.css`), as colunas agora utilizam `rgba(255, 255, 255, 0.04)` puro, sem blur e sem sobreposição preta, agindo como raias translúcidas perfeitas.
2. **Atualização dos Cards:** O `LeadCard.tsx` perdeu suas utilidades `bg-surface/80` e `backdrop-blur-md` inline em prol da utilidade oficial `.glass-card` do sistema.
3. **Rolagem:** Preservada a hierarquia `flex-1 min-h-0` de pai para filho (`CRMPage` -> `CrmKanbanBoard`) que garante que o eixo Y e o eixo X façam scroll contidos no layout principal, sem roubar a barra de rolagem da janela.

**Status Final:** ESTABILIZADO. O Kanban board está rápido (sem múltiplos blurs empilhados) e legível..md
