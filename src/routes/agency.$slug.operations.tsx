import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAgency } from "@/lib/agency-context";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shell/PageHeader";
import { DndContext, closestCorners, DragOverlay } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { Plane, CheckCircle2, AlertCircle, FileText, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = (createFileRoute as any)("/agency/$slug/operations")({
  head: ({ context }: any) => ({
    meta: [{ title: `Operações · ${context?.brand?.platform_name || "Turis"}` }],
  }),
  component: OperationsPage,
});

const COLUMNS = [
  { id: "pending_issuance", title: "Emissão Pendente", color: "border-orange-500/20 bg-orange-500/5 text-orange-500" },
  { id: "issued", title: "Emitido / Conferido", color: "border-blue-500/20 bg-blue-500/5 text-blue-500" },
  { id: "ticketed", title: "Finalizado / Ticketed", color: "border-green-500/20 bg-green-500/5 text-green-500" },
];

function OperationsPage() {
  const { agency } = useAgency();
  const qc = useQueryClient();
  const { slug } = useParams({ strict: false }) as { slug?: string };
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data: trips, isLoading } = useQuery({
    enabled: !!agency,
    queryKey: ["operations-trips", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select("id, title, status, operations_status, operations_checklist, clients(full_name), travel_start, total_sale, currency")
        .eq("agency_id", agency!.id)
        .eq("status", "confirmed")
        .is("deleted_at", null)
        .order("travel_start", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ tripId, status }: { tripId: string; status: string }) => {
      const { error } = await supabase
        .from("trips")
        .update({ operations_status: status })
        .eq("id", tripId)
        .eq("agency_id", agency!.id);
      if (error) throw error;
    },
    onMutate: async ({ tripId, status }) => {
      await qc.cancelQueries({ queryKey: ["operations-trips", agency?.id] });
      const prev = qc.getQueryData(["operations-trips", agency?.id]);
      qc.setQueryData(["operations-trips", agency?.id], (old: any) =>
        (old || []).map((t: any) => (t.id === tripId ? { ...t, operations_status: status } : t))
      );
      return { prev };
    },
    onError: (err, vars, ctx) => {
      qc.setQueryData(["operations-trips", agency?.id], ctx?.prev);
      toast.error("Erro ao atualizar status");
    },
  });

  const handleDragStart = (e: any) => setActiveId(e.active.id);

  const handleDragEnd = (e: any) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const tripId = active.id;
    const overId = over.id;
    
    // Find if we dropped over a column or another card
    const overTrip = trips?.find((t: any) => t.id === overId);
    let targetStatus = overId;
    if (overTrip) {
      targetStatus = overTrip.operations_status || "pending_issuance";
    }

    const activeTrip = trips?.find((t: any) => t.id === tripId);
    if (activeTrip && activeTrip.operations_status !== targetStatus) {
      updateStatus.mutate({ tripId, status: targetStatus });
    }
  };

  return (
    <div className="w-full flex h-full flex-col overflow-hidden bg-transparent">
      <PageHeader title="Operações & Fulfillment" />

      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 pt-0">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <DndContext
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex h-full gap-4 items-start w-max">
              {COLUMNS.map((col) => {
                const columnTrips = trips?.filter(
                  (t: any) => (t.operations_status || "pending_issuance") === col.id
                ) || [];

                return (
                  <div
                    key={col.id}
                    className="flex h-full w-[320px] flex-col rounded-xl border border-border bg-muted/20"
                  >
                    <div className="flex items-center justify-between p-3 border-b border-border">
                      <div className={cn("px-2.5 py-1 text-xs font-semibold rounded-full border", col.color)}>
                        {col.title}
                      </div>
                      <span className="text-xs font-medium text-os-muted bg-muted px-2 py-0.5 rounded-full">
                        {columnTrips.length}
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3">
                      <SortableContext
                        id={col.id}
                        items={columnTrips.map((t: any) => t.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="flex flex-col gap-2 min-h-[100px]">
                          {columnTrips.map((t: any) => (
                            <TripCard key={t.id} trip={t} agencySlug={slug || ""} />
                          ))}
                        </div>
                      </SortableContext>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <DragOverlay>
              {activeId ? (
                <TripCard 
                  trip={trips?.find((t: any) => t.id === activeId)} 
                  agencySlug={slug || ""} 
                  isOverlay 
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  );
}

function TripCard({ trip, agencySlug, isOverlay }: { trip: any; agencySlug: string, isOverlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: trip?.id || "empty",
  });

  if (!trip) return null;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const checklist = trip.operations_checklist || {};
  const hasInsurance = checklist.insurance;
  const hasDocs = checklist.docs;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group relative flex flex-col gap-3 rounded-lg border bg-os p-3 shadow-sm transition-all hover:border-border-hover cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50",
        isOverlay && "scale-105 shadow-xl ring-2 ring-primary ring-opacity-20 rotate-2"
      )}
    >
      <div className="flex items-start justify-between">
        <Link
          to="/agency/$slug/trips/$id"
          params={{ slug: agencySlug, id: trip.id }}
          className="text-sm font-semibold text-os tracking-tight hover:text-primary transition-colors line-clamp-2"
          onClick={(e) => e.stopPropagation()} // prevent drag when clicking link
        >
          {trip.title}
        </Link>
      </div>

      <div className="flex items-center justify-between text-xs text-os-muted">
        <span className="truncate">{trip.clients?.full_name || "Cliente sem nome"}</span>
        <span className="font-medium tabular-nums">{new Date(trip.travel_start).toLocaleDateString()}</span>
      </div>

      <div className="flex items-center justify-between mt-1 pt-3 border-t border-border">
        <div className="flex items-center gap-2">
          <div className={cn("flex items-center gap-1", hasInsurance ? "text-green-500" : "text-os-muted")}>
            {hasInsurance ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            <span className="text-[10px] font-medium uppercase tracking-wider">Seg</span>
          </div>
          <div className={cn("flex items-center gap-1", hasDocs ? "text-green-500" : "text-os-muted")}>
            {hasDocs ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            <span className="text-[10px] font-medium uppercase tracking-wider">Doc</span>
          </div>
        </div>
        <div className="text-xs font-semibold text-os">
          {trip.currency} {trip.total_sale?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </div>
      </div>
      
      {/* Upload Voucher Shortcut */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Link 
          to="/agency/$slug/trips/$id/vouchers" 
          params={{ slug: agencySlug, id: trip.id }}
          className="bg-muted hover:bg-muted-hover text-os-muted hover:text-os p-1.5 rounded-md flex items-center justify-center transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <Upload className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
