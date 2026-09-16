---
name: Porcelain Garden
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#3c4a42'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#6c7a71'
  outline-variant: '#bbcabf'
  surface-tint: '#006c49'
  primary: '#006c49'
  on-primary: '#ffffff'
  primary-container: '#10b981'
  on-primary-container: '#00422b'
  inverse-primary: '#4edea3'
  secondary: '#8127cf'
  on-secondary: '#ffffff'
  secondary-container: '#9c48ea'
  on-secondary-container: '#fffbff'
  tertiary: '#944a00'
  on-tertiary: '#ffffff'
  tertiary-container: '#ef8933'
  on-tertiary-container: '#5c2c00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#6ffbbe'
  primary-fixed-dim: '#4edea3'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005236'
  secondary-fixed: '#f0dbff'
  secondary-fixed-dim: '#ddb7ff'
  on-secondary-fixed: '#2c0051'
  on-secondary-fixed-variant: '#6900b3'
  tertiary-fixed: '#ffdcc5'
  tertiary-fixed-dim: '#ffb783'
  on-tertiary-fixed: '#301400'
  on-tertiary-fixed-variant: '#713700'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Rubik
    fontSize: 44px
    fontWeight: '700'
    lineHeight: 52px
  display-lg-mobile:
    fontFamily: Rubik
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg:
    fontFamily: Rubik
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-md:
    fontFamily: Rubik
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Rubik
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Outfit
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Outfit
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Outfit
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Outfit
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: Outfit
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 16px
  label-sm:
    fontFamily: Outfit
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-sm: 0.75rem
  gutter-lg: 1.5rem
  margin: 1.25rem
  margin-sm: 1rem
  margin-lg: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

This design system delivers a tactile, cozy, and meditative sensory experience tailored for a casual 3D spatial puzzle game. It merges tactile claymorphism with Scandinavian minimalism—creating an atmosphere reminiscent of smooth porcelain tiles, soft daylight, and matte confectionery.

### Core Character
- **Tactile Comfort:** Interfaces mimic physical, matte ceramic and lacquered wood blocks that feel satisfying to touch, sort, and stack.
- **Calm Playfulness:** Visual tension is eliminated. Rather than high-stakes arcade intensity, the UI invites flow-state relaxation through airy layouts and gentle feedback.
- **Sensory Balance:** Floating pill forms, generous breathable white space, and soft ambient glows replace harsh dividing lines and sharp structural geometry.

### Visual Style Direction
The aesthetic combines **Soft Tactility** and **Airy Minimalism**. Surfaces appear weightless yet physically tangible through multi-layered ambient light, warm diffused contact shadows, and generous pill-shaped contours.

## Colors

The palette is anchored by clean porcelain foundations with creamy undertones, brought to life through cheerful, confectionery pastels.

### Functional Roles
- **Porcelain Canvas & Surfaces:** Pure milk-white (`#ffffff`) atop airy slate creams (`#f8fafc` to `#f1f5f9`). Layered elevation is achieved through subtle warmth rather than heavy graying.
- **Fresh Mint (Primary):** Energizing yet peaceful green used for core success states, primary game actions, level completions, and progress fills.
- **Gentle Lavender (Secondary):** A whimsical violet accentuating special booster mechanics, magical power-ups, and sorting milestones.
- **Warm Peach (Tertiary):** A tender citrus tone reserved for daily challenges, reward chests, and tactile highlights.
- **Honey Gold (Warning & Currency):** A buttery yellow-gold (`#f59e0b`) dedicated to star counts, coin banks, and score multipliers.
- **Slate Cloud (Neutrals):** Softened slates (`#334155` to `#94a3b8`) for typography and icons, preventing the harsh contrast of pure black against light pastels.

## Typography

The type system blends the friendly, rounded geometry of **Rubik** for titles and numeric milestones with the balanced, modern clarity of **Outfit** for interface labels, tooltips, and dialogues.

### Structural Treatment
- **Display & Numerical Milestones:** Rubik Bold lends a plump, sticker-like tactile quality to level numbers, move counters, and combo banners.
- **Interface & Readability:** Outfit maintains wide apertures and geometric balance, preserving crisp clarity even at compact mobile sizes inside floating pills.
- **Letter Spacing:** Headlines utilize tight tracking (`-0.02em`) to bind words into unified visual objects, while micro labels apply subtle expansion (`+0.02em`) to ensure legibility across soft-tinted backgrounds.

## Layout & Spacing

The layout centers around an uncluttered 3D canvas viewport, bounded by floating HUD clusters rather than pinned edge-to-edge chrome bars.

### Spatial Model
- **Floating Island Canvas:** Game controls and inventory sit within isolated floating pill docklets suspended above the pastel 3D playfield.
- **Safe Cushion Margins:** Interfaces observe generous edge padding (`margin-lg` on tablets, `margin` on mobile) to keep gameplay free from thumb obstruction.
- **Rhythmic Stacking:** Component internal layouts rely on an 8pt sub-grid, scaling between `space-sm` for compact badge tags and `space-xl` for modal content separation.

## Elevation & Depth

Visual hierarchy uses **Ambient Porcelain Layers** combined with dual-source contact shadows. Instead of harsh charcoal drops, shadows carry a cool ambient tint borrowed from surrounding pastel elements.

### Elevation Hierarchy
1. **Playfield Base (Level 0):** The soft gradient floor (`#f8fafc` fading downward into `#e2e8f0`).
2. **Resting Pill Cards & Trays (Level 1):** Solid white (`#ffffff`) surfaces elevated by two stacked shadows:
   - Ambient Glow: `0 4px 20px -2px rgba(148, 163, 184, 0.15)`
   - Contact Rim: `0 1px 3px 0 rgba(100, 116, 139, 0.08)`
3. **Interactive Tiles & Stack Selectors (Level 2):** Elevated interactive components with a bottom bevel accent (a 3px thicker bottom border/inset shadow in a deeper tone) to simulate physical depth.
4. **Modals & Overlays (Level 3):** Frosted ambient backdrop (`backdrop-filter: blur(16px); background: rgba(248, 250, 252, 0.75)`) topped with a soft-floating modal box casting an expanded bloom shadow (`0 20px 40px -8px rgba(71, 85, 105, 0.12)`).

## Shapes

The design system embraces ultra-soft, organic geometry. Sharp angles are completely prohibited across UI elements to ensure a cozy, soothing visual experience.

### Architectural Geometry
- **Fully Rounded Pills (`rounded-full`):** HUD counter bubbles, action buttons, booster slots, and tab switchers take true pill forms.
- **Pebble Containers (`rounded-3xl`):** Bottom sheets, modal dialogues, level cards, and store tiles use an exaggerated 24px–32px radius, evoking smooth river pebbles or ceramic trays.
- **Hexagonal Cohesion:** While HUD elements use pills, icon badges subtly reference the 3D gameboard's 60-degree hexagonal symmetry through rounded organic hexagons.

## Components

### Buttons & Interactive Controls
- **Primary 3D Pill:** Mint green background (`#10b981`) with white bold text, wrapped in a pill shape. Features a subtle bottom press lip (`box-shadow: 0 4px 0 #059669`) that compresses on click/tap (`translate-y: 2px; box-shadow: 0 2px 0 #059669`).
- **Secondary Icon Docks:** Circular white buttons housing soft-tinted icons (lavender, warm peach). Supported by an ambient float shadow.
- **Tonal Ghost Buttons:** Mint or lavender backgrounds at 12% opacity with saturated foreground text for low-priority navigation.

### HUD & Game Counters
- **Metric Badges (Coins, Moves, Stars):** Pill-shaped porcelain containers with an icon overlapping the left perimeter. Numbers use `Rubik` in Slate-700 with a faint white text emboss.
- **Progress Trackers:** Porcelain track filled with a gradient mint bar, capped with a glossy rounded finish and pulsing star milestones.

### Cards & Dialog Trays
- **Level Overviews & Shop Cards:** Thick milk-white pebble panels (`#ffffff`) surrounded by a 1px frosted boundary line (`rgba(255, 255, 255, 0.8)`). No dark borders. Content is spaced loosely with `space-md` gaps.
- **Reward Chest Modules:** Peach-to-amber soft gradient surface with an inner white rim to create a sunlit edge reflection.

### Booster Slots & Chips
- **Circular Booster Trays:** 56px circular porcelain docks. When empty, they show a dashed pastel outline; when equipped, they feature vibrant 3D power-up graphics with an elevated mini-badge counter at the top-right corner.

### Selection Controls & Switches
- **Toggles:** Ultra-wide pills with a floating round ceramic knob casting a soft directional shadow. Inactive state rests in muted lavender-gray (`#e2e8f0`), transitioning smoothly to fresh mint (`#10b981`) upon activation.