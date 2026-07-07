# PROGRAM CHARTER: FRONTEND UI RECOVERY

**Objetivo Central:**
Recuperar o frontend quebrado do TravelOS, reestabelecendo a integridade funcional, visual e arquitetural da plataforma, comprometida por sucessivas refatorações parciais.

## Princípios (Proibições Absolutas)
- Não usar `typecheck` como prova visual.
- Não usar `build` como prova funcional.
- Não declarar sucesso absoluto sem evidências no DOM/CSS/Runtime.
- Não editar em massa via Regex sem classificação semântica prévia.
- Não ocultar erros substituindo por zero ou listas vazias.

## Fase 0 Concluída
- **Branch de Recuperação:** `frontend-recovery-program` (Criada a partir da HEAD em `d64329c`).
- **Baseline Git:**
  - Origin/Main: `f9ee366`
  - Local HEAD (antes da branch): `b804d0a`
- **Baseline DB:**
  - Migrações aplicadas local/remoto até `20260900000016` + a nossa refix `20260707205752` no histórico.
- **Incidentes:** O arquivo `.env` constava no histórico do git (ver `03_SECURITY_AND_SECRET_INCIDENT.md`).

Este documento serve como contrato irrevogável para a condução de todas as ondas de execução.
