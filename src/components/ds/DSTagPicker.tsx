import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { X, Plus, Tag as TagIcon, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

export interface DSTagPickerProps {
  value?: string[];
  onChange?: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function DSTagPicker({
  value = [],
  onChange,
  placeholder = "Adicionar tags...",
  className = "",
  disabled = false,
}: DSTagPickerProps) {
  const { agency } = useAgency();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const { data: availableTags = [], isLoading } = useQuery({
    queryKey: ["agency-tags", agency?.id],
    enabled: !!agency?.id && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agency_tags")
        .select("*")
        .eq("agency_id", agency!.id)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const createTagMutation = useMutation({
    mutationFn: async (tagName: string) => {
      const { data, error } = await supabase
        .from("agency_tags")
        .insert({
          agency_id: agency!.id,
          name: tagName.trim(),
          color: "#94A3B8", // default color for new tags
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (newTag) => {
      queryClient.invalidateQueries({ queryKey: ["agency-tags", agency?.id] });
      const formatted = `${newTag.name}:${newTag.color}`;
      if (!value.includes(formatted)) {
        onChange?.([...value, formatted]);
      }
      setInputValue("");
    },
  });

  const handleSelect = (tag: any) => {
    const formatted = `${tag.name}:${tag.color}`;
    if (value.includes(formatted)) {
      onChange?.(value.filter((v) => v !== formatted));
    } else {
      onChange?.([...value, formatted]);
    }
  };

  const handleRemove = (e: React.MouseEvent, formattedTag: string) => {
    e.stopPropagation();
    onChange?.(value.filter((v) => v !== formattedTag));
  };

  const handleCreate = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!inputValue.trim() || disabled) return;
    
    // Check if it already exists locally
    const exists = availableTags.find(t => t.name.toLowerCase() === inputValue.trim().toLowerCase());
    if (exists) {
      handleSelect(exists);
      setInputValue("");
    } else {
      createTagMutation.mutate(inputValue);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          className={`flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-sm ring-offset-background cursor-text ${
            disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-accent/10"
          } ${className}`}
          onClick={() => !disabled && setOpen(true)}
        >
          {value.length === 0 ? (
            <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <TagIcon className="h-3.5 w-3.5" />
              {placeholder}
            </span>
          ) : (
            value.map((tagStr) => {
              const [name, color] = tagStr.split(":");
              return (
                <span
                  key={tagStr}
                  className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-xs font-semibold text-white shadow-sm"
                  style={{ backgroundColor: color || "#3b82f6" }}
                >
                  {name}
                  {!disabled && (
                    <button
                      type="button"
                      onClick={(e) => handleRemove(e, tagStr)}
                      className="ml-0.5 inline-flex h-3 w-3 items-center justify-center rounded-full outline-none hover:bg-black/20 focus:ring-2 focus:ring-black/40"
                    >
                      <X className="h-2.5 w-2.5" />
                      <span className="sr-only">Remover tag</span>
                    </button>
                  )}
                </span>
              );
            })
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar ou criar tag..."
            value={inputValue}
            onValueChange={setInputValue}
            onKeyDown={(e) => {
              if (e.key === "Enter" && inputValue) {
                e.preventDefault();
                handleCreate();
              }
            }}
          />
          <CommandList>
            <CommandEmpty className="py-4 text-center text-sm">
              {isLoading ? (
                <span className="text-muted-foreground">Carregando tags...</span>
              ) : inputValue ? (
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={createTagMutation.isPending}
                  className="flex w-full items-center justify-center gap-2 px-3 py-1.5 text-sm text-brand hover:underline disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  Criar "{inputValue}"
                </button>
              ) : (
                <span className="text-muted-foreground">Nenhuma tag encontrada.</span>
              )}
            </CommandEmpty>
            <CommandGroup>
              {availableTags
                .filter((t) => t.name.toLowerCase().includes(inputValue.toLowerCase()))
                .map((tag) => {
                  const formatted = `${tag.name}:${tag.color}`;
                  const isSelected = value.includes(formatted);
                  return (
                    <CommandItem
                      key={tag.id}
                      value={tag.name}
                      onSelect={() => handleSelect(tag)}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full shadow-sm ring-1 ring-black/10"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="font-medium text-xs">{tag.name}</span>
                      </div>
                      {isSelected && <Check className="h-3.5 w-3.5 text-brand" />}
                    </CommandItem>
                  );
                })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
