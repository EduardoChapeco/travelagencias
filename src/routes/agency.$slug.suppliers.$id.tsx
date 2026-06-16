import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  PhoneCall,
  Mail,
  Percent,
  MapPin,
  FileText,
  User,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { PageHeader } from "@/components/shell/PageHeader";
import { StatusBadge, GhostButton } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/agency/$slug/suppliers/$id")({
  head: () => ({ meta: [{ title: "Detalhes do Fornecedor · TravelOS" }] }),
  component: SupplierDetailsPage,
});

function SupplierDetailsPage() {
  const { agency } = useAgency();
  const { slug, id } = Route.useParams();

  const { data: supplier, isLoading } = useQuery({
    enabled: !!agency,
    queryKey: ["supplier", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!supplier) {
    return <div className="p-8 text-center text-muted-foreground">Fornecedor não encontrado.</div>;
  }

  return (
    <div className="pb-20">
      <Link
        to="/agency/$slug/suppliers"
        params={{ slug }}
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar para Fornecedores
      </Link>

      <PageHeader
        title={supplier.name}
        description={supplier.legal_name || "Detalhes operacionais"}
        actions={
          <StatusBadge tone={supplier.is_active ? "success" : "neutral"}>
            {supplier.is_active ? "Ativo" : "Inativo"}
          </StatusBadge>
        }
      />

      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main Content Area */}
        <div className="space-y-6">
          <Tabs defaultValue="geral" className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent p-0 overflow-x-auto no-scrollbar flex-nowrap flex shrink-0">
              <TabsTrigger
                value="geral"
                className="relative rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 text-sm font-semibold text-muted-foreground shadow-none data-[state=active]:border-brand data-[state=active]:text-foreground data-[state=active]:shadow-none shrink-0 cursor-pointer"
              >
                Geral
              </TabsTrigger>
              <TabsTrigger
                value="contatos"
                className="relative rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 text-sm font-semibold text-muted-foreground shadow-none data-[state=active]:border-brand data-[state=active]:text-foreground data-[state=active]:shadow-none shrink-0 cursor-pointer"
              >
                Contatos & SLA
              </TabsTrigger>
              <TabsTrigger
                value="contratos"
                className="relative rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 text-sm font-semibold text-muted-foreground shadow-none data-[state=active]:border-brand data-[state=active]:text-foreground data-[state=active]:shadow-none shrink-0 cursor-pointer"
              >
                Contratos & Arquivos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="geral" className="mt-6 space-y-6">
              <div className="rounded-xl border border-border bg-surface p-6">
                <h3 className="mb-4 font-semibold">Informações da Empresa</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Razão Social</div>
                    <div className="font-medium text-sm mt-1">{supplier.legal_name || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Categoria</div>
                    <div className="font-medium text-sm mt-1 uppercase text-brand tracking-widest">
                      {supplier.kind}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Documento (CNPJ/Tax ID)</div>
                    <div className="font-medium font-mono text-sm mt-1">
                      {supplier.document || "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Site / Portal B2B</div>
                    <div className="font-medium text-sm mt-1">
                      {supplier.website ? (
                        <a
                          href={supplier.website}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-500 hover:underline"
                        >
                          Acessar portal
                        </a>
                      ) : (
                        "—"
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="contatos" className="mt-6">
              <div className="rounded-xl border border-border bg-surface p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">Contatos Operacionais</h3>
                  <GhostButton className="h-8 text-xs">Adicionar Contato</GhostButton>
                </div>
                <div className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-lg">
                  Nenhum contato secundário cadastrado.
                </div>
              </div>
            </TabsContent>

            <TabsContent value="contratos" className="mt-6">
              <div className="rounded-xl border border-border bg-surface p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">Arquivos & Políticas</h3>
                  <GhostButton className="h-8 text-xs">Fazer Upload</GhostButton>
                </div>
                <div className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-lg">
                  Nenhum arquivo anexado (ex: Acordo de serviço, tabela tarifária).
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-brand/5 p-6 border-brand/20">
            <div className="flex items-center gap-2 mb-2 text-brand font-bold text-xs uppercase tracking-widest">
              <Percent className="h-4 w-4" /> Markup / Comissão
            </div>
            <div className="text-3xl font-bold text-foreground">
              {Number(supplier.commission_rate).toFixed(2)}%
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Esta comissão será calculada automaticamente na criação de orçamentos e faturamentos
              ao escolher este fornecedor.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-6">
            <h3 className="mb-4 font-semibold text-sm">Acesso Rápido</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="bg-surface-alt p-2 rounded-full">
                  <PhoneCall className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Telefone B2B</div>
                  <div className="text-sm font-medium">{supplier.phone || "—"}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-surface-alt p-2 rounded-full">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">E-mail Operacional</div>
                  <div
                    className="text-sm font-medium truncate max-w-[200px]"
                    title={supplier.email || ""}
                  >
                    {supplier.email || "—"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
