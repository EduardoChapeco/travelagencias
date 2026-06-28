import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, Mail, Calendar, Building2 } from "lucide-react";

// @ts-ignore: Route path may not be regenerated in routeTree yet
export const Route = (createFileRoute as any)("/privacy")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade · TravelOS" },
      { name: "description", content: "Política de Privacidade e Termos de LGPD da plataforma TravelOS." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const { data: document, isLoading } = useQuery({
    queryKey: ["policy-document", "privacy"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("policy_documents")
        .select("*")
        .eq("kind", "privacy")
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
      <header className="border-b border-border bg-surface py-4 px-6 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand" />
            <span className="font-bold text-sm tracking-tight text-foreground">TravelOS Portal</span>
          </div>
          <span className="text-xs text-muted-foreground">Compliance & Privacidade</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl mx-auto py-12 px-6 w-full">
        <div className="space-y-8">
          <div>
            <span className="text-[10px] font-bold text-brand uppercase tracking-wider bg-brand/10 px-2 py-1 rounded">
              LGPD / GDPR Compliance
            </span>
            <h1 className="text-3xl font-black text-foreground mt-3 tracking-tight">Política de Privacidade</h1>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Esta política descreve as regras e diretrizes adotadas pelo TravelOS para a coleta, uso, armazenamento, proteção e eliminação de informações pessoais de usuários, clientes e parceiros integrados.
            </p>
          </div>

          <hr className="border-border/60" />

          {isLoading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Carregando termos de privacidade...
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
              <h2 className="text-base font-bold text-foreground">1. Coleta de Informações via Integrações</h2>
              <p>
                O TravelOS integra-se com a WhatsApp Business Cloud API e Instagram Professional Messaging para viabilizar o gerenciamento centralizado de mensagens. Ao conectar seus canais, coletamos e processamos o conteúdo das conversas, mídia anexada, ID de usuário da rede social e informações de perfil com o único intuito de disponibilizar a Caixa de Entrada da agência.
              </p>

              <h2 className="text-base font-bold text-foreground">2. Uso e Compartilhamento de Dados</h2>
              <p>
                Os dados coletados são tratados exclusivamente dentro do contexto do contrato de prestação de serviços com a agência de viagens licenciada. Não compartilhamos, vendemos ou alugamos informações com terceiros para fins publicitários ou mercadológicos.
              </p>

              <h2 className="text-base font-bold text-foreground">3. Proteção e Segurança</h2>
              <p>
                Todas as chaves de acesso e segredos de APIs da Meta são armazenados com criptografia de ponta no banco de dados e são acessados apenas pelo backend seguro das Edge Functions do Supabase, não sendo expostos para clientes web ou operadores da agência.
              </p>

              <h2 className="text-base font-bold text-foreground">4. Direitos e Exclusão</h2>
              <p>
                Qualquer titular de dados pode solicitar a exclusão de suas conversas e dados cadastrais da plataforma a qualquer momento através do canal oficial de suporte ou enviando uma solicitação em nossa página pública de exclusão.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-surface-alt/20 py-6 px-6 text-center text-xs text-muted-foreground shrink-0">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            <span>TravelOS © 2026</span>
          </div>
          <div className="flex gap-4">
            <a href="/terms" className="hover:underline">Termos de Uso</a>
            <a href="/data-deletion" className="hover:underline">Exclusão de Dados</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
