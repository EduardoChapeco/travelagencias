# UI-001 - 01_EVIDENCE_AND_REPRODUCTION.md
# EVIDÊNCIAS E COMPROVAÇÃO DE REPRODUÇÃO - UI-001

## 1. Evidência no Código
Ao auditar o arquivo [AppShell.tsx](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/components/shell/AppShell.tsx), identificou-se a seguinte estrutura de overlay na linha 172-179:

```tsx
      {/* 1.5. Centralized Glass Panel / Backdrop Blur */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `rgba(0, 0, 0, ${dimOpacity / 100})`,
          backdropFilter: "blur(32px) saturate(180%)",
          WebkitBackdropFilter: "blur(32px) saturate(180%)",
        }}
      />
```

Esta camada absoluta intercepta todo o plano de fundo do workspace e aplica um `backdrop-filter: blur(32px)` fixo e incondicional, forçando o desfoque global em todas as rotas internas, independentemente da variável `blurIntensity` controlada pelo tema do usuário.

## 2. Status de Classificação
**CONFIRMADO NO CÓDIGO** (A regra de overlay força o desfoque global de forma fixa).
