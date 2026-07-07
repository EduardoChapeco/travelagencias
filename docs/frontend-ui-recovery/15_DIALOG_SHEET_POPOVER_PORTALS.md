# 15 Diálogos, Sheets, Popovers e Portals

## Auditoria de Comportamento e Topologia
**Regra Arquitetural:** O TravelOS estipula que modais centralizados pesados (`Dialog`) NÃO devem ser usados para fluxos complexos de criação/edição. Em vez disso, deve-se usar painéis laterais deslizantes (`SheetPage` na direita). `Dialog` e `AlertDialog` são reservados estritamente para confirmações, exclusões e alertas rápidos.

**Evidência Real Encontrada:** 
- Roteamento principal do CRM (`agency.$slug.crm.tsx`) respeita estritamente esta regra: a criação de "Novo Lead" ou "Nova Proposta" evoca o componente `<SheetPage>` (Drawer lateral), garantindo contexto da tela ao fundo. Confirmações de exclusão chamam `<ConfirmDialog>` (wrapper do `AlertDialog`).
- **Problema Estético:** O `AlertDialog` possuía classes genéricas do Shadcn (`bg-background` e `bg-black/80`), destoando completamente do visual Ambient Glass validado nas demais superfícies e ausente do blur do overlay.

## Ação de Correção (Onda 6)
1. O `alert-dialog.tsx` foi reescrito. O seu overlay passou de `bg-black/80` para `bg-black/60 backdrop-blur-sm`, alinhando-se com as configurações de overlay do `sheet.tsx` e `dialog.tsx`.
2. O container do `AlertDialogContent` perdeu a classe opaca `bg-background` e recebeu `mac-glass-modal`, incorporando a mesma topologia de blur e borda de vidro usada pelos popovers nativos do SO, tornando a experiência perfeitamente harmônica e nativa.

**Status Final:** CORRIGIDO. Todas as superfícies flutuantes (Z-index > 40) agora utilizam as variantes semânticas `.mac-glass-modal` e overlays unificados..md
