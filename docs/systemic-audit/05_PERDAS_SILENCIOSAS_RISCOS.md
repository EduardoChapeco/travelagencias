# 05. Perdas Silenciosas e Riscos de Produção - TravelOS

Este documento identifica pontos de vulnerabilidade técnica do TravelOS, detalhando locais onde podem ocorrer perdas silenciosas de dados, inconsistências de estado no frontend versus banco e os principais riscos operacionais de produção.

---

## 1. Mapeamento de Perdas Silenciosas de Dados

### 1.1 Dupla Fonte de Verdade na Rooming List

- **Problema:** Conflito de persistência de quartos entre a coluna JSONB `group_tours.rooming_list` e a tabela normalizada `boarding_rooming_list`.
- **Causa Raiz:** Códigos antigos de admin ainda gravavam no JSONB desnormalizado do grupo, enquanto telas novas de embarque gravavam na tabela relacional. Um agente salvando dados na aba do grupo sobrescrevia silenciosamente as modificações relacionais feitas por outro agente na aba de embarque.
- **Impacto:** Passageiros perdiam sua alocação de quartos no hotel sem que nenhum erro de banco fosse exibido na tela.

### 1.2 Gravações Parciais e Ausência de Transações RPC

- **Problema:** Conversão de propostas em viagem gravando separadamente em múltiplas tabelas no frontend (`trips`, `trip_passengers`, `boarding_cards`) sem bloco transacional unificado.
- **Causa Raiz:** O frontend executava chamadas sequenciais independentes ao Supabase. Se a terceira chamada (ex: cadastrar passageiros) falhasse por timeout ou perda de rede, a viagem era criada sem nenhum passageiro vinculado.
- **Impacto:** Registros órfãos de viagens vazias e inconsistência profunda no painel operacional. Resolvido com a criação da RPC `convert_proposal_to_trip`, que deve ser obrigatoriamente utilizada em todas as conversões.

### 1.3 Upload Pix B2C Simulado no Checkout

- **Problema:** Interface de checkout de pacotes públicos finge fazer o upload do comprovante Pix e informa sucesso ao cliente antes de salvar o arquivo no Storage.
- **Causa Raiz:** Falta de tratamento de erro no endpoint de checkout público. O formulário enviava o comprovante simulado em base64 localmente e gerava o lead no CRM mesmo que a gravação do arquivo no bucket `receipts` falhasse.
- **Impacto:** Inadimplência indetectável. Clientes mal-intencionados podiam fraudar o pagamento enviando uploads nulos ou falhos e garantindo a vaga no grupo terrestre.

### 1.4 Promises sem `await` e Erros Supabase Ignorados

- **Problema:** Blocos de código React executando mutações no banco de dados sem verificar o objeto `error` retornado pelo Supabase Client.
- **Evidência no Código:** Uso frequente do padrão:
  ```typescript
  const { data } = await supabase.from('...').insert(...);
  // ausência de verificação do console.error ou throw error
  toast.success("Salvo com sucesso!");
  ```
- **Impacto:** O frontend exibe toast verde de sucesso, porém o banco rejeitou o comando por violação de RLS ou Unique Key, deixando o estado do cliente inconsistente com a base.

---

## 2. Top 20 Riscos de Produção (Priorizados por Impacto)

1. **Inconsistência de Malha Aérea (PNR Desatualizado):** Passageiro viaja com código localizador (PNR) de voo cancelado porque o agente alterou na aba Aéreos, mas os dados não propagaram para a aba Bilhetes de Embarque (falta de sincronia relacional ativa).
2. **Quebra de CI por Migrations Untracked:** Presença de arquivos de migração locais não rastreados no Git local, gerando conflitos de schemas caso o CI tente aplicar alterações.
3. **Fraude Financeira no Checkout Pix:** Aceitação de inscrições B2C sem verificação de assinatura/hash do arquivo do comprovante Pix.
4. **Vazamento de PII (LGPD Compliance):** Coleta de CPFs e Passaportes em checkouts públicos e formulários de lead sem opt-in explícito para tratamento de dados pessoais.
5. **Estouro de Heap de Memória (OOM) no Vite Build:** O acúmulo de bibliotecas pesadas de visualização de mapas (Leaflet) e planilhas (XLSX) sem code-splitting atrasa o tempo de build do bundle de produção local e pode causar travamentos.
6. **Contratos sem Assinatura Física PDF:** Modificação de status de contratos para "assinado" no banco sem validação de que o arquivo PDF foi gravado com sucesso no bucket `contracts`.
7. **Omnichannel Silencioso:** Central de atendimento registrando mensagens localmente no chat do admin, mas falhando em sincronizar/disparar e-mails reais via Resend/Gmail.
8. **Violação de RLS no Portal do Cliente:** Acesso a dados de outras agências por parametrizações incorretas de RLS na rota móvel `/m/checkin/$token`.
9. **Gargalo no html2canvas (Geração Síncrona):** Travamento de tela do cliente ou geração de PDFs em branco em dispositivos mobile fracos caso a biblioteca html2canvas estoure a memória de renderização síncrona.
10. **Sobrescrita de Arquivos no Storage:** Falta de hash exclusivo no nome dos arquivos de comprovantes e vistos, fazendo com que uploads com nomes idênticos (ex: `comprovante.png`) sobrescrevam arquivos de outros clientes.
11. **Falta de Rollback de Itinerários Aéreos:** A deleção acidental de um itinerário proposto apaga o histórico de diff aéreo permanentemente, sem possibilidade de recuperação rápida pelo agente.
12. **Double-Click em Transações Financeiras:** Falta de desabilitação de botões de pagamento na UI permitindo faturar duas vezes o mesmo cartão do cliente em cliques rápidos.
13. **SLA do Suporte Parado:** O atraso nas respostas aos clientes não aciona alertas ativos no painel principal dos agentes por falta de crons de checagem.
14. **Incompatibilidade de Fontes Externas:** PDFs com layout desalinhado caso as fontes personalizadas (Google Fonts) falhem em carregar a tempo do script do pdf-generator.
15. **Perda de Sessão em Abas Concorrentes:** Conflito de sessão do usuário no Supabase se múltiplas abas estiverem abertas simultaneamente alterando configurações da agência.
16. **Ausência de Registro de Auditoria Forense:** Alterações manuais em tabelas financeiras ou exclusões de viagens sem logs em `audit_log` impossibilitam rastreamento pós-incidentes.
17. **Timeout em Edge Functions Deno:** Execuções longas de OCR no Gemini Flash estourando os 15 segundos limite de processamento de Edge Functions gratuitas.
18. **Acoplamento Monolítico em Trips:** Rota `client.trips.$id.tsx` concentrando lógicas de suporte, financeiro, check-in e roteiro em um arquivo gigantesco, dificultando manutenção técnica e refatoração.
19. **Fallback de Cláusulas Contratuais:** Falta de semeadura/seeds de cláusulas obrigatórias de turismo, fazendo com que contratos de novas agências sejam gerados em branco.
20. **Ausência de Testes Unitários de RLS:** Alterações de políticas no banco sem testes automatizados que garantam que clientes anônimos não consigam forjar parâmetros nas RPCs.
