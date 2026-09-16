/**
 * GameManager.js
 * Core engine orchestrating 3D rendering, input handling, magnetic card merges,
 * total color pop clears, real-time stack badges, score, and game state.
 */

import * as THREE from 'three';
import confetti from 'canvas-confetti';
import { HexGrid, HEX_RADIUS } from './HexGrid.js';
import { TileFactory, CARD_THICKNESS, PEDESTAL_HEIGHT, PALETTE } from './HexTile.js';
import { AnimationSystem } from './AnimationSystem.js';
import { SoundSystem } from './SoundSystem.js';
import { LeaderboardManager } from './Leaderboard.js';

export const DECK_SLOT_COUNT = 3;
export const STACK_CLEAR_THRESHOLD = 10;

export const LEVEL_THRESHOLDS = [
  0,      // Nível 1: 0 - 1499
  1500,   // Nível 2: 1500 - 3999
  4000,   // Nível 3: 4000 - 7999
  8000,   // Nível 4: 8000 - 13999
  14000,  // Nível 5: 14000 - 21999
  22000,  // Nível 6: 22000 - 31999
  32000,  // Nível 7: 32000 - 43999
  44000,  // Nível 8: 44000 - 57999
  58000,  // Nível 9: 58000 - 73999
  74000,  // Nível 10: 74000+
];

export const LEVEL_BACKGROUNDS = {
  light: [
    // Nível 1: Classic Studio Ice / Slate
    {
      gradient: 'radial-gradient(circle at 50% 36%, #ffffff 0%, #edf2f7 35%, #d9e1ec 70%, #b8c4d4 100%)',
      bounceLight: 0xfff7ed,
      fillLight: 0xe2e8f0,
      metaTheme: '#d8dce4',
      name: 'Estúdio Cristal'
    },
    // Nível 2: Warm Sunset Coral / Peach Aura
    {
      gradient: 'radial-gradient(circle at 50% 36%, #fff7ed 0%, #fed7aa 35%, #fbcfe8 70%, #c4b5fd 100%)',
      bounceLight: 0xffedd5,
      fillLight: 0xfde047,
      metaTheme: '#fed7aa',
      name: 'Pôr do Sol Coral'
    },
    // Nível 3: Fresh Emerald Oasis / Jade Mint
    {
      gradient: 'radial-gradient(circle at 50% 36%, #f0fdf4 0%, #bbf7d0 35%, #99f6e4 70%, #93c5fd 100%)',
      bounceLight: 0xdcfce7,
      fillLight: 0xa7f3d0,
      metaTheme: '#bbf7d0',
      name: 'Oásis Esmeralda'
    },
    // Nível 4: Dreamy Lavender Twilight / Violet
    {
      gradient: 'radial-gradient(circle at 50% 36%, #faf5ff 0%, #e9d5ff 35%, #c7d2fe 70%, #a5b4fc 100%)',
      bounceLight: 0xf3e8ff,
      fillLight: 0xc4b5fd,
      metaTheme: '#e9d5ff',
      name: 'Crepúsculo Lavanda'
    },
    // Nível 5: Radiant Golden Sunburst / Amber
    {
      gradient: 'radial-gradient(circle at 50% 36%, #fefce8 0%, #fef08a 35%, #fed7aa 70%, #fca5a5 100%)',
      bounceLight: 0xfef9c3,
      fillLight: 0xfde047,
      metaTheme: '#fef08a',
      name: 'Aurora Dourada'
    },
    // Nível 6: Arctic Cyan / Glacier Azure
    {
      gradient: 'radial-gradient(circle at 50% 36%, #ecfeff 0%, #bae6fd 35%, #a5f3fc 70%, #93c5fd 100%)',
      bounceLight: 0xe0f2fe,
      fillLight: 0x7dd3fc,
      metaTheme: '#bae6fd',
      name: 'Geleira Ártica'
    },
    // Nível 7: Radiant Rose Quartz / Magenta Bloom
    {
      gradient: 'radial-gradient(circle at 50% 36%, #fff1f2 0%, #ffe4e6 35%, #fecdd3 70%, #f5d0fe 100%)',
      bounceLight: 0xffe4e6,
      fillLight: 0xf472b6,
      metaTheme: '#fecdd3',
      name: 'Quartzo Rosa'
    },
    // Nível 8+: Electric Citrus / Neon Meadow
    {
      gradient: 'radial-gradient(circle at 50% 36%, #f7fee7 0%, #ecfccb 35%, #d9f99d 70%, #a7f3d0 100%)',
      bounceLight: 0xecfccb,
      fillLight: 0xbef264,
      metaTheme: '#ecfccb',
      name: 'Prado Elétrico'
    }
  ],
  dark: [
    // Nível 1: Obsidiana Cósmica (Deep Navy / Cobalt)
    {
      gradient: 'radial-gradient(circle at 50% 32%, #1e293b 0%, #0f172a 40%, #090d18 75%, #020617 100%)',
      bounceLight: 0x38bdf8,
      fillLight: 0x0ea5e9,
      metaTheme: '#0f172a',
      name: 'Obsidiana Cósmica'
    },
    // Nível 2: Pôr do Sol Cyber (Vibrant Neon Magenta & Plum)
    {
      gradient: 'radial-gradient(circle at 50% 32%, #701a75 0%, #4a044e 38%, #2e083a 72%, #0f0214 100%)',
      bounceLight: 0xf43f5e,
      fillLight: 0xd946ef,
      metaTheme: '#4a044e',
      name: 'Pôr do Sol Cyber'
    },
    // Nível 3: Matriz Esmeralda (Vibrant Glowing Emerald & Jade)
    {
      gradient: 'radial-gradient(circle at 50% 32%, #065f46 0%, #044332 38%, #022c22 72%, #01140e 100%)',
      bounceLight: 0x10b981,
      fillLight: 0x34d399,
      metaTheme: '#044332',
      name: 'Matriz Esmeralda'
    },
    // Nível 4: Nebulosa Neon (Vibrant Astral Indigo & Royal Purple)
    {
      gradient: 'radial-gradient(circle at 50% 32%, #4338ca 0%, #312e81 38%, #1e1b4b 72%, #090724 100%)',
      bounceLight: 0xa855f7,
      fillLight: 0x818cf8,
      metaTheme: '#312e81',
      name: 'Nebulosa Neon'
    },
    // Nível 5: Âmbar Incandescente (Vibrant Molten Copper & Gold)
    {
      gradient: 'radial-gradient(circle at 50% 32%, #92400e 0%, #78350f 38%, #451a03 72%, #1a0800 100%)',
      bounceLight: 0xf59e0b,
      fillLight: 0xfbbf24,
      metaTheme: '#78350f',
      name: 'Âmbar Incandescente'
    },
    // Nível 6: Abismo Neon (Vibrant Electric Cyan & Deep Ocean)
    {
      gradient: 'radial-gradient(circle at 50% 32%, #0891b2 0%, #0e7490 38%, #155e75 72%, #041f29 100%)',
      bounceLight: 0x06b6d4,
      fillLight: 0x22d3ee,
      metaTheme: '#0e7490',
      name: 'Abismo Neon'
    },
    // Nível 7: Synthwave 80s (Vibrant Retro Crimson Pink)
    {
      gradient: 'radial-gradient(circle at 50% 32%, #9d174d 0%, #831843 38%, #500724 72%, #1a020c 100%)',
      bounceLight: 0xf43f5e,
      fillLight: 0xfb7185,
      metaTheme: '#831843',
      name: 'Synthwave 80s'
    },
    // Nível 8+: Aurora Tóxica (Vibrant Toxic Neon Lime)
    {
      gradient: 'radial-gradient(circle at 50% 32%, #4d7c0f 0%, #365314 38%, #1a2e05 72%, #0a1402 100%)',
      bounceLight: 0x84cc16,
      fillLight: 0xa3e635,
      metaTheme: '#365314',
      name: 'Aurora Tóxica'
    }
  ]
};

export class GameManager {
  constructor(canvasContainer) {
    this.container = canvasContainer;

    // Subsystems
    this.hexGrid = new HexGrid(2); // 19 cells
    this.tileFactory = new TileFactory();
    this.sound = new SoundSystem();
    this.leaderboard = new LeaderboardManager();

    // Three.js Core
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.animation = null;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.currentTheme = 'light';
    this.ambientLight = null;
    this.dirLight = null;
    this.fillLight = null;
    this.bounceLight = null;
    this.floorShadowMat = null;
    this.dynamicFlashLight = null;
    this.ambientMotes = null;
    this.ambientMotesSpeeds = [];

    // Game State
    this.score = 0;
    this.highScore = this.leaderboard.getHighScore();
    this.level = 1;
    this.totalClears = 0;
    this.maxCombo = 1;
    this.currentCombo = 1;
    this.gameTimeSeconds = 0;
    this.timerInterval = null;
    this.isGameOver = false;
    this.isProcessingMerge = false;

    // Deck & Dragging
    this.deckSlots = [];
    this.draggedDeckItem = null;
    this.draggedStackGroup = null;
    this.selectedDeckSlot = null;
    this.dragStartPos = null;
    this.hasMovedDistance = false;
    this.hoveredSlot = null;

    // Badges
    this.slotBadges = new Map(); // slot.id -> Sprite

    // Clock
    this.clock = new THREE.Clock();

    // Initialize
    this.initThree();
    this.initBoardVisuals();
    this.initDeckVisuals();
    this.initEventListeners();
    this.startNewGame();
  }

  initThree() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    // 1. Scene
    this.scene = new THREE.Scene();

    // 2. Camera (Isometric-angled perspective)
    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    this.adjustCameraForScreen(width, height);

    // 3. High-fidelity WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      precision: 'highp'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.0));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.container.appendChild(this.renderer.domElement);

    // 4. High-Contrast Studio Lighting Rig (Vibrant colors, no milky wash)
    this.ambientLight = new THREE.AmbientLight(0xffffff, 1.05);
    this.scene.add(this.ambientLight);

    // Key Light: Clean directional studio key casting soft shadows
    this.dirLight = new THREE.DirectionalLight(0xffffff, 1.55);
    this.dirLight.position.set(12, 28, 14);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 60;
    this.dirLight.shadow.camera.left = -12;
    this.dirLight.shadow.camera.right = 12;
    this.dirLight.shadow.camera.top = 12;
    this.dirLight.shadow.camera.bottom = -12;
    this.dirLight.shadow.bias = -0.0003;
    this.dirLight.shadow.radius = 2.0;
    this.scene.add(this.dirLight);

    this.fillLight = new THREE.DirectionalLight(0xe2e8f0, 0.60);
    this.fillLight.position.set(-12, 20, -10);
    this.scene.add(this.fillLight);

    this.bounceLight = new THREE.PointLight(0xfff7ed, 0.35, 25);
    this.bounceLight.position.set(0, 8, 10);
    this.scene.add(this.bounceLight);

    // Dynamic clearance flash light
    this.dynamicFlashLight = new THREE.PointLight(0xffffff, 0, 18);
    this.dynamicFlashLight.position.set(0, 3.5, 0);
    this.scene.add(this.dynamicFlashLight);

    // Soft Tabletop Shadow Receiver Floor (large enough for ultrawide desktop)
    const floorShadowGeom = new THREE.PlaneGeometry(140, 140);
    this.floorShadowMat = new THREE.ShadowMaterial({ opacity: 0.18 });
    const floorShadowMesh = new THREE.Mesh(floorShadowGeom, this.floorShadowMat);
    floorShadowMesh.rotation.x = -Math.PI / 2;
    floorShadowMesh.position.y = -PEDESTAL_HEIGHT / 2 - 0.001;
    floorShadowMesh.receiveShadow = true;
    this.scene.add(floorShadowMesh);

    // Ambient floating bokeh motes in 3D background
    this.initAmbientMotes();

    // 5. Animation System
    this.animation = new AnimationSystem(this.scene);

    // 6. Start Render Loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  adjustCameraForScreen(width, height) {
    // Dynamic framing so the 3D board is large, prominent and unobstructed
    const target = new THREE.Vector3(0, 0.4, 0.6);
    const direction = new THREE.Vector3(0, 18.5, 12.5).normalize();
    const points = [];
    for (const x of [-4.5, 4.5]) {
      for (const y of [0, 2.3]) {
        for (const z of [-4.1, 6.7]) {
          points.push(new THREE.Vector3(x, y, z));
        }
      }
    }
    let distance = 10;
    for (; distance < 80; distance += 0.4) {
      this.camera.position.copy(target).addScaledVector(direction, distance);
      this.camera.lookAt(target);
      this.camera.updateMatrixWorld();
      if (points.every(point => {
        const p = point.clone().project(this.camera);
        return Math.abs(p.x) < 0.90 && Math.abs(p.y) < 0.86;
      })) break;
    }
  }

  getDeckLayout(width, height) {
    const aspect = width / height;
    const spacing = aspect < 0.65 ? 2.5 : aspect < 0.9 ? 2.8 : 3.1;
    const z = 5.6;
    return { spacing, z };
  }

  initBoardVisuals() {
    this.boardGroup = new THREE.Group();
    this.scene.add(this.boardGroup);

    for (const slot of this.hexGrid.getAllSlots()) {
      const pedestal = this.tileFactory.createSlotPedestal(slot);
      slot.mesh = pedestal;
      slot.highlightMesh = pedestal.userData.highlightMesh;
      this.boardGroup.add(pedestal);

      // Stack count badge sprite
      const badge = this.tileFactory.createStackCountSprite();
      badge.position.set(slot.worldX, 0.8, slot.worldZ);
      this.scene.add(badge);
      this.slotBadges.set(slot.id, badge);
    }
  }

  initDeckVisuals() {
    this.deckGroup = new THREE.Group();
    this.scene.add(this.deckGroup);

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    const { spacing, z } = this.getDeckLayout(width, height);

    for (let i = 0; i < DECK_SLOT_COUNT; i++) {
      const x = (i - 1) * spacing;
      const y = 0;

      const pedestal = this.tileFactory.createDeckPedestal(x, y, z, i);
      this.deckGroup.add(pedestal);

      this.deckSlots.push({
        index: i,
        pos: new THREE.Vector3(x, y, z),
        cards: [],
        group: null,
        pedestalMesh: pedestal
      });
    }
  }

  updateDeckPositions() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    const { spacing, z } = this.getDeckLayout(width, height);

    for (let i = 0; i < this.deckSlots.length; i++) {
      const slot = this.deckSlots[i];
      const x = (i - 1) * spacing;
      slot.pos.set(x, 0, z);
      if (slot.pedestalMesh) {
        slot.pedestalMesh.position.set(x, -PEDESTAL_HEIGHT / 2, z);
      }
      if (slot.group && slot !== this.draggedDeckItem && slot !== this.selectedDeckSlot) {
        slot.group.position.x = x;
        slot.group.position.z = z;
      }
    }
  }

  initAmbientMotes() {
    const count = 38;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const speeds = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 28;
      positions[i * 3 + 1] = Math.random() * 12 + 1;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 24 - 2;
      speeds.push({
        vx: (Math.random() - 0.5) * 0.2,
        vy: Math.random() * 0.16 + 0.08,
        vz: (Math.random() - 0.5) * 0.2,
        phase: Math.random() * Math.PI * 2
      });
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.45)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(canvas);

    const mat = new THREE.PointsMaterial({
      size: 0.45,
      map: tex,
      transparent: true,
      opacity: 0.40,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.ambientMotes = new THREE.Points(geom, mat);
    this.ambientMotesSpeeds = speeds;
    this.scene.add(this.ambientMotes);
  }

  triggerDynamicClearFlash(pos, colorDef) {
    if (!this.dynamicFlashLight) return;
    this.dynamicFlashLight.color.setHex(colorDef.hex);
    this.dynamicFlashLight.position.set(pos.x, 3.2, pos.z);
    this.dynamicFlashLight.intensity = 2.8;

    const startTime = performance.now();
    const duration = 260;
    const animateFlash = () => {
      const elapsed = performance.now() - startTime;
      const t = elapsed / duration;
      if (t < 1) {
        this.dynamicFlashLight.intensity = (1 - t) * 2.8;
        requestAnimationFrame(animateFlash);
      } else {
        this.dynamicFlashLight.intensity = 0;
      }
    };
    requestAnimationFrame(animateFlash);
  }

  vibrate(pattern = 15) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {}
    }
  }

  startNewGame() {
    this.score = 0;
    this.highScore = this.leaderboard.getHighScore();
    this.level = 1;
    this.totalClears = 0;
    this.maxCombo = 1;
    this.currentCombo = 1;
    this.gameTimeSeconds = 0;
    this.isGameOver = false;
    this.isProcessingMerge = false;
    this.draggedDeckItem = null;
    this.selectedDeckSlot = null;
    this.hoveredSlot = null;

    if (this.animation) this.animation.clear();
    this.updateLevelBackground(1, false);

    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (!this.isGameOver) {
        this.gameTimeSeconds++;
        this.updateHUD();
      }
    }, 1000);

    // Clear board cards & badges
    for (const slot of this.hexGrid.getAllSlots()) {
      for (const card of slot.stack) {
        if (card.mesh) {
          this.scene.remove(card.mesh);
          if (card.mesh.geometry) card.mesh.geometry.dispose();
        }
      }
      slot.stack = [];
      if (slot.highlightMesh) slot.highlightMesh.visible = false;
      this.updateSlotBadge(slot);
    }

    // Clear deck stacks
    for (const deckSlot of this.deckSlots) {
      if (deckSlot.group) {
        this.scene.remove(deckSlot.group);
      }
      deckSlot.cards = [];
      deckSlot.group = null;
    }

    this.updateHUD();
    this.spawnDeckStacks({ animate: true });
  }

  getLevelForScore(score) {
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (score >= LEVEL_THRESHOLDS[i]) {
        return i + 1;
      }
    }
    return 1;
  }

  /**
   * Smoothly transitions the game background according to current level & theme mode
   * @param {number} level Target level
   * @param {boolean} smooth True to crossfade, false for immediate switch
   */
  updateLevelBackground(level = this.level, smooth = true) {
    const list = LEVEL_BACKGROUNDS[this.currentTheme] || LEVEL_BACKGROUNDS.light;
    const bgDef = list[(level - 1) % list.length];
    if (!bgDef) return;

    const baseEl = document.getElementById('game-bg-base');
    const overlayEl = document.getElementById('game-bg-overlay');
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');

    if (metaThemeColor && bgDef.metaTheme) {
      metaThemeColor.setAttribute('content', bgDef.metaTheme);
    }

    // Update CSS custom property and body background directly
    document.documentElement.style.setProperty('--bg-gradient', bgDef.gradient);
    document.body.style.setProperty('--bg-gradient', bgDef.gradient);

    // Harmonize 3D lights and motes with level atmosphere
    if (this.bounceLight && bgDef.bounceLight) {
      this.bounceLight.color.setHex(bgDef.bounceLight);
    }
    if (this.fillLight && bgDef.fillLight) {
      this.fillLight.color.setHex(bgDef.fillLight);
    }
    if (this.ambientMotes && this.ambientMotes.material && bgDef.bounceLight) {
      this.ambientMotes.material.color.setHex(bgDef.bounceLight);
    }

    if (baseEl) {
      if (smooth && overlayEl) {
        overlayEl.style.background = bgDef.gradient;
        overlayEl.classList.add('fade-in');

        clearTimeout(this._bgFadeTimeout);
        this._bgFadeTimeout = setTimeout(() => {
          baseEl.style.background = bgDef.gradient;
          document.body.style.background = bgDef.gradient;
          overlayEl.classList.remove('fade-in');
        }, 850);
      } else {
        baseEl.style.background = bgDef.gradient;
        document.body.style.background = bgDef.gradient;
        if (overlayEl) {
          overlayEl.classList.remove('fade-in');
        }
      }
    }
  }

  /**
   * Triggers the level-up celebration, background change, fanfare and visual popups
   */
  triggerLevelUp(oldLevel, newLevel) {
    this.sound.playLevelUp();
    this.vibrate([25, 60, 45]);
    this.updateLevelBackground(newLevel, true);

    // Celebratory confetti shower
    confetti({
      particleCount: 70,
      spread: 90,
      origin: { y: 0.25 },
      colors: ['#f59e0b', '#00f0ff', '#22c55e', '#ec4899', '#fef08a', '#ffffff']
    });

    // Level-up banner announcement with hierarchical layout
    const banner = document.getElementById('level-up-banner');
    const titleEl = document.getElementById('level-up-title');
    const themeEl = document.getElementById('level-up-theme');
    if (banner) {
      const list = LEVEL_BACKGROUNDS[this.currentTheme] || LEVEL_BACKGROUNDS.light;
      const bgDef = list[(newLevel - 1) % list.length];
      if (titleEl) titleEl.textContent = `NÍVEL ${newLevel}`;
      if (themeEl) themeEl.textContent = bgDef.name;

      banner.classList.remove('hidden');

      clearTimeout(this._levelBannerTimeout);
      this._levelBannerTimeout = setTimeout(() => {
        banner.classList.add('hidden');
      }, 2600);
    }

    // Glow & pulse level capsule in HUD (without resizing or shifting the layout)
    const levelCard = document.getElementById('level-card');
    if (levelCard) {
      levelCard.classList.remove('level-up-shine');
      void levelCard.offsetWidth;
      levelCard.classList.add('level-up-shine');
      setTimeout(() => levelCard.classList.remove('level-up-shine'), 1400);
    }
  }

  getDifficultySettings() {
    this.level = this.getLevelForScore(this.score);

    let activeColorsCount = Math.min(8, 2 + this.level);
    let minStackHeight = this.level >= 4 ? 4 : 3;
    let maxStackHeight = Math.min(8, 4 + Math.floor(this.level / 2));
    let maxColorLayers = Math.min(4, Math.floor(this.level / 2) + 1);

    const availableColors = PALETTE.slice(0, activeColorsCount);
    return { availableColors, minStackHeight, maxStackHeight, maxColorLayers };
  }

  /**
   * Spawns new stacks in empty deck slots with optional arrival animation
   */
  async spawnDeckStacks({ animate = false } = {}) {
    const { availableColors, minStackHeight, maxStackHeight, maxColorLayers } = this.getDifficultySettings();
    const animPromises = [];

    for (let i = 0; i < this.deckSlots.length; i++) {
      const deckSlot = this.deckSlots[i];
      if (deckSlot.cards.length > 0) continue;

      const stackGroup = new THREE.Group();
      stackGroup.position.copy(deckSlot.pos);
      this.scene.add(stackGroup);
      deckSlot.group = stackGroup;

      const totalCards = Math.floor(Math.random() * (maxStackHeight - minStackHeight + 1)) + minStackHeight;
      const numLayers = Math.min(maxColorLayers, Math.floor(Math.random() * maxColorLayers) + 1);

      const shuffledColors = [...availableColors].sort(() => 0.5 - Math.random());
      const layerColors = shuffledColors.slice(0, numLayers);
      const layerCounts = this.distributeCards(totalCards, numLayers);

      deckSlot.cards = [];
      let currentY = 0;

      for (let l = 0; l < numLayers; l++) {
        const color = layerColors[l];
        const count = layerCounts[l];
        for (let c = 0; c < count; c++) {
          const cardMesh = this.tileFactory.createCard(color);
          cardMesh.position.set(0, currentY + CARD_THICKNESS / 2, 0);
          stackGroup.add(cardMesh);

          deckSlot.cards.push({
            color: color,
            mesh: cardMesh
          });

          currentY += CARD_THICKNESS;
        }
      }

      if (animate && this.animation) {
        const slotIdx = i;
        const p = this.animation.animateDeckArrival(stackGroup, deckSlot.pos, slotIdx * 85, () => {
          this.sound.playDeckDeal(slotIdx);
          this.vibrate(10);
          const topCard = deckSlot.cards[deckSlot.cards.length - 1];
          if (topCard && this.animation) {
            this.animation.spawnArrivalRing(deckSlot.pos, topCard.color);
          }
        });
        animPromises.push(p);
      }
    }

    if (animPromises.length > 0) {
      await Promise.all(animPromises);
    }
  }

  distributeCards(total, parts) {
    if (parts === 1) return [total];
    let remaining = total;
    const result = [];
    for (let i = 0; i < parts - 1; i++) {
      const count = Math.max(1, Math.floor(Math.random() * (remaining - (parts - 1 - i))) + 1);
      result.push(count);
      remaining -= count;
    }
    result.push(Math.max(1, remaining));
    return result;
  }

  /* =========================================================================
   * INPUT, TAP-TO-PLACE & DRAG-AND-DROP
   * ========================================================================= */

  initEventListeners() {
    const dom = this.container;

    this.resizeObserver = new ResizeObserver(() => {
      const width = this.container.clientWidth || window.innerWidth;
      const height = this.container.clientHeight || window.innerHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.adjustCameraForScreen(width, height);
      this.updateDeckPositions();
      this.renderer.setSize(width, height);
    });
    this.resizeObserver.observe(this.container);

    dom.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    window.addEventListener('pointermove', (e) => this.onPointerMove(e));
    window.addEventListener('pointerup', (e) => this.onPointerUp(e));
    window.addEventListener('pointercancel', (e) => this.onPointerUp(e));
  }

  getPointerIntersection(event) {
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const targetPoint = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.groundPlane, targetPoint);
    return targetPoint;
  }

  onPointerDown(e) {
    if (this.isGameOver || this.isProcessingMerge) return;

    this.sound.resume();
    const hitPoint = this.getPointerIntersection(e);
    if (!hitPoint) return;

    this.dragStartPos = hitPoint.clone();
    this.hasMovedDistance = false;

    // 1. Check if clicking a deck stack
    for (const deckSlot of this.deckSlots) {
      if (deckSlot.cards.length === 0 || !deckSlot.group) continue;

      const dist = hitPoint.distanceTo(deckSlot.pos);
      if (dist < HEX_RADIUS * 1.5) {
        if (this.selectedDeckSlot && this.selectedDeckSlot !== deckSlot && this.selectedDeckSlot.group) {
          this.selectedDeckSlot.group.position.y = 0;
        }

        this.draggedDeckItem = deckSlot;
        this.draggedStackGroup = deckSlot.group;
        this.draggedStackGroup.position.y = 1.6;
        this.container.style.cursor = 'grabbing';
        this.sound.playPick();
        return;
      }
    }

    // 2. Tap-to-select support
    if (this.selectedDeckSlot && this.selectedDeckSlot.group) {
      const nearestSlot = this.findNearestSlot(hitPoint);
      if (nearestSlot && nearestSlot.stack.length === 0) {
        const deckSlot = this.selectedDeckSlot;
        this.selectedDeckSlot = null;
        this.placeStackOnSlot(deckSlot, nearestSlot);
        return;
      } else {
        this.selectedDeckSlot.group.position.y = 0;
        this.selectedDeckSlot = null;
      }
    }
  }

  onPointerMove(e) {
    const hitPoint = this.getPointerIntersection(e);
    if (!hitPoint) return;

    if (!this.draggedDeckItem || !this.draggedStackGroup) {
      // Hover cursor state for desktop
      let isOverPickable = false;
      for (const deckSlot of this.deckSlots) {
        if (deckSlot.cards.length > 0 && hitPoint.distanceTo(deckSlot.pos) < HEX_RADIUS * 1.3) {
          isOverPickable = true;
          break;
        }
      }
      this.container.style.cursor = isOverPickable ? 'grab' : 'default';
      return;
    }

    if (this.dragStartPos && hitPoint.distanceTo(this.dragStartPos) > 0.3) {
      this.hasMovedDistance = true;
    }

    // Follow pointer along X/Z with a slight forward offset for finger/cursor visibility
    this.draggedStackGroup.position.x = hitPoint.x;
    this.draggedStackGroup.position.y = 2.0; // Higher lift for clear view
    this.draggedStackGroup.position.z = hitPoint.z - 0.25;

    const nearestSlot = this.findNearestSlot(hitPoint);

    if (this.hoveredSlot && this.hoveredSlot !== nearestSlot) {
      if (this.hoveredSlot.highlightMesh) this.hoveredSlot.highlightMesh.visible = false;
    }

    if (nearestSlot && nearestSlot.stack.length === 0) {
      this.hoveredSlot = nearestSlot;
      if (nearestSlot.highlightMesh) nearestSlot.highlightMesh.visible = true;
    } else {
      this.hoveredSlot = null;
    }
  }

  onPointerUp(e) {
    if (!this.draggedDeckItem || !this.draggedStackGroup) return;

    const deckSlot = this.draggedDeckItem;
    const stackGroup = this.draggedStackGroup;
    const targetSlot = this.hoveredSlot;

    if (this.hoveredSlot && this.hoveredSlot.highlightMesh) {
      this.hoveredSlot.highlightMesh.visible = false;
    }
    this.hoveredSlot = null;
    this.draggedDeckItem = null;
    this.draggedStackGroup = null;

    if (targetSlot && targetSlot.stack.length === 0) {
      this.selectedDeckSlot = null;
      this.placeStackOnSlot(deckSlot, targetSlot);
    } else if (!this.hasMovedDistance) {
      this.selectedDeckSlot = deckSlot;
      stackGroup.position.copy(deckSlot.pos);
      stackGroup.position.y = 0.8;
    } else {
      this.selectedDeckSlot = null;
      this.animation.animateReturn(stackGroup, deckSlot.pos);
    }
  }

  findNearestSlot(worldPos) {
    let closest = null;
    // Generous snapping radius so back slots snap easily
    let minDist = HEX_RADIUS * 1.65;

    for (const slot of this.hexGrid.getAllSlots()) {
      const slotPos = new THREE.Vector3(slot.worldX, 0, slot.worldZ);
      const dist = worldPos.distanceTo(slotPos);
      if (dist < minDist) {
        minDist = dist;
        closest = slot;
      }
    }
    return closest;
  }

  /* =========================================================================
   * CORE MERGING, MAGNET ATTRACTION & FULL COLOR POP
   * ========================================================================= */

  async placeStackOnSlot(deckSlot, targetSlot) {
    this.isProcessingMerge = true;
    this.sound.playSnap();
    this.vibrate(18);

    // 1. Transfer cards from deck to target slot
    const cards = [...deckSlot.cards];
    deckSlot.cards = [];
    this.scene.remove(deckSlot.group);
    deckSlot.group = null;

    let currentY = 0;
    for (const card of cards) {
      this.scene.add(card.mesh);
      card.mesh.position.set(
        targetSlot.worldX,
        currentY + CARD_THICKNESS / 2,
        targetSlot.worldZ
      );
      targetSlot.stack.push(card);
      currentY += CARD_THICKNESS;
    }

    this.updateSlotBadge(targetSlot);

    // 2. Run recursive cascade merge with targetSlot as the primary magnet!
    await this.processCascadingMerges(targetSlot);

    // 3. Replenish deck if all slots empty with arrival animation
    const remainingDeck = this.deckSlots.filter(s => s.cards.length > 0);
    if (remainingDeck.length === 0) {
      await new Promise(r => setTimeout(r, 120));
      await this.spawnDeckStacks({ animate: true });
    }

    // 4. Check for Game Over condition
    this.checkGameOverCondition();

    this.isProcessingMerge = false;
  }

  /**
   * Finds all connected components of slots sharing the same top card color.
   */
  findColorComponents() {
    const visited = new Set();
    const components = [];

    for (const slot of this.hexGrid.getOccupiedSlots()) {
      if (slot.stack.length === 0 || visited.has(slot.id)) continue;

      const topColorId = slot.stack[slot.stack.length - 1].color.id;
      const component = [];
      const queue = [slot];
      visited.add(slot.id);

      while (queue.length > 0) {
        const curr = queue.shift();
        component.push(curr);

        const neighbors = this.hexGrid.getNeighbors(curr);
        for (const n of neighbors) {
          if (
            n.stack.length > 0 &&
            !visited.has(n.id) &&
            n.stack[n.stack.length - 1].color.id === topColorId
          ) {
            visited.add(n.id);
            queue.push(n);
          }
        }
      }

      if (component.length > 1) {
        components.push({
          colorId: topColorId,
          slots: component
        });
      }
    }

    return components;
  }

  /**
   * Selects the best target destination slot within a connected color component.
   * 1. If the player placed a slot (primaryMagnetSlot) and it is in this component,
   *    it ALWAYS acts as the primary magnet pulling from ALL connected neighbors on all sides!
   * 2. Otherwise, the slot with the most matching top cards (or purer/tallest) receives the cards.
   */
  pickBestTargetInComponent(componentSlots, colorId, primaryMagnetSlot) {
    if (primaryMagnetSlot && componentSlots.includes(primaryMagnetSlot)) {
      return primaryMagnetSlot;
    }

    let bestSlot = componentSlots[0];
    let bestScore = -1;

    for (const slot of componentSlots) {
      const matchingCount = this.countTopContiguousCards(slot, colorId);
      const uniqueColorsCount = new Set(slot.stack.map(c => c.color.id)).size;
      // High score: more matching cards (x 1000) + purity bonus (x 100) + total stack (x 1)
      const score = matchingCount * 1000 + (10 - uniqueColorsCount) * 100 + slot.stack.length;
      if (score > bestScore) {
        bestScore = score;
        bestSlot = slot;
      }
    }

    return bestSlot;
  }

  /**
   * Cascade merge loop:
   * - Finds ALL connected matching groups of identical top colors.
   * - Newly placed block in the middle pulls from ALL neighbors on all sides (left, right, etc.)!
   * - Accumulates the maximum amount of cards to trigger 10+ color pops and escalating score bonuses.
   */
  async processCascadingMerges(primaryMagnetSlot) {
    let cascadeStep = 0;
    let keepCascading = true;
    this.currentCombo = 1;

    while (keepCascading) {
      keepCascading = false;
      const components = this.findColorComponents();

      if (components.length === 0) break;

      // Prioritize the component containing the newly placed primaryMagnetSlot first
      if (primaryMagnetSlot) {
        components.sort((a, b) => {
          const aHasPrimary = a.slots.includes(primaryMagnetSlot) ? 1 : 0;
          const bHasPrimary = b.slots.includes(primaryMagnetSlot) ? 1 : 0;
          return bHasPrimary - aHasPrimary;
        });
      }

      const activeComponent = components[0];
      const targetSlot = this.pickBestTargetInComponent(
        activeComponent.slots,
        activeComponent.colorId,
        primaryMagnetSlot
      );

      // All OTHER slots in this connected component transfer into targetSlot
      const sourcesToPull = activeComponent.slots.filter(s => s !== targetSlot);

      // Sort sources by distance to targetSlot so nearest neighbors jump in first
      sourcesToPull.sort((a, b) => {
        const distA = Math.hypot(a.worldX - targetSlot.worldX, a.worldZ - targetSlot.worldZ);
        const distB = Math.hypot(b.worldX - targetSlot.worldX, b.worldZ - targetSlot.worldZ);
        return distA - distB;
      });

      let transferredAny = false;
      for (const source of sourcesToPull) {
        if (
          source.stack.length > 0 &&
          source.stack[source.stack.length - 1].color.id === activeComponent.colorId
        ) {
          await this.transferMatchingCards(source, targetSlot, activeComponent.colorId, cascadeStep);
          cascadeStep++;
          transferredAny = true;
        }
      }

      if (transferredAny) {
        await this.checkAndClearFullStack(targetSlot);
        keepCascading = true;
      }
    }
  }

  countTopContiguousCards(slot, colorId) {
    let count = 0;
    for (let i = slot.stack.length - 1; i >= 0; i--) {
      if (slot.stack[i].color.id === colorId) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }

  /**
   * Transfer contiguous top cards of matching color from source into target
   */
  async transferMatchingCards(source, target, colorId, cascadeStep) {
    const cardsToMove = [];

    while (source.stack.length > 0) {
      const top = source.stack[source.stack.length - 1];
      if (top.color.id === colorId) {
        cardsToMove.push(source.stack.pop());
      } else {
        break;
      }
    }

    if (cardsToMove.length === 0) return;

    this.updateSlotBadge(source);
    this.sound.playCardSlide(cascadeStep);

    const jumpPromises = [];
    let currentTargetHeight = target.stack.length * CARD_THICKNESS;

    for (let i = 0; i < cardsToMove.length; i++) {
      const card = cardsToMove[i];
      const startPos = card.mesh.position.clone();
      const endPos = new THREE.Vector3(
        target.worldX,
        currentTargetHeight + CARD_THICKNESS / 2,
        target.worldZ
      );

      target.stack.push(card);
      currentTargetHeight += CARD_THICKNESS;

      const jumpPromise = new Promise(resolve => {
        setTimeout(async () => {
          await this.animation.animateCardJump(card.mesh, startPos, endPos, 360, 1.8);
          this.animation.animateSquash(card.mesh);
          resolve();
        }, i * 70);
      });

      jumpPromises.push(jumpPromise);
    }

    await Promise.all(jumpPromises);
    this.updateSlotBadge(target);

    // Score for moved cards
    const pointsGained = cardsToMove.length * 15 * this.currentCombo;
    this.addScore(pointsGained);
  }

  /**
   * Checks if a stack has reached STACK_CLEAR_THRESHOLD (10 cards).
   * IMPORTANT: Clears ALL contiguous cards of that matching color in the stack!
   */
  async checkAndClearFullStack(slot) {
    if (slot.stack.length < STACK_CLEAR_THRESHOLD) {
      this.updateSlotBadge(slot);
      return;
    }

    const topColorId = slot.stack[slot.stack.length - 1].color.id;
    let contiguousCount = 0;

    for (let i = slot.stack.length - 1; i >= 0; i--) {
      if (slot.stack[i].color.id === topColorId) {
        contiguousCount++;
      } else {
        break;
      }
    }

    if (contiguousCount >= STACK_CLEAR_THRESHOLD) {
      // POP ALL contiguous cards of that matching color!
      const clearedCards = [];
      for (let i = 0; i < contiguousCount; i++) {
        clearedCards.push(slot.stack.pop());
      }

      this.updateSlotBadge(slot);

      const colorDef = clearedCards[0].color;
      const centerPos = new THREE.Vector3(
        slot.worldX,
        slot.stack.length * CARD_THICKNESS + 0.4,
        slot.worldZ
      );

      this.sound.playStackClear(this.currentCombo);
      this.vibrate([25, 40, 60]);
      this.totalClears++;

      // Award points: Base clear points + cumulative escalating bonus for every extra card above 10!
      const extraCards = Math.max(0, clearedCards.length - STACK_CLEAR_THRESHOLD);
      let cumulativeBonus = 0;
      for (let k = 1; k <= extraCards; k++) {
        cumulativeBonus += k * 200; // Escalating: +200 (11th), +400 (12th), +600 (13th), +800 (14th), etc.
      }

      const baseClearScore = clearedCards.length * 35 + 500;
      const clearBonus = (baseClearScore + cumulativeBonus) * this.currentCombo;
      this.addScore(clearBonus);

      if (extraCards > 0) {
        this.showScorePopup(`+${clearBonus} (${clearedCards.length} CARTAS BÔNUS! 🔥)`);
      }

      if (this.currentCombo > 1) {
        this.showComboBanner(this.currentCombo);
        this.maxCombo = Math.max(this.maxCombo, this.currentCombo);
      }
      this.currentCombo++;

      this.triggerDynamicClearFlash(centerPos, colorDef);
      await this.animation.animateStackClear(
        clearedCards.map(c => c.mesh),
        centerPos,
        colorDef
      );

      this.updateSlotBadge(slot);
    }
  }

  /**
   * Updates the 3D count badge hovering above a board slot
   */
  updateSlotBadge(slot) {
    const badge = this.slotBadges.get(slot.id);
    if (!badge) return;

    const isDark = this.currentTheme === 'dark';

    if (slot.stack.length === 0) {
      badge.userData.updateCount(0, STACK_CLEAR_THRESHOLD, '#ffffff', isDark);
      badge.visible = false;
      return;
    }

    const topCard = slot.stack[slot.stack.length - 1];
    const contiguousCount = this.countTopContiguousCards(slot, topCard.color.id);

    // Update position based on stack height
    const heightY = slot.stack.length * CARD_THICKNESS + 0.75;
    badge.position.set(slot.worldX, heightY, slot.worldZ);

    badge.userData.updateCount(contiguousCount, STACK_CLEAR_THRESHOLD, topCard.color.css, isDark);
  }

  /**
   * Switches the 3D scene between Light mode and Dark Neon mode
   */
  setTheme(theme) {
    this.currentTheme = theme;
    const isDark = theme === 'dark';

    // 1. Sync TileFactory materials & palettes
    if (this.tileFactory) {
      this.tileFactory.setTheme(theme);
    }

    // 2. Synchronize current level background to match new theme
    this.updateLevelBackground(this.level, true);

    // 3. Adjust Studio Lighting Rig for dark/neon atmosphere
    if (this.ambientLight) {
      this.ambientLight.color.setHex(isDark ? 0x99aaff : 0xffffff);
      this.ambientLight.intensity = isDark ? 0.70 : 1.05;
    }
    if (this.dirLight) {
      this.dirLight.color.setHex(0xffffff);
      this.dirLight.intensity = isDark ? 1.85 : 1.55;
    }
    if (this.fillLight) {
      this.fillLight.color.setHex(isDark ? 0x00f0ff : 0xe2e8f0);
      this.fillLight.intensity = isDark ? 0.50 : 0.60;
    }
    if (this.bounceLight) {
      this.bounceLight.color.setHex(isDark ? 0xb026ff : 0xfff7ed);
      this.bounceLight.intensity = isDark ? 0.65 : 0.35;
    }
    if (this.floorShadowMat) {
      this.floorShadowMat.opacity = isDark ? 0.38 : 0.18;
    }
    if (this.ambientMotes && this.ambientMotes.material) {
      this.ambientMotes.material.color.setHex(isDark ? 0x00f0ff : 0xffffff);
      this.ambientMotes.material.opacity = isDark ? 0.65 : 0.40;
    }

    // 4. Re-render all slot stack badges with new theme styling
    if (this.hexGrid) {
      for (const slot of this.hexGrid.getAllSlots()) {
        if (slot.stack.length > 0) {
          this.updateSlotBadge(slot);
        }
      }
    }

    // 5. Ensure all existing cards on the board and in deck have canonical opaque materials
    if (this.hexGrid) {
      for (const slot of this.hexGrid.getAllSlots()) {
        for (const card of slot.stack) {
          if (card.mesh && card.color) {
            card.mesh.material = this.tileFactory.getCardMaterial(card.color);
          }
        }
      }
    }
    if (this.deckSlots) {
      for (const deckSlot of this.deckSlots) {
        for (const card of deckSlot.cards) {
          if (card.mesh && card.color) {
            card.mesh.material = this.tileFactory.getCardMaterial(card.color);
          }
        }
      }
    }
  }

  /* =========================================================================
   * SCORE, HUD & GAME OVER
   * ========================================================================= */

  addScore(points) {
    this.score += points;
    if (this.score > this.highScore) {
      this.highScore = this.score;
    }

    this.showScorePopup(`+${points}`);

    // Check Level Progression
    const newLevel = this.getLevelForScore(this.score);
    if (newLevel > this.level) {
      const oldLevel = this.level;
      this.level = newLevel;
      this.triggerLevelUp(oldLevel, newLevel);
    }

    this.updateHUD();

    const scoreVal = document.getElementById('score-val');
    if (scoreVal) {
      scoreVal.classList.remove('bump');
      void scoreVal.offsetWidth;
      scoreVal.classList.add('bump');
      setTimeout(() => scoreVal.classList.remove('bump'), 400);
    }
  }

  updateHUD() {
    const scoreVal = document.getElementById('score-val');
    const highscoreVal = document.getElementById('highscore-val');
    const timerVal = document.getElementById('timer-val');
    const levelVal = document.getElementById('level-val');
    const levelBar = document.getElementById('level-progress-bar');
    const shopCoins = document.getElementById('shop-coins-display');

    if (scoreVal) scoreVal.textContent = this.score.toLocaleString('pt-BR');
    if (shopCoins) shopCoins.textContent = this.score.toLocaleString('pt-BR');
    if (highscoreVal) highscoreVal.textContent = this.highScore.toLocaleString('pt-BR');
    if (timerVal) timerVal.textContent = LeaderboardManager.formatTime(this.gameTimeSeconds);
    if (levelVal) levelVal.textContent = this.level;

    if (levelBar) {
      const curIdx = Math.min(this.level - 1, LEVEL_THRESHOLDS.length - 1);
      const nextIdx = Math.min(this.level, LEVEL_THRESHOLDS.length - 1);
      const curThreshold = LEVEL_THRESHOLDS[curIdx];
      const nextThreshold = (nextIdx > curIdx) ? LEVEL_THRESHOLDS[nextIdx] : (curThreshold + 10000);
      const diff = Math.max(1, nextThreshold - curThreshold);
      const progress = Math.min(100, Math.max(8, Math.round(((this.score - curThreshold) / diff) * 100)));
      levelBar.style.width = `${progress}%`;
    }
  }

  showScorePopup(text) {
    const container = document.getElementById('score-popup-container');
    if (!container) return;

    const popup = document.createElement('div');
    popup.className = 'score-popup';
    popup.textContent = text;
    container.appendChild(popup);

    setTimeout(() => {
      if (popup.parentElement) popup.parentElement.removeChild(popup);
    }, 1800);
  }

  showComboBanner(combo) {
    const banner = document.getElementById('combo-banner');
    const text = document.getElementById('combo-text');
    if (!banner || !text) return;

    text.textContent = `COMBO x${combo}!`;
    banner.classList.remove('hidden');

    clearTimeout(this.comboTimeout);
    this.comboTimeout = setTimeout(() => {
      banner.classList.add('hidden');
    }, 2200);
  }

  checkGameOverCondition() {
    const emptySlots = this.hexGrid.getEmptySlots();
    const availableDeckStacks = this.deckSlots.filter(s => s.cards.length > 0);

    if (emptySlots.length === 0 && availableDeckStacks.length > 0) {
      this.triggerGameOver();
    }
  }

  async triggerGameOver() {
    this.isGameOver = true;
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.sound.playGameOver();

    const isNewRecord = this.score >= this.highScore && this.score > 0;
    const savedNickname = (this.leaderboard.getSavedNickname() || '').trim();
    const hasNickname = Boolean(savedNickname);

    // Salvar pontuação automaticamente APENAS se o jogador já tiver um apelido salvo
    if (hasNickname && this.score > 0) {
      try {
        await this.leaderboard.submitScore({
          name: savedNickname,
          score: this.score,
          time: this.gameTimeSeconds,
          clears: this.totalClears,
          combo: this.maxCombo
        });
      } catch (e) {
        console.error('Erro ao auto-submeter pontuação:', e);
      }
    }

    const modal = document.getElementById('modal-gameover');
    if (modal) {
      document.getElementById('go-final-score').textContent = this.score.toLocaleString('pt-BR');
      document.getElementById('go-final-time').textContent = LeaderboardManager.formatTime(this.gameTimeSeconds);
      document.getElementById('go-final-clears').textContent = this.totalClears;
      document.getElementById('go-final-combo').textContent = `x${this.maxCombo}`;

      const recordNotice = document.getElementById('record-notice');
      if (recordNotice) {
        if (isNewRecord) recordNotice.classList.remove('hidden');
        else recordNotice.classList.add('hidden');
      }

      const nicknameDisplay = document.getElementById('go-nickname-display');
      if (nicknameDisplay) {
        nicknameDisplay.textContent = savedNickname || 'Jogador';
      }

      const nameInput = document.getElementById('player-nickname');
      if (nameInput) {
        nameInput.value = savedNickname;
      }

      const autoBadge = document.getElementById('auto-submit-badge');
      const manualRow = document.getElementById('manual-nickname-row');
      const cancelBtn = document.getElementById('btn-cancel-edit-go');
      const statusEl = document.getElementById('submit-status');

      if (hasNickname) {
        // Já possui apelido: exibe confirmação e oculta o campo manual de salvar
        if (autoBadge) autoBadge.classList.remove('hidden');
        if (manualRow) manualRow.classList.add('hidden');
        if (cancelBtn) cancelBtn.classList.remove('hidden');
        if (statusEl) {
          statusEl.textContent = this.score > 0 ? 'Pontuação sincronizada no Ranking Global!' : '';
          statusEl.className = 'submit-status success';
        }
      } else {
        // NÃO possui apelido: oculta o selo e exibe o campo para digitar e salvar
        if (autoBadge) autoBadge.classList.add('hidden');
        if (manualRow) manualRow.classList.remove('hidden');
        if (cancelBtn) cancelBtn.classList.add('hidden');
        if (statusEl) {
          statusEl.textContent = 'Digite seu apelido para registrar no Ranking!';
          statusEl.className = 'submit-status';
        }
      }

      modal.classList.remove('hidden');
    }
  }

  /* =========================================================================
   * POWER-UPS (REROLL & LIGHTNING STRIKE)
   * ========================================================================= */

  /**
   * Power-up: Atualizar Deque (Re-roll)
   * Descarta as pilhas existentes nos 3 slots do deque e gera 3 novas pilhas cheias.
   */
  async rerollDeck() {
    this.sound.playShuffle();
    this.vibrate(20);

    // 1. Limpar pilhas atuais do deque com efeito de encolhimento
    for (const deckSlot of this.deckSlots) {
      if (deckSlot.group) {
        const group = deckSlot.group;
        deckSlot.group = null;
        deckSlot.cards = [];

        let progress = 0;
        const startScale = group.scale.x;
        const shrinkInterval = setInterval(() => {
          progress += 0.2;
          if (progress >= 1) {
            clearInterval(shrinkInterval);
            this.scene.remove(group);
            group.traverse(child => {
              if (child.geometry) child.geometry.dispose();
            });
          } else {
            const sc = Math.max(0, startScale * (1 - progress));
            group.scale.set(sc, sc, sc);
          }
        }, 16);
      } else {
        deckSlot.cards = [];
      }
    }

    // 2. Spawnar 3 novas pilhas com animação de chegada
    await new Promise(r => setTimeout(r, 120));
    await this.spawnDeckStacks({ animate: true });

    // 3. Se estava em Game Over e agora há possibilidades, revive
    if (this.isGameOver) {
      const emptySlots = this.hexGrid.getEmptySlots();
      if (emptySlots.length > 0) {
        this.reviveGame();
      }
    }

    return true;
  }

  /**
   * Power-up: Raio Destruidor (Lightning Strike)
   * Elimina até 3 pilhas inteiras ocupadas do tabuleiro, liberando os espaços.
   */
  async lightningStrike() {
    const occupiedSlots = this.hexGrid.getAllSlots().filter(s => s.stack.length > 0);
    if (occupiedSlots.length === 0) {
      return { success: false, reason: 'Nenhuma pilha no tabuleiro para eliminar.' };
    }

    // Selecionar aleatoriamente até 3 pilhas distintas
    const shuffled = [...occupiedSlots].sort(() => 0.5 - Math.random());
    const targetSlots = shuffled.slice(0, 3);

    this.sound.playThunder();
    this.vibrate(40);

    // Efeito de confetes elétricos
    confetti({
      particleCount: 45,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#00f0ff', '#38bdf8', '#fbbf24', '#ffffff', '#e0e7ff']
    });

    for (let i = 0; i < targetSlots.length; i++) {
      const slot = targetSlots[i];
      const posX = slot.worldX;
      const posZ = slot.worldZ;

      // Disparar efeito visual do Raio em 3D
      this.spawnLightningBolt(posX, posZ, i * 60);

      // Vaporizar e remover cartas do slot
      for (const card of slot.stack) {
        if (card.mesh) {
          const mesh = card.mesh;
          let scale = 1;
          const vaporize = setInterval(() => {
            scale -= 0.15;
            if (scale <= 0) {
              clearInterval(vaporize);
              this.scene.remove(mesh);
              if (mesh.geometry) mesh.geometry.dispose();
            } else {
              mesh.scale.set(scale, scale * 1.5, scale);
              mesh.position.y += 0.08;
            }
          }, 16);
        }
      }

      slot.stack = [];
      if (slot.highlightMesh) slot.highlightMesh.visible = false;
      this.updateSlotBadge(slot);

      // Anel de impacto elétrico
      if (this.animation) {
        this.animation.spawnArrivalRing(new THREE.Vector3(posX, 0.1, posZ), { hex: 0x00f0ff });
      }
    }

    this.totalClears += targetSlots.length;
    this.addScore(targetSlots.length * 150);

    // Se estava em Game Over, revive o jogo!
    if (this.isGameOver) {
      this.reviveGame();
    }

    return { success: true, count: targetSlots.length };
  }

  /**
   * Renderiza malha 3D de raio elétrico caindo do céu no ponto de impacto
   */
  spawnLightningBolt(targetX, targetZ, delayMs = 0) {
    setTimeout(() => {
      const points = [];
      const startY = 16.0;
      const endY = 0.4;
      const steps = 6;

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const currentY = startY * (1 - t) + endY * t;
        const jitterX = (Math.random() - 0.5) * (t < 0.9 ? 1.4 : 0.2);
        const jitterZ = (Math.random() - 0.5) * (t < 0.9 ? 1.4 : 0.2);
        points.push(new THREE.Vector3(targetX + jitterX, currentY, targetZ + jitterZ));
      }

      const curve = new THREE.CatmullRomCurve3(points);
      const boltGeo = new THREE.TubeGeometry(curve, 18, 0.12, 6, false);
      const boltMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.95
      });
      const boltMesh = new THREE.Mesh(boltGeo, boltMat);
      this.scene.add(boltMesh);

      const flashLight = new THREE.PointLight(0x00f0ff, 8, 14);
      flashLight.position.set(targetX, 2.5, targetZ);
      this.scene.add(flashLight);

      let flickers = 0;
      const flickerInterval = setInterval(() => {
        flickers++;
        boltMesh.visible = !boltMesh.visible;
        flashLight.intensity = boltMesh.visible ? 8 : 1;
        if (flickers > 5) {
          clearInterval(flickerInterval);
          this.scene.remove(boltMesh);
          this.scene.remove(flashLight);
          boltGeo.dispose();
          boltMat.dispose();
        }
      }, 35);
    }, delayMs);
  }

  /**
   * Revive a partida quando um power-up é utilizado na tela de Game Over
   */
  reviveGame() {
    this.isGameOver = false;
    const modal = document.getElementById('modal-gameover');
    if (modal) modal.classList.add('hidden');

    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (!this.isGameOver) {
        this.gameTimeSeconds++;
        this.updateHUD();
      }
    }, 1000);

    this.showScorePopup('PARTIDA SALVA! ⚡');
  }

  /* =========================================================================
   * RENDER LOOP
   * ========================================================================= */

  animate() {
    requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1);

    if (this.animation) {
      this.animation.update(delta);
    }

    const time = this.clock.getElapsedTime();
    for (const deckSlot of this.deckSlots) {
      if (deckSlot.group && deckSlot !== this.draggedDeckItem && deckSlot !== this.selectedDeckSlot) {
        deckSlot.group.position.y = Math.sin(time * 2.2 + deckSlot.index * 1.5) * 0.05;
      }
    }

    if (this.ambientMotes && this.ambientMotesSpeeds) {
      const pos = this.ambientMotes.geometry.attributes.position.array;
      for (let i = 0; i < this.ambientMotesSpeeds.length; i++) {
        const sp = this.ambientMotesSpeeds[i];
        pos[i * 3 + 1] += sp.vy * delta;
        pos[i * 3] += Math.sin(time * 1.5 + sp.phase) * 0.006;
        if (pos[i * 3 + 1] > 14) {
          pos[i * 3 + 1] = 0.5;
          pos[i * 3] = (Math.random() - 0.5) * 28;
          pos[i * 3 + 2] = (Math.random() - 0.5) * 24 - 2;
        }
      }
      this.ambientMotes.geometry.attributes.position.needsUpdate = true;
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}
