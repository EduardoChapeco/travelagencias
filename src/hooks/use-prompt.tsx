import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/form";

type PromptOptions = {
  title: string;
  description?: string;
  defaultValue?: string;
  onConfirm: (value: string) => void;
};

export function usePrompt() {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<PromptOptions | null>(null);
  const [value, setValue] = useState("");

  const prompt = (opts: PromptOptions) => {
    setOptions(opts);
    setValue(opts.defaultValue || "");
    setOpen(true);
  };

  const PromptDialog = () => (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{options?.title}</AlertDialogTitle>
          {options?.description && (
            <AlertDialogDescription>{options?.description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <div className="py-2">
          <Input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && value.trim()) {
                options?.onConfirm(value);
                setOpen(false);
              }
            }}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setOpen(false)}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={!value.trim()}
            onClick={() => {
              options?.onConfirm(value);
              setOpen(false);
            }}
          >
            Confirmar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { prompt, PromptDialog };
}
