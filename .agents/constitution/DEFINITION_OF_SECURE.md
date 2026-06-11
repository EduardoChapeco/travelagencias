# Definition of Secure

**A palavra "Seguro" só pode ser usada se TODOS os itens aplicáveis forem verdadeiros.**

---

## Critérios Obrigatórios

### Princípio Zero Trust
- [ ] Não confia no frontend para validação de segurança
- [ ] Payload é validado server-side (RPC, Edge Function ou RLS)
- [ ] Não permite dados cross-tenant (agency_id sempre filtrado)
- [ ] Não permite role escalation (usuário não vira admin)

### RLS (Row Level Security)
- [ ] Toda tabela sensível tem RLS ativado
- [ ] Toda tabela multi-tenant filtra por `agency_id`
- [ ] Policies cobrem SELECT, INSERT, UPDATE, DELETE conforme necessário
- [ ] Policies foram testadas conceitualmente (cenário permitido + cenário bloqueado)

### RPC e Edge Functions
- [ ] RPCs sensíveis usam `SECURITY DEFINER` com `search_path` seguro
- [ ] Edge Functions sensíveis validam JWT
- [ ] Nenhuma function expõe `service_role` key
- [ ] Nenhuma function expõe secrets em logs ou responses

### Storage
- [ ] Uploads usam buckets com policy de acesso
- [ ] Tipo de arquivo é validado (não aceita executáveis)
- [ ] Tamanho é limitado
- [ ] Path é controlado (não permite directory traversal)

### Dados Sensíveis
- [ ] Contratos/links públicos usam token seguro (não ID sequencial)
- [ ] Dados financeiros não são calculados no frontend
- [ ] CPF/CNPJ/documentos não são expostos em APIs públicas
- [ ] Logs de ações críticas existem (quem fez o quê, quando)

### Proteção Básica
- [ ] Não permite XSS em CMS/blog (sanitização de HTML)
- [ ] Não permite upload de scripts maliciosos
- [ ] Tem proteção mínima contra abuso/spam em endpoints públicos
- [ ] Erros não expõem stack traces ou informações internas

---

## Ameaças Que DEVEM Ser Consideradas

| Ameaça | Pergunta |
|--------|----------|
| Cross-tenant | Um agente da agência A pode ver dados da agência B? |
| Escalation | Um consultor pode virar owner? |
| Data leak | A API retorna dados que o frontend não deveria ter? |
| Upload abuse | Alguém pode fazer upload de 1GB? |
| Link guessing | Contratos públicos podem ser acessados por brute force? |
| XSS | Conteúdo do blog pode injetar scripts? |
