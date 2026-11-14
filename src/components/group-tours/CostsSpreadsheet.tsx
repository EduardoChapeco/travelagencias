import React, { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/formatters";
import { Plus, Trash2, Check, X, Calculator } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface Cost {
  id: string;
  description: string;
  type: string;
  amount: number;
}

export function CostsSpreadsheet({
  tourId,
  agencyId,
  initialCosts,
  paxCount,
  onTotalsChange,
}: {
  tourId: string;
  agencyId: string;
  initialCosts: Cost[];
  paxCount: number;
  onTotalsChange?: (fixed: number, variable: number) => void;
}) {
  const qc = useQueryClient();
  const [costs, setCosts] = useState<Cost[]>(initialCosts || []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Cost>>({});

  useEffect(() => {
    setCosts(initialCosts || []);
  }, [initialCosts]);

  useEffect(() => {
    let fixed = 0;
    let variable = 0;
    costs.forEach((c) => {
      if (c.type === "fixed") fixed += Number(c.amount);
      else variable += Number(c.amount) * paxCount;
    });
    if (onTotalsChange) onTotalsChange(fixed, variable);
  }, [costs, paxCount]);

  const upsertMut = useMutation({
    mutationFn: async (payload: Partial<Cost>) => {
      if (payload.id && payload.id.startsWith("temp-")) {
        const { id, ...rest } = payload;
        const { error } = await supabase.from("group_tour_costs").insert({
          description: rest.description || "Custo operacional",
          amount: rest.amount || 0,
          type: rest.type || "fixed",
          group_tour_id: tourId,
          agency_id: agencyId,
        } as any);
        if (error) throw error;
      } else {
        const { id, ...rest } = payload;
        if (!id) return;
        const { error } = await supabase
          .from("group_tour_costs")
          .update(rest as any)
          .eq("id", id)
          .eq("group_tour_id", tourId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["group-tour-costs", tourId] });
      setEditingId(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      if (id.startsWith("temp-")) return;
      const { error } = await supabase.from("group_tour_costs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["group-tour-costs", tourId] });
    },
  });

  const handleEdit = (c: Cost) => {
    setEditingId(c.id);
    setEditForm(c);
  };

  const handleSave = () => {
    if (!editForm.description || !editForm.amount) return;
    setCosts((prev) =>
      prev.map((p) => (p.id === editingId ? { ...p, ...editForm } as Cost : p))
    );
    upsertMut.mutate(editForm as Cost);
  };

  const handleAdd = () => {
    const newCost: Cost = {
      id: `temp-${Date.now()}`,
      description: "",
      type: "fixed",
      amount: 0,
    };
    setCosts([...costs, newCost]);
    setEditingId(newCost.id);
    setEditForm(newCost);
  };

  const handleDelete = (id: string) => {
    setCosts((prev) => prev.filter((p) => p.id !== id));
    deleteMut.mutate(id);
  };

  const totalFixed = costs.filter(c => c.type === 'fixed').reduce((acc, c) => acc + Number(c.amount), 0);
  const totalVar = costs.filter(c => c.type !== 'fixed').reduce((acc, c) => acc + (Number(c.amount) * paxCount), 0);

  return (
    <div className="bg-white border border-border rounded-[var(--radius-card)] overflow-hidden flex flex-col font-sans shadow-sm">
      <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Planejamento e Custos (Live)</h3>
        </div>
        <Button onClick={handleAdd} size="sm" variant="outline" className="h-7 text-xs font-bold gap-1">
          <Plus className="w-3.5 h-3.5" /> Adicionar Linha
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/50 border-b border-border text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
              <th className="py-2.5 px-4 font-semibold">Descrição</th>
              <th className="py-2.5 px-4 font-semibold w-[120px]">Tipo</th>
              <th className="py-2.5 px-4 font-semibold w-[150px] text-right">Valor Unit.</th>
              <th className="py-2.5 px-4 font-semibold w-[150px] text-right">Cálculo x Pax</th>
              <th className="py-2.5 px-4 w-[80px]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-sm">
            {costs.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted-foreground text-xs italic">
                  Nenhum custo lançado. Adicione linhas para simular a viabilidade do grupo.
                </td>
              </tr>
            )}
            {costs.map((c) => {
              const isEditing = editingId === c.id;
              const calculatedTotal = c.type === "fixed" ? Number(c.amount) : Number(c.amount) * paxCount;

              if (isEditing) {
                return (
                  <tr key={c.id} className="bg-accent/30">
                    <td className="p-2">
                      <Input
                        autoFocus
                        value={editForm.description || ""}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        className="h-8 text-xs font-medium border-border"
                        placeholder="Ex: Ônibus Leito"
                        onKeyDown={(e) => e.key === "Enter" && handleSave()}
                      />
                    </td>
                    <td className="p-2">
                      <select
                        className="w-full h-8 text-xs border border-border rounded-[var(--radius-card)] px-2 bg-background focus:ring-1 focus:ring-brand outline-none"
                        value={editForm.type || "fixed"}
                        onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                      >
                        <option value="fixed">Custo Fixo</option>
                        <option value="per_pax">Por Pax</option>
                      </select>
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        value={editForm.amount || ""}
                        onChange={(e) => setEditForm({ ...editForm, amount: Number(e.target.value) })}
                        className="h-8 text-xs text-right font-mono border-border"
                        onKeyDown={(e) => e.key === "Enter" && handleSave()}
                      />
                    </td>
                    <td className="p-2 text-right font-mono text-xs text-muted-foreground bg-muted/20">
                      Auto
                    </td>
                    <td className="p-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={handleSave} className="h-7 w-7 text-green-600 hover:bg-green-50">
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setEditingId(null)} className="h-7 w-7 text-red-600 hover:bg-red-50">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={c.id} className="hover:bg-muted/30 group transition-colors cursor-pointer" onClick={() => handleEdit(c)}>
                  <td className="py-3 px-4 font-medium text-foreground">{c.description}</td>
                  <td className="py-3 px-4">
                    <span className="ds-meta text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-semibold">
                      {c.type === "fixed" ? "Custo Fixo" : "Por Pax"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                    {formatCurrency(Number(c.amount))}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-foreground">
                    {formatCurrency(calculatedTotal)}
                  </td>
                  <td className="py-3 px-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(c.id);
                      }}
                      className="h-6 w-6 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-muted/30 border-t border-border">
            <tr>
              <td colSpan={3} className="py-3 px-4 text-right font-semibold text-xs text-muted-foreground uppercase">
                Soma de Custos Projetados
              </td>
              <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">
                {formatCurrency(totalFixed + totalVar)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
