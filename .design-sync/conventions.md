# Eltera Design System — how to build with it

Eltera is a Russian-language HR / personnel-assessment product. The look is a dark navy surface with blue→cyan accents, Manrope type, translucent "glass" cards, and a five-step status color scale. Build screens by composing the components below; do not hand-write markup that re-implements them.

## 1. Always wrap a screen in `<Surface>`

`Surface` establishes the theme: background, text color, and the token context every other component inherits. Without it, components render on a bare white page with wrong text colors.

```jsx
<Surface theme="dark">{/* navy brand surface — landing, nav, dashboards */}</Surface>
<Surface theme="light">{/* light app surface — tables, forms, candidate cards */}</Surface>
```

- `theme="dark"` (default) → navy background, light text. Use for marketing, navigation shells, and analytics dashboards.
- `theme="light"` → `#F8FAFC` background, dark text, and the `lightTheme` token overrides. Use for the in-app workspace and **all forms** — `Input` is only styled under a light Surface.

## 2. Styling idiom: props + brand CSS variables, no utility classes

There is **no utility-class system**. Style components through their props, and for your own layout glue (gaps, max-widths, custom accents) use the brand CSS variables defined on `:root` in `styles.css`.

- **Status scale** — the prop `status` takes `"good" | "medium" | "bad" | "neutral" | "noData"` and drives the color of `StatusBadge`, `StatusDot`, `KpiCard`, `Heatmap` cells, and `AttentionPanel` items. Green / amber / red / blue / grey respectively.
- **Color tokens** (use via `var(--name)`): brand `--blue` `#1E5BFF`, `--cyan` `#00E5D4`; surfaces `--landing` `--navy` `--deep`; text `--white` `--ice`, muted `--mutedDark` (on dark) and `--mutedLight` (on light); semantic `--positive` `--warning` `--danger`; hairlines `--lineDark` `--lineLight`. Status tints come as `--status-good-bg/-border/-text` (and `-medium/-bad/-neutral/-muted`).
- **Type** is Manrope (shipped). Headings are heavy (700–900); the `Pill` eyebrow is uppercase cyan.

Prefer real content in Russian (the product's language) over Lorem.

## 3. Component map

- **Layout / shell:** `Surface`, `Panel` (+ `PanelHead`), `GlassCard` (frosted hero card), `KpiGrid`.
- **Metrics / dataviz:** `KpiCard` (icon + value + label + status dot), `Metric` (label/value + gradient bar), `Funnel` (narrowing recruitment stages), `Heatmap` (status-tinted grid), `AttentionPanel` ("needs attention" signals).
- **Primitives:** `Button` (`variant="primary"|"ghost"`, `size`, `wide`), `Pill` (eyebrow label), `StatusBadge`, `StatusDot`, `EmptyState`, `PeriodFilter`, `Input`.

`KpiCard` and `Heatmap` render full-width (one per row) — give them room.

## 4. Where the truth lives

Read the bound `styles.css` (and its `@import`ed `_ds_bundle.css` / `fonts/`) for the exact tokens and class rules, and each component's `<Name>.d.ts` + `<Name>.prompt.md` for its API before composing.

## 5. Idiomatic example

```jsx
<Surface theme="dark">
  <Pill>Аналитика найма</Pill>
  <h2 style={{ margin: "10px 0 16px" }}>Воронка подбора</h2>
  <KpiGrid>
    <KpiCard label="Кандидаты" value="248" caption="+18 за неделю" status="neutral" />
    <KpiCard label="Соответствие" value="92%" caption="средний fit" status="good" />
    <KpiCard label="В зоне риска" value="7" caption="сотрудников" status="bad" />
  </KpiGrid>
  <Panel>
    <PanelHead title="Источники откликов" caption="30 дней" />
    <Metric label="hh.ru" value="248" percent={100} />
    <Metric label="Telegram" value="121" percent={49} />
  </Panel>
</Surface>
```
