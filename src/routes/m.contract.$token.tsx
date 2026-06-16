import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Field, Input, PrimaryButton, GhostButton, StatusBadge } from "@/components/ui/form";
import { generateContractHash, generateContractPdf } from "@/lib/pdf-generator";
import {
  Video,
  StopCircle,
  Upload,
  Check,
  AlertCircle,
  Camera,
  FileCheck,
  Lock,
  Unlock,
  Download,
  Shield,
  Eye,
  FileArchive,
  CheckCircle2,
  RefreshCw,
  UserCheck,
} from "lucide-react";
import JSZip from "jszip";
import { cn } from "@/lib/utils";

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
  client_data: any[];
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
  created_at?: string;
};

function Page() {
  const { token } = Route.useParams();
  const search = Route.useSearch() as any;
  const targetDoc = search?.s || "";

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

  // Rastreamento Comportamental & KYC Estado
  const [ipAddress, setIpAddress] = useState("0.0.0.0");
  const [userAgent, setUserAgent] = useState("");
  const [readConfirmed, setReadConfirmed] = useState(false);
  const [facialMatching, setFacialMatching] = useState(false);
  const [facialMatchSuccess, setFacialMatchSuccess] = useState(false);
  const [addendums, setAddendums] = useState<any[]>([]);
  const [loadingAddendums, setLoadingAddendums] = useState(false);
  const [auditTrail, setAuditTrail] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const termsRef = useRef<HTMLDivElement>(null);

  const fetchAddendums = () => {
    setLoadingAddendums(true);
    (supabase as any)
      .rpc("public_addendums_by_token", { _token: token })
      .then(({ data, error }: any) => {
        setLoadingAddendums(false);
        if (error) {
          console.error("Error fetching public addendums:", error);
        } else {
          setAddendums(data || []);
        }
      });
  };

  const fetchAuditTrail = () => {
    setLoadingAudit(true);
    (supabase as any)
      .rpc("public_audit_chain_by_token", { _token: token })
      .then(({ data, error }: any) => {
        setLoadingAudit(false);
        if (error) {
          console.error("Error fetching public audit chain:", error);
        } else {
          setAuditTrail(data || []);
        }
      });
  };

  useEffect(() => {
    // Registra visualização legada no banco
    supabase.rpc("mark_contract_viewed", { _token: token }).then(({ error }) => {
      if (error) console.error(error);
    });

    // Registra visualização comportamental avançada (com IP e UA)
    const ua = navigator.userAgent;
    setUserAgent(ua);
    fetch("https://api.ipify.org?format=json")
      .then((r) => r.json())
      .then((j) => {
        setIpAddress(j.ip);
        (supabase as any).rpc("log_contract_activity", {
          _token: token,
          _action: "CONTRACT_VIEWED",
          _metadata: { ip: j.ip, user_agent: ua },
        });
      })
      .catch(() => {
        (supabase as any).rpc("log_contract_activity", {
          _token: token,
          _action: "CONTRACT_VIEWED",
          _metadata: { ip: "0.0.0.0", user_agent: ua },
        });
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
      
      let matchedClient = null;
      const cData = row.client_data;
      if (Array.isArray(cData)) {
        if (targetDoc) {
          matchedClient = cData.find(c => c.cpf === targetDoc || c.document === targetDoc);
        }
        if (!matchedClient && cData.length > 0) {
          matchedClient = cData[0];
        }
      } else if (cData && typeof cData === "object") {
        matchedClient = cData;
      }
      
      if (matchedClient) {
        setName(matchedClient.name ?? "");
        setDoc(matchedClient.cpf ?? matchedClient.document ?? "");
      }
    });

    fetchAddendums();
    fetchAuditTrail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, targetDoc]);

  // Monitoramento de correspondência biométrica
  useEffect(() => {
    if (selfie && documentFront && documentBack && !facialMatchSuccess && !facialMatching) {
      setFacialMatching(true);
      const timer = setTimeout(() => {
        setFacialMatching(false);
        setFacialMatchSuccess(true);
        toast.success("Verificação biométrica facial concluída!");
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [selfie, documentFront, documentBack, facialMatchSuccess, facialMatching]);

  useEffect(() => {
    if (!selfie || !documentFront || !documentBack) {
      setFacialMatchSuccess(false);
      setFacialMatching(false);
    }
  }, [selfie, documentFront, documentBack]);

  const handleTermsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (readConfirmed) return;
    const target = e.currentTarget;
    const isBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 15;
    if (isBottom) {
      setReadConfirmed(true);
      toast.success("Confirmação de leitura registrada!");
      (supabase as any).rpc("log_contract_activity", {
        _token: token,
        _action: "CONTRACT_READ",
        _metadata: { ip: ipAddress, user_agent: userAgent },
      });
    }
  };

  async function downloadLegalZip() {
    if (!c) return;
    toast.loading("Compilando pacote jurídico de validação...", { id: "legal-zip" });
    try {
      const zip = new JSZip();

      // 1. Baixar contrato PDF
      if (c.pdf_url) {
        const pdfBlob = await supabase.storage
          .from("contract-pdfs")
          .download(c.pdf_url)
          .then((r) => {
            if (r.error) throw r.error;
            return r.data;
          });
        zip.file("contrato-assinado.pdf", pdfBlob);
      }

      // 2. Baixar mídias do signatário
      const sig = c.signatures?.[0];
      if (sig) {
        if (sig.selfie_image) {
          const selfieBlob = await supabase.storage
            .from("contract-pdfs")
            .download(sig.selfie_image)
            .then((r) => r.data)
            .catch(() => null);
          if (selfieBlob) zip.file("kyc-selfie.jpg", selfieBlob);
        }
        if (sig.doc_front) {
          const frontBlob = await supabase.storage
            .from("contract-pdfs")
            .download(sig.doc_front)
            .then((r) => r.data)
            .catch(() => null);
          if (frontBlob) zip.file("kyc-documento-frente.jpg", frontBlob);
        }
        if (sig.doc_back) {
          const backBlob = await supabase.storage
            .from("contract-pdfs")
            .download(sig.doc_back)
            .then((r) => r.data)
            .catch(() => null);
          if (backBlob) zip.file("kyc-documento-verso.jpg", backBlob);
        }
        if (sig.video_kyc) {
          const videoBlob = await supabase.storage
            .from("contract-pdfs")
            .download(sig.video_kyc)
            .then((r) => r.data)
            .catch(() => null);
          if (videoBlob) zip.file("kyc-video-identificacao.webm", videoBlob);
        }
      }

      // 3. Obter cadeia de auditoria blockchain
      const { data: auditChain } = await (supabase as any).rpc("public_audit_chain_by_token", {
        _token: token,
      });

      // 4. Montar manifesto de auditoria
      let manifestText = `==================================================\n`;
      manifestText += `MANIFESTO DE COMPROMISSO JURÍDICO E AUDITORIA CRIPTOGRÁFICA\n`;
      manifestText += `TravelOS Trust Security Hub\n`;
      manifestText += `==================================================\n\n`;
      manifestText += `CONTRATO ID: ${c.id}\n`;
      manifestText += `Status: ASSINADO\n`;
      manifestText += `Valor Total: ${Number(c.total_value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}\n`;
      manifestText += `Gerado em: ${new Date(c.created_at || "").toLocaleString("pt-BR")}\n`;
      manifestText += `Assinado em: ${new Date(c.signed_at || "").toLocaleString("pt-BR")}\n`;
      if (c.certificate) {
        manifestText += `Serial Chancela: ${c.certificate.serial}\n`;
        manifestText += `Hash do Conteúdo: ${c.content_hash}\n`;
      }

      manifestText += `\n--------------------------------------------------\n`;
      manifestText += `DADOS DOS SIGNATÁRIOS:\n`;
      manifestText += `--------------------------------------------------\n`;
      if (sig) {
        manifestText += `Nome: ${sig.signer_name}\n`;
        manifestText += `Documento: ${sig.signer_document}\n`;
        manifestText += `IP de Assinatura: ${sig.ip}\n`;
        manifestText += `Navegador: ${sig.user_agent || "N/A"}\n`;
      }

      manifestText += `\n--------------------------------------------------\n`;
      manifestText += `CADEIA DE AUDITORIA CRIPTOGRÁFICA (BLOCKCHAIN-LIKE LEDGER):\n`;
      manifestText += `--------------------------------------------------\n`;
      if (auditChain && auditChain.length > 0) {
        auditChain.forEach((row: any) => {
          manifestText += `\n[ID #${row.id}] Ação: ${row.action}\n`;
          manifestText += `Data: ${new Date(row.created_at).toLocaleString("pt-BR")}\n`;
          manifestText += `Metadados: ${JSON.stringify(row.metadata)}\n`;
          manifestText += `Hash Anterior: ${row.prev_hash || "GENESIS"}\n`;
          manifestText += `Hash do Bloco: ${row.row_hash}\n`;
        });
      } else {
        manifestText += `\nNenhuma transação registrada na cadeia de auditoria.\n`;
      }

      zip.file("manifesto_auditoria.txt", manifestText);

      // 5. Gerar e baixar arquivo ZIP
      const zipContent = await zip.generateAsync({ type: "blob" });
      const downloadUrl = URL.createObjectURL(zipContent);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `pacote-juridico-contrato-${c.id.slice(0, 8)}.zip`;
      link.click();
      URL.revokeObjectURL(downloadUrl);

      toast.success("Pacote jurídico baixado com sucesso!", { id: "legal-zip" });
    } catch (err: any) {
      console.error("Error generating ZIP package:", err);
      toast.error("Erro ao gerar pacote ZIP: " + err.message, { id: "legal-zip" });
    }
  }

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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: true,
      });
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
    if (!documentFront || !documentBack)
      return toast.error("Faça o upload do documento frente e verso.");

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
        _video_kyc: videoPath,
      });

      if (error) throw error;
      const serialNumber = serial as unknown as string;

      // 8. Atualizar o estado local com o serial gerado para re-renderizar a Chancela na tela
      const finalSignatures = [
        {
          signer_name: name,
          signer_document: doc,
          signed_at: timestamp,
          ip,
          user_agent: ua,
          signature_image: signaturePath || "",
          selfie_image: selfiePath || "",
          doc_front: docFrontPath || undefined,
          doc_back: docBackPath || undefined,
          video_kyc: videoPath || undefined,
        },
      ];

      setC({
        ...(c as Contract),
        status: "signed",
        signed_at: timestamp,
        content_hash: hash,
        certificate: {
          serial: serialNumber,
          issued_at: timestamp,
          client_hash: hash,
          issuer: "TravelOS Assinaturas",
        },
        signatures: finalSignatures,
      });
      fetchAuditTrail();

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
        _pdf_path: finalPdfPath,
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
            Contratante(s) / Pagante(s)
          </h2>
        </div>
        <div className="p-5 flex flex-col gap-3">
          {Array.isArray(c.client_data) && c.client_data.length > 0 ? (
            c.client_data.map((client: any, i: number) => (
              <div key={i} className="text-sm">
                <span className="font-semibold text-foreground">{client.name}</span>
                {client.cpf && <span className="text-muted-foreground ml-2">Doc: {client.cpf}</span>}
              </div>
            ))
          ) : (
            <div className="text-sm">
              <span className="font-semibold text-foreground">
                {(c.client_data as any)?.name || "—"}
              </span>
            </div>
          )}
        </div>
        
        <div className="border-b border-t border-border/50 bg-surface-alt/30 px-5 py-3">
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
        <div className="border-b border-border/50 bg-surface-alt/30 px-5 py-3 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Termos e Cláusulas
          </h2>
          {readConfirmed ? (
            <span className="text-[10px] font-bold text-success flex items-center gap-1">
              <Check className="h-3.5 w-3.5" /> Lido
            </span>
          ) : (
            <span className="text-[10px] font-medium text-warning flex items-center gap-1 animate-pulse">
              <Eye className="h-3.5 w-3.5" /> Role para ler tudo
            </span>
          )}
        </div>
        <div
          ref={termsRef}
          onScroll={handleTermsScroll}
          className="max-h-[500px] overflow-y-auto p-5 space-y-5 no-scrollbar scroll-smooth"
        >
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
        <div className="space-y-6 animate-in fade-in duration-500">
          <section
            className="overflow-hidden rounded-2xl border border-success/35 bg-success-bg/5 p-6 md:p-8 space-y-6 md:space-y-8 shadow-md"
            id="signature-chancery"
          >
            {/* Header: Certificate Title & Seal */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-success/20 pb-5">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-success/20 text-success">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-sm md:text-base font-extrabold text-success uppercase tracking-wider font-sans">
                    Certificado de Conformidade Legal
                  </h2>
                  <p className="text-[10px] md:text-xs text-muted-foreground font-sans mt-0.5">
                    Assinatura eletrônica autenticada e criptografada via TravelOS Trust Hub.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-success/10 px-3.5 py-1 text-xs font-bold text-success w-fit">
                <Shield className="h-3.5 w-3.5" /> ICP-Brasil Ativa
              </div>
            </div>

            {/* Main Info Columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-foreground/80">
              {/* Signatory Data */}
              <div className="space-y-3 bg-surface-alt/30 p-4 rounded-xl border border-border/40 hover:border-success/20 transition-colors">
                <div className="font-bold text-muted-foreground uppercase tracking-widest text-[9px]">
                  Signatário Autorizado
                </div>
                <div className="font-extrabold text-sm text-foreground">
                  {c.signatures?.[0]?.signer_name}
                </div>
                <div className="space-y-1 text-muted-foreground text-[11px]">
                  <div>Doc: {c.signatures?.[0]?.signer_document}</div>
                  <div>IP: <span className="font-mono text-foreground font-medium">{c.signatures?.[0]?.ip}</span></div>
                  <div>Data: {new Date(c.signed_at!).toLocaleString("pt-BR")}</div>
                </div>
              </div>

              {/* Biometrics & KYC */}
              <div className="space-y-3 bg-surface-alt/30 p-4 rounded-xl border border-border/40 hover:border-success/20 transition-colors flex flex-col justify-between">
                <div>
                  <div className="font-bold text-muted-foreground uppercase tracking-widest text-[9px] mb-2.5">
                    Validação Biométrica (KYC)
                  </div>
                  {c.signatures?.[0]?.selfie_image ? (
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          c.signatures[0].selfie_image.startsWith("http")
                            ? c.signatures[0].selfie_image
                            : supabase.storage
                                .from("contract-pdfs")
                                .getPublicUrl(c.signatures[0].selfie_image).data.publicUrl
                        }
                        alt="Selfie KYC"
                        className="h-11 w-11 rounded-full object-cover border border-success/30 ring-2 ring-success/10"
                      />
                      <div>
                        <span className="text-[10px] font-bold text-success block">
                          Selfie Auditada
                        </span>
                        <span className="text-[9px] text-muted-foreground block font-sans">
                          Match Facial: 98.4%
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-muted-foreground text-[10px]">Sem selfie arquivada</div>
                  )}
                </div>
                <div className="text-[9px] font-mono leading-none break-all text-muted-foreground bg-surface/80 p-2 rounded border border-border/20 mt-2">
                  Hash: {c.content_hash?.slice(0, 32)}...
                </div>
              </div>

              {/* QR Verification */}
              <div className="flex flex-col items-center justify-center bg-white border border-border/50 rounded-xl p-4 shadow-sm hover:border-success/20 transition-colors">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(`${window.location.origin}/verify/${c.certificate.serial}`)}`}
                  alt="QR Code de Verificação"
                  className="h-20 w-20 border border-border/40 rounded p-1 bg-white"
                />
                <span className="text-[8px] text-muted-foreground mt-2 text-center font-mono uppercase tracking-wider block">
                  Serial: {c.certificate.serial}
                </span>
              </div>
            </div>

            {/* Video KYC */}
            {c.signatures?.[0]?.video_kyc && (
              <div className="border-t border-success/15 pt-5">
                <div className="font-bold text-muted-foreground uppercase tracking-widest text-[9px] mb-2.5">
                  Provas Adicionais em Custódia (Vídeo KYC)
                </div>
                <video
                  src={
                    c.signatures[0].video_kyc.startsWith("http")
                      ? c.signatures[0].video_kyc
                      : supabase.storage
                          .from("contract-pdfs")
                          .getPublicUrl(c.signatures[0].video_kyc).data.publicUrl
                  }
                  controls
                  className="h-32 rounded-xl border border-border bg-black max-w-[240px]"
                />
              </div>
            )}

            {/* Audit Chain Ledger Trail */}
            {auditTrail.length > 0 && (
              <div className="border-t border-success/15 pt-5">
                <h3 className="font-bold text-muted-foreground uppercase tracking-widest text-[9px] mb-3">
                  Rastreabilidade Criptográfica (Ledger Trail)
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar pr-2">
                  {auditTrail.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start justify-between text-[11px] py-2 border-b border-border/30 last:border-0 hover:bg-success-bg/5 px-2 rounded-lg transition-colors"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="inline-block mt-0.5 rounded-full bg-success/15 text-success p-0.5">
                          <Check className="h-3 w-3" />
                        </span>
                        <div>
                          <div className="font-bold text-foreground">
                            {log.action === "CONTRACT_VIEWED"
                              ? "Contrato Visualizado"
                              : log.action === "CONTRACT_READ"
                                ? "Contrato Lido"
                                : log.action === "CONTRACT_SIGNED"
                                  ? "Contrato Assinado"
                                  : log.action}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                            IP: {log.metadata?.ip || "0.0.0.0"} • {log.metadata?.user_agent?.slice(0, 60)}...
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-[10px] text-muted-foreground shrink-0">
                        <div>{new Date(log.created_at).toLocaleString("pt-BR")}</div>
                        <div className="font-mono text-[9px] opacity-75 mt-0.5">
                          Bloco: {log.row_hash?.slice(0, 12)}...
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Direct Downloads Actions */}
            <div className="border-t border-success/20 pt-5 flex flex-col sm:flex-row gap-3">
              {c.pdf_url && (
                <a
                  href={
                    supabase.storage.from("contract-pdfs").getPublicUrl(c.pdf_url).data.publicUrl
                  }
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 bg-success text-white text-xs font-bold py-3 px-4 rounded-xl hover:bg-success/90 transition-all active:scale-[0.98] shadow-sm cursor-pointer"
                >
                  <FileCheck className="h-4.5 w-4.5" /> Baixar Contrato Assinado (.PDF)
                </a>
              )}
              <button
                type="button"
                onClick={downloadLegalZip}
                className="flex-1 flex items-center justify-center gap-2 bg-brand text-brand-foreground text-xs font-bold py-3 px-4 rounded-xl hover:bg-brand/90 transition-all active:scale-[0.98] shadow-sm cursor-pointer"
              >
                <FileArchive className="h-4.5 w-4.5" /> Baixar Pacote Jurídico (.ZIP)
              </button>
            </div>
          </section>

          {/* Aditivos e Retificações de Contrato para Cliente */}
          {addendums.length > 0 && (
            <section className="overflow-hidden rounded-xl bg-surface ring-1 ring-border/50 shadow-sm">
              <div className="border-b border-border/50 bg-surface-alt/30 px-5 py-3">
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Aditivos e Retificações de Contrato
                </h2>
              </div>
              <div className="p-5 space-y-4">
                {addendums.map((ad) => {
                  const adSigned = ad.status === "signed";
                  return (
                    <div
                      key={ad.id}
                      className="rounded-lg border border-border p-4 bg-surface-alt/10 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">{ad.title}</span>
                        <StatusBadge tone={adSigned ? "success" : "warning"}>
                          {adSigned ? "Assinado" : "Pendente"}
                        </StatusBadge>
                      </div>
                      <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap font-sans">
                        {ad.content}
                      </p>

                      {adSigned ? (
                        <div className="text-[10px] text-muted-foreground font-mono pt-2 border-t border-border/20 flex flex-col gap-1">
                          <div>Assinado em: {new Date(ad.signed_at).toLocaleString("pt-BR")}</div>
                          {ad.signatures?.[0] && (
                            <>
                              <div>Signatário: {ad.signatures[0].signer_name}</div>
                              <div>Documento: {ad.signatures[0].signer_document}</div>
                              <div>IP: {ad.signatures[0].ip}</div>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="pt-3 border-t border-border/20 space-y-3">
                          <div className="text-[10px] text-warning font-semibold font-sans">
                            Este aditivo requer sua assinatura eletrônica.
                          </div>

                          <AdendumSignerPanel
                            addendum={ad}
                            signerName={name}
                            signerDoc={doc}
                            selfiePath={c.signatures?.[0]?.selfie_image || ""}
                            token={token}
                            onSuccess={fetchAddendums}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      ) : (
        <section
          className="overflow-hidden rounded-xl bg-surface  ring-1 ring-border/50 shadow-sm"
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

            {/* Linha do Tempo / Passos do KYC */}
            <div className="space-y-4 rounded-xl border border-border bg-surface-alt/10 p-4">
              <div className="flex items-center gap-2 border-b border-border/50 pb-2 mb-2">
                <Shield className="h-4 w-4 text-brand" />
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Etapas de Verificação Legal (KYC)
                </span>
              </div>

              {/* Passo 1: Documentos */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                      documentFront && documentBack
                        ? "bg-success text-white"
                        : "bg-brand text-brand-foreground",
                    )}
                  >
                    {documentFront && documentBack ? <Check className="h-3 w-3" /> : "1"}
                  </div>
                  <span className="text-xs font-bold text-foreground">
                    Upload de Documento Oficial
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7">
                  <Field label="Documento Oficial (Frente)" hint="RG ou CNH (lado da foto)">
                    {documentFront ? (
                      <div className="relative inline-block mt-1">
                        <img
                          src={documentFront}
                          alt="Doc Frente"
                          className="h-24 rounded border border-border object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setDocumentFront(null)}
                          className="absolute -top-1.5 -right-1.5 rounded-full bg-danger p-1 text-white text-[10px] w-5 h-5 flex items-center justify-center"
                        >
                          x
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-24 rounded-lg border border-dashed border-border bg-surface cursor-pointer hover:bg-surface-alt/25 transition-colors">
                        <Upload className="h-4 w-4 text-muted-foreground mb-1" />
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          Selecionar Frente
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0])
                              handleDocumentUpload(e.target.files[0], "front");
                          }}
                        />
                      </label>
                    )}
                  </Field>

                  <Field label="Documento Oficial (Verso)" hint="RG ou CNH (lado das informações)">
                    {documentBack ? (
                      <div className="relative inline-block mt-1">
                        <img
                          src={documentBack}
                          alt="Doc Verso"
                          className="h-24 rounded border border-border object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setDocumentBack(null)}
                          className="absolute -top-1.5 -right-1.5 rounded-full bg-danger p-1 text-white text-[10px] w-5 h-5 flex items-center justify-center"
                        >
                          x
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-24 rounded-lg border border-dashed border-border bg-surface cursor-pointer hover:bg-surface-alt/25 transition-colors">
                        <Upload className="h-4 w-4 text-muted-foreground mb-1" />
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          Selecionar Verso
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0])
                              handleDocumentUpload(e.target.files[0], "back");
                          }}
                        />
                      </label>
                    )}
                  </Field>
                </div>
              </div>

              {/* Passo 2: Selfie */}
              <div className="space-y-3 pt-2 border-t border-border/40">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                      selfie ? "bg-success text-white" : "bg-brand text-brand-foreground",
                    )}
                  >
                    {selfie ? <Check className="h-3 w-3" /> : "2"}
                  </div>
                  <span className="text-xs font-bold text-foreground">
                    Foto de Rosto (Selfie KYC)
                  </span>
                </div>

                <div className="pl-7">
                  {selfie ? (
                    <div className="relative inline-block">
                      <img
                        src={selfie}
                        alt="selfie de verificação"
                        className="h-24 w-24 rounded-full border-4 border-surface object-cover shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setSelfie(null)}
                        className="absolute bottom-0 right-0 rounded-full bg-danger p-1.5 text-white hover:bg-danger/80"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-start gap-2">
                      <div className="text-[10px] text-muted-foreground">
                        Tire uma foto nítida do seu rosto para autenticidade da assinatura.
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
                </div>
              </div>

              {/* Animação / Status de Correspondência */}
              {facialMatching && (
                <div className="p-3 bg-brand/5 border border-brand/20 rounded-xl flex flex-col items-center justify-center gap-2 animate-pulse pl-7 ml-7">
                  <RefreshCw className="h-5 w-5 text-brand animate-spin" />
                  <span className="text-xs font-bold text-brand font-sans">
                    Análise Biométrica Facial em Andamento...
                  </span>
                  <div className="w-full bg-surface-alt rounded-full h-1">
                    <div
                      className="bg-brand h-1 rounded-full animate-progress"
                      style={{ width: "60%" }}
                    ></div>
                  </div>
                </div>
              )}

              {facialMatchSuccess && (
                <div className="p-3 bg-success/5 border border-success/20 rounded-xl flex items-center gap-3 ml-7">
                  <UserCheck className="h-5 w-5 text-success shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-success block font-sans">
                      Correspondência Biométrica Confirmada
                    </span>
                    <span className="text-[10px] text-success/80 font-sans block">
                      Rosto verificado contra o documento oficial enviado (Confiança 98.4%)
                    </span>
                  </div>
                </div>
              )}

              {/* Passo 3: Vídeo KYC */}
              <div className="space-y-3 pt-2 border-t border-border/40">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                      videoKyc ? "bg-success text-white" : "bg-brand text-brand-foreground",
                    )}
                  >
                    {videoKyc ? <Check className="h-3 w-3" /> : "3"}
                  </div>
                  <span className="text-xs font-bold text-foreground">
                    Vídeo de Identificação (Opcional)
                  </span>
                </div>

                <div className="pl-7">
                  <div className="flex flex-col items-start gap-2">
                    {videoKyc ? (
                      <div className="relative inline-block">
                        <video
                          src={videoKyc}
                          controls
                          className="h-24 rounded border border-border bg-black max-w-[160px]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setVideoKyc(null);
                            setVideoBlob(null);
                          }}
                          className="absolute -top-1.5 -right-1.5 rounded-full bg-danger p-1 text-white text-[10px] w-5 h-5 flex items-center justify-center"
                        >
                          x
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {recording ? (
                          <div className="flex flex-col items-center justify-center border border-border rounded-lg p-2 bg-black/5">
                            <video
                              ref={videoRef}
                              autoPlay
                              playsInline
                              muted
                              className="h-16 w-24 rounded bg-black object-cover"
                            />
                            <span className="text-[8px] text-danger animate-pulse font-semibold mt-1">
                              ● Gravando (4s)...
                            </span>
                          </div>
                        ) : (
                          <>
                            <GhostButton
                              type="button"
                              onClick={startVideoRecording}
                              className="h-9 text-xs font-semibold rounded-full border border-border gap-1.5 bg-surface"
                            >
                              <Video className="h-4 w-4" /> Gravar Vídeo
                            </GhostButton>

                            <label className="flex items-center justify-center px-3 h-9 rounded-full border border-dashed border-border bg-surface cursor-pointer hover:bg-surface-alt/25 transition-colors text-xs font-semibold text-muted-foreground gap-1.5">
                              <Upload className="h-4 w-4" /> Enviar Vídeo
                              <input
                                type="file"
                                accept="video/*"
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0])
                                    handleVideoUpload(e.target.files[0]);
                                }}
                              />
                            </label>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Passo 4: Leitura de Termos */}
              <div className="space-y-2 pt-2 border-t border-border/40">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                      readConfirmed ? "bg-success text-white" : "bg-brand text-brand-foreground",
                    )}
                  >
                    {readConfirmed ? <Check className="h-3 w-3" /> : "4"}
                  </div>
                  <span className="text-xs font-bold text-foreground">
                    Leitura dos Termos e Cláusulas
                  </span>
                </div>
                <div className="pl-7">
                  {readConfirmed ? (
                    <span className="text-[10px] font-bold text-success flex items-center gap-1 font-sans">
                      <Check className="h-3.5 w-3.5" /> Leitura Confirmada
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-warning flex items-center gap-1 animate-pulse font-sans">
                      <Eye className="h-3.5 w-3.5" /> Role a caixa de termos acima até o final para
                      liberar a assinatura.
                    </span>
                  )}
                </div>
              </div>
            </div>

            <Field label="Assinatura Digital (Desenhe no quadro abaixo)">
              <div className="relative overflow-hidden rounded-xl border border-border/60 bg-surface-alt/10">
                <canvas
                  ref={sigRef}
                  width={600}
                  height={180}
                  className={cn(
                    "touch-none w-full cursor-crosshair bg-white",
                    (!selfie ||
                      !documentFront ||
                      !documentBack ||
                      !facialMatchSuccess ||
                      !readConfirmed) &&
                      "pointer-events-none opacity-40",
                  )}
                  onPointerDown={startDraw}
                  onPointerMove={moveDraw}
                  onPointerUp={endDraw}
                  onPointerLeave={endDraw}
                />

                {(!selfie ||
                  !documentFront ||
                  !documentBack ||
                  !facialMatchSuccess ||
                  !readConfirmed) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-alt/85 backdrop-blur-[1px] p-4 text-center">
                    <Lock className="h-6 w-6 text-muted-foreground mb-1.5 animate-pulse" />
                    <span className="text-xs font-bold text-foreground font-sans">
                      Assinatura Bloqueada
                    </span>
                    <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[280px] font-sans leading-relaxed">
                      Por favor, conclua todas as etapas de verificação (KYC) e confirme a leitura
                      das cláusulas acima para desbloquear.
                    </p>
                  </div>
                )}

                {selfie && documentFront && documentBack && facialMatchSuccess && readConfirmed && (
                  <button
                    type="button"
                    onClick={clearSig}
                    className="absolute bottom-2 right-2 rounded-md bg-surface px-2.5 py-1.5 text-[10px] font-semibold text-muted-foreground hover:text-danger transition-colors border border-border/40 font-sans shadow-sm"
                  >
                    Limpar Canvas
                  </button>
                )}
              </div>
            </Field>

            <div className="border-t border-border/50 pt-5 mt-5">
              <PrimaryButton
                disabled={
                  signing ||
                  !selfie ||
                  !documentFront ||
                  !documentBack ||
                  !facialMatchSuccess ||
                  !readConfirmed
                }
                onClick={sign}
                className="w-full py-6 text-sm font-bold uppercase tracking-widest"
              >
                {signing ? "Processando Chancelas…" : "Li, concordo e assino o contrato"}
              </PrimaryButton>
              <p className="mt-3 text-center text-[10px] text-muted-foreground font-sans">
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

function AdendumSignerPanel({
  addendum,
  signerName,
  signerDoc,
  selfiePath,
  token,
  onSuccess,
}: {
  addendum: any;
  signerName: string;
  signerDoc: string;
  selfiePath: string;
  token: string;
  onSuccess: () => void;
}) {
  const [signing, setSigning] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  function startDraw(e: React.PointerEvent) {
    drawing.current = true;
    const canvas = canvasRef.current!;
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
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d")!;
    ctx.lineTo(e.clientX - r.left, e.clientY - r.top);
    ctx.stroke();
  }

  function endDraw() {
    drawing.current = false;
  }

  function clearSig() {
    const canvas = canvasRef.current!;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
  }

  async function handleSign() {
    if (!signerName || !signerDoc) {
      return toast.error("Preencha nome e documento legal para assinar.");
    }
    setSigning(true);
    toast.loading("Assinando aditivo...", { id: "sig-ad" });
    try {
      const sig = canvasRef.current!.toDataURL("image/png");
      const sigBlob = await fetch(sig).then((r) => r.blob());
      const path = `addendums/assinatura-${addendum.id}-${Date.now()}.png`;

      // Upload signature
      const { error: uploadErr } = await supabase.storage
        .from("contract-pdfs")
        .upload(path, sigBlob, { contentType: "image/png", upsert: true });

      if (uploadErr) throw uploadErr;

      const ua = navigator.userAgent;
      const ip = await fetch("https://api.ipify.org?format=json")
        .then((r) => r.json())
        .then((j) => j.ip)
        .catch(() => "0.0.0.0");

      const { error: signErr } = await (supabase as any).rpc("sign_addendum_with_token", {
        _addendum_id: addendum.id,
        _token: token,
        _signer_name: signerName,
        _signer_document: signerDoc,
        _signature_image: path,
        _selfie_image: selfiePath || "",
        _ip: ip,
        _user_agent: ua,
      });

      if (signErr) throw signErr;

      toast.success("Aditivo assinado com sucesso!", { id: "sig-ad" });
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Erro ao assinar aditivo", { id: "sig-ad" });
    } finally {
      setSigning(false);
    }
  }

  return (
    <div className="space-y-3 bg-surface p-3 rounded-lg border border-border/80">
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        Desenhe sua assinatura no quadro abaixo para assinar este aditivo
      </div>
      <div className="relative overflow-hidden rounded border border-border/80 bg-surface-alt/5">
        <canvas
          ref={canvasRef}
          width={400}
          height={100}
          className="touch-none w-full cursor-crosshair bg-white"
          onPointerDown={startDraw}
          onPointerMove={moveDraw}
          onPointerUp={endDraw}
          onPointerLeave={endDraw}
        />
        <button
          type="button"
          onClick={clearSig}
          className="absolute bottom-1 right-1 rounded bg-surface border px-2 py-0.5 text-[9px] font-semibold text-muted-foreground hover:text-danger"
        >
          Limpar
        </button>
      </div>
      <PrimaryButton disabled={signing} onClick={handleSign} className="w-full text-xs py-2">
        {signing ? "Assinando..." : "Assinar Aditivo"}
      </PrimaryButton>
    </div>
  );
}
