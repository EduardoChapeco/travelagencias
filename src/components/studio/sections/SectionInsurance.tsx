import { type Proposal } from "@/services/proposals";
import { Accordion, L, Inp, SMALL_INPUT } from "@/components/proposals/ProposalFormFields";

interface Props {
  draft: Proposal;
  save: (patch: Partial<Proposal>) => void;
}

type Insurance = { provider: string; policy: string; coverage: string; phone: string; price?: number };

export function SectionInsurance({ draft, save }: Props) {
  const ins: Insurance = (draft as any).insurance ?? {
    provider: "",
    policy: "",
    coverage: "",
    phone: "",
  };

  function upd(patch: Partial<Insurance>) {
    save({ insurance: { ...ins, ...patch } } as any);
  }

  return (
    <Accordion title="Seguro Viagem">
      <div className="space-y-2">
        <L label="Seguradora">
          <Inp value={ins.provider} onChange={(v) => upd({ provider: v })} ph="ex. Assist Card" />
        </L>
        <L label="Nº da Apólice">
          <Inp value={ins.policy} onChange={(v) => upd({ policy: v })} ph="ex. AC-12345678" />
        </L>
        <L label="Cobertura">
          <Inp
            value={ins.coverage}
            onChange={(v) => upd({ coverage: v })}
            ph="ex. Emergência médica USD 30.000"
          />
        </L>
        <L label="Telefone de Acionamento">
          <Inp value={ins.phone} onChange={(v) => upd({ phone: v })} ph="ex. +0800-xxx-xxxx" />
        </L>
        <L label="Valor / Preço">
          <Inp
            value={ins.price?.toString() || ""}
            onChange={(v) => upd({ price: parseFloat(v) || 0 })}
            ph="ex. 150.00"
            type="number"
          />
        </L>
      </div>
    </Accordion>
  );
}
