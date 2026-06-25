import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  processOcrFile,
  type Flight,
  type Hotel,
  type Transfer,
  type Tour,
  type ItineraryDay,
} from "@/services/proposals";

type Props = {
  proposalId?: string;
  agencyId?: string;
  onExtracted: (data: {
    flights?: Flight[];
    hotels?: Hotel[];
    transfers?: Transfer[];
    tours?: Tour[];
    itinerary?: ItineraryDay[];
    includes?: string[];
    excludes?: string[];
    emergency_contacts?: any[];
    insurance?: any;
    destination?: string;
    pax?: string[];
    locator?: string;
    notes?: string;
  }) => void;
};

export function OcrButton({ proposalId, agencyId, onExtracted }: Props) {
  const [busy, setBusy] = useState(false);

  async function handle(files: FileList | null) {
    if (!files || !files[0]) return;
    setBusy(true);
    try {
      const data = await processOcrFile(files[0], proposalId, agencyId);
      onExtracted(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível realizar a leitura automática do arquivo. Por favor, tente novamente ou preencha os dados manualmente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <label className="flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium hover:bg-surface-alt">
      <Sparkles className="h-3.5 w-3.5" /> {busy ? "Lendo…" : "Leitura Inteligente"}
      <input
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={(e) => handle(e.target.files)}
      />
    </label>
  );
}
