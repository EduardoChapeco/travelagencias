import { createLazyFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  Plus, UserPlus, Trash2, Sparkles, Wand2, Coins, TrendingUp, Target, Landmark, DollarSign, Calendar, Hotel, BedDouble, Users2, CheckCircle2, XCircle, AlertTriangle, Download, FileText, Layers, } from "lucide-react";
import { useConfirm } from "@/hooks/use-confirm";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { exportRoomingListXlsx, exportRoomingListPdf } from "@/lib/exportRoomingList";
import ReactMarkdown from "react-markdown";
import { FileUploader } from "@/components/uploads/FileUploader";
import { MultiFileUploader } from "@/components/uploads/MultiFileUploader";
import {
  fetchRoomingListByTour, createRoomRecord, updateRoomRecord, deleteRoomRecord, allocatePassengerToRoom, deallocatePassengerFromRoom, ROOM_TYPE_LABEL, ROOM_CAPACITY, type RoomingPassenger, } from "@/services/rooming";
import { PageHeader } from "@/components/shell/PageHeader";
import { Field } from "@/components/ui/field";
import { FormInput as Input } from "@/components/ui/input";
import { NativeSelect as Select } from "@/components/ui/select";
import { SimpleSheet as Sheet } from "@/components/ui/sheet";
import { FormTextarea as Textarea } from "@/components/ui/textarea";
import { PrimaryButton, GhostButton } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { fmtDate, money } from "@/lib/formatters";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { PaymentReceiptModal } from "@/components/financial/PaymentReceiptModal";

export const Route = createLazyFileRoute("/agency/$slug/group-tours/$id")({
  component: TourDetailPage,
});

type ItineraryDay = {
  day_number?: number;
  day?: number | string;
  title: string;
  description_md?: string;
  description?: string;
};
type SeatCell = { r: number; c: number; label: string; type: string };

type GroupCost = {
  id: string;
  description: string;
  amount: number;
  type: "fixed" | "variable";
  allocated_per_pax: boolean;
};

function TourDetailPage() {
  const { id } = useParams({ from: "/agency/$slug/group-tours/$id" });
  const { agency } = useAgency();
  const qc = useQueryClient();
  const { confirm, ConfirmDialog } = useConfirm();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // Sheets for finance
  const [addCostSheet, setAddCostSheet] = useState(false);
  const [vaultSheet, setVaultSheet] = useState(false);
  const [adsSheet, setAdsSheet] = useState(false);

  const [segmentFilter, setSegmentFilter] = useState<string>("all");
  const [receiptData, setReceiptData] = useState<any>(null);

  // Real group tour costs from DB
  const costsQ = useQuery({
    enabled: !!agency,
    queryKey: ["group-tour-costs", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("group_tour_costs")
        .select("*")
        .eq("group_tour_id", id)
        .order("created_at");
      if (error) throw error;
      return (data || []) as GroupCost[];
    },
  });

  const tourCosts = costsQ.data ?? [];

  async function addCostToDB(desc: string, amount: number, type: "fixed" | "variable") {
    const { error } = await (supabase as any).from("group_tour_costs").insert({
      group_tour_id: id,
      agency_id: agency!.id,
      description: desc,
      amount,
      type,
      allocated_per_pax: type === "variable",
    });
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ["group-tour-costs", id] });
  }

  async function deleteCost(costId: string) {
    const { error } = await (supabase as any).from("group_tour_costs").delete().eq("id", costId);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["group-tour-costs", id] });
    toast.success("Custo removido");
  }

  async function updatePassengerSegment(enrollmentId: string, segment: string) {
    const { error } = await (supabase as any)
      .from("group_tour_enrollments")
      .update({ segment_type: segment })
      .eq("id", enrollmentId);
    if (error) return toast.error(error.message);
    toast.success("Segmento logístico atualizado");
    qc.invalidateQueries({ queryKey: ["group-enrollments", id] });
  }

  async function updatePassengerRouting(enrollmentId: string, routing: string) {
    const { error } = await (supabase as any)
      .from("group_tour_enrollments")
      .update({ payment_routing: routing })
      .eq("id", enrollmentId);
    if (error) return toast.error(error.message);
    toast.success("Rota de pagamento atualizada");
    qc.invalidateQueries({ queryKey: ["group-enrollments", id] });
  }

  const tourQ = useQuery({
    enabled: !!agency,
    queryKey: ["group-tour", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_tours")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const enrolQ = useQuery({
    enabled: !!agency,
    queryKey: ["group-enrollments", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("group_tour_enrollments")
        .select(
          "id, passenger_name, passenger_cpf, status, seat_number, total_paid, room_type, created_at, segment_type, payment_routing, email, phone, client_id, selected_pricing_tier, selected_extras",
        )
        .eq("group_tour_id", id)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const layoutsQ = useQuery({
    enabled: !!agency,
    queryKey: ["bus-layouts-list", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bus_layouts")
        .select("id, name")
        .eq("agency_id", agency!.id);
      if (error) throw error;
      return data || [];
    },
  });

  async function updateLayout(val: string) {
    const layoutId = val === "none" ? null : val;
    const { error } = await supabase
      .from("group_tours")
      .update({ bus_layout_id: layoutId })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Layout de ônibus atualizado");
    qc.invalidateQueries({ queryKey: ["group-tour", id] });
  }

  async function updateStatus(s: string) {
    const { error } = await supabase.from("group_tours").update({ status: s }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["group-tour", id] });
  }

  async function togglePublic() {
    if (!tourQ.data) return;
    const { error } = await supabase
      .from("group_tours")
      .update({ is_public: !tourQ.data.is_public })
      .eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["group-tour", id] });
  }

  // Savings / Ads updates
  async function saveSavings(val: number) {
    const { error } = await supabase
      .from("group_tours")
      .update({ target_poupanca_balance: val } as any)
      .eq("id", id);
    if (error) {
      // Fallback update
      const updatedTour = { ...tourQ.data, target_poupanca_balance: val };
      qc.setQueryData(["group-tour", id], updatedTour);
    }
    toast.success("Saldo poupança atualizado!");
    setVaultSheet(false);
  }

  async function saveAdsBudget(val: number) {
    const { error } = await supabase
      .from("group_tours")
      .update({ ads_budget: val } as any)
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Gasto Ads atualizado!");
    setAdsSheet(false);
  }

  const approveEnrollment = useMutation({
    mutationFn: async (e: any) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase.rpc("approve_group_enrollment", {
        _enrollment_id: e.id,
        _agent_id: u.user.id,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Inscrição aprovada! Viagem e lançamentos gerados.");
      qc.invalidateQueries({ queryKey: ["group-enrollments", id] });
    },
    onError: (err: any) => {
      toast.error(`Erro ao aprovar inscrição: ${err.message}`);
    },
  });

  const cancelEnrollment = useMutation({
    mutationFn: async (e: any) => {
      // 1. Update status to cancelled
      const { error: err } = await supabase
        .from("group_tour_enrollments")
        .update({ status: "cancelled" })
        .eq("id", e.id);
      if (err) throw err;

      // 2. Decrement reserved_seats on group_tours
      const { data: tour } = await supabase
        .from("group_tours")
        .select("reserved_seats")
        .eq("id", id)
        .maybeSingle();
      if (tour) {
        const current = tour.reserved_seats || 0;
        await supabase
          .from("group_tours")
          .update({ reserved_seats: Math.max(0, current - 1) })
          .eq("id", id);
      }
    },
    onSuccess: () => {
      toast.success("Inscrição cancelada com sucesso!");
      qc.invalidateQueries({ queryKey: ["group-enrollments", id] });
      qc.invalidateQueries({ queryKey: ["group-tour", id] });
    },
    onError: (err: any) => {
      toast.error(`Erro ao cancelar: ${err.message}`);
    },
  });

  if (tourQ.isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent mb-4" />
        <p className="text-sm text-muted-foreground">Carregando dados da excursão...</p>
      </div>
    );
  }

  if (tourQ.isError) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center bg-background rounded-[var(--radius-card)] border border-red-200 bg-red-50/50 m-6">
        <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <AlertTriangle className="h-5 w-5 text-red-600" />
        </div>
        <h3 className="text-base font-bold text-red-800">Falha ao Carregar Excursão</h3>
        <p className="text-xs text-red-600 mt-1 max-w-md">
          {tourQ.error instanceof Error
            ? tourQ.error.message
            : "Ocorreu um erro desconhecido ao carregar os dados."}
        </p>
        <button
          onClick={() => tourQ.refetch()}
          className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-[var(--radius-card)] text-xs font-semibold shadow-none transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  if (!tourQ.data) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center bg-background rounded-[var(--radius-card)] border border-dashed border-border m-6">
        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <XCircle className="h-5 w-5 text-slate-500" />
        </div>
        <h3 className="text-base font-bold text-foreground">Excursão Não Encontrada</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          A viagem com o código fornecido não existe ou foi removida pelo operador.
        </p>
        <a
          href={`/agency/${agency?.slug}/group-tours`}
          className="mt-4 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-[var(--radius-card)] text-xs font-semibold shadow-none transition-colors"
        >
          Voltar para Lista de Excursões
        </a>
      </div>
    );
  }
  const t = tourQ.data;
  const itinerary: ItineraryDay[] = Array.isArray(t.itinerary)
    ? (t.itinerary as unknown as ItineraryDay[])
    : [];

  const pCount = enrolQ.data?.length || 0;
  const confirmedCount = enrolQ.data?.filter((e: any) => e.status === "confirmed").length || 0;
  const basePrice = Number(t.base_price) || 0;
  const totalRevenue = enrolQ.data
    ? enrolQ.data.reduce((sum: number, e: any) => {
        const tierPrice =
          e.selected_pricing_tier &&
          typeof e.selected_pricing_tier === "object" &&
          "price" in e.selected_pricing_tier
            ? Number(e.selected_pricing_tier.price)
            : basePrice;
        const extrasSum = Array.isArray(e.selected_extras)
          ? e.selected_extras.reduce((s: number, ext: any) => s + (Number(ext.price) || 0), 0)
          : 0;
        return sum + tierPrice + extrasSum;
      }, 0)
    : pCount * basePrice;

  // Calculate costs from real DB
  const fixedSum =
    tourCosts.filter((c) => c.type === "fixed").reduce((sum, c) => sum + Number(c.amount), 0) +
    (Number((t as any).ads_budget) || 0);
  const varSum = tourCosts
    .filter((c) => c.type === "variable")
    .reduce((sum, c) => sum + Number(c.amount) * pCount, 0);
  const totalCosts = fixedSum + varSum;
  const netProfit = totalRevenue - totalCosts;
  const roi = totalCosts > 0 ? (netProfit / totalCosts) * 100 : 0;

  const adsSpend = Number((t as any).ads_budget) || 0;
  const cac = pCount > 0 ? adsSpend / pCount : 0;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
              <div className="flex items-center gap-2">
          <Select
            value={t.status}
            onChange={(e) => updateStatus(e.target.value)}
            className="h-8 text-xs shrink-0 glass-card border-none text-foreground border-none rounded-full px-2 focus:border-brand"
          >
            <option value="draft">Rascunho</option>
            <option value="open">Aberta / Inscrições</option>
            <option value="confirmed">Confirmada</option>
            <option value="completed">Concluída / Encerrada</option>
            <option value="cancelled">Cancelada</option>
          </Select>
          <GhostButton
            onClick={togglePublic}
            type="button"
            className="shrink-0 h-8 text-xs border-none glass-card border-none text-foreground hover:glass bg-white/5 border-white/10"
          >
            {t.is_public ? "Tornar privada" : "Publicar"}
          </GhostButton>
          <button
            onClick={() => setOpen(true)}
            className="flex h-8 items-center gap-1.5 rounded-full bg-brand px-3 text-xs font-semibold text-brand-foreground transition-colors shrink-0 cursor-pointer hover:opacity-90"
          >
            <UserPlus className="h-3.5 w-3.5" /> Inscrever passageiro
          </button>
        </div>
      
      <PageHeader title={t.title} description={t.destination ?? "Excursão em grupo terrestre"} />

      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 text-sm mb-6">
        <Stat label="Saída" value={fmtDate(t.departure_date)} />
        <Stat label="Retorno" value={fmtDate(t.return_date)} />
        <Stat label="Preço base" value={money(Number(t.base_price))} />
        <Stat
          label="Ocupação"
          value={
            (t.financial && typeof t.financial === "object" && (t.financial as any).capacity_mode === "UNLIMITED")
              ? `${confirmedCount} / Ilimitado`
              : (t.financial && typeof t.financial === "object" && (t.financial as any).capacity_mode === "ALLOTMENT")
                ? `${confirmedCount} / ${t.total_seats} (Allotment)`
                : `${confirmedCount} / ${t.total_seats}`
          }
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent p-0 overflow-x-auto no-scrollbar flex-nowrap flex shrink-0">
          <TabsTrigger
            value="overview"
            className="relative rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 text-sm font-semibold text-muted-foreground shadow-none data-[state=active]:border-brand data-[state=active]:text-foreground data-[state=active]:shadow-none shrink-0 cursor-pointer"
          >
            Visão Geral
          </TabsTrigger>
          <TabsTrigger
            value="itinerary"
            className="relative rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 text-sm font-semibold text-muted-foreground shadow-none data-[state=active]:border-brand data-[state=active]:text-foreground data-[state=active]:shadow-none shrink-0 cursor-pointer"
          >
            Itinerário
          </TabsTrigger>
          <TabsTrigger
            value="passengers"
            className="relative rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 text-sm font-semibold text-muted-foreground shadow-none data-[state=active]:border-brand data-[state=active]:text-foreground data-[state=active]:shadow-none shrink-0 cursor-pointer"
          >
            Inscritos ({enrolQ.data?.length || 0})
          </TabsTrigger>
          <TabsTrigger
            value="finance"
            className="relative rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 text-sm font-semibold text-muted-foreground shadow-none data-[state=active]:border-brand data-[state=active]:text-foreground data-[state=active]:shadow-none shrink-0 cursor-pointer"
          >
            Financeiro & ROI
          </TabsTrigger>
          <TabsTrigger
            value="hotel_pricing"
            className="relative rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 text-sm font-semibold text-muted-foreground shadow-none data-[state=active]:border-brand data-[state=active]:text-foreground data-[state=active]:shadow-none shrink-0 cursor-pointer"
          >
            Hospedagem & Tarifas
          </TabsTrigger>
          <TabsTrigger
            value="rooming"
            className="relative rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 text-sm font-semibold text-muted-foreground shadow-none data-[state=active]:border-brand data-[state=active]:text-foreground data-[state=active]:shadow-none shrink-0 cursor-pointer"
          >
            Rooming List
          </TabsTrigger>
          {t.bus_layout_id && (
            <TabsTrigger
              value="bus_seats"
              className="relative rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 text-sm font-semibold text-muted-foreground shadow-none data-[state=active]:border-brand data-[state=active]:text-foreground data-[state=active]:shadow-none shrink-0 cursor-pointer"
            >
              Mapa do Ônibus
            </TabsTrigger>
          )}
          <TabsTrigger
            value="flyers"
            className="relative rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 text-sm font-semibold text-muted-foreground shadow-none data-[state=active]:border-brand data-[state=active]:text-foreground data-[state=active]:shadow-none shrink-0 cursor-pointer"
          >
            Divulgação & Flyers
          </TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview">
          <div className="rounded border-none glass-card border-none p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Configurações Gerais</h3>
              <button
                onClick={() => setEditOpen(true)}
                className="text-xs font-semibold text-brand hover:underline"
              >
                Editar Excursão
              </button>
            </div>
            <div className="space-y-4">
              <Field label="Descrição Pública (Importante)">
                <Textarea
                  readOnly
                  value={t.important_notes || ""}
                  placeholder="Anotações visíveis ao cliente"
                  className="glass bg-white/5 border-white/10"
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="URL da Imagem de Capa">
                  <Input
                    readOnly
                    value={t.cover_image_url || ""}
                    placeholder="https://..."
                    className="glass bg-white/5 border-white/10"
                  />
                </Field>
                <Field label="Link de Compartilhamento">
                  <Input
                    readOnly
                    value={
                      typeof window !== "undefined"
                        ? `${window.location.origin}/p/${agency?.slug}/tour/${t.id}`
                        : `/p/${agency?.slug}/tour/${t.id}`
                    }
                    className="glass bg-white/5 border-white/10 font-mono text-xs"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                </Field>
              </div>
              <Field label="Layout de Assentos (Ônibus Virtual)">
                <Select
                  value={t.bus_layout_id || "none"}
                  onChange={(e) => updateLayout(e.target.value)}
                >
                  <option value="none">Nenhum (Sem escolha de lugares)</option>
                  {layoutsQ.data?.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>
        </TabsContent>

        {/* Itinerary */}
        <TabsContent value="itinerary">
          <ItineraryEditor
            tourId={id}
            days={itinerary}
            onUpdate={() => qc.invalidateQueries({ queryKey: ["group-tour", id] })}
          />
        </TabsContent>

        {/* Hotel & Pricing */}
        <TabsContent value="hotel_pricing">
          <HotelPricingTabContent
            tour={t}
            onUpdate={() => {
              qc.invalidateQueries({ queryKey: ["group-tour", id] });
              qc.invalidateQueries({ queryKey: ["group-enrollments", id] });
            }}
          />
        </TabsContent>

        {/* Passengers & Payments alerts */}
        <TabsContent value="passengers">
          {enrolQ.isLoading ? (
            <div className="py-8 text-center text-xs text-muted-foreground flex flex-col items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent mb-2" />
              Carregando lista de passageiros...
            </div>
          ) : enrolQ.isError ? (
            <div className="p-4 rounded-[var(--radius-card)] bg-red-50 border border-red-200 text-xs text-red-750 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
              <span>
                Falha ao obter lista de inscrições:{" "}
                {enrolQ.error instanceof Error ? enrolQ.error.message : "Erro no banco de dados"}
              </span>
            </div>
          ) : enrolQ.data?.length === 0 ? (
            <div className="rounded border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Sem inscrições ainda.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-[var(--radius-card)] border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-800">
                <span>
                  ⚠️ Lembrete: De acordo com o contrato, todos os saldos terrestres devem ser
                  integralmente quitados antes do embarque ({fmtDate(t.departure_date)}).
                </span>
              </div>

              {/* Segment filter tabs */}
              <div className="flex flex-wrap gap-2 items-center justify-between">
                <div className="flex gap-1.5 bg-gray-100 p-0.5 rounded-[var(--radius-card)] border-none">
                  {[
                    { id: "all", label: "Todos" },
                    { id: "bus", label: "Ônibus" },
                    { id: "flight", label: "Aéreo" },
                    { id: "cruise", label: "Cruzeiro" },
                    { id: "land_only", label: "Terrestre apenas" },
                  ].map((btn) => (
                    <button
                      key={btn.id}
                      onClick={() => setSegmentFilter(btn.id)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                        segmentFilter === btn.id
                          ? "bg-white text-gray-900 border-none shadow-none"
                          : "text-muted-foreground hover:text-foreground border border-transparent"
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
                <div className="text-[11px] text-muted-foreground font-mono">
                  Filtrados:{" "}
                  <strong>
                    {
                      ((enrolQ.data || []) as any[]).filter(
                        (e) => segmentFilter === "all" || e.segment_type === segmentFilter,
                      ).length
                    }
                  </strong>{" "}
                  de <strong>{enrolQ.data?.length}</strong> inscritos.
                </div>
              </div>

              <div className="overflow-x-auto rounded border-none">
                <table className="w-full text-sm">
                  <thead className="glass bg-white/5 border-white/10/40 text-left text-[11px] uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Passageiro</th>
                      <th className="px-3 py-2">CPF</th>
                      <th className="px-3 py-2">Assento</th>
                      <th className="px-3 py-2">Acomodação</th>
                      <th className="px-3 py-2 text-right">Pago</th>
                      <th className="px-3 py-2">Segmento Logístico</th>
                      <th className="px-3 py-2">Rota Pagamento</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {((enrolQ.data || []) as any[])
                      .filter((e) => segmentFilter === "all" || e.segment_type === segmentFilter)
                      .map((e) => (
                        <tr
                          key={e.id}
                          className="border-t border-border hover:bg-gray-50/50 transition-colors"
                        >
                          <td className="px-3 py-2.5 font-medium">{e.passenger_name}</td>
                          <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                            {e.passenger_cpf ?? "—"}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground">
                            {e.seat_number ?? "—"}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground capitalize">
                            {e.room_type || "Standard"}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-xs">
                            {money(Number(e.total_paid))}
                          </td>
                          <td className="px-3 py-2.5">
                            <select
                              value={e.segment_type || "bus"}
                              onChange={(ev) => updatePassengerSegment(e.id, ev.target.value)}
                              className="bg-white text-gray-900 border-none rounded-[var(--radius-card)] text-xs px-2 py-1 outline-none focus:border-brand transition-colors cursor-pointer"
                            >
                              <option value="bus">🚌 Ônibus</option>
                              <option value="flight">✈️ Aéreo</option>
                              <option value="cruise">🚢 Cruzeiro</option>
                              <option value="land_only">🏨 Terrestre</option>
                            </select>
                          </td>
                          <td className="px-3 py-2.5">
                            <select
                              value={e.payment_routing || "agency"}
                              onChange={(ev) => updatePassengerRouting(e.id, ev.target.value)}
                              className="bg-white text-gray-900 border-none rounded-[var(--radius-card)] text-xs px-2 py-1 outline-none focus:border-brand transition-colors cursor-pointer"
                            >
                              <option value="agency">🏢 Agência</option>
                              <option value="operator">🚢 Operadora</option>
                            </select>
                          </td>
                          <td className="px-3 py-2.5">
                            <StatusBadge
                              tone={
                                e.status === "confirmed"
                                  ? "success"
                                  : e.status === "cancelled"
                                    ? "danger"
                                    : "warning"
                              }
                            >
                              {e.status}
                            </StatusBadge>
                          </td>
                          <td className="px-3 py-2.5 text-center flex items-center justify-center gap-1.5">
                            {e.status === "confirmed" && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() =>
                                    setReceiptData({
                                      payerName: e.passenger_name,
                                      payerCpf: e.passenger_cpf,
                                      amount: Number(e.total_paid) || Number(t.base_price) || 0,
                                      paymentMethod: "pix",
                                      paymentDate: e.created_at,
                                      tripTitle: t.title,
                                      seatNumber: e.seat_number,
                                      agencyName: agency?.name || "",
                                      agencyLogo: agency?.logo_url,
                                      description: `Inscrição confirmada na excursão para ${t.destination || t.title}.`,
                                      receiptId: e.id,
                                      agencyId: agency?.id || "",
                                      enrollmentId: e.id,
                                    })
                                  }
                                  className="inline-flex h-7 px-2.5 items-center justify-center rounded bg-brand/5 text-brand hover:bg-brand/10 text-[10px] font-bold transition-all cursor-pointer"
                                >
                                  Recibo
                                </button>
                                <button
                                  onClick={() => {
                                    confirm({
                                      title: "Cancelar Inscrição Confirmada",
                                      description: `Atenção: A inscrição de "${e.passenger_name}" já foi confirmada. Deseja realmente cancelar? O assento será desocupado e a vaga liberada.`,
                                      variant: "destructive",
                                      onConfirm: () => cancelEnrollment.mutate(e),
                                    });
                                  }}
                                  disabled={cancelEnrollment.isPending}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 transition-all cursor-pointer disabled:opacity-50"
                                  title="Cancelar Inscrição"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                            {e.status === "pending" && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => approveEnrollment.mutate(e)}
                                  disabled={approveEnrollment.isPending || cancelEnrollment.isPending}
                                  className="inline-flex h-7 px-2.5 items-center justify-center rounded bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 text-[10px] font-bold transition-all cursor-pointer disabled:opacity-50"
                                >
                                  Aprovar
                                </button>
                                <button
                                  onClick={() => {
                                    confirm({
                                      title: "Rejeitar Inscrição",
                                      description: `Deseja rejeitar e cancelar a inscrição de "${e.passenger_name}"? O assento será liberado.`,
                                      variant: "destructive",
                                      onConfirm: () => cancelEnrollment.mutate(e),
                                    });
                                  }}
                                  disabled={approveEnrollment.isPending || cancelEnrollment.isPending}
                                  className="inline-flex h-7 px-2.5 items-center justify-center rounded bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 text-[10px] font-bold transition-all cursor-pointer disabled:opacity-50"
                                >
                                  Rejeitar
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Finance Tab */}
        <TabsContent value="finance">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ROI Metrics Card */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border-none rounded-[var(--radius-card)] p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3 bg-gray-50 rounded-[var(--radius-card)]">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">
                    Faturamento Bruto
                  </span>
                  <strong className="block text-lg mt-1 font-mono text-gray-900">
                    {money(totalRevenue)}
                  </strong>
                </div>
                <div className="p-3 bg-gray-50 rounded-[var(--radius-card)]">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">
                    Custos Operacionais
                  </span>
                  <strong className="block text-lg mt-1 font-mono text-rose-600">
                    {money(totalCosts)}
                  </strong>
                </div>
                <div className="p-3 bg-[#e8f3f1] rounded-[var(--radius-card)]">
                  <span className="text-[10px] text-teal-800 uppercase font-bold">
                    Resultado Líquido
                  </span>
                  <strong className="block text-lg mt-1 font-mono text-teal-700">
                    {money(netProfit)}
                  </strong>
                </div>
              </div>

              {/* Costs Breakdown */}
              <div className="bg-white border-none rounded-[var(--radius-card)] overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex justify-between items-center bg-gray-50/50">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                      Custos da Viagem (Rateio & Margem)
                    </h4>
                    <p className="text-[10px] text-muted-foreground">
                      Listagem de despesas fixas da excursão e taxas por passageiro.
                    </p>
                  </div>
                  <GhostButton
                    onClick={() => setAddCostSheet(true)}
                    className="h-7 text-[10px] font-bold"
                  >
                    + Novo Custo
                  </GhostButton>
                </div>

                <div className="divide-y divide-border">
                  {costsQ.isLoading ? (
                    <div className="px-5 py-4 text-xs text-muted-foreground">
                      Carregando custos...
                    </div>
                  ) : costsQ.isError ? (
                    <div className="px-5 py-4 text-xs text-red-650 bg-red-50/40">
                      ⚠️ Falha ao obter despesas da viagem:{" "}
                      {costsQ.error instanceof Error ? costsQ.error.message : "Erro"}
                    </div>
                  ) : tourCosts.length === 0 ? (
                    <div className="px-5 py-4 text-xs text-muted-foreground italic">
                      Nenhum custo lançado ainda.
                    </div>
                  ) : (
                    tourCosts.map((cost) => (
                      <div
                        key={cost.id}
                        className="px-5 py-3.5 flex items-center justify-between text-xs hover:bg-gray-50"
                      >
                        <div>
                          <div className="font-semibold text-gray-800">{cost.description}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {cost.type === "fixed"
                              ? "Custo Fixo"
                              : `Variável (${money(Number(cost.amount))} x ${pCount} pax)`}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <strong className="font-mono text-gray-900">
                            {cost.type === "fixed"
                              ? money(Number(cost.amount))
                              : money(Number(cost.amount) * pCount)}
                          </strong>
                          <button
                            onClick={() => deleteCost(cost.id)}
                            className="text-muted-foreground hover:text-danger p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                  {adsSpend > 0 && (
                    <div className="px-5 py-3.5 flex items-center justify-between text-xs bg-amber-500/5 hover:bg-amber-500/10">
                      <div>
                        <div className="font-semibold text-amber-800">
                          Orçamento Ads da Campanha (Google/Meta)
                        </div>
                        <div className="text-[10px] text-amber-700 mt-0.5">
                          Custo de captação integrado
                        </div>
                      </div>
                      <strong className="font-mono text-amber-900">{money(adsSpend)}</strong>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar Budgets */}
            <div className="space-y-6">
              {/* Savings account */}
              <div className="bg-white border-none rounded-[var(--radius-card)] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <Landmark className="w-5 h-5 text-gray-400" />
                  <GhostButton
                    onClick={() => setVaultSheet(true)}
                    className="h-6 text-[10px] font-bold"
                  >
                    Ajustar Saldo
                  </GhostButton>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                    Poupança do Grupo (Vault)
                  </span>
                  <strong className="text-xl font-mono text-gray-900 block mt-1">
                    {money(Number((t as any).target_poupanca_balance) || 0)}
                  </strong>
                  <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
                    Saldos e parcelas de grupos terrestres ficam retidos nesta conta garantidora até
                    o encerramento do evento pós-retorno.
                  </p>
                </div>
              </div>

              {/* CAC & Ads stats */}
              <div className="bg-white border-none rounded-[var(--radius-card)] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <Target className="w-5 h-5 text-gray-400" />
                  <GhostButton
                    onClick={() => setAdsSheet(true)}
                    className="h-6 text-[10px] font-bold"
                  >
                    Lançar Gastos Ads
                  </GhostButton>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                    Desempenho Marketing
                  </span>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="p-2 bg-gray-50 rounded">
                      <span className="text-[9px] text-gray-400 uppercase font-bold">
                        Leads Captados
                      </span>
                      <strong
                        className="block text-sm font-semibold"
                        title="Integre o Meta CAPI para rastrear leads"
                      >
                        {pCount > 0 ? `~${Math.round(pCount * 1.4)}` : "—"}
                      </strong>
                    </div>
                    <div className="p-2 bg-gray-50 rounded">
                      <span className="text-[9px] text-gray-400 uppercase font-bold">
                        CAC (Por Cliente)
                      </span>
                      <strong className="block text-sm font-semibold font-mono">
                        {money(cac)}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {t.bus_layout_id && (
          <TabsContent value="bus_seats">
            <BusSeatManager
              tourId={id}
              layoutId={t.bus_layout_id}
              passengers={enrolQ.data || []}
              onChange={() => qc.invalidateQueries({ queryKey: ["group-enrollments", id] })}
            />
          </TabsContent>
        )}

        {/* Rooming List Tab */}
        <TabsContent value="rooming">
          <RoomingListManager
            tourId={id}
            agencyId={agency?.id || ""}
            passengers={(enrolQ.data || []) as any[]}
            departureDate={t.departure_date}
            returnDate={t.return_date}
          />
        </TabsContent>

        {/* Flyers and Promos Tab */}
        <TabsContent value="flyers">
          <FlyersTabContent tour={t} agency={agency} />
        </TabsContent>
      </Tabs>

      {open && agency && (
        <NewEnrol
          tourId={id}
          agencyId={agency.id}
          onClose={() => setOpen(false)}
          onCreated={() => {
            setOpen(false);
            qc.invalidateQueries({ queryKey: ["group-enrollments", id] });
            qc.invalidateQueries({ queryKey: ["group-tour", id] });
          }}
        />
      )}

      {editOpen && (
        <EditTour
          tour={t}
          onClose={() => setEditOpen(false)}
          onUpdated={() => {
            setEditOpen(false);
            qc.invalidateQueries({ queryKey: ["group-tour", id] });
          }}
        />
      )}

      {/* Sheet: Add Cost */}
      {addCostSheet && (
        <Sheet onClose={() => setAddCostSheet(false)} title="Lançar Novo Custo">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const desc = String(formData.get("desc"));
              const amount = Number(formData.get("amount"));
              const type = String(formData.get("type")) as "fixed" | "variable";
              try {
                await addCostToDB(desc, amount, type);
                toast.success("Custo adicionado!");
                setAddCostSheet(false);
              } catch (err: any) {
                toast.error(err.message ?? "Erro ao salvar custo");
              }
            }}
            className="space-y-4"
          >
            <Field label="Descrição *">
              <Input name="desc" placeholder="ex: Seguro Viagem Allianz, Lanche Bordo" required />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Valor Unitário (R$) *">
                <Input name="amount" type="number" step="0.01" required />
              </Field>
              <Field label="Tipo de Custo">
                <Select name="type">
                  <option value="fixed">Fixo (Total Grupo)</option>
                  <option value="variable">Variável (Por Passageiro)</option>
                </Select>
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <GhostButton type="button" onClick={() => setAddCostSheet(false)}>
                Cancelar
              </GhostButton>
              <PrimaryButton type="submit">Adicionar Custo</PrimaryButton>
            </div>
          </form>
        </Sheet>
      )}

      {/* Sheet: Adjust Savings */}
      {vaultSheet && (
        <Sheet onClose={() => setVaultSheet(false)} title="Ajustar Saldo Poupança">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const val = Number(formData.get("balance"));
              saveSavings(val);
            }}
            className="space-y-4"
          >
            <Field label="Saldo da Conta Poupança (R$) *">
              <Input
                name="balance"
                type="number"
                step="0.01"
                defaultValue={Number((t as any).target_poupanca_balance) || 0}
                required
              />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <GhostButton type="button" onClick={() => setVaultSheet(false)}>
                Cancelar
              </GhostButton>
              <PrimaryButton type="submit">Salvar Saldo</PrimaryButton>
            </div>
          </form>
        </Sheet>
      )}

      {/* Sheet: Adjust Ads Budget */}
      {adsSheet && (
        <Sheet onClose={() => setAdsSheet(false)} title="Lançar Gastos de Campanhas">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const val = Number(formData.get("budget"));
              saveAdsBudget(val);
            }}
            className="space-y-4"
          >
            <Field label="Total Investido em Ads (R$) *">
              <Input
                name="budget"
                type="number"
                step="0.01"
                defaultValue={Number((t as any).ads_budget) || 0}
                required
              />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <GhostButton type="button" onClick={() => setAdsSheet(false)}>
                Cancelar
              </GhostButton>
              <PrimaryButton type="submit">Salvar Gastos</PrimaryButton>
            </div>
          </form>
        </Sheet>
      )}

      {receiptData && (
        <PaymentReceiptModal
          isOpen={!!receiptData}
          onClose={() => setReceiptData(null)}
          data={receiptData}
        />
      )}
      <ConfirmDialog />
    </div>
  );
}

// --- Flyers Promo Component ---
function FlyersTabContent({ tour, agency }: { tour: any; agency: any }) {
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);
  const [creatingBrochure, setCreatingBrochure] = useState(false);
  const flyerRef = useRef<HTMLDivElement>(null);

  // Customization States
  const [selectedTheme, setSelectedTheme] = useState<"dark" | "sunset" | "gold" | "teal">("dark");
  const [ctaTitle, setCtaTitle] = useState("GARANTA SUA VAGA");
  const [ctaSubtitle, setCtaSubtitle] = useState(
    "Escaneie o QR Code ao lado para ver roteiro completo e reservar.",
  );

  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/p/${agency?.slug}/tour/${tour.id}`
      : `/p/${agency?.slug}/tour/${tour.id}`;

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(publicUrl)}`;

  const handleDownloadFlyer = async () => {
    setDownloading(true);
    toast.loading("Gerando imagem do flyer...", { id: "flyer-export" });
    try {
      const html2canvas = (await import("html2canvas")).default;
      const el = flyerRef.current;
      if (!el) throw new Error("Elemento não encontrado");

      const canvas = await html2canvas(el, {
        scale: 3,
        useCORS: true,
        backgroundColor: null,
      });

      const link = document.createElement("a");
      link.download = `flyer-${tour.slug}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Flyer baixado com sucesso!", { id: "flyer-export" });
    } catch (err: any) {
      toast.error(`Erro ao gerar flyer: ${err.message}`, { id: "flyer-export" });
    } finally {
      setDownloading(false);
    }
  };

  const handleCreateBrochure = async () => {
    setCreatingBrochure(true);
    toast.loading("Criando Apresentação da Viagem no Studio...", { id: "brochure-create" });
    try {
      const { data: existingProp } = await supabase
        .from("proposals")
        .select("id")
        .eq("group_tour_id", tour.id)
        .maybeSingle();

      if (existingProp) {
        toast.success("Redirecionando para a apresentação existente...", { id: "brochure-create" });
        navigate({
          to: "/agency/$slug/proposals/$id",
          params: { slug: agency.slug, id: existingProp.id },
        });
        return;
      }

      const { createProposal } = await import("@/services/proposals");
      const { data: u } = await supabase.auth.getUser();

      const newProp = await createProposal(
        agency.id,
        {
          title: `Apresentação Oficial - ${tour.title}`,
          destination: tour.destination || undefined,
          pax_adults: 2,
          pax_children: 0,
          pax_infants: 0,
          currency: "BRL",
          travel_start: tour.departure_date || undefined,
          travel_end: tour.return_date || undefined,
          notes: `Apresentação vinculada à excursão em grupo: ${tour.title}.`,
          visibility: "agency",
          group_tour_id: tour.id,
        } as any,
        u.user?.id,
      );

      const { updateProposal } = await import("@/services/proposals");
      await updateProposal(newProp.id, {
        includes: tour.includes || [],
        excludes: tour.excludes || [],
        itinerary: (Array.isArray(tour.itinerary) ? tour.itinerary : []).map((day: any) => ({
          id: crypto.randomUUID(),
          day: String(day.day_number),
          title: day.title,
          description: day.description_md || "",
        })),
        cover_image_url: tour.cover_image_url,
      });

      toast.success("Apresentação criada! Redirecionando para o Studio...", { id: "brochure-create" });
      navigate({
        to: "/agency/$slug/proposals/$id",
        params: { slug: agency.slug, id: newProp.id },
      });
    } catch (err: any) {
      toast.error(`Erro ao criar apresentação: ${err.message}`, { id: "brochure-create" });
    } finally {
      setCreatingBrochure(false);
    }
  };

  const themeStyles = {
    dark: {
      gradient: "bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/30",
      accentText: "text-amber-400",
      accentBg: "bg-amber-400 text-slate-950",
    },
    sunset: {
      gradient: "bg-gradient-to-t from-indigo-950 via-purple-900/60 to-orange-500/30",
      accentText: "text-orange-400",
      accentBg: "bg-orange-400 text-slate-950",
    },
    gold: {
      gradient: "bg-gradient-to-t from-black via-slate-950/70 to-amber-950/40",
      accentText: "text-yellow-400",
      accentBg: "bg-yellow-400 text-slate-950",
    },
    teal: {
      gradient: "bg-gradient-to-t from-teal-950 via-teal-900/60 to-emerald-950/30",
      accentText: "text-emerald-400",
      accentBg: "bg-emerald-400 text-slate-950",
    },
  };

  const currentTheme = themeStyles[selectedTheme];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-1">
      {/* Col 1: Preview */}
      <div className="flex flex-col items-center space-y-4">
        <h4 className="text-xs font-bold text-slate-800 self-start uppercase tracking-wider">
          Visualização do Flyer
        </h4>

        <div
          ref={flyerRef}
          className="relative w-[300px] h-[533px] rounded-[var(--radius-card)] overflow-hidden border border-slate-800 bg-slate-950 flex flex-col justify-between p-4.5 select-none shadow-xl text-white font-sans"
          style={{ aspectRatio: "9/16" }}
        >
          {/* Cover image as full-bleed background */}
          {tour.cover_image_url ? (
            <img
              src={tour.cover_image_url}
              alt="Destination"
              className="absolute inset-0 w-full h-full object-cover z-0 opacity-80"
            />
          ) : (
            <div className="absolute inset-0 bg-slate-900 z-0" />
          )}

          {/* Linear gradient overlay based on selected theme */}
          <div className={`absolute inset-0 ${currentTheme.gradient} z-[1]`} />

          {/* Top header row */}
          <div className="flex items-center justify-between z-10 relative">
            <span
              className={`text-[8px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded shadow-none ${currentTheme.accentBg}`}
            >
              Vagas Limitadas
            </span>
            <div className="text-[9px] font-black uppercase tracking-wider text-white bg-slate-950/40 backdrop-blur-xs px-2 py-0.5 rounded border border-white/10">
              {agency?.name}
            </div>
          </div>

          {/* Main info card pushed to the bottom */}
          <div className="z-10 relative mt-auto flex flex-col space-y-3">
            <div>
              <span
                className={`text-[8px] font-extrabold uppercase tracking-widest block ${currentTheme.accentText}`}
              >
                Excursão em Grupo
              </span>
              <h2 className="text-sm font-black leading-tight tracking-tight text-white uppercase mt-0.5 line-clamp-2 drop-shadow-none">
                {tour.title}
              </h2>

              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                <span className="bg-white/10 backdrop-blur-xs text-white rounded-full px-1.5 py-0.5 text-[8px] font-bold border border-white/5 flex items-center gap-1">
                  <Calendar className="h-2.5 w-2.5 text-amber-400" />
                  {fmtDate(tour.departure_date)} a {fmtDate(tour.return_date)}
                </span>

                {tour.transport_type && (
                  <span className="bg-white/10 backdrop-blur-xs text-white rounded-full px-1.5 py-0.5 text-[8px] font-bold border border-white/5 uppercase">
                    {tour.transport_type === "bus"
                      ? "🚌 Rodoviário"
                      : tour.transport_type === "air"
                        ? "✈️ Aéreo"
                        : tour.transport_type === "cruise"
                          ? "🚢 Cruzeiro"
                          : "🔄 Conexões"}
                  </span>
                )}
              </div>
            </div>

            {tour.includes && tour.includes.length > 0 && (
              <div className="space-y-1">
                <span className="text-[7.5px] text-white/50 font-bold uppercase tracking-wider block">
                  Incluso no Pacote:
                </span>
                <div className="flex flex-wrap gap-1">
                  {tour.includes.slice(0, 3).map((inc: string, idx: number) => (
                    <span
                      key={idx}
                      className="bg-slate-950/60 backdrop-blur-xs border border-white/10 text-white rounded px-1.5 py-0.5 text-[7.5px] font-medium max-w-[85px] truncate"
                    >
                      ✓ {inc}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <span className="text-[7.5px] text-white/50 font-bold uppercase tracking-wider block">
                Valor por Pessoa:
              </span>
              <strong
                className={`text-lg font-black font-mono mt-0.5 block drop-shadow-none ${currentTheme.accentText}`}
              >
                {money(Number(tour.base_price))}
              </strong>
            </div>

            {/* Premium QR Code scanning card */}
            <div className="bg-white text-slate-950 rounded-[var(--radius-card)] p-2 flex items-center justify-between gap-2.5 shadow-none border border-white/10">
              <div className="flex-1 min-w-0">
                <span className="text-[8px] font-black uppercase tracking-wider block text-slate-900 leading-none">
                  {ctaTitle}
                </span>
                <span className="text-[7px] text-slate-500 block leading-tight mt-1 font-semibold">
                  {ctaSubtitle}
                </span>
              </div>
              <img
                src={qrCodeUrl}
                alt="Inscrições"
                className="h-10 w-10 border border-slate-200 p-0.5 bg-white shrink-0 rounded-[var(--radius-card)] shadow-none"
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleDownloadFlyer}
          disabled={downloading}
          className="flex items-center justify-center gap-1.5 h-9 w-[300px] rounded-[var(--radius-card)] bg-brand text-xs font-bold text-brand-foreground hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" /> Baixar Flyer (PNG)
        </button>
      </div>

      {/* Col 2: Customization Controls */}
      <div className="bg-white border-none rounded-[var(--radius-card)] p-5 space-y-4 shadow-none self-start">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-border pb-3">
          Personalizar Flyer
        </h4>

        <div className="space-y-3">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
            Tema de Cores
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "dark", label: "Midnight Dark", bg: "bg-slate-950 border-slate-800" },
              {
                id: "sunset",
                label: "Sunset Glow",
                bg: "bg-gradient-to-r from-orange-500 to-indigo-950 border-orange-400",
              },
              {
                id: "gold",
                label: "Gold Prestige",
                bg: "bg-gradient-to-r from-yellow-500 to-black border-yellow-400",
              },
              {
                id: "teal",
                label: "Teal Oasis",
                bg: "bg-gradient-to-r from-teal-700 to-slate-950 border-teal-400",
              },
            ].map((th) => (
              <button
                key={th.id}
                type="button"
                onClick={() => setSelectedTheme(th.id as any)}
                className={`p-2 rounded-[var(--radius-card)] border text-[11px] font-medium text-left flex items-center gap-2 cursor-pointer transition-all ${
                  selectedTheme === th.id
                    ? "border-brand bg-brand/5 font-bold shadow-xs"
                    : "border-border hover:bg-slate-50 text-slate-650"
                }`}
              >
                <span className={`h-3 w-3 rounded-full border shrink-0 ${th.bg}`} />
                {th.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 pt-2 border-t border-border">
          <Field label="Título de Chamada (CTA)">
            <Input
              value={ctaTitle}
              onChange={(e) => setCtaTitle(e.target.value.toUpperCase())}
              placeholder="Ex: GARANTA SUA VAGA"
              maxLength={22}
            />
          </Field>
          <Field label="Subtítulo de Instrução">
            <Textarea
              value={ctaSubtitle}
              onChange={(e) => setCtaSubtitle(e.target.value)}
              placeholder="Ex: Escaneie o QR Code..."
              rows={3}
              maxLength={100}
            />
          </Field>
        </div>
      </div>

      {/* Col 3: Apresentação Comercial */}
      <div className="bg-white border-none rounded-[var(--radius-card)] p-5 space-y-4 shadow-none self-start">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-border pb-3">
          Apresentação da Viagem
        </h4>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Crie uma apresentação comercial multipáginas interativa no Proposal Studio para enviar em PDF ou
          apresentar online. O sistema preencherá automaticamente todos os dados existentes da
          excursão:
        </p>

        <div className="grid grid-cols-1 gap-2 text-xs">
          {[
            "Roteiro de dias integrado",
            "Itens inclusos e excluídos",
            "Valor base e acomodações",
            "Datas e imagem de capa",
          ].map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-100 rounded-[var(--radius-card)]"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              <span>{item}</span>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-border">
          <button
            onClick={handleCreateBrochure}
            disabled={creatingBrochure}
            className="flex items-center justify-center gap-2 h-10 w-full rounded-[var(--radius-card)] bg-slate-900 text-xs font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4 text-brand" /> Criar Apresentação no Studio
          </button>
          <span className="text-[10px] text-muted-foreground block mt-2 text-center">
            Será gerado um material comercial no Studio onde poderá diagramar novos slides e exportar em PDF.
          </span>
        </div>
      </div>
    </div>
  );
}

function HotelPricingTabContent({ tour, onUpdate }: { tour: any; onUpdate: () => void }) {
  const { agency } = useAgency();
  const hotel =
    tour.hotel_details && typeof tour.hotel_details === "object" ? tour.hotel_details : {};
  const promo = tour.promo_media && typeof tour.promo_media === "object" ? tour.promo_media : {};

  // Hotel details form states
  const [hotelName, setHotelName] = useState(hotel.name || "");
  const [hotelStars, setHotelStars] = useState(Number(hotel.stars) || 3);
  const [checkIn, setCheckIn] = useState(hotel.check_in || "14:00");
  const [checkOut, setCheckOut] = useState(hotel.check_out || "12:00");
  const [description, setDescription] = useState(hotel.description || "");
  const [amenities, setAmenities] = useState<string[]>(
    Array.isArray(hotel.amenities) ? hotel.amenities : [],
  );
  const [youtubeUrl, setYoutubeUrl] = useState(promo.youtube_url || "");
  const [savingHotel, setSavingHotel] = useState(false);

  // New pricing/extra states
  const [tierName, setTierName] = useState("");
  const [tierPrice, setTierPrice] = useState<number | "">("");
  const [tierDesc, setTierDesc] = useState("");
  const [extraName, setExtraName] = useState("");
  const [extraPrice, setExtraPrice] = useState<number | "">("");
  const [extraDesc, setExtraDesc] = useState("");

  const pricingTiers = Array.isArray(tour.pricing_tiers) ? tour.pricing_tiers : [];
  const extraOptions = Array.isArray(tour.extra_options) ? tour.extra_options : [];

  const AMENITIES_LIST = [
    "Wi-Fi",
    "Piscina",
    "Ar-condicionado",
    "Café da manhã",
    "Restaurante",
    "Academia",
    "Estacionamento",
    "Spa",
    "Pet Friendly",
    "Serviço de Quarto",
  ];

  const handleSaveHotel = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingHotel(true);
    try {
      const nextHotel = {
        name: hotelName.trim(),
        stars: Number(hotelStars),
        check_in: checkIn.trim(),
        check_out: checkOut.trim(),
        description: description.trim(),
        amenities,
        gallery: hotel.gallery || [],
      };
      const nextPromo = {
        youtube_url: youtubeUrl.trim(),
      };

      const { error } = await supabase
        .from("group_tours")
        .update({
          hotel_details: nextHotel,
          promo_media: nextPromo,
        })
        .eq("id", tour.id);

      if (error) throw error;
      toast.success("Informações do hotel salvas!");
      onUpdate();
    } catch (err: any) {
      toast.error("Erro ao salvar hotel: " + err.message);
    } finally {
      setSavingHotel(false);
    }
  };

  const handleAddTier = async () => {
    if (!tierName.trim() || tierPrice === "") {
      toast.error("Preencha nome e valor da acomodação");
      return;
    }
    try {
      const nextTiers = [
        ...pricingTiers,
        { name: tierName.trim(), price: Number(tierPrice), description: tierDesc.trim() },
      ];
      const { error } = await supabase
        .from("group_tours")
        .update({ pricing_tiers: nextTiers })
        .eq("id", tour.id);

      if (error) throw error;
      toast.success("Tarifa adicionada!");
      setTierName("");
      setTierPrice("");
      setTierDesc("");
      onUpdate();
    } catch (err: any) {
      toast.error("Erro ao adicionar tarifa: " + err.message);
    }
  };

  const handleDeleteTier = async (idx: number) => {
    try {
      const nextTiers = pricingTiers.filter((_: any, i: number) => i !== idx);
      const { error } = await supabase
        .from("group_tours")
        .update({ pricing_tiers: nextTiers })
        .eq("id", tour.id);

      if (error) throw error;
      toast.success("Tarifa removida!");
      onUpdate();
    } catch (err: any) {
      toast.error("Erro ao remover tarifa: " + err.message);
    }
  };

  const handlePopulateDefaultTiers = async () => {
    const baseVal = Number(tour.base_price) || 1000;
    const defaults = [
      {
        name: "Quarto Duplo (Double) - por pessoa",
        price: baseVal,
        description: "Acomodação compartilhada para 2 adultos",
      },
      {
        name: "Quarto Individual (Single)",
        price: Math.round(baseVal * 1.4),
        description: "Acomodação privativa em quarto individual",
      },
      {
        name: "Quarto Triplo (Triple) - por pessoa",
        price: Math.round(baseVal * 0.9),
        description: "Acomodação compartilhada para 3 adultos",
      },
      {
        name: "Tarifa Infantil (Child)",
        price: Math.round(baseVal * 0.5),
        description: "Para crianças de 2 a 11 anos no mesmo quarto",
      },
    ];
    try {
      const { error } = await supabase
        .from("group_tours")
        .update({ pricing_tiers: defaults })
        .eq("id", tour.id);

      if (error) throw error;
      toast.success("Tarifas sugeridas geradas!");
      onUpdate();
    } catch (err: any) {
      toast.error("Erro ao gerar tarifas: " + err.message);
    }
  };

  const handleAddExtra = async () => {
    if (!extraName.trim() || extraPrice === "") {
      toast.error("Preencha nome e valor do opcional");
      return;
    }
    try {
      const nextExtras = [
        ...extraOptions,
        { name: extraName.trim(), price: Number(extraPrice), description: extraDesc.trim() },
      ];
      const { error } = await supabase
        .from("group_tours")
        .update({ extra_options: nextExtras })
        .eq("id", tour.id);

      if (error) throw error;
      toast.success("Opcional adicionado!");
      setExtraName("");
      setExtraPrice("");
      setExtraDesc("");
      onUpdate();
    } catch (err: any) {
      toast.error("Erro ao adicionar opcional: " + err.message);
    }
  };

  const handleDeleteExtra = async (idx: number) => {
    try {
      const nextExtras = extraOptions.filter((_: any, i: number) => i !== idx);
      const { error } = await supabase
        .from("group_tours")
        .update({ extra_options: nextExtras })
        .eq("id", tour.id);

      if (error) throw error;
      toast.success("Opcional removido!");
      onUpdate();
    } catch (err: any) {
      toast.error("Erro ao remover opcional: " + err.message);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Hotel & Video Column */}
      <div className="lg:col-span-1 bg-white border-none rounded-[var(--radius-card)] p-5 space-y-4 shadow-none self-start">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Hotel className="h-5 w-5 text-brand" />
          <h3 className="font-bold text-sm text-foreground">Hospedagem & Mídia</h3>
        </div>
        <form onSubmit={handleSaveHotel} className="space-y-4">
          <Field label="Nome do Hotel/Pousada">
            <Input
              value={hotelName}
              onChange={(e) => setHotelName(e.target.value)}
              placeholder="Ex: Hotel Majestic Gramado"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Estrelas (Categoria)">
              <Select value={hotelStars} onChange={(e) => setHotelStars(Number(e.target.value))}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <option key={s} value={s}>
                    {s} {s === 1 ? "Estrela" : "Estrelas"}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Vídeo YouTube (URL)">
              <Input
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="Ex: https://..."
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Check-in">
              <Input
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                placeholder="14:00"
              />
            </Field>
            <Field label="Check-out">
              <Input
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                placeholder="12:00"
              />
            </Field>
          </div>

          <Field label="Descrição da Hospedagem">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva os diferenciais, instalações e localização..."
              rows={3}
            />
          </Field>

          <MultiFileUploader
            label="Galeria de Fotos do Hotel"
            values={hotel.gallery || []}
            onChange={async (urls) => {
              try {
                const nextHotel = {
                  ...hotel,
                  gallery: urls,
                };
                const { error } = await supabase
                  .from("group_tours")
                  .update({ hotel_details: nextHotel })
                  .eq("id", tour.id);
                if (error) throw error;
                toast.success("Galeria atualizada!");
                onUpdate();
              } catch (err: any) {
                toast.error("Erro ao atualizar galeria: " + err.message);
              }
            }}
            bucket="agency-media"
            folder={`${agency?.id}/tours/${tour.id}/hotel`}
            max={8}
          />

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Amenidades
            </label>
            <div className="flex flex-wrap gap-1.5">
              {AMENITIES_LIST.map((am) => {
                const isSel = amenities.includes(am);
                return (
                  <button
                    key={am}
                    type="button"
                    onClick={() => {
                      const next = isSel ? amenities.filter((x) => x !== am) : [...amenities, am];
                      setAmenities(next);
                    }}
                    className={`px-2 py-1 rounded-full text-[10px] font-semibold border transition-all cursor-pointer ${
                      isSel
                        ? "bg-brand/10 border-brand text-brand"
                        : "bg-slate-50 border-border text-muted-foreground hover:border-slate-350"
                    }`}
                  >
                    {am}
                  </button>
                );
              })}
            </div>
          </div>

          <PrimaryButton type="submit" disabled={savingHotel} className="w-full h-10 text-xs">
            {savingHotel ? "Salvando..." : "Salvar Hospedagem"}
          </PrimaryButton>
        </form>
      </div>

      {/* Pricing & Extras Columns */}
      <div className="lg:col-span-2 space-y-6">
        {/* pricing card */}
        <div className="bg-white border-none rounded-[var(--radius-card)] p-5 space-y-4 shadow-none">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <BedDouble className="h-5 w-5 text-brand" />
              <h3 className="font-bold text-sm text-foreground">
                Acomodações & Tarifas Diferenciadas
              </h3>
            </div>
            <GhostButton
              onClick={handlePopulateDefaultTiers}
              className="h-7 text-[10px] border border-brand/20 text-brand"
            >
              Gerar Padrão
            </GhostButton>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* CRUD form */}
            <div className="p-4 border-none rounded-[var(--radius-card)] bg-slate-50/50 space-y-3 self-start">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
                Cadastrar Tarifa
              </span>
              <Field label="Nome do quarto *">
                <Input
                  value={tierName}
                  onChange={(e) => setTierName(e.target.value)}
                  placeholder="Ex: Quarto Casal Premium"
                  className="h-8 text-xs"
                />
              </Field>
              <Field label="Preço por pessoa *">
                <Input
                  type="number"
                  value={tierPrice}
                  onChange={(e) =>
                    setTierPrice(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  placeholder="Valor em R$"
                  className="h-8 text-xs font-mono"
                />
              </Field>
              <Field label="Descrição (Opcional)">
                <Input
                  value={tierDesc}
                  onChange={(e) => setTierDesc(e.target.value)}
                  placeholder="Ex: Vista para a montanha"
                  className="h-8 text-xs"
                />
              </Field>
              <PrimaryButton onClick={handleAddTier} className="w-full h-8 text-xs">
                Adicionar
              </PrimaryButton>
            </div>

            {/* List */}
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {pricingTiers.length > 0 ? (
                pricingTiers.map((t: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2.5 rounded-[var(--radius-card)] border-none bg-white text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <strong className="font-semibold block truncate text-slate-800">
                        {t.name}
                      </strong>
                      {t.description && (
                        <span className="text-[10px] text-muted-foreground truncate block">
                          {t.description}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0 ml-2">
                      <span className="font-mono font-bold text-brand">{money(t.price)}</span>
                      <button
                        onClick={() => handleDeleteTier(i)}
                        className="text-muted-foreground hover:text-danger p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-muted-foreground border border-dashed border-border rounded-[var(--radius-card)] bg-slate-50/50">
                  Nenhuma acomodação cadastrada. Clientes usarão o preço base do pacote.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Extras card */}
        <div className="bg-white border-none rounded-[var(--radius-card)] p-5 space-y-4 shadow-none">
          <div className="flex items-center border-b border-border pb-3">
            <Layers className="h-5 w-5 text-brand mr-2" />
            <h3 className="font-bold text-sm text-foreground">
              Serviços Extras & Upgrades Opcionais
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* CRUD form */}
            <div className="p-4 border-none rounded-[var(--radius-card)] bg-slate-50/50 space-y-3 self-start">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
                Cadastrar Opcional
              </span>
              <Field label="Nome do serviço *">
                <Input
                  value={extraName}
                  onChange={(e) => setExtraName(e.target.value)}
                  placeholder="Ex: Passeio de Maria Fumaça"
                  className="h-8 text-xs"
                />
              </Field>
              <Field label="Valor do serviço *">
                <Input
                  type="number"
                  value={extraPrice}
                  onChange={(e) =>
                    setExtraPrice(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  placeholder="Valor em R$"
                  className="h-8 text-xs font-mono"
                />
              </Field>
              <Field label="Descrição (Opcional)">
                <Input
                  value={extraDesc}
                  onChange={(e) => setExtraDesc(e.target.value)}
                  placeholder="Ex: Inclui transfer + ingresso"
                  className="h-8 text-xs"
                />
              </Field>
              <PrimaryButton onClick={handleAddExtra} className="w-full h-8 text-xs">
                Adicionar
              </PrimaryButton>
            </div>

            {/* List */}
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {extraOptions.length > 0 ? (
                extraOptions.map((e: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2.5 rounded-[var(--radius-card)] border-none bg-white text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <strong className="font-semibold block truncate text-slate-800">
                        {e.name}
                      </strong>
                      {e.description && (
                        <span className="text-[10px] text-muted-foreground truncate block">
                          {e.description}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0 ml-2">
                      <span className="font-mono font-bold text-success">+{money(e.price)}</span>
                      <button
                        onClick={() => handleDeleteExtra(i)}
                        className="text-muted-foreground hover:text-danger p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-muted-foreground border border-dashed border-border rounded-[var(--radius-card)] bg-slate-50/50">
                  Nenhum opcional cadastrado.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border-none glass-card border-none p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-base font-semibold">{value}</div>
    </div>
  );
}

function ItineraryEditor({
  tourId,
  days,
  onUpdate,
}: {
  tourId: string;
  days: ItineraryDay[];
  onUpdate: () => void;
}) {
  const { confirm, ConfirmDialog } = useConfirm();
  const [adding, setAdding] = useState(false);
  const [dayNum, setDayNum] = useState(days.length + 1);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  const [aiOpen, setAiOpen] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);

  async function persist(next: ItineraryDay[]) {
    const { error } = await supabase
      .from("group_tours")
      .update({ itinerary: next as unknown as never })
      .eq("id", tourId);
    if (error) return toast.error(error.message);
    onUpdate();
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const next = [
      ...days,
      { day_number: dayNum, title, description_md: desc, description: desc },
    ].sort(
      (a, b) =>
        Number(a.day_number || (a as any).day || 0) - Number(b.day_number || (b as any).day || 0),
    );
    await persist(next);
    toast.success("Dia adicionado");
    setAdding(false);
    setTitle("");
    setDesc("");
    setDayNum(days.length + 2);
  }

  async function handleRemove(day_number: number) {
    confirm({
      title: "Remover este dia?",
      description: "Tem certeza de que deseja remover este dia do itinerário da excursão?",
      variant: "destructive",
      onConfirm: async () => {
        await persist(days.filter((d) => Number(d.day_number || (d as any).day) !== day_number));
      },
    });
  }

  async function generateWithAI() {
    if (!aiInput.trim())
      return toast.warning("Forneça uma referência (URL de pacote ou texto base)!");
    setAiGenerating(true);
    toast.loading("IA minerando e redigindo...", { id: "ai-itinerary" });

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      let scrapedContext = "";
      if (aiInput.startsWith("http")) {
        const scrapeRes = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-orchestrator`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({ action: "scrape", url: aiInput }),
          },
        );
        if (!scrapeRes.ok) throw new Error("Falha no Scraping (Firecrawl)");
        const scrapeData = await scrapeRes.json();
        scrapedContext = scrapeData.result;
      }

      const prompt = `Crie um roteiro de viagem passo a passo em formato JSON baseado em: ${aiInput}\nConteúdo extraído da web (se houver): ${scrapedContext}\n\nRetorne EXATAMENTE UM ARRAY DE OBJETOS com os campos "day_number" (number), "title" (string) e "description_md" (string com formatação markdown rica). Exemplo de formato: [{"day_number": 1, "title": "Chegada em Paris", "description_md": "Passeio..."}]`;

      const compRes = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-orchestrator`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            action: "completion",
            prompt,
            systemPrompt:
              "Você é um Especialista em Roteiros de Viagem focado em montar programações dia a dia. Retorne apenas JSON.",
            modelPreference: "smart",
          }),
        },
      );

      if (!compRes.ok) throw new Error("Falha na geração do roteiro");
      const compData = await compRes.json();

      const text = compData.result
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      const payload = JSON.parse(text);

      if (!Array.isArray(payload)) throw new Error("A IA não retornou uma lista válida.");

      await persist(payload as ItineraryDay[]);
      toast.success("Roteiro redigido com sucesso!", { id: "ai-itinerary" });
      setAiOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Falha na geração", { id: "ai-itinerary" });
    } finally {
      setAiGenerating(false);
    }
  }

  return (
    <div className="space-y-4">
      <ConfirmDialog />
      <div className="rounded border border-primary/30 bg-primary/5 p-4 space-y-3 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Construtor Mágico de Roteiro</span>
          </div>
          <button
            type="button"
            onClick={() => setAiOpen(!aiOpen)}
            className="text-xs font-medium text-primary hover:underline"
          >
            {aiOpen ? "Ocultar" : "Usar IA"}
          </button>
        </div>

        {aiOpen && (
          <div className="space-y-3 pt-2">
            <Textarea
              placeholder="Ex: Cole o link de um pacote concorrente OU digite 'Roteiro de 7 dias em Roma focado no Vaticano e Gastronomia'"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              rows={2}
            />
            <PrimaryButton
              type="button"
              onClick={generateWithAI}
              disabled={aiGenerating}
              className="w-full gap-2"
            >
              <Wand2 className="h-4 w-4" />{" "}
              {aiGenerating ? "Minerando e Redigindo Roteiro..." : "Gerar Itinerário Completo"}
            </PrimaryButton>
            <p className="text-[10px] text-muted-foreground text-center">
              Isso irá sobrescrever os dias atuais do roteiro.
            </p>
          </div>
        )}
      </div>

      {days.map((d, idx) => (
        <div
          key={d.day_number || (d as any).day || idx}
          className="rounded border-none glass-card border-none p-4 flex items-start gap-4"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full glass bg-white/5 border-white/10 text-xs font-semibold">
            D{d.day_number || (d as any).day}
          </div>
          <div className="flex-1">
            <div className="font-semibold">{d.title}</div>
            {(d.description_md || d.description) && (
              <div className="text-sm text-muted-foreground mt-1 prose prose-sm max-w-none prose-slate">
                <ReactMarkdown>{d.description_md || d.description}</ReactMarkdown>
              </div>
            )}
          </div>
          <button
            onClick={() => handleRemove(Number(d.day_number || (d as any).day))}
            className="text-muted-foreground hover:text-danger p-2"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

      {!adding ? (
        <button
          onClick={() => setAdding(true)}
          className="flex w-full items-center justify-center gap-1 rounded border border-dashed border-border p-4 text-sm font-medium text-muted-foreground hover:glass bg-white/5 border-white/10"
        >
          <Plus className="h-4 w-4" /> Adicionar Dia
        </button>
      ) : (
        <form
          onSubmit={handleAdd}
          className="rounded border-none glass-card border-none p-4 space-y-3"
        >
          <div className="grid grid-cols-[80px_1fr] gap-3">
            <Field label="Dia">
              <Input
                type="number"
                value={dayNum}
                onChange={(e) => setDayNum(+e.target.value)}
                required
              />
            </Field>
            <Field label="Título">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </Field>
          </div>
          <Field label="Descrição">
            <Textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="min-h-[80px]"
            />
          </Field>
          <div className="flex justify-end gap-2">
            <GhostButton type="button" onClick={() => setAdding(false)}>
              Cancelar
            </GhostButton>
            <PrimaryButton type="submit">Salvar Dia</PrimaryButton>
          </div>
        </form>
      )}
    </div>
  );
}

function NewEnrol({
  tourId,
  agencyId,
  onClose,
  onCreated,
}: {
  tourId: string;
  agencyId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.from("group_tour_enrollments").insert({
      agency_id: agencyId,
      group_tour_id: tourId,
      passenger_name: name,
      passenger_cpf: cpf || null,
      total_paid: 0,
    });
    if (!error) {
      const { data: cur } = await supabase
        .from("group_tours")
        .select("reserved_seats")
        .eq("id", tourId)
        .maybeSingle();
      if (cur)
        await supabase
          .from("group_tours")
          .update({ reserved_seats: (cur.reserved_seats || 0) + 1 })
          .eq("id", tourId);
    }
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Passageiro inscrito");
    onCreated();
  }

  return (
    <Sheet onClose={onClose} title="Nova inscrição manual">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Nome do passageiro *">
          <Input required value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="CPF">
          <Input value={cpf} onChange={(e) => setCpf(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onClose}>
            Cancelar
          </GhostButton>
          <PrimaryButton type="submit" disabled={submitting}>
            {submitting ? "Salvando…" : "Inscrever"}
          </PrimaryButton>
        </div>
      </form>
    </Sheet>
  );
}

function BusSeatManager({
  tourId,
  layoutId,
  passengers,
  onChange,
}: {
  tourId: string;
  layoutId: string;
  passengers: { id: string; passenger_name: string; seat_number: string | null }[];
  onChange: () => void;
}) {
  const { confirm, ConfirmDialog } = useConfirm();
  const [selectedSeat, setSelectedSeat] = useState<SeatCell | null>(null);
  const [selectedPax, setSelectedPax] = useState("");

  const qMap = useQuery({
    queryKey: ["bus-layout", layoutId],
    queryFn: async () => {
      const { data } = await supabase
        .from("bus_layouts")
        .select("*")
        .eq("id", layoutId)
        .maybeSingle();
      return data;
    },
  });

  async function assignSeat() {
    if (!selectedSeat || !selectedPax) return toast.error("Selecione o assento e o passageiro.");

    const executeSeatAssignment = async () => {
      await supabase
        .from("group_tour_enrollments")
        .update({ seat_number: null })
        .eq("group_tour_id", tourId)
        .eq("seat_number", selectedSeat.label);
      if (selectedPax !== "remove") {
        const { error } = await supabase
          .from("group_tour_enrollments")
          .update({ seat_number: selectedSeat.label })
          .eq("id", selectedPax);
        if (error) return toast.error(error.message);
      }
      toast.success("Assento atualizado!");
      setSelectedSeat(null);
      setSelectedPax("");
      onChange();
    };

    const currentOccupant = passengers.find((p) => p.seat_number === selectedSeat.label);
    if (currentOccupant && selectedPax !== "remove" && currentOccupant.id !== selectedPax) {
      confirm({
        title: "Assento já ocupado",
        description: `O assento ${selectedSeat.label} já está reservado para "${currentOccupant.passenger_name}". Deseja substituí-lo por "${passengers.find((p) => p.id === selectedPax)?.passenger_name}"? O passageiro anterior ficará sem assento.`,
        variant: "destructive",
        onConfirm: executeSeatAssignment,
      });
    } else {
      await executeSeatAssignment();
    }
  }

  if (qMap.isLoading)
    return <div className="text-sm text-muted-foreground p-8">Carregando mapa…</div>;
  if (!qMap.data)
    return (
      <div className="text-sm text-muted-foreground p-8">Erro ao carregar layout do ônibus.</div>
    );

  const mapData = (qMap.data.seat_map as unknown as SeatCell[]) || [];
  const maxCol = mapData.length > 0 ? Math.max(...mapData.map((c) => c.c)) + 1 : 5;
  const cols = qMap.data.cols || maxCol;

  const validSeatLabels = new Set(mapData.filter((c) => c.type === "seat").map((c) => c.label));
  const orphans = passengers.filter(
    (p) => p.seat_number && !validSeatLabels.has(p.seat_number)
  );

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <div className="flex-1 glass-card border-none border-none rounded-[var(--radius-card)] p-8 overflow-x-auto">
        <div className="min-w-max mx-auto">
          <div className="h-10 mb-6 border-b-2 border-dashed border-border/50 rounded-t-[3rem] glass bg-white/5 border-white/10/20 flex items-end justify-center pb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Motorista
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              gap: "8px",
            }}
          >
            {mapData.map((cell) => {
              const assigned = passengers.find((p) => p.seat_number === cell.label);
              const isOccupied = !!assigned;
              return (
                <div key={`${cell.r}-${cell.c}`} className="relative">
                  <button
                    type="button"
                    onClick={() => cell.type === "seat" && setSelectedSeat(cell)}
                    disabled={cell.type !== "seat"}
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-[var(--radius-card)] border-2 text-xs font-semibold transition-all",
                      cell.type === "seat" &&
                        !isOccupied &&
                        "border-border/60 glass-card border-none hover:border-brand hover:text-brand",
                      cell.type === "seat" && isOccupied && "border-brand bg-brand/10 text-brand",
                      cell.type === "aisle" &&
                        "border-dashed border-border/30 bg-transparent text-transparent",
                      cell.type === "wc" && "border-info/30 bg-info-bg text-info opacity-70",
                      cell.type === "door" &&
                        "border-warning/30 bg-warning-bg text-warning opacity-70",
                    )}
                  >
                    {cell.label}
                  </button>
                  {isOccupied && cell.type === "seat" && (
                    <div className="absolute -top-2 -right-2 h-4 w-4 bg-brand rounded-full border-2 border-surface" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="w-full md:w-80 space-y-4">
        {orphans.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-[var(--radius-card)] p-4 text-xs text-amber-900 space-y-2">
            <div className="font-bold flex items-center gap-1">
              ⚠️ Inconsistência de Assentos
            </div>
            <p className="text-[11px] text-amber-700 leading-snug font-medium">
              Os seguintes passageiros estão alocados em poltronas que não existem no layout selecionado:
            </p>
            <ul className="list-disc pl-4 space-y-1 font-semibold text-[10px] text-amber-800">
              {orphans.map((p) => (
                <li key={p.id}>
                  {p.passenger_name} ({p.seat_number})
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={async () => {
                const { error } = await supabase
                  .from("group_tour_enrollments")
                  .update({ seat_number: null })
                  .in("id", orphans.map((p) => p.id));
                if (error) return toast.error(error.message);
                toast.success("Assentos inconsistentes liberados!");
                onChange();
              }}
              className="mt-2 w-full text-center py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-[var(--radius-card)] text-[10px] transition-colors cursor-pointer"
            >
              Liberar Assentos
            </button>
          </div>
        )}

        {selectedSeat ? (
          <div className="bg-brand/5 border border-brand/20 rounded p-5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-brand mb-1">
              Poltrona {selectedSeat.label}
            </div>
            <h4 className="text-sm font-semibold mb-4">Gerenciar Assento</h4>
            <Field label="Passageiro">
              <Select value={selectedPax} onChange={(e) => setSelectedPax(e.target.value)}>
                <option value="">Selecione o passageiro...</option>
                <option value="remove">Livre (Remover reserva)</option>
                {passengers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.passenger_name}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="mt-4 flex gap-2">
              <GhostButton onClick={() => setSelectedSeat(null)} className="flex-1 text-xs">
                Cancelar
              </GhostButton>
              <PrimaryButton onClick={assignSeat} className="flex-1 text-xs">
                Confirmar
              </PrimaryButton>
            </div>
          </div>
        ) : (
          <div className="glass-card border-none border border-dashed border-border/60 rounded p-6 text-center text-sm text-muted-foreground">
            Clique em uma poltrona no mapa ao lado para alocar os passageiros inscritos.
          </div>
        )}

        <div className="glass-card border-none border-none rounded p-5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
            Resumo de Ocupação
          </div>
          <div className="flex justify-between items-center text-sm mb-2">
            <span className="flex items-center gap-2">
              <div className="w-3 h-3 bg-brand/10 border border-brand rounded-full" /> Vendidos
            </span>
            <span className="font-semibold">{passengers.filter((p) => p.seat_number).length}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="flex items-center gap-2">
              <div className="w-3 h-3 glass-card border-none border-none/60 rounded-full" /> Livres
            </span>
            <span className="font-semibold">
              {mapData.filter((c) => c.type === "seat").length -
                passengers.filter((p) => p.seat_number).length}
            </span>
          </div>
        </div>
      </div>
      <ConfirmDialog />
    </div>
  );
}

function EditTour({
  tour,
  onClose,
  onUpdated,
}: {
  tour: any;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const { agency } = useAgency();
  const hotelDetails =
    tour.hotel_details && typeof tour.hotel_details === "object" ? tour.hotel_details : {};
  const promoMedia =
    tour.promo_media && typeof tour.promo_media === "object" ? tour.promo_media : {};

  const tourFinancial =
    tour.financial && typeof tour.financial === "object" ? tour.financial : {};

  const [capacityMode, setCapacityMode] = useState(tourFinancial.capacity_mode || "FIXED");
  const [capacitySource, setCapacitySource] = useState(tourFinancial.capacity_source || "Veículo");
  const [blockedCapacity, setBlockedCapacity] = useState(tourFinancial.blocked_capacity ?? 0);
  const [sellableCapacity, setSellableCapacity] = useState(tourFinancial.sellable_capacity ?? 0);
  const [overbookingAllowed, setOverbookingAllowed] = useState(!!tourFinancial.overbooking_allowed);
  const [waitlistEnabled, setWaitlistEnabled] = useState(!!tourFinancial.waitlist_enabled);

  const [f, setF] = useState({
    title: tour.title,
    slug: tour.slug,
    departure_date: tour.departure_date ? String(tour.departure_date).substring(0, 10) : "",
    return_date: tour.return_date ? String(tour.return_date).substring(0, 10) : "",
    base_price: tour.base_price ?? 0,
    total_seats: tour.total_seats ?? 0,
    cover_image_url: tour.cover_image_url || "",
    important_notes: tour.important_notes || "",
    destination: tour.destination || "",
    transport_type: tour.transport_type || "air",
    transport_details: tour.transport_details || "",
    hotel_name: hotelDetails.name || "",
    hotel_stars: hotelDetails.stars || 3,
    hotel_check_in: hotelDetails.check_in || "14:00",
    hotel_check_out: hotelDetails.check_out || "12:00",
    hotel_description: hotelDetails.description || "",
    youtube_url: promoMedia.youtube_url || "",
  });
  const [includes, setIncludes] = useState<string[]>(
    Array.isArray(tour.includes) ? tour.includes : [],
  );
  const [excludes, setExcludes] = useState<string[]>(
    Array.isArray(tour.excludes) ? tour.excludes : [],
  );
  const [newInc, setNewInc] = useState("");
  const [newExc, setNewExc] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const nextHotelDetails = {
      ...(tour.hotel_details && typeof tour.hotel_details === "object" ? tour.hotel_details : {}),
      name: f.hotel_name.trim(),
      stars: Number(f.hotel_stars),
      check_in: f.hotel_check_in.trim(),
      check_out: f.hotel_check_out.trim(),
      description: f.hotel_description.trim(),
    };
    const nextPromoMedia = {
      ...(tour.promo_media && typeof tour.promo_media === "object" ? tour.promo_media : {}),
      youtube_url: f.youtube_url.trim(),
    };

    const nextFinancial = {
      ...tourFinancial,
      capacity_mode: capacityMode,
      capacity_source: capacitySource,
      blocked_capacity: Number(blockedCapacity),
      sellable_capacity: Number(sellableCapacity),
      overbooking_allowed: overbookingAllowed,
      waitlist_enabled: waitlistEnabled,
    };

    const { error } = await supabase
      .from("group_tours")
      .update({
        title: f.title,
        slug: f.slug,
        departure_date: f.departure_date || null,
        return_date: f.return_date || null,
        base_price: Number(f.base_price),
        total_seats: capacityMode === "UNLIMITED" ? 999999 : Number(f.total_seats),
        cover_image_url: f.cover_image_url || null,
        important_notes: f.important_notes || null,
        destination: f.destination || null,
        transport_type: f.transport_type,
        transport_details: f.transport_details || null,
        includes: includes,
        excludes: excludes,
        hotel_details: nextHotelDetails,
        promo_media: nextPromoMedia,
        financial: nextFinancial,
      })
      .eq("id", tour.id);
    setBusy(false);
    if (error) toast.error("Erro ao salvar: " + error.message);
    else {
      toast.success("Salvo com sucesso");
      onUpdated();
    }
  }

  return (
    <Sheet onClose={onClose} title="Editar Excursão">
      <form onSubmit={save} className="space-y-4">
        <Field label="Nome da Excursão">
          <Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required />
        </Field>
        <Field label="Slug (URL Amigável)">
          <Input value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} required />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Destino">
            <Input
              value={f.destination}
              onChange={(e) => setF({ ...f, destination: e.target.value })}
              placeholder="Ex: Gramado, RS"
            />
          </Field>
          <Field label="Meio de Transporte">
            <Select
              value={f.transport_type}
              onChange={(e) => setF({ ...f, transport_type: e.target.value })}
            >
              <option value="air">✈️ Aéreo</option>
              <option value="bus">🚌 Rodoviário</option>
              <option value="cruise">🚢 Marítimo / Cruzeiro</option>
              <option value="train">🚆 Trem</option>
              <option value="mixed">🔄 Misto</option>
            </Select>
          </Field>
        </div>

        <Field label="Detalhes do Transporte">
          <Input
            value={f.transport_details}
            onChange={(e) => setF({ ...f, transport_details: e.target.value })}
            placeholder="Ex: Ônibus Leito Cama, voos Gol, etc."
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Partida">
            <Input
              type="date"
              value={f.departure_date}
              onChange={(e) => setF({ ...f, departure_date: e.target.value })}
            />
          </Field>
          <Field label="Retorno">
            <Input
              type="date"
              value={f.return_date}
              onChange={(e) => setF({ ...f, return_date: e.target.value })}
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Preço (R$)">
            <Input
              type="number"
              step="0.01"
              value={f.base_price}
              onChange={(e) => setF({ ...f, base_price: e.target.value })}
              required
            />
          </Field>
          <Field label="Tipo de Capacidade">
            <Select
              value={capacityMode}
              onChange={(e) => {
                const mode = e.target.value;
                setCapacityMode(mode);
                if (mode === "UNLIMITED") {
                  setF({ ...f, total_seats: 999999 });
                } else if (f.total_seats === 999999) {
                  setF({ ...f, total_seats: 40 });
                }
              }}
            >
              <option value="FIXED">Fixo (Ônibus, Van, etc.)</option>
              <option value="ALLOTMENT">Bloqueio / Allotment (Aéreo, Cruzeiro)</option>
              <option value="MULTI_RESOURCE">Multi-veículo / Multi-recurso</option>
              <option value="DYNAMIC">Ajustável / Dinâmica</option>
              <option value="PROVIDER_CONTROLLED">Controlado pelo Fornecedor</option>
              <option value="UNLIMITED">Sem limite operacional</option>
            </Select>
          </Field>
        </div>

        {capacityMode !== "UNLIMITED" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={capacityMode === "ALLOTMENT" ? "Lugares Bloqueados" : "Vagas (Total)"}>
              <Input
                type="number"
                value={f.total_seats === 999999 ? "" : f.total_seats}
                onChange={(e) => setF({ ...f, total_seats: e.target.value })}
                required
              />
            </Field>
            {capacityMode === "ALLOTMENT" && (
              <Field label="Vagas Cortesia / Staff">
                <Input
                  type="number"
                  value={blockedCapacity}
                  onChange={(e) => setBlockedCapacity(Number(e.target.value))}
                />
              </Field>
            )}
          </div>
        )}

        <div className="flex items-center gap-4 py-2 border-t border-b border-border/40">
          <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={overbookingAllowed}
              onChange={(e) => setOverbookingAllowed(e.target.checked)}
              className="rounded border-border text-brand focus:ring-brand h-4 w-4"
            />
            Permitir Overbooking
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={waitlistEnabled}
              onChange={(e) => setWaitlistEnabled(e.target.checked)}
              className="rounded border-border text-brand focus:ring-brand h-4 w-4"
            />
            Ativar Lista de Espera
          </label>
        </div>
        <FileUploader
          label="Imagem de Capa (Banner)"
          value={f.cover_image_url || null}
          onChange={(url) => setF({ ...f, cover_image_url: url ?? "" })}
          bucket="agency-media"
          folder={`${agency?.id}/tours`}
          variant="image"
          publicBucket={true}
        />
        <Field label="Descrição Pública">
          <Textarea
            value={f.important_notes}
            onChange={(e) => setF({ ...f, important_notes: e.target.value })}
          />
        </Field>

        <div className="space-y-4 pt-3 border-t border-border">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Hospedagem & Vídeo (Básico)
          </h4>
          <Field label="Nome da Hospedagem">
            <Input
              value={f.hotel_name}
              onChange={(e) => setF({ ...f, hotel_name: e.target.value })}
              placeholder="Ex: Hotel Majestic Gramado"
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Categoria (Estrelas)">
              <Select
                value={f.hotel_stars}
                onChange={(e) => setF({ ...f, hotel_stars: Number(e.target.value) })}
              >
                <option value={1}>1 Estrela</option>
                <option value={2}>2 Estrelas</option>
                <option value={3}>3 Estrelas</option>
                <option value={4}>4 Estrelas</option>
                <option value={5}>5 Estrelas</option>
              </Select>
            </Field>
            <Field label="Link do Vídeo (YouTube)">
              <Input
                value={f.youtube_url}
                onChange={(e) => setF({ ...f, youtube_url: e.target.value })}
                placeholder="Ex: https://..."
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Check-in">
              <Input
                value={f.hotel_check_in}
                onChange={(e) => setF({ ...f, hotel_check_in: e.target.value })}
                placeholder="14:00"
              />
            </Field>
            <Field label="Check-out">
              <Input
                value={f.hotel_check_out}
                onChange={(e) => setF({ ...f, hotel_check_out: e.target.value })}
                placeholder="12:00"
              />
            </Field>
          </div>
          <Field label="Descrição do Hotel">
            <Textarea
              value={f.hotel_description}
              onChange={(e) => setF({ ...f, hotel_description: e.target.value })}
              placeholder="Descreva a acomodação..."
              rows={2}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
          {/* Includes */}
          <div className="space-y-2">
            <Field label="O que está incluso">
              <div className="flex gap-2">
                <Input
                  value={newInc}
                  onChange={(e) => setNewInc(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (newInc.trim()) {
                        setIncludes([...includes, newInc.trim()]);
                        setNewInc("");
                      }
                    }
                  }}
                  placeholder="Ex: Almoço incluso"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newInc.trim()) {
                      setIncludes([...includes, newInc.trim()]);
                      setNewInc("");
                    }
                  }}
                  className="bg-slate-100 hover:bg-slate-200 border-none px-3 rounded-[var(--radius-card)] text-sm shrink-0 cursor-pointer"
                >
                  +
                </button>
              </div>
            </Field>
            <div className="flex flex-col gap-1.5 max-h-[120px] overflow-y-auto pr-1">
              {includes.map((inc, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-emerald-50/60 border border-emerald-100 text-emerald-800 text-xs py-1 px-2.5 rounded-[var(--radius-card)] font-semibold"
                >
                  <span className="truncate">✓ {inc}</span>
                  <button
                    type="button"
                    onClick={() => setIncludes(includes.filter((_, idx) => idx !== i))}
                    className="text-emerald-500 hover:text-emerald-850 p-0.5 ml-2 cursor-pointer font-bold"
                  >
                    ×
                  </button>
                </div>
              ))}
              {includes.length === 0 && (
                <div className="text-[10px] text-muted-foreground italic">Nenhum item incluso.</div>
              )}
            </div>
          </div>

          {/* Excludes */}
          <div className="space-y-2">
            <Field label="O que NÃO está incluso">
              <div className="flex gap-2">
                <Input
                  value={newExc}
                  onChange={(e) => setNewExc(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (newExc.trim()) {
                        setExcludes([...excludes, newExc.trim()]);
                        setNewExc("");
                      }
                    }
                  }}
                  placeholder="Ex: Taxa de turismo"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newExc.trim()) {
                      setExcludes([...excludes, newExc.trim()]);
                      setNewExc("");
                    }
                  }}
                  className="bg-slate-100 hover:bg-slate-200 border-none px-3 rounded-[var(--radius-card)] text-sm shrink-0 cursor-pointer"
                >
                  +
                </button>
              </div>
            </Field>
            <div className="flex flex-col gap-1.5 max-h-[120px] overflow-y-auto pr-1">
              {excludes.map((exc, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-red-50/60 border border-red-100 text-red-800 text-xs py-1 px-2.5 rounded-[var(--radius-card)] font-semibold"
                >
                  <span className="truncate">✗ {exc}</span>
                  <button
                    type="button"
                    onClick={() => setExcludes(excludes.filter((_, idx) => idx !== i))}
                    className="text-red-500 hover:text-red-850 p-0.5 ml-2 cursor-pointer font-bold"
                  >
                    ×
                  </button>
                </div>
              ))}
              {excludes.length === 0 && (
                <div className="text-[10px] text-muted-foreground italic">
                  Nenhum item excluído.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 pt-2">
          <GhostButton type="button" onClick={onClose}>
            Cancelar
          </GhostButton>
          <PrimaryButton disabled={busy}>
            {busy ? "Salvando..." : "Salvar Alterações"}
          </PrimaryButton>
        </div>
      </form>
    </Sheet>
  );
}

// ─── Drag and Drop Helper Components ──────────────────────────────────────────
function DraggablePassenger({
  id,
  name,
  isCompact = false,
  onRemove,
}: {
  id: string;
  name: string;
  isCompact?: boolean;
  onRemove?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `passenger_${id}`,
    data: { id, name },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 9999,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "flex items-center justify-between py-1.5 px-3 rounded-[var(--radius-card)] glass-card border-none border-none shadow-xs hover:border-brand/50 hover:shadow-none cursor-grab active:cursor-grabbing transition-all select-none",
        isDragging && "opacity-45 border-dashed border-brand",
        isCompact
          ? "text-xs font-semibold py-1 px-2.5 bg-brand/5 border-brand/10 text-foreground"
          : "text-xs font-semibold text-foreground glass-card border-none",
      )}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <Users2 className="h-3.5 w-3.5 text-brand shrink-0" />
        <span className="truncate">{name}</span>
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation(); // Avoid triggering any drag
            onRemove();
          }}
          className="text-muted-foreground hover:text-danger transition-colors cursor-pointer ml-2 shrink-0 pointer-events-auto"
        >
          <XCircle className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function DroppableRoom({
  room,
  children,
  isFull,
}: {
  room: any;
  children: React.ReactNode;
  isFull: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `room_${room.id}`,
    data: { roomId: room.id, isFull },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-[var(--radius-card)] border glass-card border-none overflow-hidden transition-all duration-200",
        room.is_confirmed ? "border-success/40" : "border-border",
        isOver && !isFull && "ring-2 ring-brand border-brand bg-brand/5 scale-[1.01]",
        isOver && isFull && "ring-2 ring-danger border-danger bg-danger/5",
      )}
    >
      {children}
    </div>
  );
}

function DroppableUnallocated({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: "unallocated",
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-[var(--radius-card)] border border-dashed border-border glass bg-white/5 border-white/10/10 p-4 transition-all duration-200",
        isOver && "ring-2 ring-brand border-brand bg-brand/5",
      )}
    >
      {children}
    </div>
  );
}

// ─── Room type constants (moved to rooming.ts service) ────────────────────────

function RoomingListManager({
  tourId,
  agencyId,
  passengers,
  departureDate,
  returnDate,
}: {
  tourId: string;
  agencyId: string;
  passengers: Array<{ id: string; passenger_name: string; room_type?: string }>;
  departureDate: string | null;
  returnDate: string | null;
}) {
  const qc = useQueryClient();

  // ── Sensors ─────────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 8,
      },
    }),
  );

  // ── Drag state ──────────────────────────────────────────────────────────
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeDragName, setActiveDragName] = useState<string | null>(null);

  // ── Query: fetch rooms from normalized table ──────────────────────────────
  const roomsQ = useQuery({
    queryKey: ["rooming-list", tourId],
    queryFn: () => fetchRoomingListByTour(tourId),
  });

  const rooms = roomsQ.data ?? [];

  // ── Derived state ─────────────────────────────────────────────────────────
  const allocatedIds = new Set(
    rooms.flatMap((r) =>
      ((r.passengers ?? []) as unknown as RoomingPassenger[]).map((p) => p.passenger_id),
    ),
  );
  const unallocated = passengers.filter((p) => !allocatedIds.has(p.id));
  const totalBeds = rooms.reduce((sum, r) => sum + (ROOM_CAPACITY[r.room_type] ?? 2), 0);
  const totalOccupied = rooms.reduce(
    (sum, r) => sum + ((r.passengers as unknown as RoomingPassenger[]) ?? []).length,
    0,
  );

  // ── Add room state ────────────────────────────────────────────────────────
  const [addOpen, setAddOpen] = useState(false);
  const [newRoom, setNewRoom] = useState({
    room_number: "",
    room_type: "double",
    hotel_name: "",
    checkin_date: departureDate ? String(departureDate).slice(0, 10) : "",
    checkout_date: returnDate ? String(returnDate).slice(0, 10) : "",
    notes: "",
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["rooming-list", tourId] });

  // ── Export state ──────────────────────────────────────────────────────────
  const [exporting, setExporting] = useState(false);

  async function handleExportExcel() {
    if (rooms.length === 0) {
      return toast.warning("Nenhum quarto cadastrado para exportar.");
    }
    setExporting(true);
    try {
      await exportRoomingListXlsx(rooms as any, {
        filename: `rooming-list-${tourId.slice(0, 8)}`,
        tourTitle: `Excursão`,
        departureDate: departureDate,
      });
      toast.success("Rooming List exportada com sucesso!");
    } catch (err: any) {
      toast.error(`Erro ao exportar: ${err.message}`);
    } finally {
      setExporting(false);
    }
  }

  async function handleExportPdf() {
    if (rooms.length === 0) {
      return toast.warning("Nenhum quarto cadastrado para exportar.");
    }
    setExporting(true);
    try {
      await exportRoomingListPdf(rooms as any, {
        filename: `rooming-list-${tourId.slice(0, 8)}`,
        tourTitle: `Excursão`,
        departureDate: departureDate,
      });
      toast.success("Rooming List exportada para PDF com sucesso!");
    } catch (err: any) {
      toast.error(`Erro ao exportar PDF: ${err.message}`);
    } finally {
      setExporting(false);
    }
  }

  // ── Mutations ─────────────────────────────────────────────────────────────
  const addRoomMutation = useMutation({
    mutationFn: async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newRoom.room_number.trim()) throw new Error("Informe o número/nome do quarto.");
      await createRoomRecord({
        agency_id: agencyId,
        group_tour_id: tourId,
        card_id: null as any,
        room_number: newRoom.room_number,
        room_type: newRoom.room_type,
        hotel_name: newRoom.hotel_name || null,
        checkin_date: newRoom.checkin_date || null,
        checkout_date: newRoom.checkout_date || null,
        notes: newRoom.notes || null,
        is_confirmed: false,
        passengers: [],
        order_index: rooms.length,
      });
    },
    onSuccess: () => {
      toast.success("Quarto adicionado!");
      setAddOpen(false);
      setNewRoom({
        room_number: "",
        room_type: "double",
        hotel_name: "",
        checkin_date: departureDate ? String(departureDate).slice(0, 10) : "",
        checkout_date: returnDate ? String(returnDate).slice(0, 10) : "",
        notes: "",
      });
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  async function removeRoom(roomId: string) {
    try {
      await deleteRoomRecord(roomId);
      toast.success("Quarto removido.");
      invalidate();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function toggleConfirmed(roomId: string, current: boolean) {
    try {
      await updateRoomRecord(roomId, { is_confirmed: !current });
      invalidate();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function assignPassengerToRoom(roomId: string, passengerId: string) {
    const pax = passengers.find((p) => p.id === passengerId);
    if (!pax) return;
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;
    const cap = ROOM_CAPACITY[room.room_type] ?? 2;
    const roomPax = (room.passengers as unknown as RoomingPassenger[]) ?? [];

    // Check if passenger is in another room and deallocate first
    const currentRoom = rooms.find((r) =>
      ((r.passengers as unknown as RoomingPassenger[]) ?? []).some(
        (p) => p.passenger_id === passengerId,
      ),
    );

    if (currentRoom && currentRoom.id === roomId) return;

    if (roomPax.length >= cap) {
      return toast.error(`Quarto ${room.room_number} está lotado (máx. ${cap} pax).`);
    }

    try {
      if (currentRoom) {
        const curRoomPax = (currentRoom.passengers as unknown as RoomingPassenger[]) ?? [];
        // Pass current version for optimistic locking
        await deallocatePassengerFromRoom(
          currentRoom.id,
          curRoomPax,
          passengerId,
          (currentRoom as any).version ?? 1,
        );
      }

      await allocatePassengerToRoom(
        roomId,
        roomPax,
        {
          passenger_id: passengerId,
          name: pax.passenger_name,
        },
        (room as any).version ?? 1,
      );
      toast.success(`${pax.passenger_name} alocado no quarto ${room.room_number}.`);
      invalidate();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function removePassengerFromRoom(roomId: string, passengerId: string) {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;
    const roomPax = (room.passengers as unknown as RoomingPassenger[]) ?? [];
    try {
      // Pass current version for optimistic locking
      await deallocatePassengerFromRoom(roomId, roomPax, passengerId, (room as any).version ?? 1);
      invalidate();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  // ── Drag & Drop Event Handlers ──────────────────────────────────────────
  function handleDragStart(event: any) {
    const { active } = event;
    setActiveDragId(active.id);
    setActiveDragName(active.data.current?.name || "");
  }

  function handleDragEnd(event: any) {
    const { active, over } = event;
    setActiveDragId(null);
    setActiveDragName(null);

    if (!over) return;

    const activeIdStr = active.id as string;
    const passengerId = activeIdStr.replace("passenger_", "");

    // 1. Dropped on a room
    if (over.id.startsWith("room_")) {
      const roomId = over.id.replace("room_", "");
      assignPassengerToRoom(roomId, passengerId);
    }
    // 2. Dropped on unallocated area
    else if (over.id === "unallocated") {
      const currentRoom = rooms.find((r) =>
        ((r.passengers as unknown as RoomingPassenger[]) ?? []).some(
          (p) => p.passenger_id === passengerId,
        ),
      );
      if (currentRoom) {
        removePassengerFromRoom(currentRoom.id, passengerId);
      }
    }
  }

  if (roomsQ.isLoading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent mx-auto mb-2" />
        Carregando rooming list…
      </div>
    );
  }

  if (roomsQ.isError) {
    return (
      <div className="p-6 text-center rounded-[var(--radius-card)] border border-red-200 bg-red-50/50 text-sm text-red-700 m-4 flex flex-col items-center justify-center">
        <AlertTriangle className="h-6 w-6 text-red-600 mb-2 shrink-0" />
        <span className="font-semibold">Falha ao obter rooming list:</span>
        <span className="text-xs text-red-650 mt-1 max-w-sm">
          {roomsQ.error instanceof Error ? roomsQ.error.message : "Erro desconhecido de conexão."}
        </span>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        {/* Summary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-[var(--radius-card)] border-none glass-card border-none p-4 text-center">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">
              Quartos
            </div>
            <div className="text-2xl font-black text-foreground">{rooms.length}</div>
          </div>
          <div className="rounded-[var(--radius-card)] border-none glass-card border-none p-4 text-center">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">
              Leitos
            </div>
            <div className="text-2xl font-black text-foreground">{totalBeds}</div>
          </div>
          <div className="rounded-[var(--radius-card)] border-none glass-card border-none p-4 text-center">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">
              Alocados
            </div>
            <div className="text-2xl font-black text-brand">{totalOccupied}</div>
          </div>
          <div
            className={`rounded-[var(--radius-card)] border p-4 text-center ${unallocated.length === 0 ? "border-success/30 bg-success/5" : "border-warning/30 bg-warning/5"}`}
          >
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">
              Sem Quarto
            </div>
            <div
              className={`text-2xl font-black ${unallocated.length === 0 ? "text-success" : "text-warning"}`}
            >
              {unallocated.length}
            </div>
          </div>
        </div>

        {/* Passageiros Sem Quarto (Droppable List) */}
        <DroppableUnallocated>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Users2 className="h-3.5 w-3.5 text-brand" /> Passageiros Sem Quarto (
              {unallocated.length})
            </h4>
            <span className="text-[10px] text-muted-foreground font-semibold">
              Arrastar passageiro para o quarto
            </span>
          </div>
          {unallocated.length === 0 ? (
            <p className="text-xs text-success font-semibold py-2">
              Todos os passageiros alocados!
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 pt-1">
              {unallocated.map((p) => (
                <DraggablePassenger key={p.id} id={p.id} name={p.passenger_name} />
              ))}
            </div>
          )}
        </DroppableUnallocated>

        {/* Header actions */}
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Hotel className="h-4 w-4 text-brand" /> Distribuição de Quartos
          </h3>
          <div className="flex items-center gap-2">
            {rooms.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  disabled={exporting}
                  title="Exportar Rooming List para Excel (.xlsx)"
                  className="flex items-center gap-1.5 h-8 px-3 rounded-full border-none glass-card border-none text-xs font-semibold text-foreground hover:glass bg-white/5 border-white/10 hover:border-brand transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="h-3.5 w-3.5" />{" "}
                  {exporting ? "Exportando..." : "Exportar Excel"}
                </button>
                <button
                  type="button"
                  onClick={handleExportPdf}
                  disabled={exporting}
                  title="Exportar Rooming List para PDF (.pdf)"
                  className="flex items-center gap-1.5 h-8 px-3 rounded-full border-none glass-card border-none text-xs font-semibold text-foreground hover:glass bg-white/5 border-white/10 hover:border-brand transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileText className="h-3.5 w-3.5 text-rose-500" />{" "}
                  {exporting ? "Exportando..." : "Exportar PDF"}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-primary text-xs font-semibold text-primary-foreground hover:opacity-95 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Novo Quarto
            </button>
          </div>
        </div>

        {/* Add room form */}
        {addOpen && (
          <div className="rounded-[var(--radius-card)] border border-brand/20 bg-brand/5 p-5">
            <h4 className="text-sm font-bold text-foreground mb-4">Cadastrar Quarto</h4>
            <form onSubmit={(e) => addRoomMutation.mutate(e)} className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Field label="Número/Nome *">
                  <Input
                    value={newRoom.room_number}
                    onChange={(e) => setNewRoom({ ...newRoom, room_number: e.target.value })}
                    placeholder="ex: 201 ou Quarto Família"
                    required
                  />
                </Field>
                <Field label="Tipo *">
                  <Select
                    value={newRoom.room_type}
                    onChange={(e) => setNewRoom({ ...newRoom, room_type: e.target.value })}
                  >
                    {Object.entries(ROOM_TYPE_LABEL).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Hotel/Pousada">
                  <Input
                    value={newRoom.hotel_name}
                    onChange={(e) => setNewRoom({ ...newRoom, hotel_name: e.target.value })}
                    placeholder="Nome do hotel"
                  />
                </Field>
                <Field label="Check-in">
                  <Input
                    type="date"
                    value={newRoom.checkin_date}
                    onChange={(e) => setNewRoom({ ...newRoom, checkin_date: e.target.value })}
                  />
                </Field>
                <Field label="Check-out">
                  <Input
                    type="date"
                    value={newRoom.checkout_date}
                    onChange={(e) => setNewRoom({ ...newRoom, checkout_date: e.target.value })}
                  />
                </Field>
                <Field label="Notas">
                  <Input
                    value={newRoom.notes}
                    onChange={(e) => setNewRoom({ ...newRoom, notes: e.target.value })}
                    placeholder="Observações..."
                  />
                </Field>
              </div>
              <div className="flex gap-2 justify-end">
                <GhostButton type="button" onClick={() => setAddOpen(false)}>
                  Cancelar
                </GhostButton>
                <PrimaryButton type="submit" disabled={addRoomMutation.isPending}>
                  {addRoomMutation.isPending ? "Salvando..." : "Adicionar Quarto"}
                </PrimaryButton>
              </div>
            </form>
          </div>
        )}

        {/* Room cards grid */}
        {rooms.length === 0 && !addOpen ? (
          <div className="rounded-[var(--radius-card)] border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            <BedDouble className="h-8 w-8 mx-auto mb-3 text-muted-foreground/30" />
            Nenhum quarto cadastrado. Clique em "Novo Quarto" para começar a montagem do rooming
            list.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {rooms.map((room) => {
              const cap = ROOM_CAPACITY[room.room_type] ?? 2;
              const roomPax = (room.passengers as unknown as RoomingPassenger[]) ?? [];
              const pctFull = roomPax.length / cap;
              const isFull = roomPax.length >= cap;
              return (
                <DroppableRoom key={room.id} room={room} isFull={isFull}>
                  {/* Room header */}
                  <div
                    className={`flex items-center justify-between px-4 py-3 ${room.is_confirmed ? "bg-success/5" : "glass bg-white/5 border-white/10/30"}`}
                  >
                    <div className="flex items-center gap-2">
                      <BedDouble className="h-4 w-4 text-brand shrink-0" />
                      <div>
                        <div className="font-bold text-sm text-foreground">
                          Quarto {room.room_number}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {ROOM_TYPE_LABEL[room.room_type] ?? room.room_type}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleConfirmed(room.id, room.is_confirmed)}
                        title={room.is_confirmed ? "Clique para desconfirmar" : "Confirmar quarto"}
                        className={`p-1 rounded transition-colors cursor-pointer ${room.is_confirmed ? "text-success" : "text-muted-foreground hover:text-success"}`}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRoom(room.id)}
                        className="p-1 rounded text-muted-foreground hover:text-danger transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Occupancy bar */}
                  <div className="px-4 pt-3 pb-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                        Ocupação
                      </span>
                      <span
                        className={`text-[10px] font-bold ${isFull ? "text-success" : "text-foreground"}`}
                      >
                        {roomPax.length}/{cap}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full glass bg-white/5 border-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isFull ? "bg-success" : pctFull >= 0.5 ? "bg-brand" : "bg-muted-foreground/30"}`}
                        style={{ width: `${Math.min(100, pctFull * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Passenger list */}
                  <div className="px-4 pb-3 space-y-1.5 mt-2">
                    {roomPax.map((p) => (
                      <DraggablePassenger
                        key={p.passenger_id}
                        id={p.passenger_id}
                        name={p.name}
                        isCompact={true}
                        onRemove={() => removePassengerFromRoom(room.id, p.passenger_id)}
                      />
                    ))}
                    {!isFull && (
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) {
                            assignPassengerToRoom(room.id, e.target.value);
                            e.target.value = "";
                          }
                        }}
                        className="w-full mt-1 h-8 rounded-[var(--radius-card)] border border-dashed border-brand/30 bg-transparent text-xs text-muted-foreground focus:outline-none focus:border-brand cursor-pointer"
                      >
                        <option value="">+ Alocar passageiro...</option>
                        {unallocated.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.passenger_name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Hotel / dates */}
                  {(room.hotel_name || room.checkin_date) && (
                    <div className="px-4 pb-3 border-t border-border/50 pt-2 flex flex-wrap gap-2 text-[10px] text-muted-foreground font-medium">
                      {room.hotel_name && (
                        <span className="flex items-center gap-1">
                          <Hotel className="h-2.5 w-2.5" />
                          {room.hotel_name}
                        </span>
                      )}
                      {room.checkin_date && <span>In: {room.checkin_date}</span>}
                      {room.checkout_date && <span>Out: {room.checkout_date}</span>}
                    </div>
                  )}
                </DroppableRoom>
              );
            })}
          </div>
        )}

        {/* Group Closure Checklist */}
        {rooms.length > 0 && (
          <div className="rounded-[var(--radius-card)] border-none glass-card border-none p-5 mt-2">
            <h4 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" /> Validação de Fechamento do Grupo
            </h4>
            <div className="space-y-2.5">
              {[
                {
                  ok: unallocated.length === 0,
                  label: `Todos os passageiros alocados em quartos (${allocatedIds.size}/${passengers.length})`,
                },
                {
                  ok: rooms.every((r) => r.is_confirmed),
                  label: `Todos os quartos confirmados pelo hotel (${rooms.filter((r) => r.is_confirmed).length}/${rooms.length})`,
                },
                {
                  ok: rooms.every((r) => !!r.hotel_name),
                  label: "Nome do hotel preenchido em todos os quartos",
                },
                {
                  ok: rooms.every((r) => !!r.checkin_date && !!r.checkout_date),
                  label: "Check-in e check-out preenchidos em todos os quartos",
                },
              ].map((check, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-3 py-2 rounded-[var(--radius-card)] text-xs font-semibold ${check.ok ? "bg-success/5 text-success" : "bg-warning/5 text-warning"}`}
                >
                  {check.ok ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                  )}
                  {check.label}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Drag Overlay for Premium Ghosting */}
      <DragOverlay>
        {activeDragId ? (
          <div className="flex items-center gap-1.5 py-1.5 px-3 rounded-[var(--radius-card)] glass-card border-none border border-brand shadow-none text-xs font-semibold text-foreground select-none cursor-grabbing opacity-90">
            <Users2 className="h-3.5 w-3.5 text-brand" />
            <span>{activeDragName}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
