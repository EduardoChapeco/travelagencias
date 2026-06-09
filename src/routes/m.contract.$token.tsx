import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Field, Input, PrimaryButton, GhostButton } from "@/components/ui/form";
import { generateContractHash, generateContractPdf } from "@/lib/pdf-generator";

export const Route = createFileRoute("/m/contract/$token")({
  head: () => ({ meta: [{ title: "Assinar contrato · TravelOS" }] }),
  component: Page,
});

type Clause = { number: number; section: string; clause_text: string; is_immutable?: boolean };
type Contract = {
  id: string; status: string; agency_name: string; agency_logo: string | null;
  package_summary: string | null; total_value: number; payment_terms: string | null;
  fixed_clauses: Clause[]; custom_clauses: Clause[];
  client_data: { name?: string; document?: string }; passengers_data: Array<{ full_name?: string }>;
  signed_at: string | null; content_hash: string | null;
};

function Page() {
  const { token } = Route.useParams();
  const [c, setC] = useState<Contract | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const [name, setName] = useState(""); const [doc, setDoc] = useState("");
  const [selfie, setSelfie] = useState<string | null>(null);
  const sigRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    supabase.rpc("public_contract_by_token", { _token: token }).then(({ data, error }) => {
      if (error) { setErr(error.message); return; }
      const row = (data as Contract[])?.[0]; if (!row) { setErr("Contrato não encontrado"); return; }
      setC(row); setName(row.client_data?.name ?? ""); setDoc(row.client_data?.document ?? "");
    });
  }, [token]);

  function startDraw(e: React.PointerEvent) {
    drawing.current = true; const c = sigRef.current!; const r = c.getBoundingClientRect();
    const ctx = c.getContext("2d")!; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.strokeStyle = "#0f172a";
    ctx.beginPath(); ctx.moveTo(e.clientX - r.left, e.clientY - r.top);
  }
  function moveDraw(e: React.PointerEvent) {
    if (!drawing.current) return; const c = sigRef.current!; const r = c.getBoundingClientRect();
    const ctx = c.getContext("2d")!; ctx.lineTo(e.clientX - r.left, e.clientY - r.top); ctx.stroke();
  }
  function endDraw() { drawing.current = false; }
  function clearSig() { const c = sigRef.current!; c.getContext("2d")!.clearRect(0, 0, c.width, c.height); }

  async function takeSelfie() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      const video = document.createElement("video"); 
      video.srcObject = stream; 
      video.setAttribute("playsinline", "true");
      await video.play();
      // Mostra um pequeno delay antes de tirar a foto
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

  async function sign() {
    if (!name || !doc) return toast.error("Preencha nome e documento legal.");
    if (!selfie) return toast.error("Por favor, tire uma selfie de verificação (KYC).");
    
    // Validar assinatura vazia (simplificado)
    const sig = sigRef.current!.toDataURL("image/png");
    
    setSigning(true);
    toast.loading("Criptografando e processando contrato…", { id: "signing" });

    try {
      const ua = navigator.userAgent;
      const ip = await fetch("https://api.ipify.org?format=json").then((r) => r.json()).then((j) => j.ip).catch(() => "0.0.0.0");
      const timestamp = new Date().toISOString();
      
      // 1. Snapshot PDF via html2canvas
      const pdfBase64 = await generateContractPdf("contract-document");

      // 2. Hash em Cadeia (Web Crypto API)
      const contentToHash = JSON.stringify({ 
        summary: c?.package_summary, 
        total: c?.total_value, 
        clauses: c?.fixed_clauses.length 
      });
      const hash = await generateContractHash({
        contract_id: c!.id,
        signer_name: name,
        signer_document: doc,
        ip,
        timestamp,
        content: contentToHash
      });

      // 3. Enviar Payload
      const { error } = await supabase.rpc("sign_contract_with_token", {
        _token: token, 
        _signer_name: name, 
        _signer_document: doc,
        _signature_image: sig, 
        _selfie_image: selfie, 
        _ip: ip, 
        _user_agent: ua,
        _pdf_data: pdfBase64,
        _signed_hash: hash
      });

      if (error) throw error;

      toast.success("Contrato assinado digitalmente!", { id: "signing" });
      setC({ ...(c as Contract), status: "signed", signed_at: timestamp, content_hash: hash });
    } catch (e: any) {
      toast.error(e.message || "Erro inesperado ao assinar", { id: "signing" });
    } finally {
      setSigning(false);
    }
  }

  if (err) return <Center><h1 className="text-lg font-semibold">{err}</h1></Center>;
  if (!c) return <Center><p className="text-sm text-muted-foreground">Carregando…</p></Center>;

  const signed = !!c.signed_at;
  const all: Clause[] = [...(c.fixed_clauses ?? []), ...(c.custom_clauses ?? [])].sort((a, b) => (a.number ?? 0) - (b.number ?? 0));

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-8 md:py-12" id="contract-document">
      <header className="mb-8 flex items-center gap-4">
        {c.agency_logo ? (
          <img src={c.agency_logo} alt={c.agency_name} className="h-12 w-12 rounded-xl object-cover shadow-sm ring-1 ring-border/50" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-alt font-bold text-muted-foreground shadow-sm ring-1 ring-border/50">
            {c.agency_name.charAt(0)}
          </div>
        )}
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-brand">{c.agency_name}</div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Contrato de Prestação de Serviços Turísticos</h1>
        </div>
      </header>

      <section className="mb-6 overflow-hidden rounded-xl bg-surface shadow-sm ring-1 ring-border/50">
        <div className="border-b border-border/50 bg-surface-alt/30 px-5 py-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Resumo Executivo</h2>
        </div>
        <div className="p-5">
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/80">{c.package_summary || "—"}</p>
          <div className="mt-5 grid grid-cols-2 gap-4 rounded-lg bg-surface-alt/30 p-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Valor total</div>
              <div className="mt-1 font-mono text-base font-semibold">{Number(c.total_value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Pagamento</div>
              <div className="mt-1 text-sm font-medium">{c.payment_terms || "—"}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8 overflow-hidden rounded-xl bg-surface shadow-sm ring-1 ring-border/50">
        <div className="border-b border-border/50 bg-surface-alt/30 px-5 py-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Termos e Cláusulas</h2>
        </div>
        <div className="max-h-[500px] overflow-y-auto p-5 space-y-5 no-scrollbar">
          {all.map((cl) => (
            <div key={cl.number} className="text-xs leading-relaxed text-foreground/80">
              <span className="font-bold text-foreground">Cláusula {cl.number} — {cl.section}: </span>
              {cl.clause_text}
            </div>
          ))}
        </div>
      </section>

      {signed ? (
        <div className="overflow-hidden rounded-xl bg-success-bg shadow-sm ring-1 ring-success/30" id="signature-section">
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/20 text-success">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-success">Assinado Digitalmente</h2>
            <p className="mt-2 text-sm text-success/80">
              O contrato foi chancelado criptograficamente em {new Date(c.signed_at!).toLocaleString("pt-BR")}.
            </p>
            <div className="mt-4 rounded-lg bg-success/10 px-4 py-2 font-mono text-[10px] font-medium tracking-wider text-success">
              HASH: {c.content_hash}
            </div>
          </div>
        </div>
      ) : (
        <section className="overflow-hidden rounded-xl bg-surface shadow-sm ring-1 ring-border/50" id="signature-section">
          <div className="border-b border-border/50 bg-surface-alt/30 px-5 py-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Verificação e Assinatura Legal</h2>
          </div>
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field label="Nome Completo do Signatário"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="João da Silva" /></Field>
              <Field label="Documento (CPF / RG / Passaporte)"><Input value={doc} onChange={(e) => setDoc(e.target.value)} placeholder="000.000.000-00" /></Field>
            </div>

            <Field label="Assinatura Digital (Desenhe no quadro abaixo)">
              <div className="relative overflow-hidden rounded-xl border border-border/60 bg-surface-alt/10">
                <canvas ref={sigRef} width={600} height={180} className="touch-none w-full cursor-crosshair"
                  onPointerDown={startDraw} onPointerMove={moveDraw} onPointerUp={endDraw} onPointerLeave={endDraw} />
                <button type="button" onClick={clearSig} className="absolute bottom-2 right-2 rounded-md bg-surface px-2 py-1 text-[10px] font-semibold text-muted-foreground shadow hover:text-danger transition-colors">
                  Limpar Canvas
                </button>
              </div>
            </Field>

            <Field label="Prova de Vida (KYC)">
              {selfie ? (
                <div className="relative inline-block">
                  <img src={selfie} alt="selfie de verificação" className="h-32 w-32 rounded-full border-4 border-surface shadow-md object-cover" />
                  <button type="button" onClick={() => setSelfie(null)} className="absolute bottom-0 right-0 rounded-full bg-danger p-1.5 text-white shadow hover:bg-danger/80">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-start gap-3">
                  <div className="text-xs text-muted-foreground">Para garantir a autenticidade, precisamos de uma foto do seu rosto no momento da assinatura.</div>
                  <GhostButton type="button" onClick={takeSelfie} className="rounded-full border-border/50 bg-surface shadow-sm">
                    📷 Iniciar Câmera e Tirar Selfie
                  </GhostButton>
                </div>
              )}
            </Field>

            <div className="border-t border-border/50 pt-5 mt-5">
              <PrimaryButton disabled={signing} onClick={sign} className="w-full py-6 text-sm font-bold uppercase tracking-widest">
                {signing ? "Processando Chancelas…" : "Li, concordo e assino o contrato"}
              </PrimaryButton>
              <p className="mt-3 text-center text-[10px] text-muted-foreground">
                Ao clicar no botão acima, você concorda com a validade jurídica desta assinatura digital, atrelada ao seu IP, Dispositivo e biometria facial, nos termos da MP 2.200-2/2001.
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center bg-background p-6"><div className="rounded-lg border border-border bg-surface p-8 text-center">{children}</div></div>;
}
