# 15. Mocks, Fakes, and Simulations (Simulações e Fakes Identificados)

## 1. Mapeamento de Simulações Ativas no Código

* **Instagram Messaging (Inbox):** A funcionalidade de atendimento via Direct Messages do Instagram está mockada na interface. O formulário cria o canal de forma puramente lógica no banco de dados, mas não existe integração com APIs de envio ou recebimento no webhook.
* **Geolocalização do Radar Global:** O mapa exibe pins de "clientes ao vivo", mas as coordenadas são derivadas de um dicionário de palavras-chave estáticas com base no nome do destino ou por meio de espalhamento matemático determinístico baseado no hash do ID da viagem. Não há dados de telemetria GPS reais.
* **Renomeação de Colunas Kanban:** Os nomes personalizados das colunas do Kanban de Tarefas são salvos no `localStorage` do navegador do dispositivo atual e não são compartilhados com o banco de dados.
* **Embedded Signup (WhatsApp):** O botão de conexão com o login da Meta não está implementado na interface. A agência deve copiar e colar chaves manuais (Verify Token, Token, Phone Number ID) nos inputs de texto.
