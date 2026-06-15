# Constituição Técnica do TravelOS

**Versão:** 1.0.0  
**Data:** 2026-06-11  
**Status:** ATIVO — Inviolável

---

## Preâmbulo

Este documento estabelece o sistema operacional de governança do TravelOS. Ele existe porque o projeto sofre de um problema sistêmico: afirmações de conclusão sem evidência, implementações parciais declaradas como completas, violações recorrentes de regras de design, SQL solto, migrations ausentes, mocks em produção, popups proibidos recriados, botões quebrados e linguagem de vitória sem validação.

A partir da data de criação deste documento, **nenhum trabalho no TravelOS pode ignorar esta Constituição**.

---

## Artigo 1 — Hierarquia de Autoridade

1. O **usuário** (dono do produto) tem autoridade máxima.
2. A **Constituição** tem autoridade sobre qualquer agente, prompt ou workflow.
3. As **Regras Pétreas** (`NON_NEGOTIABLE_RULES.md`) não podem ser violadas por nenhum agente.
4. Os **Definitions** (Done, Premium, Secure, Functional) são critérios obrigatórios de aceite.
5. Nenhum agente de IA pode autoaprovar sua própria entrega.

## Artigo 2 — Fluxo Obrigatório de Trabalho

Todo trabalho deve seguir esta sequência:

| #   | Etapa                       | Artefato Produzido                                               |
| --- | --------------------------- | ---------------------------------------------------------------- |
| 1   | Intent Capture              | `artifact_intent_brief`                                          |
| 2   | Inventory First             | `artifact_inventory_report`                                      |
| 3   | Architecture Plan           | Implementation Plan                                              |
| 4   | Business Rules Review       | `artifact_business_rules_matrix`                                 |
| 5   | Tourism Operations Review   | `artifact_tourism_operations_matrix`                             |
| 6   | UI/UX Premium Review        | `artifact_ui_premium_scorecard`                                  |
| 7   | Supabase/RLS/Storage Review | `artifact_supabase_schema_matrix` + `artifact_rls_policy_matrix` |
| 8   | Security Review             | `artifact_security_threat_model`                                 |
| 9   | Implementation              | Código                                                           |
| 10  | Prompt-to-Code Match Review | `artifact_prompt_to_code_match`                                  |
| 11  | Runtime/Build Validation    | `artifact_build_validation_report`                               |
| 12  | Release Gate                | `artifact_release_gate`                                          |
| 13  | Git Delivery Proof          | `artifact_git_delivery_proof`                                    |

**Se uma etapa não for executada, a entrega NÃO PODE ser marcada como pronta.**

## Artigo 3 — Proibição de Autoengano

Nenhum agente pode:

- Declarar "concluído" sem evidência.
- Usar linguagem otimista antes do Release Gate.
- Chamar CRUD raso de "premium".
- Chamar implementação parcial de "enterprise".
- Declarar "build ok" sem ter executado o comando.
- Declarar "push ok" sem output real de git.
- Declarar "migration ok" sem arquivo de migration real.
- Declarar "seguro" sem revisão de RLS.

Ver: `NO_SELF_APPROVAL_POLICY.md`.

## Artigo 4 — Princípio do Inventário Primeiro

Antes de criar qualquer:

- Componente
- Rota
- Tabela
- Hook
- Service
- Migration
- RPC
- Edge Function

O agente DEVE verificar se já existe implementação equivalente no projeto. Se existir, a decisão deve ser documentada: reutilizar, refatorar, estender, remover ou criar novo (com justificativa).

## Artigo 5 — Princípio da Evidência

| Afirmação            | Evidência Obrigatória                                     |
| -------------------- | --------------------------------------------------------- |
| "Build limpo"        | Saída do comando `tsc --noEmit` ou `npm run build`        |
| "Push feito"         | Saída de `git log -1` + `git status`                      |
| "Migration aplicada" | Arquivo em `supabase/migrations/` com conteúdo            |
| "RLS ok"             | Policy listada com `SELECT * FROM pg_policies` ou arquivo |
| "Feature funciona"   | Fluxo ponta a ponta descrito                              |
| "UI premium"         | Scorecard preenchido contra Definition of Premium         |
| "Seguro"             | Checklist preenchido contra Definition of Secure          |

## Artigo 6 — Design System

O TravelOS segue o padrão **Flat Premium**:

- Sem sombras (`shadow-*` proibido)
- Sem gradientes (`bg-gradient-*`, `from-*`, `via-*`, `to-*` proibidos)
- Sem glassmorphism
- Sem modal central para workflows complexos
- Botões nunca quebram texto em múltiplas linhas
- Layouts fluidos em desktop grande

Ver: `UI_RULES_FLAT_PREMIUM.md`.

## Artigo 7 — Integridade de Dados

- Toda alteração de banco vira migration rastreável.
- Nenhum SQL solto como solução final.
- Toda tabela multi-tenant requer `agency_id`.
- Toda tabela sensível requer RLS.
- Soft delete deve ser consistente.
- `as any` não pode esconder schema quebrado.

Ver: `SUPABASE_RULES.md`.

## Artigo 8 — Turismo e Negócio

Toda feature deve ser validada contra a rotina real de uma agência de viagens. Features que não resolvem problemas reais de turismo são desperdício.

Ver: `TRAVEL_BUSINESS_RULES.md`.

## Artigo 9 — Documentos Subordinados

Esta Constituição é complementada por:

| Documento                     | Propósito                  |
| ----------------------------- | -------------------------- |
| `NON_NEGOTIABLE_RULES.md`     | 45 regras invioláveis      |
| `DEFINITION_OF_DONE.md`       | Critério de conclusão      |
| `DEFINITION_OF_PREMIUM.md`    | Critério de qualidade      |
| `DEFINITION_OF_SECURE.md`     | Critério de segurança      |
| `DEFINITION_OF_FUNCTIONAL.md` | Critério de funcionalidade |
| `UI_RULES_FLAT_PREMIUM.md`    | Regras de interface        |
| `SUPABASE_RULES.md`           | Regras de banco/infra      |
| `CMS_BUILDER_RULES.md`        | Regras de CMS              |
| `TRAVEL_BUSINESS_RULES.md`    | Regras de negócio          |
| `GIT_DELIVERY_RULES.md`       | Regras de entrega          |
| `NO_SELF_APPROVAL_POLICY.md`  | Anti-autoengano            |

## Artigo 10 — Emendas

Esta Constituição só pode ser alterada com aprovação explícita do usuário. Nenhum agente pode emendar, relaxar ou ignorar qualquer artigo por conta própria.

---

**Assinado:** Sistema de Governança TravelOS v1.0.0
