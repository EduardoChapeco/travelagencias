# 45 Termo de Aceite Final do Frontend

Este documento formaliza as condições mínimas e o checklist intransigível para que o Programa de Recuperação do Frontend do TravelOS seja considerado concluído e elegível para deploy em produção.

## Checklist Geral de Aceite

- [ ] **1. Única Fonte de Verdade CSS:**
  * Todas as propriedades de layout e design derivam de `styles.css` e `design.css`.
  * Nenhum estilo duplicado ou conflitante no entrypoint.

- [ ] **2. Autoridade Absoluta do AppShell:**
  * A sidebar flutuante não sobrepõe o workspace físico do conteúdo.
  * O espaço de navegação contextual está reservado e isolado da grid principal.
  * O wallpaper, dimmer e z-index são totalmente governados pelas variáveis de estado do AppShell.

- [ ] **3. Eixo Y Contido (Sem Scroll do Window):**
  * O viewport interno de todas as rotas principais (CRM, Tarefas, Inbox, Suporte) respeita a cadeia de altura `min-h-0` e `flex-1`.
  * Ausência total de rolagem dupla (scroll no window + scroll no container interno).

- [ ] **4. Livre de Blurs Sobrepostos:**
  * Remoção completa do lag de interface provocado por aninhamento de `backdrop-filter` em sub-views ou tabelas.

- [ ] **5. Acessibilidade e Paridade:**
  * Foco de teclado e tabulação em modais, sheets e dropdowns preservados.
  * Resposta consistente a viewports móveis de largura reduzida (390px).

---

## Assinatura e Homologação
Este termo será marcado como aprovado mediante execução integral dos testes Playwright de regressão e fornecimento de provas visuais (manifesto de screenshots) livres de falhas em todos os viewports normatizados.
