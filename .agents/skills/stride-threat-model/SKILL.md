---
name: stride-threat-model
description: >
  Modelagem de ameaças STRIDE para features do TravelOS que manipulam dados
  sensíveis: financeiro, contratos, dados de passageiros, documentos pessoais,
  assinatura eletrônica. Dispare automaticamente quando a tarefa envolver
  qualquer desses domínios.
---

# Skill: STRIDE Threat Model

## Quando disparar automaticamente
- Features de financeiro (pagamentos, DRE, comissões, PIX)
- Features de contratos (assinatura eletrônica, addendums, KYC)
- Features de passageiros (documentos, RG, passaporte, OCR)
- Features de autenticação ou controle de acesso
- Qualquer nova tabela que armazene PII (Personally Identifiable Information)

## Framework STRIDE

### S — Spoofing (Falsidade de Identidade)
**Pergunta:** Um atacante pode se passar por outro usuário ou agência?
- Verificar: a autenticação usa `auth.uid()` do Supabase, não campo de usuário controlado pelo cliente
- Verificar: tokens de contrato/checkin têm validade e são invalidados após uso
- Verificar: links públicos (`m.contract.$token`, `m.checkin.$token`) não expõem dados de outra viagem por UUID sequencial

### T — Tampering (Adulteração)
**Pergunta:** Um usuário pode modificar dados que não são seus?
- Verificar: toda escrita tem RLS policy com `auth.uid()` ou `agency_id`
- Verificar: campos calculados (totais, comissões) são calculados no servidor (RPC), não enviados pelo cliente

### R — Repudiation (Repúdio)
**Pergunta:** Uma ação crítica pode ser negada por quem a executou?
- Verificar: assinatura de contrato gera log imutável com IP, timestamp e user agent
- Verificar: operações financeiras têm audit trail no `finance_audit_log`

### I — Information Disclosure (Divulgação de Informação)
**Pergunta:** Um usuário pode ver dados que não deveria?
- Verificar: RLS isola por `agency_id` — agência A não vê dados de agência B
- Verificar: endpoints públicos (`p.$agency_slug.*`) não expõem dados internos
- Verificar: Edge Functions não retornam stack traces em produção

### D — Denial of Service (Negação de Serviço)
**Pergunta:** Uma ação do usuário pode derrubar o sistema para todos?
- Verificar: inputs de texto com autosave têm debounce
- Verificar: uploads têm limite de tamanho
- Verificar: queries pesadas têm paginação/limite
- Verificar: loops de renderização não geram escritas em massa (ver Rule 06)

### E — Elevation of Privilege (Escalada de Privilégio)
**Pergunta:** Um usuário pode executar ação além do seu papel?
- Verificar: funções admin têm check explícito de `user_roles` no RPC/Edge Function
- Verificar: `service_role` não é usada no frontend
- Verificar: multi-tenancy — agente de agência A não pode criar/editar recursos na agência B

## Output esperado
```
STRIDE — [nome da feature]
S (Spoofing): [resultado: OK / RISCO: descrição]
T (Tampering): [resultado]
R (Repudiation): [resultado]
I (Info Disclosure): [resultado]
D (DoS): [resultado]
E (Privilege Escalation): [resultado]
Riscos encontrados: X
Mitigações aplicadas: [lista]
```
