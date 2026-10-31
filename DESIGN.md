# Brightloop SMS — Design System & Visual Specification

## Design Philosophy & References
Inspired by **Linear**, **Stripe Dashboard**, **Vercel**, and **Mercury**.
- Clean, calm surfaces with high contrast text.
- Neutral #F8FAFC canvas with crisp #FFFFFF elevated cards.
- Hairline borders (#E5EAF1) instead of heavy shadows or harsh lines.
- Purposeful primary accent (#315CF5) used strictly for key actions, interactive states, and active items.
- No decorative AI glows, glassmorphism, oversized cards, or gratuitous gradients.

## Color Tokens
| Token | Hex | Role |
|---|---|---|
| Primary Background | `#F8FAFC` | Application canvas behind cards and content |
| Sidebar Background | `#FFFFFF` | Fixed navigation bar with subtle border-r |
| Main Surface | `#FFFFFF` | Cards, tables, sheets, modals, dropdowns |
| Primary Text | `#172033` | Headings, metrics, strong values, primary labels |
| Secondary Text | `#64748B` | Subtext, table headers, descriptions, timestamps |
| Muted Text | `#94A3B8` | Placeholders, inactive icons, subtle hints |
| Primary Accent | `#315CF5` | Primary buttons, active nav indicators, links |
| Primary Hover | `#2549D8` | Hover state for accent buttons |
| Border | `#E5EAF1` | All cards, inputs, table dividers, header borders |
| Success | `#16865B` | Paid, Active, Completed, matched |
| Warning | `#C58A24` | Pending, Past Due, Paused, Surcharge |
| Danger | `#D14343` | Overdue, Cancelled, Void, Failed, Inactive |
| Information | `#3978C8` | Issued, Sent, Processing, Trialing |

## Typography
- **Font Family**: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
- **Page Heading**: 24–28px, font-semibold (600), tracking-tight, text-[#172033]
- **Section Heading**: 16–18px, font-semibold (600), text-[#172033]
- **Card Heading**: 13–15px, font-medium (500), text-[#172033]
- **Body**: 13–14px, text-[#172033] or text-[#64748B]
- **Supporting / Meta**: 12–13px, text-[#64748B] or text-[#94A3B8]
- **Table Headers**: 11–12px, font-medium (500), uppercase tracking-wider, text-[#64748B]
- **Monetary / Tabular Numbers**: font-mono, tabular-nums, right-aligned in tables

## Geometry & Radii
- **Buttons**: 8px (`rounded-lg`)
- **Inputs & Selects**: 8px (`rounded-lg`)
- **Cards & Containers**: 10–12px (`rounded-xl`)
- **Dialogs & Drawers**: 12–14px (`rounded-xl`)
- **Status Badges**: 5–6px (`rounded-md`, strictly not pill/rounded-full)

## Layout & Architecture
- **Sidebar**: Fixed width (245px), crisp white background, hairline right border `#E5EAF1`. Grouped sections (Workspace, Billing, Management).
- **Topbar**: Height 56px, breadcrumbs, search quick action, environment status, user avatar & role dropdown.
- **Main Container**: Max-width 1360px (`max-w-7xl`), horizontal padding 28–32px, vertical padding 24–28px.
- **Tables**: Compact rows (36–42px), subtle hover state, hairline border `#E5EAF1`, clear alignment.
