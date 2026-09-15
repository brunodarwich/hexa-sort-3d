/**
 * HexTile.js
 * 3D mesh creation, geometries, materials, visual badges, and color definitions for Hexa Sort 3D.
 */

import * as THREE from 'three';
import { HEX_RADIUS } from './HexGrid.js';

export const CARD_THICKNESS = 0.16;
export const CARD_RADIUS = 0.94;
export const PEDESTAL_HEIGHT = 0.20;

// Strong, vivid saturated candy palette from previous version
export const PALETTE = [
  { id: 'yellow', name: 'Amarelo', hex: 0xffcc00, css: '#ffcc00', emissive: 0x332800 },
  { id: 'green',  name: 'Verde',   hex: 0x22c55e, css: '#22c55e', emissive: 0x053313 },
  { id: 'blue',   name: 'Azul',    hex: 0x2563eb, css: '#2563eb', emissive: 0x0a2266 },
  { id: 'red',    name: 'Vermelho',hex: 0xff334b, css: '#ff334b', emissive: 0x550a14 },
  { id: 'cyan',   name: 'Ciano',   hex: 0x00d5f8, css: '#00d5f8', emissive: 0x003344 },
  { id: 'purple', name: 'Roxo',    hex: 0xa855f7, css: '#a855f7', emissive: 0x2e0854 },
  { id: 'orange', name: 'Laranja', hex: 0xff7a00, css: '#ff7a00', emissive: 0x441b00 },
  { id: 'white',  name: 'Branco',  hex: 0xf8fafc, css: '#f8fafc', emissive: 0x222222 }
];

let sharedShadowTexture = null;
function getContactShadowTexture() {
  if (!sharedShadowTexture && typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 18, 64, 64, 62);
    grad.addColorStop(0, 'rgba(15, 23, 42, 0.38)');
    grad.addColorStop(0.45, 'rgba(15, 23, 42, 0.15)');
    grad.addColorStop(0.85, 'rgba(15, 23, 42, 0.03)');
    grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    sharedShadowTexture = new THREE.CanvasTexture(canvas);
  }
  return sharedShadowTexture;
}

/**
 * Creates a pointy-topped 6-sided beveled hexagon geometry.
 * The rounded bevel edges catch light highlights like real physical molded chips.
 */
export function createBeveledHexGeometry(radius, height, bevelSize = 0.035, bevelThickness = 0.03) {
  const shape = new THREE.Shape();
  const sides = 6;
  const angleStep = (Math.PI * 2) / sides;
  const innerRadius = Math.max(0.1, radius - bevelSize);

  for (let i = 0; i < sides; i++) {
    const a = i * angleStep + Math.PI / 6;
    const x = Math.cos(a) * innerRadius;
    const y = Math.sin(a) * innerRadius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();

  const depth = Math.max(0.02, height - bevelThickness * 2);
  const extrudeSettings = {
    depth: depth,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: bevelSize,
    bevelThickness: bevelThickness,
    curveSegments: 1
  };

  const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geom.rotateX(Math.PI / 2); // Align top & bottom to X-Z plane
  geom.center(); // Center at (0, 0, 0)
  geom.computeVertexNormals();
  return geom;
}

export class TileFactory {
  constructor() {
    this.materialsCache = new Map();
    this.sharedCardGeom = createBeveledHexGeometry(CARD_RADIUS, CARD_THICKNESS, 0.035, 0.03);
    this.pedestalGeom = createBeveledHexGeometry(HEX_RADIUS, PEDESTAL_HEIGHT, 0.045, 0.035);

    // Shared contact shadow elements
    const shadowTex = getContactShadowTexture();
    this.shadowGeom = new THREE.PlaneGeometry(HEX_RADIUS * 2.35, HEX_RADIUS * 2.35);
    this.shadowGeom.rotateX(-Math.PI / 2);
    this.shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.65,
      depthWrite: false
    });

    // Sculpted porcelain / brushed aluminum pedestals
    this.pedestalMat = new THREE.MeshPhysicalMaterial({
      color: 0xc8ced8,
      roughness: 0.32,
      metalness: 0.08,
      clearcoat: 0.5,
      clearcoatRoughness: 0.15,
      reflectivity: 0.6
    });

    this.pedestalRimMat = new THREE.MeshPhysicalMaterial({
      color: 0xa4acbb,
      roughness: 0.28,
      metalness: 0.14,
      clearcoat: 0.6,
      clearcoatRoughness: 0.12
    });

    this.pedestalInnerMat = new THREE.MeshPhysicalMaterial({
      color: 0xdfe4ec,
      roughness: 0.38,
      metalness: 0.04,
      clearcoat: 0.3
    });

    this.highlightMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.65,
      depthWrite: false
    });
  }

  createHexCardGeometry(radius, height) {
    return createBeveledHexGeometry(radius, height);
  }

  /**
   * Strong, saturated glossy candy material for cards
   */
  getCardMaterial(colorDef) {
    if (!this.materialsCache.has(colorDef.id)) {
      const mat = new THREE.MeshStandardMaterial({
        color: colorDef.hex,
        roughness: 0.18,
        metalness: 0.05,
        emissive: colorDef.emissive,
        emissiveIntensity: 0.16
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

    // Subtle top glossy border ring
    const borderGeom = new THREE.RingGeometry(CARD_RADIUS * 0.72, CARD_RADIUS * 0.88, 6);
    borderGeom.rotateX(-Math.PI / 2);
    borderGeom.rotateY(Math.PI / 6);
    const borderMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.22,
      depthWrite: false
    });
    const innerBorder = new THREE.Mesh(borderGeom, borderMat);
    innerBorder.position.y = CARD_THICKNESS / 2 + 0.002;
    cardMesh.add(innerBorder);

    // Subtle dark underside rim to make chip layers distinctly readable in stacks (ambient occlusion effect)
    const underGeom = new THREE.RingGeometry(CARD_RADIUS * 0.80, CARD_RADIUS * 0.98, 6);
    underGeom.rotateX(Math.PI / 2);
    underGeom.rotateY(Math.PI / 6);
    const underMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.16,
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
   * Creates the 3D pedestal slot for the board grid with contact shadows and beveled lip
   */
  createSlotPedestal(slot) {
    const group = new THREE.Group();
    group.position.set(slot.worldX, -PEDESTAL_HEIGHT / 2, slot.worldZ);

    // 1. Soft contact shadow on the floor
    const contactShadow = new THREE.Mesh(this.shadowGeom, this.shadowMat);
    contactShadow.position.y = 0.002;
    group.add(contactShadow);

    // 2. Main beveled base
    const baseMesh = new THREE.Mesh(this.pedestalGeom, this.pedestalMat);
    baseMesh.receiveShadow = true;
    group.add(baseMesh);

    // 3. Outer subtle metallic rim
    const rimGeom = createBeveledHexGeometry(HEX_RADIUS * 1.01, 0.04, 0.02, 0.015);
    const rimMesh = new THREE.Mesh(rimGeom, this.pedestalRimMat);
    rimMesh.position.y = PEDESTAL_HEIGHT / 2 - 0.02;
    rimMesh.receiveShadow = true;
    group.add(rimMesh);

    // 4. Inner recessed floor socket
    const innerFloorGeom = createBeveledHexGeometry(HEX_RADIUS * 0.88, 0.02, 0.02, 0.01);
    const innerFloor = new THREE.Mesh(innerFloorGeom, this.pedestalInnerMat);
    innerFloor.position.y = PEDESTAL_HEIGHT / 2 + 0.006;
    innerFloor.receiveShadow = true;
    group.add(innerFloor);

    // 5. Highlight beacon mesh (shown clearly with soft neon pulse when aiming at a slot)
    const highlightGeom = createBeveledHexGeometry(HEX_RADIUS * 0.98, PEDESTAL_HEIGHT + 0.3, 0.04, 0.02);
    const highlightMesh = new THREE.Mesh(highlightGeom, this.highlightMat);
    highlightMesh.position.y = 0.14;
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

    // Soft contact shadow
    const contactShadow = new THREE.Mesh(this.shadowGeom, this.shadowMat);
    contactShadow.position.y = 0.002;
    group.add(contactShadow);

    // Base pedestal
    const baseMesh = new THREE.Mesh(this.pedestalGeom, this.pedestalRimMat);
    baseMesh.receiveShadow = true;
    group.add(baseMesh);

    // Inner floor
    const innerFloorGeom = createBeveledHexGeometry(HEX_RADIUS * 0.88, 0.02, 0.02, 0.01);
    const innerFloor = new THREE.Mesh(innerFloorGeom, this.pedestalInnerMat);
    innerFloor.position.y = PEDESTAL_HEIGHT / 2 + 0.006;
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
   * Rendered at high-resolution 256x256 with glossy pill styling.
   */
  createStackCountSprite() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;

    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(1.15, 1.15, 1);
    sprite.visible = false;

    sprite.userData = {
      canvas,
      texture,
      updateCount: (count, target = 10, colorCss = '#ffffff') => {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, 256, 256);

        if (count <= 0) {
          sprite.visible = false;
          return;
        }

        sprite.visible = true;

        // Soft drop shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.30)';
        ctx.shadowBlur = 14;
        ctx.shadowOffsetY = 6;

        // White circular pill base
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(128, 128, 86, 0, Math.PI * 2);
        ctx.fill();

        // Border colored by card top color
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        ctx.strokeStyle = colorCss;
        ctx.lineWidth = 11;
        ctx.stroke();

        // Glossy highlight arc inside badge
        const grad = ctx.createLinearGradient(128, 44, 128, 128);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(128, 128, 80, Math.PI, 0, false);
        ctx.fill();

        // Count Text
        ctx.fillStyle = '#0f172a';
        ctx.font = '900 92px Fredoka, Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${count}`, 128, 131);

        texture.needsUpdate = true;
      }
    };

    return sprite;
  }
}
