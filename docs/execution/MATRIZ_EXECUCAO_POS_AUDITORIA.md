# Matriz de Execução Pós-Auditoria: Turis

**Faseamento Estruturado para Produção**

Este documento organiza as etapas de desenvolvimento, estabilização e compatibilização do Turis baseando-se nos resultados da Auditoria Forense. Nenhuma etapa técnica deve ser executada fora das diretrizes aqui estabelecidas.

---

## Matriz de Fases de Execução

| Fase        | Problema Auditado                                                         | Status Atual         | Tipo de Gap                | Prioridade  | Dependências   | Principais Riscos                                    | Critério de Pronto                                                                                              |
| :---------- | :------------------------------------------------------------------------ | :------------------- | :------------------------- | :---------- | :------------- | :--------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------- |
| **Fase 1**  | Sombras na UI; flicker no Brand Kit; quebra de fontes em PDFs; Chunk OOM. | Parcial / Risco      | Bug Visual / Risco Técnico | **CRÍTICA** | Nenhuma        | Latência no carregamento de PDF.                     | Ausência de sombras (`shadow-none` estrito); PDFs renderizando com fontes corretas após `document.fonts.ready`. |
| **Fase 2**  | Tabelas recém-criadas sem serviços tipados e subutilizadas no front.      | Parcial / Incompleto | Só banco / RLS             | **ALTA**    | Fase 1         | Incompatibilidades de tipos TS.                      | Todos os schemas (`supplier_products`, `boarding_tickets`, etc.) com Services e tipos TS alinhados.             |
| **Fase 3**  | Confirmação de OCR não insere produtos e contatos nas tabelas.            | Fake / Mock          | Integração Quebrada        | **ALTA**    | Fase 2         | Parsing de JSON incoerente da IA.                    | Clique em "Confirmar" insere registros nas tabelas `supplier_products` e `supplier_contacts` reais.             |
| **Fase 4**  | Falta catálogo de agência, aliases, e autocomplete de fornecedores.       | Parcial / Ausente    | Parcial                    | **MÉDIA**   | Fase 3         | Desempenho no select de milhares de itens.           | Autocomplete operando em orçamentos, vouchers e propostas consumindo fornecedores reais da agência.             |
| **Fase 5**  | Emissão de contratos ainda consulta RPC legada de 49 cláusulas fixas.     | Desalinhado          | Integração Quebrada        | **ALTA**    | Fase 2         | Quebra visual de contratos legados.                  | Contratos novos gerados a partir da `contract_clauses` da agência com snapshots e audit logs.                   |
| **Fase 6**  | Falhas tipográficas no export de propostas/vouchers; base64 em colunas.   | Parcial              | Risco Técnico              | **MÉDIA**   | Fase 1, Fase 5 | Consumo excessivo de espaço no DB.                   | PDF/PNG gerados estavelmente; arquivos maiores gravados no Storage bucket em vez de colunas de texto.           |
| **Fase 7**  | Check-in exibe apenas PNR texto; sem links profundos ou guias offline.    | Ausente              | Ausente                    | **MÉDIA**   | Fase 2         | Redirecionamento quebrado por mudança de URL da cia. | Botões contextualizados gerando URLs válidas para LATAM, Azul e GOL; portal móvel completo.                     |
| **Fase 8**  | Chat de tickets não envia e-mails reais (Gmail/Resend simulado).          | Parcial / Fake       | Integração Quebrada        | **MÉDIA**   | Fase 2         | Bloqueio de API/Spam.                                | Mensagens de e-mail enviadas via Resend/Gmail com assinaturas dinâmicas e logs imutáveis.                       |
| **Fase 9**  | Sem tabelas ou UI para Rooming List (alocação de quartos).                | Ausente              | Ausente                    | **BAIXA**   | Fase 2         | Regras de capacidade complexas.                      | Quartos criados no banco e alocação via Drag and Drop funcional com validação de ocupação.                      |
| **Fase 10** | Tabela `destination_info` vazia e não consumida no frontend.              | Ausente              | Só banco                   | **BAIXA**   | Fase 2         | Exposição de dados desatualizados.                   | Informações consulares/locais expostas no portal do cliente apenas com status "revisado".                       |
| **Fase 11** | Automação do dia 30 inexistente.                                          | Ausente              | Ausente                    | **BAIXA**   | Fase 8         | Envio de spam indesejado.                            | Operador aprova envio manual de e-mails de conferência de voo do mês + 2.                                       |
| **Fase 12** | HARDENING final da aplicação.                                             | Parcial              | Segurança / QA             | **ALTA**    | Fases 1 a 11   | Regressão de código.                                 | `typecheck`, `lint` e `build` limpos; checklists operacionais testados ponta a ponta.                           |

---

## Detalhamento das Fases

### [Fase 1 — Estabilização Técnica e Design System Flat](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/docs/execution/fase-01-ESTABILIZACAO_TECNICA_PLANO.md)

- **Objetivo:** Garantir a consistência estética do _Light Editorial SaaS_ e a qualidade de exportação de documentos.
- **Ações:**
  1. Localizar e substituir classes `shadow-sm`, `shadow-md`, `shadow-lg` e `shadow-xl` por `shadow-none` nos módulos `financial`, `boarding`, `group-tours` e `suppliers`.
  2. Adicionar travamento assíncrono `await document.fonts.ready` em todos os handlers de renderização de imagem/PDF via `html2canvas` (`VoucherStudio.tsx`, `ExportPdfButton.tsx`, `pdf-generator.ts`).
  3. Evitar "flicker" de identidade visual nos primeiros milissegundos aplicando fallbacks seguros de cores/fontes no index do HTML e cacheamento de metadados da agência.
  4. Resolver o limite de memória no build (`--max-old-space-size=4096`) otimizando chunks do Vite.

### [Fase 2 — Compatibilização Banco/Front](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/docs/execution/fase-02-COMPATIBILIZACAO_BANCO_PLANO.md)

- **Objetivo:** Estabelecer a tipagem estrita e o isolamento seguro por RLS de todas as novas tabelas.
- **Ações:**
  1. Mapear tipos TypeScript gerados pelo Supabase para `supplier_contacts`, `supplier_products`, `supplier_files`, `boarding_tickets` e `contract_clauses`.
  2. Implementar serviços tipados em `src/services/` para expor essas entidades ao React Query de forma limpa, com tratamento de erros.
  3. Revisar as políticas de RLS no banco de dados para garantir que apenas membros autenticados de cada agência acessem seus respectivos registros.

### [Fase 3 — OCR Workflow Real de Fornecedor](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/docs/execution/fase-03-OCR_REAL_PLANO.md)

- **Objetivo:** Conectar a extração do voucher via Gemini à persistência relacional do catálogo.
- **Ações:**
  1. Ajustar o botão "Confirmar Dados" da UI de arquivos.
  2. Implementar a inserção automática no banco das entidades identificadas no JSON de metadados extraídos pelo OCR (hotéis, transfers, e contatos).
  3. Permitir vinculação a fornecedores existentes criando aliases em caso de pequenas variações de nome.

### [Fase 4 — Supplier Intelligence Real](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/docs/execution/fase-04-SUPPLIER_INTELLIGENCE_PLANO.md)

- **Objetivo:** Criar um fluxo integrado onde os dados de fornecedores alimentam a jornada de vendas.
- **Ações:**
  1. Desenvolver o catálogo completo da agência com buscas, aliases normalizados e reviews internos.
  2. Criar autocompletes com carregamento paginado e debounce.
  3. Integrar o autocomplete nos editores de orçamentos, propostas e vouchers, injetando informações como preços base, taxas e contatos automaticamente.

### [Fase 5 — ContractClauseLibrary Real](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/docs/execution/fase-05-CONTRACT_CLAUSES_PLANO.md)

- **Objetivo:** Substituir a RPC estática de 49 cláusulas e integrar a biblioteca dinâmica de cláusulas da agência.
- **Ações:**
  1. Alterar a rota `agency.$slug.trips.$id.contract.tsx` para buscar e ordenar as cláusulas diretamente da tabela `contract_clauses`.
  2. Implementar editor visual simples no admin para a criação e inativação de cláusulas customizadas.
  3. Garantir que o aceite do contrato salve o `clause_snapshot` estrito e o registre no `append_contract_audit` criptográfico.

### [Fase 6 — Vouchers, Propostas e Render Real](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/docs/execution/fase-06-DOCUMENTOS_RENDER_PLANO.md)

- **Objetivo:** Consolidar a exportação segura de documentos e a limpeza de armazenamento de PDFs gigantes base64 no banco.
- **Ações:**
  1. Criar o pipeline de renderização (Preview -> Render Job -> Storage Upload -> URL pública).
  2. Certificar que nenhum dado base64 bruto de PDF assinado fique permanentemente na tabela `contracts`.
  3. Bloquear downloads de PDF vazios adicionando validadores de dados mínimos necessários.

### [Fase 7 — Portal de Embarque e Check-in Rápido](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/docs/execution/fase-07-PORTAL_CHECKIN_PLANO.md)

- **Objetivo:** Fornecer o portal do passageiro contendo a sua documentação, e-checkins e canais de emergência.
- **Ações:**
  1. Desenvolver a view dedicada de check-in e status de voo móvel.
  2. Implementar montagem de links para LATAM (`orderId` + `lastName`), GOL (`recordLocator` + `departureAirport`), e Azul (`pnr` + `origin`).
  3. Configurar botões de emergência "meu voo atrasou/cancelou" que notificam a agência instantaneamente.

### [Fase 8 — Tickets + Gmail/Resend + Logs](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/docs/execution/fase-08-TICKETS_COMMS_PLANO.md)

- **Objetivo:** Estabelecer a comunicação externa reativa e imutável para atendimento.
- **Ações:**
  1. Conectar o envio de e-mails da agência via Resend (e-mails transacionais de atualização) e sincronizar threads do Gmail na Edge Function de suporte.
  2. Configurar criação automática de tickets de suporte ao receber alertas de voos atrasados/cancelados.
  3. Impedir a deleção física de mensagens, implementando exclusão lógica (soft-delete/arquivamento).

### [Fase 9 — Rooming List e Fechamento de Grupo](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/docs/execution/fase-09-ROOMING_LIST_PLANO.md)

- **Objetivo:** Adicionar gestão de acomodações compartilhadas e fechamento contábil e documental do grupo.
- **Ações:**
  1. Criar a tabela `boarding_rooming_list` para vincular quartos a hotéis e passageiros.
  2. Desenvolver a UI Drag and Drop no painel de excursões em grupo.
  3. Criar validação de fechamento de grupo (bloquear encerramento se houver contratos não assinados ou saldos pendentes).

### [Fase 10 — Destination Intelligence](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/docs/execution/fase-10-DESTINATION_INFO_PLANO.md)

- **Objetivo:** Consumir a tabela `destination_info` no portal do passageiro.
- **Ações:**
  1. Criar tela administrativa para revisão e publicação das informações de destinos (vacinas, vistos, moedas).
  2. Exibir cartões de dicas contextualizados na área do cliente apenas quando revisados manualmente por um agente.

### [Fase 11 — Automação Mensal de Conferência de Voos](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/docs/execution/fase-11-CONFERENCIA_VOOS_PLANO.md)

- **Objetivo:** Automação preventiva de voos para o mês + 2 (Dia 30).
- **Ações:**
  1. Desenvolver script para buscar voos ativos operando daqui a 60 dias.
  2. Criar fila de conferência operacional no dashboard e gerar rascunhos de e-mails de reconfirmação para as operadoras de turismo.

### [Fase 12 — QA Final e Hardening](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/docs/execution/fase-12-QA_HARDENING_PLANO.md)

- **Objetivo:** Garantir a resiliência operacional da plataforma.
- **Ações:**
  1. Testar todos os fluxos B2C e B2B ponta a ponta.
  2. Sanear arquivos residuais, validar a build final e travar dependências.
