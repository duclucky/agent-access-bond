# Product Workspace Design

## Goal

Turn the existing contract inspection dashboard into a usable product workspace
for agent operators, designated users, and challengers without changing any
contract method, state transition, or evidence boundary.

## Experience

The first screen answers three questions in order:

1. Is the agent allowed to operate?
2. Is money locked or available to withdraw?
3. What action can this wallet take next?

Agent status uses a plain-language headline and a short consequence statement.
Balances use GEN, addresses and URLs are shortened, and contract enums are
translated into user language. The case result emphasizes the outcome and its
effect. Raw evidence fields, verdict facts, wei values, and contract metadata
move into native disclosure sections.

## Layout

- Compact header: product, Studionet indicator, wallet.
- Agent selector: editable identifier with refresh action.
- Status summary: execution eligibility, bond, available balance, reviews.
- Main content: contextual action first, latest access review second.
- Transaction feedback: compact status region after an action.
- Technical details: collapsed by default.

On mobile all content becomes one column, action controls stay at least 44px
high, URLs never force horizontal scrolling, and the wallet modal stays within
the viewport.

## Visual Direction

Use the workspace override in
`design-system/agentaccessbond/pages/workspace.md`: IBM Plex Sans, white
surfaces on a quiet neutral canvas, deep green actions, and semantic
red/amber/green states. No gradients, decorative grid, glass effects, Web3
hacker styling, or purple-dominant palette.

## Accessibility And Feedback

Use visible form labels, clear focus states, semantic headings, native details
elements, text plus color for status, and `aria-live` for transaction updates.
Respect reduced-motion preferences. Keep errors next to the affected workflow.

## Verification

- Unit tests cover GEN formatting, friendly labels, disclosure defaults, and
  action/state copy.
- Existing wallet, contract, transaction, and workspace tests remain green.
- `npm run check` must pass.
- Production screenshots and DOM measurements cover 375px and 1440px without
  overlap or horizontal overflow.
