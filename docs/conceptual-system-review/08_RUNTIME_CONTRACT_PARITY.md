# 08 PARIDADE DE CONTRATOS

- UI Zod Schemas vs DB Schemas: Existem divergências onde o Zod permite `null` mas o banco lança erro de constraint nula.
- Exemplo: `financial_data` em `trips` é JSONB, o que esconde a tipagem real no banco.
