import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Field, Input, Select, PrimaryButton } from "@/components/ui/form";

export const Route = createFileRoute("/m/payment/$token")({
  head: () => ({ meta: [{ title: "Pagamento · TravelOS" }] }),
  component: Page,
});

type Row = {
  id: string; description: string | null; amount: number; currency: string;
  due_date: string | null; status: string;
  agency_name: string; agency_logo: string | null; trip_title: string | null;
};

function Page() {
  const { token } = Route.useParams();
  const [row, setRow] = useState<Row | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [method, setMethod] = useState("pix");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [proof, setProof] = useState("");

  useEffect(() => {
    supabase.rpc("public_payment_by_token", { _token: token }).then(({ data, error }) => {
      if (error) { setErr(error.message); return; }
      const r = (data as Row[])?.[0]; if (!r) { setErr("Pagamento não encontrado"); return; }
      setRow(r); if (r.status === "confirmed") setDone(true);
    });
  }, [token]);

  async function confirm() {
    setBusy(true);
    const { error } = await supabase.rpc("confirm_payment_with_token", {
      _token: token, _payment_method: method, _receipt_url: proof || "",
    });
    setBusy(false);
    if (error) toast.error(error.message); else { toast.success("Pagamento registrado"); setDone(true); }
  }

  if (err) return <Center><h1 className="text-lg font-semibold">{err}</h1></Center>;
  if (!row) return <Center><p className="text-sm text-muted-foreground">Carregando…</p></Center>;

  const fmt = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: row.currency }).format(n || 0);

  return (
    <div className="mx-auto min-h-screen max-w-md px-4 py-10">
      <header className="mb-6 flex items-center gap-3">
        {row.agency_logo && <img src={row.agency_logo} alt={row.agency_name} className="h-10 w-10 rounded object-cover" />}
        <div>
          <div className="text-xs text-muted-foreground">{row.agency_name}</div>
          <h1 className="text-lg font-semibold tracking-tight">Pagamento</h1>
        </div>
      </header>
      <div className="rounded-lg border border-border bg-surface p-5">
        <div className="text-xs text-muted-foreground">{row.trip_title}</div>
        <div className="mt-1 text-sm">{row.description}</div>
        <div className="mt-4 text-3xl font-semibold tracking-tight">{fmt(Number(row.amount))}</div>
        {row.due_date && <div className="text-xs text-muted-foreground">Vencimento: {new Date(row.due_date).toLocaleDateString("pt-BR")}</div>}
      </div>
      {done ? (
        <div className="mt-6 rounded-lg border border-emerald-300 bg-emerald-50 p-6 text-center text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
          ✓ Pagamento confirmado. Obrigado!
        </div>
      ) : (
        <div className="mt-6 space-y-3 rounded-lg border border-border bg-surface p-5">
          <Field label="Forma de pagamento">
            <Select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="pix">Pix</option>
              <option value="card">Cartão</option>
              <option value="bank_transfer">Transferência</option>
              <option value="boleto">Boleto</option>
              <option value="cash">Dinheiro</option>
            </Select>
          </Field>
          <Field label="Link do comprovante (opcional)"><Input value={proof} onChange={(e) => setProof(e.target.value)} placeholder="https://…" /></Field>
          <PrimaryButton disabled={busy} onClick={confirm} className="w-full">{busy ? "Confirmando…" : "Confirmar pagamento"}</PrimaryButton>
          <p className="text-[11px] text-muted-foreground">Ao confirmar, a agência será notificada da quitação. Comprovantes oficiais podem ser solicitados.</p>
        </div>
      )}
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center bg-background p-6"><div className="rounded-lg border border-border bg-surface p-8 text-center">{children}</div></div>;
}
