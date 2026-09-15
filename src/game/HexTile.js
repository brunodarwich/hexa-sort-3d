/**
 * HexTile.js
 * 3D mesh creation, geometries, materials, and color palette definitions for Hexa Sort 3D.
 */

import * as THREE from 'three';
import { HEX_RADIUS } from './HexGrid.js';

export const CARD_THICKNESS = 0.15;
export const CARD_RADIUS = 0.95;
export const PEDESTAL_HEIGHT = 0.2;

// Color Palette with names, hex codes, and Three.js Colors
export const PALETTE = [
  { id: 'red', name: 'Rubi', hex: 0xef4444, css: '#ef4444', emissive: 0x450a0a },
  { id: 'blue', name: 'Safira', hex: 0x3b82f6, css: '#3b82f6', emissive: 0x172554 },
  { id: 'green', name: 'Esmeralda', hex: 0x10b981, css: '#10b981', emissive: 0x064e3b },
  { id: 'yellow', name: 'Âmbar', hex: 0xf59e0b, css: '#f59e0b', emissive: 0x78350f },
  { id: 'purple', name: 'Ametista', hex: 0x8b5cf6, css: '#8b5cf6', emissive: 0x3b0764 },
  { id: 'orange', name: 'Laranja', hex: 0xf97316, css: '#f97316', emissive: 0x7c2d12 },
  { id: 'teal', name: 'Ciano', hex: 0x06b6d4, css: '#06b6d4', emissive: 0x164e63 },
  { id: 'pink', name: 'Rosa', hex: 0xec4899, css: '#ec4899', emissive: 0x700736 }
];

export class TileFactory {
  constructor() {
    this.materialsCache = new Map();
    this.cardGeometries = new Map();
    this.sharedCardGeom = this.createHexCardGeometry(CARD_RADIUS, CARD_THICKNESS);
    this.pedestalGeom = this.createHexCardGeometry(HEX_RADIUS, PEDESTAL_HEIGHT);

    // Common Pedestal Materials
    this.pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x1e2238,
      roughness: 0.6,
      metalness: 0.2
    });

    this.pedestalBorderMat = new THREE.MeshStandardMaterial({
      color: 0x333a59,
      roughness: 0.4,
      metalness: 0.3
    });

    this.highlightMat = new THREE.MeshBasicMaterial({
      color: 0x8aadf4,
      transparent: true,
      opacity: 0.35,
      wireframe: false
    });
  }

  /**
   * Helper to create a pointy-topped 6-sided hexagonal prism geometry
   */
  createHexCardGeometry(radius, height) {
    // 6-sided cylinder rotated 30 deg (Math.PI / 6) for pointy-topped hex alignment
    const geom = new THREE.CylinderGeometry(radius, radius, height, 6, 1, false);
    geom.rotateY(Math.PI / 6);
    return geom;
  }

  /**
   * Get or create standard material for a specific color definition
   */
  getCardMaterial(colorDef) {
    if (!this.materialsCache.has(colorDef.id)) {
      const mat = new THREE.MeshStandardMaterial({
        color: colorDef.hex,
        roughness: 0.25,
        metalness: 0.15,
        bumpScale: 0.05
      });
      this.materialsCache.set(colorDef.id, mat);
    }
    return this.materialsCache.get(colorDef.id);
  }

  /**
   * Creates a single 3D hexagonal card mesh
   */
  createCard(colorDef) {
    const material = this.getCardMaterial(colorDef);
    const cardMesh = new THREE.Mesh(this.sharedCardGeom, material);
    cardMesh.castShadow = true;
    cardMesh.receiveShadow = true;

    // Inner top border/ridge for high quality visual card look
    const borderGeom = new THREE.RingGeometry(CARD_RADIUS * 0.75, CARD_RADIUS * 0.85, 6);
    borderGeom.rotateX(-Math.PI / 2);
    borderGeom.rotateY(Math.PI / 6);
    const borderMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.25,
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

    // Base body
    const baseMesh = new THREE.Mesh(this.pedestalGeom, this.pedestalMat);
    baseMesh.receiveShadow = true;
    group.add(baseMesh);

    // Inner slot floor indicator
    const innerFloorGeom = this.createHexCardGeometry(HEX_RADIUS * 0.88, 0.02);
    const innerFloorMat = new THREE.MeshStandardMaterial({
      color: 0x161828,
      roughness: 0.8,
      metalness: 0.1
    });
    const innerFloor = new THREE.Mesh(innerFloorGeom, innerFloorMat);
    innerFloor.position.y = PEDESTAL_HEIGHT / 2 + 0.005;
    innerFloor.receiveShadow = true;
    group.add(innerFloor);

    // Glowing highlight mesh (shown when dragging a stack over this slot)
    const highlightGeom = this.createHexCardGeometry(HEX_RADIUS * 0.95, PEDESTAL_HEIGHT + 0.08);
    const highlightMesh = new THREE.Mesh(highlightGeom, this.highlightMat);
    highlightMesh.position.y = 0.04;
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

    const baseMesh = new THREE.Mesh(this.pedestalGeom, this.pedestalBorderMat);
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
}
