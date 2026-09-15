/**
 * GameManager.js
 * Core engine orchestrating 3D rendering, input handling, card merges,
 * score calculation, dynamic difficulty, timer, and game state.
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
    this.deckSlots = []; // Array of 3 deck slots: { index, pos, cards, group, pedestalMesh }
    this.draggedDeckItem = null;
    this.draggedStackGroup = null;
    this.selectedDeckSlot = null; // Tap-to-select support
    this.dragStartPos = null;
    this.hasMovedDistance = false;
    this.hoveredSlot = null;

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
    this.scene.background = null; // Transparent to show CSS background

    // 2. Camera (Isometric-angled perspective)
    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
    this.adjustCameraForScreen(width, height);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.container.appendChild(this.renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.3);
    dirLight.position.set(12, 22, 12);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 50;
    dirLight.shadow.camera.left = -10;
    dirLight.shadow.camera.right = 10;
    dirLight.shadow.camera.top = 10;
    dirLight.shadow.camera.bottom = -10;
    dirLight.shadow.bias = -0.0005;
    this.scene.add(dirLight);

    const accentLight = new THREE.DirectionalLight(0x8aadf4, 0.45);
    accentLight.position.set(-10, 14, -10);
    this.scene.add(accentLight);

    // 5. Animation System
    this.animation = new AnimationSystem(this.scene);

    // 6. Start Render Loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  adjustCameraForScreen(width, height) {
    const aspect = width / height;
    if (aspect < 0.75) {
      // Mobile portrait
      this.camera.position.set(0, 17.5, 13.5);
      this.camera.lookAt(0, -0.3, 1.2);
    } else if (aspect < 1.1) {
      // Tablets / Squarish screens
      this.camera.position.set(0, 15.0, 11.5);
      this.camera.lookAt(0, 0, 1.0);
    } else {
      // Desktop / Landscape screens
      this.camera.position.set(0, 13.5, 10.5);
      this.camera.lookAt(0, 0, 0.8);
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
    }
  }

  initDeckVisuals() {
    this.deckGroup = new THREE.Group();
    this.scene.add(this.deckGroup);

    const spacing = 2.7;
    for (let i = 0; i < DECK_SLOT_COUNT; i++) {
      const x = (i - 1) * spacing;
      const z = 4.8;
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

  startNewGame() {
    // Reset state
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

    // Reset Timer
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (!this.isGameOver) {
        this.gameTimeSeconds++;
        this.updateHUD();
      }
    }, 1000);

    // Clear board cards
    for (const slot of this.hexGrid.getAllSlots()) {
      for (const card of slot.stack) {
        if (card.mesh) {
          this.scene.remove(card.mesh);
          if (card.mesh.geometry) card.mesh.geometry.dispose();
        }
      }
      slot.stack = [];
      if (slot.highlightMesh) slot.highlightMesh.visible = false;
    }

    // Clear deck stacks
    for (const deckSlot of this.deckSlots) {
      if (deckSlot.group) {
        this.scene.remove(deckSlot.group);
      }
      deckSlot.cards = [];
      deckSlot.group = null;
    }

    // Populate initial deck
    this.spawnDeckStacks();
    this.updateHUD();
  }

  /**
   * Determine available colors and stack complexity based on score
   */
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

  /**
   * Spawn 3 new stacks in the deck
   */
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

    // Resize
    window.addEventListener('resize', () => {
      const width = this.container.clientWidth || window.innerWidth;
      const height = this.container.clientHeight || window.innerHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.adjustCameraForScreen(width, height);
      this.renderer.setSize(width, height);
    });

    // Pointer Events (Unified Mouse & Touch)
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

    // 1. Check if clicking on one of the deck stacks
    for (const deckSlot of this.deckSlots) {
      if (deckSlot.cards.length === 0 || !deckSlot.group) continue;

      const dist = hitPoint.distanceTo(deckSlot.pos);
      if (dist < HEX_RADIUS * 1.5) {
        // If we already had another stack selected, restore its height
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

    // 2. If a deck stack was previously selected (Tap-to-select mode) and user clicked an empty board slot
    if (this.selectedDeckSlot && this.selectedDeckSlot.group) {
      const nearestSlot = this.findNearestSlot(hitPoint);
      if (nearestSlot && nearestSlot.stack.length === 0) {
        const deckSlot = this.selectedDeckSlot;
        this.selectedDeckSlot = null;
        this.placeStackOnSlot(deckSlot, nearestSlot);
        return;
      } else {
        // Deselect
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

    // Follow pointer along X/Z
    this.draggedStackGroup.position.x = hitPoint.x;
    this.draggedStackGroup.position.z = hitPoint.z;

    // Find nearest board slot
    const nearestSlot = this.findNearestSlot(hitPoint);

    // Update highlight visual
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

    // Clear highlights
    if (this.hoveredSlot && this.hoveredSlot.highlightMesh) {
      this.hoveredSlot.highlightMesh.visible = false;
    }
    this.hoveredSlot = null;
    this.draggedDeckItem = null;
    this.draggedStackGroup = null;

    if (targetSlot && targetSlot.stack.length === 0) {
      // Placed via Drag & Drop!
      this.selectedDeckSlot = null;
      this.placeStackOnSlot(deckSlot, targetSlot);
    } else if (!this.hasMovedDistance) {
      // Tap Selection Mode: Keep elevated and select
      this.selectedDeckSlot = deckSlot;
      stackGroup.position.copy(deckSlot.pos);
      stackGroup.position.y = 0.8;
    } else {
      // Dragged and dropped in invalid space: return to base
      this.selectedDeckSlot = null;
      this.animation.animateReturn(stackGroup, deckSlot.pos);
    }
  }

  findNearestSlot(worldPos) {
    let closest = null;
    let minDist = HEX_RADIUS * 1.45;

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
   * CORE MERGING & CASCADE ENGINE
   * ========================================================================= */

  async placeStackOnSlot(deckSlot, targetSlot) {
    this.isProcessingMerge = true;
    this.sound.playSnap();

    // 1. Move cards from deck stack group to board slot
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

    // 2. Run recursive cascade merge loop
    await this.processCascadingMerges(targetSlot);

    // 3. Replenish deck if all slots are empty
    const remainingDeck = this.deckSlots.filter(s => s.cards.length > 0);
    if (remainingDeck.length === 0) {
      this.spawnDeckStacks();
    }

    // 4. Check for Game Over condition
    this.checkGameOverCondition();

    this.isProcessingMerge = false;
  }

  /**
   * Main Cascade loop: keeps checking for adjacent color matches, jumping cards,
   * popping 10-card stacks, and cascading until the board reaches equilibrium.
   */
  async processCascadingMerges(placedSlot) {
    let cascadeStep = 0;
    let continueLoop = true;
    this.currentCombo = 1;

    while (continueLoop) {
      continueLoop = false;
      const occupiedSlots = this.hexGrid.getOccupiedSlots();

      // Scan all occupied slots
      for (const slot of occupiedSlots) {
        if (slot.stack.length === 0) continue;

        const topCard = slot.stack[slot.stack.length - 1];
        const topColorId = topCard.color.id;

        // Check all adjacent neighbors
        const neighbors = this.hexGrid.getNeighbors(slot);
        for (const neighbor of neighbors) {
          if (neighbor.stack.length === 0) continue;

          const neighborTopCard = neighbor.stack[neighbor.stack.length - 1];
          if (neighborTopCard.color.id === topColorId) {
            // Match found! Decide merge direction:
            // Prefer merging into whichever slot has more matching cards, or into placedSlot
            let source = neighbor;
            let target = slot;

            const sourceMatches = this.countTopContiguousCards(source, topColorId);
            const targetMatches = this.countTopContiguousCards(target, topColorId);

            if (sourceMatches > targetMatches || (source === placedSlot && sourceMatches >= targetMatches)) {
              source = slot;
              target = neighbor;
            }

            // Perform transfer animation
            await this.transferMatchingCards(source, target, topColorId, cascadeStep);
            cascadeStep++;

            // Check if target reached 10 cards to pop
            await this.checkAndClearFullStack(target);

            continueLoop = true;
            break; // Restart board scan after topology change
          }
        }

        if (continueLoop) break;
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
   * Transfer contiguous top cards of matching color from source to target
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

    // Sound effect with ascending pitch
    this.sound.playCardSlide(cascadeStep);

    // Sequential jump animations
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
          await this.animation.animateCardJump(card.mesh, startPos, endPos, 220, 1.4);
          resolve();
        }, i * 45);
      });

      jumpPromises.push(jumpPromise);
    }

    await Promise.all(jumpPromises);

    // Award score for moved cards
    const pointsGained = cardsToMove.length * 15 * this.currentCombo;
    this.addScore(pointsGained);
  }

  /**
   * Checks if a stack has reached STACK_CLEAR_THRESHOLD (10 cards) of the same color
   */
  async checkAndClearFullStack(slot) {
    if (slot.stack.length < STACK_CLEAR_THRESHOLD) return;

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
      // Pop the 10 matching cards
      const clearedCards = [];
      for (let i = 0; i < STACK_CLEAR_THRESHOLD; i++) {
        clearedCards.push(slot.stack.pop());
      }

      const colorDef = clearedCards[0].color;
      const centerPos = new THREE.Vector3(
        slot.worldX,
        slot.stack.length * CARD_THICKNESS + 0.5,
        slot.worldZ
      );

      // Play chime & clear sound
      this.sound.playStackClear(this.currentCombo);
      this.totalClears++;

      // Award combo bonus
      const clearBonus = 500 * this.currentCombo;
      this.addScore(clearBonus);

      // Show combo banner if combo > 1
      if (this.currentCombo > 1) {
        this.showComboBanner(this.currentCombo);
        this.maxCombo = Math.max(this.maxCombo, this.currentCombo);
      }
      this.currentCombo++;

      // 3D particle and pop animation
      await this.animation.animateStackClear(
        clearedCards.map(c => c.mesh),
        centerPos,
        colorDef
      );
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

    // Trigger score popup and bump effect
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

    // Subtle idle floating on unselected deck stacks
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
