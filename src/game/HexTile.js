/**
 * HexTile.js
 * 3D mesh creation, geometries, materials, visual badges, and color definitions for Hexa Sort 3D.
 */

import * as THREE from 'three';
import { HEX_RADIUS } from './HexGrid.js';

export const CARD_THICKNESS = 0.16;
export const CARD_RADIUS = 0.94;
export const PEDESTAL_HEIGHT = 0.20;

// Vivid, juicy candy casual game palette matching reference screenshot
export const PALETTE = [
  { id: 'yellow', name: 'Amarelo', hex: 0xffcc00, css: '#ffcc00', emissive: 0x332800 },
  { id: 'green', name: 'Verde', hex: 0x22c55e, css: '#22c55e', emissive: 0x053313 },
  { id: 'blue', name: 'Azul', hex: 0x2563eb, css: '#2563eb', emissive: 0x0a2266 },
  { id: 'red', name: 'Vermelho', hex: 0xff334b, css: '#ff334b', emissive: 0x550a14 },
  { id: 'cyan', name: 'Ciano', hex: 0x00d5f8, css: '#00d5f8', emissive: 0x003344 },
  { id: 'purple', name: 'Roxo', hex: 0xa855f7, css: '#a855f7', emissive: 0x2e0854 },
  { id: 'orange', name: 'Laranja', hex: 0xff7a00, css: '#ff7a00', emissive: 0x441b00 },
  { id: 'white', name: 'Branco', hex: 0xf8fafc, css: '#f8fafc', emissive: 0x222222 }
];

export class TileFactory {
  constructor() {
    this.materialsCache = new Map();
    this.sharedCardGeom = this.createHexCardGeometry(CARD_RADIUS, CARD_THICKNESS);
    this.pedestalGeom = this.createHexCardGeometry(HEX_RADIUS, PEDESTAL_HEIGHT);

    // Light silver-grey pedestal materials matching reference board
    this.pedestalMat = new THREE.MeshStandardMaterial({
      color: 0xb5bac4,
      roughness: 0.45,
      metalness: 0.05
    });

    this.pedestalRimMat = new THREE.MeshStandardMaterial({
      color: 0x9ca2b0,
      roughness: 0.4,
      metalness: 0.08
    });

    this.pedestalInnerMat = new THREE.MeshStandardMaterial({
      color: 0xc4c9d4,
      roughness: 0.5,
      metalness: 0.02
    });

    this.highlightMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.55
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
   * Glossy acrylic/candy standard material for cards
   */
  getCardMaterial(colorDef) {
    if (!this.materialsCache.has(colorDef.id)) {
      const mat = new THREE.MeshStandardMaterial({
        color: colorDef.hex,
        roughness: 0.18,
        metalness: 0.06,
        emissive: colorDef.emissive,
        emissiveIntensity: 0.12
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

    // Top inset glossy border ring
    const borderGeom = new THREE.RingGeometry(CARD_RADIUS * 0.70, CARD_RADIUS * 0.88, 6);
    borderGeom.rotateX(-Math.PI / 2);
    borderGeom.rotateY(Math.PI / 6);
    const borderMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.28,
      depthWrite: false
    });
    const innerBorder = new THREE.Mesh(borderGeom, borderMat);
    innerBorder.position.y = CARD_THICKNESS / 2 + 0.002;
    cardMesh.add(innerBorder);

    // Subtle dark underside rim to make chip layers distinctly readable in stacks
    const underGeom = new THREE.RingGeometry(CARD_RADIUS * 0.82, CARD_RADIUS * 0.98, 6);
    underGeom.rotateX(Math.PI / 2);
    underGeom.rotateY(Math.PI / 6);
    const underMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.15,
      depthWrite: false
    });
    const underRim = new THREE.Mesh(underGeom, underMat);
    underRim.position.y = -CARD_THICKNESS / 2 - 0.001;
    cardMesh.add(underRim);

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

    // Outer subtle darker beveled rim
    const rimGeom = this.createHexCardGeometry(HEX_RADIUS * 1.01, 0.04);
    const rimMesh = new THREE.Mesh(rimGeom, this.pedestalRimMat);
    rimMesh.position.y = PEDESTAL_HEIGHT / 2 - 0.02;
    rimMesh.receiveShadow = true;
    group.add(rimMesh);

    // Inner lighter floor
    const innerFloorGeom = this.createHexCardGeometry(HEX_RADIUS * 0.88, 0.02);
    const innerFloor = new THREE.Mesh(innerFloorGeom, this.pedestalInnerMat);
    innerFloor.position.y = PEDESTAL_HEIGHT / 2 + 0.005;
    innerFloor.receiveShadow = true;
    group.add(innerFloor);

    // Highlight beacon mesh (shown clearly when aiming at a slot)
    const highlightGeom = this.createHexCardGeometry(HEX_RADIUS * 0.96, PEDESTAL_HEIGHT + 0.25);
    const highlightMesh = new THREE.Mesh(highlightGeom, this.highlightMat);
    highlightMesh.position.y = 0.12;
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
    const innerFloor = new THREE.Mesh(innerFloorGeom, this.pedestalInnerMat);
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

        // Draw pill bubble background (clean crisp white badge with dark text or colored accent)
        ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 3;

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(64, 64, 42, 0, Math.PI * 2);
        ctx.fill();

        // Border colored by card
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        ctx.strokeStyle = colorCss;
        ctx.lineWidth = 5.5;
        ctx.stroke();

        // Count Text
        ctx.fillStyle = '#1e293b';
        ctx.font = '900 46px Fredoka, Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${count}`, 64, 65);

        texture.needsUpdate = true;
      }
    };

    return sprite;
  }
}
