# Plano de Finalização e Compatibilização TravelOS

**Fatiamento por Microfases Executáveis**  
**Data:** 19 de Junho de 2026

Este plano operacional detalha o roteiro para estabilizar, compatibilizar e integrar todos os módulos do TravelOS após as auditorias forenses, mantendo a integridade do design plano **Light Editorial SaaS** e corrigindo lacunas funcionais.

---

## Microfase 1 — Estabilização Técnica e DS Flat

- **Objetivo:** Eliminar todos os desvios de design (sombras), corrigir a renderização de fontes customizadas em PDFs exportados e garantir carregamento instantâneo do Brand Kit (sem flicker).
- **Arquivos Prováveis:**
  - [agency-context.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/lib/agency-context.tsx) (flicker cache/fallback)
  - [VoucherStudio.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/components/vouchers/VoucherStudio.tsx) (adicionar `fonts.ready`)
  - [ExportPdfButton.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/components/proposals/ExportPdfButton.tsx) (adicionar `fonts.ready`)
  - [agency.$slug.financial.reconciliation.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.financial.reconciliation.tsx) (remover sombras)
  - [agency.$slug.boarding.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.boarding.tsx) (remover sombras)
  - [agency.$slug.suppliers.$id.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.suppliers.$id.tsx) (remover sombras)
  - [styles.css](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/styles.css) (sanear classes utilitárias de sombra)
- **Tabelas Envolvidas:** Nenhuma (ajuste puramente visual/estático no front).
- **Riscos:** Pequena latência ao aguardar `document.fonts.ready` em conexões extremamente ruins (resolvido com um timeout curto de fallback).
- **Testes:**
  - Exportar vouchers/propostas e checar se fontes se mantêm consistentes com o Brand Kit.
  - Inspecionar páginas via DevTools e provar que a propriedade `box-shadow` é `none` em todos os elementos.
- **Critério de Pronto:** Ausência completa de classes `shadow-` nas views ativas e PDFs gerados com fontes idênticas às selecionadas no Brand Kit.
- **Rollback:** Reverter alterações de arquivos via `git checkout`.

---

## Microfase 2 — Compatibilização Banco/Front

- **Objetivo:** Alinhar as estruturas das tabelas recém-migradas (`supplier_files`, `supplier_products`, `boarding_tickets`) garantindo que as consultas do front usem chaves primárias e RLS adequadas.
- **Arquivos Prováveis:**
  - [suppliers.$id.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.suppliers.$id.tsx)
  - [m.checkin.$token.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/m.checkin.$token.tsx)
- **Tabelas Envolvidas:** `supplier_products`, `supplier_contacts`, `supplier_files`, `boarding_tickets`.
- **Riscos:** Quebra de tipos TypeScript ao alterar propriedades que eram strings para referências de IDs.
- **Testes:**
  - Salvar e apagar produtos e contatos diretamente na UI e verificar na aba do Supabase se o `agency_id` está isolado corretamente por RLS.
- **Critério de Pronto:** `npm run typecheck` e CRUDs de Fornecedores funcionando 100% integrados às tabelas reais do banco.

---

## Microfase 3 — OCR Workflow Real & Upload Real de Pix

- **Objetivo:** Transformar o botão "Confirmar Dados" do OCR em um ingestor real que gera produtos e contatos no banco, e substituir o upload Pix simulado por upload real no bucket.
- **Arquivos Prováveis:**
  - [suppliers.$id.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.suppliers.$id.tsx) (logica de ingestao)
  - [p.$agency_slug.tour.$id.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/p.$agency_slug.tour.$id.tsx) (upload real Pix)
- **Tabelas Envolvidas:** `supplier_files`, `supplier_products`, `supplier_contacts`, `group_tour_enrollments`.
- **Serviços/Buckets:** Bucket `passenger-documents` ou novo `payment-receipts`.
- **Riscos:** A IA estruturar o JSON de metadados de forma inconsistente.
- **Testes:**
  - Fazer upload de voucher, rodar OCR, clicar em "Confirmar Dados" e certificar que um produto/contato foi criado de forma idêntica à extraída.
  - Efetuar reserva B2C com Pix, provar que o comprovante subiu no Storage e o link público ficou salvo nas observações da reserva.
- **Critério de Pronto:** Arquivos de PIX salvos no bucket e dados do OCR semeando as tabelas operacionais automaticamente no clique humano.

---

## Microfase 4 — Supplier Intelligence UI

- **Objetivo:** Adicionar autocomplete de produtos de fornecedores em orçamentos, propostas e vouchers, e catalogar fornecedores globais.
- **Arquivos Prováveis:**
  - `src/components/proposals/ProposalItemForm.tsx` (ou componente equivalente)
  - `src/components/vouchers/VoucherItemForm.tsx`
  - [agency.$slug.suppliers.index.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.suppliers.index.tsx)
- **Tabelas Envolvidas:** `suppliers`, `supplier_products`.
- **Riscos:** Impacto na performance do autocomplete em agências com milhares de produtos cadastrados (mitigado com paginação/debounce).
- **Testes:**
  - Digitar o nome de um hotel cadastrado em um orçamento e garantir que ele autoalimente o preço base, destino e informações do voucher.
- **Critério de Pronto:** Selecionar fornecedores/produtos via autocomplete nos criadores de documentos.

---

## Microfase 5 — ContractClauseLibrary Integrada

- **Objetivo:** Conectar a tela de emissão de contratos (`agency.$slug.trips.$id.contract.tsx`) à nova biblioteca dinâmica `contract_clauses` (substituindo a RPC de 49 cláusulas hardcoded) e implementar o salvamento de snapshots e log de auditoria.
- **Arquivos Prováveis:**
  - [agency.$slug.trips.$id.contract.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.trips.$id.contract.tsx)
  - `src/components/trips/contract/ContractEditor.tsx`
  - [m.contract.$token.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/m.contract.$token.tsx)
- **Tabelas Envolvidas:** `contract_clauses`, `contracts`.
- **Riscos:** Quebrar a renderização ou assinatura de contratos legados (resolvido por verificação de fallback: se o contrato for antigo e não possuir `clause_snapshot`, utilizar o RPC legado).
- **Testes:**
  - Criar um contrato, alterar uma cláusula na biblioteca e provar que o contrato em andamento não sofreu alteração (graças ao snapshot).
  - Editar uma cláusula de forma customizada e verificar se o `append_contract_audit` foi acionado na trilha de auditoria.
- **Critério de Pronto:** Emissão e assinatura de contratos consumindo a biblioteca real de cláusulas com logs criptográficos de auditoria.

---

## Microfase 6 — Boarding / Portal do Cliente e Deep Links

- **Objetivo:** Criar os deep links de check-in para cias aéreas (Azul, GOL, LATAM) com formatação segura de query string, permitindo redirecionamento direto a partir do Portal do Cliente.
- **Arquivos Prováveis:**
  - [m.checkin.$token.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/m.checkin.$token.tsx)
  - `src/utils/airline-deeplinks.ts` [NEW]
- **Tabelas Envolvidas:** `boarding_cards`, `boarding_tickets`.
- **Riscos:** Alteração de formato de URL pelas cias aéreas sem aviso.
- **Testes:**
  - Testar os links gerados com PNRs fictícios e verificar se a URL montada coincide com o padrão oficial documentado de cada operadora turística/aérea.
- **Critério de Pronto:** Exibir botões funcionais de "Fazer Check-in na LATAM/Azul/GOL" que montam a URL contextual de redirecionamento.

---

## Microfase 7 — Tickets / Gmail / Resend Real

- **Objetivo:** Finalizar o fluxo real de envio de e-mails para fornecedores/clientes a partir do chat de tickets de suporte chamando a Edge Function `gmail-send` ou o serviço do Resend.
- **Arquivos Prováveis:**
  - [agency.$slug.support.$ticket_id.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.support.$ticket_id.tsx)
- **Tabelas Envolvidas:** `support_tickets`, `ticket_messages`.
- **Riscos:** Vazamento ou bloqueio de chaves de API devido a limites de envio.
- **Testes:**
  - Responder a um ticket simulando envio de e-mail e conferir se a Edge Function foi invocada com sucesso.
- **Critério de Pronto:** Envio de e-mail integrado ao botão de ação da conversa de suporte.

---

## Microfase 8 — Rooming List (Quartos e Viagens em Grupo)

- **Objetivo:** Criar as tabelas de quartos e passageiros vinculados no banco de dados e implementar a UI de Drag and Drop para arrastar passageiros entre quartos (single, duplo, triplo) respeitando limites de lotação do hotel.
- **Arquivos Prováveis:**
  - `supabase/migrations/20260624000000_boarding_rooming_list_schema.sql` [NEW]
  - `src/components/trips/RoomingListManager.tsx` [NEW]
  - [agency.$slug.group-tours.$id.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.group-tours.$id.tsx) (adicionar aba real)
- **Tabelas Envolvidas:** `boarding_rooming_list` [NEW], `group_tour_enrollments`.
- **Riscos:** Incompatibilidade ou conflitos na validação de passageiros que viajam sozinhos vs acompanhados.
- **Testes:**
  - Criar quartos, arrastar passageiros, tentar estourar a capacidade do quarto e provar que o validador bloqueia e emite alerta.
- **Critério de Pronto:** Drag and Drop funcional de quartos salvando a alocação em tempo real no banco.

---

## Microfase 9 — Destination Intelligence no Portal

- **Objetivo:** Consumir a tabela `destination_info` no frontend e renderizar cartões informativos (vacinas, voltagem, moedas, dicas locais) no Portal do Cliente.
- **Arquivos Prováveis:**
  - [m.checkin.$token.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/m.checkin.$token.tsx) (ou nova view do passageiro)
- **Tabelas Envolvidas:** `destination_info`.
- **Riscos:** Dados desatualizados ou sem fontes confiáveis.
- **Testes:**
  - Cadastrar dicas de Cancun no banco e conferir se elas aparecem de forma estilizada no portal do passageiro cujo destino seja Cancun.
- **Critério de Pronto:** Cartões informativos integrados ao hub móvel do passageiro.

---

## Microfase 10 — QA Final e Sanidade

- **Objetivo:** Validar build completo, regressões, tipagem estrita e lint de todo o projeto.
- **Comandos:**
  ```bash
  npm run typecheck
  npm run lint
  npm run build
  ```
