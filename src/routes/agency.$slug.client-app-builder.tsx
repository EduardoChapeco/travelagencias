import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Smartphone,
  Save,
  Eye,
  Settings2,
  Image as ImageIcon,
  Store,
  LifeBuoy,
  Luggage,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { PageHeader } from "@/components/shell/PageHeader";
import { PrimaryButton } from "@/components/ui/button";

import { DraggableList, DraggableItem } from "@/components/ui/DraggableList";
import { UniversalDevicePreview } from "@/components/ui/universal-device-preview";
import { DeviceSelector } from "@/components/ui/DevicePreview";

export const Route = createFileRoute("/agency/$slug/client-app-builder")({
  head: ({ context }: any) => ({ meta: [{ title: `App do Cliente (Builder) · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: ClientAppBuilderPage,
});

type BlockType = "hero" | "my_trips" | "store" | "support";
type BlockConfig = { id: string; type: BlockType; hidden: boolean };
type ClientPortalSettings = {
  id?: string;
  agency_id?: string;
  theme_colors: { primary: string; background: string };
  home_blocks: BlockConfig[];
  enable_pwa: boolean;
};

const DEFAULT_BLOCKS: BlockConfig[] = [
  { id: "hero_1", type: "hero", hidden: false },
  { id: "trips_1", type: "my_trips", hidden: false },
  { id: "store_1", type: "store", hidden: false },
  { id: "support_1", type: "support", hidden: false },
];

const BLOCK_META: Record<BlockType, { label: string; icon: any; desc: string }> = {
  hero: { label: "Banner Principal", icon: ImageIcon, desc: "Apresentação e saudações." },
  my_trips: { label: "Minhas Viagens", icon: Luggage, desc: "Cardápio de viagens ativas do cliente." },
  store: { label: "Loja de Viagens", icon: Store, desc: "Vitrine de grupos com inscrições abertas." },
  support: { label: "Suporte Rápido", icon: LifeBuoy, desc: "Atalhos para abrir tickets e chat." },
};

function ClientAppBuilderPage() {
  const { agency } = useAgency();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [viewport, setViewport] = useState<"mobile" | "tablet" | "desktop">("mobile");
  
  const [settings, setSettings] = useState<ClientPortalSettings>({
    theme_colors: { primary: "#0f172a", background: "#ffffff" },
    home_blocks: DEFAULT_BLOCKS,
    enable_pwa: true,
  });

  const q = useQuery({
    enabled: !!agency,
    queryKey: ["client-portal-settings", agency?.id],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("client_portal_settings")
        .select("*")
        .eq("agency_id", agency!.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return data as ClientPortalSettings | null;
    },
  });

  useEffect(() => {
    if (q.data) {
      setSettings(q.data);
    }
  }, [q.data]);

  const handleToggleHide = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      home_blocks: prev.home_blocks.map((b) => (b.id === id ? { ...b, hidden: !b.hidden } : b)),
    }));
  };

  const saveSettings = async () => {
    if (!agency) return;
    setBusy(true);
    try {
      if (settings.id) {
        await (supabase.from as any)("client_portal_settings")
          .update({
            theme_colors: settings.theme_colors,
            home_blocks: settings.home_blocks,
            enable_pwa: settings.enable_pwa,
          })
          .eq("id", settings.id);
      } else {
        const { data } = await (supabase.from as any)("client_portal_settings")
          .insert({
            agency_id: agency.id,
            theme_colors: settings.theme_colors,
            home_blocks: settings.home_blocks,
            enable_pwa: settings.enable_pwa,
          })
          .select()
          .single();
        if (data) setSettings(data);
      }
      toast.success("Configurações do App salvas!");
      qc.invalidateQueries({ queryKey: ["client-portal-settings"] });
    } catch (err) {
      toast.error("Erro ao salvar as configurações.");
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  if (q.isLoading) return <div>Carregando construtor...</div>;

  return (
    <div className="flex flex-1 overflow-hidden h-full  pb-24">
              <PageHeader
          title="App Builder"
          actions={
            <PrimaryButton
              onClick={saveSettings}
              disabled={busy}
              className="flex h-7 items-center gap-1.5 px-3 text-xs font-semibold cursor-pointer"
            >
              {busy ? <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent animate-spin rounded-full" /> : <Save className="h-3.5 w-3.5" />}
              Salvar
            </PrimaryButton>
          }
        />
      
      {/* Esquerda: Painel de Controle */}
      <div className="w-1/2 max-w-md border-r border-border glass-card border-none/50 p-6 flex flex-col overflow-y-auto">

        <div className="space-y-8">
          {/* Editor de Cores */}
          <section>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
              <Settings2 className="h-4 w-4" /> Tema Visual
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Cor Primária</label>
                <div className="flex items-center gap-3 mt-1">
                  <input
                    type="color"
                    value={settings.theme_colors.primary}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        theme_colors: { ...settings.theme_colors, primary: e.target.value },
                      })
                    }
                    className="h-10 w-12 rounded cursor-pointer border-0 p-0"
                  />
                  <input
                    type="text"
                    value={settings.theme_colors.primary}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        theme_colors: { ...settings.theme_colors, primary: e.target.value },
                      })
                    }
                    className="flex-1 h-10 px-3 rounded-full border-none bg-background text-sm uppercase"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* DnD de Blocos */}
          <section>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
              <Luggage className="h-4 w-4" /> Layout da Tela Inicial
            </h3>
            <p className="text-xs text-muted-foreground mb-4">Arraste para reordenar os blocos que aparecerão para o cliente.</p>
            
            <div className="space-y-2">
              <DraggableList
                items={settings.home_blocks}
                onReorder={(newBlocks) => setSettings({ ...settings, home_blocks: newBlocks })}
              >
                {(block) => {
                  const meta = BLOCK_META[block.type];
                  return (
                    <DraggableItem 
                      key={block.id} 
                      id={block.id} 
                      className={`mb-2 rounded-[var(--radius-card)] border transition-colors ${
                        block.hidden ? "bg-accent/50 border-transparent opacity-60" : "glass-card border-none border-border shadow-none"
                      }`}
                    >
                      <div className="flex items-center gap-3 p-3">
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary">
                          <meta.icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold">{meta.label}</h4>
                          <p className="text-xs text-muted-foreground">{meta.desc}</p>
                        </div>
                        <button
                          onClick={() => handleToggleHide(block.id)}
                          className="text-xs px-2 py-1 rounded-full bg-accent text-accent-foreground hover:bg-muted"
                        >
                          {block.hidden ? "Mostrar" : "Ocultar"}
                        </button>
                      </div>
                    </DraggableItem>
                  );
                }}
              </DraggableList>
            </div>
          </section>
        </div>
      </div>

      {/* Direita: Mockup do App */}
      <div className="flex-1 bg-accent/20 flex flex-col items-center p-8 overflow-y-auto">
        <div className="flex items-center justify-between w-full max-w-[375px] md:max-w-md lg:max-w-xl mb-6">
          <div className="flex items-center gap-2 px-4 py-2 bg-background border-none rounded-full shadow-none text-sm font-medium">
            <Eye className="h-4 w-4 text-primary" /> Preview
          </div>
          <DeviceSelector viewport={viewport} onChange={setViewport} />
        </div>
        
        <UniversalDevicePreview viewport={viewport} themePrimary={settings.theme_colors.primary} themeBackground={settings.theme_colors.background}>
          {/* Fake App Content Render */}
          <div className="p-4 pt-12 space-y-6">
            {settings.home_blocks
              .filter((b) => !b.hidden)
              .map((block) => {
                if (block.type === "hero") {
                  return (
                    <div key={block.id} className="w-full h-32 rounded-[var(--radius-card)] flex items-end p-4 text-white" style={{ backgroundColor: settings.theme_colors.primary }}>
                      <h2 className="text-xl font-bold">Olá, João!</h2>
                    </div>
                  );
                }
                if (block.type === "my_trips") {
                  return (
                    <div key={block.id} className="space-y-3">
                      <h3 className="font-bold text-lg">Próximas Viagens</h3>
                      <div className="w-full h-24 glass-card border-none border-none rounded-[var(--radius-card)] shadow-none p-4 flex gap-3 items-center">
                        <div className="h-16 w-16 bg-accent rounded-[var(--radius-card)] shrink-0"></div>
                        <div>
                          <p className="font-semibold text-sm">Paris & Roma</p>
                          <p className="text-xs text-muted-foreground">Em 15 dias</p>
                        </div>
                      </div>
                    </div>
                  );
                }
                if (block.type === "store") {
                  return (
                    <div key={block.id} className="space-y-3">
                      <div className="flex justify-between items-end">
                        <h3 className="font-bold text-lg">Ofertas Exclusivas</h3>
                        <span className="text-xs font-semibold" style={{ color: settings.theme_colors.primary }}>Ver tudo</span>
                      </div>
                      <div className="w-full h-40 glass-card border-none border-none rounded-[var(--radius-card)] shadow-none overflow-hidden flex flex-col">
                        <div className="flex-1 bg-accent relative">
                          <span className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded">R$ 2.500</span>
                        </div>
                        <div className="p-3">
                          <p className="font-semibold text-sm">Réveillon em Cancún</p>
                        </div>
                      </div>
                    </div>
                  );
                }
                if (block.type === "support") {
                  return (
                    <div key={block.id} className="space-y-3">
                      <h3 className="font-bold text-lg">Precisa de Ajuda?</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="h-20 border-none rounded-[var(--radius-card)] flex flex-col items-center justify-center gap-1 glass-card border-none">
                          <LifeBuoy className="h-5 w-5" style={{ color: settings.theme_colors.primary }} />
                          <span className="text-xs font-medium">Chamados</span>
                        </div>
                        <div className="h-20 border-none rounded-[var(--radius-card)] flex flex-col items-center justify-center gap-1 glass-card border-none">
                          <Smartphone className="h-5 w-5" style={{ color: settings.theme_colors.primary }} />
                          <span className="text-xs font-medium">Chat</span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })}
            
            {settings.home_blocks.filter(b => !b.hidden).length === 0 && (
              <div className="py-20 text-center text-muted-foreground text-sm">
                O painel inicial está vazio.
              </div>
            )}
          </div>
        </UniversalDevicePreview>
      </div>
    </div>
  );
}
