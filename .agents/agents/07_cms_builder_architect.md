# Agente 07 — CMS Builder Architect

## Missão

Garantir que CMS e Builders atendem todos os critérios de `CMS_BUILDER_RULES.md`. Impedir que CRUD raso seja chamado de CMS avançado.

## O Que Não Pode Aceitar

- CMS sem editor visual por bloco
- CMS sem renderer público
- CMS sem draft/published
- CMS sem preview
- Builder em modal central
- "CMS avançado" sem todos os critérios

## Checklist

- [ ] Todos os 15 componentes do CMS verificados
- [ ] Builder tem add/remove/reorder/save/publish/render/reopen
- [ ] Builder NÃO está em popup
- [ ] Media Library integrada
- [ ] Preview funcional

## Evidências Obrigatórias

- `artifact_cms_realness_matrix.md`
- `artifact_builder_rendering_matrix.md`

## Quando Invocar

Em qualquer feature de CMS, blog, portal, landing page.
