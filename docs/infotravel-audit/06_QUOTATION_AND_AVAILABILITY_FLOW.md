# 06. Fluxo de Cotação e Consulta de Disponibilidade

Este documento detalha o fluxo de consulta de tarifas e disponibilidade em tempo real na API **Infotravel/Infotera**, definindo o processo de normalização das respostas para o modelo interno do **TravelOS**.

---

## 1. O Pipeline de Busca e Disponibilidade

Diferente de sistemas legados que acoplam a interface aos dados crus do fornecedor, a busca de tarifas do TravelOS deve passar por uma camada de filtragem e normalização para garantir rapidez e conformidade visual:

```txt
Operador seleciona filtros (Datas, Passageiros, Destino)
  → Envia requisição para a rota interna do TravelOS
  → Dispara chamada concorrente para os endpoints da API Infotravel:
      - Hotéis: `POST /api/v1/avail/hotel`
      - Voos: `GET /api/v1/avail/flight`
      - Transfers: `GET /api/v1/avail/transfer`
  → API retorna múltiplos payloads contendo regras tarifárias, regimes de alimentação e políticas
  → Adaptador mapeia e normaliza os dados no DTO `NormalizedOffer`
  → Insere margem/markup configurado pela agência localmente no servidor
  → Retorna array unificado de ofertas para a UI do painel do agente
```

---

## 2. Modelo de Dados Unificado: `NormalizedOffer`

Para evitar que a interface do usuário dependa de múltiplos esquemas diferentes de retorno da API (que mudam frequentemente conforme a versão do Infotravel), todas as respostas de disponibilidade devem ser traduzidas para a estrutura interna `NormalizedOffer`.

```typescript
export interface NormalizedOffer {
  source: "infotravel" | "local" | "other_gds";
  searchSessionId: string;
  externalOfferKey: string; // ID único retornado pela API para re-cotar ou reservar
  productType: "hotel" | "flight" | "transfer" | "package" | "activity";
  
  origin?: string; // ex: GRU
  destination: string; // ex: Lisboa
  startDate: string;
  endDate: string;
  travelersCount: number;
  
  hotel?: {
    id: string;
    name: string;
    category: string; // Estrelas ou classificação
    mealPlan: string; // ex: Café da Manhã, All Inclusive
    roomType: string;
    images: string[];
    address?: string;
  };
  
  flights?: Array<{
    id: string;
    airline: string;
    flightNumber: string;
    departureTime: string;
    arrivalTime: string;
    stops: number;
    baggageRules: string;
  }>;
  
  pricing: {
    basePrice: number; // Preço líquido do fornecedor
    taxes: number;     // Taxas de embarque / turismo
    markup: number;    // Acréscimo configurado pela agência
    commission: number; // Comissão estimada retornada pelo GDS
    totalPrice: number; // Preço final de venda exibido ao cliente (basePrice + taxes + markup)
    currency: string;   // ex: BRL, USD
  };
  
  policies: {
    cancellationDeadline?: string;
    isRefundable: boolean;
    terms: string;
  };
  
  availabilityStatus: "available" | "on_request" | "sold_out";
  expiresAt: string; // Timestamp limite de retenção da cotação
  rawSnapshot: any;  // Payload original para auditoria e log forense
}
```

---

## 3. Benefícios da Camada de Normalização
* **Agnosticidade de UI**: O frontend do TravelOS torna-se 100% agnóstico em relação à API do Infotravel. Se a agência decidir integrar outro consolidador futuramente, basta escrever um novo mapeador para o tipo `NormalizedOffer`, mantendo as telas de busca, carrinho e propostas intocadas.
* **Segurança na Margem de Lucro**: O cálculo de markup e comissões é feito exclusivamente no lado do servidor, impedindo a manipulação de preços via ferramentas de inspeção do navegador pelo cliente final.
