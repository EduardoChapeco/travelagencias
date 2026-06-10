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
  parties_masked: string;
  signed_at: string | null;
  content_hash: string | null;
  signed_hash: string | null;
  issuer: string;
  status: string;
};

function mask(name: string) {
  return name
    .split(/\s+/)
    .map((w) =>
      w.length <= 2
        ? w
        : w[0] + "*".repeat(Math.min(3, w.length - 2)) + (w.length > 3 ? w.slice(-1) : ""),
    )
    .join(" ");
}

function Page() {
  const { serial } = Route.useParams();
  const [row, setRow] = useState<Row | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    // @ts-expect-error Tipagem pendente de atualização no types.ts
    supabase
      .rpc("verify_contract", { _serial: serial as string })
      .then(({ data, error }: { data: any; error: any }) => {
        if (error) {
          setErr(error.message);
          return;
        }
        const r = (data as Row[])?.[0];
        if (!r) setErr("Certificado não encontrado");
        else setRow(r);
      });
  }, [serial]);

  return (
    <div className="mx-auto min-h-screen max-w-xl px-4 py-12 md:py-20">
      <div className="overflow-hidden rounded-2xl bg-surface  ring-1 ring-border/50">
        <div className="border-b border-border/50 bg-surface-alt/30 px-6 py-4 text-center">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Sistema de Autenticidade TravelOS
          </h2>
        </div>
        <div className="p-8">
          {err && (
            <div className="text-center text-danger">
              <h1 className="text-sm font-bold uppercase tracking-widest">⚠ {err}</h1>
            </div>
          )}
          {!err && !row && (
            <p className="text-center text-sm font-medium text-muted-foreground animate-pulse">
              Consultando a cadeia de custódia…
            </p>
          )}
          {row && (
            <>
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/20 text-success">
                  <svg
                    className="h-8 w-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-success">
                  Assinatura Chancelada
                </div>
                <h1 className="mt-5 font-mono text-xl font-bold tracking-tight text-foreground">
                  #{serial}
                </h1>
                <p className="mt-1 text-xs font-medium text-muted-foreground">
                  Emitido por {row.issuer}
                </p>
              </div>
              <div className="mt-8 overflow-hidden rounded-xl border border-border/50 bg-surface-alt/20">
                <dl className="divide-y divide-border/50 text-xs">
                  <Row k="Partes Envolvidas" v={mask(row.parties_masked)} />
                  <Row
                    k="Data da Assinatura"
                    v={row.signed_at ? new Date(row.signed_at).toLocaleString("pt-BR") : "—"}
                  />
                  <Row
                    k="Status Legal"
                    v={
                      <span className="font-semibold uppercase tracking-wider text-success">
                        {row.status}
                      </span>
                    }
                  />
                  <Row
                    k="Hash Criptográfico (Conteúdo)"
                    v={
                      <span className="break-all font-mono text-[10px] text-muted-foreground">
                        {row.content_hash ?? "—"}
                      </span>
                    }
                  />
                  <Row
                    k="Hash Criptográfico (Assinatura)"
                    v={
                      <span className="break-all font-mono text-[10px] text-muted-foreground">
                        {row.signed_hash ?? "—"}
                      </span>
                    }
                  />
                </dl>
              </div>
              <div className="mt-6 rounded-lg bg-warning-bg/50 px-4 py-3 text-center">
                <p className="text-[10px] font-medium leading-relaxed text-warning-text/80">
                  Este documento foi assinado digitalmente e possui validade jurídica garantida por
                  geolocalização, biometria e IP. O conteúdo completo do contrato está selado por
                  motivos de privacidade.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
      <dt className="font-semibold text-muted-foreground">{k}</dt>
      <dd className="text-right font-medium text-foreground">{v}</dd>
    </div>
  );
}
