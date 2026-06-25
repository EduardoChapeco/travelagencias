// ─── DTOs e Tipagens de Cotação Inteligente VibeTour ─────────────────────────

export interface LocationRef {
  code: string;
  name?: string;
  city?: string;
}

export interface TravelerParty {
  adults: number;
  seniors?: number;
  children?: number;
  infants?: number;
  ages?: number[];
}

export interface FlightOption {
  id: string;
  airlineCode: string;
  airlineName?: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departure: string; // ISO DateTime
  arrival: string; // ISO DateTime
  stops: number;
  cabin?: string; // economy | business | first
  baggageAllowance?: string;
  price?: number;
}

export interface AccommodationOption {
  id: string;
  name: string;
  cityCode?: string;
  cityName?: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  rooms: Array<{
    description: string;
    quantity: number;
    boardDescription?: string; // meal plan
  }>;
  lowestPrice?: number;
  images?: string[];
}

export interface TransferOption {
  id: string;
  description: string;
  date: string; // YYYY-MM-DD
  type: "private" | "shared";
  vehicle: string;
  price: number;
  notes?: string;
}

export interface ExperienceOption {
  id: string;
  description: string;
  date: string; // YYYY-MM-DD
  price: number;
  imageUrl?: string;
  notes?: string;
}

export interface InsuranceOption {
  provider: string;
  plan: string;
  price: number;
  coverage?: string;
  startAt?: string; // YYYY-MM-DD
  endAt?: string; // YYYY-MM-DD
}

export interface TicketOption {
  id: string;
  description: string;
  date: string; // YYYY-MM-DD
  price: number;
  notes?: string;
}

export interface PriceBreakdown {
  netPrice: number; // custo
  commission: number;
  markup: number;
  taxes: number;
  totalPrice: number; // venda
  currency: string;
}

export interface PolicySnapshot {
  type: string; // cancellation | amendment | refund
  description: string;
  isPenaltyActive: boolean;
  details?: string;
}

export interface AvailabilitySnapshot {
  isAvailable: boolean;
  expiresAt?: string; // ISO DateTime
  rawAvailability?: any;
}

/**
 * Contrato Canônico de Oferta Normalizada (NormalizedOffer)
 * Evita acoplamento direto com as APIs proprietárias de fornecedores (Infotravel, etc).
 */
export interface NormalizedOffer {
  id: string;
  agencyId: string;
  providerCode: string; // infotravel | manual | local
  externalOfferId?: string;
  searchScenarioId: string;
  productType: "hotel" | "flight" | "transfer" | "package" | "activity";
  origin: LocationRef[];
  destination: LocationRef[];
  startAt: string; // ISO DateTime
  endAt: string; // ISO DateTime
  travelers: TravelerParty;
  flights: FlightOption[];
  accommodations: AccommodationOption[];
  transfers: TransferOption[];
  experiences: ExperienceOption[];
  insurances: InsuranceOption[];
  tickets: TicketOption[];
  pricing: PriceBreakdown;
  policies: PolicySnapshot[];
  availability: AvailabilitySnapshot;
  providerSnapshot?: any;
  fetchedAt: string; // ISO DateTime
  expiresAt?: string; // ISO DateTime
  status: "available" | "on_request" | "sold_out" | "expired";
}

/**
 * Intenção de Viagem estruturada (TravelIntent)
 * Usada tanto no formulário quanto na interpretação do chat agêntico.
 */
export interface TravelIntent {
  agencyId: string;
  leadId?: string;
  clientId?: string;
  requestedBy: string;
  origin: LocationRef[];
  destinations: LocationRef[];
  dateWindow: {
    start: string; // YYYY-MM-DD
    end: string; // YYYY-MM-DD
    flexDays?: number;
  };
  duration: {
    minNights: number;
    maxNights: number;
  };
  travelers: TravelerParty;
  budget: {
    amount: number;
    currency: string;
    priority: "low" | "medium" | "high";
  };
  productTypes: string[]; // flight | hotel | transfer etc
  vibeProfile?: Record<string, number>; // beach, luxury, adventure, budget, comfort etc (0 to 100)
  source: "form" | "chat" | "crm" | "public_vibetour" | "manual";
}

/**
 * Perfil de Scoring e pesos configurados para ponderar ofertas
 */
export interface ScoreProfile {
  id: string;
  agencyId?: string;
  name: string;
  scope: "global" | "agency";
  weights: {
    price: number;
    duration: number;
    comfort: number;
    connections: number;
    logistics: number;
    hotelRating: number;
  };
  constraints: {
    maxLayovers?: number;
    maxConnectionTimeMinutes?: number;
    minHotelStars?: number;
    avoidEarlyFlights?: boolean;
    avoidLateArrivals?: boolean;
  };
  version: number;
  status: "active" | "inactive";
}

/**
 * Scorecard detalhando a pontuação explicável de uma alternativa de pacote
 */
export interface PackageScorecard {
  id: string;
  packageCandidateId: string;
  ruleVersionSet: string;
  dimensions: {
    flightScore: number;
    hotelScore: number;
    logisticsScore: number;
    experienceScore: number;
    costBenefitScore: number;
  };
  penalties: Array<{
    dimension: string;
    ruleCode: string;
    points: number;
    reason: string;
  }>;
  bonuses: Array<{
    dimension: string;
    ruleCode: string;
    points: number;
    reason: string;
  }>;
  finalScore: number; // 0 to 100
  explanation: string;
  confidence: number;
}
