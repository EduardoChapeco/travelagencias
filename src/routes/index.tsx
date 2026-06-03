import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TravelOS — Plataforma SaaS para Agências de Viagens" },
      {
        name: "description",
        content:
          "CRM, propostas, contratos, embarques e financeiro em um único workspace minimalista para agências de viagens.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const links: Array<{ label: string; to: string }> = [
    { label: "Dashboard da agência", to: "/agency/demo" },
    { label: "CRM Kanban", to: "/agency/demo/crm" },
    { label: "Cotações", to: "/agency/demo/proposals" },
    { label: "Embarques", to: "/agency/demo/boarding" },
    { label: "Portal do cliente", to: "/client" },
    { label: "Admin global", to: "/admin" },
    { label: "Entrar", to: "/auth/login" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-6 py-16">
        <header className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-bold">
            T
          </div>
          <span className="text-sm font-semibold tracking-tight">TravelOS</span>
        </header>

        <main className="flex-1 py-16">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            v1.0.0 · Shell + Design System
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
            Plataforma única para a operação<br />de agências de viagens.
          </h1>
          <p className="mt-4 max-w-xl text-sm text-muted-foreground">
            CRM, propostas, contratos digitais, vouchers, embarques, portal do cliente e
            financeiro — sem sombras decorativas, sem distrações.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="group flex items-center justify-between rounded-md border border-border bg-surface px-4 py-3 text-sm transition-colors hover:border-border-strong"
              >
                <span className="font-medium">{l.label}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </main>

        <footer className="border-t border-border pt-6 text-xs text-muted-foreground">
          travelos.app · Excelência Tour · Chapecó/SC
        </footer>
      </div>
    </div>
  );
}
