# Layout de Tela e Controles de Recolhimento

Este documento analisa as modificações feitas no layout da barra lateral e no painel de chat, focando em contraste, responsividade e comportamento do componente.

---

## 1. Mapeamento CSS e Variáveis de Contraste

O item ativo da sidebar contextual é auditado para contraste e acessibilidade:

- **Tokens**: `--accent` e `--accent-foreground` estão declarados no arquivo [styles.css](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/styles.css):
  - **Tema Claro (:root)**: `--accent: #151515;` e `--accent-foreground: #ffffff;`.
  - **Tema Escuro (.dark)**: `--accent: #f8f7f4;` e `--accent-foreground: #151515;`.
- **Tailwind**: A classe `bg-accent` e `text-accent-foreground` mapeiam para estas variáveis em conformidade com o tema de cores.
- **Componente**: Em [SlimSidebar.tsx](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/components/shell/SlimSidebar.tsx), a classe `bg-accent text-accent-foreground font-semibold` é aplicada dinamicamente se o item estiver ativo.
- **Contraste de Acessibilidade**: O fundo escuro em tema claro utiliza fonte 100% branca e vice-versa, garantindo que o tema escuro não sofra inversão incorreta e mantendo excelente contraste.

---

## 2. Controles de Recolhimento (Split e Persistência)

Os estados de colapso de layout estão implementados em [SlimSidebar.tsx](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/components/shell/SlimSidebar.tsx):

- **Recolhimento dos Atalhos**: O botão `<button>` alterna o estado `isNavCollapsed`. Quando ativo, a tag `<nav>` contendo os links é ocultada, cedendo espaço ao chat.
- **Recolhimento do Chat**: Prop `isCollapsed` controla a exibição do histórico de mensagens no `AIChatPanel.tsx`, deixando apenas o input visível no rodapé.
- **Persistência das Preferências**: Gravado e lido no `localStorage` via chaves `travelos.sidebar.nav.collapsed` e `travelos.sidebar.chat.collapsed`. Mudanças de rota retêm os estados.
- **Divisor Ajustável**: Separador vertical com cursor `row-resize` permite ajustar a altura `topHeight` arrastando. O divisor oculta-se automaticamente quando um dos painéis é recolhido para evitar quebras.
- **Gatilho de Foco**: Focar ou digitar na `<textarea>` do chat recolhido dispara `onFocusExpand()`, expandindo tanto o chat quanto a navegação automaticamente para uso conveniente.

---

## 3. Matriz de Estados de Visualização

| Estado de Visualização  | Atalhos Contextuais          | Chat de IA (Mensagens) | Input de Chat | Divisor (Split) | Persistido |
| :---------------------- | :--------------------------- | :--------------------- | :------------ | :-------------- | :--------- |
| **Ambos Abertos**       | Visível (altura ajustável)   | Visível (flex-1)       | Visível       | Visível         | Sim        |
| **Navegação Recolhida** | Oculto (Header de 58px fixo) | Visível (flex-1)       | Visível       | Oculto          | Sim        |
| **Chat Recolhido**      | Visível (flex-1)             | Oculto                 | Visível       | Oculto          | Sim        |
| **Ambos Recolhidos**    | Oculto                       | Oculto                 | Visível       | Oculto          | Sim        |

---

## 4. Classificação das Entregas de Layout

- **Contraste da Sidebar**: **REAL PONTA A PONTA**
- **Controle de Layout Recolhível / Split**: **REAL PONTA A PONTA**
- **Divisor de Redimensionamento Horizontal**: **REAL PONTA A PONTA**
