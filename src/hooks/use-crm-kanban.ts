import { useState, useMemo } from "react";
import { 
  PointerSensor, 
  useSensor, 
  useSensors, 
  type DragStartEvent, 
  type DragEndEvent 
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Lead, Stage } from "@/services/crm";

type UseCrmKanbanProps = {
  localLeads: Lead[] | null;
  setLocalLeads: React.Dispatch<React.SetStateAction<Lead[] | null>>;
  filteredLeads: Lead[] | null;
  stages: Stage[];
  onPersistMove: (payload: {
    leadId: string;
    fromStageId: string;
    toStageId: string;
    reorderedIds: string[];
  }) => void;
};

export function useCrmKanban({ localLeads, setLocalLeads, filteredLeads, stages, onPersistMove }: UseCrmKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const stagesById = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    stages.forEach((s) => (map[s.id] = []));
    (filteredLeads ?? []).forEach((l) => {
      if (!map[l.stage_id]) map[l.stage_id] = [];
      map[l.stage_id].push(l);
    });
    Object.values(map).forEach((arr) => arr.sort((a, b) => a.position - b.position));
    return map;
  }, [stages, filteredLeads]);

  function findContainerOf(leadId: string): string | null {
    for (const sid of Object.keys(stagesById)) {
      if (stagesById[sid].some((l) => l.id === leadId)) return sid;
    }
    return null;
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over || !localLeads) return;
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    const fromStage = findContainerOf(activeIdStr);
    if (!fromStage) return;
    
    const toStage = stagesById[overIdStr] ? overIdStr : findContainerOf(overIdStr);
    if (!toStage) return;

    const movedLead = localLeads.find((l) => l.id === activeIdStr);
    if (!movedLead) return;

    const sourceList = stagesById[fromStage].filter((l) => l.id !== activeIdStr);
    let destList = fromStage === toStage ? sourceList.slice() : stagesById[toStage].slice();

    let insertIndex = destList.length;
    if (stagesById[overIdStr] === undefined) {
      const overIndex = destList.findIndex((l) => l.id === overIdStr);
      insertIndex = overIndex >= 0 ? overIndex : destList.length;
    }

    if (fromStage === toStage) {
      const currentIndex = stagesById[fromStage].findIndex((l) => l.id === activeIdStr);
      const overIndex = destList.findIndex((l) => l.id === overIdStr);
      const newList = arrayMove(stagesById[fromStage], currentIndex, overIndex >= 0 ? overIndex : stagesById[fromStage].length - 1);
      destList = newList;
    } else {
      destList.splice(insertIndex, 0, { ...movedLead, stage_id: toStage });
    }

    const newLeads = localLeads.filter(l => l.stage_id !== fromStage && l.stage_id !== toStage);
    if (fromStage === toStage) {
      destList.forEach((l, i) => newLeads.push({ ...l, position: i }));
    } else {
      sourceList.forEach((l, i) => newLeads.push({ ...l, position: i }));
      destList.forEach((l, i) => newLeads.push({ ...l, stage_id: toStage, position: i }));
    }
    
    // Optimistic local update
    setLocalLeads(newLeads);

    // Call service to persist
    onPersistMove({
      leadId: activeIdStr,
      fromStageId: fromStage,
      toStageId: toStage,
      reorderedIds: destList.map((l) => l.id),
    });
  }

  const activeLead = activeId ? (localLeads ?? []).find((l) => l.id === activeId) : null;

  return {
    sensors,
    activeLead,
    stagesById,
    onDragStart,
    onDragEnd
  };
}
