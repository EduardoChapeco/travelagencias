# 01. Inventário Completo de Endpoints OpenAPI Infotravel

Este documento apresenta o inventário exaustivo e a classificação por domínio de todos os **70 endpoints oficiais** expostos na documentação OpenAPI (`api-doc.json`) da plataforma **Infotravel/Infotera**.

---

## 1. Informações de Cabeçalho da API
* **Título**: Infotravel API
* **Versão da API**: 1.0
* **Descrição**: Manual oficial para integração à plataforma de reservas GDS e Backoffice Infotravel.
* **Base URL**: `http://api.infotravel.com.br/api/v1` (ou URL personalizada do servidor da operadora/cliente).
* **Total de Endpoints**: 70
* **Total de Schemas (Tipos)**: 418
* **Formato de Definição**: OpenAPI 3.0 (JSON)

---

## 2. Inventário de Endpoints por Domínio

| Método | Endpoint | Finalidade | Auth | Request Schema (Ref) | Response Schema (Ref) | Status no TravelOS |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| **POST** | `/api/v1/user/login` | Autenticação e login de operadora/usuário para obter JWT | Não | `UserLoginRQ` | `UserLoginRS` | **MOCK** (Chama `/auth/login`) |
| **POST** | `/api/v1/user/register` | Registro de novo usuário na plataforma Infotravel | Não | `UserRegisterRQ` | `UserRegisterRS` | **NÃO IMPLEMENTADO** |
| **PUT** | `/api/v1/user/{userId}` | Atualização cadastral de usuário | Sim | `UserUpdateRQ` | `UserUpdateRS` | **NÃO IMPLEMENTADO** |
| **POST** | `/api/v1/user/recover/password`| Recuperação de senha do usuário | Não | `UserForgotPasswordRQ` | `UserForgotPasswordRS` | **NÃO IMPLEMENTADO** |
| **GET** | `/api/v1/avail/hotel` | Consulta de disponibilidade de hotéis (filtros de busca) | Sim | N/A (Query Params) | `HotelAvailbilityRS` | **MOCK** (Chama `/search/hotel`) |
| **POST** | `/api/v1/avail/hotel` | Consulta de disponibilidade de hotéis (payload complexo) | Sim | `HotelAvailbilityRQ` | `HotelAvailbilityRS` | **NÃO IMPLEMENTADO** |
| **GET** | `/api/v1/avail/flight` | Consulta de disponibilidade de voos / trechos aéreos | Sim | N/A (Query Params) | `FlightAvailbilityRS` | **MOCK** (Chama `/search/flight`) |
| **GET** | `/api/v1/avail/transfer` | Consulta de disponibilidade de traslados/transfers | Sim | N/A (Query Params) | `TransferAvailbilityRS` | **NÃO IMPLEMENTADO** |
| **GET** | `/api/v1/avail/activity` | Consulta de disponibilidade de atividades e passeios | Sim | N/A (Query Params) | `ActivityAvailbilityRS` | **NÃO IMPLEMENTADO** |
| **GET** | `/api/v1/avail/activity/detail`| Detalhamento de atividades e opcionais de passeios | Sim | N/A (Query Params) | N/A | **NÃO IMPLEMENTADO** |
| **GET** | `/api/v1/avail/experience` | Consulta de disponibilidade de experiências integradas | Sim | N/A (Query Params) | `ExperiencAvailbilityRS` | **NÃO IMPLEMENTADO** |
| **GET** | `/api/v1/avail/insurance` | Consulta de disponibilidade de seguros de viagem | Sim | N/A (Query Params) | `InsuranceAvailbilityRS` | **NÃO IMPLEMENTADO** |
| **GET** | `/api/v1/avail/ticket` | Consulta de disponibilidade de ingressos/entradas | Sim | N/A (Query Params) | `TicketAvailbilityRS` | **NÃO IMPLEMENTADO** |
| **GET** | `/api/v1/avail/chip` | Consulta de disponibilidade de chips de viagem/telefonia | Sim | N/A (Query Params) | `ChipAvailbilityRS` | **NÃO IMPLEMENTADO** |
| **GET** | `/api/v1/avail/vehicle` | Consulta de disponibilidade de aluguel de veículos | Sim | N/A (Query Params) | `VehicleAvailbilityRS` | **NÃO IMPLEMENTADO** |
| **GET** | `/api/v1/avail/circuit` | Consulta de disponibilidade de circuitos turísticos complexos | Sim | N/A (Query Params) | `CircuitAvailbilityRS` | **NÃO IMPLEMENTADO** |
| **POST** | `/api/v1/avail/circuit/calendar`| Calendário tarifário de circuitos turísticos | Sim | N/A (Body JSON) | N/A | **NÃO IMPLEMENTADO** |
| **POST** | `/api/v1/avail/circuit/daily-details`| Detalhes tarifários diários de circuitos | Sim | N/A (Body JSON) | N/A | **NÃO IMPLEMENTADO** |
| **GET** | `/api/v1/avail/bus` | Consulta de disponibilidade de passagens de ônibus | Sim | N/A (Query Params) | `BusAvailbilityRS` | **NÃO IMPLEMENTADO** |
| **GET** | `/api/v1/avail/package/{packageType}`| Consulta de disponibilidade de pacotes consolidados | Sim | N/A (Query Params) | `PackageAvailbilityRS` | **NÃO IMPLEMENTADO** |
| **GET** | `/api/v1/avail/servicePackage`| Consulta de disponibilidade de pacotes de serviços | Sim | N/A (Query Params) | `ServicePackageAvailbilityRS`| **NÃO IMPLEMENTADO** |
| **GET** | `/api/v1/avail/serviceOther` | Consulta de disponibilidade de serviços diversos | Sim | N/A (Query Params) | `ServiceOtherAvailbilityRS` | **NÃO IMPLEMENTADO** |
| **GET** | `/api/v1/avail/hotel/rebooking`| Consulta de reacomodação e rebooking de hotéis | Sim | N/A (Query Params) | N/A | **NÃO IMPLEMENTADO** |
| **POST** | `/api/v1/checkRate` | Validação de tarifa e cotação em tempo real (check-rate) | Sim | `CheckRateRQ` | `CheckRateRS` | **NÃO IMPLEMENTADO** |
| **POST** | `/api/v1/booking` | Criação de reserva (pré-reserva em estado pendente) | Sim | `BookingRQ` | `BookingRS` | **NÃO IMPLEMENTADO** |
| **GET** | `/api/v1/booking/{id}` | Consulta detalhada de reserva existente | Sim | N/A (Path Param) | `BookingRS` (ou `ApiBooking`)| **MOCK** (Chama `/booking/{id}`) |
| **POST** | `/api/v1/booking/{id}/confirm`| Confirmação física de reserva com operadora | Sim | N/A (Body) | N/A | **NÃO IMPLEMENTADO** |
| **DELETE**| `/api/v1/booking/{id}/cancel` | Cancelamento eletrônico de reserva | Sim | N/A (Path Param) | N/A | **NÃO IMPLEMENTADO** |
| **POST** | `/api/v1/rebooking/{id}` | Execução de reacomodação / alteração de reserva | Sim | N/A (Path Param) | N/A | **NÃO IMPLEMENTADO** |
| **GET** | `/api/v1/booking/search` | Listagem de reservas associadas ao usuário | Sim | N/A (Query Params) | `BookingSearchRS` | **NÃO IMPLEMENTADO** |
| **POST** | `/api/v1/applyCoupon/{id}/{coupon}`| Aplicação de cupom de desconto à reserva | Sim | N/A (Path Params) | N/A | **NÃO IMPLEMENTADO** |
| **PUT** | `/api/v1/product/observation/{id}`| Atualização de observações internas do produto | Sim | N/A (Path Param) | N/A | **NÃO IMPLEMENTADO** |
| **PUT** | `/api/v1/product/transfer/{id}`| Atualização cadastral de transfer/traslado | Sim | N/A (Path Param) | N/A | **NÃO IMPLEMENTADO** |
| **PUT** | `/api/v1/product/circuit/{id}/service`| Atualização de serviços opcionais no circuito | Sim | N/A (Path Param) | N/A | **NÃO IMPLEMENTADO** |
| **GET** | `/api/v1/backoffice/booking/search`| Busca de reservas consolidadas (Backoffice) | Sim | N/A (Query Params) | `BackOfficeSearchRS` | **NÃO IMPLEMENTADO** |
| **GET** | `/api/v1/backoffice/booking/{id}`| Detalhes da reserva para backoffice | Sim | N/A (Path Param) | `ApiBackOfficeBooking` | **NÃO IMPLEMENTADO** |
| **GET** | `/api/v1/backoffice/checkBooking/{id}`| Verificação física de status de integração da reserva | Sim | N/A (Path Param) | N/A | **NÃO IMPLEMENTADO** |
| **GET** | `/api/v1/backoffice/booking/searchUncheckedBooking`| Busca de reservas não conciliadas | Sim | N/A (Query Params) | N/A | **NÃO IMPLEMENTADO** |
| **GET** | `/api/v1/backoffice/booking/searchRebooking`| Busca de reservas com reacomodação ativa | Sim | N/A (Query Params) | N/A | **NÃO IMPLEMENTADO** |
| **PUT** | `/api/v1/backoffice/booking/update`| Vinculação e atualização de PNR/Código externo | Sim | N/A (Body) | N/A | **NÃO IMPLEMENTADO** |
| **GET** | `/api/v1/backoffice/client/{externalCode}`| Busca de cliente por código do Backoffice | Sim | N/A (Path Param) | `ApiClient` | **NÃO IMPLEMENTADO** |
| **GET** | `/api/v1/backoffice/person` | Listagem de pessoas cadastradas no Backoffice | Sim | N/A (Query Params) | N/A | **NÃO IMPLEMENTADO** |
| **GET** | `/api/v1/backoffice/person/{id}`| Detalhe cadastral de passageiro/pessoa | Sim | N/A (Path Param) | `ApiPerson` (ou similar) | **NÃO IMPLEMENTADO** |
| **GET** | `/api/v1/backoffice/hotel/{id}` | Detalhes de hotel curado no catálogo do Backoffice | Sim | N/A (Path Param) | `ApiHotel` | **NÃO IMPLEMENTADO** |
| **POST** | `/api/v1/billing/import` | Importação em lote de faturas / billing contábil | Sim | N/A (Body JSON) | N/A | **NÃO IMPLEMENTADO** |
| **GET** | `/api/v1/company/{id}` | Busca de empresa parceira por identificador | Sim | N/A (Path Param) | `ApiCompany` (ou similar) | **NÃO IMPLEMENTADO** |
| **GET** | `/api/v1/company` | Listagem de empresas parceiras | Sim | N/A (Query Params) | N/A | **NÃO IMPLEMENTADO** |
| **GET** | `/api/v1/company/code/{sgEmpresa}`| Busca de empresa parceira por sigla/código | Sim | N/A (Path Param) | N/A | **NÃO IMPLEMENTADO** |
| **GET** | `/api/v1/financial/cashRegister/search`| Busca de lançamentos e fluxo de caixa | Sim | N/A (Query Params) | N/A | **NÃO IMPLEMENTADO** |
| **GET** | `/api/v1/financial/searchCreditLetter`| Busca de cartas de crédito emitidas | Sim | N/A (Query Params) | N/A | **NÃO IMPLEMENTADO** |
| **POST** | `/api/v1/financial/creditLetter`| Geração de nova carta de crédito contábil | Sim | N/A (Body JSON) | N/A | **NÃO IMPLEMENTADO** |
| **GET** | `/api/v1/financialposting/approval/{id}`| Aprovação de lançamento contábil pendente | Sim | N/A (Path Param) | N/A | **NÃO IMPLEMENTADO** |
| **GET** | `/api/v1/invoice/generate/{idPayment}`| Geração de Nota Fiscal / Invoice de pagamento | Sim | N/A (Path Param) | `ApiInvoice` | **NÃO IMPLEMENTADO** |
| **GET** | `/api/v1/payment/pix/consult/{id}`| Consulta e conciliação de recebimento PIX | Sim | N/A (Path Param) | `ApiPaymentPix` | **NÃO IMPLEMENTADO** |
| **GET** | `/api/v1/pointRules` | Consulta de regras de pontuação / fidelidade | Sim | N/A (Query Params) | `PointRules` | **NÃO IMPLEMENTADO** |
| **GET** | `/api/v1/package/{idPacote}` | Consulta de detalhes do pacote turístico | Sim | N/A (Path Param) | `ApiPackage` | **NÃO IMPLEMENTADO** |
| **POST** | `/api/v1/service/service/import`| Importação e catalogação de novas tarifas de serviço| Sim | N/A (Body JSON) | N/A | **NÃO IMPLEMENTADO** |
| **GET** | `/api/v1/searchEngine/allottedDates/flight`| Consulta de datas com bloqueios de voo aéreo | Sim | N/A (Query Params) | N/A | **NÃO IMPLEMENTADO** |
| **GET** | `/api/v1/searchEngine/package/{packageType}/period`| Consulta de períodos ativos de pacotes | Sim | N/A (Path Param) | N/A | **NÃO IMPLEMENTADO** |
| **GET** | `/api/v1/searchEngine/package/{packageType}/destination`| Destinos disponíveis para o pacote | Sim | N/A (Path Param) | N/A | **NÃO IMPLEMENTADO** |
| **GET** | `/api/v1/searchEngine/package/{packageType}/origin`| Origens disponíveis para o pacote | Sim | N/A (Path Param) | N/A | **NÃO IMPLEMENTADO** |
| **GET** | `/api/v1/utility/hotelDetail/{keyDetail}`| Detalhamento estendido de hotel (comodidades) | Sim | N/A (Path Param) | N/A | **NÃO IMPLEMENTADO** |
| **GET** | `/api/v1/utility/hotel/{keyDetail}/reviews`| Consulta de avaliações do hotel | Sim | N/A (Path Param) | N/A | **NÃO IMPLEMENTADO** |
| **GET** | `/api/v1/utility/county/{countyName}`| Busca de municípios e códigos cadastrados | Sim | N/A (Path Param) | `CountySearchRS` | **NÃO IMPLEMENTADO** |
| **GET** | `/api/v1/utility/zipcode/{nrcep}` | Busca de CEP e autopreenchimento de endereços | Sim | N/A (Path Param) | N/A | **NÃO IMPLEMENTADO** |
| **GET** | `/api/v1/utility/coupon/{cdCupom}`| Detalhe e validade do cupom de desconto | Sim | N/A (Path Param) | `CheckCouponRS` | **NÃO IMPLEMENTADO** |
| **GET** | `/api/v1/utility/contract/{idReserva}`| Obtenção de contratos de fornecedor da reserva | Sim | N/A (Path Param) | `Contract` | **NÃO IMPLEMENTADO** |
| **GET** | `/api/v1/whiteLabel/{id}` | Configurações de White Label para portais | Sim | N/A (Path Param) | N/A | **NÃO IMPLEMENTADO** |
| **GET** | `/api/v1/b2c/listAllItB2c` | Listagem de portais B2C ativos | Sim | N/A (Query Params) | N/A | **NÃO IMPLEMENTADO** |
| **GET** | `/api/v1/b2c/getB2cConfigByDomain/{domain}`| Configurações de portal B2C por domínio | Sim | N/A (Path Param) | N/A | **NÃO IMPLEMENTADO** |
| **POST** | `/api/v1/b2c/updateB2cConfigByDomain/{domain}`| Atualização de parâmetros do portal B2C | Sim | N/A (Path Param) | N/A | **NÃO IMPLEMENTADO** |
