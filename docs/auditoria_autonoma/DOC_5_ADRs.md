# DECISÕES DE ARQUITETURA (ADR — Architecture Decision Records)
## Instrução: Registrar toda decisão de design que afeta múltiplos módulos.

## ADR-001: Implementação do Self-Confrontation Loop
Data: 2026-06-29
Status: Aceito
Contexto: A plataforma precisava de uma auditoria minuciosa e contínua devido à sua base extensiva. A auditoria humana não é capaz de capturar todas as dissonâncias entre intenção (schema) e execução (frontend/RLS).
Decisão: Implementar a metodologia de Self-Confrontation Loop para cada módulo, com 12 dimensões de verificação obrigatória antes de qualquer escrita de código.
Consequências: Diminuição da velocidade de entrega inicial de novas features em prol da resiliência absoluta da plataforma. Todas as decisões serão documentadas centralmente.
