# Framework: Turis Tourism Product Intelligence

**Propósito:** Garantir que o desenvolvimento de funcionalidades no Turis atenda estritamente aos processos operacionais do mercado de turismo real. O Turis não é apenas um CRM genérico; ele deve gerenciar com precisão as dores dos agentes de viagens, controle de passageiros e segurança contratual de operadoras turísticas.

---

## 1. Módulos Operacionais e Regras de Negócio Obrigatórias

Todo desenvolvedor ou agente deve validar as lógicas de negócio contra estes domínios obrigatórios de turismo:

```markdown
                +------------------+
                |   Lead Turístico |
                +--------+---------+
                         |
                         v
                +------------------+
                | Cotação/Proposta |
                +--------+---------+
                         |
                         v
                +------------------+
                | Contrato & Aceite|
                +--------+---------+
                         |
                         v
                +------------------+
                | Voucher/Embarque |
                +------------------+
```

1. **Gestão de Cotações e Propostas:**
   - **Precificação Dinâmica:** O sistema deve suportar variação tarifária com base na idade dos passageiros. Classificar por Adulto, Criança (CHD - Child) e Bebê (INF - Infant).
   - **Margem de Lucro (Markup):** Toda cotação deve conter uma distinção explícita entre o Custo Net (valor cobrado pelo fornecedor) e o Preço de Venda (Custo Net + Comissão + Markup de Operação).
2. **Controle de Passageiros (Rooming List & Lotação):**
   - Em viagens de grupo (ex: excursões rodoviárias ou bloqueios aéreos), o sistema deve gerenciar a distribuição de passageiros por quartos (Single, Duplo, Triplo, Quádruplo).
   - Validação física da capacidade de lotação (bloqueio de assentos em ônibus ou aviões) para evitar overbooking operacional.
3. **Estrutura de Vouchers de Viagem:**
   - O voucher final é o documento oficial do cliente durante a viagem. Ele deve obrigatoriamente apresentar:
     - Localizador de reservas (Aéreo/Hotel) e contatos de emergência do receptivo local.
     - Franquia de bagagem inclusa e taxas locais (ex: taxa de turismo local).
     - Termos específicos de cancelamento e no-show do respectivo fornecedor.

---

## 2. Perguntas de Validação Operacional (Filtro do PhD de Turismo)

Antes de aprovar uma funcionalidade que afete a operação, responda às seguintes questões:

1. **Redução de Erro Humano:** "Esta tela impede o agente de vender um pacote sem adicionar pelo menos um viajante titular com CPF ou passaporte válido?"
2. **Visão do Financeiro:** "Como esta venda é repassada para as contas a pagar da agência? Os comissionamentos dos fornecedores parceiros estão sendo calculados automaticamente?"
3. **Visão de Pós-Venda:** "Se o cliente precisar de suporte médico durante a viagem, o voucher exibe facilmente os dados da apólice do seguro de viagem contratado?"
4. **Faturamento de Grupos:** "Se uma reserva de grupo for cancelada, o sistema realiza o rateio do custo de cancelamento ou o estorno é individualizado por passageiro?"
