# FUJI design system

FUJI uses a calm, compact interface for retail staff moving between lookup, editing, and printing. The implementation remains vanilla HTML/CSS/JavaScript so the import-to-print flow does not need a framework migration.

## Tokens

`tokens.css` defines the shared light/dark surface, text, border, focus, radius, shadow, and motion roles. UI modules should use those semantic roles rather than add new hex literals. The user accent remains a single `--accent` value so the four existing presets and a custom value continue to work. Print stock colors stay in the print styles because yellow PP and white shelf tags represent physical paper.

| Role | Light | Dark |
|---|---|---|
| Background | `#f7faf8` | `#0c1512` |
| Panel | `#ffffff` | `#121d19` |
| Raised | `#ffffff` | `#17231e` |
| Secondary surface | `#eef2ef` | `#1a2823` |
| Border | `#dfe5e1` | `#263832` |
| Text | `#17201d` | `#e8f0ec` |
| Muted text | `#536158` | `#9db0a7` |
| Brand | `#08785b` | `#34d399` |

## Components and interaction

- Use primary for the one next action, secondary for adjacent choices, ghost for low-emphasis actions, and danger for destructive actions.
- Inputs keep visible labels; validation reports a row number and reason. Status is communicated with text and an icon as well as color.
- Tables use compact row density and page through 100 records at a time. Keep imported cell content escaped when rendering.
- Dialogs use native `<dialog>` for Escape handling and focus management. Use `textContent` for dynamic user content.
- Keyboard navigation: `Ctrl/Cmd+K` opens search and commands, `?` opens shortcut help, and `Esc` closes dialogs. Focus-visible styling is centralized in `tokens.css`.
- Keep transitions brief and honor `prefers-reduced-motion`. Do not add gradients, glows, or large shadows to routine controls.
- Print preview must use a light theme and preserve the physical tag dimensions/colors.

## Do / don't

**Do** use `var(--ui-text)`, `var(--ui-muted)`, `var(--ui-surface)`, `var(--ui-border)`, and `var(--ui-accent)` for new UI. Pair a status color with a label. Check contrast for every new text/background pair.

**Don't** use a status color as the only meaning, add theme-specific hex values to a component stylesheet, put imported text into `innerHTML`, or apply display-theme colors to print stock.

The CSS inventory and staged migration plan are recorded in [AUDIT.md](../AUDIT.md) and [color inventory](color-inventory.md). Existing component files still contain legacy direct colors; migrate them in reviewed batches with visual and print comparisons before deleting override styles.
