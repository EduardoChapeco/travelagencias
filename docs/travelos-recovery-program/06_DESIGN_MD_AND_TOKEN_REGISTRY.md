# Registro do DESIGN.md e Tokens de Estilo

Atualizado em 2026-07-10.

## Pipeline normativo

1. `DESIGN.md`: tokens primários de cor, tipografia, radius e espaçamento.
2. `src/design.css`: saída gerada por `npm run design:export`.
3. `src/styles.css`: aliases semânticos e contratos globais de workspace.
4. `src/components/ui/*`: primitivas consumidoras dos tokens semânticos.

## Tokens estruturais vigentes

- `--radius-card`, `--radius-sheet`, `--radius-button`, `--radius-input`.
- `--shell-edge-gap`, `--shell-content-gutter`, `--shell-header-height`.
- `--shell-page-padding`.
- `--dock-collapsed-width`, `--dock-expanded-width`, `--dock-radius`.

## Divergências abertas

- A regra local limita radius principal a 12px, enquanto `DESIGN.md` define cards de
  28px e sheets de 32px. Nenhum dos dois valores deve ser propagado até a decisão canônica.
- `src/styles.css` ainda contém valores RGBA e overrides `!important` fora do pipeline
  gerado. Eles permanecem dívida registrada, não tokens aprovados.
