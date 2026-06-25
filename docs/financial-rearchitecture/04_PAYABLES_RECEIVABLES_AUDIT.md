# Contas a Pagar e Receber (TravelOS)

Este relatório audita a estrutura de controles de Contas a Pagar (Payables) e Contas a Receber (Receivables) no TravelOS, focando no ciclo de vida das parcelas, validação de comprovantes e conformidade com a segurança de anexos.

---

## 1. Mapeamento do Fluxo de Recebíveis

O sistema atual divide as contas a receber em duas frentes:

1. **Recebíveis de Clientes (Vendas Diretas/Parceladas)**:
   - Controlados via tabela `public.payment_plans` e `public.payment_installments`.
   - Quando o passageiro realiza o upload de um comprovante no portal, o status da parcela é alterado para `receipt_status = 'pending'`.
   - O financeiro valida o comprovante no painel de [Conciliação Diária](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.financial.reconciliation.tsx). Se aprovado, a parcela é quitada (`status = 'paid'`) e um registro correspondente é lançado no caixa de destino (`public.cash_transactions`).
2. **Recebíveis de Operadoras (Comissões e Over)**:
   - Lançados de forma difusa em `public.financial_records` com tipo `income`.
   - O matching é semi-manual, inexistindo tabelas de controle de acordos com operadoras ou importação automatizada de extratos.

---

## 2. Fluxo de Contas a Pagar (Despesas Operacionais e Fixas)

As despesas são registradas unicamente na tabela genérica `public.financial_records` (onde `type = 'expense'`).

- **Lançamentos recorrentes** (como aluguel, contador, etc.): Não há tabela de recorrências ou agendamentos periódicos. O lançamento é inserido manualmente mês a mês.
- **Comprovantes de Saída**: O anexo do comprovante é salvo no storage, mas a associação com a conta de débito ou centro de custo é manual.

---

## 3. Segurança e Privacidade dos Comprovantes

> [!NOTE]
> Em total conformidade com a LGPD e regras de compliance do master PRD:
>
> - O bucket de arquivos `financial-receipts` está configurado corretamente como **privado** (`public = false`) na tabela `storage.buckets`.
> - Os arquivos são acessíveis apenas mediante URLs assinadas temporárias (`signedUrls`), prevenindo o acesso público a dados bancários ou documentos pessoais de clientes por varredura de URLs.

---

## 4. Gaps Operacionais Identificados

### 4.1 Inexistência do Conceito de "Centro de Custo"

- **Problema**: O PRD exige controle rigoroso de resultados por Centro de Custo (ex: operação geral, administrativo, marketing, tecnologia, grupos específicos, investimento inicial).
- **Estado Atual**: A tabela `financial_records` não possui coluna de chave estrangeira para centros de custo ou classificação similar.
- **Impacto**: Impossibilidade de gerar relatórios e DRE filtrados por área de negócio ou projeto.

### 4.2 Falta de Split Físico de Meios de Pagamento

- **Problema**: Vendas frequentemente combinam múltiplos meios de pagamento (Pix para agência + Cartão direto para operadora).
- **Estado Atual**: O sistema unifica o plano de pagamento como uma única entidade vinculada ao cliente, sem mapear o fluxo financeiro de cada fração da venda (Split).
- **Impacto**: Dificuldade para saber quanto do caixa realmente deve entrar na agência versus quanto foi pago direto a terceiros, gerando erros nos relatórios de faturamento bruto.
