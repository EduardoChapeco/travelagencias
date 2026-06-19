# 04. Auditoria de Fluxos Ponta a Ponta

Este documento descreve o rastreamento técnico dos fluxos operacionais críticos do sistema, identificando onde há integridade e onde ocorrem interrupções por mocks ou stubs.

---

## 1. Fluxo A: Lead até Viagem

```
[Formulário Público] ➔ [CRM Lead] ➔ [Proposta de Vendas] ➔ [Conversão RPC] ➔ [Viagem Criada]
```

* **Etapas e Rastreabilidade:**
  * Captura de lead por formulário público `/m/lead/:id` ou checkout de excursão pública.
  * O Lead aparece no CRM Kanban (`crm.tsx`).
  * Geração de proposta a partir de lead (`proposals.new.tsx`).
  * Conversão da proposta aprovada para viagem via chamada para RPC `convert_proposal_to_trip` no banco de dados Supabase.
  * A Viagem é gerada na tabela `trips` com relacionamento correto.
* **Diagnóstico:** **REAL COM RESSALVA**. O fluxo flui sem quebras de banco de dados, mas na etapa final de assinatura do contrato (`trips.$id.contract.tsx`), o sistema utiliza o template estático herdado de 49 cláusulas, ignorando as cláusulas recém-parametrizadas na biblioteca dinâmica de cláusulas.

---

## 2. Fluxo B: Pacote Público (Inscrição B2C)

```
[Vitrine Pública] ➔ [Escolha de Poltrona] ➔ [Dados do Pax] ➔ [Tela de Pix (MOCK UPLOAD)] ➔ [Inscrição Real]
```

* **Etapas e Rastreabilidade:**
  * Usuário acessa `/p/$agency_slug/tour/$id` e visualiza o roteiro público.
  * Escolha de poltrona no ônibus virtual (com base no `layout.seat_map` da excursão).
  * Preenchimento do formulário de identificação.
  * Botão de avanço abre a tela de Pix Copy & Paste com o QR Code.
  * Caixa de anexo do comprovante Pix. O usuário faz o upload e o frontend simula o progresso (`setInterval` de 30% a cada 200ms) e salva apenas o nome do arquivo em memória local React.
  * Clique em "Confirmar Inscrição" chama `enrollPublicTour` no service. Ele concatena a string `[PIX VOUCHER UPLOADED: nome_do_arquivo]` no campo `notes` da tabela `group_tour_enrollments`.
* **Diagnóstico:** **PARCIAL (MOCK DE ARQUIVO)**. Embora a reserva e poltrona no ônibus persistam corretamente no banco e mudem o status do ônibus para ocupado, o arquivo físico do comprovante de pagamento Pix **nunca é carregado** para o storage Supabase.

---

## 3. Fluxo C: OCR de Fornecedor

```
[Upload de PDF/Imagem] ➔ [Chamada Gemini Vision] ➔ [Exibição JSON] ➔ [Botão Confirmar] ➔ [Inserção Relacional]
```

* **Etapas e Rastreabilidade:**
  * Agente faz upload de tarifário/voucher em PDF na aba de arquivos do fornecedor (`suppliers.$id.tsx`).
  * O arquivo sobe para o bucket `supplier-files` no Storage.
  * O botão "Extrair com IA" aciona a Edge Function `supplier-ocr-extractor`.
  * A função aciona a API Gemini Flash 1.5 e extrai metadados, contatos e produtos formatados em JSON. O JSON é gravado no banco na coluna `ocr_data` da tabela `supplier_files`.
  * O frontend exibe a caixa de dados extraídos.
  * O Agente clica em "✓ Confirmar e persistir dados".
  * O sistema executa um loop no array `ocr.contacts` e faz `INSERT` em `supplier_contacts`. Executa loop em `ocr.products` e faz `INSERT` em `supplier_products`. Por fim, atualiza e enriquece os metadados da tabela `suppliers` e marca a coluna `ocr_reviewed: true`.
* **Diagnóstico:** **REAL PONTA A PONTA**. A ingestão de produtos e contatos do OCR foi totalmente integrada e concluída de forma relacional.

---

## 4. Fluxo D: Contratos e Library

```
[Contract Template] ➔ [Merge de Variáveis] ➔ [Public Signature Link] ➔ [KYC/IP Logging] ➔ [Snapshot JSON]
```

* **Etapas e Rastreabilidade:**
  * O agente gera o contrato de viagem.
  * O cliente recebe o link `/m/contract/:token`.
  * O cliente digita o nome e assina. O sistema coleta IP, User-Agent e gera uma assinatura KYC.
  * O contrato é gravado como assinado na tabela `contracts`. O PDF assinado é salvo no bucket de Storage.
* **Diagnóstico:** **PARCIAL**. O fluxo funciona, mas a conexão entre a biblioteca de cláusulas dinamizadas na Fase 5 e o editor/assinatura final carece de integração técnica (o snapshot do contrato é apenas um campo de texto corrido ou JSON bruto, não havendo verificação criptográfica estrita das cláusulas individuais blindadas).

---

## 5. Fluxo E: Alteração de Voo / Reacomodação

```
[Flight Segment] ➔ [Detector de Mudanças] ➔ [Itinerários Versões] ➔ [Diff Engine] ➔ [Cliente Aceite]
```

* **Etapas e Rastreabilidade:**
  * O agente insere os voos da viagem na aba Aéreos (`trips.$id.flights.tsx`).
  * O sistema permite cadastrar diferentes itinerários (tipo `original`, `operator_suggestion`, `customer_selected`, `confirmed`).
  * O agente pode comparar qualquer duas versões na tela. O sistema roda a função `compareItineraries` no service `flight-reconciliation.ts`. Ele calcula deltas em minutos de conexões, verifica se mudou aeroportos, voos, data, etc. E exibe badges coloridos de diff na tela.
  * O agente define o itinerário vigente clicando em "Ativar", que executa o set de status para `active` e arquiva as versões anteriores.
* **Diagnóstico:** **PARCIAL / UI STUB**. A listagem, criação e motor de diff de itinerários funcionam perfeitamente e gravam nas tabelas normalizadas (`flight_itineraries`, `flight_segments`). Contudo, o fluxo de envio automático de alternativas para o cliente escolher via portal e a geração automática do adendo contratual após o aceite são stubs, dependendo de ações manuais do agente para atualizar o status final.

---

## 6. Fluxo F: Atendimento / Omnichannel E-mail

```
[Central de Suporte] ➔ [Mensagem Chat] ➔ [E-mail Resend/Gmail (MOCK)] ➔ [Thread local]
```

* **Etapas e Rastreabilidade:**
  * O agente visualiza o ticket de suporte em `support.$ticket_id.tsx`.
  * Ele digita uma resposta e escolhe o canal "E-mail".
  * A mensagem é persistida na tabela local `ticket_messages`.
* **Diagnóstico:** **UI FAKE**. A mensagem é salva na base de dados interna, mas o gatilho da Edge Function ou API externa da central do Resend/Gmail não é acionado (o código do dispatch de rede real está desabilitado/comentado no frontend). O cliente nunca recebe o e-mail físico.
