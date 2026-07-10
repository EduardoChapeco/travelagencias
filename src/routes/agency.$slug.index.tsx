import { Button } from "@/components/ui/button";
import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useAgency } from "@/lib/agency-context";
import { useState, useEffect } from "react";
import { StickyNotesCanvas } from "@/components/dashboard/StickyNotesCanvas";
import {
  Users, PlaneTakeoff, Sparkles, Settings, Palette, Compass, MessageSquare, Bus, Wallet, Calendar
} from "lucide-react";

export const Route = createFileRoute("/agency/$slug/")({
  head: ({ context }: any) => ({ meta: [{ title: `${context?.brand?.platform_name || "Turis"} · Início` }] }),
  component: HomeShell,
} as any);

function HomeShell() {
  const { agency } = useAgency();
  const { slug } = useParams({ from: "/agency/$slug/" });

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: false
  });

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      visible: true
    });
  };

  const closeContextMenu = () => {
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  useEffect(() => {
    window.addEventListener("click", closeContextMenu);
    return () => window.removeEventListener("click", closeContextMenu);
  }, []);

  // Parse links inside notes content (for Phase 3 rendering integration)
  const renderNoteLinkifiedContent = (content: string) => {
    if (!content) return "";
    
    // Simple regex to match: [Label](type:UUID)
    const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const text = match[1];
      const linkVal = match[2];
      
      // Append text before the match
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }

      // Determine URL based on link type
      let url = "";
      if (linkVal.startsWith("lead:")) {
        const id = linkVal.substring(5);
        url = `/agency/${slug}/crm/${id}`;
      } else if (linkVal.startsWith("trip:")) {
        const id = linkVal.substring(5);
        url = `/agency/${slug}/trips/${id}`;
      } else if (linkVal.startsWith("contract:")) {
        const id = linkVal.substring(9);
        url = `/agency/${slug}/contracts`;
      }

      if (url) {
        parts.push(
          <Link
            key={match.index}
            to={url as any}
            className="text-brand font-black hover:underline cursor-pointer bg-white/20 px-1.5 py-0.5 rounded-md inline-flex items-center gap-0.5"
          >
            {text}
          </Link>
        );
      } else {
        parts.push(match[0]);
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return parts.length > 0 ? parts : content;
  };

  return (
    <div
      onContextMenu={handleContextMenu}
      className="relative flex-1 w-full h-full flex flex-col overflow-hidden select-none"
    >
      {/* Draggable Sticky Notes Canvas Workspace */}
      <StickyNotesCanvas renderNoteContent={renderNoteLinkifiedContent} />

      {/* macOS Finder-style context menu */}
      {contextMenu.visible && (
        <div
          className="fixed z-50 w-52 glass dark:glass-dark border border-white/10 rounded-[var(--radius-card)] shadow-2xl p-1.5 flex flex-col text-white text-xs font-semibold select-none animate-fadeIn"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <ContextMenuItem
            label="Novo Lead (CRM)"
            icon={Users}
            onClick={closeContextMenu}
            to={`/agency/${slug}/crm`}
          />
          <ContextMenuItem
            label="Nova Cotação"
            icon={Compass}
            onClick={closeContextMenu}
            to={`/agency/${slug}/quotes`}
          />
          <div className="h-[1px] bg-white/10 my-1 mx-1 shrink-0" />
          <ContextMenuItem
            label="Falar com IA"
            icon={Sparkles}
            onClick={() => {
              closeContextMenu();
              document.dispatchEvent(new CustomEvent("open-ai-chat"));
            }}
          />
          <ContextMenuItem
            label="Personalizar Desktop"
            icon={Palette}
            onClick={() => {
              closeContextMenu();
              document.dispatchEvent(new CustomEvent("open-desktop-customizer"));
            }}
          />
          <ContextMenuItem
            label="Identidade Visual"
            icon={Settings}
            onClick={closeContextMenu}
            to={`/agency/${slug}/brand`}
          />
        </div>
      )}
    </div>
  );
}

function ContextMenuItem({
  label,
  icon: Icon,
  onClick,
  to,
}: {
  label: string;
  icon: any;
  onClick: () => void;
  to?: string;
}) {
  const content = (
    <>
      <Icon className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity" />
      <span>{label}</span>
    </>
  );

  if (to) {
    return (
      <Link
        to={to as any}
        onClick={onClick}
        className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-card)] hover:bg-white/10 hover:text-white transition-all text-white/80 group text-left"
      >
        {content}
      </Link>
    );
  }

  return (
    <Button
      onClick={onClick}
      className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-[var(--radius-card)] hover:bg-white/10 hover:text-white transition-all text-white/80 group cursor-pointer"
    >
      {content}
    </Button>
  );
}
