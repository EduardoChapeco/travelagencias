# 04. Integração de Propostas, Viagens e Fornecedores (Proposal, Trip, and Supplier Integration)

Este documento detalha as dependências e o fluxo relacional entre Propostas, Viagens, Vouchers, Clientes e Fornecedores no TravelOS.

---

## 1. O Ciclo de Conversão de Ofertas

Quando uma proposta comercial é aceita pelo cliente final, o sistema realiza a transição estrutural:

```txt
Proposta (accepted)
  │
  ├──> Procedure `convert_proposal_to_trip` é chamada
  │
  ├──> [Passo 1: Criar Viagem]
  │    Insere registro correspondente em `public.trips` copiando dados de destino e datas.
  │
  ├──> [Passo 2: Migrar Passageiros]
  │    Transfere passageiros da cotação para `public.trip_passengers`.
  │
  ├──> [Passo 3: Mapear Vínculos Contábeis]
  │    Associa os custos, markups e recebíveis em `public.financial_records`.
  │
  └──> [Passo 4: Gerar Vouchers]
       Copia a lista de acomodações, voos e tours JSON em `public.vouchers` vinculando ao ID da Viagem.
```

---

## 2. Relação com Supplier Intelligence

- **Supplier Link**: Cada componente de hotel ou trecho aéreo pode referenciar um fornecedor cadastrado na tabela de inteligência de fornecedores.
- **Controle de Unicidade**: A tabela `external_entity_links` mapeia reservas físicas geradas no conector (como o Infotravel) com a agência e a viagem correspondente, servindo de barreira contra faturamentos e importações redundantes.

---

## 3. Segurança de Documentos e Uploads

- **Buckets Privados**: Faturas de fornecedores e contratos assinados são alocados no bucket `passenger-documents`, com políticas de RLS no Supabase restringindo acesso apenas a usuários associados à agência detentora do registro (`auth.jwt()->>'agency_id'`).
- **Links Assinados**: Toda URL visualizada pelo operador na interface ou pelo cliente no Portal é temporária (Signed URL) com validade padrão de 15 minutos.
