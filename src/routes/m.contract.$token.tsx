import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Field, Input, PrimaryButton, GhostButton } from "@/components/ui/form";
import { generateContractHash, generateContractPdf } from "@/lib/pdf-generator";
import { Video, StopCircle, Upload, Check, AlertCircle, Camera, FileCheck } from "lucide-react";

export const Route = createFileRoute("/m/contract/$token")({
  head: () => ({ meta: [{ title: "Assinar contrato · TravelOS" }] }),
  component: Page,
});

type Clause = { number: number; section: string; clause_text: string; is_immutable?: boolean };
type Contract = {
  id: string;
  status: string;
  agency_id: string;
  agency_name: string;
  agency_logo: string | null;
  package_summary: string | null;
  total_value: number;
  payment_terms: string | null;
  fixed_clauses: Clause[];
  custom_clauses: Clause[];
  client_data: { name?: string; document?: string };
  passengers_data: Array<{ full_name?: string }>;
  signed_at: string | null;
  content_hash: string | null;
  pdf_url?: string | null;
  certificate?: { serial: string; issued_at: string; client_hash?: string; issuer?: string } | null;
  signatures?: Array<{
    signer_name: string;
    signer_document: string;
    signed_at: string;
    ip: string;
    user_agent: string;
    signature_image: string;
    selfie_image: string;
    doc_front?: string;
    doc_back?: string;
    video_kyc?: string;
  }>;
};

function Page() {
  const { token } = Route.useParams();
  const [c, setC] = useState<Contract | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const [name, setName] = useState("");
  const [doc, setDoc] = useState("");
  const [selfie, setSelfie] = useState<string | null>(null);
  
  // KYC Avançado
  const [documentFront, setDocumentFront] = useState<string | null>(null);
  const [documentBack, setDocumentBack] = useState<string | null>(null);
  const [videoKyc, setVideoKyc] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [recording, setRecording] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const sigRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    // Registra visualização no banco
    supabase.rpc("mark_contract_viewed", { _token: token }).then(({ error }) => {
      if (error) console.error(error);
    });

    supabase.rpc("public_contract_by_token", { _token: token }).then(({ data, error }) => {
      if (error) {
        setErr(error.message);
        return;
      }
      const row = (data as Contract[])?.[0];
      if (!row) {
        setErr("Contrato não encontrado");
        return;
      }
      setC(row);
      setName(row.client_data?.name ?? "");
      setDoc(row.client_data?.document ?? "");
    });
  }, [token]);

  function startDraw(e: React.PointerEvent) {
    drawing.current = true;
    const canvas = sigRef.current!;
    const r = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d")!;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f172a";
    ctx.beginPath();
    ctx.moveTo(e.clientX - r.left, e.clientY - r.top);
  }
  
  function moveDraw(e: React.PointerEvent) {
    if (!drawing.current) return;
    const canvas = sigRef.current!;
    const r = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d")!;
    ctx.lineTo(e.clientX - r.left, e.clientY - r.top);
    ctx.stroke();
  }
  
  function endDraw() {
    drawing.current = false;
  }
  
  function clearSig() {
    const canvas = sigRef.current!;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
  }

  async function takeSelfie() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      const video = document.createElement("video");
      video.srcObject = stream;
      video.setAttribute("playsinline", "true");
      await video.play();
      await new Promise((r) => setTimeout(r, 600));
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")!.drawImage(video, 0, 0);
      stream.getTracks().forEach((t) => t.stop());
      setSelfie(canvas.toDataURL("image/jpeg", 0.7));
    } catch {
      toast.error("Permissão de câmera negada ou não disponível.");
    }
  }

  async function startVideoRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        setVideoBlob(blob);
        setVideoKyc(URL.createObjectURL(blob));
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }
      };
      
      recorder.start();
      setRecording(true);
      
      // Auto-stop após 4 segundos
      setTimeout(() => {
        if (recorder.state === "recording") {
          recorder.stop();
          setRecording(false);
        }
      }, 4000);
    } catch (err) {
      toast.error("Permissão de câmera/áudio negada ou não disponível.");
    }
  }

  function handleDocumentUpload(file: File, side: "front" | "back") {
    const reader = new FileReader();
    reader.onload = () => {
      if (side === "front") setDocumentFront(reader.result as string);
      else setDocumentBack(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  function handleVideoUpload(file: File) {
    setVideoBlob(file);
    setVideoKyc(URL.createObjectURL(file));
  }

  async function sign() {
    if (!name || !doc) return toast.error("Preencha nome e documento legal.");
    if (!selfie) return toast.error("Por favor, tire uma selfie de verificação (KYC).");
    if (!documentFront || !documentBack) return toast.error("Faça o upload do documento frente e verso.");

    const sig = sigRef.current!.toDataURL("image/png");

    setSigning(true);
    toast.loading("Criptografando e processando contrato…", { id: "signing" });

    try {
      const ua = navigator.userAgent;
      const ip = await fetch("https://api.ipify.org?format=json")
        .then((r) => r.json())
        .then((j) => j.ip)
        .catch(() => "0.0.0.0");
      const timestamp = new Date().toISOString();

      // 1. Upload selfie KYC para o Storage
      let selfiePath: string | null = null;
      if (selfie) {
        const selfieBlob = await fetch(selfie).then((r) => r.blob());
        const sp = `${c!.agency_id}/${token}/kyc-selfie-${Date.now()}.jpg`;
        const { error: selfieErr } = await supabase.storage
          .from("contract-pdfs")
          .upload(sp, selfieBlob, { contentType: "image/jpeg", upsert: true });
        if (selfieErr) throw new Error("Erro ao salvar selfie: " + selfieErr.message);
        selfiePath = sp;
      }

      // 2. Upload da imagem de assinatura para o Storage
      let signaturePath: string | null = null;
      {
        const sigBlob = await fetch(sig).then((r) => r.blob());
        const sigp = `${c!.agency_id}/${token}/assinatura-${Date.now()}.png`;
        const { error: sigErr } = await supabase.storage
          .from("contract-pdfs")
          .upload(sigp, sigBlob, { contentType: "image/png", upsert: true });
        if (sigErr) throw new Error("Erro ao salvar assinatura: " + sigErr.message);
        signaturePath = sigp;
      }

      // 3. Upload Documento Frente para o Storage
      let docFrontPath: string | null = null;
      {
        const frontBlob = await fetch(documentFront).then((r) => r.blob());
        const path = `${c!.agency_id}/${token}/kyc-doc-front-${Date.now()}.jpg`;
        const { error: err } = await supabase.storage
          .from("contract-pdfs")
          .upload(path, frontBlob, { contentType: "image/jpeg", upsert: true });
        if (err) throw new Error("Erro ao salvar documento frente: " + err.message);
        docFrontPath = path;
      }

      // 4. Upload Documento Verso para o Storage
      let docBackPath: string | null = null;
      {
        const backBlob = await fetch(documentBack).then((r) => r.blob());
        const path = `${c!.agency_id}/${token}/kyc-doc-back-${Date.now()}.jpg`;
        const { error: err } = await supabase.storage
          .from("contract-pdfs")
          .upload(path, backBlob, { contentType: "image/jpeg", upsert: true });
        if (err) throw new Error("Erro ao salvar documento verso: " + err.message);
        docBackPath = path;
      }

      // 5. Upload Vídeo KYC (se gravado)
      let videoPath: string | null = null;
      if (videoBlob) {
        const path = `${c!.agency_id}/${token}/kyc-video-${Date.now()}.webm`;
        const { error: err } = await supabase.storage
          .from("contract-pdfs")
          .upload(path, videoBlob, { contentType: "video/webm", upsert: true });
        if (err) throw new Error("Erro ao salvar vídeo KYC: " + err.message);
        videoPath = path;
      }

      // 6. Hash em Cadeia (Web Crypto API) - Cliente (Servidor também re-checará)
      const contentToHash = JSON.stringify({
        summary: c?.package_summary,
        total: c?.total_value,
        clauses: c?.fixed_clauses.length,
      });
      const hash = await generateContractHash({
        contract_id: c!.id,
        signer_name: name,
        signer_document: doc,
        ip,
        timestamp,
        content: contentToHash,
      });

      // 7. Enviar Payload para a RPC (parâmetros estendidos)
      const { data: serial, error } = await supabase.rpc("sign_contract_with_token", {
        _token: token,
        _signer_name: name,
        _signer_document: doc,
        _signature_image: signaturePath as any,
        _selfie_image: selfiePath as any,
        _ip: ip,
        _user_agent: ua,
        _pdf_path: null, // Registrado após a segunda passagem (chancela completa)
        _signed_hash: hash,
        _doc_front: docFrontPath,
        _doc_back: docBackPath,
        _video_kyc: videoPath
      });

      if (error) throw error;
      const serialNumber = serial as unknown as string;

      // 8. Atualizar o estado local com o serial gerado para re-renderizar a Chancela na tela
      const finalSignatures = [{
        signer_name: name,
        signer_document: doc,
        signed_at: timestamp,
        ip,
        user_agent: ua,
        signature_image: signaturePath || "",
        selfie_image: selfiePath || "",
        doc_front: docFrontPath || undefined,
        doc_back: docBackPath || undefined,
        video_kyc: videoPath || undefined
      }];

      setC({
        ...(c as Contract),
        status: "signed",
        signed_at: timestamp,
        content_hash: hash,
        certificate: {
          serial: serialNumber,
          issued_at: timestamp,
          client_hash: hash,
          issuer: "TravelOS Assinaturas"
        },
        signatures: finalSignatures
      });

      // 9. Pequeno delay para garantir que o componente renderize com o certificado e imagens
      await new Promise((r) => setTimeout(r, 800));

      // 10. Snapshot PDF final completo chancelado (com o QR Code, selfie, etc.)
      const finalPdfBlob = await generateContractPdf("contract-document");

      // 11. Upload do PDF assinado chancelado para o Storage
      const finalPdfPath = `${c!.agency_id}/${token}/contrato-assinado-${Date.now()}.pdf`;
      const { error: uploadErr } = await supabase.storage
        .from("contract-pdfs")
        .upload(finalPdfPath, finalPdfBlob, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadErr) {
        throw new Error("Erro ao salvar o documento final no cofre: " + uploadErr.message);
      }

      // 12. Registrar o caminho do PDF assinado chancelado na base
      const { error: updatePdfErr } = await supabase.rpc("update_contract_pdf_path", {
        _contract_id: c!.id,
        _pdf_path: finalPdfPath
      });

      if (updatePdfErr) {
        console.warn("Aviso ao vincular PDF assinado no banco:", updatePdfErr.message);
      }

      toast.success("Contrato assinado digitalmente!", { id: "signing" });
    } catch (e: any) {
      toast.error(e.message || "Erro inesperado ao assinar", { id: "signing" });
    } finally {
      setSigning(false);
    }
  }

  if (err)
    return (
      <Center>
        <h1 className="text-lg font-semibold">{err}</h1>
      </Center>
    );
  if (!c)
    return (
      <Center>
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </Center>
    );

  const signed = !!c.signed_at;
  const all: Clause[] = [...(c.fixed_clauses ?? []), ...(c.custom_clauses ?? [])].sort(
    (a, b) => (a.number ?? 0) - (b.number ?? 0),
  );

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-8 md:py-12" id="contract-document">
      <header className="mb-8 flex items-center gap-4">
        {c.agency_logo ? (
          <img
            src={c.agency_logo}
            alt={c.agency_name}
            className="h-12 w-12 rounded-xl object-cover  ring-1 ring-border/50"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-alt font-bold text-muted-foreground  ring-1 ring-border/50">
            {c.agency_name.charAt(0)}
          </div>
        )}
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-brand">
            {c.agency_name}
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Contrato de Prestação de Serviços Turísticos
          </h1>
        </div>
      </header>

      <section className="mb-6 overflow-hidden rounded-xl bg-surface  ring-1 ring-border/50">
        <div className="border-b border-border/50 bg-surface-alt/30 px-5 py-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Resumo Executivo
          </h2>
        </div>
        <div className="p-5">
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/80">
            {c.package_summary || "—"}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-4 rounded-lg bg-surface-alt/30 p-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Valor total
              </div>
              <div className="mt-1 font-mono text-base font-semibold">
                {Number(c.total_value || 0).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Pagamento
              </div>
              <div className="mt-1 text-sm font-medium">{c.payment_terms || "—"}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8 overflow-hidden rounded-xl bg-surface  ring-1 ring-border/50">
        <div className="border-b border-border/50 bg-surface-alt/30 px-5 py-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Termos e Cláusulas
          </h2>
        </div>
        <div className="max-h-[500px] overflow-y-auto p-5 space-y-5 no-scrollbar">
          {all.map((cl) => (
            <div key={cl.number} className="text-xs leading-relaxed text-foreground/80">
              <span className="font-bold text-foreground">
                Cláusula {cl.number} — {cl.section}:{" "}
              </span>
              {cl.clause_text}
            </div>
          ))}
        </div>
      </section>

      {signed && c.certificate ? (
        <section className="mt-8 overflow-hidden rounded-xl border border-success/30 bg-success-bg/20 p-6 space-y-6" id="signature-chancery">
          <div className="flex items-center gap-3 border-b border-success/20 pb-4">
            <Check className="h-6 w-6 text-success" />
            <div>
              <h2 className="text-sm font-bold text-success uppercase tracking-wider">Chancela Digital de Autenticidade</h2>
              <p className="text-[10px] text-muted-foreground font-mono">Serial: {c.certificate.serial}</p>
            </div>
            {c.pdf_url && (
              <a
                href={supabase.storage.from("contract-pdfs").getPublicUrl(c.pdf_url).data.publicUrl}
                download
                target="_blank"
                rel="noreferrer"
                className="ml-auto flex items-center gap-1 bg-success text-white text-[10px] font-bold px-3 py-1.5 rounded hover:bg-success/80 transition-colors"
              >
                <FileCheck className="h-3.5 w-3.5" /> Baixar Contrato Assinado
              </a>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-foreground/80">
            <div className="space-y-3">
              <div className="font-semibold text-muted-foreground uppercase tracking-widest text-[9px]">Signatário</div>
              <div className="font-bold">{c.signatures?.[0]?.signer_name}</div>
              <div>Doc: {c.signatures?.[0]?.signer_document}</div>
              <div>Assinado em: {new Date(c.signed_at!).toLocaleString("pt-BR")}</div>
              <div>IP: {c.signatures?.[0]?.ip}</div>
            </div>

            <div className="space-y-2">
              <div className="font-semibold text-muted-foreground uppercase tracking-widest text-[9px]">Assinatura e Selfie KYC</div>
              {c.signatures?.[0]?.signature_image && (
                <div className="bg-white rounded border border-border p-1 max-w-[120px]">
                  <img
                    src={c.signatures[0].signature_image.startsWith("http") ? c.signatures[0].signature_image : supabase.storage.from("contract-pdfs").getPublicUrl(c.signatures[0].signature_image).data.publicUrl}
                    alt="Assinatura"
                    className="max-h-12 object-contain"
                  />
                </div>
              )}
              {c.signatures?.[0]?.selfie_image && (
                <img
                  src={c.signatures[0].selfie_image.startsWith("http") ? c.signatures[0].selfie_image : supabase.storage.from("contract-pdfs").getPublicUrl(c.signatures[0].selfie_image).data.publicUrl}
                  alt="Selfie KYC"
                  className="h-16 w-16 rounded-full object-cover border border-border"
                />
              )}
            </div>

            <div className="flex flex-col items-center md:items-end justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`${window.location.origin}/verify/${c.certificate.serial}`)}`}
                alt="QR Code de Verificação"
                className="h-20 w-20 border border-border rounded p-1 bg-white"
              />
              <span className="text-[8px] text-muted-foreground mt-1 text-center font-mono">Escaneie para validar integridade</span>
            </div>
          </div>
          
          {c.signatures?.[0]?.video_kyc && (
            <div className="border-t border-success/10 pt-4">
              <div className="font-semibold text-muted-foreground uppercase tracking-widest text-[9px] mb-2">Vídeo KYC (Custódia Legal)</div>
              <video
                src={c.signatures[0].video_kyc.startsWith("http") ? c.signatures[0].video_kyc : supabase.storage.from("contract-pdfs").getPublicUrl(c.signatures[0].video_kyc).data.publicUrl}
                controls
                className="h-28 rounded-lg border border-border bg-black max-w-[200px]"
              />
            </div>
          )}
        </section>
      ) : (
        <section
          className="overflow-hidden rounded-xl bg-surface  ring-1 ring-border/50"
          id="interactive-signature-form"
        >
          <div className="border-b border-border/50 bg-surface-alt/30 px-5 py-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Verificação e Assinatura Legal
            </h2>
          </div>
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field label="Nome Completo do Signatário">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="João da Silva"
                />
              </Field>
              <Field label="Documento (CPF / RG / Passaporte)">
                <Input
                  value={doc}
                  onChange={(e) => setDoc(e.target.value)}
                  placeholder="000.000.000-00"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Documento Oficial (Frente)" hint="RG ou CNH (lado da foto)">
                {documentFront ? (
                  <div className="relative inline-block mt-1">
                    <img src={documentFront} alt="Doc Frente" className="h-24 rounded border border-border object-cover" />
                    <button type="button" onClick={() => setDocumentFront(null)} className="absolute -top-1 -right-1 rounded-full bg-danger p-1 text-white text-[10px] w-5 h-5 flex items-center justify-center">x</button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-24 rounded-lg border border-dashed border-border bg-surface-alt/10 cursor-pointer hover:bg-surface-alt/20 transition-colors">
                    <Upload className="h-4 w-4 text-muted-foreground mb-1" />
                    <span className="text-[10px] font-semibold text-muted-foreground">Selecionar Frente</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      if (e.target.files && e.target.files[0]) handleDocumentUpload(e.target.files[0], "front");
                    }} />
                  </label>
                )}
              </Field>
              
              <Field label="Documento Oficial (Verso)" hint="RG ou CNH (lado das informações)">
                {documentBack ? (
                  <div className="relative inline-block mt-1">
                    <img src={documentBack} alt="Doc Verso" className="h-24 rounded border border-border object-cover" />
                    <button type="button" onClick={() => setDocumentBack(null)} className="absolute -top-1 -right-1 rounded-full bg-danger p-1 text-white text-[10px] w-5 h-5 flex items-center justify-center">x</button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-24 rounded-lg border border-dashed border-border bg-surface-alt/10 cursor-pointer hover:bg-surface-alt/20 transition-colors">
                    <Upload className="h-4 w-4 text-muted-foreground mb-1" />
                    <span className="text-[10px] font-semibold text-muted-foreground">Selecionar Verso</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      if (e.target.files && e.target.files[0]) handleDocumentUpload(e.target.files[0], "back");
                    }} />
                  </label>
                )}
              </Field>
            </div>

            <Field label="Assinatura Digital (Desenhe no quadro abaixo)">
              <div className="relative overflow-hidden rounded-xl border border-border/60 bg-surface-alt/10">
                <canvas
                  ref={sigRef}
                  width={600}
                  height={180}
                  className="touch-none w-full cursor-crosshair"
                  onPointerDown={startDraw}
                  onPointerMove={moveDraw}
                  onPointerUp={endDraw}
                  onPointerLeave={endDraw}
                />
                <button
                  type="button"
                  onClick={clearSig}
                  className="absolute bottom-2 right-2 rounded-md bg-surface px-2 py-1 text-[10px] font-semibold text-muted-foreground  hover:text-danger transition-colors"
                >
                  Limpar Canvas
                </button>
              </div>
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Foto de Rosto (Selfie KYC)">
                {selfie ? (
                  <div className="relative inline-block">
                    <img
                      src={selfie}
                      alt="selfie de verificação"
                      className="h-24 w-24 rounded-full border-4 border-surface  object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setSelfie(null)}
                      className="absolute bottom-0 right-0 rounded-full bg-danger p-1.5 text-white  hover:bg-danger/80"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-start gap-3">
                    <div className="text-[10px] text-muted-foreground">
                      Para garantir a autenticidade, tire uma foto do seu rosto.
                    </div>
                    <GhostButton
                      type="button"
                      onClick={takeSelfie}
                      className="rounded-full border border-border/50 bg-surface text-xs h-9"
                    >
                      📷 Tirar Selfie
                    </GhostButton>
                  </div>
                )}
              </Field>

              <Field label="Vídeo de Identificação (KYC)" hint="Grave 4s lendo seu nome ou envie o arquivo">
                <div className="flex flex-col items-start gap-2">
                  {videoKyc ? (
                    <div className="relative inline-block">
                      <video src={videoKyc} controls className="h-24 rounded border border-border bg-black max-w-[160px]" />
                      <button type="button" onClick={() => { setVideoKyc(null); setVideoBlob(null); }} className="absolute -top-1.5 -right-1.5 rounded-full bg-danger p-1 text-white text-[10px] w-5 h-5 flex items-center justify-center">x</button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {recording ? (
                        <div className="flex flex-col items-center justify-center border border-border rounded-lg p-2 bg-black/5">
                          <video ref={videoRef} autoPlay playsInline muted className="h-16 w-24 rounded bg-black object-cover" />
                          <span className="text-[8px] text-danger animate-pulse font-semibold mt-1">● Gravando (4s)...</span>
                        </div>
                      ) : (
                        <>
                          <GhostButton type="button" onClick={startVideoRecording} className="h-9 text-xs font-semibold rounded-full border border-border gap-1.5">
                            <Video className="h-4 w-4" /> Gravar Vídeo
                          </GhostButton>
                          
                          <label className="flex items-center justify-center px-3 h-9 rounded-full border border-dashed border-border bg-surface-alt/10 cursor-pointer hover:bg-surface-alt/20 transition-colors text-xs font-semibold text-muted-foreground gap-1.5">
                            <Upload className="h-4 w-4" /> Enviar Vídeo
                            <input type="file" accept="video/*" className="hidden" onChange={(e) => {
                              if (e.target.files && e.target.files[0]) handleVideoUpload(e.target.files[0]);
                            }} />
                          </label>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </Field>
            </div>

            <div className="border-t border-border/50 pt-5 mt-5">
              <PrimaryButton
                disabled={signing}
                onClick={sign}
                className="w-full py-6 text-sm font-bold uppercase tracking-widest"
              >
                {signing ? "Processando Chancelas…" : "Li, concordo e assino o contrato"}
              </PrimaryButton>
              <p className="mt-3 text-center text-[10px] text-muted-foreground">
                Ao clicar no botão acima, você concorda com a validade jurídica desta assinatura
                digital, atrelada ao seu IP, Dispositivo e biometria facial/vídeo, nos termos da MP
                2.200-2/2001.
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="rounded-lg border border-border bg-surface p-8 text-center">{children}</div>
    </div>
  );
}
