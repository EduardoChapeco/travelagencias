# Fase 1 — Arquitetura de Navegação

**Status:** CONCLUÍDO  
**Critério de pronto:** Build passa, sidebar reorganizada, sub-navegação de Viagens expandida, rotas antigas funcionando (Verificado ✅)

## Arquivos a modificar

- `src/components/shell/AppSidebar.tsx` — reorganização total
- `src/routes/agency.$slug.trips.$id.tsx` — expandir de 5 para 12 abas

## Arquivos a criar (novas sub-rotas da viagem)

- `src/routes/agency.$slug.trips.$id.flights.tsx` — Aéreos (tickets + itinerário placeholder)
- `src/routes/agency.$slug.trips.$id.destination.tsx` — Destino & Segurança (fix Fase 10)
- `src/routes/agency.$slug.trips.$id.boarding.tsx` — Check-in & Embarque contextual
- `src/routes/agency.$slug.trips.$id.confirmation.tsx` — Confirmação de Reserva (stub)

## Nova estrutura da sidebar

```
Dashboard
Dia a Dia: Meu Dia | Agenda | Conversas
Vendas & CRM: CRM | Propostas | Contratos
Viagens: Todas as Viagens | Aéreos & Conferência | Check-in & Embarques
Grupos: Excursões & Grupos | Frota & Ônibus
Clientes & Parceiros: Clientes | Corporativo | Fornecedores
Financeiro
Suporte & Vistos: Suporte | Vistos
Site & Marketing: Site | Concorrentes
Identidade & Templates (admin): Identidade Visual | Destination Intelligence
Gestão (admin): Produtividade | Empresa | Equipe | Design System | Conexões | Assinatura | Config
```

## Nova sub-navegação da viagem

Visão Geral | Passageiros | Financeiro | Aéreos (NEW) | Hospedagem* | Contrato | Confirmação (NEW) | Voucher | Check-in & Embarque (NEW) | Destino & Segurança (NEW) | Histórico*

*placeholder para fases futuras

## Compatibilidade

- `/agency/:slug/boarding` — continua funcionando (sidebar "Check-in & Embarques" aponta para cá como global)
- `/agency/:slug/vouchers` — continua funcionando (sidebar "Aéreos & Conferência" aponta para `?tab=flight_audit`)
- Todas as magic links e rotas de clientes intactos
