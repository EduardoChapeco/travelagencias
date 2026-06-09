import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/**
 * Gera um hash SHA-256 no cliente usando Web Crypto API.
 */
export async function generateContractHash(
  payload: {
    contract_id: string;
    signer_name: string;
    signer_document: string;
    ip: string;
    timestamp: string;
    content: string;
  }
): Promise<string> {
  const dataString = JSON.stringify(payload);
  const encoder = new TextEncoder();
  const data = encoder.encode(dataString);
  
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Tira uma "foto" da div especificada e converte para PDF.
 * Retorna uma base64 string DataURL do PDF gerado.
 */
export async function generateContractPdf(elementId: string): Promise<string> {
  const element = document.getElementById(elementId);
  if (!element) throw new Error("Elemento do contrato não encontrado na DOM.");

  // Oculta área de assinatura temporariamente para o PDF ser "limpo" como documento anexo
  const signatureSection = document.getElementById("signature-section");
  if (signatureSection) {
    signatureSection.style.display = "none";
  }

  // Captura o HTML para Canvas
  const canvas = await html2canvas(element, {
    scale: 2, // Maior resolução
    useCORS: true,
    backgroundColor: "#ffffff", // Fundo branco obrigatório para PDF
  });

  if (signatureSection) {
    signatureSection.style.display = "block"; // Restaura o display
  }

  const imgData = canvas.toDataURL("image/jpeg", 1.0);
  const pdf = new jsPDF("p", "mm", "a4");

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);

  // Saída em base64 (DataURL)
  return pdf.output("datauristring");
}
