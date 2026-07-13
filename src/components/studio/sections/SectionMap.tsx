import { useState, lazy, Suspense } from "react";
import { Map } from "lucide-react";
import { Accordion } from "@/components/proposals/ProposalFormFields";
import { type Proposal } from "@/services/proposals";
import type { Waypoint } from "@/components/studio/StudioMapWidget";
import { Button } from "@/components/ui/button";

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
              <div className="relative h-24 w-full overflow-hidden rounded-2xl border border-border">
                <img
                  src={draft.map_image_url}
                  alt="Mapa do Roteiro"
                  className="h-full w-full object-cover"
                />
                <Button
                  type="button"
                  onClick={() => save({ map_image_url: null })}
                  className="absolute right-1 top-1 rounded bg-destructive/80 px-1.5 py-0.5 text-[9px] text-white hover:bg-destructive"
                >
                  Remover
                </Button>
              </div>
            )}
            <Button
              type="button"
              onClick={() => setShowMap(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-3 text-xs text-muted-foreground hover:bg-surface-alt transition-colors"
            >
              <Map className="h-3.5 w-3.5" />
              {draft.map_image_url ? "Editar Mapa Interativo" : "Abrir Mapa Interativo"}
            </Button>
          </div>
        )}

        {showMap && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="ds-meta uppercase tracking-wide font-semibold">
                Mapa Interativo
              </span>
              <Button
                type="button"
                onClick={() => setShowMap(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Fechar
              </Button>
            </div>
            <Suspense
              fallback={
                <div className="h-[400px] w-full rounded-full border bg-surface-alt/30 flex items-center justify-center text-muted-foreground text-sm animate-pulse">
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
