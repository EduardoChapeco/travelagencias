import React, { useRef, useState, useCallback, useEffect } from "react";
import { Camera, MapPin, CheckCircle, ShieldAlert, Loader2 } from "lucide-react";

type KycSignatureProps = {
  onSign: (data: { photoBlob: Blob; latitude: number; longitude: number }) => Promise<void>;
  isLoading: boolean;
};

export function KycSignature({ onSign, isLoading }: KycSignatureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [step, setStep] = useState<"intro" | "camera" | "review">("intro");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Parar a câmera ao desmontar
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const startKycProcess = async () => {
    setErrorMsg(null);
    setStep("camera");

    try {
      // 1. Pedir Localização (GPS)
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          },
          (err) => {
            console.warn("Geolocalização negada/falhou:", err);
            // Podemos falhar suavemente ou bloquear, mas seguiremos com aviso.
          }
        );
      }

      // 2. Iniciar Câmera (Foco em câmera frontal no mobile)
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error("Erro no KYC:", err);
      setErrorMsg("Não foi possível acessar a câmera. Verifique suas permissões.");
    }
  };

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            setPhotoBlob(blob);
            setPhotoUrl(URL.createObjectURL(blob));
            setStep("review");
            
            // Pausar câmera
            if (stream) {
              stream.getTracks().forEach((t) => t.stop());
            }
          }
        }, "image/jpeg", 0.8);
      }
    }
  }, [stream]);

  const handleRetake = () => {
    setPhotoBlob(null);
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoUrl(null);
    startKycProcess();
  };

  const handleConfirm = () => {
    if (!photoBlob) return;
    
    // Se o cliente não liberou o GPS, mandamos 0 ou rejeitamos. Para não bloquear o fluxo (pois muitos usuários negam GPS na web), vamos deixar opcional, mas você pode mudar para obrigatório.
    const lat = location?.lat || 0;
    const lng = location?.lng || 0;

    onSign({ photoBlob, latitude: lat, longitude: lng });
  };

  if (step === "intro") {
    return (
      <div className="bg-surface border border-border p-6 rounded-2xl text-center space-y-4 max-w-sm mx-auto">
        <div className="mx-auto h-16 w-16 bg-blue-500/10 text-blue-600 flex items-center justify-center rounded-full">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <div>
          <h3 className="font-bold text-lg">Assinatura com Verificação</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Para garantir a sua segurança e evitar fraudes, precisamos de uma foto sua (Selfie) e da sua localização atual antes de assinar.
          </p>
        </div>
        <button
          onClick={startKycProcess}
          className="w-full bg-primary text-primary-foreground font-semibold h-11 rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
        >
          <Camera className="h-5 w-5" /> Iniciar Verificação
        </button>
      </div>
    );
  }

  if (step === "camera") {
    return (
      <div className="bg-black border border-border p-4 rounded-2xl max-w-sm mx-auto overflow-hidden">
        {errorMsg ? (
          <div className="text-center p-6 bg-surface text-foreground rounded-xl">
            <ShieldAlert className="h-10 w-10 text-red-500 mx-auto mb-3" />
            <p className="font-semibold">{errorMsg}</p>
            <button onClick={() => setStep("intro")} className="mt-4 text-primary text-sm font-semibold hover:underline">Tentar Novamente</button>
          </div>
        ) : (
          <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-zinc-900">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
            />
            {/* Overlay com máscara de rosto */}
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none p-4">
              <div className="w-48 h-64 border-2 border-dashed border-white/50 rounded-[40px]"></div>
              <p className="text-white text-xs font-semibold mt-4 drop-shadow-md text-center">
                Enquadre seu rosto<br/>{location ? "📍 Localização Detectada" : "Procurando GPS..."}
              </p>
            </div>
            
            <div className="absolute bottom-6 left-0 right-0 flex justify-center z-20">
              <button
                onClick={capturePhoto}
                className="h-16 w-16 bg-white rounded-full border-4 border-zinc-300 shadow-xl flex items-center justify-center active:scale-95 transition-transform"
              >
                <div className="h-12 w-12 rounded-full border-2 border-zinc-900"></div>
              </button>
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}
      </div>
    );
  }

  if (step === "review") {
    return (
      <div className="bg-surface border border-border p-6 rounded-2xl text-center space-y-4 max-w-sm mx-auto">
        <h3 className="font-bold text-lg">Tudo certo?</h3>
        
        <div className="relative aspect-square w-48 mx-auto rounded-full overflow-hidden border-4 border-border shadow-inner">
          {photoUrl && <img src={photoUrl} alt="Selfie" className="w-full h-full object-cover scale-x-[-1]" />}
        </div>
        
        <div className="flex justify-center items-center gap-2 text-xs font-medium bg-accent px-3 py-1.5 rounded-md inline-flex mx-auto text-muted-foreground">
          {location?.lat ? (
            <><MapPin className="h-3.5 w-3.5 text-green-600" /> GPS Registrado</>
          ) : (
            <><MapPin className="h-3.5 w-3.5 text-red-500" /> GPS Indisponível</>
          )}
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="w-full bg-green-600 text-white font-semibold h-11 rounded-xl flex items-center justify-center gap-2 hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
            Confirmar e Assinar
          </button>
          
          <button
            onClick={handleRetake}
            disabled={isLoading}
            className="text-sm font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            Tirar outra foto
          </button>
        </div>
      </div>
    );
  }

  return null;
}
