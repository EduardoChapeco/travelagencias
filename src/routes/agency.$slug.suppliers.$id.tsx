import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  PhoneCall,
  Mail,
  Percent,
  MapPin,
  Globe,
  Instagram,
  MessageCircle,
  Star,
  Plus,
  Upload,
  Trash2,
  Check,
  X,
  Brain,
  FileText,
  Users,
  Package,
  BarChart3,
  Clock,
  Calendar,
  Pencil,
  Tag,
  Plane,
  Hotel,
  Car,
  Shield,
  Bus,
  Ship,
  TicketCheck,
  ChevronDown,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAgency, getModuleName } from "@/lib/agency-context";

type OcrContact = {
  name?: string;
  role?: string;
  email?: string;
  phone?: string;
};

type OcrProduct = {
  name?: string;
  kind?: string;
  destination?: string;
  price_from?: number | string;
  currency?: string;
  duration_days?: number | string;
  description?: string;
};

type OcrData = {
  phone?: string;
  email?: string;
  website?: string;
  payment_terms?: string;
  commission_rate?: number;
  contacts?: OcrContact[];
  products?: OcrProduct[];
};

type ReviewWithJoins = Database["public"]["Tables"]["supplier_reviews"]["Row"] & {
  user: { email: string | null } | null;
  trip: { destination: string | null } | null;
};
import { PageHeader } from "@/components/shell/PageHeader";
import { Field } from "@/components/ui/field";
import { FormInput as Input } from "@/components/ui/input";
import { NativeSelect as Select } from "@/components/ui/select";
import { FormTextarea as Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/badge";
import { GhostButton, PrimaryButton , Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/agency/$slug/suppliers/$id")({
  head: ({ context }: any) => ({ meta: [{ title: `Detalhe do Parceiro · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: SupplierDetailsPage,
});

const KIND_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  airline: { label: "Cia Aérea", icon: Plane, color: "text-blue-600" },
  hotel: { label: "Hotel", icon: Hotel, color: "text-amber-600" },
  operator: { label: "Operadora", icon: Building2, color: "text-violet-600" },
  car_rental: { label: "Locadora", icon: Car, color: "text-orange-600" },
  insurance: { label: "Seguro", icon: Shield, color: "text-green-600" },
  transfer: { label: "Transfer", icon: Bus, color: "text-teal-600" },
  cruise: { label: "Cruzeiro", icon: Ship, color: "text-cyan-600" },
  visa: { label: "Vistos", icon: TicketCheck, color: "text-pink-600" },
  other: { label: "Outros", icon: Building2, color: "text-muted-foreground" },
};

const PRODUCT_KINDS = [
  { value: "hotel", label: "Hotel / Acomodação" },
  { value: "room_type", label: "Tipo de Quarto" },
  { value: "tour", label: "Passeio / Tour" },
  { value: "transfer", label: "Transfer" },
  { value: "insurance", label: "Seguro Viagem" },
  { value: "ticket", label: "Ingresso / Evento" },
  { value: "cruise", label: "Cruzeiro" },
  { value: "other", label: "Outros" },
];

const CONTACT_ROLES = [
  "Reservas",
  "Financeiro",
  "Emergência",
  "Comercial",
  "Suporte",
  "Grupos",
  "Outro",
];

function StarRatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Button
          key={i}
          type="button"
          onClick={() => onChange(i + 1)}
          onMouseEnter={() => setHover(i + 1)}
          onMouseLeave={() => setHover(0)}
          className="focus:outline-none"
        >
          <Star
            className={cn(
              "h-5 w-5 transition-colors",
              i < (hover || value) ? "fill-amber-400 text-amber-400" : "text-border",
            )}
          />
        </Button>
      ))}
    </span>
  );
}

function StarRatingDisplay({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-xs text-muted-foreground">Sem avaliação</span>;
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "h-4 w-4",
            i < Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-border",
          )}
        />
      ))}
      <span className="ml-1 font-mono text-sm font-semibold">{Number(rating).toFixed(1)}</span>
    </span>
  );
}

// ─────────────────────────────────────────────
// Tab: Contatos
// ─────────────────────────────────────────────
function TabContacts({ supplierId, agencyId }: { supplierId: string; agencyId: string }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    name: "",
    role: "Reservas",
    email: "",
    phone: "",
    whatsapp: "",
    is_primary: false,
  });

  const q = useQuery({
    queryKey: ["supplier_contacts", supplierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_contacts")
        .select("*")
        .eq("supplier_id", supplierId)
        .order("is_primary", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("supplier_contacts").insert({
        supplier_id: supplierId,
        agency_id: agencyId,
        ...form,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contato adicionado");
      setAdding(false);
      setForm({
        name: "",
        role: "Reservas",
        email: "",
        phone: "",
        whatsapp: "",
        is_primary: false,
      });
      qc.invalidateQueries({ queryKey: ["supplier_contacts", supplierId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("supplier_contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contato removido");
      qc.invalidateQueries({ queryKey: ["supplier_contacts", supplierId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Contatos Operacionais</h3>
        <GhostButton className="h-7 text-xs gap-1.5" onClick={() => setAdding(true)}>
          <Plus className="h-3.5 w-3.5" /> Adicionar
        </GhostButton>
      </div>

      {adding && (
        <div className="rounded-[var(--radius-card)] border-none glass-card border-none p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nome *">
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Roberto Mendes"
              />
            </Field>
            <Field label="Função">
              <Select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              >
                {CONTACT_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="E-mail">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="reservas@parceiro.com"
              />
            </Field>
            <Field label="Telefone">
              <Input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="11 99999-0000"
              />
            </Field>
            <Field label="WhatsApp">
              <Input
                value={form.whatsapp}
                onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
                placeholder="11 99999-0000"
              />
            </Field>
            <Field label="Contato principal">
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <Input
                  type="checkbox"
                  checked={form.is_primary}
                  onChange={(e) => setForm((f) => ({ ...f, is_primary: e.target.checked }))}
                  className="accent-pink-500 h-4 w-4"
                />
                <span className="text-xs">Sim, é o contato principal</span>
              </label>
            </Field>
          </div>
          <div className="flex gap-2 pt-1">
            <PrimaryButton
              className="h-8 text-xs"
              onClick={() => addMut.mutate()}
              disabled={!form.name || addMut.isPending}
            >
              {addMut.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}{" "}
              Salvar
            </PrimaryButton>
            <GhostButton className="h-8 text-xs" onClick={() => setAdding(false)}>
              Cancelar
            </GhostButton>
          </div>
        </div>
      )}

      {q.data?.length === 0 && !adding && (
        <div className="text-center py-8 border border-dashed rounded-[var(--radius-card)] text-sm text-muted-foreground">
          Nenhum contato cadastrado. Adicione contatos de reservas, emergência ou financeiro.
        </div>
      )}

      <div className="space-y-3">
        {q.data?.map((c: any) => (
          <div
            key={c.id}
            className="flex items-start gap-3 rounded-[var(--radius-card)] border-none glass-card border-none p-4"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full glass bg-white/5 border-white/10 border-none">
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">{c.name}</span>
                <span className="ds-meta uppercase tracking-widest font-semibold text-[--brand-primary,theme(colors.pink.500)] border border-[--brand-primary,theme(colors.pink.400)]/30 bg-[--brand-primary,theme(colors.pink.500)]/5 rounded px-1.5 py-0.5">
                  {c.role}
                </span>
                {c.is_primary && (
                  <span className="ds-meta font-semibold text-green-600 bg-green-50 border border-green-200 rounded px-1.5 py-0.5">
                    Principal
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {c.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {c.email}
                  </span>
                )}
                {c.phone && (
                  <span className="flex items-center gap-1">
                    <PhoneCall className="h-3 w-3" />
                    {c.phone}
                  </span>
                )}
                {c.whatsapp && (
                  <a
                    href={`https://wa.me/${c.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-green-600 hover:underline"
                  >
                    <MessageCircle className="h-3 w-3" />
                    {c.whatsapp}
                  </a>
                )}
              </div>
            </div>
            <Button
              onClick={() => deleteMut.mutate(c.id)}
              className="text-muted-foreground hover:text-danger transition-colors p-1"
              title="Remover"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Tab: Catálogo de Produtos
// ─────────────────────────────────────────────
function TabProducts({ supplierId, agencyId }: { supplierId: string; agencyId: string }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    name: "",
    kind: "hotel",
    destination: "",
    country: "",
    city: "",
    description: "",
    price_from: "",
    currency: "BRL",
    duration_days: "",
    capacity: "",
  });

  const q = useQuery({
    queryKey: ["supplier_products", supplierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_products")
        .select("*")
        .eq("supplier_id", supplierId)
        .order("kind");
      if (error) throw error;
      return data;
    },
  });

  const addMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("supplier_products").insert({
        supplier_id: supplierId,
        agency_id: agencyId,
        name: form.name,
        kind: form.kind,
        destination: form.destination || null,
        country: form.country || null,
        city: form.city || null,
        description: form.description || null,
        price_from: form.price_from ? parseFloat(form.price_from) : null,
        currency: form.currency,
        duration_days: form.duration_days ? parseInt(form.duration_days) : null,
        capacity: form.capacity ? parseInt(form.capacity) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produto adicionado ao catálogo");
      setAdding(false);
      setForm({
        name: "",
        kind: "hotel",
        destination: "",
        country: "",
        city: "",
        description: "",
        price_from: "",
        currency: "BRL",
        duration_days: "",
        capacity: "",
      });
      qc.invalidateQueries({ queryKey: ["supplier_products", supplierId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("supplier_products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produto removido");
      qc.invalidateQueries({ queryKey: ["supplier_products", supplierId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Catálogo de Produtos & Serviços</h3>
        <GhostButton className="h-7 text-xs gap-1.5" onClick={() => setAdding(true)}>
          <Plus className="h-3.5 w-3.5" /> Adicionar
        </GhostButton>
      </div>

      {adding && (
        <div className="rounded-[var(--radius-card)] border-none glass-card border-none p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nome do Produto *">
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="ex: Suíte Deluxe Vista Mar"
              />
            </Field>
            <Field label="Tipo">
              <Select
                value={form.kind}
                onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}
              >
                {PRODUCT_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Destino / Local">
              <Input
                value={form.destination}
                onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))}
                placeholder="ex: Gramado, RS"
              />
            </Field>
            <Field label="País">
              <Input
                value={form.country}
                onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                placeholder="Brasil"
              />
            </Field>
            <Field label="Preço A Partir de">
              <div className="flex gap-2">
                <Select
                  value={form.currency}
                  onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                  className="w-20 shrink-0"
                >
                  <option value="BRL">BRL</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </Select>
                <Input
                  type="number"
                  value={form.price_from}
                  onChange={(e) => setForm((f) => ({ ...f, price_from: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </Field>
            <Field label="Duração (dias)">
              <Input
                type="number"
                value={form.duration_days}
                onChange={(e) => setForm((f) => ({ ...f, duration_days: e.target.value }))}
                placeholder="ex: 3"
              />
            </Field>
          </div>
          <Field label="Descrição">
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              placeholder="Inclui, horários, observações..."
            />
          </Field>
          <div className="flex gap-2 pt-1">
            <PrimaryButton
              className="h-8 text-xs"
              onClick={() => addMut.mutate()}
              disabled={!form.name || addMut.isPending}
            >
              {addMut.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}{" "}
              Salvar
            </PrimaryButton>
            <GhostButton className="h-8 text-xs" onClick={() => setAdding(false)}>
              Cancelar
            </GhostButton>
          </div>
        </div>
      )}

      {q.data?.length === 0 && !adding && (
        <div className="text-center py-8 border border-dashed rounded-[var(--radius-card)] text-sm text-muted-foreground">
          Nenhum produto cadastrado. Adicione hotéis, tours, transfers e ingressos.
        </div>
      )}

      <div className="space-y-2">
        {q.data?.map((p: any) => {
          const pkind = PRODUCT_KINDS.find((k) => k.value === p.kind);
          return (
            <div
              key={p.id}
              className="flex items-start gap-3 rounded-[var(--radius-card)] border-none glass bg-white/5 border-white/10 p-4 hover:glass-card transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{p.name}</span>
                  <span className="ds-meta uppercase tracking-widest font-semibold text-muted-foreground border-none rounded px-1.5 py-0.5 glass-card border-none">
                    {pkind?.label ?? p.kind}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                  {p.destination && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {p.destination}
                    </span>
                  )}
                  {p.price_from && (
                    <span className="flex items-center gap-1 font-mono font-semibold text-foreground">
                      {p.currency}{" "}
                      {Number(p.price_from).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  )}
                  {p.duration_days && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {p.duration_days}d
                    </span>
                  )}
                </div>
                {p.description && (
                  <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">
                    {p.description}
                  </p>
                )}
              </div>
              <Button
                onClick={() => deleteMut.mutate(p.id)}
                className="text-muted-foreground hover:text-danger transition-colors p-1 shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Tab: Arquivos
// ─────────────────────────────────────────────
function TabFiles({ supplierId, agencyId }: { supplierId: string; agencyId: string }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
  const [isPersisting, setIsPersisting] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["supplier_files", supplierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_files")
        .select("*")
        .eq("supplier_id", supplierId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("supplier_files").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Arquivo removido");
      qc.invalidateQueries({ queryKey: ["supplier_files", supplierId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleUpload = async (file: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${agencyId}/${supplierId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("supplier-files")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const {
        data: { publicUrl },
      } = supabase.storage.from("supplier-files").getPublicUrl(path);
      const { error: dbErr } = await supabase.from("supplier_files").insert({
        supplier_id: supplierId,
        agency_id: agencyId,
        name: file.name,
        kind: "other",
        file_url: publicUrl,
        file_path: path,
      });
      if (dbErr) throw dbErr;
      toast.success("Arquivo enviado");
      qc.invalidateQueries({ queryKey: ["supplier_files", supplierId] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleOCR = async (fileId: string, fileUrl: string) => {
    setRunning(fileId);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Sem sessão");
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/supplier-ocr-extractor`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ supplier_id: supplierId, file_id: fileId, file_url: fileUrl }),
        },
      );
      if (!res.ok) throw new Error(await res.text());
      const resJson = await res.json();
      const extractedData = resJson.data || resJson.result;
      if (!extractedData) throw new Error("A extração retornou vazia");
      await supabase.from("supplier_files").update({ ocr_data: extractedData }).eq("id", fileId);
      toast.success("Dados extraídos! Revise abaixo.");
      qc.invalidateQueries({ queryKey: ["supplier_files", supplierId] });
    } catch (e: any) {
      toast.error("Erro OCR: " + e.message);
    } finally {
      setRunning(null);
    }
  };

  const KIND_LABELS: Record<string, string> = {
    contract: "Contrato",
    rate_table: "Tarifário",
    policy: "Política",
    certification: "Certificado",
    ocr_extracted: "Extraído por IA",
    other: "Outro",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Arquivos & Documentos</h3>
        <GhostButton
          className="h-7 text-xs gap-1.5"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}{" "}
          Upload
        </GhostButton>
        <Input
          ref={fileRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.docx"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) handleUpload(e.target.files[0]);
          }}
        />
      </div>

      {q.data?.length === 0 && (
        <div className="text-center py-8 border border-dashed rounded-[var(--radius-card)] text-sm text-muted-foreground">
          Nenhum arquivo. Envie tarifários, contratos, políticas e use IA para extrair dados.
        </div>
      )}

      <div className="space-y-2">
        {q.data?.map((f: any) => (
          <div key={f.id} className="rounded-[var(--radius-card)] border-none glass bg-white/5 border-white/10 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-card)] border-none glass-card border-none">
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{f.name}</div>
                <div className="text-xs text-muted-foreground">
                  {KIND_LABELS[f.kind] ?? f.kind}
                  {f.expires_at && (
                    <> · Expira {new Date(f.expires_at).toLocaleDateString("pt-BR")}</>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <a
                  href={f.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground border-none rounded px-2 py-1 transition-colors"
                >
                  Ver
                </a>
                {!f.ocr_reviewed && (
                  <Button
                    onClick={() => handleOCR(f.id, f.file_url)}
                    disabled={running === f.id}
                    className="flex items-center gap-1 text-xs border border-[--brand-primary,theme(colors.pink.400)] text-[--brand-primary,theme(colors.pink.600)] bg-[--brand-primary,theme(colors.pink.500)]/5 hover:bg-[--brand-primary,theme(colors.pink.500)]/10 rounded px-2 py-1 transition-colors"
                    title="Extrair dados com IA"
                  >
                    {running === f.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Brain className="h-3 w-3" />
                    )}
                    <span className="hidden sm:inline">Extrair com IA</span>
                  </Button>
                )}
                {f.ocr_reviewed && (
                  <span className="ds-meta text-green-600 border border-green-200 bg-green-50 rounded px-1.5 py-0.5 font-semibold">
                    ✓ Revisado
                  </span>
                )}
                <Button
                  onClick={() => deleteMut.mutate(f.id)}
                  className="text-muted-foreground hover:text-danger p-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            {f.ocr_data && !f.ocr_reviewed && (
              <div className="rounded-[var(--radius-card)] border border-amber-200 bg-amber-50 p-3 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-amber-700 mb-2">
                  <AlertCircle className="h-3.5 w-3.5" /> Dados Extraídos por IA — Aguardando
                  revisão
                </div>
                <pre className="ds-meta text-amber-800 overflow-auto max-h-40">
                  {JSON.stringify(f.ocr_data, null, 2)}
                </pre>
                <Button
                  disabled={isPersisting === f.id}
                  onClick={async () => {
                    setIsPersisting(f.id);
                    const ocr = f.ocr_data as unknown as OcrData;
                    const toastId = toast.loading("Persistindo dados extraídos...");
                    try {
                      // Note: confirm_ocr_supplier_data is now reflected in types.ts (regenerated 2026-07-01)
                      const { error } = await supabase.rpc("confirm_ocr_supplier_data", {
                        _supplier_id: supplierId,
                        _agency_id: agencyId,
                        _file_id: f.id,
                        _contacts: ocr?.contacts || [],
                        _products: ocr?.products || [],
                        _phone: ocr?.phone || "",
                        _email: ocr?.email || "",
                        _website: ocr?.website || "",
                        _payment_terms: ocr?.payment_terms || "",
                        _commission_rate:
                          ocr?.commission_rate != null
                            ? Number(ocr.commission_rate)
                            : (null as any),
                      });

                      if (error) throw error;

                      toast.success("Dados confirmados e persistidos com sucesso!", {
                        id: toastId,
                      });
                      qc.invalidateQueries({ queryKey: ["supplier_files", supplierId] });
                      qc.invalidateQueries({ queryKey: ["supplier_contacts", supplierId] });
                      qc.invalidateQueries({ queryKey: ["supplier_products", supplierId] });
                      qc.invalidateQueries({ queryKey: ["supplier", supplierId] });
                    } catch (e: any) {
                      toast.error("Erro ao persistir: " + e.message, { id: toastId });
                    } finally {
                      setIsPersisting(null);
                    }
                  }}
                  className="mt-2 text-amber-700 border border-amber-300 rounded px-2 py-1 hover:bg-amber-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPersisting === f.id ? "Salvando..." : "✓ Confirmar e persistir dados"}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Tab: Avaliações Internas
// ─────────────────────────────────────────────
function TabReviews({ supplierId, agencyId }: { supplierId: string; agencyId: string }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ rating: 5, comment: "", tags: "" });

  const q = useQuery({
    queryKey: ["supplier_reviews", supplierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_reviews")
        .select("*, user:user_id(email), trip:trip_id(destination)")
        .eq("supplier_id", supplierId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as ReviewWithJoins[];
    },
  });

  const addMut = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const tags = form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const { error } = await supabase.from("supplier_reviews").insert({
        supplier_id: supplierId,
        agency_id: agencyId,
        user_id: user?.id,
        rating: form.rating,
        comment: form.comment || null,
        tags: tags.length ? tags : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Avaliação registrada");
      setAdding(false);
      setForm({ rating: 5, comment: "", tags: "" });
      qc.invalidateQueries({ queryKey: ["supplier_reviews", supplierId] });
      qc.invalidateQueries({ queryKey: ["supplier", supplierId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("supplier_reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Avaliação removida");
      qc.invalidateQueries({ queryKey: ["supplier_reviews", supplierId] });
      qc.invalidateQueries({ queryKey: ["supplier", supplierId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Avaliações Internas de Performance</h3>
        <GhostButton className="h-7 text-xs gap-1.5" onClick={() => setAdding(true)}>
          <Star className="h-3.5 w-3.5" /> Avaliar
        </GhostButton>
      </div>

      {adding && (
        <div className="rounded-[var(--radius-card)] border-none glass-card border-none p-4 space-y-3">
          <Field label="Nota">
            <StarRatingInput
              value={form.rating}
              onChange={(v) => setForm((f) => ({ ...f, rating: v }))}
            />
          </Field>
          <Field label="Comentário">
            <Textarea
              value={form.comment}
              onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
              rows={2}
              placeholder="O que achou do atendimento, pontualidade, qualidade...?"
            />
          </Field>
          <Field label="Tags (separadas por vírgula)">
            <Input
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="pontual, bem atendimento, preço bom"
            />
          </Field>
          <div className="flex gap-2 pt-1">
            <PrimaryButton
              className="h-8 text-xs"
              onClick={() => addMut.mutate()}
              disabled={addMut.isPending}
            >
              {addMut.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}{" "}
              Salvar
            </PrimaryButton>
            <GhostButton className="h-8 text-xs" onClick={() => setAdding(false)}>
              Cancelar
            </GhostButton>
          </div>
        </div>
      )}

      {q.data?.length === 0 && !adding && (
        <div className="text-center py-8 border border-dashed rounded-[var(--radius-card)] text-sm text-muted-foreground">
          Nenhuma avaliação registrada. Avalie este parceiro após viagens para construir
          inteligência interna.
        </div>
      )}

      <div className="space-y-3">
        {q.data?.map((r) => (
          <div key={r.id} className="rounded-[var(--radius-card)] border-none glass bg-white/5 border-white/10 p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-4 w-4",
                        i < r.rating ? "fill-amber-400 text-amber-400" : "text-border",
                      )}
                    />
                  ))}
                </div>
                {r.comment && <p className="text-sm text-foreground">{r.comment}</p>}
                <div className="flex flex-wrap gap-1 mt-1">
                  {r.tags?.map((t: string) => (
                    <span
                      key={t}
                      className="rounded-full border-none glass-card border-none px-1.5 py-0.5 ds-meta text-muted-foreground"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <div className="ds-meta text-muted-foreground mt-1">
                  {new Date(r.created_at).toLocaleDateString("pt-BR")} · {r.user?.email ?? "—"}
                </div>
              </div>
              <Button
                onClick={() => deleteMut.mutate(r.id)}
                className="text-muted-foreground hover:text-danger p-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
function SupplierDetailsPage() {
  const { agency } = useAgency();
  const qc = useQueryClient();
  const { slug, id } = Route.useParams();

  const { data: supplier, isLoading } = useQuery({
    enabled: !!agency,
    queryKey: ["supplier", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: stats, isLoading: isStatsLoading } = useQuery({
    enabled: !!agency && !!supplier,
    queryKey: ["supplier-stats", id],
    queryFn: async () => {
      // 1. Contagem de uso em itens de proposta
      const { count: proposalsCount } = await supabase
        .from("proposal_items")
        .select("id", { count: "exact", head: true })
        .eq("supplier_id", id);

      // 2. Contagem de produtos cadastrados
      const { count: productsCount } = await supabase
        .from("supplier_products")
        .select("id", { count: "exact", head: true })
        .eq("supplier_id", id);

      // 3. Média de avaliações dos agentes
      const { data: reviews } = await supabase
        .from("supplier_reviews")
        .select("rating")
        .eq("supplier_id", id);

      const avgRating = reviews && reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

      return {
        usageCount: proposalsCount || 0,
        productsCount: productsCount || 0,
        avgRating,
      };
    }
  });

  if (isLoading || isStatsLoading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!supplier) {
    return <div className="p-8 text-center text-muted-foreground">Fornecedor não encontrado.</div>;
  }

  const cfg = KIND_CONFIG[supplier.kind] ?? KIND_CONFIG.other;
  const Icon = cfg.icon;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 md:px-6 py-4 max-w-4xl pb-20">
                      <div className="flex items-center gap-2">
              <StatusBadge tone={supplier.is_active ? "success" : "neutral"}>
                {supplier.is_active ? "Ativo" : "Inativo"}
              </StatusBadge>
            </div>
          
          <Link
            to="/agency/$slug/suppliers"
            params={{ slug }}
            className="mb-4 inline-flex h-8 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 text-xs font-bold text-white/90 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar para {getModuleName("suppliers", agency)}
          </Link>

          {/* Header com logo / cover */}
          <div className="rounded-[var(--radius-card)] border-none overflow-hidden mb-6">
            {supplier.cover_url ? (
              <div
                className="h-28 bg-cover bg-center"
                style={{ backgroundImage: `url(${supplier.cover_url})` }}
              />
            ) : (
              <div className="h-16 bg-gradient-to-r from-surface to-surface-alt border-b border-border" />
            )}
            <div className="px-5 pb-5 -mt-5 flex items-end gap-4">
              <div
                className={cn(
                  "flex h-16 w-16 shrink-0 items-center justify-center rounded-[var(--radius-card)] glass bg-white/5 border border-white/20 shadow-none",
                )}
              >
                {supplier.logo_url ? (
                  <img
                    src={supplier.logo_url}
                    alt={supplier.name}
                    className="h-12 w-12 object-contain rounded-[var(--radius-card)]"
                  />
                ) : (
                  <Icon className={cn("h-8 w-8", cfg.color)} />
                )}
              </div>
              <div className="pb-1">
                <h1 className="text-xl font-bold text-foreground leading-tight">{supplier.name}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="ds-meta uppercase tracking-widest font-semibold text-muted-foreground">
                    {cfg.label}
                  </span>
                  {(supplier.city || supplier.country) && (
                    <>
                      <span className="text-muted-foreground/30">·</span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {[supplier.city, supplier.country].filter(Boolean).join(", ")}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="geral" className="w-full">
            <TabsList className="flex glass-pill p-0.5 text-xs gap-0.5 shrink-0 overflow-x-auto no-scrollbar max-w-full mb-6">
              {[
                { value: "geral", label: "Geral", icon: Building2 },
                { value: "catalogo", label: "Catálogo", icon: Package },
                { value: "contatos", label: "Contatos", icon: Users },
                { value: "arquivos", label: "Arquivos", icon: FileText },
                { value: "reviews", label: "Avaliações", icon: Star },
              ].map(({ value, label, icon: TIcon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="inline-flex items-center justify-center h-7 px-3 ds-meta font-semibold rounded-full transition-all gap-1.5 whitespace-nowrap cursor-pointer data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-white/5 data-[state=active]:shadow-xs text-white/60 hover:text-white"
                >
                  <TIcon className="h-3.5 w-3.5" />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* TAB: GERAL */}
            <TabsContent value="geral" className="space-y-4">
              <div className="rounded-[var(--radius-card)] border-none glass bg-white/5 border-white/10 p-5">
                <h3 className="mb-4 text-sm font-semibold">Informações da Empresa</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  {[
                    { label: "Razão Social", value: supplier.legal_name },
                    { label: "CNPJ / Tax ID", value: supplier.document, mono: true },
                    { label: "País", value: supplier.country },
                    {
                      label: "Cidade / Estado",
                      value: [supplier.city, supplier.state].filter(Boolean).join(", "),
                    },
                    { label: "Endereço", value: supplier.address },
                    { label: "CEP / ZIP", value: supplier.zip },
                    {
                      label: "SLA de Atendimento",
                      value: supplier.sla_hours ? `${supplier.sla_hours}h` : null,
                    },
                    { label: "Condições de Pagamento", value: supplier.payment_terms },
                  ].map(({ label, value, mono }) => (
                    <div key={label}>
                      <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
                      <div className={cn("text-sm font-medium", mono && "font-mono")}>
                        {value || "—"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Links */}
              <div className="rounded-[var(--radius-card)] border-none glass bg-white/5 border-white/10 p-5">
                <h3 className="mb-4 text-sm font-semibold">Links & Redes</h3>
                <div className="flex flex-wrap gap-3">
                  {supplier.website && (
                    <a
                      href={supplier.website}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline border-none rounded-[var(--radius-card)] px-3 py-2 glass-card border-none"
                    >
                      <Globe className="h-3.5 w-3.5" /> Portal B2B
                    </a>
                  )}
                  {supplier.instagram && (
                    <a
                      href={`https://instagram.com/${supplier.instagram.replace("@", "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-xs text-pink-600 hover:underline border-none rounded-[var(--radius-card)] px-3 py-2 glass-card border-none"
                    >
                      <Instagram className="h-3.5 w-3.5" /> Instagram
                    </a>
                  )}
                  {supplier.whatsapp && (
                    <a
                      href={`https://wa.me/${supplier.whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-xs text-green-600 hover:underline border-none rounded-[var(--radius-card)] px-3 py-2 glass-card border-none"
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                    </a>
                  )}
                  {supplier.email && (
                    <a
                      href={`mailto:${supplier.email}`}
                      className="flex items-center gap-1.5 text-xs text-foreground hover:underline border-none rounded-[var(--radius-card)] px-3 py-2 glass-card border-none"
                    >
                      <Mail className="h-3.5 w-3.5" /> {supplier.email}
                    </a>
                  )}
                </div>
              </div>

              {/* Notas */}
              {supplier.notes && (
                <div className="rounded-[var(--radius-card)] border-none glass bg-white/5 border-white/10 p-5">
                  <h3 className="mb-2 text-sm font-semibold">
                    Observações & Política de Comissionamento
                  </h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {supplier.notes}
                  </p>
                </div>
              )}

              {/* Tags */}
              {supplier.tags && supplier.tags.length > 0 && (
                <div className="rounded-[var(--radius-card)] border-none glass bg-white/5 border-white/10 p-5">
                  <h3 className="mb-3 text-sm font-semibold flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5" /> Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {supplier.tags.map((t: string) => (
                      <span
                        key={t}
                        className="rounded-full border-none glass-card border-none px-2.5 py-1 text-xs text-muted-foreground"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* TAB: CATÁLOGO */}
            <TabsContent value="catalogo">
              {agency && <TabProducts supplierId={id} agencyId={agency.id} />}
            </TabsContent>

            {/* TAB: CONTATOS */}
            <TabsContent value="contatos">
              {agency && <TabContacts supplierId={id} agencyId={agency.id} />}
            </TabsContent>

            {/* TAB: ARQUIVOS */}
            <TabsContent value="arquivos">
              {agency && <TabFiles supplierId={id} agencyId={agency.id} />}
            </TabsContent>

            {/* TAB: AVALIAÇÕES */}
            <TabsContent value="reviews">
              {agency && <TabReviews supplierId={id} agencyId={agency.id} />}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ── Sidebar contextual ── */}
      <aside className="hidden lg:flex w-72 shrink-0 flex-col border-l border-border glass-card border-none overflow-y-auto">
        {/* Markup */}
        <div className="border-b border-border p-5">
          <div className="flex items-center gap-1.5 mb-2 ds-label-caps text-[--brand-primary,theme(colors.pink.600)]">
            <Percent className="h-3.5 w-3.5" /> Markup / Comissão Base
          </div>
          <div className="text-4xl font-bold text-foreground font-mono">
            {Number(supplier.commission_rate).toFixed(2)}%
          </div>
          {supplier.payment_terms && (
            <p className="mt-2 text-xs text-muted-foreground">{supplier.payment_terms}</p>
          )}
        </div>

        {/* Rating */}
        <div className="border-b border-border p-5">
          <div className="ds-label-caps text-muted-foreground mb-2">
            Avaliação
          </div>
          <StarRatingDisplay rating={supplier.rating} />
        </div>

        {/* SLA */}
        <div className="border-b border-border p-5">
          <div className="ds-label-caps text-muted-foreground mb-2">
            SLA de Resposta
          </div>
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <Clock className="h-4 w-4 text-muted-foreground" />
            {supplier.sla_hours ? `${supplier.sla_hours}h` : "Não informado"}
          </div>
        </div>

        {/* Contato rápido */}
        {(supplier.phone || supplier.email || supplier.whatsapp) && (
          <div className="border-b border-border p-5 space-y-3">
            <div className="ds-label-caps text-muted-foreground">
              Contato Rápido
            </div>
            {supplier.phone && (
              <a
                href={`tel:${supplier.phone}`}
                className="flex items-center gap-2.5 text-sm text-foreground hover:text-[--brand-primary,theme(colors.pink.500)] transition-colors"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-card)] border-none glass bg-white/5 border-white/10">
                  <PhoneCall className="h-3.5 w-3.5" />
                </div>
                {supplier.phone}
              </a>
            )}
            {supplier.whatsapp && (
              <a
                href={`https://wa.me/${supplier.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 text-sm text-green-700 hover:underline"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-card)] border-none glass bg-white/5 border-white/10">
                  <MessageCircle className="h-3.5 w-3.5 text-green-600" />
                </div>
                WhatsApp
              </a>
            )}
            {supplier.email && (
              <a
                href={`mailto:${supplier.email}`}
                className="flex items-center gap-2.5 text-sm text-foreground hover:text-[--brand-primary,theme(colors.pink.500)] transition-colors truncate"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-card)] border-none glass bg-white/5 border-white/10 shrink-0">
                  <Mail className="h-3.5 w-3.5" />
                </div>
                <span className="truncate">{supplier.email}</span>
              </a>
            )}
          </div>
        )}

        {/* Estatísticas Reais de Uso */}
        {stats && (
          <div className="p-5 border-t border-border space-y-4">
            <div className="ds-label-caps text-muted-foreground">
              Métricas do Parceiro
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-[var(--radius-card)] border-none glass bg-white/5 border-white/10">
                <div className="ds-meta text-muted-foreground uppercase font-bold">Vendas</div>
                <div className="text-lg font-bold text-foreground mt-0.5">{stats.usageCount}</div>
              </div>
              <div className="p-3 rounded-[var(--radius-card)] border-none glass bg-white/5 border-white/10">
                <div className="ds-meta text-muted-foreground uppercase font-bold">Produtos</div>
                <div className="text-lg font-bold text-foreground mt-0.5">{stats.productsCount}</div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-[var(--radius-card)] border-none glass bg-white/5 border-white/10">
              <div className="ds-meta text-muted-foreground uppercase font-bold">Avaliação Média</div>
              <div className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="text-xs font-bold text-foreground">
                  {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "N/A"}
                </span>
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
