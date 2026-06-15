import { useState } from "react";
import { Download, FileText, Image as ImageIcon, Server, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import {
  type Proposal,
  generateProposalPdfViaServer,
  logProposalActivity,
} from "@/services/proposals";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

type Props = {
  proposal: Proposal;
};

export function ExportPdfButton({ proposal }: Props) {
  const [busy, setBusy] = useState(false);
  const [serverPdfUrl, setServerPdfUrl] = useState<string | null>(null);

  async function exportPdf() {
    setBusy(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      const container = document.getElementById("proposal-canvas");
      if (!container) throw new Error("Canvas não encontrado. Abra o editor da proposta primeiro.");

      const pages = Array.from(
        container.querySelectorAll(".a4-page, .a4-landscape-page, .presentation-page"),
      ) as HTMLElement[];
      const targets = pages.length > 0 ? pages : [container];

      const isLandscape =
        proposal.canvas_format === "presentation-169" || proposal.canvas_format === "a4-landscape";
      const orientation = isLandscape ? "landscape" : "portrait";

      const pdf = new jsPDF({ orientation, unit: "mm", format: "a4" });
      const pdfW = isLandscape ? 297 : 210;
      const pdfH = isLandscape ? 210 : 297;

      for (let i = 0; i < targets.length; i++) {
        const el = targets[i];

        // Temporarily clear margin for rendering
        const originalMargin = el.style.margin;
        el.style.margin = "0";

        const canvas = await html2canvas(el, {
          scale: 2.5,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
        });

        el.style.margin = originalMargin;

        const img = canvas.toDataURL("image/jpeg", 0.95);

        if (i > 0) {
          pdf.addPage("a4", orientation);
        }

        pdf.addImage(img, "JPEG", 0, 0, pdfW, pdfH);
      }

      pdf.save(`proposta-${proposal.number}.pdf`);
      toast.success("PDF exportado com sucesso!");

      // Log activity
      await logProposalActivity(proposal.id, proposal.agency_id, "pdf_exported", {
        format: proposal.canvas_format,
        pages_count: targets.length,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao exportar PDF");
    } finally {
      setBusy(false);
    }
  }

  async function exportImage(format: "png" | "jpeg" = "png") {
    setBusy(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const container = document.getElementById("proposal-canvas");
      if (!container) throw new Error("Canvas não encontrado. Abra o editor da proposta primeiro.");

      const pages = Array.from(
        container.querySelectorAll(".a4-page, .a4-landscape-page, .presentation-page"),
      ) as HTMLElement[];
      const targets = pages.length > 0 ? pages : [container];

      for (let i = 0; i < targets.length; i++) {
        const el = targets[i];
        const originalMargin = el.style.margin;
        el.style.margin = "0";

        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
        });

        el.style.margin = originalMargin;

        const mimeType = format === "png" ? "image/png" : "image/jpeg";
        const extension = format === "png" ? "png" : "jpg";
        const img = canvas.toDataURL(mimeType, 0.95);

        const link = document.createElement("a");
        const suffix = targets.length > 1 ? `-pag-${String(i + 1).padStart(2, "0")}` : "";
        link.download = `proposta-${proposal.number}${suffix}.${extension}`;
        link.href = img;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        if (targets.length > 1) await new Promise((resolve) => setTimeout(resolve, 300));
      }

      toast.success(
        targets.length > 1 ? `${targets.length} imagens exportadas!` : "Imagem exportada!",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao exportar imagem");
    } finally {
      setBusy(false);
    }
  }

  async function exportServerPdf() {
    setBusy(true);
    setServerPdfUrl(null);
    const toastId = "server-pdf";
    toast.loading("Gerando PDF de alta qualidade no servidor…", { id: toastId });
    try {
      const isLandscape =
        proposal.canvas_format === "presentation-169" || proposal.canvas_format === "a4-landscape";
      const pdfFormat = proposal.canvas_format === "presentation-169" ? "presentation-169" : "A4";
      const url = await generateProposalPdfViaServer(
        proposal.id,
        proposal.agency_id,
        pdfFormat,
        isLandscape,
      );
      setServerPdfUrl(url);
      toast.success("PDF gerado com sucesso! Clique para baixar.", {
        id: toastId,
        duration: 8000,
        action: {
          label: "Baixar PDF",
          onClick: () => window.open(url, "_blank"),
        },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar PDF no servidor", {
        id: toastId,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      {serverPdfUrl && (
        <a
          href={serverPdfUrl}
          target="_blank"
          rel="noreferrer"
          className="flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium hover:bg-surface-alt transition-colors text-brand"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          PDF Pronto
        </a>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={busy}
            className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-60 whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" />
            {busy ? "Processando…" : "Exportar"}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground font-normal pb-1">
            Exportar via Navegador
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={exportPdf} className="cursor-pointer">
            <FileText className="mr-2 h-4 w-4" />
            PDF (Rápido)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => exportImage("png")} className="cursor-pointer">
            <ImageIcon className="mr-2 h-4 w-4" />
            Imagem PNG (Alta Qualidade)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => exportImage("jpeg")} className="cursor-pointer">
            <ImageIcon className="mr-2 h-4 w-4" />
            Imagem JPEG (Comprimida)
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground font-normal pb-1">
            Exportar via Servidor
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={exportServerPdf} className="cursor-pointer" disabled={busy}>
            <Server className="mr-2 h-4 w-4" />
            PDF Puppeteer (Profissional)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
