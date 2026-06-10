# Framework: Final Release Judge (Gate)

**Propósito:** Emitir a sentença final que determina se a feature construída pelo agente pode ser classificada como concluída e informada ao usuário. Este é o selo de garantia de um "SaaS Premium Impecável".

## Critérios Máximos de Aceite (Go/No-Go)
Para que uma feature transite para o status **APPROVED**, o agente finalizador deve responder SIM com convicção e evidências em código para as seguintes perguntas:

1. **Tem UI?** A interface atende aos critérios visuais do TravelOS?
2. **Tem Backend e Persistência?** Salva no Supabase (não fica perdido no localStorage)?
3. **Tem RLS?** O banco proíbe edição cruzada (cross-tenant `agency_id`)?
4. **Faz sentido para Turismo?** O lead, roteiro ou passageiro vai chegar onde o vendedor precisa?
5. **Zero Fakes?** Não existem `em breve`, hardcodings, botões vazios ou uploads caindo no vácuo?
6. **Passou na Regressão?** As rotas antigas seguem rodando perfeitamente?

## Vereditos
- `APPROVED`: Responde SIM com provas sólidas para tudo.
- `APPROVED WITH RISKS`: Implementou a feature, mas precisou pular uma camada opcional (como Edge Function pesada) devido a limitações justificadas de ambiente atual.
- `BLOCKED`: Se violar segurança, simular funcionamento ou criar tabela orfã, a task deve ser imediatamente bloqueada, e o dev AI deve reiniciar o loop de correção.
