# Divisão de Código e Otimização de Rotas (Code Splitting)

Este documento analisa as rotas mais pesadas da aplicação e propõe uma estratégia de divisão de código (code splitting) para reduzir drasticamente o tamanho do bundle principal e aliviar a memória consumida pelo compilador Vite.

---

## 🔍 Análise das Rotas Críticas (Monólitos de Rota)

Atualmente, várias páginas importam dezenas de modais, formulários e abas estaticamente no topo do arquivo. Isso faz com que todo esse código seja executado no primeiro render e faça parte do mesmo chunk monolítico.

| Rota | Tamanho do Código | Imports Pesados e Críticos | Impacto no Bundle | Correção Necessária |
| ---- | ----------------- | -------------------------- | ----------------- | ------------------- |
| `agency.$slug.group-tours.$id.tsx` | ~93 kB (2.213 linhas) | `RichTextEditor`, `PaymentReceiptModal`, `html2canvas` | **Crítico**. Contém abas de passageiros, financeiro, rooming list e divulgação. | **Code Splitting de Abas**. Separar as abas em componentes e carregá-los sob demanda. Mover componente principal para `agency.$slug.group-tours.$id.lazy.tsx`. |
| `agency.$slug.crm.$lead_id.tsx` | ~76 kB (1.800+ linhas) | `RichTextEditor`, timelines, modais de cotação | **Alto**. Monólito de cotação e CRM. | **Lazy load** dos painéis secundários (como histórico e agendamentos). Mover componente para `.lazy.tsx`. |
| `agency.$slug.omnichannel.tsx` | ~73 kB (1.700+ linhas) | Integrações AI, chat, webhooks | **Alto**. Carrega scripts de chat e áudio. | **Code Splitting**. Separar painel de configurações de IA do chat ativo. |
| `agency.$slug.rooming-list.tsx` | ~42 kB (1.023 linhas) | `DndContext`, `exportRoomingListDocx`, `xlsx` | Médio | Separar formulários de criação de quarto em modais carregados de forma preguiçosa. |
| `agency.$slug.proposals.$id.tsx` | ~11 kB | `RichTextEditor`, `StudioMapWidget` | Alto (indireto) | O editor e os widgets do Studio devem ser chunks separados carregados apenas quando o usuário edita uma proposta. |

---

## 🛠️ Plano Estratégico de Code Splitting

Para resolver o consumo de heap de 8GB no build, aplicaremos o seguinte fluxo de divisão de código:

### 1. Separação de Componentes da Rota (`.lazy.tsx`)
O TanStack Router gera o mapa de rotas a partir dos arquivos físicos em `src/routes/`. A alteração canônica consiste em:
- Manter em `src/routes/agency.$slug.group-tours.$id.tsx` apenas a definição da rota, loader e dados de SEO (estático).
- Criar `src/routes/agency.$slug.group-tours.$id.lazy.tsx` contendo o componente da página e importando dinamicamente os sub-painéis.
- O mesmo se aplica a todas as rotas com componentes superiores a 300 linhas de código.

### 2. Carregamento Preguiçoso de Modais e Componentes Pesados
Substituir os imports estáticos de modais de formulário por imports dinâmicos do React.
Exemplo com o `PaymentReceiptModal`:
```typescript
import { lazy, Suspense } from "react";

const PaymentReceiptModal = lazy(() =>
  import("@/components/financial/PaymentReceiptModal").then((m) => ({
    default: m.PaymentReceiptModal,
  }))
);

// Na renderização da página:
{receiptData && (
  <Suspense fallback={<div>Carregando Recibo...</div>}>
    <PaymentReceiptModal
      isOpen={!!receiptData}
      onClose={() => setReceiptData(null)}
      data={receiptData}
    />
  </Suspense>
)}
```

### 3. Divisões por Abas (Tab Code Splitting)
Em páginas de visualização detalhada contendo navegação em abas (como a página de detalhes da excursão), o código de abas pesadas como "Financeiro & ROI" e "Mapa de Assentos" não deve ser processado a menos que a respectiva aba seja clicada pelo usuário. Carregaremos cada aba em um componente de suspensão dinâmico.
