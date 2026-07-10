import { useState } from "react";
import { Plus, Trash2, Shield, ChevronDown, ChevronRight } from "lucide-react";
import { money } from "@/lib/formatters";

export type Clause = {
  number: number;
  section: string;
  clause_text: string;
  is_immutable: boolean;
};

export function ContractEditor({
  isEditable,
  packageSummary,
  setPackageSummary,
  paymentTerms,
  setPaymentTerms,
  customClauses,
  setCustomClauses,
  fixedClauses,
  tripTotal,
  tripCurrency,
  totalPax,
  clientData,
  setClientData,
}: {
  isEditable: boolean;
  packageSummary: string;
  setPackageSummary: (val: string) => void;
  paymentTerms: string;
  setPaymentTerms: (val: string) => void;
  customClauses: Clause[];
  setCustomClauses: (clauses: Clause[]) => void;
  fixedClauses: Clause[];
  tripTotal: number;
  tripCurrency: string;
  totalPax: number;
  clientData: any[];
  setClientData: (data: any[]) => void;
}) {
  const [showClauses, setShowClauses] = useState(false);
  const [editingCustom, setEditingCustom] = useState(false);
  const [newClause, setNewClause] = useState({ section: "", clause_text: "" });

  return (
    <div className="space-y-4">
      {/* Package summary */}
      <div className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold">Resumo do Pacote</h2>
        <textarea
          rows={4}
          readOnly={!isEditable}
          value={packageSummary}
          onChange={(e) => setPackageSummary(e.target.value)}
          placeholder="Descreva o pacote contratado: destino, datas, serviços incluídos…"
          className="w-full rounded-full border border-input bg-surface p-2.5 text-sm outline-none focus:border-border-strong resize-none disabled:opacity-60 text-foreground"
        />
      </div>

      {/* Contratantes */}
      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Contratantes (Pagantes)</h2>
          {isEditable && (
            <button
              onClick={() => {
                setClientData([
                  ...clientData,
                  { name: "", cpf: "", email: "", phone: "", address: "" },
                ]);
              }}
              className="flex items-center gap-1 text-xs text-primary hover:underline font-bold"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar
            </button>
          )}
        </div>
        <div className="space-y-3">
          {clientData.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhum contratante adicionado.</p>
          )}
          {clientData.map((c, i) => (
            <div
              key={i}
              className="flex flex-col gap-2 rounded-full border border-border p-3 bg-surface-alt/10 relative"
            >
              {isEditable && (
                <button
                  onClick={() => setClientData(clientData.filter((_, x) => x !== i))}
                  className="absolute top-2 right-2 text-muted-foreground hover:text-danger p-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <input
                  readOnly={!isEditable}
                  placeholder="Nome Completo"
                  value={c.name || ""}
                  onChange={(e) => {
                    const nd = [...clientData];
                    nd[i].name = e.target.value;
                    setClientData(nd);
                  }}
                  className="w-full h-8 px-2 rounded border border-input bg-surface text-xs outline-none focus:border-border-strong text-foreground disabled:opacity-60"
                />
                <input
                  readOnly={!isEditable}
                  placeholder="CPF / CNPJ / Passaporte"
                  value={c.cpf || c.document || ""}
                  onChange={(e) => {
                    const nd = [...clientData];
                    nd[i].cpf = e.target.value;
                    nd[i].document = e.target.value;
                    setClientData(nd);
                  }}
                  className="w-full h-8 px-2 rounded border border-input bg-surface text-xs outline-none focus:border-border-strong text-foreground disabled:opacity-60"
                />
                <input
                  readOnly={!isEditable}
                  placeholder="Email"
                  value={c.email || ""}
                  onChange={(e) => {
                    const nd = [...clientData];
                    nd[i].email = e.target.value;
                    setClientData(nd);
                  }}
                  className="w-full h-8 px-2 rounded border border-input bg-surface text-xs outline-none focus:border-border-strong text-foreground disabled:opacity-60"
                />
                <input
                  readOnly={!isEditable}
                  placeholder="Telefone"
                  value={c.phone || ""}
                  onChange={(e) => {
                    const nd = [...clientData];
                    nd[i].phone = e.target.value;
                    setClientData(nd);
                  }}
                  className="w-full h-8 px-2 rounded border border-input bg-surface text-xs outline-none focus:border-border-strong text-foreground disabled:opacity-60"
                />
                <input
                  readOnly={!isEditable}
                  placeholder="Endereço"
                  value={c.address || ""}
                  onChange={(e) => {
                    const nd = [...clientData];
                    nd[i].address = e.target.value;
                    setClientData(nd);
                  }}
                  className="col-span-1 md:col-span-2 w-full h-8 px-2 rounded border border-input bg-surface text-xs outline-none focus:border-border-strong text-foreground disabled:opacity-60"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment terms */}
      <div className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold">Condições de Pagamento</h2>
        <div className="mb-3 rounded-full bg-surface-alt px-3 py-2 text-sm">
          <span className="text-muted-foreground">Valor total: </span>
          <span className="font-semibold font-mono text-foreground">
            {money(tripTotal, tripCurrency)}
          </span>
          {totalPax > 0 && (
            <span className="ml-2 text-xs text-muted-foreground">
              · {totalPax} passageiro{totalPax !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <textarea
          rows={3}
          readOnly={!isEditable}
          value={paymentTerms}
          onChange={(e) => setPaymentTerms(e.target.value)}
          placeholder="Ex: 50% na assinatura via Pix, saldo 30 dias antes do embarque…"
          className="w-full rounded-full border border-input bg-surface p-2.5 text-sm outline-none focus:border-border-strong resize-none disabled:opacity-60 text-foreground"
        />
      </div>

      {/* Cláusulas personalizadas */}
      {isEditable && (
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Cláusulas Personalizadas</h2>
            <button
              onClick={() => setEditingCustom(true)}
              className="flex items-center gap-1 text-xs text-primary hover:underline font-bold"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar
            </button>
          </div>

          {customClauses.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Sem cláusulas personalizadas. As cláusulas fixas já estão inclusas.
            </p>
          )}

          <div className="space-y-2">
            {customClauses.map((c, i) => (
              <div
                key={i}
                className="flex gap-2 rounded-full border border-border p-2.5 text-xs bg-surface-alt/10"
              >
                <div className="flex-1">
                  <div className="font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
                    {c.section}
                  </div>
                  <div className="text-foreground">{c.clause_text}</div>
                </div>
                <button
                  onClick={() => setCustomClauses(customClauses.filter((_, x) => x !== i))}
                  className="text-muted-foreground hover:text-danger p-1 shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          {editingCustom && (
            <div className="mt-3 rounded-full border border-border p-3 space-y-2 bg-surface-alt/10">
              <input
                placeholder="Seção (ex: Responsabilidade)"
                value={newClause.section}
                onChange={(e) => setNewClause({ ...newClause, section: e.target.value })}
                className="w-full h-8 px-2 rounded border border-input bg-surface text-xs outline-none focus:border-border-strong text-foreground"
              />
              <textarea
                rows={3}
                placeholder="Texto da cláusula…"
                value={newClause.clause_text}
                onChange={(e) => setNewClause({ ...newClause, clause_text: e.target.value })}
                className="w-full p-2 rounded border border-input bg-surface text-xs outline-none focus:border-border-strong resize-none text-foreground"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (!newClause.section || !newClause.clause_text) return;
                    setCustomClauses([
                      ...customClauses,
                      {
                        number: 50 + customClauses.length,
                        section: newClause.section,
                        clause_text: newClause.clause_text,
                        is_immutable: false,
                      },
                    ]);
                    setNewClause({ section: "", clause_text: "" });
                    setEditingCustom(false);
                  }}
                  className="h-7 rounded bg-brand text-brand-foreground px-3 text-xs font-bold transition-opacity hover:opacity-95"
                >
                  Adicionar
                </button>
                <button
                  onClick={() => {
                    setEditingCustom(false);
                    setNewClause({ section: "", clause_text: "" });
                  }}
                  className="h-7 rounded border border-border bg-surface px-3 text-xs font-bold hover:bg-surface-alt text-foreground"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fixed clauses accordion */}
      <div className="rounded-2xl border border-border bg-surface">
        <button
          onClick={() => setShowClauses(!showClauses)}
          className="flex w-full items-center justify-between px-5 py-3 text-sm font-semibold hover:bg-surface-alt text-foreground"
        >
          <span>Cláusulas Pétreas ({fixedClauses.length} cláusulas — imutáveis)</span>
          {showClauses ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {showClauses && (
          <div className="divide-y divide-border border-t border-border bg-surface-alt/10">
            {fixedClauses.map((c) => (
              <div key={c.number} className="px-5 py-3">
                <div className="mb-0.5 flex items-center gap-2">
                  <span className="font-mono text-[10px] text-muted-foreground">
                    Art. {c.number}
                  </span>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">
                    {c.section}
                  </span>
                  <Shield className="h-3 w-3 text-muted-foreground" />
                </div>
                <p className="text-xs text-foreground leading-relaxed font-medium">
                  {c.clause_text}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
