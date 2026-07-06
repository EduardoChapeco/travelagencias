import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Plus, GripVertical, Search, Globe, FileText, Check, Clock, Settings2, AlertCircle } from "lucide-react";
import { HeaderPortal } from "@/components/shell/HeaderPortal";
import { ModuleToolbar, ModuleActionButton } from "@/components/shell/ModuleToolbar";
import { ModuleAdminPanel } from "@/components/shell/ModuleAdminPanel";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { fetchVisaStages, fetchVisas, persistVisaMove } from "@/services/visas";
import { useAgency } from "@/lib/agency-context";
import { toast } from "sonner";
import { PrimaryButton, fmtDate, StatusBadge } from "@/components/ui/form";
import { NewVisaWizard } from "@/components/visas/NewVisaWizard";

export const Route = createFileRoute("/agency/$slug/visas")({
  head: ({ context }: any) => ({ meta: [{ title: `Vistos e Passaportes · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: VisasPage,
});

type VisaStage = { id: string; name: string; position: number; color: string; is_final: boolean };
type Visa = {
  id: string;
  stage_id: string;
  client_id: string;
  country: string;
  category: string;
  status: string;
  position: number;
  expected_date: string | null;
  created_at: string;
  client?: { full_name: string };
};

function VisasPage() {
  const { agency, isAgencyAdmin } = useAgency();
  const qc = useQueryClient();
  const { slug } = Route.useParams();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localVisas, setLocalVisas] = useState<Visa[] | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);

  const stagesQ = useQuery({
    enabled: !!agency,
    queryKey: ["visa-stages", agency?.id],
    queryFn: () => fetchVisaStages(agency!.id),
  });

  const visasQ = useQuery({
    enabled: !!agency,
    queryKey: ["visas", agency?.id],
    queryFn: () => fetchVisas(agency!.id),
  });

  useEffect(() => {
    if (visasQ.data) setLocalVisas(visasQ.data);
  }, [visasQ.data]);

  const persistMove = useMutation({
    mutationFn: async (payload: { visaId: string; toStageId: string; reorderedIds: string[] }) => {
      await persistVisaMove({ ...payload });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar posição");
      qc.invalidateQueries({ queryKey: ["visas", agency?.id] });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const stagesById = useMemo(() => {
    const map: Record<string, Visa[]> = {};
    (stagesQ.data ?? []).forEach((s: any) => (map[s.id] = []));
    (localVisas ?? []).forEach((v) => {
      if (!map[v.stage_id]) map[v.stage_id] = [];
      map[v.stage_id].push(v);
    });
    Object.values(map).forEach((arr) => arr.sort((a, b) => a.position - b.position));
    return map;
  }, [stagesQ.data, localVisas]);

  function findContainerOf(visaId: string): string | null {
    for (const sid of Object.keys(stagesById)) {
      if (stagesById[sid].some((v) => v.id === visaId)) return sid;
    }
    return null;
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over || !localVisas) return;
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    const fromStage = findContainerOf(activeIdStr);
    if (!fromStage) return;

    const toStage = stagesById[overIdStr] ? overIdStr : findContainerOf(overIdStr);
    if (!toStage) return;

    const movedVisa = localVisas.find((v) => v.id === activeIdStr);
    if (!movedVisa) return;

    const sourceList = stagesById[fromStage].filter((v) => v.id !== activeIdStr);
    let destList = fromStage === toStage ? sourceList.slice() : stagesById[toStage].slice();

    let insertIndex = destList.length;
    if (stagesById[overIdStr] === undefined) {
      const overIndex = destList.findIndex((v) => v.id === overIdStr);
      insertIndex = overIndex >= 0 ? overIndex : destList.length;
    }

    if (fromStage === toStage) {
      const currentIndex = stagesById[fromStage].findIndex((v) => v.id === activeIdStr);
      const overIndex = destList.findIndex((v) => v.id === overIdStr);
      const newList = arrayMove(
        stagesById[fromStage],
        currentIndex,
        overIndex >= 0 ? overIndex : stagesById[fromStage].length - 1,
      );
      destList = newList;
    } else {
      destList.splice(insertIndex, 0, { ...movedVisa, stage_id: toStage });
    }

    const newVisas = localVisas.filter((v) => v.stage_id !== fromStage && v.stage_id !== toStage);
    if (fromStage === toStage) {
      destList.forEach((v, i) => newVisas.push({ ...v, position: i }));
    } else {
      sourceList.forEach((v, i) => newVisas.push({ ...v, position: i }));
      destList.forEach((v, i) => newVisas.push({ ...v, stage_id: toStage, position: i }));
    }
    setLocalVisas(newVisas);

    persistMove.mutate({
      visaId: activeIdStr,
      toStageId: toStage,
      reorderedIds: destList.map((v) => v.id),
    });
  }

  const activeVisa = activeId ? (localVisas ?? []).find((v) => v.id === activeId) : null;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <HeaderPortal>
        <ModuleToolbar
          title="Vistos"
          actions={
            <div className="flex items-center gap-1.5">
              <Link
                to="/agency/$slug/visas-catalog"
                params={{ slug }}
                className="h-7 px-2.5 flex items-center gap-1.5 rounded-full border border-white/15 text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-[11px] font-semibold"
              >
                <FileText className="w-3.5 h-3.5" /> Catálogo
              </Link>
              {isAgencyAdmin && (
                <button
                  onClick={() => setAdminPanelOpen(true)}
                  className="h-7 w-7 flex items-center justify-center rounded-full border border-white/15 text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Administrar Vistos"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          }
        />
      </HeaderPortal>

      <ModuleActionButton
        label="Novo Processo"
        icon={<Plus className="h-3.5 w-3.5" />}
        onClick={() => setNewOpen(true)}
      />

      <div className="flex-1 overflow-x-auto pt-4 px-4 md:pl-[64px] md:pr-6 pb-24">
        {(stagesQ.isError || visasQ.isError) && (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center rounded-[24px] border border-red-200 bg-red-50/60 mb-6 max-w-2xl mx-auto">
            <div className="h-9 w-9 rounded-full bg-red-100 flex items-center justify-center mb-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
            </div>
            <h3 className="text-sm font-bold text-red-800">Falha ao Carregar Processos de Vistos</h3>
            <p className="text-xs text-red-600 mt-1">
              {stagesQ.isError && stagesQ.error instanceof Error ? stagesQ.error.message : visasQ.isError && visasQ.error instanceof Error ? visasQ.error.message : "Erro desconhecido."}
            </p>
          </div>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <div className="flex h-full gap-4">
            {(stagesQ.data ?? []).map((stage: any) => (
              <StageColumn key={stage.id} stage={stage} items={stagesById[stage.id] ?? []} />
            ))}
          </div>
          <DragOverlay>{activeVisa ? <VisaCard visa={activeVisa} isOverlay /> : null}</DragOverlay>
        </DndContext>
      </div>

      {newOpen && agency && (
        <NewVisaWizard
          agencyId={agency.id}
          onClose={() => setNewOpen(false)}
          onCreated={() => {
            setNewOpen(false);
            qc.invalidateQueries({ queryKey: ["visas", agency.id] });
          }}
        />
      )}

      {adminPanelOpen && agency && (
        <ModuleAdminPanel
          isOpen={adminPanelOpen}
          onClose={() => setAdminPanelOpen(false)}
          moduleKey="visas"
          moduleName="Vistos"
          agencyId={agency.id}
        />
      )}
    </div>
  );
}

function StageColumn({ stage, items }: { stage: VisaStage; items: Visa[] }) {
  const { setNodeRef } = useSortable({ id: stage.id, data: { type: "Column", stage } });

  return (
    <div
      ref={setNodeRef}
      className="flex h-full w-80 shrink-0 flex-col rounded-[24px] bg-surface-alt/50 border border-border"
    >
      <div className="flex items-center justify-between border-b border-border p-3">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: stage.color }} />
          <h3 className="font-semibold text-sm">{stage.name}</h3>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface text-[10px] font-medium text-muted-foreground border border-border">
            {items.length}
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2 min-h-[100px]">
            {items.map((visa) => (
              <SortableVisa key={visa.id} visa={visa} />
            ))}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

function SortableVisa({ visa }: { visa: Visa }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: visa.id,
    data: { type: "Visa", visa },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <VisaCard visa={visa} />
    </div>
  );
}

function VisaCard({ visa, isOverlay }: { visa: Visa; isOverlay?: boolean }) {
  return (
    <div
      className={`group relative flex cursor-grab flex-col gap-2.5 rounded-2xl border bg-surface p-3 text-left active:cursor-grabbing hover:border-border-strong ${
        isOverlay ? "rotate-2 scale-105 border-brand/50 " : "border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium text-sm leading-tight text-foreground">
          {visa.client?.full_name ?? "Cliente Desconhecido"}
        </div>
        <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>

      <div className="flex items-center gap-2 mt-1">
        <StatusBadge tone="neutral">
          <Globe className="mr-1 h-3 w-3 inline" /> {visa.country}
        </StatusBadge>
        <span className="text-xs text-muted-foreground">{visa.category}</span>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2 border-t border-border/50 pt-2">
        <div className="flex items-center gap-1">
          <FileText className="h-3 w-3" /> Docs
        </div>
        {visa.expected_date && (
          <div className="flex items-center gap-1 text-orange-500">
            <Clock className="h-3 w-3" /> {fmtDate(visa.expected_date)}
          </div>
        )}
      </div>
    </div>
  );
}
