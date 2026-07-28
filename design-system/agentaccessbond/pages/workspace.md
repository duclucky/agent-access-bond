# AgentAccessBond Workspace Override

This page overrides the Web3-oriented defaults in `../MASTER.md`.

## Product Direction

- Audience: agent operators, designated users, and challengers.
- Primary question: can this agent operate, and what should I do next?
- Tone: plain, calm, accountable, and financially precise.
- Pattern: product workspace with one contextual primary action.
- Technical blockchain details use progressive disclosure.

## Visual System

- Font: IBM Plex Sans with system sans-serif fallback.
- Canvas: `#f5f7f5`; surfaces: `#ffffff`; primary text: `#17221c`.
- Primary action: `#176b4d`; hover: `#10573e`; focus: `#86c6aa`.
- Risk: `#b42318`; warning: `#9a6700`; success: `#157347`.
- Border: `#dfe5e1`; muted text: `#637069`.
- Radius: 8px maximum for cards and controls.
- No gradients, grid backgrounds, glassmorphism, purple-dominant palettes, or
  monospace body copy.

## Interaction Rules

- Show balances in GEN; raw wei belongs in technical details.
- Translate contract enums into plain English.
- Shorten addresses and URLs by default.
- Keep one primary action visually dominant.
- Use visible labels, 44px minimum targets, inline feedback, and focus rings.
- Respect `prefers-reduced-motion`.
- Validate at 375px, 768px, 1024px, and 1440px without horizontal overflow.
