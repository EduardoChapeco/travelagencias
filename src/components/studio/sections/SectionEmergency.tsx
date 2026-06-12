import { type Proposal } from "@/services/proposals";
import { Accordion, L, Inp, AddBtn, SMALL_INPUT } from "@/components/proposals/ProposalFormFields";
import { Trash2 } from "lucide-react";

interface Props {
  draft: Proposal;
  save: (patch: Partial<Proposal>) => void;
}

type EmergencyContact = { name: string; category: string; phone: string };

export function SectionEmergency({ draft, save }: Props) {
  const contacts: EmergencyContact[] = (draft as any).emergency_contacts ?? [];

  function add() {
    save({ emergency_contacts: [...contacts, { name: "", category: "Hotel", phone: "" }] } as any);
  }

  function upd(i: number, patch: Partial<EmergencyContact>) {
    const arr = contacts.map((c, idx) => (idx === i ? { ...c, ...patch } : c));
    save({ emergency_contacts: arr } as any);
  }

  function remove(i: number) {
    save({ emergency_contacts: contacts.filter((_, x) => x !== i) } as any);
  }

  return (
    <Accordion title={`Contatos de Emergência (${contacts.length})`}>
      <div className="space-y-2 mb-3">
        {contacts.map((c, i) => (
          <div key={i} className="rounded-xl border border-border/60 bg-surface-alt/20 p-3">
            <div className="flex items-start gap-2">
              <div className="flex-1 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <L label="Nome / Empresa">
                    <Inp value={c.name} onChange={(v) => upd(i, { name: v })} ph="ex. Hotel XYZ" />
                  </L>
                  <L label="Categoria">
                    <select
                      className={SMALL_INPUT}
                      value={c.category}
                      onChange={(e) => upd(i, { category: e.target.value })}
                    >
                      <option value="Hotel">Hotel</option>
                      <option value="Receptivo">Receptivo</option>
                      <option value="Ambulância">Ambulância</option>
                      <option value="Seguro">Seguro</option>
                      <option value="Cônsulado">Cônsulado</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </L>
                </div>
                <L label="Telefone">
                  <Inp value={c.phone} onChange={(v) => upd(i, { phone: v })} ph="+55 49..." />
                </L>
              </div>
              <button
                type="button"
                onClick={() => remove(i)}
                className="mt-4 rounded p-1 text-muted-foreground hover:text-danger transition-colors shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <AddBtn onClick={add}>Adicionar contato</AddBtn>
    </Accordion>
  );
}
