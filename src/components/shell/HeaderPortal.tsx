import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function HeaderPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
    const el = document.getElementById("shell-header-portal");
    if (el) setTarget(el);
  }, []);

  if (!mounted || !target) return null;

  return createPortal(children, target);
}
