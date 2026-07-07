import { useEffect } from "react";
import { useHeaderStore } from "@/lib/header-store";

export function HeaderPortal({ children }: { children: React.ReactNode }) {
  const setToolbar = useHeaderStore((s) => s.setToolbar);

  useEffect(() => {
    setToolbar(children);
    return () => setToolbar(null);
  }, [children, setToolbar]);

  return null;
}
