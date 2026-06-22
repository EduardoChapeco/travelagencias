import { lazy, Suspense } from "react";

const RichTextEditorInner = lazy(() =>
  import("./RichTextEditorInner").then((m) => ({
    default: m.RichTextEditorInner,
  }))
);

export function RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Suspense
      fallback={
        <div className="h-[350px] flex items-center justify-center border border-dashed rounded-md bg-surface-alt/30 text-muted-foreground text-sm">
          Carregando editor de texto...
        </div>
      }
    >
      <RichTextEditorInner value={value} onChange={onChange} />
    </Suspense>
  );
}
