# 15. Storyboard de Telas e Módulos UI/UX

Este documento apresenta a especificação visual e o roteiro de telas ("Storyboard") para os **8 painéis de interface** do módulo de integração **Infotravel/Infotera** no **Turis**, seguindo a diretriz editorial Light SaaS do design system.

---

## 1. Storyboard das 8 Telas Obrigatórias

### Tela 1: Busca Rápida de Tarifas

- **Responsabilidade**: Permitir que o agente comercial realize consultas clássicas (Aéreo, Hotel, Traslado) de forma estruturada.
- **Layout**:
  - Barra superior de abas de produto (Ícones flat: Avião, Cama, Carro).
  - Grade de inputs (Origem, Destino, Datas, Quartos, idades dos passageiros).
  - Sidebar direita com filtros refinados (Companhias, Regimes, Estrelas, Operadoras).
- **Estados**:
  - _Loading_: Skeleton loaders nos campos e indicador de progresso discreto.
  - _Empty_: Ilustração flat amigável orientando o preenchimento dos filtros de busca.
  - _Error_: Banner vermelho sutil informando a instabilidade com opção de retry.

### Tela 2: Galeria de Resultados e Filtros

- **Responsabilidade**: Apresentar os resultados retornados e gerenciar o carrinho de propostas.
- **Layout**:
  - Grid de cards de ofertas (imagens em proporção aspect-ratio 16:9, preço de venda destacado, comissão/markup visível apenas para agentes autorizados).
  - Carrinho flutuante no canto inferior direito contendo o resumo dos itens selecionados.
  - Badges dinâmicos indicando "Última atualização", "Disponibilidade Garantida" ou "Sob Consulta".

### Tela 3: Comparação de Ofertas

- **Responsabilidade**: Permitir a comparação técnica detalhada de até 4 opções lado a lado.
- **Layout**:
  - Tabela comparativa limpa, sem sombras, com colunas dividindo as ofertas.
  - Linhas comparando: Nome do Hotel/Voo, Preço por pessoa, Regime de alimentação, Franquia de bagagem, Horários e Escalas, Política de cancelamento.
  - Botão de ação rápida na base de cada coluna ("Selecionar esta opção").

### Tela 4: Detalhe da Oferta (Mini Página)

- **Responsabilidade**: Renderizar uma página de visualização limpa da oferta para o cliente.
- **Layout**:
  - Header limpo com foto do destino e preço total.
  - Blocos de serviços (Voo com escala, Hotel com regime, Traslado).
  - Seção de inclusões e exclusões com ícones flat verdes e cinzas.
  - CTAs proeminentes: "Salvar como Proposta PDF", "Copiar link do WhatsApp" ou "Iniciar Reserva".

### Tela 5: Promoções do Dia e Ranking de Oportunidades

- **Responsabilidade**: Exibir o ranking de oportunidades detectadas pelo pipeline em segundo plano.
- **Layout**:
  - Lista classificada por Score (ex: 9.2, 8.8) com badge de oportunidade.
  - Dados comparativos: Preço atual vs. Média histórica.
  - Painel de revisão da IA (título sugerido, copy de vendas editável e botão "Aprovar e Publicar").

### Tela 6: Importador de Reservas Históricas

- **Responsabilidade**: Gerenciar a carga e importação retroativa de reservas pelo localizador.
- **Layout**:
  - Input central para PNR/Localizador ou caixa de seleção de período de backfill.
  - Barra de progresso linear mostrando o andamento da importação por lotes.
  - Tabela de conflitos detectados (CPFs divergentes) com botões "Mesclar Cadastros" ou "Manter Separados".

### Tela 7: Configuração de Credenciais de Integração

- **Responsabilidade**: Salvar credenciais de agência e verificar integridade da conexão.
- **Layout**:
  - Formulário de inputs com máscara para senha (`infotravel_password`).
  - Botão de ação "Testar Conectividade" com retorno imediato (Ícone Wifi verde se sucesso, alerta com log se falha).

### Tela 8: Monitor e Painel de Sincronização

- **Responsabilidade**: Exibir métricas de saúde da comunicação e fila de jobs pendentes.
- **Layout**:
  - Gráfico flat de taxa de sucesso (Uptime da API e latência média).
  - Fila de transações com status (Sent, Retrying, Failed).
  - Botão de reenvio manual para transações na fila de falhas.

---

## 2. Padrões de Design e Acessibilidade

- **Bordas e Sombras**: Ausência de sombras (`shadow-none`), cantos arredondados padronizados (`rounded-xl`), e bordas finas neutras (`border-border`).
- **Tipografia**: Uso da fonte Outfit/Inter com hierarquia clara de tamanhos (H1 para títulos principais de painéis, pequenos badges em mono para códigos PNR e dados numéricos).
- **Navegação**: Suporte a teclado completo (Tabs para alternar abas de produto, e foco visual nítido nos inputs).
