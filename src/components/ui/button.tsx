import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-button)] text-sm font-semibold cursor-pointer transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 select-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-none",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-none",
        outline: "border border-border/80 bg-transparent hover:bg-surface-alt hover:text-foreground shadow-none",
        secondary: "bg-surface-alt text-foreground hover:bg-muted border border-border/80 shadow-none",
        ghost: "hover:bg-white/10 hover:text-foreground text-muted-foreground shadow-none",
        link: "text-foreground underline-offset-4 hover:underline",
        glass: "bg-white/10 text-white hover:bg-white/15 border border-white/10 transition-all shadow-none",
        // Semantic actions mapping
        "primary-action": "bg-primary text-primary-foreground hover:bg-primary/90 shadow-none",
        "secondary-action": "bg-surface-alt text-foreground hover:bg-muted border border-border/80 shadow-none",
        "neutral-action":
          "border border-border/80 bg-transparent hover:bg-surface-alt hover:text-foreground shadow-none",
        subtle: "hover:bg-surface-alt hover:text-foreground text-muted-foreground shadow-none",
        selected: "bg-white/15 text-white border border-white/20 hover:bg-white/20 shadow-none",
        active: "bg-primary text-primary-foreground border border-primary/20 shadow-none",
        success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-none",
        warning: "bg-amber-600 text-white hover:bg-amber-700 shadow-none",
        informational: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-none",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
