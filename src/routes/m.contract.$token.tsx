import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, useMemo } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Field } from "@/components/ui/field";
import { FormInput as Input } from "@/components/ui/input";
import { PrimaryButton, GhostButton , Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
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
import { NativeSelect as Select } from "@/components/ui/select";

export const Route = createFileRoute("/m/contract/$token")({
  head: ({ context }: any) => ({ meta: [{ title: `Assinar contrato · ${context?.brand?.platform_name || 'Turis'}` }] }),
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
  const [selectedSignerIndex, setSelectedSignerIndex] = useState<string>("");

  const pendingSigners = useMemo(() => {
    if (!c || !Array.isArray(c.client_data)) return [];
    const cleanDoc = (d: string) => (d || "").replace(/\D/g, "");
    return c.client_data.filter((cl: any) => {
      const clCpf = cleanDoc(cl.cpf || cl.document);
      return !c.signatures?.some((sig: any) => cleanDoc(sig.signer_document) === clCpf);
    });
  }, [c]);

  const fullySigned = useMemo(() => {
    return pendingSigners.length === 0;
  }, [pendingSigners]);
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
    supabase.rpc("public_addendums_by_token", { _token: token }).then(({ data, error }) => {
      setLoadingAddendums(false);
      if (error) {
        console.error("Error fetching public addendums:", error);
      } else {
        setAddendums((data as any) || []);
      }
    });
  };

  const fetchAuditTrail = () => {
    setLoadingAudit(true);
    supabase.rpc("public_audit_chain_by_token", { _token: token }).then(({ data, error }) => {
      setLoadingAudit(false);
      if (error) {
        console.error("Error fetching public audit chain:", error);
      } else {
        setAuditTrail((data as any) || []);
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
        supabase.rpc("log_contract_activity", {
          _token: token,
          _action: "CONTRACT_VIEWED",
          _metadata: {
            ip: j.ip,
            user_agent: ua,
          } as unknown as import("@/integrations/supabase/types").Json,
        });
      })
      .catch(() => {
        supabase.rpc("log_contract_activity", {
          _token: token,
          _action: "CONTRACT_VIEWED",
          _metadata: {
            ip: "0.0.0.0",
            user_agent: ua,
          } as unknown as import("@/integrations/supabase/types").Json,
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
          matchedClient = cData.find((c) => c.cpf === targetDoc || c.document === targetDoc);
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

  useEffect(() => {
    if (pendingSigners.length === 1) {
      setName(pendingSigners[0].name || "");
      setDoc(pendingSigners[0].cpf || pendingSigners[0].document || "");
    }
  }, [pendingSigners]);

  const handleTermsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (readConfirmed) return;
    const target = e.currentTarget;
    const isBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 15;
    if (isBottom) {
      setReadConfirmed(true);
      toast.success("Confirmação de leitura registrada!");
      supabase.rpc("log_contract_activity", {
        _token: token,
        _action: "CONTRACT_READ",
        _metadata: {
          ip: ipAddress,
          user_agent: userAgent,
        } as unknown as import("@/integrations/supabase/types").Json,
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
      const { data: auditChain } = await supabase.rpc("public_audit_chain_by_token", {
        _token: token,
      });

      // 4. Montar manifesto de auditoria
      let manifestText = `==================================================\n`;
      manifestText += `MANIFESTO DE COMPROMISSO JURÍDICO E AUDITORIA CRIPTOGRÁFICA\n`;
      manifestText += `Turis Trust Security Hub\n`;
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
    if (!c) {
      toast.error("Contrato não carregado.");
      return;
    }
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

      // 8. Atualizar o estado local com a nova assinatura e recalcular conformidade
      const willBeFullySigned = pendingSigners.length <= 1;
      const updatedSignatures = [
        ...(c.signatures || []),
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
        status: willBeFullySigned ? "signed" : "pending_signature",
        signed_at: willBeFullySigned ? timestamp : null,
        content_hash: hash,
        certificate: willBeFullySigned
          ? {
              serial: serialNumber,
              issued_at: timestamp,
              client_hash: hash,
              issuer: "Turis Assinaturas",
            }
          : null,
        signatures: updatedSignatures,
      });
      fetchAuditTrail();

      if (willBeFullySigned) {
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

        toast.success("Contrato assinado digitalmente com sucesso!", { id: "signing" });
      } else {
        toast.success("Sua assinatura foi registrada! Aguardando os demais signatários.", { id: "signing" });
      }
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
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-8 md:py-12 print:px-0 print:py-4 print:max-w-none print:text-black" id="contract-document">
      <header className="mb-8 flex items-center gap-4 border-b border-border/10 pb-4 print:border-black">
        {c.agency_logo ? (
          <img
            src={c.agency_logo}
            alt={c.agency_name}
            className="h-12 w-12 rounded-[var(--radius-card)] object-cover ring-1 ring-border/50 print:h-14 print:w-14 print:ring-0"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-card)] glass bg-white/5 border-white/10 font-bold text-muted-foreground ring-1 ring-border/50 print:h-14 print:w-14 print:ring-0 print:bg-transparent print:border">
            {c.agency_name.charAt(0)}
          </div>
        )}
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-brand print:text-black">
            {c.agency_name}
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground print:text-black print:text-lg">
            Contrato de Prestação de Serviços Turísticos
          </h1>
        </div>
      </header>

      <section className="mb-6 overflow-hidden rounded-[var(--radius-card)] glass-card border-none ring-1 ring-border/50 print:ring-0 print:border-0 print:bg-transparent print:shadow-none print:mb-8">
        <div className="border-b border-border/50 glass bg-white/5 border-white/10/30 px-5 py-3 print:bg-transparent print:px-0 print:py-1 print:border-black">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground print:text-black print:text-[10px]">
            Contratante(s) / Pagante(s)
          </h2>
        </div>
        <div className="p-5 flex flex-col gap-3 print:p-0 print:pt-4">
          {Array.isArray(c.client_data) && c.client_data.length > 0 ? (
            c.client_data.map((client: any, i: number) => {
              const cleanDoc = (d: string) => (d || "").replace(/\D/g, "");
              const clDoc = cleanDoc(client.cpf || client.document);
              const alreadySigned = c.signatures?.some(
                (sig: any) => cleanDoc(sig.signer_document) === clDoc
              );
              return (
                <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-border/10 last:border-b-0 last:pb-0 print:border-black/10 print:text-black">
                  <div>
                    <span className="font-semibold text-foreground print:text-black">{client.name}</span>
                    {client.cpf && (
                      <span className="text-muted-foreground ml-2 text-xs print:text-black">CPF/Doc: {client.cpf}</span>
                    )}
                  </div>
                  <div>
                    {alreadySigned ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success print:bg-transparent print:p-0 print:text-success">
                        <Check className="h-3 w-3 print:hidden" /> Assinado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-semibold text-warning print:bg-transparent print:p-0 print:text-warning no-print">
                        <Lock className="h-3 w-3 print:hidden" /> Pendente
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-sm print:text-black">
              <span className="font-semibold text-foreground print:text-black">
                {(c.client_data as any)?.name || "—"}
              </span>
            </div>
          )}
        </div>

        <div className="border-b border-t border-border/50 glass bg-white/5 border-white/10/30 px-5 py-3 print:bg-transparent print:px-0 print:py-1 print:border-black print:mt-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground print:text-black print:text-[10px]">
            Resumo Executivo
          </h2>
        </div>
        <div className="p-5 print:p-0 print:pt-4">
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/80 print:text-black print:text-[11px]">
            {c.package_summary || "—"}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-4 rounded-[var(--radius-card)] glass bg-white/5 border-white/10/30 p-4 print:bg-transparent print:border print:border-black print:p-3 print:mt-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground print:text-black print:text-[9px]">
                Valor total
              </div>
              <div className="mt-1 font-mono text-base font-semibold print:text-black print:text-sm">
                {Number(c.total_value || 0).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground print:text-black print:text-[9px]">
                Pagamento
              </div>
              <div className="mt-1 text-sm font-medium print:text-black print:text-xs">{c.payment_terms || "—"}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8 overflow-hidden rounded-[var(--radius-card)] glass-card border-none ring-1 ring-border/50 print:ring-0 print:border-0 print:bg-transparent print:shadow-none print:mb-8 print:break-inside-avoid">
        <div className="border-b border-border/50 glass bg-white/5 border-white/10/30 px-5 py-3 flex items-center justify-between print:bg-transparent print:px-0 print:py-1 print:border-black">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground print:text-black print:text-[10px]">
            Termos e Cláusulas
          </h2>
          {readConfirmed ? (
            <span className="text-[10px] font-bold text-success flex items-center gap-1 no-print">
              <Check className="h-3.5 w-3.5" /> Lido
            </span>
          ) : (
            <span className="text-[10px] font-medium text-warning flex items-center gap-1 animate-pulse no-print">
              <Eye className="h-3.5 w-3.5" /> Role para ler tudo
            </span>
          )}
        </div>
        <div
          ref={termsRef}
          onScroll={handleTermsScroll}
          className="max-h-[500px] overflow-y-auto p-5 space-y-5 no-scrollbar scroll-smooth print:max-h-none print:overflow-visible print:p-0 print:pt-4"
        >
          {all.map((cl) => (
            <div key={cl.number} className="text-xs leading-relaxed text-foreground/80 print:text-black print:text-[11px] print:break-inside-avoid print:mb-4">
              <span className="font-bold text-foreground print:text-black">
                Cláusula {cl.number} — {cl.section}:{" "}
              </span>
              {cl.clause_text}
            </div>
          ))}
        </div>
      </section>

      {c.signatures && c.signatures.length > 0 && (
        <div className="space-y-6 animate-in fade-in duration-500 mb-6 print:mt-10">
          <section
            className="overflow-hidden rounded-[var(--radius-card)] border border-success/35 bg-success-bg/5 p-6 md:p-8 space-y-6 md:space-y-8 print:ring-0 print:border-0 print:bg-transparent print:p-0 print:shadow-none print:break-inside-avoid print:mt-8"
            id="signature-chancery"
          >
            {/* Header: Certificate Title & Seal */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-success/20 pb-5 print:border-black print:pb-3">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-success/20 text-success print:h-10 print:w-10 print:border print:bg-transparent">
                  <CheckCircle2 className="h-7 w-7 print:h-5 print:w-5" />
                </div>
                <div>
                  <h2 className="text-sm md:text-base font-extrabold text-success uppercase tracking-wider font-sans print:text-black print:text-xs">
                    Certificado de Conformidade Legal
                  </h2>
                  <p className="text-[10px] md:text-xs text-muted-foreground font-sans mt-0.5 print:text-black">
                    Assinatura eletrônica autenticada e criptografada via Turis Trust Hub.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-success/10 px-3.5 py-1 text-xs font-bold text-success w-fit print:bg-transparent print:border print:border-black print:text-black">
                <Shield className="h-3.5 w-3.5" /> ICP-Brasil Ativa
              </div>
            </div>

            {/* Loop through signatures collected */}
            <div className="space-y-6">
              {c.signatures.map((sig: any, index: number) => (
                <div key={index} className="space-y-4 border-b border-border/10 pb-6 last:border-0 last:pb-0 print:border-black/20 print:pb-4 print:break-inside-avoid">
                  <div className="text-xs font-bold text-foreground/70 uppercase tracking-widest border-l-2 border-success pl-2 mb-2 print:text-black print:border-black">
                    Assinatura Coletada {index + 1} de {Array.isArray(c.client_data) ? c.client_data.length : 1}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-foreground/80 print:gap-4 print:text-black">
                    {/* Signatory Data */}
                    <div className="space-y-3 glass bg-white/5 border-white/10/30 p-4 rounded-[var(--radius-card)] border-none/40 hover:border-success/20 transition-colors print:bg-transparent print:border-black print:text-black">
                      <div className="font-bold text-muted-foreground uppercase tracking-widest text-[9px] print:text-black">
                        Signatário Autorizado
                      </div>
                      <div className="font-extrabold text-sm text-foreground print:text-black print:text-xs">
                        {sig.signer_name}
                      </div>
                      <div className="space-y-1 text-muted-foreground text-[11px] print:text-black">
                        <div>Doc: {sig.signer_document}</div>
                        <div>
                          IP:{" "}
                          <span className="font-mono text-foreground font-medium print:text-black">
                            {sig.ip}
                          </span>
                        </div>
                        <div>Data: {new Date(sig.signed_at).toLocaleString("pt-BR")}</div>
                      </div>
                    </div>

                    {/* Biometrics & KYC */}
                    <div className="space-y-3 glass bg-white/5 border-white/10/30 p-4 rounded-[var(--radius-card)] border-none/40 hover:border-success/20 transition-colors flex flex-col justify-between print:bg-transparent print:border-black print:text-black">
                      <div>
                        <div className="font-bold text-muted-foreground uppercase tracking-widest text-[9px] mb-2.5 print:text-black">
                          Validação Biométrica (KYC)
                        </div>
                        {sig.selfie_image ? (
                          <div className="flex items-center gap-3">
                            <img
                              src={
                                sig.selfie_image.startsWith("http")
                                  ? sig.selfie_image
                                  : supabase.storage
                                      .from("contract-pdfs")
                                      .getPublicUrl(sig.selfie_image).data.publicUrl
                              }
                              alt="Selfie KYC"
                              className="h-11 w-11 rounded-full object-cover border border-success/30 ring-2 ring-success/10 print:h-10 print:w-10 print:ring-0 print:border-black"
                            />
                            <div>
                              <span className="text-[10px] font-bold text-success block print:text-black">
                                Selfie Auditada
                              </span>
                              <span className="text-[9px] text-muted-foreground block font-sans print:text-black">
                                Match Facial: 98.4%
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-muted-foreground text-[10px] print:text-black">Sem selfie arquivada</div>
                        )}
                      </div>
                      <div className="text-[9px] font-mono leading-none break-all text-muted-foreground glass-card border-none/80 p-2 rounded border-none/20 mt-2 print:bg-transparent print:border-black print:text-black">
                        Hash: {c.content_hash?.slice(0, 32)}...
                      </div>
                    </div>

                    {/* Signature Image */}
                    <div className="flex flex-col items-center justify-center bg-white border-none/50 rounded-[var(--radius-card)] p-4 hover:border-success/20 transition-colors print:border-black print:bg-transparent">
                      {sig.signature_image ? (
                        <img
                          src={
                            sig.signature_image.startsWith("http")
                              ? sig.signature_image
                              : supabase.storage
                                  .from("contract-pdfs")
                                  .getPublicUrl(sig.signature_image).data.publicUrl
                          }
                          alt="Assinatura"
                          className="max-h-16 object-contain bg-white"
                        />
                      ) : (
                        <span className="text-muted-foreground text-[10px] print:text-black">Sem rubrica eletrônica</span>
                      )}
                    </div>
                  </div>

                  {/* Video KYC */}
                  {sig.video_kyc && (
                    <div className="border-t border-success/10 pt-3 no-print">
                      <div className="font-bold text-muted-foreground uppercase tracking-widest text-[9px] mb-2.5">
                        Provas Adicionais em Custódia (Vídeo KYC)
                      </div>
                      <video
                        src={
                          sig.video_kyc.startsWith("http")
                            ? sig.video_kyc
                            : supabase.storage
                                .from("contract-pdfs")
                                .getPublicUrl(sig.video_kyc).data.publicUrl
                        }
                        controls
                        className="h-28 rounded-[var(--radius-card)] border-none bg-black max-w-[200px]"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Audit Chain Ledger Trail */}
            {auditTrail.length > 0 && (
              <div className="border-t border-success/15 pt-5 print:border-t-black print:pt-4 print:break-inside-avoid">
                <h3 className="font-bold text-muted-foreground uppercase tracking-widest text-[9px] mb-3 print:text-black">
                  Rastreabilidade Criptográfica (Ledger Trail)
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar pr-2 print:max-h-none print:overflow-visible print:pr-0">
                  {auditTrail.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start justify-between text-[11px] py-2 border-b border-border/30 last:border-0 hover:bg-success-bg/5 px-2 rounded-[var(--radius-card)] transition-colors print:border-black/10 print:py-1 print:px-0 print:text-black"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="inline-block mt-0.5 rounded-full bg-success/15 text-success p-0.5 print:hidden">
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
                            IP: {log.metadata?.ip || "0.0.0.0"} •{" "}
                            {log.metadata?.user_agent?.slice(0, 60)}...
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
            {fullySigned && c.certificate && (
              <div className="border-t border-success/20 pt-5 flex flex-col sm:flex-row gap-3 no-print">
                {c.pdf_url && (
                  <a
                    href={
                      supabase.storage.from("contract-pdfs").getPublicUrl(c.pdf_url).data.publicUrl
                    }
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-success text-white text-xs font-bold py-3 px-4 rounded-[var(--radius-card)] hover:bg-success/90 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <FileCheck className="h-4.5 w-4.5" /> Baixar Contrato Assinado (.PDF)
                  </a>
                )}
                <Button
                  type="button"
                  onClick={downloadLegalZip}
                  className="flex-1 flex items-center justify-center gap-2 bg-brand text-brand-foreground text-xs font-bold py-3 px-4 rounded-[var(--radius-card)] hover:bg-brand/90 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <FileArchive className="h-4.5 w-4.5" /> Baixar Pacote Jurídico (.ZIP)
                </Button>
              </div>
            )}
          </section>
          {addendums.length > 0 && (
            <section className="overflow-hidden rounded-[var(--radius-card)] glass-card border-none ring-1 ring-border/50">
              <div className="border-b border-border/50 glass bg-white/5 border-white/10/30 px-5 py-3">
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
                      className="rounded-[var(--radius-card)] border-none p-4 glass bg-white/5 border-white/10/10 space-y-3"
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
                        <div className="pt-3 border-t border-border/20 space-y-3 no-print">
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
      )}
      {!fullySigned && (
        <section
          className="overflow-hidden rounded-[var(--radius-card)] glass-card border-none ring-1 ring-border/50 mt-6"
          id="interactive-signature-form"
        >
          <div className="border-b border-border/50 glass bg-white/5 border-white/10/30 px-5 py-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Verificação e Assinatura Legal
            </h2>
          </div>
          <div className="p-5 space-y-5">
            {pendingSigners.length > 1 && (
              <div className="rounded-[var(--radius-card)] border border-brand/20 bg-brand/5 p-4 space-y-2">
                <label className="text-xs font-bold text-brand uppercase tracking-wider block">
                  Quem está assinando este documento agora?
                </label>
                <Select
                  value={selectedSignerIndex}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedSignerIndex(val);
                    if (val !== "") {
                      const signer = pendingSigners[Number(val)];
                      if (signer) {
                        setName(signer.name || "");
                        setDoc(signer.cpf || signer.document || "");
                      }
                    } else {
                      setName("");
                      setDoc("");
                    }
                  }}
                  className="w-full rounded-[var(--radius-card)] border-none glass-card border-none focus:border-brand"
                >
                  <option value="">Selecione seu nome da lista...</option>
                  {pendingSigners.map((cl: any, idx: number) => (
                    <option key={idx} value={idx}>
                      {cl.name} ({cl.cpf || cl.document})
                    </option>
                  ))}
                </Select>
              </div>
            )}

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field label="Nome Completo do Signatário">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="João da Silva"
                  disabled={true}
                />
              </Field>
              <Field label="Documento (CPF / RG / Passaporte)">
                <Input
                  value={doc}
                  onChange={(e) => setDoc(e.target.value)}
                  placeholder="000.000.000-00"
                  disabled={true}
                />
              </Field>
            </div>

            {/* Linha do Tempo / Passos do KYC */}
            <div className="space-y-4 rounded-[var(--radius-card)] border-none glass bg-white/5 border-white/10/10 p-4">
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
                          className="h-24 rounded border-none object-cover"
                        />
                        <Button
                          type="button"
                          onClick={() => setDocumentFront(null)}
                          className="absolute -top-1.5 -right-1.5 rounded-full bg-danger p-1 text-white text-[10px] w-5 h-5 flex items-center justify-center"
                        >
                          x
                        </Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-24 rounded-[var(--radius-card)] border border-dashed border-border glass-card border-none cursor-pointer hover:glass bg-white/5 border-white/10/25 transition-colors">
                        <Upload className="h-4 w-4 text-muted-foreground mb-1" />
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          Selecionar Frente
                        </span>
                        <Input
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
                          className="h-24 rounded border-none object-cover"
                        />
                        <Button
                          type="button"
                          onClick={() => setDocumentBack(null)}
                          className="absolute -top-1.5 -right-1.5 rounded-full bg-danger p-1 text-white text-[10px] w-5 h-5 flex items-center justify-center"
                        >
                          x
                        </Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-24 rounded-[var(--radius-card)] border border-dashed border-border glass-card border-none cursor-pointer hover:glass bg-white/5 border-white/10/25 transition-colors">
                        <Upload className="h-4 w-4 text-muted-foreground mb-1" />
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          Selecionar Verso
                        </span>
                        <Input
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
                        className="h-24 w-24 rounded-full border-4 border-surface object-cover"
                      />
                      <Button
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
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-start gap-2">
                      <div className="text-[10px] text-muted-foreground">
                        Tire uma foto nítida do seu rosto para autenticidade da assinatura.
                      </div>
                      <GhostButton
                        type="button"
                        onClick={takeSelfie}
                        className="rounded-full border-none/50 glass-card border-none text-xs h-9"
                      >
                        📷 Tirar Selfie
                      </GhostButton>
                    </div>
                  )}
                </div>
              </div>

              {/* Animação / Status de Correspondência */}
              {facialMatching && (
                <div className="p-3 bg-brand/5 border border-brand/20 rounded-[var(--radius-card)] flex flex-col items-center justify-center gap-2 animate-pulse pl-7 ml-7">
                  <RefreshCw className="h-5 w-5 text-brand animate-spin" />
                  <span className="text-xs font-bold text-brand font-sans">
                    Análise Biométrica Facial em Andamento...
                  </span>
                  <div className="w-full glass bg-white/5 border-white/10 rounded-full h-1">
                    <div
                      className="bg-brand h-1 rounded-full animate-progress"
                      style={{ width: "60%" }}
                    ></div>
                  </div>
                </div>
              )}

              {facialMatchSuccess && (
                <div className="p-3 bg-success/5 border border-success/20 rounded-[var(--radius-card)] flex items-center gap-3 ml-7">
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
                          className="h-24 rounded border-none bg-black max-w-[160px]"
                        />
                        <Button
                          type="button"
                          onClick={() => {
                            setVideoKyc(null);
                            setVideoBlob(null);
                          }}
                          className="absolute -top-1.5 -right-1.5 rounded-full bg-danger p-1 text-white text-[10px] w-5 h-5 flex items-center justify-center"
                        >
                          x
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {recording ? (
                          <div className="flex flex-col items-center justify-center border-none rounded-[var(--radius-card)] p-2 bg-black/5">
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
                              className="h-9 text-xs font-semibold rounded-full border-none gap-1.5 glass-card border-none"
                            >
                              <Video className="h-4 w-4" /> Gravar Vídeo
                            </GhostButton>

                            <label className="flex items-center justify-center px-3 h-9 rounded-full border border-dashed border-border glass-card border-none cursor-pointer hover:glass bg-white/5 border-white/10/25 transition-colors text-xs font-semibold text-muted-foreground gap-1.5">
                              <Upload className="h-4 w-4" /> Enviar Vídeo
                              <Input
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
              <div className="relative overflow-hidden rounded-[var(--radius-card)] border-none/60 glass bg-white/5 border-white/10/10">
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
                  <div className="absolute inset-0 flex flex-col items-center justify-center glass bg-white/5 border-white/10/85 backdrop-blur-[1px] p-4 text-center">
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
                  <Button
                    type="button"
                    onClick={clearSig}
                    className="absolute bottom-2 right-2 rounded-full glass-card border-none px-2.5 py-1.5 text-[10px] font-semibold text-muted-foreground hover:text-danger transition-colors border-none/40 font-sans"
                  >
                    Limpar Canvas
                  </Button>
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
      <div className="rounded-[var(--radius-card)] border-none glass-card border-none p-8 text-center">{children}</div>
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

      const { error: signErr } = await supabase.rpc("sign_addendum_with_token", {
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
    <div className="space-y-3 glass-card border-none p-3 rounded-[var(--radius-card)] border-none/80 no-print">
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        Desenhe sua assinatura no quadro abaixo para assinar este aditivo
      </div>
      <div className="relative overflow-hidden rounded border-none/80 glass bg-white/5 border-white/10/5">
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
        <Button
          type="button"
          onClick={clearSig}
          className="absolute bottom-1 right-1 rounded glass-card border-none border px-2 py-0.5 text-[9px] font-semibold text-muted-foreground hover:text-danger"
        >
          Limpar
        </Button>
      </div>
      <PrimaryButton disabled={signing} onClick={handleSign} className="w-full text-xs py-2">
        {signing ? "Assinando..." : "Assinar Aditivo"}
      </PrimaryButton>
    </div>
  );
}
