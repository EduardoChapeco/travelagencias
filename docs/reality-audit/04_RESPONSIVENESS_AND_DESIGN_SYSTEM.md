# Responsividade e Design System

Auditoria estética e funcional do comportamento responsivo do TravelOS sob múltiplas resoluções, além de conformidade com as especificações visuais do Flat Premium Design System.

---

## 📱 Comportamento por Viewport (Largura de Tela)

### 1. Mobile (360px - 390px)

- **AppSidebar & Navegação**: O AppSidebar utiliza um hamburger menu ocultável em telas mobile, liberando espaço útil. O painel contextual se recolhe.
- **Tabelas de Dados**: Tabelas de listagem (ex: propostas e financeiro) possuem scroll horizontal (`overflow-x-auto w-full`) evitando quebra do grid, mas o cabeçalho pode sofrer cortes de texto se muito extenso.
- **Formulário de Cotação (InPage vs. Sheet)**:
  - O InPage (`/proposals/new`) comprime inputs em uma coluna única de forma confortável.
  - O Sheet (`NewProposalSheet`) usa `width="clamp(480px, 45vw, 720px)"`. No celular (360px/390px), como a largura mínima é menor que 480px, o CSS resolve para `max-w-full`, que evita transbordo de tela, mas a rolagem interna do Sheet pode ficar truncada se o teclado virtual estiver aberto.

### 2. Tablet (768px)

- **Layout Split**: Telas de formulários e layouts divididos (como Kanban do CRM) passam de visualização em coluna única para colunas múltiplas. O scroll vertical se torna o principal meio de navegação. A sidebar de contexto de 220px se oculta em tablets ou fica oculta por padrão, exigindo interação.

### 3. Desktop Comum (1024px - 1366px)

- **Visualização Ótima**: É a resolução ideal do sistema. As sidebars duplas (SlimSidebar de 56px + painel de contexto de 220px) permanecem visíveis simultaneamente sem espremer a área principal da rota.

### 4. Ultra Wide (1920px+)

- **Estiramento de Tela**: Em telas muito largas, páginas que não possuem limite de largura máxima (como listagem de propostas ou DRE) esticam de ponta a ponta. No entanto, o formulário de Nova Cotação possui restrição centralizada `max-w-3xl mx-auto` em [proposals.new.tsx:L267](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.proposals.new.tsx#L267), o que previne estiramento excessivo e fadiga ocular.

---

## 🎨 Consistência do Design System (Flat Premium)

- **Botões e Alturas**: Padronizados em altura `h-9` ou `h-8` para botões secundários/ações rápidas.
- **Fontes e Tipografia**: Utiliza fontes sem-serifa modernas, com tamanhos variando de `text-xs` (tabelas e hints) a `text-xl` (cabeçalhos de página).
- **Espaçamento e Gaps**: Margens e paddings de páginas estão alinhados em `p-4` (mobile) e `p-6` (desktop).
- **Tratamento de Sombras (Shadows Flat)**: Conforme diretrizes Flat Premium, sombras complexas de botões e cards foram reduzidas, aplicando bordas suaves (`border-border`) e cores de fundo contrastantes (`bg-surface` e `bg-surface-alt`).
