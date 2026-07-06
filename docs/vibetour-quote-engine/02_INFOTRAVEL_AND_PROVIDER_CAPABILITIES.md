# 02. Recursos do Provedor Infotravel (Infotravel and Provider Capabilities)

Este documento descreve a capacidade operacional do conector Infotravel e como ele atua como provedor primário de ofertas de voos e hotéis.

---

## 1. Inventário de Endpoints Utilizados no Conector

O arquivo `supabase/functions/infotravel-connector/index.ts` integra os seguintes caminhos físicos da API Infotravel:

- **Autenticação**: `POST /api/v1/authenticate`
  - _Uso_: Gera o token JWT dinâmico necessário para todas as chamadas.
  - _Estado_: Homologado contra conexão real (retorna 400 Bad Request se credenciais forem inválidas).
- **Disponibilidade de Hotéis**: `GET /api/v1/avail/hotel`
  - _Uso_: Busca hospedagens por datas, destino e ocupação.
  - _Estado_: Homologado.
- **Disponibilidade de Voos**: `GET /api/v1/avail/flight`
  - _Uso_: Busca rotas aéreas, classes tarifárias e comissões.
  - _Estado_: Homologado.
- **Criação de Reserva**: `POST /api/v1/booking`
  - _Uso_: Envia passageiros e serviços para gerar pré-reserva no GDS.
  - _Estado_: Homologado.
- **Importação / Detalhes**: `GET /api/v1/booking/{id}`
  - _Uso_: Consulta os vouchers e PNRs finais de uma reserva ativa.
  - _Estado_: Homologado.
- **Busca Backoffice**: `GET /api/v1/backoffice/booking/search`
  - _Uso_: Varre reservas criadas em intervalos de datas para sincronização em lote.
  - _Estado_: Homologado.

---

## 2. Adaptação de URL e Protocolo (HTTPS Lock)

- **Forçamento Programático**: A função `resolveUrl` intercepta qualquer URL cadastrada e converte `http://` em `https://` antes de qualquer chamada HTTP, eliminando o erro de redirecionamento 301 (Vite/Deno descantando corpos de requests POST em redirecionamentos inseguros).

---

## 3. Classificação de Cobertura

- **Mocks**: **0**. Toda a comunicação do conector com a Incomum Viagens / Infotravel é autêntica e conectada.
- **Bilateralidade Contábil**: **PARCIAL**. O conector lê dados de PIX e faturamento de forma linear, mas ainda não permite a alteração/cancelamento de reservas a partir do Turis.
