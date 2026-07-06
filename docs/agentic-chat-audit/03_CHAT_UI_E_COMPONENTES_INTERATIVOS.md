# Chat UI e Componentes Interativos

Este documento audita a infraestrutura de renderização dinâmica no chat, a validação de blocos e o comportamento dos componentes interativos.

---

## 1. Arquitetura de Renderização e Validação

O chat de IA não renderiza código JSX arbitrário ou HTML não seguro. Ele utiliza uma whitelist de componentes baseada em estrutura de dados controlada:

- **Componente Base**: [ChatBlockRenderer.tsx](file:///c:/Users/Turis Tecnologia SMO/.gemini/antigravity-ide/scratch/travelagencias/src/components/shell/ChatBlockRenderer.tsx) atua como um parser de blocos.
- **Leitura de Contexto**: A prop `context` das mensagens do chat é lida. Se houver um objeto `tool_call` válido contendo `code` e `payload`, o renderizador renderiza o card interativo correspondente.
- **Cards Implementados**:
  - **LeadCard**: Exibe dados capturados do lead (Nome, Destino, Telefone, Notas) de forma limpa.
  - **ConfirmationCard**: Exibe os parâmetros a serem gravados no banco, o nível de risco da ação (low/medium/high) e os botões "Confirmar" e "Cancelar".

---

## 2. Persistência de Estado de Confirmação

Para garantir a confiabilidade e evitar execuções de ações duplicadas por reload da página ou mudança de rota:

- O `ConfirmationCard` lê e salva seu estado no `localStorage` via chave `turis.aichat.action.${messageId}`.
- O estado salvo contém o status (`confirmed` ou `cancelled`) e a mensagem de resultado.
- Se a ação for confirmada, os botões somem e um banner verde fixo exibe a mensagem de sucesso. Se for cancelada, exibe o aviso de cancelamento, blindando o card contra interações subsequentes.

---

## 3. Matriz de Componentes de Bloco do Chat

| Nome do Bloco        | Código / Trigger   | UI Renderizada                                   | Ações Associadas                      | Estado Real            |
| :------------------- | :----------------- | :----------------------------------------------- | :------------------------------------ | :--------------------- |
| **LeadCard**         | `create_lead`      | Card de visualização estruturada de Lead         | Nenhuma (somente leitura)             | **REAL PONTA A PONTA** |
| **ConfirmationCard** | Qualquer tool call | Card de alteração contendo dados, risco e botões | Confirmar (chama Executor) e Cancelar | **REAL PONTA A PONTA** |
| **ComparisonTable**  | N/A                | Nenhuma                                          | N/A                                   | **AUSENTE**            |

---

## 4. Classificação das Entregas de UI de Bloco

- **Chat Block Renderer**: **REAL PONTA A PONTA**
- **ConfirmationCard com Persistência**: **REAL PONTA A PONTA**
- **LeadCard Interativo**: **REAL PONTA A PONTA**
