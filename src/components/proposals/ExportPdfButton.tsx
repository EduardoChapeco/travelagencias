import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { type Proposal } from "@/services/proposals";

type Props = {
  proposal: Proposal;
};

export function ExportPdfButton({ proposal }: Props) {
  const [busy, setBusy] = useState(false);

  async function exportPdf() {
    setBusy(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      const el = document.getElementById("proposal-canvas");
      if (!el) throw new Error("Canvas não encontrado");
      const canvas = await html2canvas(el, { scale: 3, useCORS: true, backgroundColor: "#ffffff" });
      const img = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfW = 210;
      const pdfH = (canvas.height * pdfW) / canvas.width;
      pdf.addImage(img, "JPEG", 0, 0, pdfW, pdfH);
      pdf.save(`proposta-${proposal.number}.pdf`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao exportar PDF");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={exportPdf}
      disabled={busy}
      className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-60"
    >
      <Download className="h-3.5 w-3.5" /> {busy ? "Gerando…" : "PDF"}
    </button>
  );
}
