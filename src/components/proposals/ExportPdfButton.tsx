import { useState } from "react";
import {
  Download,
  FileText,
  Image as ImageIcon,
  Server,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
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

// ─── Validators ──────────────────────────────────────────────────────────────

type ValidationResult = { ok: boolean; errors: string[] };

function validateProposalForExport(proposal: Proposal): ValidationResult {
  const errors: string[] = [];

  // Minimum: must have title or destination
  if (!proposal.title?.trim() && !proposal.destination?.trim()) {
    errors.push("A proposta precisa ter um título ou destino definido.");
  }

  // Must have at least one section with real content
  const hasFlights = (proposal.flights ?? []).length > 0;
  const hasHotels = (proposal.hotels ?? []).length > 0;
  const hasTransfers = (proposal.transfers ?? []).length > 0;
  const hasTours = (proposal.tours ?? []).length > 0;
  const hasItinerary = (proposal.itinerary ?? []).length > 0;
  const hasIncludes = (proposal.includes ?? []).length > 0;

  if (!hasFlights && !hasHotels && !hasTransfers && !hasTours && !hasItinerary && !hasIncludes) {
    errors.push(
      "Adicione pelo menos uma seção de conteúdo (voo, hotel, transfer, passeio ou roteiro) antes de exportar.",
    );
  }

  // Must have a total value > 0 if it's a commercial proposal
  if (proposal.status !== "draft" && (!proposal.total || proposal.total <= 0)) {
    errors.push("A proposta precisa ter um valor total definido.");
  }

  return { ok: errors.length === 0, errors };
}

export function ExportPdfButton({ proposal }: Props) {
  const [busy, setBusy] = useState(false);
  const [serverPdfUrl, setServerPdfUrl] = useState<string | null>(null);

  async function exportPdf() {
    // Validate minimum data before export
    const validation = validateProposalForExport(proposal);
    if (!validation.ok) {
      validation.errors.forEach((err) => toast.error(err, { duration: 5000 }));
      return;
    }
    setBusy(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      const container = document.getElementById("proposal-canvas");
      if (!container) throw new Error("Canvas não encontrado. Abra o editor da proposta primeiro.");

      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      const pages = Array.from(
        container.querySelectorAll(".a4-page, .a4-landscape-page, .presentation-page"),
      ) as HTMLElement[];

      const isLandscape =
        proposal.canvas_format === "presentation-169" || proposal.canvas_format === "a4-landscape";
      const orientation = isLandscape ? "landscape" : "portrait";

      const pdf = new jsPDF({ orientation, unit: "mm", format: "a4" });
      const pdfW = isLandscape ? 297 : 210;
      const pdfH = isLandscape ? 210 : 297;

      if (pages.length > 0) {
        // Paginated flow: render each page individually
        for (let i = 0; i < pages.length; i++) {
          const el = pages[i];

          // Temporarily clear margin for rendering
          const originalMargin = el.style.margin;
          el.style.margin = "0";

          const canvas = await html2canvas(el, {
            scale: 2.5,
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false,
            onclone: (clonedDoc) => {
              const clonedCanvas = clonedDoc.getElementById("proposal-canvas");
              if (clonedCanvas) {
                clonedCanvas.style.transform = "none";
                clonedCanvas.style.transition = "none";
              }
            },
          });

          el.style.margin = originalMargin;

          const img = canvas.toDataURL("image/jpeg", 0.95);

          if (i > 0) {
            pdf.addPage("a4", orientation);
          }

          const x = 0;
          let y = 0;
          const w = pdfW;
          let h = pdfH;

          if (proposal.canvas_format === "presentation-169") {
            h = pdfW * (9 / 16); // Preserve 16:9 aspect ratio
            y = (pdfH - h) / 2; // Center vertically

            try {
              // Retrieve computed background color of the slide to fill PDF margins
              const bg = window.getComputedStyle(el).backgroundColor;
              if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
                pdf.setFillColor(bg);
                pdf.rect(0, 0, pdfW, pdfH, "F");
              } else {
                pdf.setFillColor(15, 23, 42);
                pdf.rect(0, 0, pdfW, pdfH, "F");
              }
            } catch (err) {
              pdf.setFillColor(15, 23, 42);
              pdf.rect(0, 0, pdfW, pdfH, "F");
            }
          }

          pdf.addImage(img, "JPEG", x, y, w, h);
        }
      } else {
        // Continuous flow: slice a single tall canvas into multiple A4 pages
        const el = container;
        const originalMargin = el.style.margin;
        el.style.margin = "0";

        const canvas = await html2canvas(el, {
          scale: 2.5,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
          onclone: (clonedDoc) => {
            const clonedCanvas = clonedDoc.getElementById("proposal-canvas");
            if (clonedCanvas) {
              clonedCanvas.style.transform = "none";
              clonedCanvas.style.transition = "none";
            }
          },
        });

        el.style.margin = originalMargin;

        const img = canvas.toDataURL("image/jpeg", 0.95);
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;

        // Calculate the height of one A4 page in canvas pixels based on target PDF aspect ratio
        const pageCanvasHeight = isLandscape ? imgWidth * 0.707 : imgWidth * 1.414;
        const totalPages = Math.ceil(imgHeight / pageCanvasHeight);

        // Calculate total PDF height if the image were rendered continuously
        const totalPdfHeight = pdfW * (imgHeight / imgWidth);

        for (let page = 0; page < totalPages; page++) {
          if (page > 0) {
            pdf.addPage("a4", orientation);
          }
          const yOffset = -page * pdfH;
          pdf.addImage(img, "JPEG", 0, yOffset, pdfW, totalPdfHeight);
        }
      }

      pdf.save(`proposta-${proposal.number}.pdf`);
      toast.success("PDF exportado com sucesso!");

      // Log activity
      await logProposalActivity(proposal.id, proposal.agency_id, "pdf_exported", {
        format: proposal.canvas_format,
        pages_count: pages.length > 0 ? pages.length : 1,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao exportar PDF");
    } finally {
      setBusy(false);
    }
  }

  async function exportImage(format: "png" | "jpeg" = "png") {
    // Validate minimum data before export
    const validation = validateProposalForExport(proposal);
    if (!validation.ok) {
      validation.errors.forEach((err) => toast.error(err, { duration: 5000 }));
      return;
    }
    setBusy(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const container = document.getElementById("proposal-canvas");
      if (!container) throw new Error("Canvas não encontrado. Abra o editor da proposta primeiro.");

      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

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
          onclone: (clonedDoc) => {
            const clonedCanvas = clonedDoc.getElementById("proposal-canvas");
            if (clonedCanvas) {
              clonedCanvas.style.transform = "none";
              clonedCanvas.style.transition = "none";
            }
          },
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
    // Validate minimum data before export
    const validation = validateProposalForExport(proposal);
    if (!validation.ok) {
      validation.errors.forEach((err) => toast.error(err, { duration: 5000 }));
      return;
    }
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
