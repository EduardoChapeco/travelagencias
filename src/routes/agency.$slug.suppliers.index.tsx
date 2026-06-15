import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Building2, Percent, PhoneCall, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import {
  Field,
  Input,
  Select,
  Textarea,
  PrimaryButton,
  GhostButton,
  Sheet,
  StatusBadge,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { NewSupplierWizard } from "@/components/suppliers/NewSupplierWizard";

export const Route = createFileRoute("/agency/$slug/suppliers/")({
  head: () => ({ meta: [{ title: "Comissões e Fornecedores · TravelOS" }] }),
  component: SuppliersPage,
});

type Supplier = {
  id: string;
  name: string;
  legal_name: string | null;
  kind: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  commission_rate: number;
  is_active: boolean;
};

function SuppliersPage() {
  const { agency } = useAgency();
  const { slug } = Route.useParams();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState("all");

  const q = useQuery({
    enabled: !!agency,
    queryKey: ["suppliers", agency?.id],
    queryFn: async () => {
      let query = supabase
        .from("suppliers")
        .select("id, name, legal_name, kind, document, email, phone, commission_rate, is_active")
        .eq("agency_id", agency!.id);

      if (kindFilter !== "all") {
        query = query.eq("kind", kindFilter as any);
      }
      if (search.trim()) {
        query = query.ilike("name", `%${search}%`);
      }

      const { data, error } = await query.order("name");
      if (error) throw error;
      return data as unknown as Supplier[];
    },
  });

  return (
    <>
      <PageHeader
        title="Painel B2B: Fornecedores e Comissionamentos"
        description="Gerencie Operadoras, Hotéis e Cias Aéreas. Defina o seu markup e controle seus acordos de SLA (Acordo de Nível de Serviço)."
        actions={
          <PrimaryButton
            onClick={() => setOpen(true)}
            className="gap-1.5 text-[11px] uppercase tracking-widest font-bold"
          >
            <Plus className="h-4 w-4" /> Novo Fornecedor
          </PrimaryButton>
        }
      />

      {/* Filtros */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Input
            placeholder="Buscar por nome do fornecedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select value={kindFilter} onChange={(e) => setKindFilter(e.target.value)}>
            <option value="all">Todas as categorias</option>
            <option value="hotel">Hospedagem</option>
            <option value="airline">Cia Aérea</option>
            <option value="tour_operator">Operadora</option>
            <option value="transfer">Transfer</option>
            <option value="insurance">Seguro</option>
            <option value="other">Outros</option>
          </Select>
        </div>
      </div>

      {q.isLoading && (
        <div className="text-sm text-muted-foreground p-8">Carregando cadeia de suprimentos…</div>
      )}
      {q.data?.length === 0 && (
        <EmptyState
          title="Nenhum fornecedor encontrado"
          description="Ajuste os filtros ou cadastre um novo fornecedor para começar."
        />
      )}

      {q.data && q.data.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-10">
          {q.data.map((s) => (
            <Link
              to="/agency/$slug/suppliers/$id"
              params={{ slug, id: s.id }}
              key={s.id}
              className={cn(
                "group rounded-2xl border border-border/50 bg-surface p-5  transition-all hover:",
                s.is_active ? "hover:border-brand/40" : "opacity-70",
              )}
            >
              <div className="flex justify-between items-start mb-4 border-b border-border/50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-alt border border-border/50">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground leading-tight group-hover:text-brand transition-colors">
                      {s.name}
                    </h3>
                    <div className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
                      {s.kind}
                    </div>
                  </div>
                </div>
                <StatusBadge tone={s.is_active ? "success" : "neutral"}>
                  {s.is_active ? "Ativo" : "Inativo"}
                </StatusBadge>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <PhoneCall className="h-3 w-3" /> Telefone
                  </span>
                  <span className="font-medium">{s.phone || "—"}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3 w-3" /> E-mail (SLA)
                  </span>
                  <span className="font-medium truncate max-w-[150px]" title={s.email || ""}>
                    {s.email || "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="h-3 w-3" /> Documento
                  </span>
                  <span className="font-mono text-xs">{s.document || "—"}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-border/50 flex justify-between items-center bg-brand/5 -mx-5 -mb-5 px-5 py-4 rounded-b-2xl">
                <div className="text-xs font-bold text-brand uppercase tracking-widest flex items-center gap-1.5">
                  <Percent className="h-3 w-3" /> Markup / Comissão Base
                </div>
                <div className="font-mono text-lg font-bold text-brand">
                  {Number(s.commission_rate).toFixed(2)}%
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {open && agency && (
        <NewSupplierWizard
          agencyId={agency.id}
          onClose={() => setOpen(false)}
          onCreated={() => {
            setOpen(false);
            qc.invalidateQueries({ queryKey: ["suppliers", agency.id] });
          }}
        />
      )}
    </>
  );
}

// removed inline NewSupplier component
