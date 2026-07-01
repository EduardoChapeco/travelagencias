// html2canvas and jsPDF are loaded on-demand to prevent build heap exhaustion.
// Do NOT revert to static imports — these trigger Vite SSR out-of-memory errors.

/**
 * Gera um hash SHA-256 no cliente usando Web Crypto API.
 */
export async function generateContractHash(payload: {
  contract_id: string;
  signer_name: string;
  signer_document: string;
  ip: string;
  timestamp: string;
  content: string;
}): Promise<string> {
  const dataString = JSON.stringify(payload);
  const encoder = new TextEncoder();
  const data = encoder.encode(dataString);

  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Tira uma "foto" da div especificada e converte para PDF.
 * Retorna uma base64 string DataURL do PDF gerado.
 */
export async function generateContractPdf(elementId: string): Promise<Blob> {
  const element = document.getElementById(elementId);
  if (!element) throw new Error("Elemento do contrato não encontrado na DOM.");

  // Oculta área de inputs de assinatura temporariamente para o PDF ser gerado sem botões/campos interativos
  const interactiveForm = document.getElementById("interactive-signature-form");
  if (interactiveForm) {
    interactiveForm.style.display = "none";
  }

  // Oculta elementos marcados como no-print
  const noPrintElements = element.querySelectorAll(".no-print");
  const noPrintOriginalStyles: Array<{ el: HTMLElement; display: string }> = [];
  noPrintElements.forEach((el: any) => {
    const htmlEl = el as HTMLElement;
    noPrintOriginalStyles.push({ el: htmlEl, display: htmlEl.style.display });
    htmlEl.style.setProperty("display", "none", "important");
  });

  // Encontra todos os elementos filhos que possuem barras de rolagem ou restrições de altura e expande-os
  const scrollables = element.querySelectorAll('[class*="overflow-y-auto"], [class*="max-h-"]');
  const originalStyles: Array<{ el: HTMLElement; maxHeight: string; overflow: string }> = [];

  scrollables.forEach((el: any) => {
    const htmlEl = el as HTMLElement;
    originalStyles.push({
      el: htmlEl,
      maxHeight: htmlEl.style.maxHeight,
      overflow: htmlEl.style.overflow,
    });
    // Remove as restrições temporariamente para permitir a renderização completa do conteúdo no canvas
    htmlEl.style.maxHeight = "none";
    htmlEl.style.overflow = "visible";
  });

  // Aguarda carregamento completo das fontes antes da renderização
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  // Lazy-load heavy libraries to avoid SSR bundle heap exhaustion
  const html2canvas = (await import("html2canvas")).default;
  const { jsPDF } = await import("jspdf");

  // Captura o HTML para Canvas
  const canvas = await html2canvas(element, {
    scale: 2, // Maior resolução
    useCORS: true,
    backgroundColor: "#ffffff", // Fundo branco obrigatório para PDF
  });

  // Restaura os estilos interativos de scroll do usuário
  originalStyles.forEach(({ el, maxHeight, overflow }) => {
    el.style.maxHeight = maxHeight;
    el.style.overflow = overflow;
  });

  if (interactiveForm) {
    interactiveForm.style.display = "block"; // Restaura o display
  }

  // Restaura elementos marcados como no-print
  noPrintOriginalStyles.forEach(({ el, display }) => {
    el.style.display = display;
  });

  const imgData = canvas.toDataURL("image/jpeg", 1.0);
  const pdf = new jsPDF("p", "mm", "a4");

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  // Adiciona a primeira página
  pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  // Adiciona páginas extras conforme a necessidade se a imagem for maior que a página A4
  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  // Saída otimizada em binário (Blob) para upload
  return pdf.output("blob");
}
