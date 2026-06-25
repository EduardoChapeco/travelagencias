# Comparativo: Local vs. Main vs. Produção (TravelOS)

Este relatório compara o estado atual da árvore de trabalho local (Working Tree) com os commits publicados no repositório remoto (Main) e o deploy de produção, evidenciando riscos de integração.

---

## 1. Tabela Comparativa de Elementos

| Elemento                      | Local (Working Tree)                                                 | Remoto (Main)                                  | Produção (Deploy)                          | Divergência                                                      | Impacto                                                        |
| :---------------------------- | :------------------------------------------------------------------- | :--------------------------------------------- | :----------------------------------------- | :--------------------------------------------------------------- | :------------------------------------------------------------- |
| **Página de Conciliação**     | Código refatorado sem mocks e sem localPending.                      | Versão legada contendo dados falsos estáticos. | Versão legada com mocks ativos.            | Diferenças de fluxos de quitação e fallbacks locais.             | Operadores vêem dados mockados na produção.                    |
| **Tabelas do Ledger e RLS**   | Migrações `20260716...` e `20260717...` ativas na pasta local.       | Inexistentes na branch `main`.                 | Não aplicadas no Supabase de produção.     | Banco local possui 6 novas tabelas e triggers lógicos de travas. | Indisponibilidade de travas contábeis no ambiente de produção. |
| **Motor de Ações de IA**      | `ActionExecutor.ts` e arquivos `src/lib/ai` estruturados localmente. | Inexistentes na branch `main`.                 | Ausentes na produção.                      | Nova inteligência de tool call não está integrada remotamente.   | Chat de IA de produção opera no modelo rudimentar sem ações.   |
| **Secrets de IA (`API Key`)** | Pendente / Mapeado no `.env` local.                                  | Não comitado por motivos de segurança.         | Cadastrado no dashboard do Lovable/Vercel. | Uso de simulador local na ausência de chave.                     | Testes locais dependem do interceptador de strings fallback.   |

---

## 2. Impacto de Deploy

As alterações locais não foram integradas nem comitadas no Git da agência. Por conseguinte, qualquer atualização remota ou build na nuvem falhará em carregar as novas funcionalidades contábeis ou o chat com inteligência de tool calling até que uma ação explícita de push seja efetuada.
