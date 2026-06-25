# 08. Interface, Usabilidade e Conformidade Visual

Este documento apresenta a auditoria de responsividade em múltiplos viewports e a validação estética de conformidade com o design system do TravelOS.

---

## 1. Auditoria de Responsividade e Comportamento em Telas

As páginas e módulos do TravelOS foram auditados em múltiplos viewports, do mobile ao desktop de alta resolução, apresentando os seguintes comportamentos:

*   **360px a 390px (Smartphones)**:
    *   **Sidebar & Shell**: A navegação contextual é ocultada automaticamente, liberando a tela. O menu principal é acessível via botão hambúrguer no topo.
    *   **Tabelas & Extratos**: As tabelas de lançamentos financeiros e de conciliação utilizam o invólucro responsivo `overflow-x-auto`. A rolagem horizontal é suave, mantendo botões de ação ("Aprovar" / "Rejeitar") perfeitamente clicáveis no final do scroll.
    *   **Painel de Chat de IA**: O painel `AIChatPanel` comporta-se como um overlay de tela cheia com botão de fechamento destacado, impedindo o estrangulamento da área de trabalho do operador.
*   **768px (Tablets)**:
    *   O grid de KPIs de caixas e propostas comerciais redimensiona-se automaticamente de 4 colunas para 2 colunas, evitando quebras de textos ou sobreposição de valores monetários.
*   **1024px a 1920px (Desktops & Monitores Ultrawide)**:
    *   O layout dual-column de barras laterais (SlimSidebar de 56px e AppSidebar contextual de 220px) posiciona-se de forma fixa na lateral esquerda.
    *   O editor de páginas do CMS se expande para modo tela cheia (fullscreen) com simulação de viewport responsiva em sandbox (iframe isolado), permitindo testar visualizações desktop, tablet e mobile em tempo real.

---

## 2. Aderência ao Design System "Light Editorial SaaS"

A plataforma segue as diretrizes estéticas do tema **Light Editorial SaaS / Flat Premium**:
*   **Controle de Sombras (No Shadows)**: Foi efetuada uma higienização geral do código. Cards, painéis e contêineres em `cash.tsx`, `reconciliation.tsx`, `suppliers.index.tsx` e `boarding.tsx` utilizam exclusivamente bordas finas neutras (`border border-border`) e fundo limpo (`bg-surface` ou `bg-white`), sem sombras pesadas ou gradientes indevidos.
*   **Recibo Responsivo A4**: O modal de visualização e exportação de recibos Pix (`PaymentReceiptModal.tsx`) foi refatorado. O wrapper rígido de 595px foi alterado para `w-full max-w-[595px]`, garantindo que o documento A4 se ajuste de forma fluida a telas de celulares sem transbordar.
*   **Tipografia Fluida**: Standardização de fontes com Inter e Outfit, variando tamanhos e pesos proporcionalmente de acordo com a hierarquia da informação, eliminando fontes serifadas informais no painel de controle.
*   **Controles Canônicos**: Todos os formulários administrativos utilizam os componentes canônicos definidos em `src/components/ui/form.tsx` (`Field`, `Input`, `Select`, `Textarea`, `PrimaryButton`, `GhostButton`), garantindo uniformidade visual de radius (arredondamento consistente) e cores.
