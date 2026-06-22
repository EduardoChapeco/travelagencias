import { createLazyFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Plus, UserPlus, Trash2, Sparkles, Wand2, Coins, TrendingUp, Target, Landmark, DollarSign, Calendar, Hotel, BedDouble, Users2, CheckCircle2, XCircle, AlertTriangle, Download } from "lucide-react";
import { useConfirm } from "@/hooks/use-confirm";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { exportRoomingListXlsx } from "@/lib/exportRoomingList";
import {
  fetchRoomingListByTour,
  createRoomRecord,
  updateRoomRecord,
  deleteRoomRecord,
  allocatePassengerToRoom,
  deallocatePassengerFromRoom,
  ROOM_TYPE_LABEL,
  ROOM_CAPACITY,
  type RoomingPassenger,
} from "@/services/rooming";
import { PageHeader } from "@/components/shell/PageHeader";
import { HeaderPortal } from "@/components/shell/HeaderPortal";
import {
  Field,
  Input,
  Select,
  PrimaryButton,
  GhostButton,
  Sheet,
  StatusBadge,
  fmtDate,
  money,
  Textarea,
} from "@/components/ui/form";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, TouchSensor, useDraggable, useDroppable } from "@dnd-kit/core";
import { PaymentReceiptModal } from "@/components/financial/PaymentReceiptModal";

export const Route = createLazyFileRoute("/agency/$slug/group-tours/$id")({
  component: TourDetailPage,
});

type ItineraryDay = { day_number: number; title: string; description_md?: string };
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
    const { error } = await (supabase as any)
      .from("group_tour_costs")
      .delete()
      .eq("id", costId);
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
        .select("id, passenger_name, passenger_cpf, status, seat_number, total_paid, room_type, created_at, segment_type, payment_routing, email, phone, client_id")
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
    }
  });

  if (!tourQ.data) return <div className="text-sm text-muted-foreground">Carregando…</div>;
  const t = tourQ.data;
  const itinerary: ItineraryDay[] = Array.isArray(t.itinerary)
    ? (t.itinerary as unknown as ItineraryDay[])
    : [];

  const pCount = enrolQ.data?.length || 0;
  const basePrice = Number(t.base_price) || 0;
  const totalRevenue = pCount * basePrice;

  // Calculate costs from real DB
  const fixedSum = tourCosts.filter(c => c.type === "fixed").reduce((sum, c) => sum + Number(c.amount), 0) + (Number((t as any).ads_budget) || 0);
  const varSum = tourCosts.filter(c => c.type === "variable").reduce((sum, c) => sum + Number(c.amount) * pCount, 0);
  const totalCosts = fixedSum + varSum;
  const netProfit = totalRevenue - totalCosts;
  const roi = totalCosts > 0 ? (netProfit / totalCosts) * 100 : 0;

  const adsSpend = Number((t as any).ads_budget) || 0;
  const cac = pCount > 0 ? adsSpend / pCount : 0;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <HeaderPortal>
        <div className="flex items-center gap-2">
          <Select
            value={t.status}
            onChange={(e) => updateStatus(e.target.value)}
            className="h-8 text-xs shrink-0 bg-surface text-foreground border border-border rounded-md px-2 focus:border-brand"
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
            className="shrink-0 h-8 text-xs border border-border bg-surface text-foreground hover:bg-surface-alt"
          >
            {t.is_public ? "Tornar privada" : "Publicar"}
          </GhostButton>
          <button
            onClick={() => setOpen(true)}
            className="flex h-8 items-center gap-1.5 rounded-md bg-brand px-3 text-xs font-semibold text-brand-foreground transition-colors shrink-0 cursor-pointer hover:opacity-90"
          >
            <UserPlus className="h-3.5 w-3.5" /> Inscrever passageiro
          </button>
        </div>
      </HeaderPortal>

      <PageHeader title={t.title} description={t.destination ?? "Excursão em grupo terrestre"} />

      <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4 mb-6">
        <Stat label="Saída" value={fmtDate(t.departure_date)} />
        <Stat label="Retorno" value={fmtDate(t.return_date)} />
        <Stat label="Preço base" value={money(Number(t.base_price))} />
        <Stat label="Ocupação" value={`${t.reserved_seats || pCount}/${t.total_seats}`} />
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
          <div className="rounded border border-border bg-surface p-6">
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
                  className="bg-surface-alt"
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="URL da Imagem de Capa">
                  <Input
                    readOnly
                    value={t.cover_image_url || ""}
                    placeholder="https://..."
                    className="bg-surface-alt"
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
                    className="bg-surface-alt font-mono text-xs"
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

        {/* Passengers & Payments alerts */}
        <TabsContent value="passengers">
          {enrolQ.data?.length === 0 ? (
            <div className="rounded border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Sem inscrições ainda.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-800">
                <span>⚠️ Lembrete: De acordo com o contrato, todos os saldos terrestres devem ser integralmente quitados antes do embarque ({fmtDate(t.departure_date)}).</span>
              </div>

              {/* Segment filter tabs */}
              <div className="flex flex-wrap gap-2 items-center justify-between">
                <div className="flex gap-1.5 bg-gray-100 p-0.5 rounded-lg border border-border">
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
                      className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                        segmentFilter === btn.id
                          ? "bg-white text-gray-900 border border-border shadow-sm"
                          : "text-muted-foreground hover:text-foreground border border-transparent"
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
                <div className="text-[11px] text-muted-foreground font-mono">
                  Filtrados: <strong>{((enrolQ.data || []) as any[]).filter(e => segmentFilter === "all" || e.segment_type === segmentFilter).length}</strong> de <strong>{enrolQ.data?.length}</strong> inscritos.
                </div>
              </div>
              
              <div className="overflow-x-auto rounded border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-surface-alt/40 text-left text-[11px] uppercase text-muted-foreground">
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
                        <tr key={e.id} className="border-t border-border hover:bg-gray-50/50 transition-colors">
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
                              className="bg-white text-gray-900 border border-border rounded-lg text-xs px-2 py-1 outline-none focus:border-brand transition-colors cursor-pointer"
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
                              className="bg-white text-gray-900 border border-border rounded-lg text-xs px-2 py-1 outline-none focus:border-brand transition-colors cursor-pointer"
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
                              <button
                                onClick={() => setReceiptData({
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
                                })}
                                className="inline-flex h-7 px-2.5 items-center justify-center rounded bg-brand/5 text-brand hover:bg-brand/10 text-[10px] font-bold transition-all cursor-pointer animate-pulse-once"
                              >
                                Recibo
                              </button>
                            )}
                            {e.status === "pending" && (
                              <button
                                onClick={() => approveEnrollment.mutate(e)}
                                disabled={approveEnrollment.isPending}
                                className="inline-flex h-7 px-2.5 items-center justify-center rounded bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 text-[10px] font-bold transition-all cursor-pointer disabled:opacity-50"
                              >
                                {approveEnrollment.isPending ? "Aprovando…" : "Aprovar"}
                              </button>
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
              <div className="bg-white border border-border rounded-xl p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Faturamento Bruto</span>
                  <strong className="block text-lg mt-1 font-mono text-gray-900">{money(totalRevenue)}</strong>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Custos Operacionais</span>
                  <strong className="block text-lg mt-1 font-mono text-rose-600">{money(totalCosts)}</strong>
                </div>
                <div className="p-3 bg-[#e8f3f1] rounded-lg">
                  <span className="text-[10px] text-teal-800 uppercase font-bold">Resultado Líquido</span>
                  <strong className="block text-lg mt-1 font-mono text-teal-700">{money(netProfit)}</strong>
                </div>
              </div>

              {/* Costs Breakdown */}
              <div className="bg-white border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex justify-between items-center bg-gray-50/50">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">Custos da Viagem (Rateio & Margem)</h4>
                    <p className="text-[10px] text-muted-foreground">Listagem de despesas fixas da excursão e taxas por passageiro.</p>
                  </div>
                  <GhostButton onClick={() => setAddCostSheet(true)} className="h-7 text-[10px] font-bold">+ Novo Custo</GhostButton>
                </div>

                <div className="divide-y divide-border">
                  {costsQ.isLoading ? (
                    <div className="px-5 py-4 text-xs text-muted-foreground">Carregando custos...</div>
                  ) : tourCosts.length === 0 ? (
                    <div className="px-5 py-4 text-xs text-muted-foreground italic">Nenhum custo lançado ainda.</div>
                  ) : (
                    tourCosts.map((cost) => (
                      <div key={cost.id} className="px-5 py-3.5 flex items-center justify-between text-xs hover:bg-gray-50">
                        <div>
                          <div className="font-semibold text-gray-800">{cost.description}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {cost.type === "fixed" ? "Custo Fixo" : `Variável (${money(Number(cost.amount))} x ${pCount} pax)`}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <strong className="font-mono text-gray-900">
                            {cost.type === "fixed" ? money(Number(cost.amount)) : money(Number(cost.amount) * pCount)}
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
                        <div className="font-semibold text-amber-800">Orçamento Ads da Campanha (Google/Meta)</div>
                        <div className="text-[10px] text-amber-700 mt-0.5">Custo de captação integrado</div>
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
              <div className="bg-white border border-border rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <Landmark className="w-5 h-5 text-gray-400" />
                  <GhostButton onClick={() => setVaultSheet(true)} className="h-6 text-[10px] font-bold">Ajustar Saldo</GhostButton>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Poupança do Grupo (Vault)</span>
                  <strong className="text-xl font-mono text-gray-900 block mt-1">
                    {money(Number((t as any).target_poupanca_balance) || 0)}
                  </strong>
                  <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
                    Saldos e parcelas de grupos terrestres ficam retidos nesta conta garantidora até o encerramento do evento pós-retorno.
                  </p>
                </div>
              </div>

              {/* CAC & Ads stats */}
              <div className="bg-white border border-border rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <Target className="w-5 h-5 text-gray-400" />
                  <GhostButton onClick={() => setAdsSheet(true)} className="h-6 text-[10px] font-bold">Lançar Gastos Ads</GhostButton>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Desempenho Marketing</span>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="p-2 bg-gray-50 rounded">
                      <span className="text-[9px] text-gray-400 uppercase font-bold">Leads Captados</span>
                      <strong className="block text-sm font-semibold" title="Integre o Meta CAPI para rastrear leads">
                        {pCount > 0 ? `~${Math.round(pCount * 1.4)}` : "—"}
                      </strong>
                    </div>
                    <div className="p-2 bg-gray-50 rounded">
                      <span className="text-[9px] text-gray-400 uppercase font-bold">CAC (Por Cliente)</span>
                      <strong className="block text-sm font-semibold font-mono">{money(cac)}</strong>
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
              <GhostButton type="button" onClick={() => setAddCostSheet(false)}>Cancelar</GhostButton>
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
              <Input name="balance" type="number" step="0.01" defaultValue={Number((t as any).target_poupanca_balance) || 0} required />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <GhostButton type="button" onClick={() => setVaultSheet(false)}>Cancelar</GhostButton>
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
              <Input name="budget" type="number" step="0.01" defaultValue={Number((t as any).ads_budget) || 0} required />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <GhostButton type="button" onClick={() => setAdsSheet(false)}>Cancelar</GhostButton>
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
    </div>
  );
}

// --- Flyers Promo Component ---
function FlyersTabContent({ tour, agency }: { tour: any; agency: any }) {
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);
  const [creatingBrochure, setCreatingBrochure] = useState(false);
  const flyerRef = useRef<HTMLDivElement>(null);

  const publicUrl = typeof window !== "undefined"
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
    toast.loading("Criando brochura no Studio...", { id: "brochure-create" });
    try {
      const { data: existingProp } = await supabase
        .from("proposals")
        .select("id")
        .eq("group_tour_id", tour.id)
        .maybeSingle();

      if (existingProp) {
        toast.success("Redirecionando para a brochura existente...", { id: "brochure-create" });
        navigate({
          to: "/agency/$slug/proposals/$id",
          params: { slug: agency.slug, id: existingProp.id },
        });
        return;
      }

      const { createProposal } = await import("@/services/proposals");
      const { data: u } = await supabase.auth.getUser();

      const newProp = await createProposal(agency.id, {
        title: `Brochura Oficial - ${tour.title}`,
        destination: tour.destination || undefined,
        pax_adults: 2,
        pax_children: 0,
        pax_infants: 0,
        currency: "BRL",
        travel_start: tour.departure_date || undefined,
        travel_end: tour.return_date || undefined,
        notes: `Brochura vinculada à excursão em grupo: ${tour.title}.`,
        visibility: "agency",
        group_tour_id: tour.id,
      } as any, u.user?.id);

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

      toast.success("Brochura criada! Redirecionando para o Studio...", { id: "brochure-create" });
      navigate({
        to: "/agency/$slug/proposals/$id",
        params: { slug: agency.slug, id: newProp.id },
      });
    } catch (err: any) {
      toast.error(`Erro ao criar brochura: ${err.message}`, { id: "brochure-create" });
    } finally {
      setCreatingBrochure(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-1">
      <div className="lg:col-span-1 flex flex-col items-center space-y-4">
        <h4 className="text-sm font-bold text-slate-800 self-start">Flyer da Oferta (Instagram Story 9:16)</h4>
        
        <div
          ref={flyerRef}
          className="relative w-[320px] h-[568px] rounded-2xl overflow-hidden border border-border bg-white flex flex-col justify-between p-6 select-none shadow-md"
          style={{ aspectRatio: "9/16" }}
        >
          <div className="flex items-center justify-between z-10">
            <span className="text-[9px] font-extrabold uppercase tracking-widest bg-slate-900 text-white px-2 py-0.5 rounded">
              Grupo Exclusivo
            </span>
            <div className="text-[10px] font-black text-slate-800 tracking-tight">{agency?.name}</div>
          </div>

          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/10 via-white/80 to-white z-0" />
          {tour.cover_image_url && (
            <img
              src={tour.cover_image_url}
              alt="Destination"
              className="absolute inset-0 w-full h-[55%] object-cover opacity-80 z-[-1]"
            />
          )}

          <div className="z-10 mt-auto pt-4 flex flex-col space-y-4 text-slate-900 bg-white/95 backdrop-blur-xs p-4 rounded-xl border border-slate-100/50 shadow-xs">
            <div>
              <span className="text-[9px] font-bold text-brand uppercase tracking-wider block">Excursão para</span>
              <h2 className="text-base font-black leading-tight tracking-tight text-slate-800 mt-0.5">
                {tour.title}
              </h2>
              <p className="text-[10px] text-slate-500 font-semibold mt-1 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {fmtDate(tour.departure_date)} a {fmtDate(tour.return_date)}
              </p>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-[10px] font-medium text-slate-500">A partir de</span>
              <strong className="text-xl font-black font-mono text-slate-900">
                {money(Number(tour.base_price))}
              </strong>
            </div>

            {tour.includes && tour.includes.length > 0 && (
              <div className="space-y-1">
                <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">O que está incluso:</span>
                <div className="flex flex-wrap gap-1">
                  {tour.includes.slice(0, 3).map((inc: string, idx: number) => (
                    <span key={idx} className="bg-slate-50 border border-slate-100 text-slate-600 rounded px-1.5 py-0.5 text-[8px] font-medium">
                      ✓ {inc}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-dashed border-slate-200 pt-3 flex items-center justify-between gap-3">
              <div className="flex-1">
                <span className="text-[9px] font-extrabold uppercase tracking-wider block text-slate-800">Garanta sua Vaga!</span>
                <span className="text-[8px] text-slate-500 block leading-tight mt-0.5">Escaneie o QR Code ao lado para ver roteiro completo e se inscrever.</span>
              </div>
              <img src={qrCodeUrl} alt="Inscrições" className="h-14 w-14 border border-slate-200 p-0.5 bg-white shrink-0 rounded" />
            </div>
          </div>
        </div>

        <button
          onClick={handleDownloadFlyer}
          disabled={downloading}
          className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-brand text-xs font-bold text-brand-foreground hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" /> Baixar Flyer (PNG)
        </button>
      </div>

      <div className="lg:col-span-2 space-y-5 bg-white border border-border rounded-xl p-6 self-start">
        <h4 className="text-sm font-bold text-foreground">Brochura Comercial Completa (Studio)</h4>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Crie um folheto comercial multipáginas interativo no Proposal Studio para enviar em PDF ou apresentar online. 
          O sistema preencherá automaticamente todos os dados existentes da excursão:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-100 rounded-lg">
            <span className="h-2 w-2 rounded-full bg-brand" />
            <span>Roteiro de dias integrado</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-100 rounded-lg">
            <span className="h-2 w-2 rounded-full bg-brand" />
            <span>Itens inclusos e excluídos</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-100 rounded-lg">
            <span className="h-2 w-2 rounded-full bg-brand" />
            <span>Valor base e acomodações</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-100 rounded-lg">
            <span className="h-2 w-2 rounded-full bg-brand" />
            <span>Datas e imagem de capa</span>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <button
            onClick={handleCreateBrochure}
            disabled={creatingBrochure}
            className="flex items-center gap-2 h-10 px-5 rounded-lg bg-slate-900 text-xs font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4 text-brand" /> Criar Brochura no Proposal Studio
          </button>
          <span className="text-[10px] text-muted-foreground block mt-2">
            Após criar, você será redirecionado para o Studio onde poderá diagramar novos slides e exportar em PDF comercial premium.
          </span>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border bg-surface p-3">
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
    const next = [...days, { day_number: dayNum, title, description_md: desc }].sort(
      (a, b) => a.day_number - b.day_number,
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
        await persist(days.filter((d) => d.day_number !== day_number));
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

      {days.map((d) => (
        <div
          key={d.day_number}
          className="rounded border border-border bg-surface p-4 flex items-start gap-4"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-surface-alt text-xs font-semibold">
            D{d.day_number}
          </div>
          <div className="flex-1">
            <div className="font-semibold">{d.title}</div>
            {d.description_md && (
              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                {d.description_md}
              </p>
            )}
          </div>
          <button
            onClick={() => handleRemove(d.day_number)}
            className="text-muted-foreground hover:text-danger p-2"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

      {!adding ? (
        <button
          onClick={() => setAdding(true)}
          className="flex w-full items-center justify-center gap-1 rounded border border-dashed border-border p-4 text-sm font-medium text-muted-foreground hover:bg-surface-alt"
        >
          <Plus className="h-4 w-4" /> Adicionar Dia
        </button>
      ) : (
        <form
          onSubmit={handleAdd}
          className="rounded border border-border bg-surface p-4 space-y-3"
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
  }

  if (qMap.isLoading)
    return <div className="text-sm text-muted-foreground p-8">Carregando mapa…</div>;
  if (!qMap.data)
    return (
      <div className="text-sm text-muted-foreground p-8">Erro ao carregar layout do ônibus.</div>
    );

  const mapData = (qMap.data.seat_map as unknown as SeatCell[]) || [];
  const cols = qMap.data.cols;

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <div className="flex-1 bg-surface border border-border rounded-xl p-8 overflow-x-auto">
        <div className="min-w-max mx-auto">
          <div className="h-10 mb-6 border-b-2 border-dashed border-border/50 rounded-t-[3rem] bg-surface-alt/20 flex items-end justify-center pb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
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
                      "flex h-12 w-12 items-center justify-center rounded-lg border-2 text-xs font-semibold transition-all",
                      cell.type === "seat" &&
                        !isOccupied &&
                        "border-border/60 bg-surface hover:border-brand hover:text-brand",
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
          <div className="bg-surface border border-dashed border-border/60 rounded p-6 text-center text-sm text-muted-foreground">
            Clique em uma poltrona no mapa ao lado para alocar os passageiros inscritos.
          </div>
        )}

        <div className="bg-surface border border-border rounded p-5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
            Resumo de Ocupação
          </div>
          <div className="flex justify-between items-center text-sm mb-2">
            <span className="flex items-center gap-2">
              <div className="w-3 h-3 bg-brand/10 border border-brand rounded-sm" /> Vendidos
            </span>
            <span className="font-semibold">{passengers.filter((p) => p.seat_number).length}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="flex items-center gap-2">
              <div className="w-3 h-3 bg-surface border border-border/60 rounded-sm" /> Livres
            </span>
            <span className="font-semibold">
              {mapData.filter((c) => c.type === "seat").length -
                passengers.filter((p) => p.seat_number).length}
            </span>
          </div>
        </div>
      </div>
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
  const [f, setF] = useState({
    title: tour.title,
    slug: tour.slug,
    departure_date: tour.departure_date ? String(tour.departure_date).substring(0, 10) : "",
    return_date: tour.return_date ? String(tour.return_date).substring(0, 10) : "",
    base_price: tour.base_price ?? 0,
    total_seats: tour.total_seats ?? 0,
    cover_image_url: tour.cover_image_url || "",
    important_notes: tour.important_notes || "",
  });
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase
      .from("group_tours")
      .update({
        title: f.title,
        slug: f.slug,
        departure_date: f.departure_date || null,
        return_date: f.return_date || null,
        base_price: Number(f.base_price),
        total_seats: Number(f.total_seats),
        cover_image_url: f.cover_image_url || null,
        important_notes: f.important_notes || null,
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
        <div className="grid grid-cols-2 gap-4">
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
        <div className="grid grid-cols-2 gap-4">
          <Field label="Preço (R$)">
            <Input
              type="number"
              step="0.01"
              value={f.base_price}
              onChange={(e) => setF({ ...f, base_price: e.target.value })}
              required
            />
          </Field>
          <Field label="Vagas (Total)">
            <Input
              type="number"
              value={f.total_seats}
              onChange={(e) => setF({ ...f, total_seats: e.target.value })}
              required
            />
          </Field>
        </div>
        <Field label="URL Imagem Capa">
          <Input
            value={f.cover_image_url}
            onChange={(e) => setF({ ...f, cover_image_url: e.target.value })}
          />
        </Field>
        <Field label="Descrição Pública">
          <Textarea
            value={f.important_notes}
            onChange={(e) => setF({ ...f, important_notes: e.target.value })}
          />
        </Field>
        <div className="mt-6 flex justify-end gap-3">
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
function DraggablePassenger({ id, name, isCompact = false, onRemove }: { id: string; name: string; isCompact?: boolean; onRemove?: () => void }) {
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
        "flex items-center justify-between py-1.5 px-3 rounded-lg bg-surface border border-border shadow-xs hover:border-brand/50 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all select-none",
        isDragging && "opacity-45 border-dashed border-brand",
        isCompact ? "text-xs font-semibold py-1 px-2.5 bg-brand/5 border-brand/10 text-foreground" : "text-xs font-semibold text-foreground bg-surface"
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

function DroppableRoom({ room, children, isFull }: { room: any; children: React.ReactNode; isFull: boolean }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `room_${room.id}`,
    data: { roomId: room.id, isFull },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-xl border bg-surface overflow-hidden transition-all duration-200",
        room.is_confirmed ? "border-success/40" : "border-border",
        isOver && !isFull && "ring-2 ring-brand border-brand bg-brand/5 scale-[1.01]",
        isOver && isFull && "ring-2 ring-danger border-danger bg-danger/5"
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
        "rounded-xl border border-dashed border-border bg-surface-alt/10 p-4 transition-all duration-200",
        isOver && "ring-2 ring-brand border-brand bg-brand/5"
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
        tolerance: 5,
      },
    })
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
      ((r.passengers ?? []) as unknown as RoomingPassenger[]).map((p) => p.passenger_id)
    )
  );
  const unallocated = passengers.filter((p) => !allocatedIds.has(p.id));
  const totalBeds = rooms.reduce((sum, r) => sum + (ROOM_CAPACITY[r.room_type] ?? 2), 0);
  const totalOccupied = rooms.reduce(
    (sum, r) => sum + ((r.passengers as unknown as RoomingPassenger[]) ?? []).length,
    0
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
        (p) => p.passenger_id === passengerId
      )
    );

    if (currentRoom && currentRoom.id === roomId) return;

    if (roomPax.length >= cap) {
      return toast.error(`Quarto ${room.room_number} está lotado (máx. ${cap} pax).`);
    }

    try {
      if (currentRoom) {
        const curRoomPax = (currentRoom.passengers as unknown as RoomingPassenger[]) ?? [];
        // Pass current version for optimistic locking
        await deallocatePassengerFromRoom(currentRoom.id, curRoomPax, passengerId, (currentRoom as any).version ?? 1);
      }
      
      await allocatePassengerToRoom(roomId, roomPax, {
        passenger_id: passengerId,
        name: pax.passenger_name,
      }, (room as any).version ?? 1);
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
          (p) => p.passenger_id === passengerId
        )
      );
      if (currentRoom) {
        removePassengerFromRoom(currentRoom.id, passengerId);
      }
    }
  }

  if (roomsQ.isLoading)
    return <div className="p-8 text-sm text-muted-foreground">Carregando rooming list…</div>;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        {/* Summary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border bg-surface p-4 text-center">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">Quartos</div>
            <div className="text-2xl font-black text-foreground">{rooms.length}</div>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4 text-center">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">Leitos</div>
            <div className="text-2xl font-black text-foreground">{totalBeds}</div>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4 text-center">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">Alocados</div>
            <div className="text-2xl font-black text-brand">{totalOccupied}</div>
          </div>
          <div className={`rounded-xl border p-4 text-center ${unallocated.length === 0 ? "border-success/30 bg-success/5" : "border-warning/30 bg-warning/5"}`}>
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">Sem Quarto</div>
            <div className={`text-2xl font-black ${unallocated.length === 0 ? "text-success" : "text-warning"}`}>{unallocated.length}</div>
          </div>
        </div>

        {/* Passageiros Sem Quarto (Droppable List) */}
        <DroppableUnallocated>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Users2 className="h-3.5 w-3.5 text-brand" /> Passageiros Sem Quarto ({unallocated.length})
            </h4>
            <span className="text-[10px] text-muted-foreground font-semibold">Arrastar passageiro para o quarto</span>
          </div>
          {unallocated.length === 0 ? (
            <p className="text-xs text-success font-semibold py-2">Todos os passageiros alocados!</p>
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
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={exporting}
                title="Exportar Rooming List para Excel (.xlsx)"
                className="flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-surface text-xs font-semibold text-foreground hover:bg-surface-alt hover:border-brand transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="h-3.5 w-3.5" /> {exporting ? "Exportando..." : "Exportar Excel"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-xs font-semibold text-primary-foreground hover:opacity-95 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Novo Quarto
            </button>
          </div>
        </div>

        {/* Add room form */}
        {addOpen && (
          <div className="rounded-xl border border-brand/20 bg-brand/5 p-5">
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
                  <Select value={newRoom.room_type} onChange={(e) => setNewRoom({ ...newRoom, room_type: e.target.value })}>
                    {Object.entries(ROOM_TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
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
                  <Input type="date" value={newRoom.checkin_date} onChange={(e) => setNewRoom({ ...newRoom, checkin_date: e.target.value })} />
                </Field>
                <Field label="Check-out">
                  <Input type="date" value={newRoom.checkout_date} onChange={(e) => setNewRoom({ ...newRoom, checkout_date: e.target.value })} />
                </Field>
                <Field label="Notas">
                  <Input value={newRoom.notes} onChange={(e) => setNewRoom({ ...newRoom, notes: e.target.value })} placeholder="Observações..." />
                </Field>
              </div>
              <div className="flex gap-2 justify-end">
                <GhostButton type="button" onClick={() => setAddOpen(false)}>Cancelar</GhostButton>
                <PrimaryButton type="submit" disabled={addRoomMutation.isPending}>
                  {addRoomMutation.isPending ? "Salvando..." : "Adicionar Quarto"}
                </PrimaryButton>
              </div>
            </form>
          </div>
        )}

        {/* Room cards grid */}
        {rooms.length === 0 && !addOpen ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            <BedDouble className="h-8 w-8 mx-auto mb-3 text-muted-foreground/30" />
            Nenhum quarto cadastrado. Clique em "Novo Quarto" para começar a montagem do rooming list.
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
                  <div className={`flex items-center justify-between px-4 py-3 ${room.is_confirmed ? "bg-success/5" : "bg-surface-alt/30"}`}>
                    <div className="flex items-center gap-2">
                      <BedDouble className="h-4 w-4 text-brand shrink-0" />
                      <div>
                        <div className="font-bold text-sm text-foreground">Quarto {room.room_number}</div>
                        <div className="text-[10px] text-muted-foreground">{ROOM_TYPE_LABEL[room.room_type] ?? room.room_type}</div>
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
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Ocupação</span>
                      <span className={`text-[10px] font-bold ${isFull ? "text-success" : "text-foreground"}`}>{roomPax.length}/{cap}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-alt overflow-hidden">
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
                        className="w-full mt-1 h-8 rounded-lg border border-dashed border-brand/30 bg-transparent text-xs text-muted-foreground focus:outline-none focus:border-brand cursor-pointer"
                      >
                        <option value="">+ Alocar passageiro...</option>
                        {unallocated.map((p) => (
                          <option key={p.id} value={p.id}>{p.passenger_name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Hotel / dates */}
                  {(room.hotel_name || room.checkin_date) && (
                    <div className="px-4 pb-3 border-t border-border/50 pt-2 flex flex-wrap gap-2 text-[10px] text-muted-foreground font-medium">
                      {room.hotel_name && <span className="flex items-center gap-1"><Hotel className="h-2.5 w-2.5" />{room.hotel_name}</span>}
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
          <div className="rounded-xl border border-border bg-surface p-5 mt-2">
            <h4 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" /> Validação de Fechamento do Grupo
            </h4>
            <div className="space-y-2.5">
              {[
                { ok: unallocated.length === 0, label: `Todos os passageiros alocados em quartos (${allocatedIds.size}/${passengers.length})` },
                { ok: rooms.every((r) => r.is_confirmed), label: `Todos os quartos confirmados pelo hotel (${rooms.filter((r) => r.is_confirmed).length}/${rooms.length})` },
                { ok: rooms.every((r) => !!r.hotel_name), label: "Nome do hotel preenchido em todos os quartos" },
                { ok: rooms.every((r) => !!r.checkin_date && !!r.checkout_date), label: "Check-in e check-out preenchidos em todos os quartos" },
              ].map((check, i) => (
                <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold ${check.ok ? "bg-success/5 text-success" : "bg-warning/5 text-warning"}`}>
                  {check.ok
                    ? <CheckCircle2 className="h-4 w-4 shrink-0" />
                    : <AlertTriangle className="h-4 w-4 shrink-0" />}
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
          <div className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-surface border border-brand shadow-md text-xs font-semibold text-foreground select-none cursor-grabbing opacity-90">
            <Users2 className="h-3.5 w-3.5 text-brand" />
            <span>{activeDragName}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

