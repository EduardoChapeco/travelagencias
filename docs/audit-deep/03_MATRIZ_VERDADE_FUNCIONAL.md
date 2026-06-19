# 03. Matriz de Verdade Funcional

Este documento consolida a classificação operacional e de engenharia de cada funcionalidade do TravelOS após a varredura profunda no código-fonte, banco de dados remoto e APIs.

---

## 1. Classificação das Funcionalidades

| Área Funcional | Funcionalidade | Prometido | Código Existe | Banco Existe | UI Existe | Integração Existe | Testado | Status Real | Evidência / Notas |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Design System** | DS Flat Light Editorial | Sem sombras, responsividade adaptativa. | Sim | Não aplicável | Sim | Sim | Não | **PARCIAL** | Sombras removidas na maioria dos componentes, mas restam em sub-modais do Financeiro. |
| **Design System** | Brand Kit Propagação | Fontes e cores dinâmicas no PDF sem flicker. | Sim | Sim (`brand_kit`) | Sim | Sim | Não | **REAL NÃO TESTADO** | Injeção síncrona no contexto via localStorage; ready-checking de fontes no html2canvas. |
| **Portal / CMS** | Site Builder Core | Canvas de blocos e seções persistentes. | Sim | Sim (`portal_pages`) | Sim | Sim | Não | **REAL NÃO TESTADO** | Rotas e blocos gravados no banco. |
| **Portal / CMS** | Biolink Builder | Template mobile e bloco de links rápidos. | Sim | Sim | Sim | Sim | Não | **REAL NÃO TESTADO** | Biolink ativo como modo especial do builder. |
| **Vendas / CRM** | Vitrine de Pacotes | Inscrição B2C, cadastro de leads e checkout. | Sim | Sim (`group_tour_enrollments`) | Sim | Sim | Não | **PARCIAL** | Inscrição gera lead no CRM, mas comprovante de Pix usa upload fake. |
| **Catalog / IA** | Catalog de Fornecedores | CRUD de produtos, contatos e reviews. | Sim | Sim (`supplier_products`, etc.) | Sim | Sim | Não | **PARCIAL** | Abas e tabelas ativas nos detalhes do fornecedor, mas sem autocomplete generalizado. |
| **Catalog / IA** | OCR de Vouchers | Extração por IA e inserção relacional. | Sim | Sim (`supplier_files`) | Sim | Sim | Não | **REAL NÃO TESTADO** | Edge Function extrai dados; botão "Confirmar" insere produtos/contatos e atualiza metadados. |
| **Contratos** | Clause Library | Biblioteca de cláusulas, editor e snapshots. | Sim | Sim (`contract_clauses`) | Sim | Sim | Não | **PARCIAL** | Cláusulas criadas, mas gerador de contratos da viagem (`trips.$id.contract.tsx`) usa stubs em áreas chaves. |
| **Documentos** | PDF/PNG Exports | Download estável de propostas e vouchers. | Sim | Sim (Buckets) | Sim | Sim | Não | **PARCIAL** | Downloads acontecem via html2canvas no client-side; sem render jobs em fila no backend. |
| **Embarque** | Check-in móvel | Portal `/m/checkin/$token` com voos e deep links. | Sim | Não (`checkin_links` ausente) | Sim | Não | Não | **MOCK** | Tabelas de links de check-in não existem no banco; links no front são estáticos. |
| **Atendimento** | Omnichannel Inbox | Chat e e-mails Gmail/Resend unificados. | Sim | Sim (`ticket_messages`) | Sim | Não | Não | **PARCIAL** | Persistência local do chat funciona, mas chamada de APIs do Gmail/Resend está comentada/mockada. |
| **Operacional** | Rooming List | Alocação de quartos e controle de lotação. | Sim | Sim (`boarding_rooming_list`) | Sim | Sim | Não | **PARCIAL** | CRUD de quartos persistido, mas sem UI de Drag and Drop (Dnd) e sem exportação. |
| **Operacional** | Destino & Segurança | Dicas consulares e saúde no portal. | Sim | Sim (`destination_info`) | Sim | Sim | Não | **REAL NÃO TESTADO** | Consumido no portal do cliente móvel filtrando apenas destinos revisados (`reviewed_at`). |
| **Operacional** | Conferência de Voos | Fila de auditoria de voos (60 dias). | Sim | Sim (`boarding_tickets`) | Sim | Sim | Não | **PARCIAL** | Fila de bilhetes editável, mas sem automações de reconfirmação com operadoras. |
| **Operacional** | Reacomodação Aérea | Versionamento de voos, diffs e aceites. | Sim | Sim (`flight_itineraries`) | Sim | Sim | Não | **PARCIAL** | A rota `trips.$id.flights.tsx` tem lógica de versionamento e diff, mas fluxo de aceite é stub. |
| **Operacional** | Confirmação de Reserva | Localizadores por serviço na viagem. | Sim | Sim (`trip_confirmation_items`) | Sim | Sim | Não | **REAL NÃO TESTADO** | Rota confirmation, CRUD de localizadores e exibição no portal do cliente integrados. |

---

## 2. Métricas de Status Real das Funcionalidades

* **Funcionalidades Reais (Ponta a Ponta):** **4** (Brand Kit Cache, OCR de Fornecedor, Destination Intelligence, Confirmação de Reserva).
* **Funcionalidades Parciais:** **10** (Design System Flat, Vitrine B2C Checkout, Catálogo Fornecedores, Clause Library, PDF Exports, Omnichannel Inbox, Rooming List, Conferência de Voos, Reacomodação Aérea, Site Builder).
* **Funcionalidades Mockadas/Simuladas:** **2** (Pix Upload de Comprovante no Checkout, Deep Links/Checkin Links de Cias Aéreas).
* **Funcionalidades Ausentes:** **0** (Em relação ao código físico, as ideias foram inicializadas, mas carecem de finalização).
* **Funcionalidades Órfãs:** **1** (`boarding_rooming_list` do modelo antigo de card, substituída por lógica contextual).
