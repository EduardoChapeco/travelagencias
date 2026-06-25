# Orçamentos de Compilação (Build Budgets)

Este documento estabelece metas numéricas rígidas para o tamanho dos chunks e consumo de recursos durante a compilação do TravelAgencias/TravelOS após o término do plano de refatoração de arquitetura.

---

## 📉 Limites de Tamanho e Performance (Budgets)

A tabela abaixo define os limites atuais (baseline) versus os limites finais exigidos para aprovação da refatoração:

| Métrica                                           |                 Baseline Atual |             Limite Alvo (Budget) | Objetivo                                                                          |
| ------------------------------------------------- | -----------------------------: | -------------------------------: | --------------------------------------------------------------------------------- |
| **Consumo de Heap no Build**                      | Falha em 2GB e 4GB (Exige 8GB) | **Sucesso com <2.0 GB (Padrão)** | Permitir compilação em instâncias CI de baixa memória e agilizar o ciclo local.   |
| **Chunk Inicial do Cliente (`index.js`)**         |      **1.211,48 kB** (1.21 MB) |                     **< 600 kB** | Reduzir o tempo de download do JavaScript inicial (FCP / TBT) na primeira visita. |
| **Chunk do Editor WYSIWYG (`RichTextEditor.js`)** |                      418,11 kB |                     **< 450 kB** | Garantir que o Tiptap permaneça isolado e carregado apenas em modo de edição.     |
| **Módulos Server-only no Cliente**                |                 0 (Preservado) |                  **0 (Estrito)** | Garantir segurança de chaves e performance.                                       |
| **Tempo de Execução do Build**                    |             ~54 segundos (8GB) |                **< 35 segundos** | Acelerar deploys de produção e integração contínua.                               |

---

## 🚫 Regras de Integridade do Bundle

1. **Garantia de Não-Regressão**: Se qualquer alteração aumentar o chunk principal (`index.js`) acima de `600 kB` ou o build exceder `2GB` de consumo de heap, o pipeline de integração contínua (CI) deve falhar automaticamente.
2. **Separação de PDF, Excel e Imagem**:
   - `xlsx` (SheetJS), `jspdf` e `html2canvas` **não devem estar presentes** sob nenhuma circunstância no bundle primário do cliente.
   - Qualquer importação direta/estática desses módulos nos arquivos de rotas gerará erro de lint e quebra do build.
3. **Isolamento de Mapas (Leaflet)**:
   - Os arquivos JS do Leaflet e seus estilos CSS associados devem ser confinados ao chunk do StudioMapWidget, evitando carregamento na página inicial ou portais.
