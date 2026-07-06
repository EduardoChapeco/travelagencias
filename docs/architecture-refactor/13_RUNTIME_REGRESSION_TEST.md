# Plano de Testes de Runtime e Regressão — Auditoria Forense

Este documento define o roteiro de testes em runtime para garantir que a transição para carregamento lazy das três rotas principais (`agency.$slug.group-tours.$id`, `agency.$slug.crm.$lead_id`, e `agency.$slug.omnichannel`) não causou regressões visuais, de estado ou funcionais no TravelAgencias/Turis.

---

## 1. Roteiro Geral de Validação de Navegação

Para cada uma das três rotas refatoradas, realize os seguintes testes básicos de ciclo de vida:

1. **Acesso Direto (Deep Linking)**: Copiar a URL da rota e colar em uma nova aba do navegador para validar o SSR e a hidratação inicial sem chunks corrompidos.
2. **Navegação Interna**: Navegar do dashboard principal até a rota usando os links do menu lateral (`AppSidebar`) para testar a transição suave do SPA.
3. **Alternância de Contexto (Tenant Switcher)**: Trocar de agência enquanto estiver na rota e verificar se o estado do `useAgency()` invalida corretamente as queries e carrega os dados do novo tenant.
4. **Histórico (Navegar e Voltar)**: Entrar na página detalhe, clicar em um link interno, voltar no botão "Voltar" do navegador e verificar se o estado local é recuperado e as assinaturas de eventos permanecem ativas.
5. **Logs do Console e Rede**: Manter o DevTools aberto para assegurar que:
   - Não há erros de hidratação (hydration mismatch).
   - Chunks lazy-loaded são carregados de forma assíncrona (Status 200/304 no Network tab).
   - Sem loops infinitos de re-renderização ou chamadas de query duplicadas.

---

## 2. Roteiro Específico por Módulo

### A. Grupo e Excursões (`/agency/$slug/group-tours/$id`)

- **Passageiros e Inscrições**:
  - Clicar em "Inscrever passageiro", preencher formulário e salvar. Validar se o passageiro aparece na lista.
  - Aprovar inscrição pendente e checar se gera os lançamentos financeiros no banco de dados.
- **Hospedagem e Rooming List**:
  - Acessar a aba "Rooming List".
  - Arrastar passageiros para quartos virtuais e checar a persistência em tempo real.
  - Clicar em "Exportar Excel" e comprovar o download da planilha preenchida.
- **Ônibus e Assentos**:
  - Acessar a aba "Mapa do Ônibus".
  - Mudar assentos e verificar se as posições são salvas sem re-renderização intermitente.
- **Flyers e Divulgação**:
  - Acessar "Divulgação & Flyers".
  - Testar geração de Flyer A4 e Stories Reels, exportando os arquivos como imagens válidas.

### B. CRM Lead (`/agency/$slug/crm/$lead_id`)

- **Dados e Checklist**:
  - Abrir a aba de edição rápida, fazer alterações no nome/ WhatsApp e clicar em salvar.
  - Marcar/desmarcar itens do checklist de atividades do lead.
- **Promoção para Cliente**:
  - Clicar em "Converter em Cliente".
  - Validar se o sistema exige os campos mandatórios (CPF, Nascimento, Telefone) antes de permitir a promoção.
  - Disparar animação de confetes ao converter com sucesso.
- **Agenda e Lembretes**:
  - Agendar uma nova reunião e sincronizar com o Google Calendar.
  - Deletar compromisso e verificar a invalidação da query.

### C. Omnichannel Chat (`/agency/$slug/omnichannel`)

- **Carregamento de Sessões**:
  - Validar se a lista de contatos na lateral esquerda carrega com os canais (WhatsApp, Instagram, Email).
- **Envio de Mensagens**:
  - Enviar mensagem de texto e anexar arquivo. Comprovar recebimento na linha de conversação.
- **Cérebro de IA**:
  - Clicar no botão de IA para sugerir uma resposta automática.
  - Verificar se o editor de texto preenche a resposta gerada.
- **Filtros e Paginação**:
  - Alternar filtros entre "Meus Chats", "Não Atendidos" e "Arquivados" e testar a atualização da lista.

---

## 3. Matriz de Cobertura de Regressões

| Item a Verificar          | Risco Associado                   | Critério de Aceitação (Passa?)                                                                             |
| :------------------------ | :-------------------------------- | :--------------------------------------------------------------------------------------------------------- |
| **Erros de Importação**   | Chunks 404 ao atualizar rotas     | Todas as chamadas lazy resolvem o arquivo `.lazy.tsx` correspondente.                                      |
| **CSS Orphans**           | Perda de classes utilitárias      | O estilo global (`styles.css`) e os componentes do design system carregam perfeitamente na hidratação.     |
| **Dnd-kit no SSR**        | Falha de carregamento no servidor | Sensores de Pointer e Touch contornam o SSR sem quebras usando guardas de `typeof window !== 'undefined'`. |
| **Editor RichText**       | Travamento no primeiro clique     | O wrapper dinâmico carrega o core Tiptap sob demanda de forma transparente.                                |
| **Vazamento de Contexto** | Multi-tenant corrompido           | Nenhuma query lê dados de outra agência; todas usam `agency.id` derivado do contexto ativo.                |
