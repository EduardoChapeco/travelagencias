# UI-008 - 01_EVIDENCE_AND_REPRODUCTION.md
# EVIDÊNCIAS E COMPROVAÇÃO DE REPRODUÇÃO - UI-008

## 1. Evidência no Código
Ao inspecionar o arquivo [agency.$slug.vouchers.tsx](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.vouchers.tsx), identificou-se:

* **Ausência de CTA no Empty State:** Na linha 305-310, o componente `EmptyState` é instanciado sem passar a propriedade `action`:
  ```tsx
  {vouchersQ.data && vouchersQ.data.data.length === 0 && (
    <EmptyState
      title="Nenhum voucher emitido"
      description="Gere vouchers manualmente ou importe PDFs da operadora a partir da tela de cada roteiro de viagem."
    />
  )}
  ```
  Isso faz com que a interface falhe em expor caminhos para que o usuário saia do estado vazio de forma autônoma (ausência de CTA).
* **Desfoque e Compressão:** O desfoque global causado pelo `.os-workspace` (analisado em `UI-001`) sobrepõe o Empty State, enquanto o `max-w-sm` na tag `p` do [PageHeader.tsx:L44](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/components/shell/PageHeader.tsx#L44) pode comprimir o texto excessivamente se a largura do container pai for estrangulada pelo dock lateral.

## 2. Status de Classificação
**CONFIRMADO NO CÓDIGO** (O Empty State de fato não possui o prop `action` configurado na rota de vouchers).
