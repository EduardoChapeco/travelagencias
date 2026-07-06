---
name: Turis OS
colors:
  primary: "#3D6FF2"        # azul do chat/CTA — mesma família do widget do silo e do app de viagens
  ink: "#0B0B0C"             # botões pretos, texto de alto contraste
  neutral: "#F6F5F1"         # canvas claro (quando não há foto de fundo)
  glass-light: "rgba(255,255,255,0.14)"
  glass-dark: "rgba(10,10,12,0.35)"
  accent-lime: "#B6F24C"     # destaque pontual em widgets de dado (como o quadrado aceso do silo)
  gradient-sky: ["#BFE3FF", "#2F5CE0"]
  gradient-bloom: ["#E9D9FF", "#6B3FD1"]
  gradient-meadow: ["#EAF7C9", "#3E9B4F"]
typography:
  display:
    fontFamily: Inter
    fontSize: 2.5rem
    fontWeight: 600
    letterSpacing: -0.02em
  body-md:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: 400
  label-caps:
    fontFamily: "JetBrains Mono"
    fontSize: 0.75rem
    fontWeight: 500
    letterSpacing: 0.08em
rounded:
  chip: 999px          # pílulas (input, botões, chips de sugestão)
  tile: 28px            # "quadrado gordinho" — tiles de módulo, cards de bento grid
  sheet: 32px           # cards grandes, bottom-sheets, painéis expansíveis
spacing:
  xs: 8px
  sm: 12px
  md: 20px
  lg: 32px
  xl: 48px
blur:
  glass: 24px
  ambient-bg: 60px
elevation:
  rule: "PROIBIDO box-shadow em qualquer elemento. Toda percepção de profundidade vem de blur + borda 1px em glass-light + leve diferença de opacidade de fundo. Nenhuma exceção."
---

## Overview
Turis OS é uma estética de "sistema operacional ambiente": o fundo é sempre uma foto ou gradiente do tema escolhido pela agência (nunca branco/cinza neutro puro por padrão), e a interface flutua por cima em camadas de vidro fosco. Não existe sombra em lugar nenhum — a hierarquia vem de blur, borda sutil e contraste de opacidade.

## Cores
O azul primário (#3D6FF2) é o fio condutor entre o chat de IA, os CTAs principais e os destaques do app do cliente — ele deve aparecer como a cor "viva" do sistema, contra fundos que são majoritariamente neutros/fotográficos. O preto (ink) é reservado para botões de ação definitiva (enviar, confirmar, publicar). Os gradientes (sky/bloom/meadow) são usados em telas de onboarding, estados vazios e como fundo de tema alternativo — nunca ao mesmo tempo que uma foto de fundo.

## Formas
Tudo é "gordinho": nada de esquina reta ou raio pequeno de 4–8px como em SaaS genérico. Pílula total em botões e inputs, raio grande (28–32px) em cards e tiles. Isso é o oposto do visual "corporativo frio" e é o que dá a sensação de app do sistema operacional, não de dashboard de planilha.
