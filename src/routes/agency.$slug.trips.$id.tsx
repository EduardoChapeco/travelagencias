import { createFileRoute, Link, Outlet, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  MapPin,
  CalendarDays,
  ReceiptText,
  Users,
  Ticket,
  FileSignature,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { StatusBadge, fmtDate } from "@/components/ui/form";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/agency/$slug/trips/$id")({
  head: () => ({ meta: [{ title: "Viagem · TravelOS" }] }),
  component: TripLayout,
});

function TripLayout() {
  const { slug, id } = useParams({ from: "/agency/$slug/trips/$id" });
  const { agency } = useAgency();

  const tripQ = useQuery({
    enabled: !!agency,
    queryKey: ["trip", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("trips").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const paxQ = useQuery({
    enabled: !!agency,
    queryKey: ["passengers", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("trip_passengers").select("id").eq("trip_id", id);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (tripQ.isLoading) return <div className="text-sm text-muted-foreground p-6">Carregando…</div>;
  if (!tripQ.data)
    return <div className="text-sm text-muted-foreground p-6">Viagem não encontrada.</div>;

  const t = tripQ.data;

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto w-full pb-10">
      <div className="mb-4">
        <Link
          to="/agency/$slug/trips"
          params={{ slug }}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors bg-surface-alt px-2.5 py-1.5 rounded-full"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar para Viagens
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="font-mono text-sm text-brand font-bold bg-brand/10 px-2 py-0.5 rounded">
              #{t.number}
            </span>
            <StatusBadge
              tone={
                t.status === "confirmed" ? "success" : t.status === "cancelled" ? "danger" : "info"
              }
            >
              {t.status}
            </StatusBadge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{t.title}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {t.destination && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" /> {t.destination}
              </div>
            )}
            {(t.travel_start || t.travel_end) && (
              <div className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" /> {fmtDate(t.travel_start)} →{" "}
                {fmtDate(t.travel_end)}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="border-b border-border/60 mb-6">
        <nav className="flex gap-6 overflow-x-auto no-scrollbar" aria-label="Tabs">
          <Link
            to="/agency/$slug/trips/$id"
            params={{ slug, id }}
            activeOptions={{ exact: true }}
            className="group pb-3 border-b-2 font-medium text-sm transition-colors data-[status=active]:border-brand data-[status=active]:text-foreground border-transparent text-muted-foreground hover:text-foreground flex items-center gap-2 whitespace-nowrap"
          >
            <ReceiptText className="h-4 w-4 opacity-70 group-data-[status=active]:text-brand group-data-[status=active]:opacity-100" />{" "}
            Visão Geral
          </Link>
          <Link
            to="/agency/$slug/trips/$id/financial"
            params={{ slug, id }}
            className="group pb-3 border-b-2 font-medium text-sm transition-colors data-[status=active]:border-brand data-[status=active]:text-foreground border-transparent text-muted-foreground hover:text-foreground flex items-center gap-2 whitespace-nowrap"
          >
            <span className="opacity-70 group-data-[status=active]:text-brand group-data-[status=active]:opacity-100">
              R$
            </span>{" "}
            Financeiro
          </Link>
          <Link
            to="/agency/$slug/trips/$id/passengers"
            params={{ slug, id }}
            className="group pb-3 border-b-2 font-medium text-sm transition-colors data-[status=active]:border-brand data-[status=active]:text-foreground border-transparent text-muted-foreground hover:text-foreground flex items-center gap-2 whitespace-nowrap"
          >
            <Users className="h-4 w-4 opacity-70 group-data-[status=active]:text-brand group-data-[status=active]:opacity-100" />{" "}
            Passageiros ({paxQ.data?.length ?? 0})
          </Link>
          <Link
            to="/agency/$slug/trips/$id/vouchers"
            params={{ slug, id }}
            className="group pb-3 border-b-2 font-medium text-sm transition-colors data-[status=active]:border-brand data-[status=active]:text-foreground border-transparent text-muted-foreground hover:text-foreground flex items-center gap-2 whitespace-nowrap"
          >
            <Ticket className="h-4 w-4 opacity-70 group-data-[status=active]:text-brand group-data-[status=active]:opacity-100" />{" "}
            Vouchers
          </Link>
          <Link
            to="/agency/$slug/trips/$id/contract"
            params={{ slug, id }}
            className="group pb-3 border-b-2 font-medium text-sm transition-colors data-[status=active]:border-brand data-[status=active]:text-foreground border-transparent text-muted-foreground hover:text-foreground flex items-center gap-2 whitespace-nowrap"
          >
            <FileSignature className="h-4 w-4 opacity-70 group-data-[status=active]:text-brand group-data-[status=active]:opacity-100" />{" "}
            Contrato Jurídico
          </Link>
        </nav>
      </div>

      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}
