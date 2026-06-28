# 08. UI Design System and Responsive Audit (Auditoria Visual)

Este relatório apresenta os resultados da auditoria responsiva de viewports e conformidade visual com o Design System.

---

## 1. Auditoria de Responsividade

Inspecionamos e validamos o comportamento dos componentes nas seguintes resoluções de tela:

* **Mobile (360px e 390px):**
  * As sidebars principal (Slim) e secundária (contextual) são recolhidas automaticamente, dando lugar a uma gaveta deslizante acionada pelo menu hambúrguer superior.
  * O grid do Dashboard unifica seus cards de KPI em uma única coluna vertical.
  * O chat em `/inbox` colapsa para exibir apenas a lista de conversas. Ao selecionar um contato, a lista oculta e o chat de conversa ativa passa a ocupar 100% da viewport, com um botão "Voltar" superior para retornar.
* **Tablet (768px):**
  * A SlimSidebar permanece visível e a contextual se oculta por padrão, economizando espaço horizontal.
  * As tabelas financeiras e de CRM ativam a rolagem horizontal interna (`overflow-x-auto`) sem deformar a grade da página.
* **Desktop (1024px, 1280px, 1366px, 1440px e 1920px):**
  * Layout completo em split-view. Exibição simultânea da lista de conversas, chat ativo e painel de detalhes do contato na direita.
  * Gráficos dinâmicos de faturamento expandem horizontalmente de forma responsiva.

---

## 2. Consistência Estética e Tokens de Cores

* **CSS Custom Properties:** Cores, tipografia e bordas se alimentam das variáveis declaradas em `:root` (como `--brand`, `--surface`, `--border`), suportando dinamicamente a aplicação do Brand Kit da agência ativa.
* **Scroll Duplo:** Purgamos scrolls aninhados em caixas de listagem, fixando a altura da tela a `h-[calc(100vh-var(--header-h))]` e delegando a rolagem exclusivamente às ScrollAreas individuais dos painéis centrais.
