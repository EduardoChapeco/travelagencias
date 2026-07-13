import { useState } from "react";
import { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateLead } from "@/services/crm";

export function useLeadTags(
  leadId: string | undefined,
  agencyId: string | undefined,
  qc: QueryClient
) {
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3b82f6");

  async function addTag(list: string[] | undefined) {
    if (!leadId || !newTagName.trim()) return;
    const tagString = `${newTagName.trim()}:${newTagColor}`;
    const currentList = list || [];
    if (currentList.includes(tagString)) return toast.error("Tag já existe");
    const updated = [...currentList, tagString];
    try {
      await updateLead(leadId, { tags: updated });
      setNewTagName("");
      qc.invalidateQueries({ queryKey: ["lead", leadId] });
      qc.invalidateQueries({ queryKey: ["leads", agencyId] });
      toast.success("Tag adicionada!");
    } catch (e) {
      toast.error("Falha ao adicionar tag");
    }
  }

  async function removeTag(list: string[] | undefined, tag: string) {
    if (!leadId) return;
    const currentList = list || [];
    const updated = currentList.filter((t) => t !== tag);
    try {
      await updateLead(leadId, { tags: updated });
      qc.invalidateQueries({ queryKey: ["lead", leadId] });
      qc.invalidateQueries({ queryKey: ["leads", agencyId] });
    } catch (e) {
      toast.error("Falha ao remover tag");
    }
  }

  return {
    newTagName,
    setNewTagName,
    newTagColor,
    setNewTagColor,
    addTag,
    removeTag,
  };
}
