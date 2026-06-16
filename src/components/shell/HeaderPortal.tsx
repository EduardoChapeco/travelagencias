import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

export function HeaderPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  const target = document.getElementById("app-header-portal");
  if (!target) return null;

  return createPortal(children, target);
}
