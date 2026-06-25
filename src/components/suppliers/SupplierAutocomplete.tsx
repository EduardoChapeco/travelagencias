import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, Star, MapPin, X } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SupplierOption = {
  id: string;
  name: string;
  kind: string;
  city: string | null;
  country: string | null;
  rating: number | null;
  phone: string | null;
  email: string | null;
  commission_rate: number;
};

const KIND_LABEL: Record<string, string> = {
  hotel: "Hotel",
  airline: "Aérea",
  transport: "Transfer",
  tour_operator: "Operadora",
  insurance: "Seguro",
  attraction: "Atração",
  restaurant: "Restaurante",
  other: "Outro",
};

// ─── Component ───────────────────────────────────────────────────────────────

export function SupplierAutocomplete({
  agencyId,
  value,
  onChange,
  placeholder = "Buscar fornecedor...",
  filterKind,
  className = "",
}: {
  agencyId: string;
  value: SupplierOption | null;
  onChange: (supplier: SupplierOption | null) => void;
  placeholder?: string;
  filterKind?: string;
  className?: string;
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounce 300ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const { data: results, isFetching } = useQuery({
    enabled: isOpen && debouncedSearch.length >= 2,
    queryKey: ["supplier_search", agencyId, debouncedSearch, filterKind],
    queryFn: async () => {
      let query = supabase
        .from("suppliers")
        .select("id, name, kind, city, country, rating, phone, email, commission_rate")
        .eq("agency_id", agencyId)
        .eq("is_active", true)
        .ilike("name", `%${debouncedSearch}%`)
        .order("name")
        .limit(10);

      if (filterKind) {
        query = query.eq("kind", filterKind as any);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as SupplierOption[];
    },
    staleTime: 30_000,
  });

  function handleSelect(supplier: SupplierOption) {
    onChange(supplier);
    setSearch("");
    setIsOpen(false);
  }

  function handleClear() {
    onChange(null);
    setSearch("");
    inputRef.current?.focus();
  }

  return (
    <div className={`relative ${className}`}>
      {/* Selected value display */}
      {value ? (
        <div className="flex items-center gap-2 border border-border rounded-md bg-surface px-3 py-2 text-sm">
          <span className="text-xs bg-brand/10 text-brand rounded px-1.5 py-0.5 font-semibold">
            {KIND_LABEL[value.kind] ?? value.kind}
          </span>
          <span className="font-medium flex-1">{value.name}</span>
          {value.city && (
            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
              <MapPin className="h-2.5 w-2.5" /> {value.city}
            </span>
          )}
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 rounded hover:bg-surface-alt text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors"
          />
          {isFetching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      )}

      {/* Dropdown */}
      {isOpen && !value && (
        <div
          ref={dropdownRef}
          className="absolute z-50 top-full left-0 right-0 mt-1 border border-border rounded-lg bg-surface shadow-lg overflow-hidden"
        >
          {debouncedSearch.length < 2 && (
            <div className="px-4 py-3 text-xs text-muted-foreground">
              Digite ao menos 2 caracteres para buscar fornecedores...
            </div>
          )}

          {debouncedSearch.length >= 2 && !isFetching && results?.length === 0 && (
            <div className="px-4 py-3 text-xs text-muted-foreground">
              Nenhum fornecedor encontrado para "{debouncedSearch}"
            </div>
          )}

          {results && results.length > 0 && (
            <ul className="max-h-64 overflow-y-auto">
              {results.map((supplier) => (
                <li key={supplier.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(supplier)}
                    className="w-full text-left px-4 py-3 hover:bg-surface-alt transition-colors border-b border-border/50 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-brand/10 text-brand rounded px-1.5 py-0.5 font-semibold shrink-0">
                        {KIND_LABEL[supplier.kind] ?? supplier.kind}
                      </span>
                      <span className="text-sm font-medium text-foreground">{supplier.name}</span>
                      {supplier.rating != null && (
                        <span className="ml-auto flex items-center gap-0.5 text-xs text-amber-500 shrink-0">
                          <Star className="h-3 w-3 fill-amber-400" />
                          {supplier.rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                    {(supplier.city || supplier.commission_rate > 0) && (
                      <div className="flex items-center gap-3 mt-1">
                        {supplier.city && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <MapPin className="h-2.5 w-2.5" />
                            {supplier.city}
                            {supplier.country &&
                              supplier.country !== "BR" &&
                              `, ${supplier.country}`}
                          </span>
                        )}
                        {supplier.commission_rate > 0 && (
                          <span className="text-[10px] text-green-600 font-semibold">
                            {supplier.commission_rate}% comissão
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
