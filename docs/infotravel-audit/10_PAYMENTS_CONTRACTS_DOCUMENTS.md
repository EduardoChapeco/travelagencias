# 10. Integração Contábil: Pagamentos, Contratos e Documentos

Este documento detalha o mapeamento e a sincronização de cobranças, recebimentos, Notas Fiscais (Invoices) e termos contratuais emitidos pela plataforma **Infotravel/Infotera**, definindo as diretrizes de persistência e conformidade contábil.

---

## 1. Mapeamento de Recursos Financeiros e Documentais

A API do Infotravel expõe endpoints específicos para gerenciar e validar a cadeia de custódia e recebimentos das viagens:

- **Contratos da Reserva**: A chamada `GET /api/v1/utility/contract/{idReserva}` retorna o contrato e as políticas anexadas à reserva pela operadora.
- **Nota Fiscal / Invoice**: A chamada `GET /api/v1/invoice/generate/{idPayment}` retorna os dados estruturados da nota gerada (`ApiInvoice`) e o link físico do documento.
- **Consulta PIX**: A chamada `GET /api/v1/payment/pix/consult/{id}` retorna o status do pagamento via Pix (`ApiPaymentPix`) para validação e liquidação automática.

---

## 2. Fluxo Contábil e Sincronização de Caixa

Quando uma transação de pagamento é confirmada na API do Infotravel, o Turis realiza a propagação para o módulo contábil local:

```txt
Handshake de Pagamento (PIX / Cartão de Crédito) no Infotravel
  │
  ├──> webhook ou consulta periódica detecta o status `paymentConfirmed = true`
  │
  ├──> [Fase 1: Mapeamento de Transação]
  │    Cria registro correspondente na tabela local `public.cash_transactions`.
  │    Mapeia os valores de base, taxas e comissões.
  │    Salva o ID do pagamento da Infotravel em `external_entity_links` (tipo `payment`).
  │
  ├──> [Fase 2: Conciliação e Propagação para o Livro-Razão]
  │    Dispara o trigger automático do PostgreSQL `financial_ledger_entries`.
  │    Gera os lançamentos contábeis de débito e crédito imutáveis.
  │
  └──> [Fase 3: Importação de Invoice]
       Chama `GET /api/v1/invoice/generate/{idPayment}` para obter a nota fiscal.
       Salva a cópia estruturada em `public.financial_records` e o PDF no Storage privado.
```

---

## 3. Segurança e Armazenamento Privado de Documentos

Os termos contratuais e notas fiscais de operadoras contêm informações sensíveis de tarifas corporativas, comissões internas e dados pessoais dos viajantes (PII).

- **Armazenamento Seguro**: Todos os PDFs de contratos e invoices baixados da API da Infotravel devem ser armazenados em um bucket privado do Supabase Storage (`supplier-files` ou `invoice-vault`) com acesso restritivo.
- **Proibição de Links Públicos de Longo Prazo**: O sistema nunca deve expor ou salvar no banco de dados a URL crua e pública do documento. O acesso na UI do operador ou do cliente B2C deve ser concedido exclusivamente por meio de links assinados temporários (`Signed URLs`) com tempo de expiração máximo de 15 minutos, gerados dinamicamente mediante comprovação de permissão do usuário.
