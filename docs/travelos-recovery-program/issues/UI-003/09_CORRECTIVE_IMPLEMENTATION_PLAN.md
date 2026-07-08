# UI-003 - 09_CORRECTIVE_IMPLEMENTATION_PLAN.md
# PLANO DE IMPLEMENTAÇÃO CORRETIVA - UI-003

Este documento descreve as ações corretivas planejadas para garantir a integridade do Dock na Home.

---

## 1. Escopo de Mudanças
Nenhuma alteração estrutural imediata é necessária no dock da Home, visto que ele está funcional no runtime local. A atividade principal será desacoplar o layout do Dock de dentro do Canvas de Notas no futuro para integrá-lo diretamente como componente compartilhado limpo no `AppShell` ou `FloatingDock` canônico.
