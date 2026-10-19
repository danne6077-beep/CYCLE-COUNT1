# Shopper design system

FUJI uses a calm green palette, warm paper surfaces and a small original SVG basket illustration. The scan button is prominent and one-handed mobile navigation keeps basket totals visible. Desktop adds a budget and basket summary beside browsing.

| Token | Light | Dark |
|---|---|---|
| Brand | #08785b | #34d399 |
| Strong | #065f46 | #0c805e |
| Background | #f7faf8 | #101b17 |
| Surface | #ffffff | #192722 |
| Ink | #17201d | #edf6f0 |
| Muted text | #536158 | #b4c5bc |
| Soft | #e6f4ef | #1b3d30 |
| Border | #dfe5e1 | #30453b |
| Warning | #b45309 | #f3be69 |
| Danger | #be123c | #ff8dab |

Type intent: DM Sans UI and Space Grotesk headings, with Segoe UI/system fallbacks. Prices use tabular numerals. Fonts are self-hosted when available; runtime requests to Google Fonts are not required. Source preview currently uses system fallbacks when font files are unavailable.

Spacing uses a 4 px base. Card radii are 12–18 px; dialog radius is 20 px. Main controls and steppers are 48 px high, with visible focus outlines. Use icons plus state labels for budget thresholds; color is not the only signal. Native dialogs supply focus trapping and Escape behavior, with explicit accessible labels. Search labels remain available to screen readers.

Price cards show null as **Price unavailable**. Valid active promotions show SALE and the original price. Shelf prices identify the day entered. Totals are labeled **Known subtotal** while any line is unpriced, and the unpriced quantity remains visible. Final-price disclaimers appear in the basket, product browsing, history, settings and the helper; the mobile subtotal carries a persistent estimate reminder.

The app respects OS theme and reduced-motion settings. Transitions are about 180–200 ms. No confetti, forced login or blocking savings ads. Product names come from source records; category symbols are not product photographs. Savings confidence labels distinguish verified groups from identical-product claims, and shelf-life timelines are never invented.

Filipino navigation and primary shopping prompts are available. Search aliases include bigas/rice, gatas/milk, mantika/oil, tubig/water and other common terms. Supporting staff/legal copy remains English; a full translation review is still required before claiming complete Filipino localization.
