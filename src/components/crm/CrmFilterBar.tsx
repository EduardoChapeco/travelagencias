import { Search } from "lucide-react";
import { Input } from "@/components/ui/form";

type Props = {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  ownerFilter: string;
  setOwnerFilter: (v: string) => void;
  sourceFilter: string;
  setSourceFilter: (v: string) => void;
  users: Array<{ user_id: string | null; user_name: string | null }>;
};

export function CrmFilterBar({
  searchQuery,
  setSearchQuery,
  ownerFilter,
  setOwnerFilter,
  sourceFilter,
  setSourceFilter,
  users,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 pb-3">
      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou e-mail..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-9 text-xs"
        />
      </div>
      <select
        value={ownerFilter}
        onChange={(e) => setOwnerFilter(e.target.value)}
        className="h-9 w-48 rounded-md border border-border bg-surface px-3 text-xs text-foreground focus:border-brand focus:outline-none"
      >
        <option value="">Todos os Responsáveis</option>
        {users?.map(
          (u) =>
            u.user_id && (
              <option key={u.user_id} value={u.user_id}>
                {u.user_name || "Sem nome"}
              </option>
            ),
        )}
      </select>
      <select
        value={sourceFilter}
        onChange={(e) => setSourceFilter(e.target.value)}
        className="h-9 w-40 rounded-md border border-border bg-surface px-3 text-xs text-foreground focus:border-brand focus:outline-none"
      >
        <option value="">Todas as Origens</option>
        <option value="whatsapp">WhatsApp / Telefone</option>
        <option value="instagram">Instagram / Meta</option>
        <option value="website">Site / Landing Page</option>
        <option value="referral">Indicação</option>
        <option value="walkin">Presencial</option>
      </select>
    </div>
  );
}
