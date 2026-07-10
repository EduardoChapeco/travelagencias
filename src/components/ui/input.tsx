import * as React from "react";

import { cn } from "@/lib/utils";

export const formControlClassName =
  "w-full h-[42px] px-3 rounded-input border border-border bg-surface text-sm outline-none transition-colors focus:border-border-strong focus:ring-2 focus:ring-ring/10 disabled:cursor-not-allowed disabled:opacity-60 text-foreground placeholder:text-muted-foreground/60";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-[var(--radius-input)] border border-input bg-transparent px-3 py-1 text-base transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

const FormInput = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, ...props }, ref) => (
    <Input ref={ref} {...props} className={cn(formControlClassName, className)} />
  ),
);
FormInput.displayName = "FormInput";

export { FormInput, Input };
