# Definition of Premium

**A palavra "Premium" só pode ser usada se TODOS os itens aplicáveis forem verdadeiros.**

---

## Critérios Obrigatórios

### Valor Real
- [ ] Resolve uma jornada real do usuário (não é apenas CRUD)
- [ ] Tem fluxo diário (o agente de viagens usaria isso todo dia)
- [ ] Tem integração com outros módulos do sistema
- [ ] Usa dados reais e persistentes (não mock/demo)

### Hierarquia Visual
- [ ] Tem hierarquia visual clara (título > subtítulo > conteúdo > ações)
- [ ] Usa Flat Premium (sem sombras, sem gradientes)
- [ ] Não parece planilha bonita (tem contexto, não só tabela)
- [ ] Tem ações contextuais (ações relevantes no contexto certo)

### Estados
- [ ] Empty state útil (explica o que fazer, não só "nada aqui")
- [ ] Loading state útil (skeleton ou indicador contextual, não spinner genérico)
- [ ] Error state útil (mostra causa + ação sugerida)

### Funcionalidade
- [ ] Tem validação de formulário (inline, não apenas alert)
- [ ] Tem permissões (quem pode ver/editar/excluir)
- [ ] Tem rastreabilidade (logs de ações críticas)
- [ ] Tem responsividade (funciona em diferentes tamanhos de tela)

### Design System
- [ ] Usa tokens do design system (cores, espaçamentos, tipografia)
- [ ] Não tem cores hardcoded
- [ ] Não tem espaçamentos inconsistentes
- [ ] Segue padrão de componentes existentes

### Turismo
- [ ] Tem UX apropriada para turismo/agência (terminologia, fluxo, prioridades corretas)
- [ ] Foi testado conceitualmente contra fluxo real de agência

---

## O Que NÃO É Premium

| O que parece | O que realmente é |
|---|---|
| Lista + Criar + Editar + Excluir | CRUD básico |
| Tabela com filtro | Listagem padrão |
| Formulário em modal | Wizard raso |
| Ícones bonitos sem funcionalidade | Decoração |
| Página com muitos cards vazios | Template vazio |
| Dashboard com dados fake | Mockup |
| "Em breve" buttons | Placeholder |
