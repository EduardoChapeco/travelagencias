import { supabase } from "@/integrations/supabase/client";

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
 * Processa um arquivo (PDF ou Imagem) enviando o conteúdo binário em base64
 * para a Edge Function, que fará a extração e análise usando IA.
 */
export async function processVoucherWithAI(
  file: File,
  agencyId?: string,
): Promise<VoucherAIResult> {
  return new Promise<VoucherAIResult>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const result = reader.result as string;
        const base64 = result.split(",")[1];

        const { data, error } = await supabase.functions.invoke("ai-orchestrator", {
          body: {
            action: "completion",
            feature: "ocr_voucher",
            file_base64: base64,
            mime: file.type,
            file_name: file.name,
            agency_id: agencyId,
          },
        });

        if (error) {
          console.error("Erro na Supabase Edge Function (AI):", error);
          throw new Error(
            "A Inteligência Artificial não conseguiu processar o documento. " + error.message,
          );
        }

        resolve(data.result as VoucherAIResult);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Erro ao ler o arquivo localmente."));
    reader.readAsDataURL(file);
  });
}
