import { Camera, Image as ImageIcon, ShieldAlert } from "lucide-react";
import { fmtDate } from "@/components/ui/form";
import { MultiFileUploader } from "@/components/uploads/MultiFileUploader";

interface TabMemoriasProps {
  tripId: string;
  memories: any[];
  lgpdAccepted: boolean;
  lgpdLoading: boolean;
  acceptLgpdPending: boolean;
  uploadMemoryPending: boolean;
  onAcceptLgpd: () => void;
  onUploadMemory: (urls: string[]) => void;
}

export function TabMemorias({
  tripId,
  memories,
  lgpdAccepted,
  lgpdLoading,
  acceptLgpdPending,
  uploadMemoryPending,
  onAcceptLgpd,
  onUploadMemory,
}: TabMemoriasProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {!lgpdLoading && !lgpdAccepted ? (
        <div className="rounded-3xl border border-warning/30 bg-warning/5 p-8 max-w-2xl mx-auto space-y-4 text-center">
          <ShieldAlert className="w-12 h-12 text-warning mx-auto" />
          <h3 className="text-base font-bold text-foreground">
            Autorização de Uso de Imagem (LGPD)
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Para poder salvar fotos das suas viagens no portal, precisamos do seu consentimento para
            armazenar estas mídias de forma segura. A agência poderá visualizar as imagens e, com a
            sua permissão, utilizá-las em comunicações ou divulgações institucionais de marketing.
          </p>
          <div className="pt-2">
            <button
              onClick={onAcceptLgpd}
              disabled={acceptLgpdPending}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity"
            >
              {acceptLgpdPending ? "Registrando..." : "Aceitar e Habilitar Galeria"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-brand" /> Galeria Privada
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Guarde aqui as fotos inesquecíveis da sua viagem.
              </p>
            </div>
            <div className="w-full md:w-auto">
              <MultiFileUploader
                bucket="trip-memories"
                folder={`${tripId}`}
                max={10}
                values={[]}
                onChange={(urls) => {
                  if (urls.length > 0) onUploadMemory(urls);
                }}
              />
            </div>
          </div>

          {memories.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border p-12 text-center bg-surface">
              <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <div className="text-lg font-bold text-foreground mb-1">Nenhuma memória ainda</div>
              <div className="text-sm text-muted-foreground">
                Faça o upload da sua primeira foto.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {memories.map((m: any) => (
                <div
                  key={m.id}
                  className="aspect-square rounded-2xl overflow-hidden bg-muted group relative"
                >
                  <img
                    src={m.image_url}
                    alt="Memória"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                    <span className="text-[10px] text-white font-medium">
                      {fmtDate(m.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
