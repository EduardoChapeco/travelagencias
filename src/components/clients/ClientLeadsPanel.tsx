import { useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Ticket as TicketIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function ClientLeadsPanel({ clientId, agencyId }: { clientId: string; agencyId: string }) {
  const { slug } = useParams({ from: "/agency/$slug/clients/$id" });
  const [open, setOpen] = useState(false);

  const leadsQ = useQuery({
    queryKey: ["client-leads", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id, name, destination, stage_id, created_at, stages(name, color)")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) return [];
      return data;
    },
  });

  const leads = leadsQ.data ?? [];

  return (
    <div className="rounded-3xl border border-border bg-background overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-6 py-4 text-sm font-bold hover:bg-surface/50 transition-colors text-foreground cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <TicketIcon className="h-4 w-4 text-brand" />
          Oportunidades (CRM) ({leads.length})
        </div>
      </button>

      {open && (
        <div className="px-6 pb-6 space-y-4 border-t border-border/50 pt-4 bg-background">
          {leads.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center">
              Nenhuma oportunidade vinculada.
            </p>
          ) : (
            leads.map((l: any) => (
              <Link
                key={l.id}
                to="/agency/$slug/crm/$lead_id"
                params={{ slug, lead_id: l.id }}
                className="flex items-center justify-between p-3 rounded-[var(--radius-card)] border border-border bg-surface hover:border-brand/40 transition-colors"
              >
                <div>
                  <div className="font-bold text-sm text-foreground">{l.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {l.destination || "Destino não informado"} · Estágio:{" "}
                    <span style={{ color: l.stages?.color }} className="font-semibold">
                      {l.stages?.name}
                    </span>
                  </div>
                </div>
                <div className="text-xs font-bold bg-brand/10 text-brand px-3 py-1.5 rounded-full">
                  Abrir CRM
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
