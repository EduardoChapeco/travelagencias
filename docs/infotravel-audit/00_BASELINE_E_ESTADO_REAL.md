# 00. Baseline e Estado Real da Integração Infotravel

Este documento estabelece o estado real ("Ground Truth") da integração do **Infotravel/Infotera** no **TravelOS** (TravelAgências), confrontando o que foi documentado anteriormente com a realidade física encontrada no código, no banco de dados e nos endpoints oficiais.

---

## 1. O Confronto: Promessa vs. Realidade

Na auditoria forense do repositório, identificamos uma discrepância crítica entre o que a interface do usuário e os arquivos de documentação anteriores alegavam e o que realmente está implementado no runtime do sistema.

### Promessa Anterior
* Integração GDS Infotravel funcional e testada para voos, hotéis e importação de reservas.
* Autenticação e sincronização operando em tempo real.
* Módulos de cotação integrados e em produção.

### Realidade Física ("Ground Truth")
1. **Erros de Endpoints Críticos no Conector**: O conector atual (`supabase/functions/infotravel-connector/index.ts`) possui rotas de integração **totalmente incompatíveis** com a especificação OpenAPI oficial. Se conectado a um ambiente real, o conector falhará sistematicamente com erros `404 Not Found`:
   * **Autenticação**: O código chama `/auth/login` (Linha 124), mas o endpoint oficial é `/api/v1/user/login` (ou `/api/v1/authenticate`).
   * **Busca de Hotéis**: O código chama `/search/hotel` (Linha 145), enquanto o oficial é `/api/v1/avail/hotel`.
   * **Busca de Voos**: O código chama `/search/flight` (Linha 158), enquanto o oficial é `/api/v1/avail/flight`.
2. **Dependência Exclusiva de Mock/Simulador**: Toda a integração atual funciona **única e exclusivamente sob simulação (mock)**. Se o operador inserir credenciais reais no painel de integrações, o fluxo de comunicação real com a API da Infotravel falhará no primeiro handshake devido aos caminhos incorretos descritos acima.
3. **Módulos de Domínio Ausentes**: Não há persistência no banco de dados para cotações e ofertas normalizadas da Infotravel, nem suporte a transações complexas como `checkRate`, cancelamento eletrônico de reservas, controle de PIX ou geração de contratos vinculados à API.

---

## 2. Inventário Técnico Encontrado

### Camada de Frontend
* **Arquivo**: `src/services/infotravel.ts`
* **Lógica**: Expõe as funções `infotravelSearchHotels`, `infotravelSearchFlights`, `infotravelImportBooking` e `infotravelTestConnection`. Todas são encapsuladores simples que invocam a Edge Function `infotravel-connector` sem nenhum mapeamento de entidades ou tratamento de schemas local.
* **Componente de UI**: Rota `agency.$slug.integrations.tsx` que renderiza a aba "Infotravel GDS", permitindo salvar credenciais de URL, usuário, senha, cliente e agência.

### Camada de Backend (Edge Function)
* **Arquivo**: `supabase/functions/infotravel-connector/index.ts`
* **Lógica**: Realiza a autenticação, desvia para simulação caso o usuário seja "test"/"sandbox", e executa as chamadas HTTP com cabeçalho `Authorization: Bearer <token>` para os endpoints incorretos se credenciais reais forem fornecidas.

### Camada de Banco de Dados
* **Tabela**: `api_keys`
* **Uso**: Armazena de forma genérica os registros da agência com `provider` em (`infotravel_url`, `infotravel_username`, `infotravel_password`, `infotravel_client`, `infotravel_agency`).
* **RLS**: Acesso restrito via RLS, mas sem tabelas específicas para logs de transações, histórico de cotações, ou tabelas de mapeamento de identidades externas (`external_entity_links`).

---

## 3. Conclusão da Baseline
A integração atual é **cenográfica (mockada)** e requer uma **rearquitetura completa** para operar com a API física da Infotravel. O plano técnico a seguir estabelece as bases estruturadas para realizar esta integração de forma segura, determinística e com 100% de conformidade com a especificação OpenAPI oficial.
