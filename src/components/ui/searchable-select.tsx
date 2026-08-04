import { useState, useRef, useEffect, useCallback } from "react";
import { Search, X, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FormInput as Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type SearchableOption = {
  value: string;
  label: string;
  sublabel?: string;
};

type SearchableSelectProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  options?: SearchableOption[];
  /** Async search function: receives query string, returns options */
  onSearch?: (query: string) => Promise<SearchableOption[]>;
  loading?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  clearable?: boolean;
};

export function SearchableSelect({
  value,
  onChange,
  placeholder = "Selecione...",
  searchPlaceholder = "Buscar...",
  options,
  onSearch,
  loading = false,
  disabled = false,
  className,
  clearable = true,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [asyncOptions, setAsyncOptions] = useState<SearchableOption[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allOptions = options ?? asyncOptions;
  const selectedOption = allOptions.find((o) => o.value === value);

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) {
      // Pequeno timeout para garantir que o PopoverContent renderizou
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounced async search
  const runSearch = useCallback(
    async (q: string) => {
      if (!onSearch) return;
      setSearching(true);
      try {
        const results = await onSearch(q);
        setAsyncOptions(results);
      } finally {
        setSearching(false);
      }
    },
    [onSearch],
  );

  useEffect(() => {
    if (!onSearch) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, onSearch, runSearch]);

  // Initial load for async
  useEffect(() => {
    if (open && onSearch && asyncOptions.length === 0 && !searching) {
      runSearch("");
    }
  }, [open, onSearch, asyncOptions.length, searching, runSearch]);

  const filteredOptions = options
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(query.toLowerCase()) ||
          (o.sublabel && o.sublabel.toLowerCase().includes(query.toLowerCase())),
      )
    : asyncOptions;

  function handleSelect(opt: SearchableOption) {
    onChange(opt.value);
    setOpen(false);
    setQuery("");
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("");
    setQuery("");
  }

  const isLoading = loading || searching;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          disabled={disabled}
          className={cn(
            "flex w-full h-9 items-center justify-between gap-2 rounded-[var(--radius-input)] border border-input bg-transparent px-3 text-sm outline-none transition-colors",
            "hover:border-border focus:border-border-strong focus:ring-1 focus:ring-white/20",
            "disabled:cursor-not-allowed disabled:opacity-60",
            open && "border-border-strong ring-2 ring-ring/20",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <span className="flex-1 truncate text-left">
            {selectedOption ? (
              <span className="flex items-center gap-1.5">
                <span className="font-medium text-foreground">{selectedOption.label}</span>
                {selectedOption.sublabel && (
                  <span className="text-xs text-muted-foreground">({selectedOption.sublabel})</span>
                )}
              </span>
            ) : (
              placeholder
            )}
          </span>

          <span className="flex shrink-0 items-center gap-1">
            {clearable && value && (
              <span
                role="button"
                onClick={handleClear}
                className="rounded p-0.5 text-muted-foreground hover:bg-surface-alt hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  open && "rotate-180",
                )}
              />
            )}
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0 rounded-[var(--radius-card)] border-border glass text-white bg-black/40 backdrop-blur-2xl"
      >
        {/* Search input */}
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="flex-1 border-none bg-transparent focus-visible:ring-0 focus-visible:border-none px-0 h-8"
          />
          {query && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full text-muted-foreground hover:text-foreground"
              onClick={() => setQuery("")}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Options list */}
        <div className="max-h-56 overflow-y-auto py-1">
          {isLoading && filteredOptions.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Buscando...
            </div>
          ) : filteredOptions.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              Nenhum resultado encontrado.
            </div>
          ) : (
            filteredOptions.map((opt) => (
              <Button
                key={opt.value}
                type="button"
                variant="ghost"
                onClick={() => handleSelect(opt)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 h-auto text-left text-sm transition-colors rounded-none hover:glass-dark font-normal",
                  opt.value === value && "bg-primary/20 font-semibold text-primary",
                )}
              >
                <span className="flex-1 truncate text-left">{opt.label}</span>
                {opt.sublabel && (
                  <span className="shrink-0 text-xs text-muted-foreground">{opt.sublabel}</span>
                )}
              </Button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
