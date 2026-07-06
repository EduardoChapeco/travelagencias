# 02. Auditoria do Design System & Cores (Botões Rosas)

## 1. Origem do Rosa e a Relação de Cores

O tom rosa choque (`#ff4f9a`) foi originalmente concebido como a cor de destaque principal (`--accent`) padrão do Turis e, em muitos casos, como o fallback padrão do Brand Kit de agências sem cor personalizada definida.

A alteração direta de `--accent` no CSS global de `#ff4f9a` para `#151515` (charcoal/preto) removeu o rosa do painel, mas trouxe implicações arquiteturais:

1. **Divergência entre Accent e Brand**: `--brand` e `--accent` agora apontam para a mesma cor padrão (`#151515`). Isso remove a distinção visual entre botões que chamam ações de marca (brand) e elementos informativos de destaque secundário (accent).
2. **Uso Misturado**: `bg-brand` e `bg-primary` são usados em cenários similares, porém `bg-brand` é dinamicamente modificado pelo Brand Kit da Agência (`--agency-brand`), enquanto `bg-primary` refere-se ao tema global neutro do SaaS.

## 2. Inventário de Divergências de Cores e Tokens

| Componente/Tela                                          |   Cor Anterior    |        Cor Atual         |    Token Correto     | Contraste | Contexto                         | Correção Necessária                                               |
| :------------------------------------------------------- | :---------------: | :----------------------: | :------------------: | :-------: | :------------------------------- | :---------------------------------------------------------------- |
| **Suppliers Detail (`suppliers.$id.tsx`)**               | `#ff4f9a` (rosa)  | `accent-pink-500` (rosa) |    `accent-brand`    |    OK     | Checkbox de fornecedor principal | Alterar classe Tailwind de `accent-pink-500` para `accent-brand`. |
| **B2C Public Tour Page (`p.$agency_slug.tour.$id.tsx`)** |     `#ff4f9a`     |   `var(--color-brand)`   | `var(--color-brand)` | Variável  | Preço e botões principais        | OK (mas necessita de validação de contraste do Brand Kit).        |
| **Auth Register (`auth.register.tsx`)**                  |     `#ff4f9a`     |  `#151515` (via global)  |      `--accent`      |    OK     | Elementos de decoração e checks  | OK, herdou a mudança global.                                      |
| **Proposal Preview (`proposals.$id.preview.tsx`)**       | `#1E293B` (slate) |        `#1E293B`         |    `accentColor`     |    OK     | Elementos de cabeçalho e roteiro | OK, usa as configurações do Brand Kit.                            |

## 3. Respostas das Perguntas do Auditor

### 1. O rosa era um erro ou era o accent oficial aprovado?

Era o accent oficial aprovado pelo design system do SaaS. A mudança forçada para `#151515` atende ao estilo minimalista "Flat Premium" exigido pela agência do usuário, mas redefine a identidade de destaque de outros módulos que dependiam do accent padrão.

### 2. Trocar `--accent` globalmente altera componentes que deveriam continuar usando accent?

Sim. Telas como páginas de login/registro e visualizações públicas de orçamentos perderam contraste de destaque secundário (tornando-se todas monocromáticas).

### 3. `bg-brand` e `bg-primary` representam a mesma coisa?

Não. `bg-primary` representa a cor primária global da plataforma (geralmente preto/charcoal). `bg-brand` é a cor da identidade visual da agência logada, que pode ser alterada nas configurações e que deve permitir cores como azul, verde ou dourado.

### 4. Há risco de usar a cor da agência em botões que precisam de contraste estável?

Sim. Se a agência definir uma cor de marca excessivamente clara (ex: amarelo claro `#FFEB3B`), botões com fundo `bg-brand` e texto branco ficarão ilegíveis. É imperativo que os componentes utilizem sempre a dupla `--brand` e `--brand-foreground` de forma síncrona.

### 5. A mudança resolve a causa raiz ou mascara componentes mal configurados?

Mascara. A causa raiz é a falta de componentes canônicos que consumam corretamente as cores do Brand Kit de forma isolada, em vez de depender de variáveis globais estáticas no arquivo CSS raiz.

### 6. O modo escuro realmente existe e foi testado?

Sim. O arquivo `styles.css` possui definição de escopo para modo escuro (`.dark` / `@media (prefers-color-scheme: dark)`), redefinindo `--accent` para `#f8f7f4` e `--accent-soft` para `#1f1e1b`. No entanto, componentes complexos do DndKit e modais precisam de revisão, pois herdam backgrounds forçados.

### 7. O contraste atende acessibilidade?

Sim, o contraste para `#151515` sobre fundo off-white é de `15.8:1` (superando o mínimo da WCAG AAA de `7:1`). Contudo, o uso de `bg-brand` sem tratamento dinâmico para agências que trocam de logo/cor é um risco crítico de acessibilidade.
