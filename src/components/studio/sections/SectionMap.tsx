import { useState, lazy, Suspense } from "react";
import { Map } from "lucide-react";
import { Accordion } from "@/components/proposals/ProposalFormFields";
import { type Proposal } from "@/services/proposals";
import type { Waypoint } from "@/components/studio/StudioMapWidget";

const StudioMapWidget = lazy(() =>
  import("@/components/studio/StudioMapWidget").then((m) => ({
    default: m.StudioMapWidget,
  })),
);

interface SectionMapProps {
  draft: Proposal;
  save: (patch: Partial<Proposal>) => void;
}

export function SectionMap({ draft, save }: SectionMapProps) {
  const [showMap, setShowMap] = useState(false);

  return (
    <Accordion title={`Mapa do Roteiro`}>
      <div className="space-y-3">
        {!showMap && (
          <div className="space-y-2">
            {draft.map_image_url && (
              <div className="relative h-24 w-full overflow-hidden rounded-lg border border-border">
                <img
                  src={draft.map_image_url}
                  alt="Mapa do Roteiro"
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => save({ map_image_url: null })}
                  className="absolute right-1 top-1 rounded bg-destructive/80 px-1.5 py-0.5 text-[9px] text-white hover:bg-destructive"
                >
                  Remover
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowMap(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-3 text-xs text-muted-foreground hover:bg-surface-alt transition-colors"
            >
              <Map className="h-3.5 w-3.5" />
              {draft.map_image_url ? "Editar Mapa Interativo" : "Abrir Mapa Interativo"}
            </button>
          </div>
        )}

        {showMap && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wide font-semibold">
                Mapa Interativo
              </span>
              <button
                type="button"
                onClick={() => setShowMap(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Fechar
              </button>
            </div>
            <Suspense
              fallback={
                <div className="h-[400px] w-full rounded-md border bg-surface-alt/30 flex items-center justify-center text-muted-foreground text-sm animate-pulse">
                  Carregando mapa interativo...
                </div>
              }
            >
              <StudioMapWidget
                agencyId={draft.agency_id}
                proposalId={draft.id}
                waypoints={(draft.waypoints as Waypoint[]) ?? []}
                onWaypointsChange={(waypoints) => save({ waypoints: waypoints as any })}
                onMapCaptured={(url) => {
                  save({ map_image_url: url });
                  setShowMap(false);
                }}
              />
            </Suspense>
          </div>
        )}
      </div>
    </Accordion>
  );
}
