import { type Hotel, type Flight } from "@/services/proposals";

// ─── Tipagens Oficiais do GDS Infotravel (OpenAPI api-doc.json) ──────────────

export interface ApiPrice {
  currency?: string;
  amount?: number;
  description?: string;
}

export interface ApiFare {
  type?: string;
  code?: string;
  description?: string;
  price?: ApiPrice;
}

export interface ApiAirport {
  code?: string;
  name?: string;
  city?: {
    code?: string;
    name?: string;
  };
}

export interface ApiAirline {
  code?: string;
  name?: string;
}

export interface ApiFlight {
  key?: string;
  code?: string;
  airline?: ApiAirline;
  origin?: ApiAirport;
  destination?: ApiAirport;
  departure?: string; // ISO date-time
  arrival?: string; // ISO date-time
  number?: string;
  stopsCount?: number;
  fares?: ApiFare[];
}

export interface ApiRoute {
  numberRoute?: number;
  flights?: ApiFlight[];
}

export interface ApiFlightAvail {
  provider?: string;
  routes?: ApiRoute[];
}

export interface ApiImage {
  url?: string;
  path?: string;
  description?: string;
}

export interface ApiHotel {
  id?: number;
  name?: string;
  city?: {
    code?: number;
    name?: string;
  };
  images?: ApiImage[];
}

export interface ApiRoom {
  description?: string;
  name?: string;
  checkIn?: string; // ISO date-time
  checkOut?: string; // ISO date-time
  quantity?: number;
  names?: ApiName[];
  boardType?: {
    code?: string;
    description?: string;
  };
  facilities?: Array<{ name?: string }>;
}

export interface ApiRoomGroup {
  rooms?: ApiRoom[];
}

export interface ApiLowestFare {
  price?: ApiPrice;
  amount?: number;
}

export interface ApiHotelAvail {
  provider?: string;
  checkIn?: string; // ISO date-time
  checkOut?: string; // ISO date-time
  hotel?: ApiHotel;
  lowestFare?: ApiLowestFare;
  roomGroups?: ApiRoomGroup[];
}

export interface ApiDocument {
  number?: string;
  type?: string; // RG, CPF, Passport
}

export interface ApiName {
  id?: number;
  firstName?: string;
  lastName?: string;
  birth?: string; // ISO date-time
  type?: "ADT" | "CHD" | "INF" | "SNR";
  gender?: "MALE" | "FEMALE";
  document?: ApiDocument;
  documents?: ApiDocument[];
}

export interface ApiLocator {
  code?: string;
  type?: "INTERNAL" | "SUPPLIER" | "SUPPLIER_EXT" | "TICKET" | "SEAT";
}

export interface ApiBookingHotel {
  status?: string;
  locators?: ApiLocator[];
  provider?: string;
  hotel?: ApiHotel;
  rooms?: ApiRoom[];
  contacts?: Array<{ name?: string; email?: string; telephone?: string }>;
}

export interface ApiBookingFlight {
  status?: string;
  locators?: ApiLocator[];
  provider?: string;
  flights?: ApiFlight[];
  names?: ApiName[];
}

export interface ApiBooking {
  id?: number;
  locator?: string;
  status?: string;
  createdAt?: string;
  urlVoucher?: string;
  bookingAmount?: ApiPrice;
  client?: {
    name?: string;
    lastName?: string;
    email?: string;
    telephones?: Array<{ number?: string }>;
    documents?: ApiDocument[];
  };
  bookingHotels?: ApiBookingHotel[];
  bookingFlights?: ApiBookingFlight[];
}

// ─── Resolvedores de Mapeamento Canônico (Mappers) ──────────────────────────

/**
 * Converte um resultado de busca de hotel da Infotravel para o modelo de Hotel do Turis
 */
export function mapApiHotelToCanonical(avail: ApiHotelAvail): Hotel {
  const hotelId =
    avail.hotel?.id?.toString() || `info-h-${Math.random().toString(36).substr(2, 9)}`;
  const hotelName = avail.hotel?.name || "Hotel Sem Nome";
  const hotelCity = avail.hotel?.city?.name || "Destino Desconhecido";

  // Formatar datas ISO (2026-07-01T00:00:00) para YYYY-MM-DD
  const checkin = avail.checkIn ? avail.checkIn.split("T")[0] : "";
  const checkout = avail.checkOut ? avail.checkOut.split("T")[0] : "";

  const roomGroup = avail.roomGroups?.[0];
  const primaryRoom = roomGroup?.rooms?.[0];
  const mealPlan = primaryRoom?.boardType?.description || "Somente Hospedagem";

  const rooms = roomGroup?.rooms?.map((r) => ({
    type: r.description || r.name || "Quarto Standard",
    qty: 1,
  })) || [{ type: "Quarto Standard", qty: 1 }];

  const images = avail.hotel?.images
    ?.map((img) => img.url || img.path || "")
    .filter((url) => url !== "") || [
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80",
  ];

  const price = avail.lowestFare?.price?.amount || avail.lowestFare?.amount || 0;

  return {
    id: hotelId,
    name: hotelName,
    city: hotelCity,
    checkin,
    checkout,
    meal_plan: mealPlan,
    rooms,
    images,
    price,
  };
}

/**
 * Converte um resultado de busca de voo da Infotravel para o modelo de Voo do Turis
 */
export function mapApiFlightToCanonical(avail: ApiFlightAvail): Flight {
  const primaryRoute = avail.routes?.[0];
  const primaryFlight = primaryRoute?.flights?.[0];

  const flightId = primaryFlight?.key || `info-f-${Math.random().toString(36).substr(2, 9)}`;
  const origin = primaryFlight?.origin?.code || "GRU";
  const destination = primaryFlight?.destination?.code || "MIA";

  const date = primaryFlight?.departure ? primaryFlight.departure.split("T")[0] : "";
  const departure_time = primaryFlight?.departure
    ? primaryFlight.departure.split("T")[1]?.substring(0, 5)
    : "00:00";
  const arrival_time = primaryFlight?.arrival
    ? primaryFlight.arrival.split("T")[1]?.substring(0, 5)
    : "00:00";

  const airline = primaryFlight?.airline?.name || primaryFlight?.airline?.code || "Companhia Aérea";
  const flight_number = primaryFlight?.number || "0000";
  const stops = primaryFlight?.stopsCount || 0;

  const primaryFare = primaryFlight?.fares?.[0];
  const baggage_rules = primaryFare?.description || "Baggage rules subject to airline terms";
  const price = primaryFare?.price?.amount || 0;

  return {
    id: flightId,
    origin,
    destination,
    date,
    departure_time,
    arrival_time,
    airline,
    flight_number,
    stops,
    baggage_rules,
    price,
  };
}

/**
 * Normaliza uma reserva importada do GDS Infotravel para gravação no banco de dados e UI
 */
export interface NormalizedBooking {
  booking_id: string;
  locator: string;
  destination: string;
  client_name: string;
  client_cpf: string;
  client_email: string;
  client_phone: string;
  total_sale: number;
  flights: Flight[];
  hotels: Hotel[];
  passengers: Array<{
    full_name: string;
    document: string;
    document_type: string;
    birth_date: string;
    email?: string;
    phone?: string;
  }>;
}

export function mapApiBookingToNormalized(booking: ApiBooking): NormalizedBooking {
  const bookingId =
    booking.id?.toString() || `B-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  const locator = booking.locator || "Localizador-Operadora";

  // Encontrar destino com base nos hotéis ou voos
  let destination = "Destino Internacional";
  if (booking.bookingHotels?.[0]?.hotel?.city?.name) {
    destination = booking.bookingHotels[0].hotel.city.name;
  } else if (booking.bookingFlights?.[0]?.flights?.[0]?.destination?.city?.name) {
    destination = booking.bookingFlights[0].flights[0].destination.city.name;
  }

  const firstName = booking.client?.name || "";
  const lastName = booking.client?.lastName || "";
  const clientName = `${firstName} ${lastName}`.trim() || "Cliente da Proposta";

  const clientCpfObj = booking.client?.documents?.find((doc) => doc.type?.toUpperCase() === "CPF");
  const clientCpf = clientCpfObj?.number || "";

  const clientEmail = booking.client?.email || "";
  const clientPhone = booking.client?.telephones?.[0]?.number || "";
  const totalSale = booking.bookingAmount?.amount || 0;

  // Mapear hotéis
  const hotels =
    booking.bookingHotels?.map((h) => {
      const primaryRoom = h.rooms?.[0];
      const canonicalHotel = mapApiHotelToCanonical({
        checkIn: primaryRoom?.checkIn || booking.createdAt,
        checkOut: primaryRoom?.checkOut || booking.createdAt,
        hotel: h.hotel,
        lowestFare: { amount: 0 },
        roomGroups: [{ rooms: h.rooms }],
      });
      return canonicalHotel;
    }) || [];

  // Mapear voos
  const flights =
    booking.bookingFlights?.map((f) => {
      const canonicalFlight = mapApiFlightToCanonical({
        routes: [{ flights: f.flights }],
      });
      return canonicalFlight;
    }) || [];

  // Mapear passageiros a partir dos nomes na reserva aérea ou hotel
  const passengers: NormalizedBooking["passengers"] = [];
  const passengerNames = booking.bookingFlights?.[0]?.names || [];

  passengerNames.forEach((n) => {
    const docNumber = n.document?.number || n.documents?.[0]?.number || "";
    const docType =
      n.document?.type?.toLowerCase() || n.documents?.[0]?.type?.toLowerCase() || "rg";
    const birthDate = n.birth ? n.birth.split("T")[0] : "";
    const fullName = `${n.firstName} ${n.lastName}`.trim();

    if (fullName) {
      passengers.push({
        full_name: fullName,
        document: docNumber,
        document_type: docType,
        birth_date: birthDate,
      });
    }
  });

  // Mapear passageiros a partir dos hotéis (se não houverem repetidos)
  booking.bookingHotels?.forEach((bh) => {
    bh.rooms?.forEach((r) => {
      r.names?.forEach((n) => {
        const docNumber = n.document?.number || n.documents?.[0]?.number || "";
        const docType =
          n.document?.type?.toLowerCase() || n.documents?.[0]?.type?.toLowerCase() || "rg";
        const birthDate = n.birth ? n.birth.split("T")[0] : "";
        const fullName = `${n.firstName} ${n.lastName}`.trim();

        if (fullName) {
          const exists = passengers.some(
            (p) => p.full_name.toLowerCase() === fullName.toLowerCase(),
          );
          if (!exists) {
            passengers.push({
              full_name: fullName,
              document: docNumber,
              document_type: docType,
              birth_date: birthDate,
            });
          }
        }
      });
    });
  });

  // Se não houver passageiros listados, cadastrar o cliente principal como passageiro
  if (passengers.length === 0) {
    passengers.push({
      full_name: clientName,
      document: clientCpf,
      document_type: "cpf",
      birth_date: "",
      email: clientEmail,
      phone: clientPhone,
    });
  }

  return {
    booking_id: bookingId,
    locator,
    destination,
    client_name: clientName,
    client_cpf: clientCpf,
    client_email: clientEmail,
    client_phone: clientPhone,
    total_sale: totalSale,
    flights,
    hotels,
    passengers,
  };
}
