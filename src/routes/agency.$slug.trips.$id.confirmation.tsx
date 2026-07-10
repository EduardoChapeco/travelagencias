import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAgency } from "@/lib/agency-context";
import { StatusBadge } from "@/components/ui/badge";
import { fmtDate } from "@/lib/formatters";
import {
  createConfirmationItem,
  updateConfirmationItem,
  deleteConfirmationItem,
  fetchConfirmationItems,
  allCriticalItemsConfirmed,
  ITEM_TYPE_LABELS,
} from "@/services/trip-confirmation";
import type { ConfirmationItem } from "@/services/trip-confirmation";
import {
  CheckCircle2,
  Building2,
  Plane,
  Car,
  Anchor,
  MapPin,
  ClipboardList,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Shield,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { logTripAudit } from "@/services/audit";

export const Route = createFileRoute("/agency/$slug/trips/$id/confirmation")({
  head: ({ context }: any) => ({ meta: [{ title: `Confirmação de Reserva · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: TripConfirmationPage,
});

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

function ItemIcon({ type }: { type: string }) {
  switch (type) {
    case "flight":
      return <Plane className="h-4 w-4 text-sky-500" />;
    case "hotel":
      return <Building2 className="h-4 w-4 text-brand" />;
    case "transfer":
      return <Car className="h-4 w-4 text-emerald-500" />;
    case "cruise":
      return <Anchor className="h-4 w-4 text-blue-600" />;
    case "tour":
      return <MapPin className="h-4 w-4 text-amber-500" />;
    case "insurance":
      return <Shield className="h-4 w-4 text-violet-500" />;
    default:
      return <ClipboardList className="h-4 w-4 text-muted-foreground" />;
  }
}

const STATUS_CYCLE: Record<string, string> = {
  pending: "confirmed",
  confirmed: "cancelled",
  cancelled: "pending",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  cancelled: "Cancelado",
};

const STATUS_TONE: Record<string, "warning" | "success" | "danger"> = {
  pending: "warning",
  confirmed: "success",
  cancelled: "danger",
};

// ──────────────────────────────────────────────────────────────────────
// Blank form state
// ──────────────────────────────────────────────────────────────────────

type FormState = {
  item_type: string;
  provider_name: string;
  details: string;
  service_date: string;
  locator_code: string;
  notes: string;
};

const BLANK_FORM: FormState = {
  item_type: "flight",
  provider_name: "",
  details: "",
  service_date: "",
  locator_code: "",
  notes: "",
};

// ──────────────────────────────────────────────────────────────────────
// Page Component
// ──────────────────────────────────────────────────────────────────────

function TripConfirmationPage() {
  const { id: tripId } = useParams({ from: "/agency/$slug/trips/$id/confirmation" });
  const { agency } = useAgency();
  const qc = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(BLANK_FORM);

  // ── Queries ──────────────────────────────────────────────────────────

  const {
    data: items = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    enabled: !!agency && !!tripId,
    queryKey: ["trip-confirmation-items", tripId],
    queryFn: () => fetchConfirmationItems(tripId),
  });

  // ── Mutations ────────────────────────────────────────────────────────

  const invalidate = () => qc.invalidateQueries({ queryKey: ["trip-confirmation-items", tripId] });

  const addMut = useMutation({
    mutationFn: () => {
      if (!form.provider_name.trim() || !form.locator_code.trim()) {
        throw new Error("Fornecedor e código localizador são obrigatórios.");
      }
      return createConfirmationItem({
        trip_id: tripId,
        agency_id: agency!.id,
        item_type: form.item_type,
        provider_name: form.provider_name.trim(),
        details: form.details.trim() || null,
        service_date: form.service_date || null,
        locator_code: form.locator_code.trim().toUpperCase(),
        notes: form.notes.trim() || null,
        sort_order: items.length,
      });
    },
    onSuccess: () => {
      logTripAudit({
        agencyId: agency!.id,
        tripId: tripId,
        action: "adicionar_confirmacao",
        details: `Localizador ${form.locator_code} (${form.item_type}) adicionado para ${form.provider_name}`,
      });
      toast.success("Localizador adicionado com sucesso!");
      closeForm();
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao adicionar."),
  });

  const updateMut = useMutation({
    mutationFn: (itemId: string) => {
      if (!form.provider_name.trim() || !form.locator_code.trim()) {
        throw new Error("Fornecedor e código localizador são obrigatórios.");
      }
      return updateConfirmationItem(itemId, {
        item_type: form.item_type,
        provider_name: form.provider_name.trim(),
        details: form.details.trim() || null,
        service_date: form.service_date || null,
        locator_code: form.locator_code.trim().toUpperCase(),
        notes: form.notes.trim() || null,
      });
    },
    onSuccess: () => {
      logTripAudit({
        agencyId: agency!.id,
        tripId: tripId,
        action: "atualizar_confirmacao",
        details: `Localizador ${form.locator_code} (${form.item_type}) atualizado para ${form.provider_name}`,
      });
      toast.success("Localizador atualizado!");
      closeForm();
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao atualizar."),
  });

  const cycleMut = useMutation({
    mutationFn: ({ id, currentStatus }: { id: string; currentStatus: string }) =>
      updateConfirmationItem(id, {
        status: STATUS_CYCLE[currentStatus] ?? "pending",
      }),
    onSuccess: () => {
      logTripAudit({
        agencyId: agency!.id,
        tripId: tripId,
        action: "ciclar_status_confirmacao",
        details: `Status do localizador alterado`,
      });
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao alterar status."),
  });

  const deleteMut = useMutation({
    mutationFn: (itemId: string) => deleteConfirmationItem(itemId),
    onSuccess: () => {
      logTripAudit({
        agencyId: agency!.id,
        tripId: tripId,
        action: "remover_confirmacao",
        details: `Item de confirmação removido`,
      });
      toast.success("Item removido.");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao remover."),
  });

  // ── Form helpers ──────────────────────────────────────────────────────

  const openAdd = () => {
    setForm(BLANK_FORM);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (item: ConfirmationItem) => {
    setForm({
      item_type: item.item_type,
      provider_name: item.provider_name,
      details: item.details ?? "",
      service_date: item.service_date ?? "",
      locator_code: item.locator_code,
      notes: item.notes ?? "",
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(BLANK_FORM);
  };

  const handleSave = () => {
    if (editingId) {
      updateMut.mutate(editingId);
    } else {
      addMut.mutate();
    }
  };

  const isSaving = addMut.isPending || updateMut.isPending;

  // ── Derived ───────────────────────────────────────────────────────────

  const allConfirmed = allCriticalItemsConfirmed(items);
  const pendingCount = items.filter((i) => i.status === "pending").length;
  const confirmedCount = items.filter((i) => i.status === "confirmed").length;

  // ────────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-w-4xl">
      {/* ── Header ── */}
      <div className="rounded-[var(--radius-card)] border-none glass-card border-none p-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-4 w-4 text-brand mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-foreground">Confirmação de Reserva</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Registre os códigos localizadores e status de confirmação de cada serviço contratado
              nesta viagem. Dados persistidos em banco.
            </p>
          </div>
        </div>

        {!showForm && (
          <button
            onClick={openAdd}
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-brand text-brand-foreground px-3 text-xs font-medium hover:bg-brand/90 transition-colors cursor-pointer shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Adicionar Localizador</span>
          </button>
        )}
      </div>

      {/* ── Status summary ── */}
      {!isLoading && items.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-[var(--radius-card)] border-none glass-card border-none p-3 text-center">
            <p className="text-xl font-bold text-foreground">{items.length}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">
              Total
            </p>
          </div>
          <div className="rounded-[var(--radius-card)] border border-emerald-100 bg-emerald-50/50 p-3 text-center">
            <p className="text-xl font-bold text-emerald-700">{confirmedCount}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/70 mt-0.5">
              Confirmados
            </p>
          </div>
          <div className="rounded-[var(--radius-card)] border border-amber-100 bg-amber-50/50 p-3 text-center">
            <p className="text-xl font-bold text-amber-700">{pendingCount}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600/70 mt-0.5">
              Pendentes
            </p>
          </div>
        </div>
      )}

      {/* ── Alerta crítico se itens pendentes ── */}
      {!isLoading && items.length > 0 && !allConfirmed && (
        <div className="flex items-center gap-2.5 rounded-[var(--radius-card)] border border-amber-200 bg-amber-50 px-4 py-2.5">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          <p className="text-xs text-amber-700">
            {pendingCount > 0
              ? `${pendingCount} serviço${pendingCount > 1 ? "s" : ""} ainda não confirmado${pendingCount > 1 ? "s" : ""}.`
              : "Nenhum serviço crítico (voo/hotel) confirmado ainda."}
          </p>
        </div>
      )}

      {/* ── Formulário de cadastro / edição ── */}
      {showForm && (
        <div className="rounded-[var(--radius-card)] border-none glass-card border-none p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">
              {editingId ? "Editar Localizador" : "Novo Localizador de Serviço"}
            </h3>
            <button
              onClick={closeForm}
              className="h-7 w-7 inline-flex items-center justify-center rounded hover:glass bg-white/5 border-white/10 text-muted-foreground cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Tipo */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Tipo de Serviço
              </label>
              <select
                value={form.item_type}
                onChange={(e) => setForm((f) => ({ ...f, item_type: e.target.value }))}
                className="w-full text-xs border-none rounded-full px-2 py-2 glass-card border-none focus:outline-none focus:ring-1 focus:ring-brand"
              >
                {Object.entries(ITEM_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            {/* Fornecedor */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Fornecedor / Operadora *
              </label>
              <input
                type="text"
                placeholder="Ex: LATAM Airlines, Sheraton"
                value={form.provider_name}
                onChange={(e) => setForm((f) => ({ ...f, provider_name: e.target.value }))}
                className="w-full text-xs border-none rounded-full px-2 py-2 glass-card border-none focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>

            {/* Localizador */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Código Localizador *
              </label>
              <input
                type="text"
                placeholder="Ex: QPWO12"
                value={form.locator_code}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    locator_code: e.target.value.toUpperCase(),
                  }))
                }
                className="w-full text-xs border-none rounded-full px-2 py-2 glass-card border-none font-mono tracking-widest focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>

            {/* Detalhes */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Detalhes da Reserva
              </label>
              <input
                type="text"
                placeholder="Ex: Apartamento Duplo Vista Mar — Check-in 15h"
                value={form.details}
                onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))}
                className="w-full text-xs border-none rounded-full px-2 py-2 glass-card border-none focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>

            {/* Data de utilização */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Data de Utilização
              </label>
              <input
                type="date"
                value={form.service_date}
                onChange={(e) => setForm((f) => ({ ...f, service_date: e.target.value }))}
                className="w-full text-xs border-none rounded-full px-2 py-2 glass-card border-none focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>

            {/* Notas internas */}
            <div className="space-y-1 sm:col-span-2 md:col-span-3">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Notas Internas (opcional)
              </label>
              <input
                type="text"
                placeholder="Observações internas para a equipe da agência"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full text-xs border-none rounded-full px-2 py-2 glass-card border-none focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <button
              onClick={closeForm}
              className="px-3 py-1.5 border-none text-xs rounded-full hover:glass bg-white/5 border-white/10 cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-1.5 bg-brand text-brand-foreground text-xs rounded-full hover:bg-brand/90 cursor-pointer transition-colors disabled:opacity-50"
            >
              {isSaving ? "Salvando…" : editingId ? "Atualizar" : "Salvar Localizador"}
            </button>
          </div>
        </div>
      )}

      {/* ── Loading ── */}
      {isLoading && (
        <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">
          Carregando confirmações…
        </div>
      )}

      {/* ── Error ── */}
      {isError && (
        <div className="py-8 text-center text-sm text-rose-600">
          {error instanceof Error ? error.message : "Erro ao carregar dados."}
        </div>
      )}

      {/* ── Empty state ── */}
      {!isLoading && !isError && items.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-[var(--radius-card)] text-center">
          <CheckCircle2 className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-semibold text-muted-foreground">
            Nenhum localizador cadastrado
          </p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Adicione os códigos de confirmação para cada serviço desta viagem (voos, hotéis,
            transfers, etc.).
          </p>
          <button
            onClick={openAdd}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-card)] bg-brand text-brand-foreground text-xs font-medium hover:bg-brand/90 transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar primeiro localizador
          </button>
        </div>
      )}

      {/* ── Lista de itens ── */}
      {!isLoading && !isError && items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 rounded-[var(--radius-card)] border-none glass-card border-none hover:glass bg-white/5 border-white/10/30 transition-colors group"
            >
              {/* ── Left: tipo + info ── */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="shrink-0 h-8 w-8 rounded-[var(--radius-card)] glass bg-white/5 border-white/10 flex items-center justify-center">
                  <ItemIcon type={item.item_type} />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {ITEM_TYPE_LABELS[item.item_type] ?? item.item_type}
                    </span>
                    {item.service_date && (
                      <>
                        <span className="text-muted-foreground/40 text-xs">·</span>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {fmtDate(item.service_date)}
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-foreground truncate mt-0.5">
                    {item.provider_name}
                  </p>
                  {item.details && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{item.details}</p>
                  )}
                  {item.notes && (
                    <p className="text-[10px] text-muted-foreground/60 italic mt-0.5 truncate">
                      {item.notes}
                    </p>
                  )}
                </div>
              </div>

              {/* ── Right: localizador + status + ações ── */}
              <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto shrink-0 border-t border-border/40 pt-3 sm:border-t-0 sm:pt-0">
                {/* Localizador */}
                <div className="text-left sm:text-right">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground block">
                    Localizador
                  </span>
                  <span className="font-mono text-sm font-bold text-foreground glass bg-white/5 border-white/10 px-2 py-0.5 rounded tracking-widest">
                    {item.locator_code}
                  </span>
                </div>

                {/* Status — clicável para ciclar */}
                <button
                  onClick={() =>
                    cycleMut.mutate({
                      id: item.id,
                      currentStatus: item.status,
                    })
                  }
                  disabled={cycleMut.isPending}
                  title="Clique para alternar status"
                  className="cursor-pointer disabled:opacity-50"
                >
                  <StatusBadge tone={STATUS_TONE[item.status] ?? "warning"}>
                    {STATUS_LABELS[item.status] ?? item.status}
                  </StatusBadge>
                </button>

                {/* Editar */}
                <button
                  onClick={() => openEdit(item)}
                  className="h-7 w-7 inline-flex items-center justify-center border-none rounded hover:glass bg-white/5 border-white/10 text-muted-foreground cursor-pointer transition-colors sm:opacity-0 sm:group-hover:opacity-100"
                  title="Editar"
                >
                  <Pencil className="h-3 w-3" />
                </button>

                {/* Excluir */}
                <button
                  onClick={() => {
                    if (confirm("Remover este localizador?")) {
                      deleteMut.mutate(item.id);
                    }
                  }}
                  disabled={deleteMut.isPending}
                  className="h-7 w-7 inline-flex items-center justify-center border-none rounded hover:bg-rose-50 hover:text-rose-600 text-muted-foreground cursor-pointer transition-colors disabled:opacity-50 opacity-0 group-hover:opacity-100"
                  title="Excluir"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Rodapé de status global ── */}
      {!isLoading && items.length > 0 && allConfirmed && (
        <div className="flex items-center gap-2.5 rounded-[var(--radius-card)] border border-emerald-200 bg-emerald-50 px-4 py-2.5">
          <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <p className="text-xs font-semibold text-emerald-700">
            Todos os serviços críticos confirmados. Viagem pronta para embarque.
          </p>
        </div>
      )}
    </div>
  );
}
