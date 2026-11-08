# 0011 — Text contrast within the palette

Date: 2026-11-08 · Status: Accepted

## Context
SPEC §5 requires text contrast ≥ 4.5:1 (3:1 for large text, ≥ 24 px). Measured in the browser, three uses of the palette failed:
- orange `#E9722D` for the emphasised word of headings: 2.6:1 on cream;
- annotation `#c4551a` for small text (errors, notes, the AI's handwritten text, "stashed" chips): 3.9:1 on cream;
- the M status letter `#c4551a` on its 16 % orange background: 3.8:1 (DESIGN.md §9 asked for this check).

Other measured failures are accepted exemptions: the "Comegitmix" wordmark (a logotype), disabled controls, and the inactive desks at 60 % opacity (founding decision, [ADR 0000](0000-founding-decisions.md); the active desk carries the information and the hidden scene summary lists every desk).

## Decision
No new colour; existing palette values only:
- Heading emphasis (`h1`/`h2`/mission title `em`, ≥ 24 px) uses annotation `#c4551a` (3.9:1, passes for large text).
- Annotation-coloured text under 24 px and the M letter use `#8a3510` (the diff "removed" text colour), exposed as `--annotation-texte` and `--statut-M-texte` (≥ 6.8:1).
- `#c4551a` stays for large text, borders and icons; orange stays for buttons, the terminal prompt on charcoal (5.3:1) and graphics.

## Consequences
Emphasis and error text look slightly darker than in the mockups. Any new text colour must be checked against its real background (the a11y e2e test checks names, keyboard and motion; contrast is checked by hand when colours change).
