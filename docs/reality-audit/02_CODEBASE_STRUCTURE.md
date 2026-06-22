# Estrutura do Codebase

Mapeamento da organização física do código do TravelAgencias/TravelOS, detalhando as rotas, os módulos lazy loading, e a estrutura de dados.

---

## 📂 Diretórios Principais

```
c:\Users\eduar\.gemini\antigravity-ide\scratch\travelagencias
├── docs/                      # Documentação de Auditorias e Refatorações
├── src/
│   ├── components/            # Componentes reutilizáveis (UI, Shell, Studio)
│   ├── integrations/          # Integração com Supabase (Cliente e Types)
│   ├── lib/                   # Utilitários (Dnd, OCR, Exportação)
│   ├── routes/                # Estrutura de Rotas (TanStack Router)
│   ├── services/              # Serviços de Integração (Proposals, Settings)
│   └── styles.css             # Estilos globais (Design System)
├── supabase/
│   ├── functions/             # Deno Edge Functions
│   └── migrations/            # Scripts de Migração SQL
└── package.json               # Dependências e scripts npm
```

---

## 🗺️ Mapa de Rotas e Code-Splitting

O sistema utiliza o **TanStack Router** com arquivos `.lazy.tsx` para carregar trechos pesados da UI de forma sob demanda.

### 1. Rotas Principais do Dashboard da Agência (`/agency/$slug/...`)
- **CRM**:
  - [agency.$slug.crm.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.crm.tsx) - Quadro Kanban de oportunidades.
  - [agency.$slug.crm.$lead_id.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.crm.$lead_id.tsx) - Rota de entrada leve.
  - [agency.$slug.crm.$lead_id.lazy.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.crm.$lead_id.lazy.tsx) - **LAZY** (76KB). Painel de detalhes, timeline de interações e contatos do lead.
- **Excursões & Grupos**:
  - [agency.$slug.group-tours.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.group-tours.tsx) - Listagem de excursões.
  - [agency.$slug.group-tours.$id.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.group-tours.$id.tsx) - Rota de entrada leve.
  - [agency.$slug.group-tours.$id.lazy.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.group-tours.$id.lazy.tsx) - **LAZY** (93KB). Central do grupo, rooming list, ônibus e aprovação de B2C.
- **Omnichannel**:
  - [agency.$slug.omnichannel.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.omnichannel.tsx) - Rota de entrada leve.
  - [agency.$slug.omnichannel.lazy.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.omnichannel.lazy.tsx) - **LAZY** (73KB). Painel de chat integrado (WhatsApp/Email) com templates de IA.
- **Cotações (Proposals)**:
  - [agency.$slug.proposals.index.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.proposals.index.tsx) - Lista de propostas comerciais.
  - [agency.$slug.proposals.new.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.proposals.new.tsx) - Nova cotação (InPage form).
  - [agency.$slug.proposals.$id.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.proposals.$id.tsx) - Editor avançado de cotação (Proposal Studio).
