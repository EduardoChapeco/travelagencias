# 11. Auditoria de Responsividade & Acessibilidade

## 1. Testes de Layout e Viewports (Breakpoints)

- **360x800 / 390x844 (Mobile)**:
  - **Rooming List**: A listagem de grupos e os cards de quartos colapsam corretamente para 1 coluna. No entanto, a alocação visual por Drag and Drop é **inviável** nesses viewports devido ao espaço reduzido de tela e à ausência de `TouchSensor` configurado no DndKit (apenas `PointerSensor` está ativo, dificultando ou impedindo o arrastar em telas touch nativas). O fallback de alocação por dropdown é essencial e funcional neste cenário.
  - **Financeiro de Grupos**: Os KPIs colapsam verticalmente e a tabela comparativa de grupos utiliza rolagem horizontal (`overflow-x-auto`), o que evita a quebra do layout, mas prejudica a escaneabilidade.
  - **Modal de Recibo**: O layout térmico (300px) cabe perfeitamente na tela. O layout A4 (595px) transborda horizontalmente dentro do contêiner, exigindo rolagem lateral incômoda para visualização completa no celular.
- **768x1024 / 1024x768 (Tablet)**:
  - Visualização intermediária adequada. A grade de quartos se ajusta para 2 colunas.
- **1280x720 / 1920x1080 (Desktop)**:
  - Experiência otimizada. Os painéis expandidos aproveitam toda a largura disponível. A grade de quartos se expande para 3 colunas e a drag zone lateral fica ampla.

---

## 2. Acessibilidade (WCAG Compliance)

- **Contraste de Cores**: 
  - A paleta neutra "Flat Premium" (slate, charcoal, preto sólido, cinzas claros) provê excelente contraste de texto sob fundos brancos/claros (`15.8:1`).
  - **Alerta de Acessibilidade**: O uso de cores dinâmicas de agências (`--agency-brand`) em botões sem fallback ou sem cálculo dinâmico de luminância para texto (fg) representa um risco AAA (WCAG) se a agência configurar cores primárias muito claras, gerando textos brancos ilegíveis sobre fundos amarelos/claros.
- **Navegação por Teclado e Foco**:
  - Os botões e campos de entrada de dados utilizam marcação semântica nativa e herdam os estados de foco do Tailwind/Design System.
  - **Falha no Drag and Drop**: A ordenação e alocação por arrastar e soltar não possui suporte a navegação por teclado (WAI-ARIA Grids/Draggable), impossibilitando que leitores de tela ou usuários limitados ao teclado utilizem o recurso de drag. Novamente, dependem do select de fallback.
- **Leitores de Tela (Screen Readers)**:
  - Elementos interativos e decorativos (como ícones de status da rooming list) não possuem atributos `aria-label` ou `title` explicativos suficientes em alguns botões, como os botões de alternância rápida de fechamento e envio (apresentam apenas ícones ou badge sem leitura semântica de estado de ativação para leitores de tela).
