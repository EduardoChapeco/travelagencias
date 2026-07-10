import * as React from "react";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface FilterOption {
  label: string;
  value: string;
  count?: number;
}

export interface FilterBarProps extends React.HTMLAttributes<HTMLDivElement> {
  options: FilterOption[];
  activeValue: string;
  onValueChange: (value: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  extraFilters?: React.ReactNode;
}

export function FilterBar({
  options,
  activeValue,
  onValueChange,
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Buscar...",
  extraFilters,
  className,
  ...props
}: FilterBarProps) {
  return (
    <div 
      className={cn("flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between pb-4 border-b border-border/60 mb-6", className)} 
      {...props}
    >
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-full pb-1 sm:pb-0">
        {options.map((option) => {
          const isActive = activeValue === option.value;
          return (
            <Button
              key={option.value}
              onClick={() => onValueChange(option.value)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
              )}
            >
              {option.label}
              {typeof option.count === "number" && (
                <span
                  className={cn(
                    "text-xs px-1.5 py-0.5 rounded-full",
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-surface-alt text-muted-foreground"
                  )}
                >
                  {option.count}
                </span>
              )}
            </Button>
          );
        })}
      </div>
      
      <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
        {onSearchChange !== undefined && (
          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchQuery ?? ""}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 h-9 text-xs w-full"
            />
          </div>
        )}
        {extraFilters}
      </div>
    </div>
  );
}
