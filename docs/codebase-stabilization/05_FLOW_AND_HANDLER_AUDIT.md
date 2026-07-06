# 05. Auditoria de Fluxos e Handlers - Turis

Este documento apresenta a análise técnica dos fluxos operacionais ponta a ponta da plataforma, identificando botões sem funções ativas, inputs sem persistência e conexões incompletas entre módulos.

---

## 1. Mapeamento de Fluxos Críticos

| Fluxo Operacional                     | Etapas                                                  | Handler no Frontend     | Service de Integração               | Persistência no Banco                   | Status  |
| :------------------------------------ | :------------------------------------------------------ | :---------------------- | :---------------------------------- | :-------------------------------------- | :------ |
| **Lead → Conversão em Passageiro**    | Lead é qualificado e aciona "Converter"                 | `handlePromoteLead`     | `CrmService.promoteLead`            | `profiles`, `trip_passengers`           | Real    |
| **Proposta → Conversão em Viagem**    | Cliente aceita proposta; admin clica em "Converter"     | `handleConvert`         | `convert_proposal_to_trip` RPC      | `trips`, `trip_passengers`, etc.        | Real    |
| **Viagem → Assinatura do Contrato**   | Admin envia contrato; cliente assina no portal público  | `handleSignContract`    | `sign_contract_with_token` RPC      | `trip_contracts`, `contract_signatures` | Real    |
| **Viagem → Emissão de Vouchers**      | Vouchers gerados via PDF e link público disponibilizado | `handleGenerateVoucher` | `VouchersService.saveVoucher`       | `boarding_cards`, Bucket `vouchers`     | Real    |
| **Viagem → Reacomodação de Voos**     | Admin cadastra sugestão e cliente aceita no mobile      | `handleAcceptVood`      | `accept_public_reaccommodation` RPC | `flight_itineraries`, `boarding_events` | Real    |
| **Grupo → Alocação de Rooming List**  | Passageiro é alocado em quarto com hotel, número e tipo | `handleSaveRoom`        | `RoomingService.saveRoom`           | `boarding_rooming_list`                 | Parcial |
| **Fornecedor → Upload de Fatura OCR** | Upload de PDF; IA extrai contatos e produtos            | `handleConfirmOcr`      | `supplier-ocr-extractor` EF         | `supplier_files.ocr_data`               | Parcial |
| **Suporte → Chat Omnichannel**        | Suporte responde ticket por e-mail                      | `sendReply`             | `SupportService.sendMessage`        | `ticket_messages`                       | Parcial |

---

## 2. Lacunas Funcionais e Mocks (UI Fake)

### 2.1 Confirmação de OCR de Fornecedores (`suppliers.$id.tsx`)

- **Problema:** A interface de detalhes do fornecedor permite realizar o upload de vouchers e rodar o extrator de OCR com Gemini Flash (Edge Function). O JSON retornado (`ocr_data`) é exibido em tela de forma rica (Contatos e Tarifas encontrados).
- **Lacuna Crítica:** O botão "Confirmar Dados" da UI executa apenas um update na tabela `supplier_files` marcando `ocr_reviewed = true`. Ele **não insere** os contatos extraídos na tabela `supplier_contacts` e nem os produtos na tabela `supplier_products`. O agente é obrigado a copiar e colar os dados manualmente para as abas vizinhas.
- **Solução:** Modificar o handler de confirmação para ler o JSON `ocr_data` e invocar de forma atômica `INSERT` em `supplier_contacts` e `supplier_products` para os dados aceitos.

### 2.2 Upload de Comprovante de Pagamento PIX (`p.$agency_slug.tour.$id.tsx`)

- **Problema:** Ao realizar uma inscrição pública em um passeio e escolher o Pix como método de pagamento, o checkout solicita o upload de comprovante de pagamento.
- **Lacuna Crítica:** O componente utiliza um `setInterval` fictício simulando o progresso do upload até `100%` e apenas armazena o nome do arquivo em um estado local React. O arquivo físico **não é enviado** para o Supabase Storage, inviabilizando a checagem financeira do agente.
- **Solução:** Integrar o input de arquivo com o Supabase Storage Client, fazendo o upload real no bucket `receipts` e salvando a URL gerada nas observações da tabela `group_tour_enrollments`.

### 2.3 Despacho de E-mails do Omnichannel (`support.$ticket_id.tsx`)

- **Problema:** A caixa de entrada de suporte unificada permite responder a mensagens e selecionar o canal de envio (E-mail Cliente ou E-mail Fornecedor).
- **Lacuna Crítica:** O formulário de envio de resposta grava a mensagem apenas localmente na tabela `ticket_messages`, simulando o envio. As integrações reais com a Edge Function `gmail-send` ou o serviço de despacho do Resend estão comentadas.
- **Solução:** Descomentar e parametrizar a chamada da Edge Function `gmail-send` no handler de envio do chat, passando os tokens e cabeçalhos de thread necessários.

### 2.4 Editor de Contratos e Biblioteca de Cláusulas (`agency.$slug.trips.$id.contract.tsx`)

- **Problema:** O Turis possui uma biblioteca rica de cláusulas dinâmicas (`contract_clauses`).
- **Lacuna Crítica:** A tela de emissão de contratos da viagem ignora essa biblioteca e continua acionando a RPC de 49 cláusulas legadas hardcoded em texto estático no backend, impossibilitando a customização e auditoria por cláusula no frontend.
- **Solução:** Atualizar o editor para listar as cláusulas ativas da tabela `contract_clauses` e salvar o JSONB compilado (`clause_snapshot`) no registro de contrato da viagem.
