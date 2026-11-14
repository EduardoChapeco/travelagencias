import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAgency } from "@/lib/agency-context";
import { supabase } from "@/integrations/supabase/client";
import { PackageSearchEngine } from "./PackageSearchEngine";
import { PackageSummaryHero } from "./PackageSummaryHero";
import { PackageTabsNav, type PackageModuleTab } from "./PackageTabsNav";
import { HotelSearchCatalog, type HotelCatalogItem, type HotelRoomOption } from "./HotelSearchCatalog";
import { FlightSearchCatalog, type FlightCatalogOption } from "./FlightSearchCatalog";
import { ServicesSearchCatalog, type ServiceItem } from "./ServicesSearchCatalog";
import { PackageCartModal, type CartItemProduct } from "./PackageCartModal";
import { TruthfulPreviewSidebar } from "./TruthfulPreviewSidebar";
import {
  infotravelSearchHotels,
  infotravelSearchFlights,
  infotravelSearchTransfers,
  infotravelSearchActivities,
  InfotravelNotConfiguredError,
} from "@/services/infotravel";
import { type PackageSearchParams } from "@/types/infotravel";
import { createProposal } from "@/services/proposals";
import { formatCurrency } from "@/lib/formatters";
import {
  AlertTriangle,
  ExternalLink,
  Search,
  Sparkles,
  Plane,
  Hotel,
  ShieldCheck,
  PackageOpen,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function InfotravelPackageWorkspace() {
  const { agency } = useAgency();
  const qc = useQueryClient();

  // Active Tab & Markup State
  const [activeTab, setActiveTab] = useState<PackageModuleTab>("hospedagem");
  const [cartModalOpen, setCartModalOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [markupPercent, setMarkupPercent] = useState(14);

  // Search Engine Parameters State
  const [searchParams, setSearchParams] = useState<PackageSearchParams>({
    origin: { code: "XAP", name: "Serafin Enoss Bertaso", city: "Chapecó" },
    destination: { code: "MCZ", name: "Zumbi Dos Palmares", city: "Maceió" },
    departureDate: "2026-11-06",
    returnDate: "2026-11-11",
    nights: 5,
    isCombined: true,
    baggage: "all",
    stops: "any",
    rooms: [{ id: "room-1", adults: 2, childrenAges: [], infantsAges: [] }],
  });

  // Dynamic GDS Data from Real API
  const [hotels, setHotels] = useState<HotelCatalogItem[]>([]);
  const [flights, setFlights] = useState<FlightCatalogOption[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);

  // Selected Items State for Sticky Summary & Package Composition
  const [selectedHotel, setSelectedHotel] = useState<HotelCatalogItem | null>(null);
  const [selectedRoomConditionId, setSelectedRoomConditionId] = useState<string | null>(null);
  const [selectedFlight, setSelectedFlight] = useState<FlightCatalogOption | null>(null);

  // Cart State (Multiple Products)
  const [cartItems, setCartItems] = useState<CartItemProduct[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Check if Infotravel API credentials exist for this agency (suporta category infotravel_operator e api_keys gerais)
  const { data: activeOperator, isLoading: checkingCreds } = useQuery({
    enabled: !!agency?.id,
    queryKey: ["infotravel-active-operator-check", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_keys")
        .select("id, operator_id, operator_name, is_active, provider, key_value, category")
        .eq("agency_id", agency!.id)
        .eq("is_active", true);

      if (error || !data || data.length === 0) return null;

      const found = data.find(
        (k) =>
          k.category === "infotravel_operator" ||
          k.provider?.startsWith("infotravel_") ||
          k.provider === "infotravel",
      );
      return found || null;
    },
  });

  const hasCredentials = !!activeOperator;

  // Total passengers
  const totalPassengers = useMemo(() => {
    return searchParams.rooms.reduce(
      (acc: number, r) => acc + r.adults + r.childrenAges.length + r.infantsAges.length,
      0,
    );
  }, [searchParams]);

  // Hotel selection handlers
  const handleSelectHotel = (hotel: HotelCatalogItem, room: HotelRoomOption, condId: string) => {
    setSelectedHotel(hotel);
    setSelectedRoomConditionId(condId);
    toast.success(`Hospedagem atualizada para: ${hotel.name}`);
  };

  const handleAddHotelToCart = (hotel: HotelCatalogItem, room: HotelRoomOption, condId: string) => {
    const cond = room.conditions.find((c) => c.id === condId) || room.conditions[0];
    const newItem: CartItemProduct = {
      id: `cart-h-${Date.now()}`,
      type: "hotel",
      title: hotel.name,
      subtitle: hotel.address,
      roomOrFare: room.name,
      boardBasis: cond?.boardType || "Café da Manhã",
      passengersDesc: `${totalPassengers} Passageiros`,
      utilizationPeriod: `${searchParams.departureDate} Até ${searchParams.returnDate}`,
      taxAmount: 19.59,
      priceAmount: cond?.priceTotal || hotel.lowestPriceTotal,
    };
    setCartItems((prev) => [...prev, newItem]);
    toast.success("Hotel adicionado ao carrinho de orçamentos!");
  };

  // Flight selection handlers
  const handleSelectFlight = (flight: FlightCatalogOption) => {
    setSelectedFlight(flight);
    toast.success(`Voo atualizado: ${flight.airline} (${flight.outbound.departureTime} -> ${flight.outbound.arrivalTime})`);
  };

  const handleAddFlightToCart = (flight: FlightCatalogOption) => {
    const newItem: CartItemProduct = {
      id: `cart-f-${Date.now()}`,
      type: "flight",
      title: `${flight.outbound.departureTime} ${flight.outbound.originCode} ➔ ${flight.outbound.arrivalTime} ${flight.outbound.destCode}`,
      subtitle: `${totalPassengers} Passageiros | ${flight.airline} — ${flight.outbound.stopsCount} Paradas`,
      roomOrFare: flight.outbound.cabinClass,
      passengersDesc: `${totalPassengers} Passageiros`,
      utilizationPeriod: `${flight.outbound.departureDate} e ${flight.inbound.departureDate}`,
      taxAmount: flight.taxes,
      priceAmount: flight.totalPrice,
    };
    setCartItems((prev) => [...prev, newItem]);
    toast.success("Voo adicionado ao carrinho de orçamentos!");
  };

  // Service handler
  const handleAddServiceToCart = (service: ServiceItem) => {
    const isAlready = cartItems.some((item) => item.id === `cart-s-${service.id}`);
    if (isAlready) {
      setCartItems((prev) => prev.filter((item) => item.id !== `cart-s-${service.id}`));
      toast.info(`Serviço removido do carrinho: ${service.title}`);
      return;
    }

    const newItem: CartItemProduct = {
      id: `cart-s-${service.id}`,
      type: service.type,
      title: service.title,
      subtitle: `${service.supplierName} | ${totalPassengers} Passageiros`,
      roomOrFare: "Incluso no Pacote",
      passengersDesc: `${totalPassengers} Passageiros`,
      utilizationPeriod: `${searchParams.departureDate} Até ${searchParams.returnDate}`,
      taxAmount: service.taxes,
      priceAmount: service.price,
    };
    setCartItems((prev) => [...prev, newItem]);
    toast.success(`Serviço adicionado ao orçamento: ${service.title}`);
  };

  const handleRemoveCartItem = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
    toast.info("Item removido do orçamento.");
  };

  const handleClearCart = () => {
    setCartItems([]);
    toast.info("Carrinho limpo.");
  };

  // Search submission and mapping of real GDS API results
  const handleExecuteSearch = async (params: PackageSearchParams) => {
    setSearchParams(params);
    setSearchLoading(true);
    setHasSearched(true);
    toast.loading("Consultando tarifas em tempo real no GDS Infotravel...", { id: "search-gds" });

    try {
      if (!agency) throw new Error("Agência não identificada.");

      const occupancies = params.rooms.map((r) => {
        let occ = String(r.adults || 1);
        if (r.childrenAges && r.childrenAges.length > 0) {
          occ += `-${r.childrenAges.join(",")}`;
        }
        return occ;
      });

      const [hotelsRes, flightsRes, transfersRes, activitiesRes] = await Promise.allSettled([
        infotravelSearchHotels(agency.id, {
          city: params.destination.city || params.destination.name || params.destination.code,
          destination: params.destination.code,
          destinationCode: params.destination.code,
          destinationName: params.destination.city || params.destination.name,
          checkin: params.departureDate,
          checkout: params.returnDate,
          rooms: params.rooms.length,
          occupancies,
        }),
        infotravelSearchFlights(agency.id, {
          origin: params.origin.code,
          destination: params.destination.code,
          date: params.departureDate,
          returnDate: params.returnDate,
          isCombined: params.isCombined,
          occupancies,
        }),
        infotravelSearchTransfers(agency.id, {
          city: params.destination.city || params.destination.code,
          destination: params.destination.code,
          date: params.departureDate,
          returnDate: params.returnDate,
          rooms: params.rooms.length,
        }),
        infotravelSearchActivities(agency.id, {
          city: params.destination.city || params.destination.code,
          destination: params.destination.code,
          date: params.departureDate,
          returnDate: params.returnDate,
          rooms: params.rooms.length,
        }),
      ]);

      // 1. Mapear Hotéis Reais
      let loadedHotels: HotelCatalogItem[] = [];
      if (hotelsRes.status === "fulfilled" && Array.isArray(hotelsRes.value) && hotelsRes.value.length > 0) {
        loadedHotels = hotelsRes.value.map((h: any, idx: number) => ({
          id: h.id || `hotel-${idx}`,
          name: h.name || "Hotel GDS",
          stars: h.stars || 4,
          address: h.city || params.destination.city,
          neighborhood: h.neighborhood || params.destination.city,
          city: h.city || params.destination.city,
          imageUrl:
            (h.images && h.images[0]) ||
            "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80",
          featuredBadge: idx === 0 ? "OFERTA GDS EXCLUSIVA" : undefined,
          suppliers: [
            { id: "s1", name: "Contrato Direto GDS", isDirect: true },
            { id: "s2", name: "Operadora Conectada", isDirect: false },
          ],
          selectedSupplierId: "s1",
          lowestPricePerPerson: (h.price || 1200) / 2,
          lowestPriceTotal: h.price || 2400,
          rooms: (h.rooms || []).map((r: any, rIdx: number) => ({
            id: `r-${rIdx}`,
            name: r.type || "Quarto Standard Casal",
            availableQty: r.qty || 5,
            conditions: [
              {
                id: `c-${rIdx}-1`,
                boardType: h.meal_plan || "Café da Manhã",
                refundable: false,
                priceTotal: h.price || 2400,
                pricePerPerson: (h.price || 2400) / 2,
              },
            ],
          })),
        }));
      }
      setHotels(loadedHotels);
      if (loadedHotels.length > 0) {
        setSelectedHotel(loadedHotels[0]);
        setSelectedRoomConditionId(loadedHotels[0].rooms[0]?.conditions[0]?.id || "c-0-1");
      } else {
        setSelectedHotel(null);
      }

      // 2. Mapear Voos Reais
      let loadedFlights: FlightCatalogOption[] = [];
      if (flightsRes.status === "fulfilled" && Array.isArray(flightsRes.value) && flightsRes.value.length > 0) {
        loadedFlights = flightsRes.value.map((f: any, idx: number) => ({
          id: f.id || `flight-${idx}`,
          airline: f.airline || "Cia Aérea GDS",
          airlineCode: (f.airline || "GDS").slice(0, 2).toUpperCase(),
          outbound: {
            flightNumber: f.flight_number || `${idx + 100}`,
            originCode: f.origin || params.origin.code,
            originName: params.origin.name,
            destCode: f.destination || params.destination.code,
            destName: params.destination.name,
            departureDate: f.date || params.departureDate,
            departureTime: f.departure_time || "08:30",
            arrivalTime: f.arrival_time || "12:45",
            stopsCount: f.stops || 0,
            stopsDuration: f.stops > 0 ? "1h 30m" : "Direto",
            operatorTariff: "Tarifa Operadora",
            operatorPrice: f.price || 1500,
            cabinClass: "Econômica",
            baggageInfo: f.baggage_rules || "1 mala de mão (10kg)",
          },
          inbound: {
            flightNumber: `${idx + 200}`,
            originCode: f.destination || params.destination.code,
            originName: params.destination.name,
            destCode: f.origin || params.origin.code,
            destName: params.origin.name,
            departureDate: params.returnDate,
            departureTime: "14:00",
            arrivalTime: "18:15",
            stopsCount: f.stops || 0,
            stopsDuration: f.stops > 0 ? "1h 30m" : "Direto",
            operatorTariff: "Tarifa Operadora",
            operatorPrice: f.price || 1500,
            cabinClass: "Econômica",
            baggageInfo: f.baggage_rules || "1 mala de mão (10kg)",
          },
          taxes: 250.13,
          fees: 0,
          pricePerPerson: f.price || 1500,
          totalPrice: (f.price || 1500) * totalPassengers,
        }));
      }
      setFlights(loadedFlights);
      if (loadedFlights.length > 0) {
        setSelectedFlight(loadedFlights[0]);
      } else {
        setSelectedFlight(null);
      }

      // 3. Mapear Transfers e Serviços Reais
      const loadedServices: ServiceItem[] = [];
      if (transfersRes.status === "fulfilled" && Array.isArray(transfersRes.value)) {
        transfersRes.value.forEach((t: any, idx: number) => {
          loadedServices.push({
            id: `srv-trans-${idx}`,
            type: "transfer",
            title: t.description || `Traslado Aeroporto ➔ Hotéis ${params.destination.city}`,
            description: "Traslado Executivo com ar condicionado e recepção",
            supplierName: "Recepção Nominal",
            price: t.price || 180,
            taxes: 0,
            fees: 0,
          });
        });
      }
      if (activitiesRes.status === "fulfilled" && Array.isArray(activitiesRes.value)) {
        activitiesRes.value.forEach((a: any, idx: number) => {
          loadedServices.push({
            id: `srv-act-${idx}`,
            type: "activity",
            title: a.description || `City Tour & Passeios em ${params.destination.city}`,
            description: "Passeio Turístico com Guia Credenciado",
            supplierName: "Guia Credenciado",
            price: a.price || 150,
            taxes: 0,
            fees: 0,
          });
        });
      }
      setServices(loadedServices);

      toast.success(
        `Pesquisa concluída! Encontrados ${loadedHotels.length} hotéis e ${loadedFlights.length} opções de voos.`,
        { id: "search-gds" },
      );
    } catch (err: any) {
      if (err instanceof InfotravelNotConfiguredError) {
        toast.error("Credenciais do GDS Infotravel não configuradas.", { id: "search-gds" });
      } else {
        toast.error(err.message || "Erro ao consultar GDS.", { id: "search-gds" });
      }
    } finally {
      setSearchLoading(false);
    }
  };

  // Save Proposal to Database & Generate Token Webview & Contracts
  const handleSaveProposal = async (data: {
    client: {
      name: string;
      email: string;
      phone: string;
      attendant: string;
      notes?: string;
      leadId?: string | null;
      clientId?: string | null;
    };
    template: any;
    markupPercent: number;
    discountAmount: number;
    type: "pdf" | "web" | "book" | "contract";
  }) => {
    if (!agency) throw new Error("Agência não identificada.");

    const totalTaxes = cartItems.reduce((acc, item) => acc + item.taxAmount, 0);
    const totalBase = cartItems.reduce((acc, item) => acc + item.priceAmount, 0);
    const markupVal = (totalBase * data.markupPercent) / 100;
    const finalTotal = Math.max(0, totalBase + markupVal + totalTaxes - data.discountAmount);

    const mappedFlights = selectedFlight
      ? [
          {
            airline: selectedFlight.airline,
            flight_number: selectedFlight.outbound.flightNumber,
            origin: selectedFlight.outbound.originCode,
            destination: selectedFlight.outbound.destCode,
            date: searchParams.departureDate,
            departure_time: selectedFlight.outbound.departureTime,
            arrival_time: selectedFlight.outbound.arrivalTime,
            stops: selectedFlight.outbound.stopsCount,
            baggage_rules: selectedFlight.outbound.baggageInfo,
            price: selectedFlight.totalPrice,
          },
        ]
      : [];

    const mappedHotels = selectedHotel
      ? [
          {
            name: selectedHotel.name,
            city: selectedHotel.city,
            checkin: searchParams.departureDate,
            checkout: searchParams.returnDate,
            meal_plan:
              selectedHotel.rooms[0]?.conditions.find((c) => c.id === selectedRoomConditionId)?.boardType ||
              selectedHotel.rooms[0]?.conditions[0]?.boardType ||
              "Café da Manhã",
            rooms: [{ type: selectedHotel.rooms[0]?.name || "Standard", qty: searchParams.rooms.length }],
            images: [selectedHotel.imageUrl],
            price: selectedHotel.lowestPriceTotal,
          },
        ]
      : [];

    const mappedTransfers = cartItems
      .filter((i) => i.type === "transfer")
      .map((i) => ({
        id: i.id,
        description: i.title,
        date: searchParams.departureDate,
        type: "shared" as const,
        vehicle: "Van Executiva com Ar Condicionado",
        price: i.priceAmount,
        notes: i.subtitle,
      }));

    const mappedTours = cartItems
      .filter((i) => i.type === "activity" || i.type === "ticket")
      .map((i) => ({
        id: i.id,
        description: i.title,
        date: searchParams.departureDate,
        price: i.priceAmount,
        image_url: "",
        notes: i.subtitle,
      }));

    const proposalPayload: any = {
      agency_id: agency.id,
      title: `Pacote Completo ${searchParams.destination.city} (${searchParams.nights} Noites)`,
      destination: searchParams.destination.city,
      lead_id: data.client.leadId || null,
      client_id: data.client.clientId || null,
      travel_start: searchParams.departureDate,
      travel_end: searchParams.returnDate,
      pax_adults: totalPassengers,
      pax_children: 0,
      pax_infants: 0,
      currency: "BRL",
      subtotal: totalBase + totalTaxes,
      discount: data.discountAmount,
      total: finalTotal,
      status: data.type === "book" ? "confirmed" : "sent",
      template: data.template || "editorial-flat",
      notes: data.client.notes || `Atendente: ${data.client.attendant}`,
      flights: mappedFlights,
      hotels: mappedHotels,
      transfers: mappedTransfers,
      tours: mappedTours,
      includes: [
        `Passagem aérea ida e volta ${searchParams.origin.code} ➔ ${searchParams.destination.code}`,
        `Hospedagem por ${searchParams.nights} noites com café da manhã`,
        "Taxas de embarque e operadora inclusas",
        "Suporte e atendimento exclusivo da agência",
      ],
      excludes: ["Despesas de caráter pessoal", "Taxas turísticas locais de preservação ambiental"],
    };

    const saved = await createProposal(agency.id, proposalPayload);
    const token = (saved as any)?.token || saved.id || `prop-${Date.now()}`;
    let contractToken: string | undefined = undefined;
    let createdTripId: string | undefined = undefined;

    if (data.type === "contract" || data.type === "book") {
      try {
        const { data: newTrip, error: tripErr } = await supabase
          .from("trips")
          .insert({
            agency_id: agency.id,
            title: `Viagem ${searchParams.destination.city} · ${data.client.name}`,
            destination: searchParams.destination.city,
            travel_start: searchParams.departureDate,
            travel_end: searchParams.returnDate,
            total_sale: finalTotal,
            currency: "BRL",
            status: data.type === "book" ? "confirmed" : "proposal",
            operations_status: "pending_issuance",
          } as any)
          .select("id")
          .single();

        if (newTrip && !tripErr) {
          createdTripId = newTrip.id;
          const contractId = crypto.randomUUID();
          const { error: contractErr } = await supabase.from("contracts").insert({
            id: contractId,
            agency_id: agency.id,
            trip_id: newTrip.id,
            status: "draft",
            package_summary: `${selectedHotel?.name || "Hospedagem"} + Aéreo ${selectedFlight?.airline || "GDS"}`,
            total_value: finalTotal,
            payment_terms: `10x de ${formatCurrency(finalTotal / 10)} sem juros ou ${formatCurrency(finalTotal * 0.97)} no PIX`,
            fixed_clauses: [
              { title: "Objeto do Contrato", text: "Prestação de serviços de intermediação turística pela agência." },
              { title: "Cancelamento e Reembolso", text: "Sujeito às políticas e penalidades das companhias aéreas e hotéis." },
              { title: "Documentação de Viagem", text: "É de responsabilidade exclusiva do passageiro portar documento válido." },
            ],
            client_data: {
              name: data.client.name,
              email: data.client.email,
              phone: data.client.phone,
            },
            agency_data: {
              name: agency.name,
            },
          } as any);

          if (!contractErr) {
            contractToken = contractId;
          }
        }
      } catch (genErr) {
        console.warn("Falha ao gerar trip/contrato automático:", genErr);
      }
    }

    qc.invalidateQueries({ queryKey: ["proposals", agency.id] });
    qc.invalidateQueries({ queryKey: ["quote-requests", agency.id] });
    qc.invalidateQueries({ queryKey: ["contracts", agency.id] });
    qc.invalidateQueries({ queryKey: ["trips", agency.id] });

    return { proposalId: saved.id, token, contractToken, tripId: createdTripId };
  };

  return (
    <div className="w-full space-y-6 text-foreground">
      {/* Banner de Status de Conexão GDS Real */}
      {!checkingCreds && !hasCredentials ? (
        <div className="p-4 rounded-[var(--radius-xl)] bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[13px]">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
            <span>
              <strong>Credenciais Infotravel não configuradas:</strong> Para buscar tarifas reais da sua operadora no GDS, conecte seu usuário e senha.
            </span>
          </div>

          <Link
            to={`/agency/${agency?.slug || "settings"}/integrations` as any}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-[12px] shadow-sm transition-colors"
          >
            <span>Configurar Conexão GDS</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : activeOperator ? (
        <div className="px-4 py-2 rounded-[var(--radius-lg)] bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-[12px] text-emerald-600 dark:text-emerald-400 font-medium">
          <span className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            GDS Conectado via Operadora: <strong>{activeOperator.operator_name || "Infotravel"}</strong>
          </span>
          <Link
            to={`/agency/${agency?.slug || "settings"}/integrations` as any}
            className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
          >
            Gerenciar Operadoras
          </Link>
        </div>
      ) : null}

      {/* 1. Motor de Busca Superior */}
      <PackageSearchEngine
        initialParams={searchParams}
        onSearch={handleExecuteSearch}
        loading={searchLoading}
      />

      {/* 2. Card Sticky de Resumo do Pacote (Só exibe se houver hotel ou voo selecionado) */}
      {(selectedHotel || selectedFlight) && (
        <PackageSummaryHero
          selectedHotel={
            selectedHotel
              ? {
                  name: selectedHotel.name,
                  stars: selectedHotel.stars,
                  checkIn: searchParams.departureDate,
                  checkOut: searchParams.returnDate,
                  mealPlan:
                    selectedHotel.rooms[0]?.conditions.find((c) => c.id === selectedRoomConditionId)?.boardType ||
                    selectedHotel.rooms[0]?.conditions[0]?.boardType ||
                    "Café da Manhã",
                  roomType: selectedHotel.rooms[0]?.name || "Standard Casal",
                  imageUrl: selectedHotel.imageUrl,
                  price: selectedHotel.lowestPriceTotal,
                }
              : null
          }
          selectedFlight={
            selectedFlight
              ? {
                  outbound: {
                    airline: selectedFlight.airline,
                    airlineLogo: selectedFlight.airlineLogo,
                    flightNumber: selectedFlight.outbound.flightNumber,
                    originCode: selectedFlight.outbound.originCode,
                    destCode: selectedFlight.outbound.destCode,
                    departureTime: selectedFlight.outbound.departureTime,
                    arrivalTime: selectedFlight.outbound.arrivalTime,
                    stopsCount: selectedFlight.outbound.stopsCount,
                    stopsDuration: selectedFlight.outbound.stopsDuration,
                    date: selectedFlight.outbound.departureDate,
                    cabinClass: selectedFlight.outbound.cabinClass,
                    baggageInfo: selectedFlight.outbound.baggageInfo,
                  },
                  inbound: {
                    airline: selectedFlight.airline,
                    airlineLogo: selectedFlight.airlineLogo,
                    flightNumber: selectedFlight.inbound.flightNumber,
                    originCode: selectedFlight.inbound.originCode,
                    destCode: selectedFlight.inbound.destCode,
                    departureTime: selectedFlight.inbound.departureTime,
                    arrivalTime: selectedFlight.inbound.arrivalTime,
                    stopsCount: selectedFlight.inbound.stopsCount,
                    stopsDuration: selectedFlight.inbound.stopsDuration,
                    date: selectedFlight.inbound.departureDate,
                    cabinClass: selectedFlight.inbound.cabinClass,
                    baggageInfo: selectedFlight.inbound.baggageInfo,
                  },
                  price: selectedFlight.totalPrice,
                  taxes: selectedFlight.taxes,
                }
              : null
          }
          passengerCount={totalPassengers}
          cartItemCount={cartItems.length}
          onSelectTab={(tab) => setActiveTab(tab as any)}
          onOpenCart={() => setCartModalOpen(true)}
          onAddToCart={() => {
            if (selectedHotel) {
              handleAddHotelToCart(
                selectedHotel,
                selectedHotel.rooms[0],
                selectedRoomConditionId || selectedHotel.rooms[0].conditions[0]?.id,
              );
            }
            if (selectedFlight) {
              handleAddFlightToCart(selectedFlight);
            }
            setCartModalOpen(true);
          }}
          onBook={() => setCartModalOpen(true)}
        />
      )}

      {/* 3. Navegação por Abas e Grid Master-Detail (65% Catálogo / 35% Truthful Preview) */}
      {hasSearched ? (
        <div className="space-y-4">
          <PackageTabsNav
            activeTab={activeTab}
            onTabChange={setActiveTab}
            counts={{
              hospedagem: hotels.length,
              aereo: flights.length,
              ingressos: services.filter((s) => s.type === "ticket").length,
              transfer_roundtrip: services.filter((s) => s.type === "transfer").length,
              pacote_servicos: 0,
              traslado_trecho: 0,
              seguro: 0,
              chip: 0,
              outros: 0,
            }}
          />

          {/* Grid Principal: 65% Catálogo / 35% Truthful Preview Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* COLUNA ESQUERDA (65%): Catálogo de Serviços */}
            <div className="lg:col-span-8 space-y-4">
              {activeTab === "hospedagem" && (
                <HotelSearchCatalog
                  hotels={hotels}
                  selectedHotelId={selectedHotel?.id || null}
                  selectedRoomConditionId={selectedRoomConditionId || null}
                  onSelectHotel={handleSelectHotel}
                  onAddToCart={handleAddHotelToCart}
                />
              )}

              {activeTab === "aereo" && (
                <FlightSearchCatalog
                  flights={flights}
                  selectedFlightId={selectedFlight?.id || null}
                  onSelectFlight={handleSelectFlight}
                  onAddToCart={handleAddFlightToCart}
                />
              )}

              {(activeTab === "ingressos" ||
                activeTab === "transfer_roundtrip" ||
                activeTab === "traslado_trecho" ||
                activeTab === "seguro" ||
                activeTab === "chip") && (
                <ServicesSearchCatalog
                  serviceType={
                    activeTab === "ingressos"
                      ? "ticket"
                      : activeTab === "seguro"
                        ? "insurance"
                        : activeTab === "chip"
                          ? "chip"
                          : "transfer"
                  }
                  services={services}
                  addedServiceIds={cartItems.map((c) => c.id.replace("cart-s-", ""))}
                  onAddService={handleAddServiceToCart}
                />
              )}
            </div>

            {/* COLUNA DIREITA (35%): Truthful Preview em Tempo Real */}
            <div className="lg:col-span-4">
              <TruthfulPreviewSidebar
                selectedHotel={
                  selectedHotel
                    ? {
                        name: selectedHotel.name,
                        roomType: selectedHotel.rooms[0]?.name,
                        mealPlan:
                          selectedHotel.rooms[0]?.conditions.find((c) => c.id === selectedRoomConditionId)?.boardType ||
                          selectedHotel.rooms[0]?.conditions[0]?.boardType,
                        price: selectedHotel.lowestPriceTotal,
                      }
                    : null
                }
                selectedFlight={
                  selectedFlight
                    ? {
                        airline: selectedFlight.airline,
                        outbound: `${selectedFlight.outbound.originCode} ➔ ${selectedFlight.outbound.destCode} (${selectedFlight.outbound.departureTime})`,
                        inbound: `${selectedFlight.inbound.originCode} ➔ ${selectedFlight.inbound.destCode} (${selectedFlight.inbound.departureTime})`,
                        price: selectedFlight.totalPrice,
                        taxes: selectedFlight.taxes,
                      }
                    : null
                }
                selectedServices={cartItems
                  .filter((i) => i.type !== "hotel" && i.type !== "flight")
                  .map((s) => ({
                    id: s.id,
                    title: s.title,
                    type: s.type,
                    price: s.priceAmount,
                  }))}
                passengerCount={totalPassengers}
                markupPercent={markupPercent}
                onMarkupChange={setMarkupPercent}
                onSendWhatsApp={() => {
                  if (selectedHotel) {
                    handleAddHotelToCart(
                      selectedHotel,
                      selectedHotel.rooms[0],
                      selectedRoomConditionId || selectedHotel.rooms[0].conditions[0]?.id,
                    );
                  }
                  if (selectedFlight) {
                    handleAddFlightToCart(selectedFlight);
                  }
                  setCartModalOpen(true);
                }}
                onOpenWebProposal={() => {
                  if (selectedHotel) {
                    handleAddHotelToCart(
                      selectedHotel,
                      selectedHotel.rooms[0],
                      selectedRoomConditionId || selectedHotel.rooms[0].conditions[0]?.id,
                    );
                  }
                  if (selectedFlight) {
                    handleAddFlightToCart(selectedFlight);
                  }
                  setCartModalOpen(true);
                }}
                onGenerateContract={() => {
                  if (selectedHotel) {
                    handleAddHotelToCart(
                      selectedHotel,
                      selectedHotel.rooms[0],
                      selectedRoomConditionId || selectedHotel.rooms[0].conditions[0]?.id,
                    );
                  }
                  if (selectedFlight) {
                    handleAddFlightToCart(selectedFlight);
                  }
                  setCartModalOpen(true);
                }}
                onOpenCartModal={() => setCartModalOpen(true)}
              />
            </div>
          </div>
        </div>
      ) : (
        /* Empty / Initial State antes da Busca */
        <div className="text-center py-16 px-4 bg-muted/20 border border-border/60 rounded-[var(--radius-xl)] space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <Search className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-[17px] font-bold text-foreground">
              Pronto para pesquisar disponibilidade ao vivo
            </h3>
            <p className="text-[13px] text-muted-foreground">
              Configure a origem, destino, datas de viagem e quantidade de quartos acima. Em seguida, clique no botão azul <strong>"Pesquisar"</strong> para consultar tarifas em tempo real diretamente no GDS Infotravel.
            </p>
          </div>
        </div>
      )}

      {/* 5. Modal do Carrinho de Orçamentos com Vínculo CRM e Templates */}
      <PackageCartModal
        open={cartModalOpen}
        onOpenChange={setCartModalOpen}
        items={cartItems}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
        onSaveProposal={handleSaveProposal}
        agencyName={agency?.name || "Travel Agências"}
      />
    </div>
  );
}
