# Eltera Design Sync — Notes

## Source shape
- Repo is a **vanilla-JS single-page app** (`web-app/`), NOT a React component library and NOT a Storybook.
- No build, no bundler, no dist. Components are JS functions returning HTML strings (`web-app/src/ui/dashboard-components.js`, `dashboard-premium.js`, `render.js`), styled by one global stylesheet `web-app/src/styles.css` (~4800 lines).
- Per user decision (2026-06-29): build a thin **React wrapper library** that reuses `styles.css` verbatim (no restyling), bundle it, and sync as `shape: package`.

## Critical CSS finding
- The "premium" dashboard classes (`elt-kpi`, `elt-panel` body, `elt-funnel`, `elt-bar-chart`, `elt-heatmap`, `elt-attention`) referenced by `dashboard-premium.js` / `PremiumKpiCard` etc. are **NOT defined anywhere** in styles.css. That premium dashboard is incomplete/dead code — the app renders `renderDashboardPlaceholder()` for the dashboard view.
- The genuinely-styled, reusable vocabulary lives in `styles.css`: `blueButton`/`ghostOnDark`/`button`, `pill`/`miniLabel`, `statusBadge`+`status-good|medium|bad|neutral`, `panel`/`panelHead`, `glass`/`heroCard`, `kpi`/`kpiGrid`, `metric`, `funnel`, `heatCell`, `attentionItem`, `emptyState`, `tariffCard`, `candidateCard`, `elt-input`.
- => Wrap only classes that ACTUALLY have CSS. The converter render check will catch any unstyled wrapper.

## Theme context
- Default `:root` tokens are DARK (navy `#0A0F1E`/`#0B1020`, accents blue `#1E5BFF` + cyan `#00E5D4`, text `#E6F2FF`). Landing/marketing uses `.landingBody` (dark). App dashboard uses `.candidateBody` (light `#F8FAFC`) + `.lightTheme` overrides.
- Many components are theme-context dependent. Previews likely need a wrapper element carrying the right body/theme class. TBD during verify loop — record provider wrapper here.

## Font
- Manrope (Google Fonts), weights 500–900. Loaded via `<link>` in index.html. Fallback Inter, Arial.

## Build/converter setup (recorded 2026-06-29)
- DS package: `web-app/design-system/` (PKG_DIR). Build: `npm --prefix web-app/design-system run build` (copies ../src/styles.css → package styles.css via copy-styles.mjs, then tsc → dist/ + .d.ts).
- `copy-styles.mjs` PREPENDS a Manrope Google-Fonts `@import` to the vendored styles.css so the shipped stylesheet is self-sufficient (resolves [FONT_MISSING] → becomes remote font, matching the app's own <link>).
- Converter run from repo root: `node .ds-sync/package-build.mjs --config .design-sync/config.json --node-modules web-app/design-system/node_modules --entry ./web-app/design-system/dist/index.js --out ./ds-bundle`
- cfg.cssEntry = "styles.css" (package-relative; bound to PKG_DIR — that's why the stylesheet is vendored into the package, not referenced at ../src).

## Known render warns (benign)
- [TOKENS_MISSING] --panel,--border,--text,--text-muted,--ov-* : referenced by OTHER widgets in styles.css (overlays etc.), NOT by any of the 16 shipped components. Verified by grep. Benign.

## Preview/theming convention
- Eltera components are built for the DARK navy surface (light text). On the default white preview card they look washed out. => EVERY authored preview wraps content in `<Surface>` (dark) — or `<Surface theme="light">` for Input (the only light-theme-only component, `.elt-input` has no dark base).
- Previews import from "@eltera/design-system" (shimmed to window.ElteraDS by the converter).

## Re-sync risks
- styles.css is the source of truth; copy-styles.mjs re-vendors it each build so the DS stays in sync with the app. If the app's class names change, re-run the build + re-verify.
- The "premium" elt-* dashboard renderers in the app remain undefined-CSS dead code; do not wrap them.

## Font resolution (2026-06-29) — RESOLVED
- The app loads Manrope from Google Fonts at runtime. The converter strips @import from cssEntry and only populates remoteImports from Storybook (none here), so a remote @import could not be shipped.
- Fix: vendor Manrope (OFL) woff2 from `@fontsource-variable/manrope` via vendor-assets.mjs → `web-app/design-system/fonts/` (latin+cyrillic subsets only), re-declared as @font-face family "Manrope" (Fontsource names it "Manrope Variable"). Wired via cfg.extraFonts=["fonts/fonts.css"]. Confirmed rendering in capture screenshots.
- Inter (secondary fallback in the stack, never reached once Manrope loads) is intentionally NOT shipped → cfg.runtimeFontPrefixes=["Inter"] suppresses its [FONT_MISSING]. Substitute accepted by design (system/Arial fallback if ever needed).
- fonts/ is generated (gitignored); the build regenerates it from the @fontsource dep, so a fresh clone reproduces it.

## Card mode overrides
- Heatmap and KpiCard use {"cardMode":"column"} — Heatmap's grid min-width 860px and KpiCard's 3-up "Statuses" story overflow the default grid cell; column gives full card width.

## Known render warns (recorded)
- [TOKENS_MISSING] --panel,--border,--text,--text-muted,--ov-* : belong to OTHER widgets in styles.css, not the 16 shipped components (grep-verified). Benign, expected on every run.
