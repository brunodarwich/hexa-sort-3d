/**
 * AnimationSystem.js
 * High-performance 3D animation loop handling parabolic card jumps,
 * stack squash/bounce physics, particle pops, and smooth transitions.
 */

import * as THREE from 'three';
import confetti from 'canvas-confetti';

export class AnimationSystem {
  constructor(scene) {
    this.scene = scene;
    this.activeAnimations = []; // Array of active animation objects
    this.particles = []; // 3D particle bursts
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
        // Animation completed
        anim.onUpdate(1);
        if (anim.onComplete) anim.onComplete();
        this.activeAnimations.splice(i, 1);
      } else {
        const progress = anim.easing(elapsed);
        anim.onUpdate(progress);
      }
    }

    // 2. Update 3D visual particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= deltaTime * 2.5;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        if (p.mesh.geometry) p.mesh.geometry.dispose();
        if (p.mesh.material) p.mesh.material.dispose();
        this.particles.splice(i, 1);
      } else {
        p.mesh.position.x += p.vx * deltaTime;
        p.mesh.position.y += p.vy * deltaTime;
        p.mesh.position.z += p.vz * deltaTime;
        p.vy -= 9.8 * deltaTime * 0.8; // Gravity

        p.mesh.rotation.x += p.rx * deltaTime;
        p.mesh.rotation.y += p.ry * deltaTime;

        const scale = p.baseScale * p.life;
        p.mesh.scale.set(scale, scale, scale);
        p.mesh.material.opacity = Math.min(1, p.life * 1.5);
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

  /**
   * Easing functions
   */
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

  static easeOutBounce(t) {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  }

  /**
   * Animate a single card jumping along a 3D parabolic trajectory from startPos to endPos
   */
  animateCardJump(cardMesh, startPos, endPos, duration = 220, arcHeight = 1.8) {
    return new Promise((resolve) => {
      const startTime = performance.now();
      const midX = (startPos.x + endPos.x) / 2;
      const midZ = (startPos.z + endPos.z) / 2;
      const peakY = Math.max(startPos.y, endPos.y) + arcHeight;

      // Random slight tilt during flight
      const startRotX = cardMesh.rotation.x;
      const startRotZ = cardMesh.rotation.z;
      const peakTilt = (Math.random() - 0.5) * 0.4;

      this.activeAnimations.push({
        startTime,
        duration,
        easing: AnimationSystem.easeInOutCubic,
        onUpdate: (t) => {
          // Quadratic Bézier curve in 3D
          const u = 1 - t;
          const tt = t * t;
          const uu = u * u;
          const ut2 = 2 * u * t;

          cardMesh.position.x = uu * startPos.x + ut2 * midX + tt * endPos.x;
          cardMesh.position.y = uu * startPos.y + ut2 * peakY + tt * endPos.y;
          cardMesh.position.z = uu * startPos.z + ut2 * midZ + tt * endPos.z;

          // Subtle flight wobble
          const wobble = Math.sin(t * Math.PI) * peakTilt;
          cardMesh.rotation.x = startRotX + wobble;
          cardMesh.rotation.z = startRotZ + wobble;
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
   * Animate cards popping and exploding when 10 cards match
   */
  animateStackClear(cards, centerPos, colorDef) {
    return new Promise((resolve) => {
      // 1. Trigger Canvas Confetti burst
      confetti({
        particleCount: 45,
        spread: 70,
        origin: { y: 0.6 },
        colors: [colorDef.css, '#ffffff', '#eed49f']
      });

      // 2. Spawn 3D sparkle particles
      this.spawn3DParticles(centerPos, colorDef, 24);

      // 3. Animate each card scaling up and fading out
      let finished = 0;
      cards.forEach((cardMesh, idx) => {
        const initialScale = cardMesh.scale.clone();
        const initialY = cardMesh.position.y;
        const delay = idx * 15;

        this.addAnimation({
          duration: 250,
          delay: delay,
          easing: AnimationSystem.easeOutQuad,
          onUpdate: (t) => {
            const scaleFactor = 1 + t * 0.4;
            cardMesh.scale.set(
              initialScale.x * scaleFactor,
              initialScale.y * (1 - t * 0.7),
              initialScale.z * scaleFactor
            );
            cardMesh.position.y = initialY + t * 0.8;
            if (cardMesh.material.opacity !== undefined) {
              cardMesh.material.transparent = true;
              cardMesh.material.opacity = 1 - t;
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
   * Spawns 3D particle fragments in Three.js world space
   */
  spawn3DParticles(pos, colorDef, count = 20) {
    const particleGeom = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const particleMat = new THREE.MeshBasicMaterial({
      color: colorDef.hex,
      transparent: true,
      opacity: 1
    });

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(particleGeom, particleMat.clone());
      mesh.position.set(
        pos.x + (Math.random() - 0.5) * 0.6,
        pos.y + Math.random() * 0.5,
        pos.z + (Math.random() - 0.5) * 0.6
      );

      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 4.0;
      const vx = Math.cos(angle) * speed;
      const vz = Math.sin(angle) * speed;
      const vy = 3.0 + Math.random() * 4.5;

      this.scene.add(mesh);

      this.particles.push({
        mesh,
        vx,
        vy,
        vz,
        rx: (Math.random() - 0.5) * 10,
        ry: (Math.random() - 0.5) * 10,
        life: 1.0,
        baseScale: 1.0
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
   * Check if any card or stack animations are currently running
   */
  isBusy() {
    return this.activeAnimations.length > 0;
  }
}
