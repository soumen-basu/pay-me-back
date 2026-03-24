# The Design System: Operational Authority & Tonal Precision

## 1. Overview & Creative North Star: "The Sovereign Ledger"
This design system moves away from the "cluttered enterprise" aesthetic toward a philosophy we call **The Sovereign Ledger**. In high-stakes administrative environments, clarity is not just about visibility—it is about the hierarchy of truth. 

While the data is dense, the interface must feel expansive. We achieve this by rejecting the rigid "box-in-a-box" construction of traditional dashboards. Instead, we use **Intentional Asymmetry** and **Tonal Depth**. By utilizing wide horizontal gutters (Scale 16-24) and tight vertical groupings, we create a rhythmic flow that guides the eye toward critical KPIs without the friction of unnecessary structural lines.

## 2. Colors: The Depth of Slate
Our palette is anchored by a deep slate and crisp whites, providing a high-contrast foundation for our vibrant functional accents.

*   **Primary Action (Indigo):** Use `primary` (#24389c) for high-intent actions. For a premium feel, main buttons should utilize a subtle linear gradient from `primary` to `primary_container` (#3f51b5) at a 145-degree angle.
*   **Status Indicators:** Use `secondary` (#006c4a) for Active/Success and `tertiary` (#683600) for Pending/Warning. 
*   **The "No-Line" Rule:** Explicitly prohibit the use of `1px` solid borders for sectioning or layout containers. Boundaries must be defined through background shifts. For example, a `surface_container_low` (#eff4ff) sidebar should sit directly against a `surface` (#f8f9ff) main content area without a dividing line.
*   **Surface Hierarchy & Nesting:** Treat the UI as a physical stack.
    *   **Base:** `surface` (#f8f9ff)
    *   **Sectioning:** `surface_container` (#e6eeff)
    *   **Interactive Cards:** `surface_container_lowest` (#ffffff) to create a "pop" against the darker base.
*   **The Glass Rule:** For floating modals, navigation overlays, or "sticky" headers, use `surface_container_highest` (#d5e3fd) with an 80% opacity and a `20px` backdrop-blur. This ensures the dashboard feels integrated and sophisticated, not "pasted on."

## 3. Typography: Editorial Utility
We utilize **Inter** to bridge the gap between technical legibility and modern editorial style. 

*   **Display & Headlines:** Use `display-md` or `headline-lg` for dashboard summaries. These should be set with a slightly tighter letter-spacing (-0.02em) to feel authoritative.
*   **Data Points:** Use `title-lg` for metric card values. This creates a clear "Value-over-Label" hierarchy.
*   **Labels:** `label-md` (#0.75rem) using `on_surface_variant` (#454652) should be used for all table headers and form labels.
*   **The Scale:** Never jump more than two steps in the scale within a single component. Smooth transitions maintain the "Sovereign" professional tone.

## 4. Elevation & Depth: Tonal Layering
Traditional shadows are a crutch. In this system, depth is achieved through **Tonal Layering**.

*   **The Layering Principle:** To lift a metric card, do not add a shadow. Instead, place a `surface_container_lowest` (#ffffff) card on top of a `surface_container_low` (#eff4ff) background. The delta in hex value provides all the separation required.
*   **Ambient Shadows:** If a "Floating" state is required (e.g., a dragged row or a dropdown), use a shadow tinted with `on_surface` (#0d1c2f). 
    *   *Spec:* `0px 12px 32px rgba(13, 28, 47, 0.06)`
*   **The Ghost Border:** For high-density data tables where rows must be distinct, use a "Ghost Border": `outline_variant` (#c5c5d4) at 15% opacity. It should feel like a suggestion of a line, not a barrier.

## 5. Components

### Metric Cards
*   **Background:** `surface_container_lowest` (#ffffff).
*   **Corner Radius:** `xl` (0.75rem / 12px).
*   **Layout:** Vertical stacking. Value (`title-lg`) on top, Label (`label-md`) below.
*   **Accent:** A `2px` vertical "accent bar" of `primary` on the far left edge to denote importance.

### Data Tables
*   **Header:** `surface_container_high` (#dde9ff) with `label-md` text.
*   **Rows:** No horizontal dividers. Use a subtle background shift to `surface_container` (#e6eeff) on `:hover`.
*   **Density:** Use Spacing Scale `3` (0.6rem) for vertical cell padding and Scale `5` (1.1rem) for horizontal padding.

### Primary Buttons
*   **Shape:** `lg` (0.5rem / 8px) to maintain a "formal utility."
*   **Color:** Gradient from `primary` to `primary_container`.
*   **Text:** `label-md` in `on_primary` (#ffffff), uppercase with 0.05em tracking for a premium "command" feel.

### Forms & Inputs
*   **Input Field:** `surface_container_low` (#eff4ff) background, no border.
*   **Focus State:** A `2px` "Ghost Border" using `primary` at 40% opacity.
*   **Layout:** Dense, multi-column layouts using Spacing Scale `4` (0.9rem) between fields.

### Status Chips
*   **Active:** `secondary_fixed` (#85f8c4) background with `on_secondary_fixed` (#002114) text.
*   **Pending:** `tertiary_fixed` (#ffdcc3) background with `on_tertiary_fixed` (#2f1500) text.
*   **Shape:** `full` (9999px) to contrast against the 8-12px squareness of the dashboard.

## 6. Do's and Don'ts

### Do
*   **Use Tonal Shifts:** Always try to separate two sections with a color shift before reaching for a line or a shadow.
*   **Respect the Gutter:** Use Spacing Scale `10` (2.25rem) or `12` (2.75rem) for main layout margins to let the data breathe.
*   **Align to the Pixel:** In a data-centric system, precision is brand. Ensure all elements are snapped to the spacing scale.

### Don't
*   **No Pure Black Shadows:** Never use `#000000` for shadows. Use the `on_surface` slate tint to keep the "Glass & Paper" feel.
*   **No Rounded "Pills" for Buttons:** Keep buttons at `lg` (8px) or `xl` (12px). Full rounding is reserved for status chips and tags only.
*   **No High-Contrast Dividers:** If a divider is needed, it should be so subtle it’s nearly invisible. If the user notices the line before the data, the line is too dark.