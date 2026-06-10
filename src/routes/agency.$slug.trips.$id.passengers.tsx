import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Plus, Trash2, User, Mail, Phone, Calendar, Contact2, ShieldCheck, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { fmtDate, StatusBadge } from "@/components/ui/form";
import { NewPassengerModal } from "@/components/trips/NewPassengerModal";

export const Route = createFileRoute("/agency/$slug/trips/$id/passengers")({
  head: () => ({ meta: [{ title: "Passageiros · TravelOS" }] }),
  component: PassengersPage,
});

function PassengersPage() {
  const { slug, id } = useParams({ from: "/agency/$slug/trips/$id/passengers" });
  const { agency } = useAgency();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const list = useQuery({
    enabled: !!agency,
    queryKey: ["passengers", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("trip_passengers")
        .select("*")
        .eq("trip_id", id)
        .is("deleted_at", null)
        .order("is_lead_passenger", { ascending: false }) // Principais primeiro
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const remove = useMutation({
    mutationFn: async (pid: string) => {
      const { error } = await (supabase as any)
        .from("trip_passengers")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", pid);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["passengers", id] }),
  });

  const translateKind = (kind: string) => {
    switch (kind) {
      case "adult": return "Adulto";
      case "child": return "Criança (CHD)";
      case "infant": return "Infante (INF)";
      default: return kind;
    }
  };

  return (
    <>
      <Link
        to="/agency/$slug/trips/$id"
        params={{ slug, id }}
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar para viagem
      </Link>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Rooming List</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gerencie os passageiros vinculados a este roteiro.</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-bold text-brand-foreground hover:bg-brand/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> Adicionar Passageiro
        </button>
      </div>

      {list.isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 rounded-2xl bg-surface-alt animate-pulse border border-border" />
          ))}
        </div>
      )}

      {list.data && list.data.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-surface-alt/20 py-24 text-center">
          <Contact2 className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h3 className="text-lg font-bold text-foreground">Nenhum passageiro</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm">
            Esta viagem ainda não possui passageiros. Clique em "Adicionar Passageiro" para formar o grupo.
          </p>
        </div>
      )}

      {list.data && list.data.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {list.data.map((p: any) => (
            <div 
              key={p.id} 
              className={`group flex flex-col rounded-2xl border bg-surface transition-colors hover:border-brand/40 ${p.is_lead_passenger ? 'border-brand/30' : 'border-border'}`}
            >
              {/* Header Card */}
              <div className="flex items-start justify-between p-5 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${p.is_lead_passenger ? 'bg-brand/10 text-brand' : 'bg-surface-alt text-muted-foreground'}`}>
                    <User className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate font-bold text-foreground">{p.full_name}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {translateKind(p.kind)}
                      </span>
                        <StatusBadge tone="info">Líder da Reserva</StatusBadge>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => remove.mutate(p.id)}
                  className="rounded-md p-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all hover:bg-danger/10 hover:text-danger"
                  title="Remover passageiro"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Body Card */}
              <div className="p-5 space-y-4 flex-1">
                {/* Documentação */}
                <div className="flex items-center gap-2.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-surface-alt text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wide mb-0.5">
                      {p.document_type ? String(p.document_type).toUpperCase() : "Documento"}
                    </div>
                    <div className="text-xs font-mono font-medium truncate">
                      {p.document || "Não informado"}
                    </div>
                  </div>
                </div>

                {/* Nascimento e Nacionalidade */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-surface-alt text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wide mb-0.5">Nascimento</div>
                      <div className="text-xs font-medium truncate">{p.birth_date ? fmtDate(p.birth_date) : "—"}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-surface-alt text-muted-foreground">
                      <ShieldCheck className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wide mb-0.5">Nacionalidade</div>
                      <div className="text-xs font-medium truncate">{p.nationality || "—"}</div>
                    </div>
                  </div>
                </div>

                {/* Contato (Se houver) */}
                {(p.email || p.phone) && (
                  <div className="pt-4 mt-2 border-t border-border/50 space-y-2">
                    {p.email && (
                      <div className="flex items-center gap-2.5">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground truncate">{p.email}</span>
                      </div>
                    )}
                    {p.phone && (
                      <div className="flex items-center gap-2.5">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground truncate">{p.phone}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {open && agency && (
        <NewPassengerModal
          tripId={id}
          agencyId={agency.id}
          onClose={() => setOpen(false)}
          onCreated={() => {
            setOpen(false);
            qc.invalidateQueries({ queryKey: ["passengers", id] });
          }}
        />
      )}
    </>
  );
}
