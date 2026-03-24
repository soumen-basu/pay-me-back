# Design System Document

## 1. Overview & Creative North Star: "The Whimsical Curator"

This design system is built to transform the mundane chore of debt tracking into a delightful, editorial-grade social experience. Moving away from the rigid, spreadsheet-like nature of traditional fintech, we embrace a Creative North Star we call **"The Whimsical Curator."** 

The visual language is characterized by intentional asymmetry, generous white space (breathing room), and a "soft-touch" tactile feel. We reject corporate stiffness in favor of organic, ultra-rounded shapes and a palette that feels like a boutique stationery set. By layering soft pastels and utilizing depth through tonal shifts rather than harsh lines, we create an interface that feels less like a bank and more like a helpful, modern companion.

---

## 2. Colors

Our palette is rooted in soft, sun-drenched tones that reduce financial anxiety. We utilize a sophisticated Material Design-inspired naming convention to ensure semantic clarity.

### Primary Palette
- **Primary (#176847):** Used for key actions and brand presence.
- **Primary Container (#AEFCD0):** A soft mint for large surfaces or highlighted states.
- **On-Primary (#C9FFDE):** High-contrast text for use on primary backgrounds.

### Status & Accents
- **Secondary (Active Lilac - #5D5684):** Indicates active states or user-specific interactions.
- **Tertiary (Pending Yellow - #6B5A07):** A buttery warmth for items awaiting action.
- **Error (Rejection Red - #B31B25):** Softened pastel red for alerts and denials.

### The "No-Line" Rule
To maintain a high-end, bespoke feel, **1px solid borders are strictly prohibited** for sectioning content. Boundaries must be defined through:
1. **Background Color Shifts:** Use `surface-container-low` sections against a `background` page.
2. **Subtle Tonal Transitions:** A card using `surface-container-lowest` on a `surface-variant` background.

### Surface Hierarchy & Nesting
Treat the UI as physical layers. Depth is achieved by "nesting" tokens:
- **Level 0 (Base):** `surface` (#FCF6E9)
- **Level 1 (Sub-sections):** `surface-container-low` (#F7F0E3)
- **Level 2 (Active Cards):** `surface-container-lowest` (#FFFFFF)

### Signature Textures
- **The Glass Rule:** For floating headers or navigation bars, use `surface-bright` at 80% opacity with a `backdrop-blur-md` to allow the pastel background to bleed through.
- **Gradients:** Use a subtle linear gradient from `primary` to `primary_dim` on main CTAs to add "soul" and dimension.

---

## 3. Typography

The typographic system pairs the geometric playfulness of **Plus Jakarta Sans** (Headings) with the approachable clarity of **Be Vietnam Pro** (Body).

- **Display & Headlines (Plus Jakarta Sans):** These are the "editorial" voice. Use `display-lg` for hero balance screens. Bold weights are mandatory for headings to provide a strong anchor against the soft colors.
- **Body & Titles (Be Vietnam Pro):** Optimized for legibility. The increased x-height ensures that expense details are readable even at small scales.
- **Hierarchy Logic:** Use `headline-md` for section titles, but keep the `label-sm` in all-caps with `tracking-wider` for "over-line" categories to create a sophisticated, magazine-style layout.

---

## 4. Elevation & Depth

We eschew traditional "drop shadows" in favor of **Tonal Layering** and **Ambient Glows.**

- **The Layering Principle:** Hierarchy is created by stacking. A `surface-container-lowest` card placed on a `surface-container` background creates a natural lift without a single pixel of shadow.
- **Ambient Shadows:** When an element must float (e.g., a "Add Expense" button), use a shadow tinted with the `on-surface` color.
  - *Value:* `shadow-[0px_20px_40px_rgba(49,47,38,0.06)]`
- **The "Ghost Border" Fallback:** If accessibility requires a container boundary, use the `outline-variant` token at **15% opacity**. Never use a 100% opaque border.
- **Glassmorphism:** Use semi-transparent `surface_container_lowest` for modals to maintain the "light and airy" brand promise.

---

## 5. Components

### Buttons
- **Primary:** Extremely rounded (`rounded-full`), using a `primary` to `primary_dim` gradient.
- **Secondary:** `surface-container-highest` background with `on-surface` text.
- **Interaction:** On hover, buttons should scale slightly (`scale-105`) rather than just changing color, reinforcing the playful nature.

### Cards & Lists
- **Radius:** All cards must use the `xl` scale (24px / 3rem).
- **No Dividers:** Forbid the use of line dividers between list items. Use **Spacing Scale 4** (1.4rem) to create separation or alternating `surface-container-low` backgrounds.

### Input Fields
- **Styling:** Use `surface-container-lowest` with a "Ghost Border." Labels should be `label-md` and positioned with a slight offset to break the rigid grid.
- **Focus:** When active, the "Ghost Border" should transition to `primary` at 100% opacity with a soft `primary_container` outer glow.

### Chips
- Use for "Paid," "Pending," and "Owed" statuses.
- **Shape:** `rounded-full`.
- **Color:** Always use the "Container" version of the color (e.g., `tertiary-container`) with the "On-Container" text for optimal pastel-on-dark-text contrast.

---

## 6. Do's and Don'ts

### Do
- **Do** use intentional asymmetry. Align a heading to the left and a CTA to the right with different vertical offsets.
- **Do** use the Wallet Icon {{DATA:IMAGE:IMAGE_16}} with a `primary-container` circular backdrop for the logo.
- **Do** leverage the Spacing Scale to create "luxury" white space. If you think it needs more space, add one more unit.

### Don't
- **Don't** use pure black (#000000) for text. Always use `on-surface` (Soft Charcoal).
- **Don't** use 90-degree corners. Even the smallest elements should have at least the `sm` (0.5rem) rounding.
- **Don't** use standard "Fintech Blue." Stick to the Mint, Lilac, and Warm Off-White to maintain the boutique aesthetic.
- **Don't** clutter the screen. If a view has more than 5 primary actions, use a "More" menu styled with Glassmorphism.

---

## 7. Implementation (Tailwind CSS)