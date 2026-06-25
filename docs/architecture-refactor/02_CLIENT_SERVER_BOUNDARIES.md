# Fronteiras Cliente & Servidor (Client/Server Boundaries)

Este documento define as regras de segregação de código cliente e servidor para a refatoração do TravelAgencias/TravelOS, auditando a distribuição isomórfica atual sob o TanStack Start.

---

## 🔍 Auditoria das Fronteiras Atuais

O TanStack Start é um framework isomórfico (roda código no servidor para SSR e hidrata no cliente). No entanto, a falta de limites explícitos no código atual gera riscos de segurança e desperdício de memória:

| Arquivo / Diretório                                | Executa atualmente | Deveria executar                             | Dependências               | Risco de Bundle                          | Correção Necessária                                                                            |
| -------------------------------------------------- | ------------------ | -------------------------------------------- | -------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `src/integrations/supabase/client.ts`              | Ambos              | Ambos (Isomórfico)                           | `@supabase/supabase-js`    | Baixo                                    | Garantir uso de tokens seguros e nenhum vazamento de `service_role` key.                       |
| `src/components/studio/StudioMapWidget.tsx`        | Ambos              | **Cliente Apenas**                           | `leaflet`, `react-leaflet` | Alto (Quebra o SSR sem mock da `window`) | Adicionar guarda `typeof window === 'undefined'` ou carregar dinamicamente via component lazy. |
| `src/lib/exportRoomingList.ts`                     | Ambos              | **Cliente Apenas**                           | `xlsx`, blob downloads     | Médio (Processa Node blobs no SSR)       | Adicionar proteção de ambiente para evitar chamadas pelo SSR.                                  |
| `src/services/` (ex: `rooming.ts`, `proposals.ts`) | Ambos              | **Servidor / Edge** (Lógica de Persistência) | Chamadas Supabase, RPCs    | Médio (Grava queries no cliente)         | Migrar lógica pesada de validação para Server Functions (`createServerFn`).                    |

---

## 🛠️ Regras de Isolamento de Código

Para estabilizar a arquitetura, implementaremos as seguintes barreiras de fronteira:

### 1. Proteção contra Vazamento de Secrets (Server-Only)

- **Regra**: Chaves de API de terceiros (como OpenAI, e-mail SMTP, chaves de webhook de integradores de pagamento e a chave `SUPABASE_SERVICE_ROLE_KEY`) nunca devem ser importadas no cliente.
- **Mecanismo**: Utilizar a diretiva `'server-only'` do TanStack Start e do Vite. Se qualquer arquivo cliente tentar importar um módulo contendo essa marcação, a compilação falhará imediatamente.
- **Variáveis de Ambiente**: Separar estritamente variáveis públicas com prefixo `VITE_` das variáveis do servidor.

### 2. Proteção contra Dependências de DOM (Client-Only)

- **Regra**: Bibliotecas que acessam diretamente o DOM global (`document`, `window`, `navigator`), como `leaflet`, `html2canvas`, e APIs de download de Blob, não devem ser executadas no servidor SSR.
- **Mecanismo**: Componentes contendo essas dependências serão isolados sob arquivos com extensão `.client.tsx` ou carregados dinamicamente no React usando o padrão de carregamento preguiçoso (Lazy loading) com `Suspense`:
  ```typescript
  const StudioMapWidgetLazy = lazy(() =>
    import("@/components/studio/StudioMapWidget").then((m) => ({ default: m.StudioMapWidget })),
  );
  ```

### 3. Segregação de Validação (Zod Schemas)

- **Regra**: Schemas Zod de validação de payload devem ser puramente isomórficos. Eles não devem importar dependências de servidor (como conexões de banco) nem dependências de cliente (como estados de UI). Eles servem como contratos de verdade de dados compartilhados.
