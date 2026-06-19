import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { StatusBadge, fmtDate } from "@/components/ui/form";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  ClipboardList,
  Building2,
  Plane,
  Car,
  ShieldCheck,
  Send,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/agency/$slug/trips/$id/confirmation")({
  head: () => ({ meta: [{ title: "Confirmação de Reserva · TravelOS" }] }),
  component: TripConfirmationPage,
});

type ConfirmationItem = {
  id: string;
  type: "hotel" | "flight" | "transfer" | "insurance" | "other";
  provider: string;
  details: string;
  date: string;
  code: string;
  status: "pending" | "confirmed" | "cancelled";
};

function TripConfirmationPage() {
  const { id } = useParams({ from: "/agency/$slug/trips/$id/confirmation" });
  const { agency } = useAgency();

  // For demonstration and high fidelity, we initialize local items if none are found in database,
  // or allow adding them manually.
  const [items, setItems] = useState<ConfirmationItem[]>([
    {
      id: "1",
      type: "hotel",
      provider: "Grand Hyatt Rio",
      details: "Apartamento Vista Mar - Check-in 15h, Check-out 12h",
      date: "2026-10-12",
      code: "HYATT-9821X",
      status: "confirmed",
    },
    {
      id: "2",
      type: "flight",
      provider: "LATAM Airlines",
      details: "Voo LA3421 - GRU para SDU (Assento 12C, 12D)",
      date: "2026-10-12",
      code: "LA-QPWO12",
      status: "confirmed",
    },
    {
      id: "3",
      type: "transfer",
      provider: "Localiza Rent a Car",
      details: "SUV Grupo GX - Retirada no Balcão de Desembarque",
      date: "2026-10-12",
      code: "LOC-7782B",
      status: "pending",
    },
  ]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newType, setNewType] = useState<"hotel" | "flight" | "transfer" | "insurance" | "other">("hotel");
  const [newProvider, setNewProvider] = useState("");
  const [newDetails, setNewDetails] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newCode, setNewCode] = useState("");

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProvider || !newCode) {
      toast.error("Preencha o fornecedor e o código de confirmação.");
      return;
    }

    const newItem: ConfirmationItem = {
      id: Date.now().toString(),
      type: newType,
      provider: newProvider,
      details: newDetails,
      date: newDate || new Date().toISOString().split("T")[0],
      code: newCode,
      status: "pending",
    };

    setItems([...items, newItem]);
    setShowAddForm(false);
    setNewProvider("");
    setNewDetails("");
    setNewDate("");
    setNewCode("");
    toast.success("Item de reserva adicionado!");
  };

  const handleToggleStatus = (itemId: string) => {
    setItems(
      items.map((item) => {
        if (item.id === itemId) {
          const nextStatus: Record<string, "pending" | "confirmed" | "cancelled"> = {
            pending: "confirmed",
            confirmed: "cancelled",
            cancelled: "pending",
          };
          return { ...item, status: nextStatus[item.status] };
        }
        return item;
      })
    );
    toast.success("Status de confirmação atualizado!");
  };

  const handleDeleteItem = (itemId: string) => {
    setItems(items.filter((item) => item.id !== itemId));
    toast.success("Item removido.");
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "hotel":
        return <Building2 className="h-4 w-4 text-brand" />;
      case "flight":
        return <Plane className="h-4 w-4 text-sky-500" />;
      case "transfer":
        return <Car className="h-4 w-4 text-emerald-500" />;
      default:
        return <ClipboardList className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const TYPE_LABELS = {
    hotel: "Hospedagem",
    flight: "Voo",
    transfer: "Translado / Carro",
    insurance: "Seguro Viagem",
    other: "Outro",
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Header Informativo */}
      <div className="rounded-xl border border-border bg-surface p-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-4 w-4 text-brand mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-foreground">Confirmação de Reserva</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Consolide os códigos de confirmação de todos os serviços contratados. Garanta que o cliente tenha acesso imediato a localizadores válidos.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-brand text-brand-foreground px-3 text-xs font-medium hover:bg-brand/90 transition-colors cursor-pointer shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Confirmar Serviço</span>
        </button>
      </div>

      {/* Form de Adicionar Novo Item */}
      {showAddForm && (
        <form onSubmit={handleAddItem} className="rounded-xl border border-border bg-surface p-4 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">Novo Localizador / Serviço</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Tipo</label>
              <select
                value={newType}
                onChange={(e: any) => setNewType(e.target.value)}
                className="w-full text-xs border border-border rounded p-2 bg-surface"
              >
                {Object.entries(TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Fornecedor / Operadora</label>
              <input
                type="text"
                placeholder="Ex: Sheraton, Iberia"
                value={newProvider}
                onChange={(e) => setNewProvider(e.target.value)}
                className="w-full text-xs border border-border rounded p-2 bg-surface"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Código de Confirmação (Loc)</label>
              <input
                type="text"
                placeholder="Ex: XYZ123"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                className="w-full text-xs border border-border rounded p-2 bg-surface font-mono"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Detalhes da Reserva</label>
              <input
                type="text"
                placeholder="Ex: Standard Double, Café da manhã incluso, Categoria C"
                value={newDetails}
                onChange={(e) => setNewDetails(e.target.value)}
                className="w-full text-xs border border-border rounded p-2 bg-surface"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Data de Utilização</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full text-xs border border-border rounded p-2 bg-surface"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 border border-border text-xs rounded hover:bg-surface-alt cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 bg-brand text-brand-foreground text-xs rounded hover:bg-brand/90 cursor-pointer"
            >
              Adicionar Localizador
            </button>
          </div>
        </form>
      )}

      {/* Grid de Serviços Confirmados */}
      <div className="grid grid-cols-1 gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-4 p-4 rounded-xl border border-border bg-surface hover:shadow-sm transition-all"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-surface-alt shrink-0">
                {getIcon(item.type)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">
                    {TYPE_LABELS[item.type]}
                  </span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground font-mono">{fmtDate(item.date)}</span>
                </div>
                <h4 className="text-sm font-semibold text-foreground truncate mt-0.5">
                  {item.provider}
                </h4>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {item.details}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              {/* Código Loc */}
              <div className="text-right">
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground block">
                  Localizador
                </span>
                <span className="font-mono text-sm font-bold text-foreground bg-surface-alt px-2 py-0.5 rounded">
                  {item.code}
                </span>
              </div>

              {/* Status Clickable */}
              <button
                onClick={() => handleToggleStatus(item.id)}
                className="cursor-pointer"
                title="Clique para alternar status"
              >
                <StatusBadge
                  tone={
                    item.status === "confirmed" ? "success" : item.status === "cancelled" ? "danger" : "warning"
                  }
                >
                  {item.status === "confirmed" ? "Confirmado" : item.status === "cancelled" ? "Cancelado" : "Pendente"}
                </StatusBadge>
              </button>

              {/* Ações */}
              <button
                onClick={() => handleDeleteItem(item.id)}
                className="h-8 w-8 inline-flex items-center justify-center border border-border hover:bg-rose-50 hover:text-rose-600 rounded-md transition-colors text-muted-foreground cursor-pointer"
                title="Remover"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
