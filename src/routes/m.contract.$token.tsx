import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Field, Input, PrimaryButton, GhostButton } from "@/components/ui/form";

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
      const video = document.createElement("video"); video.srcObject = stream; await video.play();
      await new Promise((r) => setTimeout(r, 400));
      const canvas = document.createElement("canvas"); canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      canvas.getContext("2d")!.drawImage(video, 0, 0); stream.getTracks().forEach((t) => t.stop());
      setSelfie(canvas.toDataURL("image/jpeg", 0.7));
    } catch { toast.error("Não foi possível acessar a câmera"); }
  }

  async function sign() {
    if (!name || !doc) return toast.error("Preencha nome e documento");
    if (!selfie) return toast.error("Tire uma selfie de verificação");
    const sig = sigRef.current!.toDataURL("image/png");
    setSigning(true);
    const ua = navigator.userAgent;
    const ip = await fetch("https://api.ipify.org?format=json").then((r) => r.json()).then((j) => j.ip).catch(() => "");
    const { error } = await supabase.rpc("sign_contract_with_token", {
      _token: token, _signer_name: name, _signer_document: doc,
      _signature_image: sig, _selfie_image: selfie, _ip: ip, _user_agent: ua,
    });
    setSigning(false);
    if (error) toast.error(error.message);
    else { toast.success("Contrato assinado!"); setC({ ...(c as Contract), status: "signed", signed_at: new Date().toISOString() }); }
  }

  if (err) return <Center><h1 className="text-lg font-semibold">{err}</h1></Center>;
  if (!c) return <Center><p className="text-sm text-muted-foreground">Carregando…</p></Center>;

  const signed = !!c.signed_at;
  const all: Clause[] = [...(c.fixed_clauses ?? []), ...(c.custom_clauses ?? [])].sort((a, b) => (a.number ?? 0) - (b.number ?? 0));

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-10">
      <header className="mb-6 flex items-center gap-3">
        {c.agency_logo && <img src={c.agency_logo} alt={c.agency_name} className="h-10 w-10 rounded object-cover" />}
        <div>
          <div className="text-xs text-muted-foreground">{c.agency_name}</div>
          <h1 className="text-lg font-semibold tracking-tight">Contrato de prestação de serviços</h1>
        </div>
      </header>

      <section className="mb-6 rounded-lg border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold">Resumo</h2>
        <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{c.package_summary || "—"}</p>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div><div className="text-xs text-muted-foreground">Valor total</div><div className="font-mono">{Number(c.total_value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div></div>
          <div><div className="text-xs text-muted-foreground">Pagamento</div><div>{c.payment_terms || "—"}</div></div>
        </div>
      </section>

      <section className="mb-6 max-h-[420px] space-y-3 overflow-y-auto rounded-lg border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold">Cláusulas</h2>
        {all.map((cl) => (
          <div key={cl.number} className="border-l-2 border-border pl-3 text-xs">
            <div className="font-semibold">Cláusula {cl.number} — {cl.section}</div>
            <p className="mt-1 whitespace-pre-line text-muted-foreground">{cl.clause_text}</p>
          </div>
        ))}
      </section>

      {signed ? (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-6 text-center text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
          ✓ Assinado em {new Date(c.signed_at!).toLocaleString("pt-BR")}<br />
          <span className="font-mono text-[10px]">Hash: {c.content_hash}</span>
        </div>
      ) : (
        <section className="space-y-3 rounded-lg border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold">Assinar</h2>
          <Field label="Nome do signatário"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="CPF/Documento"><Input value={doc} onChange={(e) => setDoc(e.target.value)} /></Field>
          <Field label="Assinatura (desenhe abaixo)">
            <div className="rounded-md border border-border bg-white">
              <canvas ref={sigRef} width={600} height={150} className="touch-none w-full"
                onPointerDown={startDraw} onPointerMove={moveDraw} onPointerUp={endDraw} onPointerLeave={endDraw} />
            </div>
            <button type="button" onClick={clearSig} className="mt-1 text-xs text-muted-foreground underline">limpar</button>
          </Field>
          <Field label="Selfie de verificação">
            {selfie ? <img src={selfie} alt="selfie" className="h-32 w-32 rounded object-cover" /> : <GhostButton type="button" onClick={takeSelfie}>📷 Tirar selfie</GhostButton>}
          </Field>
          <PrimaryButton disabled={signing} onClick={sign} className="w-full">{signing ? "Assinando…" : "Aceitar e assinar"}</PrimaryButton>
        </section>
      )}
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center bg-background p-6"><div className="rounded-lg border border-border bg-surface p-8 text-center">{children}</div></div>;
}
