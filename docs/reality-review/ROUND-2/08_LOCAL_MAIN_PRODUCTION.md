# Comparativo: Local vs. Main vs. Produção — Rodada 2 (TravelOS)

Este documento compara a conformidade entre o código local do workspace (Working Tree), o repositório remoto (Main) e o ambiente de deploy de produção.

---

## 1. Tabela de Divergências Encontradas

| Elemento                               | Local (Working Tree)                                                 | Remoto (Main)                              | Produção (Deploy)                         | Divergência                                                          | Impacto                                                                 |
| :------------------------------------- | :------------------------------------------------------------------- | :----------------------------------------- | :---------------------------------------- | :------------------------------------------------------------------- | :---------------------------------------------------------------------- |
| **Ações do Chat (Contracts/Vouchers)** | Código real de inserções físicas em `contracts` e `vouchers`.        | Inexistente na branch `main`.              | Sem suporte real a estas ações.           | Local possui implementações completas; main está vazio.              | Operadores na nuvem encontram erros ao tentar gerar contratos via chat. |
| **Conciliação Sem Mocks**              | `reconciliation.tsx` atualizada consumindo e alterando o banco real. | Rota antiga com dados mockados.            | Exibindo dados falsos estáticos.          | Código local livre de mocks; remoto desatualizado.                   | Clientes e transações fictícias são mostrados no ar.                    |
| **Novas Migrações**                    | Migrações `20260715...` a `20260717...` na pasta.                    | Inexistentes na branch `main`.             | Não aplicadas no Supabase de produção.    | Banco local possui 6 novas tabelas e funções matemáticas de cálculo. | Ausência do cálculo de comissão progressiva no servidor de produção.    |
| **API Keys de IA**                     | Configuradas de forma simulada/fallback local no `.env`.             | Não versionadas por questões de segurança. | Injetadas no painel do provedor na nuvem. | Ambiente local usa fallbacks baseados em strings quando vazias.      | Comportamento local difere na precisão gramatical comparado à nuvem.    |

---

## 2. Status de Sincronização e Riscos de Build

O branch local está configurado como `main`. Como as implementações locais e migrações SQL não foram commitadas ou integradas ao Git, a produção e o branch `main` remoto encontram-se desatualizados. Qualquer build na nuvem falhará em incluir os recursos refinados até que ocorra um push seguro.
