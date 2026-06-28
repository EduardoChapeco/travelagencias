# 05 AUTORRESPOSTA E CONTESTAÇÃO

**PERGUNTA:** O RLS de `passengers` impede mass assignment cross-tenant?
**RESPOSTA ENCONTRADA:** Sim, a policy existe.
**CONTESTAÇÃO:** E se a viagem pertencer a outra agência, mas o passageiro for inserido via RPC bypassing RLS? O service_role é usado?
**CLASSIFICAÇÃO:** IMPLEMENTADO MAS NÃO TESTADO com testes negativos.
