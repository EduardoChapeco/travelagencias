# Auditoria dos Fluxos de Ingestão e Processamento de OCR

Este documento analisa os fluxos de processamento de OCR (Propostas, Vouchers, Passageiros, Boletos) no TravelAgencias/TravelOS, detalhando as fragilidades de processamento e propondo melhorias de resiliência.

---

## 1. Fluxo de Ingestão Atual (Arquitetura Síncrona Volátil)

Atualmente, todos os módulos de OCR seguem o mesmo fluxo síncrono:

```txt
Upload do Arquivo (UI)
  ↓
Conversão do Arquivo para String Base64 (Navegador)
  ↓
Envio do JSON contendo o Base64 na payload HTTP POST
  ↓
Edge Function recebe o Base64, monta o prompt e envia para a API do Gemini
  ↓
Processamento síncrono e resposta JSON ao cliente
```

### Problemas Críticos Descobertos:

1. **Ineficiência de Bandwidth**: Converter arquivos para base64 aumenta seu tamanho em aproximadamente 33%. O upload de múltiplos arquivos pesados consome banda do cliente e memória do Deno.
2. **Timeouts Frequentes**: Como a requisição HTTP é síncrona, se o Gemini demorar mais de 60 segundos (limite padrão de gateway) para extrair os dados de um PDF longo, a requisição cai com erro `504 Gateway Timeout` ou similar, mesmo que a IA estivesse trabalhando.
3. **Ausência de Pré-processamento**: Imagens gigantes ou PDFs escaneados não sofrem redimensionamento, compressão, rotação ou separação de páginas antes de serem submetidos ao modelo. Isso resulta em altos custos de tokens e perdas de legibilidade de texto rotacionado.
4. **Sem Idempotência (Duplo clique)**: Não há cálculo de hash do documento (`sha256`). Clicar duas vezes no botão de upload processa o arquivo novamente, gerando duplicidade de consumo de API e custos extras.

---

## 2. Validação e Schema Mismatch

- **Sanitização de Markdown**: As Edge Functions usam regex simples `.replace(/\`\`\`json/gi, "")`para limpar a saída do modelo antes de rodar`JSON.parse()`.
- **Fragilidade de Parsing**: Caso o modelo falhe em fechar as chaves de forma correta, ou adicione comentários de texto adicionais, a descriptografia `JSON.parse` quebra e retorna erro genérico `400 Bad Request` para a UI, perdendo toda a cota de tokens gasta na requisição.
- **Falta de Validação Estruturada**: Não há validação baseada em schemas rígidos (ex: Zod) dentro das Edge Functions. As respostas do modelo são repassadas diretamente ao front-end e podem vir incompletas, corrompendo a renderização.
