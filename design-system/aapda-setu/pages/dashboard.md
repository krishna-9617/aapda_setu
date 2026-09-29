# Dashboard Page Overrides

> **PROJECT:** Aapda Setu
> **Generated:** 2026-09-15 09:44:10
> **Page Type:** Dashboard / Data View

> ⚠️ **IMPORTANT:** Rules in this file **override** the Master file (`design-system/MASTER.md`).
> Only deviations from the Master are documented here. For all other rules, refer to the Master.

---

## Page-Specific Rules

### Layout Overrides

- **Max Width:** 1400px or full-width
- **Grid:** 12-column grid for data flexibility
- **Sections:** Hero (product + live preview or status) > Key metrics/indicators > How it works > CTA (Start trial / Contact)

### Spacing Overrides

- **Content Density:** High — optimize for information display

### Typography Overrides

- No overrides — use Master typography

### Color Overrides

- **Strategy:** Dark or neutral. Status colors (green/amber/red). Data-dense but scannable.

### Component Overrides

- Avoid: Leave UI frozen with no feedback
- Avoid: Make dragging the only way to reorder resize or select
- Avoid: Announce a bare number or make every badge a competing live region

---

## Page-Specific Components

- No unique components for this page

---

## Recommendations

- Effects: grid-template with varied spans, rounded-xl (16px), subtle shadows, hover scale (1.02), smooth transitions
- Animation: Use skeleton screens or spinners
- Accessibility: Add buttons menus or tap-to-move controls and retain keyboard operation
- Accessibility: Use one appropriate atomic status message such as 3 items in cart
- CTA Placement: Primary CTA in nav + After metrics
