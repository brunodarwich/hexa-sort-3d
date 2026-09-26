# Design System: Hexa Infinity (Casual & Cyber-Neon Puzzle Game)

## 1. Overview & Aesthetic Vision
- **Product Name:** Hexa Infinity (Infinite Sort 3D)
- **Genre:** Casual 3D Hexagonal Sorting & Cascade Merging Puzzle Game.
- **Design Philosophy:** Tactile, juicy, high-energy arcade aesthetics combined with clean, glassmorphic modern UI. Physical button feedback (extruded bevels, bounce on press), rich ambient glows, and high accessibility in both Light and Dark themes.
- **Target Devices:** Mobile First (PWA / Responsive Web), optimized for iOS Safari, Android Chrome, and Desktop widescreen monitors.

---

## 2. Color Palette & Dynamic Color Tokens

### 2.1 Brand & Accent Colors
- **Primary Action (Play / Success):** `#22c55e` (Emerald Green) | Gradient: `linear-gradient(180deg, #22c55e 0%, #16a34a 100%)` | Dark Mode Neon: `#00ff66`
- **Coin & Gold Accent (Currency / Star / Highscore):** `#f59e0b` (Radiant Amber) | Gradient: `linear-gradient(180deg, #fbbf24 0%, #d97706 100%)` | Dark Mode Neon: `#ffea00`
- **Secondary / Blue (Rankings / Navigation):** `#3b82f6` (Royal Azure) | Gradient: `linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)` | Dark Mode Neon: `#00f0ff`
- **Power-Up Lightning Strike:** `#f59e0b` & `#fbbf24` (Electric Amber) with radial glow
- **Power-Up Deck Re-roll:** `#0284c7` & `#38bdf8` (Cyan Blue Sky) with radial glow
- **Danger / Game Over:** `#ef4444` (Crimson Rose) | Dark Mode Neon: `#ff0055`

### 2.2 Light Mode Surfaces
- **App Background:** Radial gradient `radial-gradient(circle at 50% 36%, #ffffff 0%, #edf2f7 35%, #d9e1ec 70%, #b8c4d4 100%)`
- **HUD & Floating Docks:** Frosted Glass `rgba(255, 255, 255, 0.82)` with `backdrop-filter: blur(16px)` and specular border `1.5px solid rgba(255, 255, 255, 0.95)`
- **Cards & Modals:** Crisp white `#ffffff` with border `1.5px solid rgba(255, 255, 255, 0.8)` and shadow `0 25px 60px rgba(0, 0, 0, 0.25)`
- **Text Main:** `#0f172a` (Slate 900)
- **Text Muted:** `#64748b` (Slate 500)

### 2.3 Dark Neon Mode Surfaces
- **App Background:** Radial gradient `radial-gradient(circle at 50% 32%, #131929 0%, #0c101c 45%, #070913 80%, #030408 100%)`
- **HUD & Floating Docks:** Frosted Deep Blue `rgba(15, 23, 42, 0.85)` with `backdrop-filter: blur(16px)` and cyber border `1.5px solid rgba(0, 240, 255, 0.3)`
- **Cards & Modals:** Deep Cyber Glass `#0b0f1a` with cyan border `1.5px solid rgba(0, 240, 255, 0.25)` and cyan ambient aura `0 0 30px rgba(0, 240, 255, 0.15)`
- **Text Main:** `#f8fafc` (Slate 50)
- **Text Muted:** `#94a3b8` (Slate 400)

---

## 3. Typography Scale
- **Headline / Display Font:** `Fredoka` (weights: 600, 700, 800, 900) - playful, friendly, rounded geometry.
- **Body & Numerical Font:** `Outfit` (weights: 400, 600, 700, 800, 900) - ultra-clean, modern geometric grotesque with tabular numeral support.

| Level | Font Family | Size | Weight | Line Height | Letter Spacing |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display XL** | Fredoka | `2.2rem - 2.6rem` | 900 | 1.1 | `-0.02em` |
| **Title LG** | Fredoka | `1.5rem - 1.8rem` | 800 | 1.2 | `-0.01em` |
| **Title MD** | Fredoka | `1.15rem - 1.35rem` | 700 | 1.25 | `0` |
| **Body LG** | Outfit | `1.0rem - 1.1rem` | 600 | 1.4 | `0` |
| **Body MD** | Outfit | `0.88rem - 0.95rem` | 500 | 1.45 | `0.01em` |
| **Caption / Badge** | Outfit | `0.7rem - 0.8rem` | 800 | 1.1 | `0.08em uppercase` |

---

## 4. Radii, Elevation & Motion

### 4.1 Corner Roundness
- **Pills / Badges / Bubble Buttons:** `9999px` (Round Full)
- **Modal Cards & Main HUD Container:** `26px - 28px`
- **Sub-cards / Shop Items / Tut Steps:** `14px - 18px`

### 4.2 Tactile 3D Button Dynamics
- **Normal state:** `border-bottom: 3.5px solid [darker-shade]`, `box-shadow: 0 4px 10px rgba(0,0,0,0.1)`
- **Hover state:** `transform: translateY(-2px)`, `border-bottom: 4.5px solid [darker-shade]`
- **Active / Pressed state:** `transform: translateY(2px)`, `border-bottom: 1.5px solid [darker-shade]`

### 4.3 Keyframe Animations
- **bannerPopIn:** `cubic-bezier(0.34, 1.56, 0.64, 1)` scale from `0.4` to `1.06` then settle at `1.0`.
- **pulseShop:** gentle breathing glow for the store icon button.
- **sparkleTwinkle:** rotation and scale oscillation for level star sparkles.
- **radarPulse:** expanding concentric rings for real-time Pix payment detection.

---

## 5. UI Component Hierarchy
1. **Top Header HUD Bar:**
   - Utility Row: Player Profile Pill, Shop Button (glowing), Theme Toggle, Sound Toggle, Leaderboard, Restart, Info.
   - Gameplay Row: Coin/Score Pill with glowing `+` button, Central Level Capsule with rainbow badge & sparkle, Timer Pill, Highscore Pill.
2. **Notification Zone:** Floating Level Up & Combo Banners.
3. **WebGL Playfield:** 3D Hexagonal Board with smooth card stacking and cascade merge.
4. **Power-Ups Dock:** Floating double pill (Re-roll and Lightning Strike with real-time price / free-use counter).
5. **Deck Hint:** Floating instruction capsule.
6. **Modal Suite:** Nickname/Profile with Google Auth, How-to-play Tutorial, Leaderboard (Online/Local), Game Over with Second Chance Revive, Shop with item packs, Pix/Stripe Payment Gateway.
