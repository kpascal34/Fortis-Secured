# UI Theme Guide

## Tokens location
Semantic tokens are defined in `src/styles/tokens.css`.

Core tokens to edit safely:
- `--bg-color`, `--surface-color`, `--surface-elevated-color`
- `--text-color`, `--muted-color`
- `--border-color`
- `--primary-color`, `--primary-foreground-color`
- `--danger-color`
- `--disabled-bg`, `--disabled-text`

## How to change colors safely
1. Keep body text contrast at **4.5:1** minimum against background/surfaces.
2. Keep large text and icon contrast at **3:1** minimum.
3. For disabled states, ensure text still has at least **3:1** contrast vs disabled background.
4. Avoid white overlays on dark surfaces; use `--overlay` (dark tint) for modals/drawers.
5. Update both semantic hex tokens and Tailwind RGB compatibility tokens if you rely on utility colors (`bg-bg`, `text-text`, etc).

## Core semantic classes
Defined in `src/index.css`:
- Sidebar: `.fs-sidebar`, `.fs-nav-item`, `.fs-nav-item-active`
- Card: `.glass-panel`, `.card-glass`, `.fs-card`
- Table: `.fs-table`
- Form fields: `.input-glass`, `.select-glass`, `.fs-input`
- Modal: `.fs-modal-overlay`, `.fs-modal`
- Banner: `.fs-banner`

## Local audit workflow
- Run app in dev mode and visit `/portal/ui-audit`.
- Verify contrast status labels are `AA pass`.
- Manually inspect disabled inputs and modal overlay readability.
