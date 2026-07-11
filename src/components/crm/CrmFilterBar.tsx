import { Search } from "lucide-react";
import { FormInput as Input } from "@/components/ui/input";
import { NativeSelect as Select } from "@/components/ui/select";

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
    <div className="flex flex-wrap items-center gap-3 min-h-[var(--ds-toolbar-height)] px-4 py-2 glass-section rounded-[var(--radius-card)] mb-6">
      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou e-mail..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select
        value={ownerFilter}
        onChange={(e) => setOwnerFilter(e.target.value)}
        className="w-48 rounded-full focus:border-brand"
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
      </Select>
      <Select
        value={sourceFilter}
        onChange={(e) => setSourceFilter(e.target.value)}
        className="w-40 rounded-full focus:border-brand"
      >
        <option value="">Todas as Origens</option>
        <option value="whatsapp">WhatsApp / Telefone</option>
        <option value="instagram">Instagram / Meta</option>
        <option value="website">Site / Landing Page</option>
        <option value="referral">Indicação</option>
        <option value="walkin">Presencial</option>
      </Select>
    </div>
  );
}
