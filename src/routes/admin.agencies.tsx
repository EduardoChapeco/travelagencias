import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, queryOptions } from "@tanstack/react-query";
import { fetchAdminAgencies, createAgencyAndInvite } from "@/services/admin";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import { fmtDate } from "@/components/ui/form";

import { useState } from "react";
import { Plus, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const agenciesQueryOptions = queryOptions({
  queryKey: ["admin-agencies"],
  queryFn: fetchAdminAgencies,
});

export const Route = createFileRoute("/admin/agencies")({
  head: () => ({ meta: [{ title: "Agências · Admin" }] }),
  loader: async ({ context: { queryClient } }) => {
    return queryClient.ensureQueryData(agenciesQueryOptions);
  },
  component: Page,
});

const agencySchema = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  slug: z
    .string()
    .min(3, "Slug deve ter no mínimo 3 caracteres")
    .regex(/^[a-z0-9-]+$/, "Apenas letras minúsculas, números e hifens permitidos"),
  email: z.string().email("E-mail inválido"),
  cnpj: z.string().optional(),
  phone: z.string().optional(),
});

type AgencyForm = z.infer<typeof agencySchema>;

function Page() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AgencyForm>({
    resolver: zodResolver(agencySchema),
    defaultValues: { name: "", slug: "", email: "", cnpj: "", phone: "" },
  });

  const q = useQuery(agenciesQueryOptions);

  async function handleCreate(form: AgencyForm) {
    setLoading(true);
    setInviteUrl(null);
    try {
      const payload = await createAgencyAndInvite({
        name: form.name,
        slug: form.slug,
        email: form.email,
        cnpj: form.cnpj,
        phone: form.phone,
      });

      const url = `${window.location.origin}/m/invite/${payload.invite_token}`;
      setInviteUrl(url);
      toast.success("Agência provisionada com sucesso!");
      reset();
      q.refetch();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar agência");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl);
      toast.success("Link copiado para a área de transferência");
    }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <PageHeader title="Agências" description="Todas as agências cadastradas na plataforma." />
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Nova Agência
        </button>
      </div>

      {q.isError && (
        <div className="mt-4 flex flex-col items-center justify-center py-8 px-4 text-center rounded-2xl border border-red-200 bg-red-50/60 max-w-xl mx-auto">
          <AlertCircle className="h-5 w-5 text-red-600 mb-1.5" />
          <h3 className="text-xs font-bold text-red-800">Falha ao Carregar Agências</h3>
          <p className="text-[11px] text-red-600 mt-0.5">
            {q.error instanceof Error ? q.error.message : "Erro de conexão."}
          </p>
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[100] flex justify-end bg-background/80 backdrop-blur-sm"
          onClick={() => {
            setOpen(false);
            setInviteUrl(null);
            reset();
          }}
        >
          <div
            className="flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-border bg-surface animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-border bg-surface-alt/30 p-6 shrink-0">
              <h2 className="text-xl font-bold text-foreground">Provisionar Nova Agência</h2>
            </div>
            <div className="p-6 overflow-y-auto">
              {!inviteUrl ? (
                <form onSubmit={handleSubmit(handleCreate)} className="mt-4 flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground">
                      Nome da Agência *
                    </label>
                    <input
                      {...register("name")}
                      className="mt-1 w-full rounded-full border border-border bg-background px-3 py-2 text-sm"
                      placeholder="Ex: Viagens Inc."
                    />
                    {errors.name && (
                      <span className="text-xs text-danger">{errors.name.message}</span>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground">
                      Slug (URL) *
                    </label>
                    <input
                      {...register("slug")}
                      className="mt-1 w-full rounded-full border border-border bg-background px-3 py-2 text-sm"
                      placeholder="Ex: viagens-inc"
                    />
                    {errors.slug && (
                      <span className="text-xs text-danger">{errors.slug.message}</span>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground">
                      E-mail do Proprietário *
                    </label>
                    <input
                      type="email"
                      {...register("email")}
                      className="mt-1 w-full rounded-full border border-border bg-background px-3 py-2 text-sm"
                      placeholder="dono@agencia.com"
                    />
                    {errors.email && (
                      <span className="text-xs text-danger">{errors.email.message}</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground">
                        CNPJ
                      </label>
                      <input
                        {...register("cnpj")}
                        className="mt-1 w-full rounded-full border border-border bg-background px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground">
                        Telefone
                      </label>
                      <input
                        {...register("phone")}
                        className="mt-1 w-full rounded-full border border-border bg-background px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <button
                    disabled={loading}
                    type="submit"
                    className="mt-2 w-full rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                  >
                    {loading ? "Provisionando..." : "Criar Agência e Gerar Convite"}
                  </button>
                </form>
              ) : (
                <div className="mt-4 flex flex-col gap-4">
                  <div className="rounded-full border border-success/20 bg-success/10 p-4 text-sm text-success">
                    Agência provisionada no banco de dados! Envie o link abaixo para o proprietário
                    definir a senha e acessar a plataforma.
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground">
                      Link de Convite (Owner)
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        readOnly
                        value={inviteUrl}
                        className="flex-1 rounded-full border border-border bg-surface-alt px-3 py-2 font-mono text-xs text-muted-foreground"
                      />
                      <button
                        onClick={handleCopy}
                        className="rounded-full border border-border bg-background px-3 py-2 text-sm hover:bg-surface-alt"
                      >
                        Copiar
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      setInviteUrl(null);
                    }}
                    className="mt-4 w-full rounded-full border border-border px-4 py-2 text-sm hover:bg-surface-alt"
                  >
                    Fechar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {q.isLoading && (
        <div className="mt-6 flex flex-col gap-2">
          <div className="h-10 w-full animate-pulse rounded-full bg-primary/10"></div>
          <div className="h-10 w-full animate-pulse rounded-full bg-primary/10"></div>
        </div>
      )}
      {q.data && q.data.length === 0 && <EmptyState title="Sem agências" />}
      {q.data && q.data.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Agência</th>
                <th className="px-3 py-2 text-left">CNPJ</th>
                <th className="px-3 py-2 text-left">Contato</th>
                <th className="px-3 py-2 text-left">Criada</th>
              </tr>
            </thead>
            <tbody>
              {q.data.map((a) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="px-3 py-2.5">
                    <Link
                      to="/admin/agencies/$id"
                      params={{ id: a.id }}
                      className="font-medium text-foreground hover:underline"
                    >
                      {a.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">/{a.slug}</div>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs">{a.priv?.document ?? "—"}</td>
                  <td className="px-3 py-2.5 text-xs">
                    <div>{a.priv?.email ?? "—"}</div>
                    <div className="text-muted-foreground">{a.priv?.phone ?? ""}</div>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {fmtDate(a.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
