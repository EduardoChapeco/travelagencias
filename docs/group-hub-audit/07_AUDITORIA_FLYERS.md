# 07. Auditoria do Construtor de Flyers & Brochuras

## 1. Quick Flyer (Canvas de Imagem 9:16)
- **Implementação**: O canvas desenha uma imagem do Instagram Story (proporção 9:16) no frontend usando dados reais (`tour.title`, `base_price`, etc.). O download usa a biblioteca `html2canvas` para renderizar o elemento DOM em uma imagem PNG.
- **Roteamento do QR Code**: O QR Code aponta para o endereço público da excursão: `/p/${agency.slug}/tour/${tour.id}`. A rota é válida e funcional.
- **Limitação de Rastreabilidade**: O QR Code não anexa parâmetros de campanha ou rastreamento de marketing (como UTMs, ex: `?utm_source=instagram&utm_medium=story_flyer`). Isso impede que a agência mensure se os leads cadastrados vieram de flyers físicos ou virtuais compartilhados.

---

## 2. Flyer Completo (Clonagem para Proposal Studio)

### Falta de Idempotência e Bloat de Dados
O método `handleCreateBrochure` é acionado ao clicar no botão "Criar Brochura no Proposal Studio":
- **Problema**: **Não há verificação de duplicidade ou chave de idempotência**. Se o agente clicar no botão 5 vezes, o backend criará 5 propostas comerciais distintas e idênticas no banco de dados. Isso gera lixo eletrônico (linhas órfãs) na tabela `proposals`.

### Ligação Fraca (Falta de Vinculação Estruturada)
- **Implementação**:
  ```typescript
  const newProp = await createProposal(agency.id, {
    title: `Brochura Oficial - ${tour.title}`,
    ...
    notes: `Brochura vinculada à excursão em grupo: ${tour.title}.`,
  }, u.user?.id);
  ```
- **Erro Arquitetural**: O banco de dados não possui uma coluna de chave estrangeira (`group_tour_id`) na tabela `proposals`. O único vínculo existente entre a nova brochura criada e a excursão em grupo é a string de texto gravada no campo `notes`.
- **Dessincronização**: Se a data de saída, o preço ou o itinerário da excursão forem alterados posteriormente na tabela `group_tours`, a brochura no Proposal Studio **não será atualizada**. Ela armazena um snapshot estático (cópia crua dos dados no momento do clique), gerando alto risco de divergência de informações passadas ao cliente final.
- **Classificação da Arquitetura**: **IMPROVISADA / INADEQUADA**. Trata-se de uma reutilização ad-hoc do Proposal Studio que gera redundância de tabelas e perda de consistência relacional.
