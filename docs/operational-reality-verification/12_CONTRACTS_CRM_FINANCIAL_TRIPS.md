# 12. Contracts, CRM, Financial, and Trips (Contratos, CRM, Financeiro e Viagens)

## 1. CRM & Funil de Vendas
* O funil de vendas é alimentado por leads em `crm_leads`.
* O reordenamento de colunas e movimentação de leads persistem no banco de dados.

## 2. Contratos & Versionamento
* O sistema possui biblioteca de cláusulas e versionamento de minutas associadas a viagens, clientes e propostas.
* A geração do arquivo em PDF e o upload para o Storage utilizam rotas internas do Supabase.

## 3. Módulo Financeiro
* Oferece controle de caixas e lançamentos financeiros (pagamentos, recebíveis e conciliações) associados a reservas.
* Cálculos de comissão e liquidação de parcelas são tratados em procedures no PostgreSQL.

## 4. Detalhes da Viagem
* A página de detalhes de viagens possui abas para: dados gerais, passageiros, hospedagem, aéreos, vouchers e financeiro.
* A aba de reacomodação (reaccommodation workflow) está integrada para disparar notificações se houver reacomodações de voos.
