import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Plus, Trash2, Send, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { Field, Input, Select, Textarea, PrimaryButton, GhostButton, StatusBadge, money, fmtDate } from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/proposals/$id")({
  head: () => ({ meta: [{ title: "Cotação · TravelOS" }] }),
  component: ProposalDetail,
});

const ITEM_KINDS = [
  ["flight", "Voo"], ["hotel", "Hotel"], ["transfer", "Transfer"],
  ["tour", "Passeio"], ["insurance", "Seguro"], ["car_rental", "Aluguel de carro"],
  ["cruise", "Cruzeiro"], ["visa", "Visto"], ["fee", "Taxa"],
  ["discount", "Desconto"], ["other", "Outro"],
] as const;

type Proposal = {
  id: string; number: number; title: string; status: string;
  destination: string | null; travel_start: string | null; travel_end: string | null;
  pax_adults: number; pax_children: number; pax_infants: number;
  currency: string; subtotal: number; discount: number; total: number;
  valid_until: string | null; notes: string | null; terms: string | null;
  client_id: string | null; lead_id: string | null; public_token: string;
  sent_at: string | null; viewed_at: string | null; decided_at: string | null;
};

type Item = {
  id: string; kind: string; title: string; description: string | null;
  start_date: string | null; end_date: string | null;
  quantity: number; unit_price: number; cost_price: number; total: number;
  supplier_id: string | null; position: number;
};

function ProposalDetail() {
  const { slug, id } = useParams({ from: "/agency/$slug/proposals/$id" });
  const { agency } = useAgency();
  const qc = useQueryClient();

  const propQ = useQuery({
    enabled: !!agency,
    queryKey: ["proposal", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("proposals").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as Proposal | null;
    },
  });

  const itemsQ = useQuery({
    enabled: !!agency,
    queryKey: ["proposal-items", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposal_items")
        .select("*")
        .eq("proposal_id", id)
        .order("position");
      if (error) throw error;
      return data as Item[];
    },
  });

  const suppliersQ = useQuery({
    enabled: !!agency,
    queryKey: ["suppliers", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("id, name")
        .eq("agency_id", agency!.id)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const subtotal = useMemo(() => (itemsQ.data ?? []).reduce((s, it) => s + Number(it.total || 0), 0), [itemsQ.data]);

  const recalc = useMutation({
    mutationFn: async ({ discount }: { discount: number }) => {
      const total = Math.max(0, subtotal - discount);
      const { error } = await supabase
        .from("proposals")
        .update({ subtotal, discount, total })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposal", id] }),
  });

  useEffect(() => {
    if (propQ.data && itemsQ.data) {
      // sync totals when items change
      const total = Math.max(0, subtotal - Number(propQ.data.discount || 0));
      if (Number(propQ.data.subtotal) !== subtotal || Number(propQ.data.total) !== total) {
        supabase
          .from("proposals")
          .update({ subtotal, total })
          .eq("id", id)
          .then(({ error }) => {
            if (!error) qc.invalidateQueries({ queryKey: ["proposal", id] });
          });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal, itemsQ.data]);

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const patch: Record<string, unknown> = { status };
      if (status === "sent") patch.sent_at = new Date().toISOString();
      if (status === "accepted" || status === "rejected") patch.decided_at = new Date().toISOString();
      const { error } = await supabase.from("proposals").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["proposal", id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const addItem = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("proposal_items").insert({
        proposal_id: id,
        agency_id: agency!.id,
        kind: "other",
        title: "Novo item",
        position: (itemsQ.data?.length ?? 0) + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposal-items", id] }),
  });

  const removeItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from("proposal_items").delete().eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposal-items", id] }),
  });

  const updateItem = useMutation({
    mutationFn: async ({ itemId, patch }: { itemId: string; patch: Partial<Item> }) => {
      const { error } = await supabase.from("proposal_items").update(patch).eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposal-items", id] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const convertToTrip = useMutation({
    mutationFn: async () => {
      if (!propQ.data) throw new Error("Proposta indisponível");
      const p = propQ.data;
      const { data, error } = await supabase
        .from("trips")
        .insert({
          agency_id: agency!.id,
          title: p.title,
          status: "confirmed",
          client_id: p.client_id,
          proposal_id: p.id,
          destination: p.destination,
          travel_start: p.travel_start,
          travel_end: p.travel_end,
          currency: p.currency,
          total_sale: p.total,
        })
        .select("id")
        .single();
      if (error) throw error;
      await supabase.from("proposals").update({ status: "converted" }).eq("id", p.id);
      return data.id as string;
    },
    onSuccess: (tripId) => {
      toast.success("Viagem criada");
      qc.invalidateQueries({ queryKey: ["proposal", id] });
      window.location.href = `/agency/${slug}/trips/${tripId}`;
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  if (propQ.isLoading) return <div className="text-sm text-muted-foreground">Carregando…</div>;
  if (!propQ.data) return <div className="text-sm text-muted-foreground">Cotação não encontrada.</div>;
  const p = propQ.data;

  return (
    <>
      <Link
        to="/agency/$slug/proposals"
        params={{ slug }}
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">#{p.number}</span>
            <StatusBadge tone={p.status === "accepted" ? "success" : p.status === "rejected" ? "danger" : p.status === "converted" ? "success" : "info"}>
              {p.status}
            </StatusBadge>
          </div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">{p.title}</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {p.destination ?? "—"} · {fmtDate(p.travel_start)} → {fmtDate(p.travel_end)} ·{" "}
            {p.pax_adults}ad {p.pax_children}cr {p.pax_infants}inf
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {p.status === "draft" && (
            <GhostButton onClick={() => updateStatus.mutate("sent")}>
              <Send className="mr-1.5 inline h-3.5 w-3.5" /> Marcar como enviada
            </GhostButton>
          )}
          {p.status !== "accepted" && p.status !== "converted" && (
            <GhostButton onClick={() => updateStatus.mutate("accepted")}>
              <CheckCircle2 className="mr-1.5 inline h-3.5 w-3.5" /> Aceita
            </GhostButton>
          )}
          {p.status !== "rejected" && p.status !== "converted" && (
            <GhostButton onClick={() => updateStatus.mutate("rejected")}>
              <XCircle className="mr-1.5 inline h-3.5 w-3.5" /> Recusada
            </GhostButton>
          )}
          {(p.status === "accepted" || p.status === "sent" || p.status === "viewed") && (
            <PrimaryButton onClick={() => convertToTrip.mutate()} disabled={convertToTrip.isPending}>
              Converter em viagem
            </PrimaryButton>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <section className="rounded-lg border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Itens da proposta</h2>
            <button
              onClick={() => addItem.mutate()}
              className="flex h-8 items-center gap-1 rounded-md border border-border bg-surface px-2 text-xs font-medium hover:bg-surface-alt"
            >
              <Plus className="h-3.5 w-3.5" /> Adicionar item
            </button>
          </div>
          <div className="divide-y divide-border">
            {(itemsQ.data ?? []).map((it) => (
              <ItemRow
                key={it.id}
                item={it}
                currency={p.currency}
                suppliers={suppliersQ.data ?? []}
                onSave={(patch) => updateItem.mutate({ itemId: it.id, patch })}
                onDelete={() => removeItem.mutate(it.id)}
              />
            ))}
            {itemsQ.data && itemsQ.data.length === 0 && (
              <div className="p-8 text-center text-xs text-muted-foreground">Sem itens. Clique em “Adicionar item”.</div>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-lg border border-border bg-surface p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Totais</h3>
            <Row label="Subtotal" value={money(subtotal, p.currency)} />
            <Row
              label="Desconto"
              value={
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  defaultValue={Number(p.discount)}
                  onBlur={(e) => recalc.mutate({ discount: +e.target.value || 0 })}
                  className="h-7 w-24 rounded border border-border bg-surface px-1.5 text-right text-xs"
                />
              }
            />
            <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
              <span className="text-xs font-semibold">Total</span>
              <span className="font-mono text-sm font-semibold">{money(Math.max(0, subtotal - Number(p.discount || 0)), p.currency)}</span>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface p-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Link público</h3>
            <p className="text-[11px] text-muted-foreground">Compartilhe com o cliente:</p>
            <code className="mt-2 block break-all rounded bg-surface-alt p-2 text-[11px]">
              /m/proposal/{p.public_token}
            </code>
          </div>
        </aside>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

function ItemRow({
  item,
  currency,
  suppliers,
  onSave,
  onDelete,
}: {
  item: Item;
  currency: string;
  suppliers: { id: string; name: string }[];
  onSave: (patch: Partial<Item>) => void;
  onDelete: () => void;
}) {
  const [f, setF] = useState(item);
  useEffect(() => setF(item), [item]);
  const dirty =
    f.title !== item.title ||
    f.kind !== item.kind ||
    f.description !== item.description ||
    Number(f.quantity) !== Number(item.quantity) ||
    Number(f.unit_price) !== Number(item.unit_price) ||
    Number(f.cost_price) !== Number(item.cost_price) ||
    f.supplier_id !== item.supplier_id ||
    f.start_date !== item.start_date ||
    f.end_date !== item.end_date;

  return (
    <div className="grid grid-cols-12 gap-2 p-3">
      <div className="col-span-2">
        <Select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
          {ITEM_KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </Select>
      </div>
      <div className="col-span-4">
        <Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Título" />
      </div>
      <div className="col-span-2">
        <Select value={f.supplier_id ?? ""} onChange={(e) => setF({ ...f, supplier_id: e.target.value || null })}>
          <option value="">Fornecedor…</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
      </div>
      <div className="col-span-1">
        <Input type="number" min={0} step="0.01" value={f.quantity} onChange={(e) => setF({ ...f, quantity: +e.target.value || 0 })} />
      </div>
      <div className="col-span-2">
        <Input type="number" min={0} step="0.01" value={f.unit_price} onChange={(e) => setF({ ...f, unit_price: +e.target.value || 0 })} />
      </div>
      <div className="col-span-1 flex items-center justify-end gap-1">
        {dirty ? (
          <button onClick={() => onSave(f)} className="h-7 rounded bg-primary px-2 text-[11px] font-semibold text-primary-foreground">
            Salvar
          </button>
        ) : (
          <span className="font-mono text-xs">{money(Number(f.quantity) * Number(f.unit_price), currency)}</span>
        )}
        <button onClick={onDelete} className="rounded p-1 text-muted-foreground hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
      <div className="col-span-12 grid grid-cols-3 gap-2">
        <Input type="date" value={f.start_date ?? ""} onChange={(e) => setF({ ...f, start_date: e.target.value || null })} />
        <Input type="date" value={f.end_date ?? ""} onChange={(e) => setF({ ...f, end_date: e.target.value || null })} />
        <Input value={f.description ?? ""} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Descrição" />
      </div>
    </div>
  );
}
