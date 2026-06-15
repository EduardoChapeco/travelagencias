# Regras de Negócio — Turismo e Comercial

**Toda feature do TravelOS deve ser validada contra a rotina real de uma agência de viagens.**

---

## Entidades do Domínio

| Entidade              | Descrição                                        | Relações Principais                                |
| --------------------- | ------------------------------------------------ | -------------------------------------------------- |
| Lead                  | Contato interessado em viajar                    | → Cliente, → Cotação                               |
| Cliente               | Pessoa física ou jurídica cadastrada             | → Viagem, → Contrato, → Pagamento                  |
| Viajante              | Pessoa que viaja (pode ser diferente do cliente) | → Passageiro                                       |
| Passageiro            | Pessoa em um trecho/viagem específica            | → Viagem, → Voucher, → Embarque                    |
| Cotação               | Proposta de preço para viagem                    | → Lead/Cliente, → Viagem                           |
| Proposta              | Documento formal de venda                        | → Cliente, → Viagem                                |
| Viagem (Trip)         | Pacote vendido com roteiro                       | → Cliente, → Passageiros, → Vouchers, → Pagamentos |
| Roteiro (Itinerary)   | Dia a dia da viagem                              | → Viagem                                           |
| Fornecedor (Supplier) | Operadora, hotel, aéreo                          | → Viagem, → Voucher                                |
| Voucher               | Documento de confirmação de serviço              | → Viagem, → Passageiro                             |
| Contrato              | Documento jurídico de venda                      | → Viagem, → Cliente                                |
| Pagamento             | Parcela ou transação financeira                  | → Viagem, → Plano de Pagamento                     |
| Comissão              | Valor recebido pela agência                      | → Viagem, → Fornecedor                             |
| Embarque (Boarding)   | Controle de embarque                             | → Viagem, → Passageiro                             |
| PNR                   | Código de reserva aérea                          | → Viagem                                           |
| Documento             | Passaporte, RG, CPF                              | → Passageiro                                       |
| Visto                 | Processo consular                                | → Cliente                                          |
| Seguro Viagem         | Apólice de seguro                                | → Viagem, → Passageiro                             |
| Suporte/Pós-Venda     | Atendimento pós-viagem                           | → Viagem, → Cliente                                |
| Cancelamento          | Solicitação de cancelamento                      | → Viagem, → Contrato                               |
| Reembolso             | Devolução financeira                             | → Cancelamento, → Pagamento                        |
| Remarcação            | Alteração de datas/roteiro                       | → Viagem                                           |
| Corporate/RFP         | Requisição corporativa                           | → Cliente (empresa), → Cotação                     |
| Agente                | Consultor/funcionário da agência                 | → Lead, → Viagem                                   |
| Agência               | Empresa de turismo (tenant)                      | → tudo                                             |
| Admin Master          | Super admin da plataforma                        | → Agências                                         |

---

## Perguntas Obrigatórias Para Toda Feature

Antes de implementar qualquer feature, responder:

1. **Isso existe na rotina real de uma agência?** Se não, por que estamos criando?
2. **Quem usa?** (Agente, cliente, admin, fornecedor)
3. **Quando usa?** (Venda, operação, pós-venda, gestão)
4. **Que dado entra?** (Campos, fontes, validações)
5. **Que dado sai?** (Relatórios, documentos, notificações)
6. **Qual próximo módulo recebe esse dado?** (Fluxo end-to-end)
7. **Que status existem?** (Ciclo de vida do registro)
8. **Que erro humano essa feature evita?** (Valor de automação)
9. **Que risco jurídico essa feature evita?** (Contratos, LGPD)
10. **Que venda essa feature ajuda a fechar?** (Valor comercial)
11. **Que operação essa feature ajuda a controlar?** (Valor operacional)
12. **Que log precisa?** (Auditoria, rastreabilidade)
13. **Que permissão precisa?** (Roles, RLS)
14. **Que documento precisa?** (PDF, contrato, voucher)
15. **Que alerta precisa?** (Notificação, email, WhatsApp)

---

## Fluxos Críticos

### Fluxo de Venda

```
Lead → Qualificação → Cotação → Proposta → Contrato → Pagamento → Viagem Confirmada
```

### Fluxo Operacional

```
Viagem Confirmada → Roteiro → Fornecedores → Vouchers → Embarque → Pós-Venda
```

### Fluxo Financeiro

```
Cotação → Plano de Pagamento → Parcelas → Cobranças → Comissões → Relatório
```

### Fluxo do Cliente (Portal)

```
Login → Minhas Viagens → Detalhes → Vouchers → Documentos → Financeiro → Memórias
```

---

## Regras de Negócio Fundamentais

1. **Uma viagem pertence a um cliente e uma agência.**
2. **Uma viagem pode ter múltiplos passageiros** (e o cliente pode não ser passageiro).
3. **Cotação e viagem são entidades diferentes.** Cotação é proposta; viagem é confirmada.
4. **Comissão é calculada server-side**, nunca no frontend.
5. **Contrato precisa de assinatura** (digital ou upload).
6. **Voucher é documento final** entregue ao passageiro, não rascunho.
7. **Cancelamento tem multas e regras** — não é simples DELETE.
8. **PNR e localizadores são dados críticos** — nunca editáveis sem log.
9. **Fornecedores têm acordos comerciais** — comissão por fornecedor.
10. **Relatórios financeiros são obrigatórios** para gestão de agência.
