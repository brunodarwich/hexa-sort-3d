---
name: Velvet Meadow
colors:
  surface: '#111223'
  surface-dim: '#111223'
  surface-bright: '#37384a'
  surface-container-lowest: '#0c0d1d'
  surface-container-low: '#191a2b'
  surface-container: '#1d1e30'
  surface-container-high: '#28283b'
  surface-container-highest: '#323346'
  on-surface: '#e1e0f9'
  on-surface-variant: '#cac4d4'
  inverse-surface: '#e1e0f9'
  inverse-on-surface: '#2e2f41'
  outline: '#948e9d'
  outline-variant: '#494552'
  surface-tint: '#cebdff'
  primary: '#cebdff'
  on-primary: '#381385'
  primary-container: '#a78bfa'
  on-primary-container: '#3c1989'
  inverse-primary: '#674bb5'
  secondary: '#73db9a'
  on-secondary: '#00391d'
  secondary-container: '#00834b'
  on-secondary-container: '#e5ffe9'
  tertiary: '#fcb973'
  on-tertiary: '#492900'
  tertiary-container: '#cd904e'
  on-tertiary-container: '#4e2c00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e8ddff'
  primary-fixed-dim: '#cebdff'
  on-primary-fixed: '#21005e'
  on-primary-fixed-variant: '#4f319c'
  secondary-fixed: '#8ff8b4'
  secondary-fixed-dim: '#73db9a'
  on-secondary-fixed: '#00210f'
  on-secondary-fixed-variant: '#00522d'
  tertiary-fixed: '#ffdcbd'
  tertiary-fixed-dim: '#fcb973'
  on-tertiary-fixed: '#2c1600'
  on-tertiary-fixed-variant: '#683c00'
  background: '#111223'
  on-background: '#e1e0f9'
  surface-variant: '#323346'
typography:
  display-hero:
    fontFamily: Rubik
    fontSize: 44px
    fontWeight: '700'
    lineHeight: 52px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Rubik
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Rubik
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Rubik
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
  title-sm:
    fontFamily: Rubik
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 24px
  body-lg:
    fontFamily: Outfit
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Outfit
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Rubik
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Rubik
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  margin: 1.5rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.25rem
---

## Brand & Style

The design system establishes a gentle, tactile, and calming visual sanctuary tailored for a 3D casual puzzle experience. Straying from the aggressive neon saturations, flash alarms, and stressful urgency of traditional hyper-casual mobile titles, the visual direction embraces a **"Cozy Tactile"** atmosphere. 

The aesthetic is built upon:
- **Atmospheric Warmth:** Velvet dark backdrop tones evoking late evening comfort, reducing eye strain during extended play sessions.
- **Organic Softness:** Pillowy, squishable surfaces inspired by clay, matte ceramics, and smoothed river stones rather than flat plastic or glass.
- **Stress-Free Progression:** Rewarding the player with soft buttery glows, gentle pastel harmonies (lavender, sage, peach, and soft butter yellow), and subtle tactile feedback that transforms sorting mechanics into meditative rituals.

## Colors

The color palette shifts the focus from high-stimulus hyper-casual neon to an inviting, restorative palette rooted in cozy tactile pastels over a warm, midnight velvet base:

- **Surface Base (`#121324`):** A deep, warm midnight blue that absorbs ambient visual noise, creating an intimate canvas.
- **Surface Elevation Layers:**
  - Base canvas: `#121324`
  - Floating panels / board bed: `#1B1C33`
  - High cards / modals: `#242642`
- **Pastel Piece Hierarchy & Mechanics:**
  - **Primary (`#A78BFA` - Soft Lavender):** Primary action buttons, central level progression, and hero hexagonal sorting stacks.
  - **Secondary (`#86EFAC` - Calm Sage / Mint):** Success states, boosters, unlocked zones, and mint stack items.
  - **Tertiary (`#FDBA74` - Gentle Peach):** Coins, warm streaks, milestones, and secondary stack sorting variants.
  - **Accent Butter (`#FDE047` - Butter Cream Yellow):** Soft highlights, star collections, and combo indicators.
  - **Accent Petrol Teal (`#38BDF8` or subdued `#2DD4BF`):** Calming water/sky contrast for special board tokens and quiet utility triggers.
- **Text & Glyph Hierarchy:**
  - Primary text: Soft cream white (`#F3F4F8`) with 95% opacity.
  - Secondary text: Heather mist (`#A6A9C5`) for hints, sub-labels, and tier progress counters.
  - Subtle boundaries: Translucent slate lavender (`rgba(167, 139, 250, 0.08)`).

## Typography

The pairing of **Rubik** and **Outfit** grounds the interface in friendly, soft geometry:

- **Rubik (Display, Headlines, and Interactive Labels):** With its softly curved terminals and open counters, Rubik supplies a playful, rounded confidence to level banners, coin counters, victory dialogues, and primary interaction targets. It keeps numeric readouts readable at a glance without clinical harshness.
- **Outfit (Body Copy, Hints, Settings):** Outfit offers a clean, humanist geometric foundation that pairs effortlessly with Rubik, ensuring onboarding microcopy, reward descriptions, and system notifications remain light, legible, and unhurried.

## Layout & Spacing

The layout embraces a calm, thumb-first vertical flow designed specifically for mobile and tablet puzzle interfaces:

- **Rhythm & Grid:** Built on an 8pt spatial cadence. The central viewport reserves a dedicated 3D camera staging zone surrounded by breathable floating HUD shells rather than edge-to-edge packed chrome.
- **Top App Bar:** Floats as pill clusters (Level Number, Star Tracker, Settings) with `space-sm` gaps and `margin-mobile` offset from notch safe-areas.
- **Bottom Play Deck:** Houses the hexagonal card dispenser and booster dock, elevated cleanly above home indicator safe margins with `space-lg` bottom inset.
- **Modals & Overlays:** Never fill 100% of the viewport; sheet containers present a floating cushion with a minimum of `1.25rem` margin on all sides, preserving view into the blurred 3D puzzle space behind.

## Elevation & Depth

Visual depth is achieved through tactile, pillowy physical cues rather than sharp artificial drop shadows or glossy skeuomorphism:

- **Ambient Volumetric Shadows:** Diffused, multi-layered, tinted drop shadows provide depth without creating dirty edges. Instead of pure black, shadows cast deep midnight indigo tints (`rgba(10, 11, 22, 0.45)` to `rgba(18, 19, 36, 0.6)`).
- **Physical "Squish" Undersides:** Action buttons and puzzle trays utilize dual-tone surface stacking: a subtle 3px–4px darker bottom bevel (e.g., `#8B5CF6` under an `#A78BFA` top surface) creates a satisfying physical button deck that physically depresses (`translateY(3px)`) when tapped.
- **Diffuse Backlight Accents:** Selected pieces, combo rings, and active boosters emit soft, spread-out pastels with 16px–24px blur and low opacity (20%–35%), eliminating sharp laser burns in favor of warm ambient candlelight.
- **Glass Underlays:** Modals and bottom shelves utilize gentle background blurs (`backdrop-filter: blur(16px)`) combined with a dark midnight tint (`rgba(27, 28, 51, 0.85)`).

## Shapes

The shape system adopts a pill-shaped and squircle vernacular (`level 3`), mirroring the friendly geometry of rounded hexagonal blocks:

- **Buttons & Counters:** Fully rounded pill silhouettes (`rounded-full` / 9999px) provide an approachable, friction-free feel to all touch targets.
- **Game Cards & Dialogs:** Large radii (`2rem` / 32px) on dialogue cards and game result panels eliminate sharp corners.
- **Hexagonal Smoothing:** In-game 3D hex models and 2D UI icons use softened corner radiuses (minimum 4px fillet on hex vertices) to guarantee a friendly, organic touch throughout the puzzle environment.

## Components

### Buttons
- **Primary Pill (Lavender Tactile):** Surface in `#A78BFA`, extruded base shadow in `#7C3AED` (4px height), text in deep indigo `#121324`. On active/pressed state, moves down 3px with the bottom shadow flattening.
- **Secondary / Booster Pill (Mint / Peach):** Pastel surfaces (`#86EFAC` or `#FDBA74`) with matching 3px deepened undertones. Micro-badges for booster count float over top-right corner as warm butter pills (`#FDE047`).
- **Ghost / Tertiary Action:** Translucent dark container (`rgba(255, 255, 255, 0.08)`) with cream text (`#F3F4F8`) and no extruded shadow.

### Chips & Stat Trackers
- Encapsulated pills featuring a soft `#1B1C33` fill, inner glow of `rgba(255, 255, 255, 0.04)`, and paired 20px pastel icons (coin, star, level gem). 
- Numbers set in `Rubik Medium` with proportional spacing.

### Cards & Dialog Overlays
- Surface rendered in `#242642` over a `backdrop-filter: blur(12px)` backdrop veil.
- Finished with an ultra-subtle top edge highlight (`1px inset rgba(255, 255, 255, 0.08)`) simulating light falling from above. 
- Large header pills crown the top of the card containing level completions, star achievements, or level goals.

### Hex Stack Tray (Dispenser Dock)
- Shallow rounded cradle recessed into the midnight background (`#16172B`) with an inset soft shadow (`inset 0 2px 6px rgba(0, 0, 0, 0.4)`).
- Holds up to three stack pedestals waiting for player drag-and-drop actions.

### Checkboxes & Sliders (Settings)
- Rounded toggle tracks in deep midnight lavender (`#1B1C33`); thumb handle is a soft cream puff (`#F3F4F8`) with a gentle sage green glow when active (`#86EFAC`).