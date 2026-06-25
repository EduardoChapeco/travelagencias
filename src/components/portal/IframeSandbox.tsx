import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface IframeSandboxProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  /** Width constraint for viewport simulation (e.g. 390 for mobile, 768 for tablet). Unset = fluid. */
  simulatedWidth?: number;
}

const DESIGN_SYSTEM_VARS = [
  "--background",
  "--foreground",
  "--surface",
  "--surface-alt",
  "--surface-muted",
  "--surface-hover",
  "--border",
  "--border-strong",
  "--brand",
  "--brand-light",
  "--brand-foreground",
  "--accent",
  "--accent-soft",
  "--success",
  "--warning",
  "--danger",
  "--destructive",
  "--muted-foreground",
  "--radius",
  "--font-sans",
];

export function IframeSandbox({ children, title, className, simulatedWidth }: IframeSandboxProps) {
  const [iframeEl, setIframeEl] = useState<HTMLIFrameElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const observerRef = useRef<MutationObserver | null>(null);

  const mountNode = iframeEl?.contentWindow?.document?.body ?? null;
  const headNode = iframeEl?.contentWindow?.document?.head ?? null;
  const docEl = iframeEl?.contentWindow?.document?.documentElement ?? null;

  // ── Inject styles & CSS variables ───────────────────────────────────────────
  useEffect(() => {
    if (!iframeEl || !headNode || !docEl) return;

    const inject = () => {
      // 1. Reset head inside iframe
      headNode.innerHTML = "";

      // 2. Viewport meta — use the simulated width when constrained
      const meta = document.createElement("meta");
      meta.name = "viewport";
      meta.content = simulatedWidth
        ? `width=${simulatedWidth}, initial-scale=1`
        : "width=device-width, initial-scale=1";
      headNode.appendChild(meta);

      // 3. Copy all stylesheets from the host page
      const elems = Array.from(document.head.querySelectorAll("style, link[rel='stylesheet']"));
      elems.forEach((el) => headNode.appendChild(el.cloneNode(true)));

      // 4. Copy design-system CSS custom properties onto the iframe <html> element
      const hostRoot = getComputedStyle(document.documentElement);
      DESIGN_SYSTEM_VARS.forEach((v) => {
        const val = hostRoot.getPropertyValue(v).trim();
        if (val) docEl.style.setProperty(v, val);
      });

      // 5. Class the iframe body
      const body = iframeEl.contentWindow?.document.body;
      if (body) {
        body.className =
          "bg-background text-foreground antialiased m-0 p-0 overflow-y-auto min-h-full w-full";
      }

      setIsReady(true);
    };

    inject();

    // Re-inject when host page adds/removes styles (HMR, dynamic themes)
    if (observerRef.current) observerRef.current.disconnect();
    const observer = new MutationObserver(() => {
      if (!headNode) return;
      Array.from(headNode.querySelectorAll("style")).forEach((s) => s.remove());
      Array.from(document.head.querySelectorAll("style")).forEach((s) =>
        headNode.appendChild(s.cloneNode(true)),
      );
    });
    observer.observe(document.head, { childList: true, subtree: true });
    observerRef.current = observer;

    return () => observer.disconnect();
  }, [iframeEl, headNode, docEl, simulatedWidth]);

  // Re-inject viewport meta when simulatedWidth changes (user switches device)
  useEffect(() => {
    if (!headNode) return;
    const existingMeta = headNode.querySelector("meta[name='viewport']");
    if (existingMeta) {
      (existingMeta as HTMLMetaElement).content = simulatedWidth
        ? `width=${simulatedWidth}, initial-scale=1`
        : "width=device-width, initial-scale=1";
    }
  }, [simulatedWidth, headNode]);

  return (
    <iframe
      ref={setIframeEl}
      title={title ?? "Sandbox Preview"}
      className={className}
      style={{ border: "none", width: "100%", height: "100%", display: "block" }}
    >
      {isReady && mountNode ? createPortal(children, mountNode) : null}
    </iframe>
  );
}
