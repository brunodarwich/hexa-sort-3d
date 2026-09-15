/**
 * GameManager.js
 * Core engine orchestrating 3D rendering, input handling, magnetic card merges,
 * total color pop clears, real-time stack badges, score, and game state.
 */

import * as THREE from 'three';
import { HexGrid, HEX_RADIUS } from './HexGrid.js';
import { TileFactory, CARD_THICKNESS, PEDESTAL_HEIGHT, PALETTE } from './HexTile.js';
import { AnimationSystem } from './AnimationSystem.js';
import { SoundSystem } from './SoundSystem.js';
import { LeaderboardManager } from './Leaderboard.js';

export const DECK_SLOT_COUNT = 3;
export const STACK_CLEAR_THRESHOLD = 10;

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
    const aspect = width / height;
    if (aspect < 0.55) {
      // Ultra tall phone screens (20:9, 19.5:9, iPhone 14/15/16)
      this.camera.position.set(0, 23.0, 14.0);
      this.camera.lookAt(0, 0.3, 1.2);
    } else if (aspect < 0.8) {
      // Standard mobile portrait (16:9, 18:9)
      this.camera.position.set(0, 21.0, 13.0);
      this.camera.lookAt(0, 0.2, 1.1);
    } else if (aspect < 1.15) {
      // Tablets / iPads / Foldables
      this.camera.position.set(0, 19.0, 11.8);
      this.camera.lookAt(0, 0.0, 1.0);
    } else {
      // Desktop / Laptop / Landscape (16:9, 16:10, ultrawide)
      this.camera.position.set(0, 17.5, 10.8);
      this.camera.lookAt(0, -0.1, 0.9);
    }
  }

  getDeckLayout(width, height) {
    const aspect = width / height;
    const spacing = aspect < 0.65 ? 2.6 : aspect < 0.9 ? 2.9 : 3.2;
    const z = aspect >= 1.15 ? 4.9 : aspect >= 0.8 ? 5.1 : 5.3;
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

    this.spawnDeckStacks();
    this.updateHUD();
  }

  getDifficultySettings() {
    let activeColorsCount = 3;
    let minStackHeight = 3;
    let maxStackHeight = 5;
    let maxColorLayers = 1;

    // Smoother, relaxed pacing for introducing new colors and split layers
    if (this.score >= 1500) {
      this.level = 2;
      activeColorsCount = 4;
      maxColorLayers = 2;
    }
    if (this.score >= 4000) {
      this.level = 3;
      activeColorsCount = 5;
      minStackHeight = 4;
      maxStackHeight = 6;
      maxColorLayers = 2;
    }
    if (this.score >= 8000) {
      this.level = 4;
      activeColorsCount = 6;
      maxColorLayers = 3;
      maxStackHeight = 7;
    }
    if (this.score >= 14000) {
      this.level = 5;
      activeColorsCount = 7;
      minStackHeight = 5;
      maxStackHeight = 8;
      maxColorLayers = 3;
    }
    if (this.score >= 22000) {
      this.level = 6;
      activeColorsCount = 8;
      maxColorLayers = 4;
    }

    const availableColors = PALETTE.slice(0, activeColorsCount);
    return { availableColors, minStackHeight, maxStackHeight, maxColorLayers };
  }

  spawnDeckStacks() {
    const { availableColors, minStackHeight, maxStackHeight, maxColorLayers } = this.getDifficultySettings();

    for (const deckSlot of this.deckSlots) {
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

    window.addEventListener('resize', () => {
      const width = this.container.clientWidth || window.innerWidth;
      const height = this.container.clientHeight || window.innerHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.adjustCameraForScreen(width, height);
      this.updateDeckPositions();
      this.renderer.setSize(width, height);
    });

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

    // 3. Replenish deck if all slots empty
    const remainingDeck = this.deckSlots.filter(s => s.cards.length > 0);
    if (remainingDeck.length === 0) {
      this.spawnDeckStacks();
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

    // 2. Adjust Studio Lighting Rig for dark/neon atmosphere
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

    // 3. Re-render all slot stack badges with new theme styling
    if (this.hexGrid) {
      for (const slot of this.hexGrid.getAllSlots()) {
        if (slot.stack.length > 0) {
          this.updateSlotBadge(slot);
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

    if (scoreVal) scoreVal.textContent = this.score.toLocaleString('pt-BR');
    if (highscoreVal) highscoreVal.textContent = this.highScore.toLocaleString('pt-BR');
    if (timerVal) timerVal.textContent = LeaderboardManager.formatTime(this.gameTimeSeconds);
    if (levelVal) levelVal.textContent = this.level;
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

    text.textContent = `COMBO x${combo}! 🔥`;
    banner.classList.remove('hidden');

    clearTimeout(this.comboTimeout);
    this.comboTimeout = setTimeout(() => {
      banner.classList.add('hidden');
    }, 2500);
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
