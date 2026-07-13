import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Scale, Mail, Calendar, Building2 } from "lucide-react";

// @ts-ignore: Route path may not be regenerated in routeTree yet
export const Route = (createFileRoute as any)("/terms")({
  head: () => ({
    meta: [
      { title: "Termos de Uso · Turis" },
      { name: "description", content: "Termos e condições de uso da plataforma Turis." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  const { data: document, isLoading } = useQuery({
    queryKey: ["policy-document", "terms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("policy_documents")
        .select("*")
        .eq("kind", "terms")
        .eq("is_published", true)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-border glass-card border-none py-4 px-6 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-brand" />
            <span className="font-bold text-sm tracking-tight text-foreground">Turis Portal</span>
          </div>
          <span className="text-xs text-muted-foreground">Compliance & Termos</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl mx-auto py-12 px-6 w-full">
        <div className="space-y-8">
          <div>
            <span className="ds-meta font-bold text-brand uppercase tracking-wider bg-brand/10 px-2 py-1 rounded">
              Contrato de Adesão Digital
            </span>
            <h1 className="text-3xl font-black text-foreground mt-3 tracking-tight">Termos de Uso</h1>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Estes Termos de Uso regulam o acesso e utilização da plataforma Turis. Ao acessar o sistema, você declara estar ciente e de acordo com as regras estabelecidas.
            </p>
          </div>

          <hr className="border-border/60" />

          {isLoading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Carregando termos de uso...
            </div>
          ) : document?.content_md ? (
            <div className="prose prose-sm dark:prose-invert max-w-none text-sm text-foreground/90 leading-relaxed space-y-4">
              {document.content_md.split("\n\n").map((paragraph: string, i: number) => {
                if (paragraph.startsWith("#")) {
                  return (
                    <h2 key={i} className="text-lg font-bold text-foreground mt-6 mb-2">
                      {paragraph.replace(/#/g, "").trim()}
                    </h2>
                  );
                }
                return <p key={i}>{paragraph}</p>;
              })}
            </div>
          ) : (
            <div className="space-y-6 text-sm text-foreground/80 leading-relaxed">
              <h2 className="text-base font-bold text-foreground">1. Aceite dos Termos</h2>
              <p>
                O uso dos serviços da plataforma Turis implica no aceite irrestrito destes Termos de Uso e da Política de Privacidade. Caso discorde de qualquer cláusula, você deve suspender a utilização imediatamente.
              </p>

              <h2 className="text-base font-bold text-foreground">2. Integrações de Terceiros e Meta APIs</h2>
              <p>
                O Turis provê facilidades de integração com serviços externos, como a API Oficial do WhatsApp e o Instagram Business. A agência usuária declara-se ciente de que o funcionamento destas integrações está sujeito às políticas, limites de requisição e disponibilidade das próprias empresas fornecedoras destes serviços (Meta Platforms Inc.), eximindo a plataforma de responsabilidade por instabilidades na infraestrutura alheia.
              </p>

              <h2 className="text-base font-bold text-foreground">3. Uso Aceitável do Inbox</h2>
              <p>
                As funcionalidades de envio de mensagens no Inbox destinam-se exclusivamente para suporte, atendimento e comunicação transacional legítima com clientes que concederam consentimento explícito. O disparo de campanhas massivas de spam ou qualquer violação das Diretrizes Comerciais da Meta pode ensejar a suspensão imediata da integração e da conta da agência.
              </p>

              <h2 className="text-base font-bold text-foreground">4. Limitação de Responsabilidade</h2>
              <p>
                O Turis é provido no estado em que se encontra, não garantindo que o sistema operará livre de pequenas interrupções temporárias ou bugs decorrentes de atualizações de navegadores ou APIs de parceiros terceiros.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border glass bg-white/5 border-white/10/20 py-6 px-6 text-center text-xs text-muted-foreground shrink-0">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            <span>Turis © 2026</span>
          </div>
          <div className="flex gap-4">
            <a href="/privacy" className="hover:underline">Privacidade</a>
            <a href="/data-deletion" className="hover:underline">Exclusão de Dados</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
