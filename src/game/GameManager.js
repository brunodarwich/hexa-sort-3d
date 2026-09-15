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

    // 3. Renderer with mobile battery & performance clamp
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      precision: 'mediump'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    // 4. Studio Lighting & Shadows
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.15);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.55);
    dirLight.position.set(12, 28, 14);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 60;
    dirLight.shadow.camera.left = -12;
    dirLight.shadow.camera.right = 12;
    dirLight.shadow.camera.top = 12;
    dirLight.shadow.camera.bottom = -12;
    dirLight.shadow.bias = -0.0003;
    dirLight.shadow.radius = 2.0;
    this.scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xe2e8f0, 0.65);
    fillLight.position.set(-12, 20, -10);
    this.scene.add(fillLight);

    const bounceLight = new THREE.PointLight(0xfff7ed, 0.35, 25);
    bounceLight.position.set(0, 8, 10);
    this.scene.add(bounceLight);

    // Soft Tabletop Shadow Receiver Floor
    const floorShadowGeom = new THREE.PlaneGeometry(80, 80);
    const floorShadowMat = new THREE.ShadowMaterial({ opacity: 0.20 });
    const floorShadowMesh = new THREE.Mesh(floorShadowGeom, floorShadowMat);
    floorShadowMesh.rotation.x = -Math.PI / 2;
    floorShadowMesh.position.y = -PEDESTAL_HEIGHT;
    floorShadowMesh.receiveShadow = true;
    this.scene.add(floorShadowMesh);

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
      this.camera.position.set(0, 22.0, 13.0);
      this.camera.lookAt(0, 0.4, 0.5);
    } else if (aspect < 0.8) {
      // Standard mobile portrait (16:9, 18:9)
      this.camera.position.set(0, 19.5, 11.8);
      this.camera.lookAt(0, 0.3, 0.4);
    } else if (aspect < 1.1) {
      // Tablets / iPads / Foldables
      this.camera.position.set(0, 17.0, 10.5);
      this.camera.lookAt(0, 0.2, 0.3);
    } else {
      // Desktop / Landscape
      this.camera.position.set(0, 16.0, 9.6);
      this.camera.lookAt(0, 0.1, 0.2);
    }
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

    const aspect = (this.container.clientWidth || window.innerWidth) / (this.container.clientHeight || window.innerHeight);
    const spacing = aspect < 0.65 ? 2.6 : aspect < 0.9 ? 2.9 : 3.3;

    for (let i = 0; i < DECK_SLOT_COUNT; i++) {
      const x = (i - 1) * spacing;
      const z = 5.8;
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

    if (this.score >= 400) {
      this.level = 2;
      activeColorsCount = 4;
      maxColorLayers = 2;
    }
    if (this.score >= 1200) {
      this.level = 3;
      activeColorsCount = 5;
      minStackHeight = 4;
      maxStackHeight = 6;
      maxColorLayers = 2;
    }
    if (this.score >= 2500) {
      this.level = 4;
      activeColorsCount = 6;
      maxColorLayers = 3;
      maxStackHeight = 7;
    }
    if (this.score >= 5000) {
      this.level = 5;
      activeColorsCount = 7;
      minStackHeight = 5;
      maxStackHeight = 8;
      maxColorLayers = 3;
    }
    if (this.score >= 8000) {
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
    if (!this.draggedDeckItem || !this.draggedStackGroup) return;

    const hitPoint = this.getPointerIntersection(e);
    if (!hitPoint) return;

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
   * Calculates attraction priority score based on user rules:
   * 1. Stacks with FEWER distinct colors have higher attraction priority (pure 1-color has highest preference).
   * 2. Stacks with GREATER number of matching top cards pull from stacks with fewer cards.
   * 3. Tie-breaker: total stack height & newly placed active slot.
   */
  calculateAttractionPriority(slot, colorId, isPrimaryPlaced = false) {
    if (!slot || slot.stack.length === 0) return -1;

    const topMatches = this.countTopContiguousCards(slot, colorId);
    if (topMatches === 0) return -1;

    // Distinct unique colors count in the whole stack
    const uniqueColorsCount = new Set(slot.stack.map(c => c.color.id)).size;

    // Purity score: 1 color = 4000, 2 colors = 3000, 3 colors = 2000, 4 colors = 1000
    const purityScore = Math.max(1, 5 - uniqueColorsCount) * 1000;

    // Card count score: more matching top cards = higher priority
    const countScore = topMatches * 50;

    // Tie-breaker
    const totalCardsScore = slot.stack.length * 2;
    const placementBonus = isPrimaryPlaced ? 1 : 0;

    return purityScore + countScore + totalCardsScore + placementBonus;
  }

  /**
   * Cascade merge loop applying the exact attraction priority hierarchy:
   * - Pure / fewer-colored stacks pull from multi-colored stacks
   * - Larger numbers pull from smaller numbers
   * - Pops ALL cards of that matching color when >= 10
   */
  async processCascadingMerges(primaryMagnetSlot) {
    let cascadeStep = 0;
    let keepCascading = true;
    this.currentCombo = 1;

    while (keepCascading) {
      keepCascading = false;
      const occupiedSlots = this.hexGrid.getOccupiedSlots();

      for (const slot of occupiedSlots) {
        if (slot.stack.length === 0) continue;

        const topCard = slot.stack[slot.stack.length - 1];
        const topColorId = topCard.color.id;

        const neighbors = this.hexGrid.getNeighbors(slot);
        for (const neighbor of neighbors) {
          if (neighbor.stack.length === 0) continue;

          const neighborTopCard = neighbor.stack[neighbor.stack.length - 1];
          if (neighborTopCard.color.id === topColorId) {
            // Match found! Determine target (magnet puller) vs source (pulled)
            const slotPriority = this.calculateAttractionPriority(
              slot,
              topColorId,
              slot === primaryMagnetSlot
            );
            const neighborPriority = this.calculateAttractionPriority(
              neighbor,
              topColorId,
              neighbor === primaryMagnetSlot
            );

            let target = slot;
            let source = neighbor;

            if (neighborPriority > slotPriority) {
              target = neighbor;
              source = slot;
            }

            // Transfer matching cards from source to target
            await this.transferMatchingCards(source, target, topColorId, cascadeStep);
            cascadeStep++;

            // Pop all matching cards if >= 10
            await this.checkAndClearFullStack(target);

            keepCascading = true;
            break;
          }
        }

        if (keepCascading) break;
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
          await this.animation.animateCardJump(card.mesh, startPos, endPos, 200, 1.5);
          this.animation.animateSquash(card.mesh);
          resolve();
        }, i * 40);
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

      // Award points for every card cleared + clear bonus * combo
      const clearBonus = (clearedCards.length * 25 + 500) * this.currentCombo;
      this.addScore(clearBonus);

      if (this.currentCombo > 1) {
        this.showComboBanner(this.currentCombo);
        this.maxCombo = Math.max(this.maxCombo, this.currentCombo);
      }
      this.currentCombo++;

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

    if (slot.stack.length === 0) {
      badge.userData.updateCount(0);
      badge.visible = false;
      return;
    }

    const topCard = slot.stack[slot.stack.length - 1];
    const contiguousCount = this.countTopContiguousCards(slot, topCard.color.id);

    // Update position based on stack height
    const heightY = slot.stack.length * CARD_THICKNESS + 0.75;
    badge.position.set(slot.worldX, heightY, slot.worldZ);

    badge.userData.updateCount(contiguousCount, STACK_CLEAR_THRESHOLD, topCard.color.css);
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
      setTimeout(() => scoreVal.classList.remove('bump'), 200);
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
    }, 1000);
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
    }, 1200);
  }

  checkGameOverCondition() {
    const emptySlots = this.hexGrid.getEmptySlots();
    const availableDeckStacks = this.deckSlots.filter(s => s.cards.length > 0);

    if (emptySlots.length === 0 && availableDeckStacks.length > 0) {
      this.triggerGameOver();
    }
  }

  triggerGameOver() {
    this.isGameOver = true;
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.sound.playGameOver();

    const isNewRecord = this.score >= this.highScore && this.score > 0;

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

      const nameInput = document.getElementById('player-nickname');
      if (nameInput) {
        nameInput.value = this.leaderboard.getSavedNickname();
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

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}
