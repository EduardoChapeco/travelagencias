# Auditoria de Edge Functions e Integrações de APIs

Este documento avalia o estado de implantação, contratos de payload, tratamento de falhas e limites operacionais das Edge Functions e APIs integradas ao Motor VibeTour.

---

## 1. Inventário de Edge Functions Utilizadas

O Motor VibeTour utiliza duas Edge Functions centrais do Supabase:

### 1.1. `ai-orchestrator`

- **Função**: Orquestrador de Inteligência Artificial. Utilizado na indexação/busca vetorial, na tradução da intenção de viagem em linguagem natural para JSON estruturado e na simulação agêntica por persona (Gemini).
- **Estado Local**: Código existente no repositório.
- **Estado Remoto**: Implantada e operacional.
- **Tratamento de Erros**: Envelopado em blocos `try/catch` na UI. Fallback de IA ativa a edição manual no formulário.

### 1.2. `infotravel-connector`

- **Função**: Conector unificado para handshake e buscas no GDS da Infotravel/Incomum Viagens.
- **Estado Local**: `supabase/functions/infotravel-connector/index.ts` (39KB, 1163 linhas).
- **Estado Remoto**: Implantada.

---

## 2. Diagnóstico de Gaps e Bugs Críticos

### 2.1. Bug P0 de Conectividade no Conector Infotravel (Desalinhamento de Protocolo)

Como verificado no baseline de integração:

- A URL cadastrada para o provedor no banco de dados é `http://reservas.incomumviagens.com.br/api/v1`.
- O servidor remoto da Incomum Viagens força um redirecionamento HTTP `301` para a versão segura `https`.
- O cliente de requisição interna da Edge Function Deno intercepta o redirecionamento 301 e converte o método `POST` subsequente para `GET` de forma vazia e sem headers.
- O GDS retorna **405 Method Not Allowed**, impedindo qualquer handshake ou busca de funcionar com credenciais válidas.
- **Solução Recomendada**: A URL no banco de dados deve ser alterada de forma imediata para `https://reservas.incomumviagens.com.br/api/v1` ou o conector deve gerenciar manualmente redirecionamentos (desativando o auto-redirect padrão do fetch).

### 2.2. Alto Custo e Volume de Chamadas de IA nas Simulações

- **Cenário**: A simulação executa chamadas agênticas para 5 personas ("econômico", "conforto", "família", "premium", "aventura") contra as alternativas geradas (ex: 3 pacotes candidatos).
- **Cálculo de Custo**: 5 personas \* 3 candidatos = 15 chamadas HTTP consecutivas para a Edge Function / API do Gemini por execução.
- **Risco**: Rápida expiração de cotas de tokens da API da OpenAI/Google Gemini, além de gargalo de concorrência com o tempo de carregamento da UI.
- **Solução Recomendada**: Consolidar o payload de simulação em uma única requisição em lote (enviando a descrição das 3 alternativas e pedindo as notas das 5 personas em um único JSON de resposta estruturado). Isso reduz as chamadas de IA de 15 para apenas 1 por simulação!
