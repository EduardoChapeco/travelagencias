import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, Search, ArrowRight, ShieldAlert, Loader2, CheckCircle2 } from "lucide-react";
import { Field, Input, Select, PrimaryButton } from "@/components/ui/form";

// @ts-ignore: Route path may not be regenerated in routeTree yet
export const Route = (createFileRoute as any)("/data-deletion")({
  head: () => ({
    meta: [
      { title: "Exclusão de Dados · Turis" },
      { name: "description", content: "Solicite a exclusão dos seus dados da plataforma Turis." },
    ],
  }),
  component: DataDeletionPage,
});

function DataDeletionPage() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("Exclusão de conta Meta vinculada");
  const [protocolCode, setProtocolCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [searchProtocol, setSearchProtocol] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<any | null>(null);

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Por favor, informe seu e-mail.");
      return;
    }
    setSubmitting(true);
    try {
      const generatedProtocol = "DEL-" + Math.random().toString(36).substring(2, 9).toUpperCase();
      
      const { error } = await (supabase as any).from("data_subject_requests").insert({
        request_type: "deletion",
        status: "received",
        protocol_code: generatedProtocol,
        rejection_reason: reason,
      });

      if (error) throw error;

      setProtocolCode(generatedProtocol);
      toast.success("Solicitação recebida com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao registrar solicitação: " + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleQuery(e: React.FormEvent) {
    e.preventDefault();
    if (!searchProtocol.trim()) return;
    setSearching(true);
    setSearchResult(null);
    try {
      const { data, error } = await (supabase as any)
        .from("data_subject_requests")
        .select("protocol_code, status, created_at, rejection_reason")
        .eq("protocol_code", searchProtocol.trim().toUpperCase())
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast.error("Protocolo não localizado.");
      } else {
        setSearchResult(data);
      }
    } catch (err: any) {
      toast.error("Erro ao buscar protocolo: " + err.message);
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-border bg-surface py-4 px-6 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            <span className="font-bold text-sm tracking-tight text-foreground">Turis Portal</span>
          </div>
          <span className="text-xs text-muted-foreground">LGPD & Compliance</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl mx-auto py-12 px-6 w-full grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Side: Submit Request */}
        <div className="space-y-6 bg-surface border border-border rounded-[var(--radius-card)] p-6">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-brand" />
            <h2 className="text-base font-bold text-foreground">Solicitar Nova Exclusão</h2>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            De acordo com a Lei Geral de Proteção de Dados (LGPD), você pode solicitar a eliminação dos seus dados integrados a qualquer momento.
          </p>

          {protocolCode ? (
            <div className="bg-success/5 border border-success/30 rounded-2xl p-5 text-center space-y-3">
              <CheckCircle2 className="h-8 w-8 text-success mx-auto" />
              <h3 className="text-sm font-bold text-success">Solicitação Registrada!</h3>
              <p className="text-xs text-muted-foreground">Guarde o código de protocolo abaixo para acompanhar sua solicitação:</p>
              <div className="text-base font-mono font-bold bg-surface border border-border px-3 py-2 rounded text-foreground inline-block select-all">
                {protocolCode}
              </div>
            </div>
          ) : (
            <form onSubmit={handleRequest} className="space-y-4">
              <Field label="E-mail de Cadastro *">
                <Input
                  type="email"
                  required
                  placeholder="ex: cliente@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>

              <Field label="Telefone / WhatsApp">
                <Input
                  type="tel"
                  placeholder="ex: (11) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </Field>

              <Field label="Motivo da Solicitação">
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full text-xs bg-surface-alt border border-border/60 rounded-[var(--radius-card)] px-4 py-2.5 resize-none focus:ring-0 focus:border-brand/50 font-sans text-foreground"
                />
              </Field>

              <PrimaryButton disabled={submitting} className="w-full h-9">
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirmar Solicitação de Exclusão"}
              </PrimaryButton>
            </form>
          )}
        </div>

        {/* Right Side: Track Request */}
        <div className="space-y-6 bg-surface border border-border rounded-[var(--radius-card)] p-6 h-fit">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-brand" />
            <h2 className="text-base font-bold text-foreground">Acompanhar Protocolo</h2>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Consulte o andamento da sua solicitação de exclusão de dados pessoais da nossa plataforma.
          </p>

          <form onSubmit={handleQuery} className="flex gap-2">
            <input
              type="text"
              placeholder="Digite o código DEL-XXXX..."
              value={searchProtocol}
              onChange={(e) => setSearchProtocol(e.target.value)}
              className="flex-1 h-9 px-3 rounded-2xl border border-border text-xs focus:outline-none focus:ring-1 focus:ring-brand bg-surface text-foreground placeholder-muted-foreground font-mono"
            />
            <PrimaryButton disabled={searching} className="h-9 px-4 shrink-0">
              {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            </PrimaryButton>
          </form>

          {searchResult && (
            <div className="border border-border bg-surface-alt/20 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-border/60">
                <span className="font-semibold text-muted-foreground">Protocolo:</span>
                <span className="font-mono font-bold text-foreground">{searchResult.protocol_code}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-muted-foreground">Status da Solicitação:</span>
                <span className="font-bold text-brand uppercase tracking-wider text-[10px] bg-brand/10 px-2 py-0.5 rounded">
                  {searchResult.status}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-muted-foreground">Data de Solicitação:</span>
                <span className="text-foreground">{new Date(searchResult.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-surface-alt/20 py-6 px-6 text-center text-xs text-muted-foreground shrink-0">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span>Turis © 2026</span>
          </div>
          <div className="flex gap-4">
            <a href="/privacy" className="hover:underline">Privacidade</a>
            <a href="/terms" className="hover:underline">Termos de Uso</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
