# 10. Auditoria de Segurança e LGPD

Este documento apresenta a análise de conformidade de segurança da informação do TravelOS, com foco nas políticas de RLS, proteção de dados pessoais (PII), rastreabilidade jurídica de aceites e armazenamento de credenciais de APIs.

---

## 1. Proteção de Dados Pessoais (PII) e LGPD

- **Exposição de Dados de Passageiros:**
  - A tabela `trip_passengers` armazena dados altamente sensíveis (CPF, Passaporte, Data de Nascimento, Telefone, Nacionalidade, E-mail e Necessidades Especiais).
  - **RLS em `trip_passengers`:** Ativa e filtrando por agência. Membros de uma agência "A" não conseguem acessar dados de passageiros de uma agência "B".
  - **Risco de Consentimento:** Existe a tabela de consentimentos no banco de dados, mas o fluxo público de checkout B2C (`p.$agency_slug.tour.$id.tsx`) **não exibe** uma caixa de aceite de termos de privacidade ou política de tratamento de dados LGPD no momento do envio de CPF e nome completo do passageiro.
  - **Correção Recomendada:** Injetar checkbox obrigatório de "Aceito a política de privacidade e tratamento de dados nos termos da LGPD" antes da submissão do formulário B2C.

---

## 2. Rastreabilidade de Aceites Contratuais e KYC

- ** KYC no Portal do Cliente:**
  - O aceite do cliente em contratos `/m/contract/:token` e na reacomodação de voos registra as seguintes variáveis de auditoria: data/hora, nome digitado, caixa de confirmação de leitura, endereço IP e User Agent do dispositivo.
  - **Status:** Adequado para validade jurídica básica de contratos eletrônicos. No entanto, não há criptografia/hash assimétrica de ponta a ponta que garanta a imutabilidade dos dados contra edições diretas de administradores com acesso ao banco.
  - **Correção Recomendada:** Gerar um hash criptográfico unindo o conteúdo do snapshot do contrato, IP e CPF do passageiro, gravando-o em um campo de assinatura imutável que seja checado a cada carregamento para verificar se houve alteração indevida de dados.

---

## 3. Gestão e Armazenamento de Secrets de APIs

- **Armazenamento de Chaves IA e Gateways:**
  - A arquitetura de Edge Functions do Supabase gerencia chaves através da RPC `pick_active_api_key` e do registro `global_settings.integrations_config_encrypted`.
  - **Segurança:** Excelente. Os dados confidenciais de credenciais de clientes são criptografados usando algoritmos AES-GCM baseados na chave mestra do Deno Secrets (`API_KEY_SECRET`), impedindo a leitura direta de chaves de API caso o banco de dados sofra invasão externa.
  - **Chaves no Front (Vazamento):** O frontend se conecta ao Supabase via `VITE_SUPABASE_PUBLISHABLE_KEY` e `VITE_SUPABASE_URL`. Nenhuma chave de API privada (como chaves Groq, Gemini ou Resend) está exposta no bundle JS compilado para o navegador.
