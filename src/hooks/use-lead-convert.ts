import { useState, useEffect } from "react";
import { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { promoteLeadToClient, type Lead } from "@/services/crm";

export function useLeadConvert(
  lead: Lead | undefined,
  agencyId: string | undefined,
  stageColor: string | undefined,
  qc: QueryClient,
  setEditing: (editing: boolean) => void
) {
  const [confirmConvertOpen, setConfirmConvertOpen] = useState(false);
  const [clientPayload, setClientPayload] = useState({
    full_name: "",
    document: "",
    birth_date: "",
    email: "",
    phone: "",
    pcd: false,
    reduced_mobility: false,
    autism: false,
    health_notes: "",
  });

  useEffect(() => {
    if (lead) {
      setClientPayload({
        full_name: lead.name || "",
        document: "",
        birth_date: "",
        email: lead.email || "",
        phone: lead.phone || "",
        pcd: lead.pcd || false,
        reduced_mobility: lead.reduced_mobility || false,
        autism: lead.autism || false,
        health_notes: lead.health_notes || "",
      });
    }
  }, [lead]);

  async function handleConvert() {
    if (!lead) return;
    const missing: string[] = [];
    if (!lead.name?.trim()) missing.push("Nome completo");
    if (!(lead as any).document?.trim() && !(lead as any).cpf?.trim())
      missing.push("CPF / Documento");
    if (!(lead as any).birth_date?.trim()) missing.push("Data de nascimento");
    if (!lead.phone?.trim()) missing.push("WhatsApp / Telefone");

    if (missing.length > 0) {
      toast.error(
        `Preencha os campos obrigatórios antes de converter:\n• ${missing.join("\n• ")}`,
        { duration: 6000 }
      );
      setEditing(true);
      return;
    }

    try {
      await promoteLeadToClient(lead.id, clientPayload);
    } catch (error: any) {
      return toast.error("Erro ao converter lead: " + error.message);
    }

    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#000000", "#ffffff", "#a8a29e", stageColor || "#3b82f6"],
      disableForReducedMotion: true,
    });

    toast.success("Lead convertido para Cliente!");
    qc.invalidateQueries({ queryKey: ["lead", lead.id] });
    qc.invalidateQueries({ queryKey: ["leads", agencyId] });
  }

  return {
    confirmConvertOpen,
    setConfirmConvertOpen,
    clientPayload,
    setClientPayload,
    handleConvert,
  };
}
