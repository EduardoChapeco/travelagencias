import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * HighlightBorder — borda colorida animada (conic-gradient) usando os tokens
 * --highlight-a/b/c definidos em src/styles.css. Sem hardcode, sem inline-style.
 *
 * Aplique apenas em campos/cards de DESTAQUE (CTA primário, métrica-chave,
 * card "premium"). Respeita prefers-reduced-motion (CSS).
 */
export interface HighlightBorderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Espessura visual da borda (px). Default 1. */
  thickness?: 1 | 2;
  /** Raio (token). Default md. */
  radius?: "sm" | "md" | "lg";
  active?: boolean;
}

const RADII: Record<NonNullable<HighlightBorderProps["radius"]>, string> = {
  sm: "rounded-full",
  md: "rounded-full",
  lg: "rounded-2xl",
};

export function HighlightBorder({
  children,
  className,
  thickness = 1,
  radius = "md",
  active = true,
  ...rest
}: HighlightBorderProps) {
  return (
    <div
      {...rest}
      data-thickness={thickness}
      className={cn(
        active ? "dynamic-highlight-border" : "border border-border",
        RADII[radius],
        className,
      )}
    >
      {children}
    </div>
  );
}
