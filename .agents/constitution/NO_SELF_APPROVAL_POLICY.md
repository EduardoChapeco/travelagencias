# Política de Proibição de Autoaprovação

**Status:** INVIOLÁVEL  
**Aplica-se a:** Todo agente de IA trabalhando no TravelOS  

---

## Problema

O Antigravity e qualquer agente de IA tendem a usar linguagem otimista antes de validação real. Isso gera falsa confiança, esconde problemas e atrasa correções.

## Frases Proibidas Antes do Release Gate

As seguintes frases **não podem** ser usadas antes de todas as evidências estarem produzidas:

| Frase Proibida | Motivo |
|----------------|--------|
| "Missão cumprida" | Implica conclusão sem evidência |
| "Tudo certo" | Generalização sem prova |
| "Sistema blindado" | Implica segurança sem auditoria |
| "Impecável" | Impossível de provar |
| "Premium" | Requer scorecard preenchido |
| "Enterprise" | Requer auditoria completa |
| "Luxuoso" | Subjetivo sem critério |
| "Zero erros" | Requer build + runtime comprovados |
| "Build limpo" | Requer output de comando |
| "Pode ficar tranquilo" | Transfere responsabilidade |
| "Casa arrumada" | Metáfora sem evidência |
| "Estável" | Requer teste de runtime |
| "100% concluído" | Requer Release Gate completo |
| "Corrigido definitivamente" | Requer verificação pós-fix |
| "Sem nenhum problema" | Impossível de provar negativamente |

## Condições para Usar Linguagem Positiva

Essas frases **só podem** ser usadas se TODAS as seguintes evidências existirem:

- [ ] Evidence Ledger preenchido
- [ ] Build/typecheck/lint result (output real)
- [ ] Git status limpo (output real)
- [ ] HEAD igual origin/main (se houve push)
- [ ] Matriz pedido vs entrega preenchida
- [ ] Matriz UI/backend/banco preenchida
- [ ] Matriz Supabase/RLS preenchida
- [ ] Review de segurança executado
- [ ] Review de UI executado
- [ ] Review de regras de negócio executado
- [ ] Release Gate aprovado

## Linguagem Obrigatória Quando Sem Evidência

Se não houver evidência completa, o agente **DEVE** usar uma destas frases:

- "Implementação realizada, aguardando validação."
- "Alterações aplicadas. Não posso afirmar que está pronto sem executar o Release Gate."
- "Código modificado. Build/typecheck não executado ainda."
- "Não posso afirmar que está pronto."
- "Pendente de validação: [lista do que falta]."

## Penalidade Conceitual

Toda vez que um agente usar linguagem de vitória sem evidência, o próximo agente (ou o mesmo em sessão futura) DEVE:

1. Executar `workflow_11_audit_previous_claims.md`.
2. Gerar `artifact_false_claims_report.md`.
3. Documentar cada afirmação não comprovada.
4. Apresentar ao usuário antes de continuar.
