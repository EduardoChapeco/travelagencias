### PR-1: Segurança de Assinatura (Server-side Hash) e Otimização de Storage de PDF

**Objetivo:** Evitar sobrecarga no banco de dados armazenando strings Base64 gigantes na coluna de contratos e reforçar a integridade do hash do contrato.
**Por que existe:** O `sign_contract_with_token` atual salva o Base64 cru no DB (o que pode causar lentidão e custos) e aceita cegamente o hash gerado pelo cliente.
**Arquivos alterados:**
  - `src/routes/m.contract.$token.tsx`
  - `supabase/migrations/XXXXXXXXXXXXXX_contracts_storage.sql`
**Migrations:** Sim — Criação do bucket `contract-pdfs` no Supabase Storage e alteração do payload da RPC `sign_contract_with_token`.
**RLS alterada:** Sim — Storage Policies para o bucket `contract-pdfs`.
**Testes necessários:**
  - [ ] Build passa
  - [ ] TypeCheck passa
  - [ ] Teste E2E da rota de Assinatura
**Risco:** Médio
**Rollback:** Reverter o `m.contract.$token.tsx` para passar `pdfBase64` inteiro como argumento na RPC.
**Critério de aceite:**
  - [ ] Assinatura concluída gera o PDF no Storage e grava a URL corretamente.
  - [ ] Validação criptográfica do Server (WORM) confere.
**Status:** Planejado
