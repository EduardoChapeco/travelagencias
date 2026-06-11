import { useEffect, useMemo } from "react";
import { Proposal } from "@/services/proposals";

export function useProposalMath(
  draft: Proposal | null, 
  setDraft: React.Dispatch<React.SetStateAction<Proposal | null>>,
  persistMutation: (patch: Partial<Proposal>) => void
) {
  const calculatedTotal = useMemo(() => {
    if (!draft) return 0;
    const sum = (arr: Array<{ price?: number }>) =>
      arr.reduce((s, x) => s + (Number(x.price) || 0), 0);
    return sum(draft.flights) + sum(draft.hotels) + sum(draft.transfers) + sum(draft.tours);
  }, [draft]);

  // Auto-recalculate total whenever items change
  useEffect(() => {
    if (!draft) return;
    if (Number(draft.total) !== Number(calculatedTotal) || Number(draft.subtotal) !== Number(calculatedTotal)) {
      const discountValue = calculatedTotal * (Number(draft.pix_discount_percent) / 100);
      const finalTotal = Math.max(0, calculatedTotal - discountValue);
      
      // Update remote
      persistMutation({ subtotal: calculatedTotal, discount: discountValue, total: finalTotal });
      
      // Update local draft
      setDraft((d) =>
        d ? { ...d, subtotal: calculatedTotal, discount: discountValue, total: finalTotal } : d
      );
    }
  }, [calculatedTotal, draft?.pix_discount_percent]);

  return { calculatedTotal };
}
