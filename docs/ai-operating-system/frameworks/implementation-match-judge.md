# Framework: Implementation Match Judge

**Propósito:** Auditar empiricamente se a implementação executada pelo Antigravity bate exatamente com o prompt original do usuário e com o PRD amplificado aprovado, bloqueando entregas parciais ou simplificações não-autorizadas.

---

## 1. O Processo de Auditoria de Match

Este framework deve ser ativado pelo **QA / Match Reviewer** após a conclusão da fase de codificação. O processo de auditoria compreende as seguintes etapas:

```markdown
PRD Original ───► Comparação de Requisitos ───► Arquivos Físicos ───► Match Report
```

1. **Leitura de Requisitos de Entrada:** Mapear todos os requisitos descritos na seção "Critérios de Aceitação" do **PRD Expandido** ou da tarefa em execução.
2. **Varredura de Arquivos Físicos:** Inspecionar todos os arquivos alterados (usando o diff do git ou revisando os arquivos alterados diretamente).
3. **Mapeamento de Simplificações ou Omissões:** Procurar por lógicas omitidas ou simplificadas de forma injustificada (ex: não adicionar a RLS sob o argumento de que "era complexo demais para o tempo estipulado").
4. **Verificação de Fakes e Mocks:** Identificar botões com comportamento simulado (`alert('salvo')`), links para `#` em menus importantes ou banco de dados com tabelas desconectadas da UI.

---

## 2. Relatório de Correspondência (Prompt-to-Code Match Report)

O Match Judge deve obrigatoriamente produzir o seguinte relatório final:

```markdown
# 🔍 PROMPT-TO-CODE MATCH REPORT: [Nome da Feature]

## 1. Tabela Comparativa de Requisitos

| Requisito Aprovado         | Arquivo e Linhas de Implementação | Status | Comprovação / Desvio técnico                            |
| :------------------------- | :-------------------------------- | :----- | :------------------------------------------------------ |
| [Ex: RLS isolando tenants] | [types.ts] e [migrations.sql]     | OK     | Verificado nas políticas criadas na migration X         |
| [Ex: Paginação na tabela]  | `src/routes/leads.tsx`            | OK     | Adicionado botões de Próximo/Anterior e limites físicos |

## 2. Auditoria de Elementos Fake/Mocks

- **Callbacks Funcionais:** [Sim / Não - Se não, listar botões/formulários sem envio real de dados]
- **Consumo do Supabase:** [Confirmado / Mocado]
- **Comentários de TODO no código:** [Listar trechos de código com marcações "TODO", "Ajustar depois", "Fixme"]

## 3. Status Final de Match

- **Status:** [MATCH COMPLETO / MATCH PARCIAL / MATCH FALHOU / NÃO FOI POSSÍVEL COMPROVAR]
- **Ações de Ajuste Necessárias:** [Lista de correções para obter Match Completo se o status não for 100% OK]
```
