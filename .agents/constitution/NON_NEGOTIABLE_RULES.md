# Regras Pétreas do TravelOS

**Status:** INVIOLÁVEL  
**Violação:** Bloqueio automático de entrega

---

## Inventário e Duplicação

1. **Nunca criar antes de inventariar.** Antes de criar componente, rota, tabela, hook, service ou migration, verificar se já existe.
2. **Nunca duplicar** módulo, rota, tabela, hook, service ou componente sem justificativa documentada.

## Honestidade e Evidência

3. **Nunca declarar algo como pronto sem evidência.** Evidência = arquivo, comando executado, output real.
4. **Nunca declarar build ok sem comando executado.** Mostrar output de `tsc --noEmit` ou `npm run build`.
5. **Nunca declarar git/push/main ok sem saída real de git.** Mostrar `git log -1`, `git status`, `git diff --stat`.

## Banco de Dados e Migrations

6. **Nunca criar SQL solto fora de migrations.** Toda alteração de schema vai para `supabase/migrations/`.
7. **Nunca pedir SQL manual no Supabase como solução final**, exceto emergência documentada com plano de migração posterior.
8. **Toda alteração de banco deve virar migration rastreável.** Arquivo com timestamp, nome descritivo e SQL completo.
9. **Toda tabela multi-tenant precisa de `agency_id`** quando aplicável.
10. **Toda tabela sensível precisa de RLS.** Sem exceção.
11. **Toda policy precisa ser testada conceitualmente.** Descrever cenários de acesso permitido/bloqueado.

## Integridade UI ↔ Backend

12. **Toda UI precisa ter backend real quando for funcional.** Botão que aparece deve ter mutation/action real.
13. **Todo backend precisa ter UI real quando for feature do usuário.** RPC sem tela é código morto.
14. **Todo botão visível precisa ter ação real** ou estar removido/desabilitado com motivo documentado.

## Proibições de Produção

15. **Nada de mock/fake/demo em produção.** Dados simulados são proibidos em código deployado.
16. **Nada de "em breve" em feature prometida.** Se não está pronto, não aparece.
17. **Nada de placeholder visível fingindo feature.** Componente vazio com título bonito é fraude visual.
18. **Nada de hardcoded crítico.** Valores de negócio, URLs, chaves e configurações devem ser dinâmicos ou em env.
19. **Nada de `any`, `@ts-ignore` ou cast inseguro para esconder schema quebrado.** Corrigir o schema, não silenciar o TypeScript.
20. **Nada de cálculo financeiro crítico no frontend.** Comissões, totais, impostos — tudo server-side.
21. **Nada de Base64 pesado no banco.** Usar Storage.
22. **Nada de upload sem Storage/policy.** Todo upload precisa de bucket + policy de acesso.

## CMS e Builders

23. **Nada de CMS sem editor, renderer, schema, publish, preview e persistência.** CRUD de páginas não é CMS.
24. **Nada de builder complexo em popup/modal central.** Builders vão em página dedicada ou Sheet.

## Padrão de UI

25. **Workflows complexos devem ser in-page ou Sheet**, conforme regra definida em `UI_RULES_FLAT_PREMIUM.md`.
26. **O usuário odeia sombras.** `shadow-*` proibido.
27. **O usuário odeia gradientes/degradês.** `bg-gradient-*`, `from-*`, `via-*`, `to-*` proibidos.
28. **O design deve ser Flat Premium.** Clean, moderno, sem ruído visual.
29. **Botões nunca podem quebrar texto em múltiplas linhas.** Sempre `whitespace-nowrap`.
30. **Botões devem usar** `whitespace-nowrap`, `inline-flex`, `items-center`, `justify-center`, `gap-2`, `shrink-0` quando aplicável.
31. **Layouts não devem ficar espremidos em monitor grande.** Usar larguras fluidas.

## Estados Obrigatórios

32. **Empty/loading/error states são obrigatórios.** Toda tela que busca dados precisa dos três.
33. **Loading infinito é bug.** Timeout ou fallback obrigatório.
34. **Catch vazio é bug.** Todo catch deve logar ou mostrar erro.

## Integridade de Processo

35. **Console log não é ação.** Não substitui toast, log de auditoria ou tratamento de erro.
36. **Toast de sucesso sem persistência real é fraude técnica.** Toast só depois de confirmação do backend.
37. **Relatório anterior não é prova.** Prova é estado atual verificável.
38. **Walkthrough não é prova.** Walkthrough descreve intenção, não resultado.
39. **Nome de arquivo não é prova.** Arquivo pode existir vazio ou incorreto.
40. **Nome de agente não é prova.** Chamar algo de "Security Architect" não prova segurança.

## Linguagem Controlada

41. **"Premium" só pode ser usado se atender à `DEFINITION_OF_PREMIUM.md`.**
42. **"Seguro" só pode ser usado se atender à `DEFINITION_OF_SECURE.md`.**
43. **"Funcional" só pode ser usado se atender à `DEFINITION_OF_FUNCTIONAL.md`.**

## Anti-Autoengano

44. **Nenhum agente pode autoaprovar sua própria entrega.** Toda entrega precisa de Review Agent independente (conceitual ou real).
45. **Todo trabalho precisa de Release Gate** conforme `workflow_10_release_gate.md`.
