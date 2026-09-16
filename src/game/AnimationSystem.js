/**
 * AnimationSystem.js
 * High-performance 3D animation loop handling parabolic card jumps,
 * squash & stretch landing physics, shockwave rings, and particle bursts.
 */

import * as THREE from 'three';
import confetti from 'canvas-confetti';

export class AnimationSystem {
  constructor(scene) {
    this.scene = scene;
    this.activeAnimations = [];
    this.particles = [];
    this.shockwaves = [];
  }

  /**
   * Main update tick for all running animations
   * @param {number} deltaTime Delta time in seconds
   */
  update(deltaTime) {
    const now = performance.now();

    // 1. Process active tween animations
    for (let i = this.activeAnimations.length - 1; i >= 0; i--) {
      const anim = this.activeAnimations[i];
      const elapsed = (now - anim.startTime) / anim.duration;

      if (elapsed >= 1) {
        anim.onUpdate(1);
        if (anim.onComplete) anim.onComplete();
        this.activeAnimations.splice(i, 1);
      } else if (elapsed >= 0) {
        const progress = anim.easing(elapsed);
        anim.onUpdate(progress);
      }
    }

    // 2. Update 3D visual particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= deltaTime * 1.3; // Prolonged life (~0.75s) so jewel sparkles are clearly visible

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        if (p.mesh.geometry) p.mesh.geometry.dispose();
        if (p.mesh.material) p.mesh.material.dispose();
        this.particles.splice(i, 1);
      } else {
        p.mesh.position.x += p.vx * deltaTime;
        p.mesh.position.y += p.vy * deltaTime;
        p.mesh.position.z += p.vz * deltaTime;
        p.vy -= 9.0 * deltaTime; // Gravity

        p.mesh.rotation.x += p.rx * deltaTime;
        p.mesh.rotation.y += p.ry * deltaTime;

        const scale = p.baseScale * Math.max(0, p.life);
        p.mesh.scale.set(scale, scale, scale);
        p.mesh.material.opacity = Math.min(1, p.life * 1.6);
      }
    }

    // 3. Update Shockwave Rings
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.life -= deltaTime * 1.4; // Prolonged ripple (~0.7s)

      if (sw.life <= 0) {
        this.scene.remove(sw.mesh);
        if (sw.mesh.geometry) sw.mesh.geometry.dispose();
        if (sw.mesh.material) sw.mesh.material.dispose();
        this.shockwaves.splice(i, 1);
      } else {
        const progress = 1 - sw.life;
        const scale = sw.baseScale * (1 + progress * 2.5);
        sw.mesh.scale.set(scale, scale, scale);
        sw.mesh.material.opacity = Math.max(0, sw.life);
      }
    }
  }

  /**
   * Adds an animation to the system
   */
  addAnimation({ duration, easing, onUpdate, onComplete, delay = 0 }) {
    return new Promise((resolve) => {
      const startTime = performance.now() + delay;
      this.activeAnimations.push({
        startTime,
        duration,
        easing: easing || ((t) => t),
        onUpdate: (progress) => {
          if (performance.now() >= startTime) {
            onUpdate(progress);
          }
        },
        onComplete: () => {
          if (onComplete) onComplete();
          resolve();
        }
      });
    });
  }

  static easeOutQuad(t) {
    return t * (2 - t);
  }

  static easeOutCubic(t) {
    return --t * t * t + 1;
  }

  static easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
  }

  static easeOutBack(t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  static easeOutElastic(t) {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }

  /**
   * Animate a single card jumping along a 3D parabolic trajectory from startPos to endPos
   */
  animateCardJump(cardMesh, startPos, endPos, duration = 360, arcHeight = 1.8) {
    return new Promise((resolve) => {
      const startTime = performance.now();
      const midX = (startPos.x + endPos.x) / 2;
      const midZ = (startPos.z + endPos.z) / 2;
      const peakY = Math.max(startPos.y, endPos.y) + arcHeight;

      const deltaX = endPos.x - startPos.x;
      const deltaZ = endPos.z - startPos.z;
      const flightAngle = Math.atan2(deltaZ, deltaX);

      this.activeAnimations.push({
        startTime,
        duration,
        easing: AnimationSystem.easeInOutCubic,
        onUpdate: (t) => {
          const u = 1 - t;
          const tt = t * t;
          const uu = u * u;
          const ut2 = 2 * u * t;

          cardMesh.position.x = uu * startPos.x + ut2 * midX + tt * endPos.x;
          cardMesh.position.y = uu * startPos.y + ut2 * peakY + tt * endPos.y;
          cardMesh.position.z = uu * startPos.z + ut2 * midZ + tt * endPos.z;

          // Natural flight banking tilt
          const pitch = Math.sin(t * Math.PI) * 0.35;
          cardMesh.rotation.x = Math.sin(flightAngle) * pitch;
          cardMesh.rotation.z = -Math.cos(flightAngle) * pitch;
        },
        onComplete: () => {
          cardMesh.position.copy(endPos);
          cardMesh.rotation.x = 0;
          cardMesh.rotation.z = 0;
          resolve();
        }
      });
    });
  }

  /**
   * Elastic squash & stretch animation when cards land
   */
  animateSquash(cardMesh) {
    this.addAnimation({
      duration: 220,
      easing: AnimationSystem.easeOutBack,
      onUpdate: (t) => {
        // Squish down slightly then rebound
        const compression = Math.sin(t * Math.PI) * 0.15;
        cardMesh.scale.set(1 + compression * 0.4, 1 - compression, 1 + compression * 0.4);
      },
      onComplete: () => {
        cardMesh.scale.set(1, 1, 1);
      }
    });
  }

  /**
   * Animate cards popping and exploding when full group clears
   */
  animateStackClear(cards, centerPos, colorDef) {
    return new Promise((resolve) => {
      // 1. Trigger Canvas Confetti burst
      confetti({
        particleCount: Math.min(70, cards.length * 6),
        spread: 85,
        origin: { y: 0.6 },
        colors: [colorDef.css, '#ffffff', '#eed49f', '#fbbf24']
      });

      // 2. Spawn Shockwave Ring on the floor
      this.spawnShockwaveRing(centerPos, colorDef);

      // 3. Spawn 3D sparkle particles
      this.spawn3DParticles(centerPos, colorDef, Math.min(40, cards.length * 3));

      // 4. Animate each card scaling up, spinning, and dispersing with white flash
      let finished = 0;
      cards.forEach((cardMesh, idx) => {
        const initialScale = cardMesh.scale.clone();
        const initialY = cardMesh.position.y;
        const delay = idx * 26; // Staggered clear explosion
        const randomRotX = (Math.random() - 0.5) * 1.5;
        const randomRotY = (Math.random() - 0.5) * 2.2;

        this.addAnimation({
          duration: 520, // Prolonged animation so clears can be appreciated
          delay: delay,
          easing: AnimationSystem.easeOutQuad,
          onUpdate: (t) => {
            const scaleFactor = 1 + t * 0.5;
            cardMesh.scale.set(
              initialScale.x * scaleFactor,
              initialScale.y * (1 - t * 0.7),
              initialScale.z * scaleFactor
            );
            cardMesh.position.y = initialY + t * 1.5;
            cardMesh.rotation.x = t * randomRotX;
            cardMesh.rotation.y = t * randomRotY;
            if (cardMesh.material) {
              cardMesh.material.transparent = true;
              cardMesh.material.opacity = Math.max(0, 1 - t * 1.1);
            }
          },
          onComplete: () => {
            this.scene.remove(cardMesh);
            if (cardMesh.geometry) cardMesh.geometry.dispose();
            finished++;
            if (finished === cards.length) {
              resolve();
            }
          }
        });
      });
    });
  }

  /**
   * Spawns an energetic expanding glowing shockwave ring on the floor
   */
  spawnShockwaveRing(pos, colorDef) {
    const ringGeom = new THREE.RingGeometry(0.5, 1.05, 36);
    ringGeom.rotateX(-Math.PI / 2);

    const ringMat = new THREE.MeshBasicMaterial({
      color: colorDef.hex,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const mesh = new THREE.Mesh(ringGeom, ringMat);
    mesh.position.set(pos.x, 0.04, pos.z);
    this.scene.add(mesh);

    this.shockwaves.push({
      mesh,
      life: 1.0,
      baseScale: 1.0
    });
  }

  /**
   * Spawns sparkling faceted 3D jewel gem fragments in Three.js world space
   */
  spawn3DParticles(pos, colorDef, count = 28) {
    // Sparkling octahedron jewel geometry catches faceted highlights
    const gemGeom = new THREE.OctahedronGeometry(0.13, 0);

    const mainMat = new THREE.MeshPhysicalMaterial({
      color: colorDef.hex,
      roughness: 0.1,
      metalness: 0.1,
      clearcoat: 1.0,
      emissive: colorDef.emissive,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 1
    });

    const goldMat = new THREE.MeshPhysicalMaterial({
      color: 0xfef08a,
      roughness: 0.1,
      metalness: 0.3,
      clearcoat: 1.0,
      emissive: 0xca8a04,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 1
    });

    for (let i = 0; i < count; i++) {
      const mat = (i % 3 === 0) ? goldMat.clone() : mainMat.clone();
      const mesh = new THREE.Mesh(gemGeom, mat);
      mesh.position.set(
        pos.x + (Math.random() - 0.5) * 0.7,
        pos.y + Math.random() * 0.5,
        pos.z + (Math.random() - 0.5) * 0.7
      );

      const angle = Math.random() * Math.PI * 2;
      const speed = 3.2 + Math.random() * 5.0;
      const vx = Math.cos(angle) * speed;
      const vz = Math.sin(angle) * speed;
      const vy = 3.8 + Math.random() * 5.2;

      this.scene.add(mesh);

      this.particles.push({
        mesh,
        vx,
        vy,
        vz,
        rx: (Math.random() - 0.5) * 16,
        ry: (Math.random() - 0.5) * 16,
        life: 1.0,
        baseScale: Math.random() * 0.4 + 0.8
      });
    }
  }

  /**
   * Animate a stack returning smoothly to its original deck slot
   */
  animateReturn(stackGroup, targetPos, duration = 200) {
    return new Promise((resolve) => {
      const startPos = stackGroup.position.clone();
      this.addAnimation({
        duration,
        easing: AnimationSystem.easeOutBack,
        onUpdate: (t) => {
          stackGroup.position.lerpVectors(startPos, targetPos, t);
        },
        onComplete: () => {
          stackGroup.position.copy(targetPos);
          resolve();
        }
      });
    });
  }

  /**
   * Animate new deck stack arriving with physics, swoop-in and elastic landing
   * @param {THREE.Group} stackGroup The stack group to animate
   * @param {THREE.Vector3} targetPos The final position on the deck pedestal
   * @param {number} delay Staggered delay in milliseconds
   * @param {Function} onImpact Callback when the stack hits the pedestal
   */
  animateDeckArrival(stackGroup, targetPos, delay = 0, onImpact = null) {
    return new Promise((resolve) => {
      // Start high above with reduced scale and slight tilt
      const startY = targetPos.y + 3.6;
      stackGroup.position.set(targetPos.x, startY, targetPos.z);
      stackGroup.scale.set(0.15, 0.15, 0.15);
      stackGroup.rotation.x = -0.25;
      stackGroup.visible = false;

      this.addAnimation({
        duration: 340,
        delay,
        easing: AnimationSystem.easeOutBack,
        onUpdate: (t) => {
          stackGroup.visible = true;
          // Interpolate Y position from sky to pedestal
          stackGroup.position.y = startY + (targetPos.y - startY) * t;
          // Expand scale smoothly
          const s = Math.min(1.0, 0.15 + 0.85 * (t * 1.15));
          stackGroup.scale.set(s, s, s);
          // Straighten rotation
          stackGroup.rotation.x = -0.25 * (1 - t);
        },
        onComplete: () => {
          stackGroup.position.copy(targetPos);
          stackGroup.scale.set(1, 1, 1);
          stackGroup.rotation.set(0, 0, 0);

          // Elastic bounce on impact
          this.animateSquash(stackGroup);

          if (onImpact) {
            onImpact();
          }
          resolve();
        }
      });
    });
  }

  /**
   * Clears all active animations and visual particles
   */
  clear() {
    this.activeAnimations = [];
    for (const p of this.particles) {
      this.scene.remove(p.mesh);
      if (p.mesh.geometry) p.mesh.geometry.dispose();
      if (p.mesh.material) p.mesh.material.dispose();
    }
    this.particles = [];
    for (const sw of this.shockwaves) {
      this.scene.remove(sw.mesh);
      if (sw.mesh.geometry) sw.mesh.geometry.dispose();
      if (sw.mesh.material) sw.mesh.material.dispose();
    }
    this.shockwaves = [];
  }

  isBusy() {
    return this.activeAnimations.length > 0;
  }
}

