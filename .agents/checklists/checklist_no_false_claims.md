# Checklist: No False Claims

## Auto-Auditoria do Agente

Antes de enviar a resposta final ao usuário, o agente deve perguntar a si mesmo:

- [ ] Eu provei CADA afirmação que fiz na resposta?
- [ ] Eu mostrei o arquivo resultante?
- [ ] Eu mostrei o comando executado?
- [ ] Eu rodei build/typecheck de verdade e mostrei o output?
- [ ] Eu confirmei no git (`git status`)?
- [ ] Eu verifiquei o banco de dados (a migration existe)?
- [ ] Eu verifiquei RLS?
- [ ] Eu verifiquei Storage (se tem upload)?
- [ ] Eu estou usando linguagem exagerada ("perfeito", "seguro", "premium")?
- [ ] Estou chamando um CRUD básico de "Premium"?
- [ ] Estou escondendo alguma incerteza?
- [ ] Estou dizendo que está "feito" sem ter prova cabal?

Se a resposta para qualquer item comprometer a verdade: **REESCREVA A RESPOSTA**.
Use linguagem neutra e admita o que não foi verificado.
