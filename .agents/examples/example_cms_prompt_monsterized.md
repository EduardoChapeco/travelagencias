# Example: Prompt Monsterized

**Pedido do usuário:**
"Corrigir o CMS e deixar premium."

---

## 1. Intent Capture (Prompt Intake Architect)

O agente `00_prompt_intake_architect` intercepta e traduz o pedido vago para:

**Requisitos Verificáveis:**

1. Auditar atual implementação de CMS.
2. Identificar falta de renderizador, persistência ou RLS.
3. Implementar Flat Premium UI para o CMS (sem popups).
4. Adicionar states (Empty, Loading, Error).
5. Garantir build sem erro.

## 2. Inventory First

O agente executa `grep` e mapeia que o CMS atual é apenas um arquivo `CMSBuilder.tsx` com `items-center` (popup central) e sem tabela no banco.

## 3. Workflows Acionados

- `workflow_00_every_task_bootstrap.md`
- `workflow_05_cms_builder_change.md`
- `workflow_03_ui_refactor.md`

## 4. Artifacts Gerados (Planejados)

- `artifact_intent_brief.md`
- `artifact_inventory_report.md`
- `artifact_cms_realness_matrix.md` (Reprovado no estado atual)
- `artifact_release_gate.md`

## 5. Perguntas Feitas (Business Rules)

- Qual tabela vai armazenar os posts do CMS?
- Quem pode publicar no CMS? Consultor ou apenas Owner?

## 6. Release Gate Interceptando

O agente tenta dizer "CMS Premium concluído e seguro!", mas o `13_false_claims_investigator` verifica que:

- Não há RLS na tabela nova.
- Não houve output de `npm run build`.

**Resultado:** O Release Gate BLOQUEIA a entrega. O agente é forçado a voltar, criar o RLS, rodar o build, e só então responder ao usuário:
"O CMS foi implementado. Build executado com sucesso. Tabela protegida. Aqui estão as evidências."
