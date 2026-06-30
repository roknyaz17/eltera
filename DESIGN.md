---
name: Eltera Assessment Intelligence
description: AI platform for assessing candidates and employees — dark, precise, fintech-grade trust.
colors:
  landing-void: "#0A0F1E"
  navy-base: "#0B1020"
  deep-surface: "#111A33"
  signal-blue: "#1E5BFF"
  pulse-cyan: "#00E5D4"
  ice-ink: "#E6F2FF"
  pure-white: "#FFFFFF"
  muted-dark: "#AAB7CF"
  muted-slate: "#8899BB"
  positive-cyan: "#16D7FF"
  warning-gold: "#D9A441"
  danger-coral: "#F87171"
  status-good: "#22C55E"
  light-canvas: "#F8FAFC"
  light-ink: "#0F172A"
typography:
  display:
    fontFamily: "Manrope, Inter, Arial, sans-serif"
    fontSize: "clamp(32px, 4.2vw, 52px)"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Manrope, Inter, Arial, sans-serif"
    fontSize: "24px"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Manrope, Inter, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "normal"
  body:
    fontFamily: "Manrope, Inter, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1.7
    letterSpacing: "normal"
  label:
    fontFamily: "Manrope, Inter, Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.08em"
rounded:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "20px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.signal-blue}"
    textColor: "{colors.pure-white}"
    rounded: "{rounded.sm}"
    padding: "11px 16px"
    height: "44px"
  button-ghost:
    backgroundColor: "rgba(255,255,255,0.06)"
    textColor: "{colors.ice-ink}"
    rounded: "{rounded.sm}"
    padding: "11px 16px"
  input-dark:
    backgroundColor: "rgba(17,26,51,0.8)"
    textColor: "{colors.ice-ink}"
    rounded: "{rounded.sm}"
    padding: "10px 14px"
  pill-tab-active:
    backgroundColor: "{colors.signal-blue}"
    textColor: "{colors.pure-white}"
    rounded: "{rounded.pill}"
    padding: "9px 16px"
---

# Design System: Eltera Assessment Intelligence

## 1. Overview

**Creative North Star: "The Instrument Panel"**

Eltera reads like a precision instrument for high-stakes decisions about people. The surface is a deep, near-black navy that recedes so the data can glow forward — signal blue and pulse cyan are light sources, not paint. Nothing is loud for its own sake; the brightness is reserved for the conclusion the user came to read. The feeling is fintech-grade trust (Stripe / Mercury): the craft itself signals that the analysis underneath is serious and well-made.

Two worlds coexist. The **marketing landing** and the **product app's operating surfaces** live on the dark `#0A0F1E` void where accents glow against depth. The **candidate assessment flow** flips to a calm light canvas (`#F8FAFC`) — when a person is being measured, the experience must feel open and trustworthy, not like an interrogation room. Both worlds share the same blue/cyan signal language and the same heavy Manrope voice, so they read as one brand at two temperatures.

This system explicitly rejects generic blue-and-white HR-SaaS, AI slop (gradient text on headings, purple hero-glow, identical card grids, an eyebrow over every section), overloaded gray enterprise density, and anything playful enough to undercut a hiring decision.

**Key Characteristics:**
- Dark-first navy void with accents used as light, not fill
- Signal blue `#1E5BFF` + pulse cyan `#00E5D4` as the entire accent vocabulary
- Heavy Manrope (700–900) for confident, compact headlines
- Glow shadows in the brand hue instead of generic drop shadows
- A deliberate light theme for the candidate-facing flow

## 2. Colors

A dark navy field carrying two cool signal accents; warmth is forbidden, contrast comes from luminosity not from new hues.

### Primary
- **Signal Blue** (`#1E5BFF`): The decision color. Primary buttons, active states, links, key data emphasis. Carried by a glow shadow `0 14px 34px rgba(30,91,255,.28)` rather than a hard edge.

### Secondary
- **Pulse Cyan** (`#00E5D4`): The "alive / AI" accent. Hover lifts, focus rings, gradient partner, positive signals. Paired with blue in the signature `linear-gradient(135deg, #1E5BFF, #00E5D4)`.

### Tertiary
- **Positive Cyan** (`#16D7FF`), **Warning Gold** (`#D9A441`), **Danger Coral** (`#F87171`), **Status Good** (`#22C55E`): Status semantics only — never decorative. Each pairs a translucent bg + border + text triad (e.g. good = `rgba(34,197,94,.14)` bg, `#22C55E` text).

### Neutral
- **Landing Void** (`#0A0F1E`): The dominant dark page background.
- **Navy Base** (`#0B1020`) / **Deep Surface** (`#111A33`): Raised panels and cards on dark.
- **Ice Ink** (`#E6F2FF`): Primary text on dark.
- **Muted Slate** (`#8899BB`) / **Muted Dark** (`#AAB7CF`): Secondary text on dark — the floor for body legibility; do not go dimmer for running text.
- **Light Canvas** (`#F8FAFC`) / **Light Ink** (`#0F172A`): The candidate-flow light theme background and text.

### Named Rules
**The Glow-Not-Paint Rule.** Accents announce themselves through brand-hue glow shadows, never through large flat fills. A blue button glows; it does not stamp a blue block.

**The Two-Accent Rule.** Blue and cyan are the entire accent palette. Introducing a third hue (purple, teal-green, magenta) is prohibited — it reads as AI slop and breaks the instrument metaphor.

## 3. Typography

**Display Font:** Manrope (with Inter, Arial fallback)
**Body Font:** Manrope (single family, weight-differentiated)

**Character:** One family, worked across a wide weight axis (500 → 900). The headlines are heavy and slightly tightened; the body is mid-weight and airy. Confidence comes from weight contrast, not from a second typeface.

### Hierarchy
- **Display** (800, `clamp(32px, 4.2vw, 52px)`, 1.15, `-0.02em`): Hero and landing headlines. Ceiling 52px — the page states, it does not shout.
- **Headline** (800, 24px, 1.2): Section and screen titles inside the app.
- **Title** (700, 16px, 1.4): Card titles, group labels, emphasized rows.
- **Body** (500, 16px, 1.7): Running copy. Cap measure at 65–75ch.
- **Label** (700, 11px, `0.08em`): Form labels and micro-headers. The *only* place uppercase tracking is allowed.

### Named Rules
**The Weight-Is-Hierarchy Rule.** Distinction comes from Manrope's weight ramp, never from a second font. Display = 800/900, body = 500. Don't pair Manrope with another sans.

**The Tracked-Label-Only Rule.** Wide letter-spacing belongs to 11px labels alone. It is forbidden as a section eyebrow above headings.

## 4. Elevation

Hybrid: the dark surfaces use **tonal layering** (void → navy → deep surface) for structural depth, and **colored glow shadows** for interactive lift. Neutral gray drop shadows belong only to the light candidate theme. Depth on dark is light, not shade.

### Shadow Vocabulary
- **Blue Lift** (`box-shadow: 0 14px 34px rgba(30,91,255,.28)`): Primary buttons and decision elements.
- **Cyan Aura** (`box-shadow: 0 8px 40px rgba(0,229,212,0.18), 0 0 60px rgba(0,229,212,0.08)`): Hovered/featured elements signalling "alive".
- **Modal Deep** (`box-shadow: 0 28px 90px rgba(0,0,0,.32)`): Dialogs over the dark field.
- **Light Soft** (`box-shadow: 0 16px 48px rgba(15,23,42,.08)`): Cards in the candidate light theme only.
- **Focus Ring** (`box-shadow: 0 0 0 3px rgba(30,91,255,0.15)` / cyan equiv): Keyboard and input focus.

### Named Rules
**The Colored-Depth Rule.** On dark surfaces, lift is expressed in the brand hue (blue/cyan glow), not in black drop shadow. Gray shadows on dark read as flat and dated.

## 5. Components

### Buttons
- **Shape:** Soft rectangle, 8px radius (`{rounded.sm}`). Pills (`999px`) only for tab/segment toggles.
- **Primary (`.blueButton`):** `#1E5BFF` bg, white text, Blue Lift glow, `border: 1px solid rgba(255,255,255,.12)`. Large variant 44px min-height, `11px 16px` padding; default 36px, `8px 12px`. Font-weight 900.
- **Hover / Focus:** `filter: brightness(1.08)` on hover; 3px blue focus ring. No translate on primary; gentle.
- **Ghost (`.ghostOnDark`):** `rgba(255,255,255,.06)` bg, ice-ink text — secondary actions on dark.

### Inputs / Fields
- **Style (dark):** `rgba(17,26,51,0.8)` bg, `1px solid rgba(30,91,255,0.25)` border, 8px radius, ice-ink text, 14px.
- **Focus:** border → `#1E5BFF`, `0 0 0 3px rgba(30,91,255,0.15)` ring.
- **Placeholder:** `rgba(230,242,255,0.25)` — note: verify this clears 4.5:1 for any field where the placeholder carries meaning; bump toward ice-ink if so.

### Pills / Tabs
- **Style:** 100px radius, 13px/600. Inactive = transparent + dim ice (`rgba(230,242,255,0.38)`). Active = `linear-gradient(135deg, #1E5BFF, #0EA5E9)`, white text, blue glow.

### Cards / Containers
- **Corner Style:** 8–12px on dense panels; up to 20px on feature cards.
- **Background:** Deep Surface `#111A33` / Navy Base on dark; white on light theme.
- **Shadow Strategy:** Colored glow on dark, Light Soft on light (see Elevation).

### Navigation
- **Landing header:** sticky, `rgba(10,15,30,.72)` bg with `backdrop-filter: blur(20px)`, 1px bottom hairline `rgba(255,255,255,.08)`. The one sanctioned use of glass — purposeful, for the floating sticky bar only.

### Signature: Aurora Field
The landing background layers radial gradients of blue and cyan at low alpha over the navy linear base (`radial-gradient(circle at 22% 8%, rgba(30,91,255,.18), transparent 28%)`, etc.). This atmospheric depth is the brand's hero treatment — the "instrument glow."

## 6. Do's and Don'ts

### Do:
- **Do** use signal blue `#1E5BFF` and pulse cyan `#00E5D4` as the entire accent palette; reach for glow, not flat fill.
- **Do** express depth on dark with tonal layering + brand-hue glow shadows.
- **Do** drive hierarchy through Manrope's weight ramp (500 → 900).
- **Do** keep the candidate flow on the calm light canvas `#F8FAFC` for trust.
- **Do** pair every status color with text/icon, never color alone (WCAG AA).
- **Do** keep display headings ≤52px and letter-spacing ≥ -0.04em.

### Don't:
- **Don't** ship generic blue-and-white HR-SaaS chrome or stock people imagery.
- **Don't** use gradient text (`background-clip: text`) on headings, purple hero-glow, identical icon-card grids, or a tracked uppercase eyebrow over every section — these are the AI-slop tells the brand rejects.
- **Don't** introduce a third accent hue beyond blue/cyan.
- **Don't** use gray/black drop shadows on dark surfaces; they read flat and dated.
- **Don't** pair Manrope with a second sans-serif.
- **Don't** let muted body text drop below `#8899BB` on dark — legibility floor.
- **Don't** apply glassmorphism decoratively; the blurred sticky header is the only sanctioned glass.
- **Don't** add playful illustration, emoji, or jokey tone that undercuts a hiring decision.
