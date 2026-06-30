# Product

## Register

brand

> Register is split in practice. The marketing **landing** (where design _is_ the product) is the default and the surface under active work, so PRODUCT.md carries `brand`. The **product app** (dashboard, candidate flow, wizard, auth) is co-equal — when working those surfaces, switch the register to `product` per task.

## Users

**Primary: executives & business decision-makers.** People deciding on team composition, hires, and org structure. They don't run assessments themselves — they consume the aggregated picture: who fits, who's a risk, how a candidate compares, what the data says. Their context is high-stakes, low-patience: they need to trust a conclusion fast and defend it to others.

**Secondary: HR & recruiters** who operate the platform day to day (compare candidates, read reports, drive hiring decisions), and **candidates** who pass through the assessment flow and need a calm, trustworthy experience.

## Product Purpose

Eltera is an AI platform for assessing job candidates and employees. It turns assessment data into clear, defensible decisions about people — fit, risk, comparison, and competency. Success is a decision-maker looking at an Eltera screen and feeling they can trust the conclusion enough to act on it without second-guessing the tool.

## Brand Personality

Modern and AI-native, carried by **precision and trust** rather than hype. Three words: **precise, confident, contemporary.** The voice is the expert in the room who has already done the analysis — it states findings plainly, lets the data lead, and never oversells. Technologically current (AI-first, alive, considered motion and accent), but the modernity reads as competence, not as decoration. The emotional goal is earned confidence: the user should feel the platform knows what it's talking about.

## Anti-references

- **Generic HR-SaaS.** Blue-and-white template platforms, stock people photos, bland identical cards. Eltera is not interchangeable with every applicant-tracking tool.
- **AI slop.** Gradient text, purple hero-glow, endless identical card grids, a tracked uppercase eyebrow over every section. The modernity must be real, not the saturated AI default.
- **Overloaded enterprise.** Gray corporate panels, button chaos, dated Bootstrap density. Data-dense ≠ cluttered.
- **Playful / unserious.** Cartoon illustrations, emoji, jokey tone. Anything that undercuts trust in a high-stakes hiring decision.

Reference feel: **Stripe / Mercury** — premium, fintech-grade trust; clean presentation of data; details that signal the product is serious and well-made.

## Design Principles

1. **Let the data lead.** The conclusion is the hero, not the chrome around it. Every screen should make the finding obvious before the decoration.
2. **Earned confidence over hype.** Modern and AI-native is expressed through precision and polish, never through slop signifiers. If an effect doesn't increase trust, it's noise.
3. **Defensible by design.** Decision-makers act on what they see and must justify it. Show the reasoning, the comparison, the source — never an unexplained verdict.
4. **Dense without clutter.** Respect that these are data-rich screens, but use hierarchy, rhythm, and restraint so density reads as command, not chaos.
5. **Fintech-grade craft.** Match the Stripe/Mercury bar for detail — typography, spacing, motion, and states all considered. The craft itself is part of the trust.

## Accessibility & Inclusion

Target **WCAG 2.1 AA**. Body text ≥4.5:1 contrast (large text ≥3:1), full keyboard operability for the product app's interactive surfaces, visible focus states, and a `prefers-reduced-motion` alternative for every animation. Don't rely on color alone to convey status (good / risk / neutral) — pair with text or icon, since the platform leans on status semantics throughout.
