import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Plane,
  MoreHorizontal,
  Edit2,
  Copy,
  Trash2,
  Eye,
  Search,
  Filter,
  Archive,
  Settings2,
  ChevronDown,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useConfirm } from "@/hooks/use-confirm";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { HeaderPortal } from "@/components/shell/HeaderPortal";
import { ModuleToolbar, ModuleActionButton } from "@/components/shell/ModuleToolbar";
import { ModuleAdminPanel } from "@/components/shell/ModuleAdminPanel";
import { EmptyState } from "@/components/shell/PageHeader";
import { StatusBadge, GhostButton, money, fmtDate } from "@/components/ui/form";
import { DataTable, DataTableColumnHeader } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { NewTripWizard } from "@/components/trips/NewTripWizard";
import { infotravelImportBooking } from "@/services/infotravel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/agency/$slug/trips/")({
  head: ({ context }: any) => ({ meta: [{ title: `Viagens · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: TripsList,
});

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  planning: "neutral",
  confirmed: "info",
  in_progress: "warning",
  completed: "success",
  cancelled: "danger",
};

const STATUS_LABEL: Record<string, string> = {
  planning: "Planejamento",
  confirmed: "Confirmada",
  in_progress: "Em andamento",
  completed: "Concluída",
  cancelled: "Cancelada",
};

function TripsList() {
  const { agency, isAgencyAdmin } = useAgency();
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);

  const [newOpen, setNewOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [bookingId, setBookingId] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const pageSize = 20;

  const { confirm, ConfirmDialog } = useConfirm();

  async function handleImportBooking() {
    if (!agency || !bookingId.trim()) return;
    setImporting(true);
    try {
      const bookingData = await infotravelImportBooking(agency.id, bookingId.trim());

      if (!bookingData) throw new Error("Nenhum dado retornado para esta reserva.");

      // Verificar se esta reserva já foi importada anteriormente (Prevenção de Duplicidade)
      const { data: existingLink } = await supabase
        .from("external_entity_links")
        .select("internal_id")
        .eq("agency_id", agency.id)
        .eq("provider", "infotravel")
        .eq("entity_type", "trip")
        .eq("external_id", bookingData.locator)
        .maybeSingle();

      if (existingLink) {
        throw new Error(
          `Esta reserva já foi importada anteriormente para a viagem de ID ${existingLink.internal_id}.`,
        );
      }

      // 1. Procurar ou criar cliente
      let clientId = null;
      if (bookingData.client_cpf || bookingData.client_email) {
        let q = supabase.from("clients").select("id").eq("agency_id", agency.id);
        if (bookingData.client_cpf) {
          q = q.eq("document", bookingData.client_cpf);
        } else {
          q = q.eq("email", bookingData.client_email);
        }
        const { data: existingClient } = await q.maybeSingle();
        clientId = existingClient?.id;
      }

      if (!clientId) {
        const { data: newClient, error: clientErr } = await supabase
          .from("clients")
          .insert({
            agency_id: agency.id,
            full_name: bookingData.client_name || "Cliente Importado",
            document: bookingData.client_cpf || null,
            email: bookingData.client_email || null,
            phone: bookingData.client_phone || null,
            kind: "individual",
          })
          .select("id")
          .single();

        if (clientErr) throw clientErr;
        clientId = newClient.id;
      }

      // 2. Criar a viagem (trip)
      const startDate =
        bookingData.flights?.[0]?.date ||
        bookingData.hotels?.[0]?.checkin ||
        new Date().toISOString().split("T")[0];
      const endDate =
        bookingData.hotels?.[0]?.checkout ||
        bookingData.flights?.[0]?.date ||
        new Date().toISOString().split("T")[0];

      const { data: newTrip, error: tripErr } = await supabase
        .from("trips")
        .insert({
          agency_id: agency.id,
          client_id: clientId,
          title: `Reserva #${bookingId} - ${bookingData.destination || "Infotravel"}`,
          destination: bookingData.destination || "Vários",
          travel_start: startDate,
          travel_end: endDate,
          total_sale: bookingData.total_sale || 0,
          total_cost: 0,
          currency: "BRL",
          status: "confirmed",
          tracking_hash: "",
        })
        .select("id")
        .single();

      if (tripErr) throw tripErr;
      const tripId = newTrip.id;

      // Gravar o vínculo de entidade externa para auditoria e sincronizações futuras
      const { error: linkErr } = await supabase.from("external_entity_links").insert({
        agency_id: agency.id,
        provider: "infotravel",
        entity_type: "trip",
        external_id: bookingData.locator,
        internal_id: tripId,
        sync_status: "synced",
        metadata: {
          booking_id: bookingData.booking_id,
          imported_at: new Date().toISOString(),
        },
      });

      if (linkErr) console.error("Erro ao registrar vínculo de entidade externa:", linkErr);

      // 3. Cadastrar passageiros
      if (bookingData.passengers && bookingData.passengers.length > 0) {
        const passengerInserts = bookingData.passengers.map((p: any) => ({
          trip_id: tripId,
          agency_id: agency.id,
          full_name: p.full_name,
          document: p.document,
          document_type: p.document_type || "rg",
          birth_date: p.birth_date || null,
          email: p.email || null,
          phone: p.phone || null,
          is_lead_passenger: p.full_name === bookingData.client_name,
        }));

        const { error: passErr } = await supabase.from("trip_passengers").insert(passengerInserts);
        if (passErr) console.error("Erro ao inserir passageiros:", passErr);
      }

      // 4. Cadastrar Voucher
      const voucherFlights = (bookingData.flights || []).map((f: any) => ({
        locator: bookingData.locator || "PNR",
        airline: f.airline || "",
        flight_number: f.flight_number || "",
        origin: f.origin || "",
        destination: f.destination || "",
        date: f.date || "",
        departure_time: f.departure_time || "",
        arrival_time: f.arrival_time || "",
        class: "Econômica",
        baggage: f.baggage_rules || "Sem bagagem",
      }));

      const voucherAccommodation = (bookingData.hotels || []).map((h: any) => ({
        name: h.name || "",
        city: h.city || "",
        address: "",
        phone: "",
        checkin: h.checkin || "",
        checkout: h.checkout || "",
        room_type: h.rooms?.[0]?.type || "Standard",
        meal_plan: h.meal_plan || "Somente Hospedagem",
        confirmation: bookingData.locator || "CONFIRMADO",
      }));

      const { error: voucherErr } = await supabase.from("vouchers").insert({
        agency_id: agency.id,
        trip_id: tripId,
        source_type: "manual",
        destination: bookingData.destination || "Vários",
        general_locator: bookingData.locator || bookingId,
        passengers: (bookingData.passengers || []).map((p: any) => ({
          name: p.full_name,
          document: p.document || "",
        })),
        flights: voucherFlights,
        accommodation: voucherAccommodation,
        transfers: [],
        tours: [],
        insurance: {},
        emergency_contacts: [],
      });

      if (voucherErr) console.error("Erro ao cadastrar voucher:", voucherErr);

      toast.success("Reserva importada com sucesso!");
      qc.invalidateQueries({ queryKey: ["trips", agency.id] });
      setImportOpen(false);
      setBookingId("");

      navigate({ to: "/agency/$slug/trips/$id", params: { slug, id: tripId } });
    } catch (err: any) {
      toast.error(err.message || "Erro ao importar reserva do Infotravel.");
    } finally {
      setImporting(false);
    }
  }

  const list = useQuery({
    enabled: !!agency,
    queryKey: ["trips", agency?.id, page, search, statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("trips")
        .select(
          "id, number, title, status, destination, travel_start, travel_end, total_sale, currency, created_at, client_id, archived_at" as any,
          { count: "exact" },
        )
        .eq("agency_id", agency!.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (search.trim()) q = q.ilike("title", `%${search.trim()}%`);

      if (statusFilter === "archived") {
        q = q.not("archived_at", "is", null);
      } else {
        q = q.is("archived_at", null);
        if (statusFilter && statusFilter !== "all") q = q.eq("status", statusFilter as any);
      }

      const { data, error, count } = await q;
      if (error) throw error;
      return { data: data ?? [], count: count ?? 0 };
    },
  });

  // ─── Duplicar viagem via RPC ───────────────────────────────────
  const dupMut = useMutation({
    mutationFn: async (tripId: string) => {
      const { data, error } = await (supabase.rpc as any)("duplicate_trip", {
        p_trip_id: tripId,
      });
      if (error) throw new Error(error.message);
      return data as string;
    },
    onSuccess: (newId) => {
      toast.success("Viagem duplicada! Abrindo a cópia...");
      qc.invalidateQueries({ queryKey: ["trips", agency?.id] });
      navigate({ to: "/agency/$slug/trips/$id", params: { slug, id: newId } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao duplicar"),
  });

  // ─── Excluir viagem ────────────────────────────────────────────
  const delMut = useMutation({
    mutationFn: async (tripId: string) => {
      const { error } = await supabase
        .from("trips")
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq("id", tripId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Viagem excluída.");
      qc.invalidateQueries({ queryKey: ["trips", agency?.id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao excluir"),
  });

  // ─── Arquivar / Desarquivar viagem ──────────────────────────────
  const archiveMut = useMutation({
    mutationFn: async ({ tripId, archive }: { tripId: string; archive: boolean }) => {
      const { error } = await supabase
        .from("trips")
        .update({ archived_at: archive ? new Date().toISOString() : null } as any)
        .eq("id", tripId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, variables) => {
      toast.success(variables.archive ? "Viagem arquivada." : "Viagem desarquivada.");
      qc.invalidateQueries({ queryKey: ["trips", agency?.id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao alterar arquivamento"),
  });

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="#" />,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">#{row.original.number}</span>
      ),
      size: 60,
    },
    {
      accessorKey: "title",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Título" />,
      cell: ({ row }) => (
        <div>
          <div className="flex items-center gap-2">
            <Link
              to="/agency/$slug/trips/$id"
              params={{ slug: slug as string, id: row.original.id }}
              className="font-medium hover:underline text-foreground"
            >
              {row.getValue("title")}
            </Link>
            {row.original.archived_at && (
              <span className="inline-flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                <Archive className="h-3 w-3" /> Arquivada
              </span>
            )}
          </div>
          {row.original.destination && (
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {row.original.destination}
            </div>
          )}
        </div>
      ),
    },
    {
      id: "dates",
      header: "Datas",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {fmtDate(row.original.travel_start)} → {fmtDate(row.original.travel_end)}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <StatusBadge tone={STATUS_TONE[status] ?? "neutral"}>
            {STATUS_LABEL[status] ?? status}
          </StatusBadge>
        );
      },
    },
    {
      accessorKey: "total_sale",
      header: () => <div className="text-right">Venda</div>,
      cell: ({ row }) => (
        <div className="text-right font-mono text-xs whitespace-nowrap">
          {money(Number(row.getValue("total_sale")), row.original.currency)}
        </div>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right">Ações</div>,
      cell: ({ row }) => {
        const trip = row.original;
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <GhostButton className="h-7 w-7 p-0 hover:bg-surface-alt">
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </GhostButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem asChild>
                  <Link
                    to="/agency/$slug/trips/$id"
                    params={{ slug: slug as string, id: trip.id }}
                    className="cursor-pointer flex items-center gap-2"
                  >
                    <Edit2 className="h-4 w-4" /> Editar Completo
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => window.open(`/client/trips/${trip.id}`, "_blank")}
                  className="cursor-pointer"
                >
                  <Eye className="mr-2 h-4 w-4" /> Área do Cliente
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => dupMut.mutate(trip.id)}
                  disabled={dupMut.isPending}
                  className="cursor-pointer flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" /> Duplicar Pacote de Viagem
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => archiveMut.mutate({ tripId: trip.id, archive: !trip.archived_at })}
                  disabled={archiveMut.isPending}
                  className="cursor-pointer flex items-center gap-2"
                >
                  <Archive className="h-4 w-4" />
                  {trip.archived_at ? "Desarquivar Viagem" : "Arquivar Viagem"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    confirm({
                      title: "Excluir Viagem",
                      description: "Tem certeza que deseja excluir esta viagem?",
                      variant: "destructive",
                      onConfirm: () => delMut.mutate(trip.id),
                    });
                  }}
                  disabled={delMut.isPending}
                  className="cursor-pointer text-rose-600 focus:text-rose-600 flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <HeaderPortal>
        <ModuleToolbar
          title="Viagens"
          search={{
            value: search,
            onChange: (v) => { setSearch(v); setPage(1); },
            placeholder: "Buscar viagem...",
          }}
          filters={[
            { label: "Todos", value: "all" },
            { label: "Planejamento", value: "planning" },
            { label: "Confirmada", value: "confirmed" },
            { label: "Em andamento", value: "in_progress" },
            { label: "Concluída", value: "completed" },
            { label: "Cancelada", value: "cancelled" },
            { label: "Arquivadas", value: "archived" },
          ]}
          activeFilter={statusFilter}
          onFilterChange={(v) => { setStatusFilter(v); setPage(1); }}
          actions={
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setImportOpen(true)}
                className="h-7 px-2.5 flex items-center gap-1.5 rounded-full border border-white/15 text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-[11px] font-semibold"
                title="Importar do Infotravel"
              >
                <Search className="h-3 w-3" /> Infotravel
              </button>
              {isAgencyAdmin && (
                <button
                  onClick={() => setAdminPanelOpen(true)}
                  className="h-7 w-7 flex items-center justify-center rounded-full border border-white/15 text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Administrar Viagens"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          }
        />
      </HeaderPortal>

      <ModuleActionButton
        label="Nova Viagem"
        icon={<Plus className="h-3.5 w-3.5" />}
        onClick={() => setNewOpen(true)}
      />

      <div className="flex-1 overflow-y-auto px-4 md:pl-[64px] md:pr-6 py-4">
        {list.isError && (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center rounded-[24px] border border-red-200 bg-red-50/60 mb-4">
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center mb-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <h3 className="text-sm font-bold text-red-800">Falha ao Carregar Viagens</h3>
            <p className="text-xs text-red-600 mt-1 max-w-sm">
              {list.error instanceof Error ? list.error.message : "Erro desconhecido ao buscar viagens."}
            </p>
          </div>
        )}
        {list.isLoading && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div className="h-8 w-64 animate-pulse rounded-full bg-surface-alt" />
              <div className="h-8 w-24 animate-pulse rounded-full bg-surface-alt" />
            </div>
            <div className="rounded-[24px] border border-border bg-surface overflow-hidden">
              <div className="border-b border-border bg-surface-alt/50 p-3 h-10 flex gap-4">
                <div className="h-4 w-12 animate-pulse rounded-full bg-muted/40" />
                <div className="h-4 w-1/3 animate-pulse rounded-full bg-muted/40" />
                <div className="h-4 w-24 animate-pulse rounded-full bg-muted/40 ml-auto" />
              </div>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 border-b border-border p-4">
                  <div className="h-4 w-12 animate-pulse rounded-full bg-surface-alt" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-1/4 animate-pulse rounded-full bg-surface-alt" />
                    <div className="h-3 w-1/6 animate-pulse rounded-full bg-surface-alt/50" />
                  </div>
                  <div className="h-6 w-24 animate-pulse rounded-full bg-surface-alt" />
                  <div className="h-4 w-20 animate-pulse rounded-full bg-surface-alt" />
                </div>
              ))}
            </div>
          </div>
        )}

        {list.data && list.data.data.length === 0 && (
          <EmptyState
            icon={Plane}
            title="Nenhuma viagem encontrada"
            description={
              search || statusFilter
                ? "Tente remover os filtros para ver mais resultados."
                : "Crie a primeira viagem ou converta uma cotação aceita para começar."
            }
          />
        )}

        {list.data && list.data.data.length > 0 && (
          <DataTable
            columns={columns}
            data={list.data.data}
            isLoading={list.isFetching}
            pageCount={Math.ceil(list.data.count / pageSize)}
            pagination={{ pageIndex: page - 1, pageSize }}
            onPaginationChange={(updater) => {
              if (typeof updater === "function") {
                const newState = updater({ pageIndex: page - 1, pageSize });
                setPage(newState.pageIndex + 1);
              } else {
                setPage(updater.pageIndex + 1);
              }
            }}
          />
        )}
      </div>

      {newOpen && agency && (
        <NewTripWizard
          agencyId={agency.id}
          onClose={() => setNewOpen(false)}
          onCreated={(tripId) => {
            setNewOpen(false);
            qc.invalidateQueries({ queryKey: ["trips", agency.id] });
            navigate({ to: "/agency/$slug/trips/$id", params: { slug, id: tripId } });
          }}
        />
      )}
      {adminPanelOpen && agency && (
        <ModuleAdminPanel
          isOpen={adminPanelOpen}
          onClose={() => setAdminPanelOpen(false)}
          moduleKey="trips"
          moduleName="Viagens"
          agencyId={agency.id}
        />
      )}
      {importOpen && agency && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4">
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-surface p-5 flex flex-col shadow-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <h3 className="ds-h3 text-foreground flex items-center gap-2">
                <Search className="h-4 w-4 text-brand" /> Importar do Infotravel
              </h3>
              <button
                type="button"
                onClick={() => setImportOpen(false)}
                className="text-xs text-muted-foreground hover:text-foreground font-semibold"
              >
                Fechar
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground block mb-1">
                  Localizador / ID da Reserva
                </label>
                <input
                  type="text"
                  value={bookingId}
                  onChange={(e) => setBookingId(e.target.value)}
                  placeholder="Ex: B-998877 ou localizador"
                  className="h-9 w-full rounded-full border border-border bg-surface px-3 text-xs outline-none focus:border-brand text-foreground"
                />
                <p className="text-[10px] text-muted-foreground mt-1.5 font-sans leading-relaxed">
                  Insira o ID de reserva para importar automaticamente os voos, hotéis, passageiros
                  e criar o voucher correspondente.
                </p>
              </div>

              <button
                type="button"
                disabled={importing || !bookingId.trim()}
                onClick={handleImportBooking}
                className="w-full flex h-9 items-center justify-center rounded-full bg-brand px-3 text-xs font-semibold text-brand-foreground hover:bg-brand/90 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {importing ? "Importando..." : "Confirmar Importação"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
