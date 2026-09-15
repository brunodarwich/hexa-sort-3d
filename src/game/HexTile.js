/**
 * HexTile.js
 * 3D mesh creation, geometries, materials, visual badges, and color definitions for Hexa Sort 3D.
 */

import * as THREE from 'three';
import { HEX_RADIUS } from './HexGrid.js';

export const CARD_THICKNESS = 0.16;
export const CARD_RADIUS = 0.94;
export const PEDESTAL_HEIGHT = 0.22;

// High contrast, vivid candy colors with emissive highlights
export const PALETTE = [
  { id: 'red', name: 'Rubi', hex: 0xf43f5e, css: '#f43f5e', emissive: 0x881337 },
  { id: 'blue', name: 'Safira', hex: 0x3b82f6, css: '#3b82f6', emissive: 0x1e3a8a },
  { id: 'green', name: 'Esmeralda', hex: 0x10b981, css: '#10b981', emissive: 0x064e3b },
  { id: 'yellow', name: 'Âmbar', hex: 0xfbbf24, css: '#fbbf24', emissive: 0x78350f },
  { id: 'purple', name: 'Ametista', hex: 0xa855f7, css: '#a855f7', emissive: 0x581c87 },
  { id: 'orange', name: 'Coral', hex: 0xf97316, css: '#f97316', emissive: 0x7c2d12 },
  { id: 'cyan', name: 'Ciano', hex: 0x06b6d4, css: '#06b6d4', emissive: 0x164e63 },
  { id: 'pink', name: 'Magenta', hex: 0xec4899, css: '#ec4899', emissive: 0x831843 }
];

export class TileFactory {
  constructor() {
    this.materialsCache = new Map();
    this.sharedCardGeom = this.createHexCardGeometry(CARD_RADIUS, CARD_THICKNESS);
    this.pedestalGeom = this.createHexCardGeometry(HEX_RADIUS, PEDESTAL_HEIGHT);

    // Pedestal Materials
    this.pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x1e2030,
      roughness: 0.4,
      metalness: 0.3
    });

    this.pedestalRimMat = new THREE.MeshStandardMaterial({
      color: 0x363a4f,
      roughness: 0.2,
      metalness: 0.5
    });

    this.highlightMat = new THREE.MeshBasicMaterial({
      color: 0x8aadf4,
      transparent: true,
      opacity: 0.45
    });
  }

  /**
   * Helper to create a pointy-topped 6-sided hexagonal cylinder
   */
  createHexCardGeometry(radius, height) {
    const geom = new THREE.CylinderGeometry(radius, radius, height, 6, 1, false);
    geom.rotateY(Math.PI / 6);
    return geom;
  }

  /**
   * Glossy acrylic standard material for cards
   */
  getCardMaterial(colorDef) {
    if (!this.materialsCache.has(colorDef.id)) {
      const mat = new THREE.MeshStandardMaterial({
        color: colorDef.hex,
        roughness: 0.18,
        metalness: 0.12,
        emissive: colorDef.emissive,
        emissiveIntensity: 0.15
      });
      this.materialsCache.set(colorDef.id, mat);
    }
    return this.materialsCache.get(colorDef.id);
  }

  /**
   * Creates a single 3D hexagonal card mesh with polished bevel highlights
   */
  createCard(colorDef) {
    const material = this.getCardMaterial(colorDef);
    const cardMesh = new THREE.Mesh(this.sharedCardGeom, material);
    cardMesh.castShadow = true;
    cardMesh.receiveShadow = true;

    // Top inset ring for high-end glossy finish
    const borderGeom = new THREE.RingGeometry(CARD_RADIUS * 0.72, CARD_RADIUS * 0.86, 6);
    borderGeom.rotateX(-Math.PI / 2);
    borderGeom.rotateY(Math.PI / 6);
    const borderMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      depthWrite: false
    });
    const innerBorder = new THREE.Mesh(borderGeom, borderMat);
    innerBorder.position.y = CARD_THICKNESS / 2 + 0.002;
    cardMesh.add(innerBorder);

    cardMesh.userData = {
      color: colorDef,
      isCard: true
    };

    return cardMesh;
  }

  /**
   * Creates the 3D pedestal slot for the board grid
   */
  createSlotPedestal(slot) {
    const group = new THREE.Group();
    group.position.set(slot.worldX, -PEDESTAL_HEIGHT / 2, slot.worldZ);

    // Main base
    const baseMesh = new THREE.Mesh(this.pedestalGeom, this.pedestalMat);
    baseMesh.receiveShadow = true;
    group.add(baseMesh);

    // Glowing rim
    const rimGeom = this.createHexCardGeometry(HEX_RADIUS * 1.02, 0.04);
    const rimMesh = new THREE.Mesh(rimGeom, this.pedestalRimMat);
    rimMesh.position.y = PEDESTAL_HEIGHT / 2 - 0.02;
    rimMesh.receiveShadow = true;
    group.add(rimMesh);

    // Inner floor
    const innerFloorGeom = this.createHexCardGeometry(HEX_RADIUS * 0.88, 0.02);
    const innerFloorMat = new THREE.MeshStandardMaterial({
      color: 0x141624,
      roughness: 0.7,
      metalness: 0.1
    });
    const innerFloor = new THREE.Mesh(innerFloorGeom, innerFloorMat);
    innerFloor.position.y = PEDESTAL_HEIGHT / 2 + 0.005;
    innerFloor.receiveShadow = true;
    group.add(innerFloor);

    // Highlight mesh
    const highlightGeom = this.createHexCardGeometry(HEX_RADIUS * 0.96, PEDESTAL_HEIGHT + 0.1);
    const highlightMesh = new THREE.Mesh(highlightGeom, this.highlightMat);
    highlightMesh.position.y = 0.05;
    highlightMesh.visible = false;
    group.add(highlightMesh);

    group.userData = {
      slotId: slot.id,
      isSlot: true,
      slotRef: slot,
      highlightMesh: highlightMesh
    };

    return group;
  }

  /**
   * Creates a bottom shelf deck pedestal
   */
  createDeckPedestal(x, y, z, index) {
    const group = new THREE.Group();
    group.position.set(x, y - PEDESTAL_HEIGHT / 2, z);

    const baseMesh = new THREE.Mesh(this.pedestalGeom, this.pedestalRimMat);
    baseMesh.receiveShadow = true;
    group.add(baseMesh);

    const innerFloorGeom = this.createHexCardGeometry(HEX_RADIUS * 0.88, 0.02);
    const innerFloor = new THREE.Mesh(innerFloorGeom, this.pedestalMat);
    innerFloor.position.y = PEDESTAL_HEIGHT / 2 + 0.005;
    innerFloor.receiveShadow = true;
    group.add(innerFloor);

    group.userData = {
      deckIndex: index,
      isDeckSlot: true
    };

    return group;
  }

  /**
   * Creates a dynamic 3D text sprite badge showing stack count (e.g. "8/10")
   */
  createStackCountSprite() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;

    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(1.1, 1.1, 1);
    sprite.visible = false;

    sprite.userData = {
      canvas,
      texture,
      updateCount: (count, target = 10, colorCss = '#ffffff') => {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, 128, 128);

        if (count <= 0) {
          sprite.visible = false;
          return;
        }

        sprite.visible = true;

        // Draw pill bubble background
        ctx.fillStyle = 'rgba(24, 25, 38, 0.85)';
        ctx.beginPath();
        ctx.arc(64, 64, 46, 0, Math.PI * 2);
        ctx.fill();

        // Border colored by card
        ctx.strokeStyle = colorCss;
        ctx.lineWidth = 6;
        ctx.stroke();

        // Glow
        ctx.shadowColor = colorCss;
        ctx.shadowBlur = 12;

        // Text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 44px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${count}`, 64, 64);

        texture.needsUpdate = true;
      }
    };

    return sprite;
  }
}
