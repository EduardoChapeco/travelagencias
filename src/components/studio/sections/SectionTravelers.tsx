import { type Proposal } from "@/services/proposals";
import {
  Accordion,
  NumField,
  TextField,
  Card,
  AddBtn,
  SMALL_INPUT,
} from "@/components/proposals/ProposalFormFields";
import { Users, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  draft: Proposal;
  save: (patch: Partial<Proposal>) => void;
}

export function SectionTravelers({ draft, save }: Props) {
  const pax = [
    { key: "pax_adults" as const, label: "Adultos" },
    { key: "pax_seniors" as const, label: "Sênior (>60)" },
    { key: "pax_children" as const, label: "Crianças (2-11)" },
    { key: "pax_infants" as const, label: "Bebês (<2)" },
  ];

  return (
    <Accordion title="Passageiros" defaultOpen>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {pax.map(({ key, label }) => (
          <NumField
            key={key}
            label={label}
            value={draft[key] ?? 0}
            onSave={(v) => save({ [key]: v })}
          />
        ))}
      </div>

      <div className="space-y-2 mt-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
            Nomes dos passageiros
          </span>
          <AddBtn
            onClick={() => {
              const current = (draft as any).pax_names ?? [];
              save({ pax_names: [...current, ""] } as any);
            }}
          >
            Adicionar
          </AddBtn>
        </div>
        {((draft as any).pax_names ?? []).map((name: string, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-alt text-[10px] font-bold text-muted-foreground">
              {i + 1}
            </span>
            <input
              className={SMALL_INPUT + " flex-1"}
              value={name}
              placeholder="Nome completo"
              onChange={(e) => {
                const arr = [...((draft as any).pax_names ?? [])];
                arr[i] = e.target.value;
                save({ pax_names: arr } as any);
              }}
            />
            <Button
              type="button"
              onClick={() => {
                const arr = ((draft as any).pax_names ?? []).filter(
                  (_: string, x: number) => x !== i,
                );
                save({ pax_names: arr } as any);
              }}
              className="rounded p-1 text-muted-foreground hover:text-danger transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </Accordion>
  );
}
