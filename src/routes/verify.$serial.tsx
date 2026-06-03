import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/verify/$serial")({
  head: ({ params }) => ({
    meta: [
      { title: `Verificação de assinatura ${params.serial} · TravelOS` },
      { name: "description", content: "Validação pública de contrato assinado" },
    ],
  }),
  component: Page,
});

type Row = {
  parties_masked: string; signed_at: string | null; content_hash: string | null;
  signed_hash: string | null; issuer: string; status: string;
};

function mask(name: string) {
  return name.split(/\s+/).map((w) => w.length <= 2 ? w : w[0] + "*".repeat(Math.min(3, w.length - 2)) + (w.length > 3 ? w.slice(-1) : "")).join(" ");
}

function Page() {
  const { serial } = Route.useParams();
  const [row, setRow] = useState<Row | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    supabase.rpc("verify_contract", { _serial: serial }).then(({ data, error }) => {
      if (error) { setErr(error.message); return; }
      const r = (data as Row[])?.[0]; if (!r) setErr("Certificado não encontrado"); else setRow(r);
    });
  }, [serial]);

  return (
    <div className="mx-auto min-h-screen max-w-xl px-6 py-16">
      <div className="rounded-2xl border border-border bg-surface p-8">
        {err && <div className="text-center"><h1 className="text-lg font-semibold">⚠ {err}</h1></div>}
        {!err && !row && <p className="text-center text-sm text-muted-foreground">Verificando…</p>}
        {row && (
          <>
            <div className="text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                ✓ Assinatura verificada
              </div>
              <h1 className="mt-4 text-2xl font-bold tracking-tight">Certificado #{serial}</h1>
              <p className="mt-1 text-sm text-muted-foreground">Emitido por {row.issuer}</p>
            </div>
            <dl className="mt-8 space-y-3 text-sm">
              <Row k="Partes" v={mask(row.parties_masked)} />
              <Row k="Assinado em" v={row.signed_at ? new Date(row.signed_at).toLocaleString("pt-BR") : "—"} />
              <Row k="Status" v={row.status} />
              <Row k="Hash do conteúdo" v={<span className="break-all font-mono text-[11px]">{row.content_hash ?? "—"}</span>} />
              <Row k="Hash da assinatura" v={<span className="break-all font-mono text-[11px]">{row.signed_hash ?? "—"}</span>} />
            </dl>
            <p className="mt-8 text-[11px] text-muted-foreground text-center">Este documento foi assinado digitalmente. O conteúdo completo do contrato não é exibido nesta página por privacidade.</p>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex justify-between gap-4 border-b border-border pb-2"><dt className="text-muted-foreground">{k}</dt><dd className="text-right">{v}</dd></div>;
}
