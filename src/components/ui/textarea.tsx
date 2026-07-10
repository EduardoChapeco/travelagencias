import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[60px] w-full rounded-[var(--radius-card)] border border-input bg-transparent px-3 py-2 text-base shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

const FormTextarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => (
    <Textarea
      ref={ref}
      {...props}
      className={cn(
        "w-full min-h-[85px] p-3 rounded-card border border-border bg-surface text-sm outline-none transition-colors focus:border-border-strong text-foreground placeholder:text-muted-foreground/60",
        className,
      )}
    />
  ),
);
FormTextarea.displayName = "FormTextarea";

export { FormTextarea, Textarea };
