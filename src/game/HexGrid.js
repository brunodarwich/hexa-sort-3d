/**
 * HexGrid.js
 * Hexagonal coordinate mathematics, grid generation, and adjacency relations.
 */

export const HEX_RADIUS = 1.05; // Outer radius of each hex slot in 3D units
export const HEX_SPACING = 0.08; // Gap spacing between adjacent hexes
export const TOTAL_HEX_SIZE = HEX_RADIUS + HEX_SPACING;

// Pointy-topped 6 axial neighbor directions
export const HEX_DIRECTIONS = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 }
];

export class HexGrid {
  constructor(radius = 2) {
    this.gridRadius = radius;
    this.slots = new Map(); // key: "q_r", value: HexSlot
    this.generateGrid();
  }

  /**
   * Generates a balanced 19-cell hexagonal board (radius 2)
   */
  generateGrid() {
    this.slots.clear();
    const R = this.gridRadius;

    for (let q = -R; q <= R; q++) {
      const r1 = Math.max(-R, -q - R);
      const r2 = Math.min(R, -q + R);
      for (let r = r1; r <= r2; r++) {
        const id = `${q}_${r}`;
        const worldPos = HexGrid.axialToWorld(q, r);
        this.slots.set(id, {
          id,
          q,
          r,
          worldX: worldPos.x,
          worldZ: worldPos.z,
          stack: [], // Array of Card objects (bottom to top)
          mesh: null, // Pedestal mesh reference
          highlightMesh: null
        });
      }
    }
  }

  /**
   * Convert axial coordinates (q, r) to 3D world space (X, Z) with Pointy-Topped orientation
   */
  static axialToWorld(q, r) {
    const size = TOTAL_HEX_SIZE;
    const x = size * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
    const z = size * ((3 / 2) * r);
    return { x, z };
  }

  /**
   * Get all adjacent neighbor slots for a given slot
   */
  getNeighbors(slot) {
    const neighbors = [];
    for (const dir of HEX_DIRECTIONS) {
      const nq = slot.q + dir.q;
      const nr = slot.r + dir.r;
      const nid = `${nq}_${nr}`;
      if (this.slots.has(nid)) {
        neighbors.push(this.slots.get(nid));
      }
    }
    return neighbors;
  }

  /**
   * Get a slot by its ID ("q_r")
   */
  getSlot(id) {
    return this.slots.get(id) || null;
  }

  /**
   * Get all slots as an array
   */
  getAllSlots() {
    return Array.from(this.slots.values());
  }

  /**
   * Get slots that currently have no cards
   */
  getEmptySlots() {
    return this.getAllSlots().filter(s => s.stack.length === 0);
  }

  /**
   * Get slots that contain at least one card
   */
  getOccupiedSlots() {
    return this.getAllSlots().filter(s => s.stack.length > 0);
  }

  /**
   * Check if the entire board is full
   */
  isBoardFull() {
    return this.getEmptySlots().length === 0;
  }

  /**
   * Clear all stacks on the board
   */
  reset() {
    for (const slot of this.slots.values()) {
      slot.stack = [];
    }
  }
}
