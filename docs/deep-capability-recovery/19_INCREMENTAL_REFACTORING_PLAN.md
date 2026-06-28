# 19. Incremental Refactoring Plan (Plano de Refatoração)

Este relatório descreve o cronograma de fases e gates de validação para as próximas melhorias e manutenções do TravelOS.

---

## 1. Cronograma de Fases e Prioridades

As atividades de engenharia e refatoração do TravelOS seguem a ordem rígida de criticidade:

1. **Fase P0 (Segurança e RLS):**
   * Auditoria de chaves em commits do git, rotação de chaves e correção de FKs para perfis na tabela de tarefas.
2. **Fase P1 (Recuperação e Consolidação):**
   * Consolidação das interfaces do Omnichannel/Inbox na rota unificada `/inbox`, unificação das tabelas novas e suporte real a canais.
3. **Fase P2 (Consolidação de Código Legado e Observabilidade):**
   * Purga de tabelas legadas inoperantes após cutover homologado. Persistência e auditoria de jobs de processamento assíncrono.
4. **Fase P3 (Design System & Viewports):**
   * Refinamento responsivo do Dashboard, formulários, tabelas e sidebars.

---

## 2. Gates de Homologação de Deploy

Qualquer deploy em produção exige o cumprimento estrito do pipeline de qualidade:
* **Gate 1:** TypeScript Typecheck sem erros (`tsc --noEmit` bem-sucedido).
* **Gate 2:** Teste de paridade funcional manual e automático do Inbox e tarefas.
* **Gate 3:** Homologação do RLS no banco de dados local antes da aplicação em produção.
