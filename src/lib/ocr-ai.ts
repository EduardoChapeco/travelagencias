import * as pdfjsLib from "pdfjs-dist";
import { supabase } from "@/integrations/supabase/client";

// Configura o worker do PDF.js para funcionar no navegador
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export interface VoucherAIResult {
  title: string;
  category: "flight" | "hotel" | "transfer" | "activity" | "insurance" | "other";
  locator: string;
  provider: string;
  date_start: string | null;
  date_end: string | null;
  passengers: string[];
  raw_extracted_text?: string;
}

/**
 * Lê o arquivo PDF no navegador e extrai todo o texto bruto
 */
async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(" ");
    fullText += pageText + "\n";
  }

  return fullText;
}

/**
 * Processa um arquivo (PDF ou Imagem) extraindo texto e enviando para a Inteligência Artificial
 * realizar a leitura contextual e devolver o JSON sanitizado para o Voucher.
 */
export async function processVoucherWithAI(file: File): Promise<VoucherAIResult> {
  let rawText = "";

  // 1. Extração de Texto
  if (file.type === "application/pdf") {
    rawText = await extractTextFromPdf(file);
  } else if (file.type.startsWith("image/")) {
    throw new Error(
      "A extração de imagem via OCR direto no navegador requer Tesseract.js. No momento, o fluxo otimizado é via PDF das operadoras.",
    );
  } else {
    throw new Error("Formato não suportado para OCR nativo.");
  }

  if (!rawText || rawText.trim().length < 10) {
    throw new Error(
      "O PDF parece ser uma imagem escaneada sem camada de texto (requer OCR visual).",
    );
  }

  // 2. Chamada à Inteligência Artificial (Supabase Edge Function)
  // A Edge Function "ai-voucher-ocr" usará o OpenAI/Gemini para ler o `rawText` e devolver a interface VoucherAIResult
  const { data, error } = await supabase.functions.invoke("ai-voucher-ocr", {
    body: { text: rawText, file_name: file.name },
  });

  if (error) {
    console.error("Erro na Supabase Edge Function (AI):", error);
    throw new Error(
      "A Inteligência Artificial não conseguiu processar o documento no servidor. " + error.message,
    );
  }

  return {
    ...data.result,
    raw_extracted_text: rawText,
  } as VoucherAIResult;
}
