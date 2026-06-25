# Plano de Testes: Biolink (Link na Bio)

Este documento especifica a validação manual de páginas do tipo Biolink, canais móveis e botões rápidos.

---

## 1. Composição e Restrições de Layout

- **Caso de Teste 1: Restrição a Elementos Mobile**
  - **Passos**:
    1. Criar uma página do tipo Biolink usando o template "Hopp Clean".
    2. Verificar se o editor se ajusta automaticamente para o modo responsivo Mobile (390px) e restringe outras viewports se configurado.
    3. Tentar arrastar blocos de layout complexos de desktop (ex: "Grade de Destinos Filtráveis").
    4. O editor deve emitir um aviso visual ou impedir a inserção para garantir que o Biolink permaneça focado em performance mobile.
- **Caso de Teste 2: Cabeçalho do Perfil**
  - **Passos**:
    1. No bloco "Biolink: Cabeçalho", fazer upload de uma foto de perfil quadrada/circular (Avatar).
    2. Modificar o nome da agência e a biografia.
    3. Definir a cor de fundo (Hexadecimal) e a cor do texto.
    4. Garantir que a renderização no canvas segue o design de "Cartão de Perfil" centralizado, com bordas arredondadas e imagem de avatar responsiva.

---

## 2. Cliques e Redirecionamentos de Links

- **Caso de Teste 3: Links Personalizados**
  - **Passos**:
    1. No bloco "Biolink: Lista de Links", adicionar 3 itens:
       - Item 1: _"Falar no WhatsApp"_ (marcado como Destaque/Highlight).
       - Item 2: _"Ver Pacotes 2026"_.
       - Item 3: _"Acessar Nosso Site"_.
    2. Publicar a página do Biolink.
    3. Acessar a URL do Biolink em um smartphone.
    4. **Verificação Visual**: O Item 1 deve piscar ou ter uma animação de destaque (micro-animação SaaS) se configurado, e bordas contrastantes.
    5. Clicar em cada link e garantir que todos redirecionam perfeitamente para as URLs corretas sem quebrar a navegação móvel.
