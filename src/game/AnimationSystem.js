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
      if (now < anim.startTime) continue;

      const elapsed = (now - anim.startTime) / anim.duration;

      if (elapsed >= 1) {
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
      const fadeSpeed = sw.fadeSpeed || 1.4;
      sw.life -= deltaTime * fadeSpeed;

      if (sw.life <= 0) {
        this.scene.remove(sw.mesh);
        if (sw.mesh.geometry) sw.mesh.geometry.dispose();
        if (sw.mesh.material) sw.mesh.material.dispose();
        this.shockwaves.splice(i, 1);
      } else {
        const progress = 1 - sw.life;
        const maxExp = sw.maxExpansion !== undefined ? sw.maxExpansion : 2.5;
        const scale = sw.baseScale * (1 + progress * maxExp);
        sw.mesh.scale.set(scale, scale, scale);
        const baseOp = sw.baseOpacity !== undefined ? sw.baseOpacity : 1.0;
        sw.mesh.material.opacity = Math.max(0, sw.life * baseOp);
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
  animateCardJump(cardMesh, startPos, endPos, duration = 340, arcHeight = 1.8, delay = 0) {
    return new Promise((resolve) => {
      const startTime = performance.now() + delay;
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
          this.animateSquash(cardMesh);
          resolve();
        }
      });
    });
  }

  /**
   * Animate a stack of cards smoothly flying/dropping onto a target pedestal slot
   * with tactile squash & landing bounce.
   */
  animateStackPlacement(stackGroup, startPos, targetPos, duration = 170) {
    return new Promise((resolve) => {
      const startTime = performance.now();
      const start = startPos.clone();
      const target = targetPos.clone();

      this.activeAnimations.push({
        startTime,
        duration,
        easing: AnimationSystem.easeOutCubic,
        onUpdate: (t) => {
          const u = 1 - t;
          stackGroup.position.x = start.x + (target.x - start.x) * t;
          stackGroup.position.z = start.z + (target.z - start.z) * t;
          const arc = Math.sin(t * Math.PI) * 0.45;
          stackGroup.position.y = u * start.y + t * target.y + arc;
        },
        onComplete: () => {
          stackGroup.position.copy(target);
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
   * @param {Array} cards Array of card objects/meshes
   * @param {THREE.Vector3} centerPos Center position of the stack
   * @param {Object} colorDef Color definition of the cleared stack
   * @param {Object} options Configuration flags (isSuperExplosion, comboTier)
   */
  animateStackClear(cards, centerPos, colorDef, options = {}) {
    const isSuper = options.isSuperExplosion || cards.length >= 15 || (options.comboTier && options.comboTier >= 15);
    const isMega = (options.comboTier && options.comboTier >= 10) || cards.length >= 12;

    return new Promise((resolve) => {
      // 1. Trigger Canvas Confetti burst
      if (isSuper) {
        confetti({
          particleCount: 140,
          spread: 110,
          origin: { y: 0.55 },
          colors: [colorDef.css, '#fbbf24', '#f43f5e', '#a855f7', '#38bdf8', '#ffffff']
        });
        // Staggered secondary explosion for super clears
        setTimeout(() => {
          confetti({
            particleCount: 80,
            spread: 90,
            origin: { y: 0.58 },
            colors: ['#ffd700', '#ff4500', colorDef.css, '#ffffff']
          });
        }, 140);
      } else if (isMega) {
        confetti({
          particleCount: 95,
          spread: 95,
          origin: { y: 0.58 },
          colors: [colorDef.css, '#fbbf24', '#f97316', '#ffffff']
        });
      } else {
        confetti({
          particleCount: Math.min(75, Math.max(45, cards.length * 7)),
          spread: 85,
          origin: { y: 0.6 },
          colors: [colorDef.css, '#ffffff', '#eed49f', '#fbbf24']
        });
      }

      // 2. Spawn Shockwave Rings on the floor
      if (isSuper) {
        this.spawnDoubleShockwaveRing(centerPos, colorDef);
        this.triggerScreenShake(480, 'super');
      } else if (isMega) {
        this.spawnShockwaveRing(centerPos, colorDef, 1.4);
        this.triggerScreenShake(320, 'mega');
      } else {
        this.spawnShockwaveRing(centerPos, colorDef);
      }

      // 3. Spawn 3D sparkle jewel particles
      const particleCount = isSuper ? 65 : (isMega ? 46 : Math.min(38, cards.length * 3 + 10));
      this.spawn3DParticles(centerPos, colorDef, particleCount, isSuper);

      // 4. Animate each card scaling up, spinning, and dispersing with white flash
      let finished = 0;
      const animDuration = isSuper ? 640 : (isMega ? 560 : 520);
      const staggerDelay = isSuper ? 30 : (isMega ? 28 : 26);

      cards.forEach((cardMesh, idx) => {
        // Clone material so fading out transparent/opacity ONLY affects dying cards, NOT shared cache!
        if (cardMesh.material) {
          cardMesh.material = cardMesh.material.clone();
        }
        const initialScale = cardMesh.scale.clone();
        const initialY = cardMesh.position.y;
        const delay = idx * staggerDelay; // Staggered clear explosion
        const randomRotX = (Math.random() - 0.5) * (isSuper ? 2.5 : 1.6);
        const randomRotY = (Math.random() - 0.5) * (isSuper ? 3.2 : 2.2);

        this.addAnimation({
          duration: animDuration,
          delay: delay,
          easing: AnimationSystem.easeOutQuad,
          onUpdate: (t) => {
            const scaleFactor = 1 + t * (isSuper ? 0.75 : 0.5);
            cardMesh.scale.set(
              initialScale.x * scaleFactor,
              initialScale.y * (1 - t * 0.7),
              initialScale.z * scaleFactor
            );
            cardMesh.position.y = initialY + t * (isSuper ? 2.2 : 1.5);
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
            if (cardMesh.material) cardMesh.material.dispose();
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
  spawnShockwaveRing(pos, colorDef, scaleMultiplier = 1.0) {
    const ringGeom = new THREE.RingGeometry(0.5 * scaleMultiplier, 1.05 * scaleMultiplier, 36);
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
      fadeSpeed: scaleMultiplier > 1 ? 1.1 : 1.4,
      maxExpansion: 2.2 * scaleMultiplier,
      baseOpacity: 0.95,
      baseScale: 1.0
    });
  }

  /**
   * Spawns a dramatic dual concentric shockwave ring for Super Explosions (15+)
   */
  spawnDoubleShockwaveRing(pos, colorDef) {
    // Primary intense core ring
    this.spawnShockwaveRing(pos, colorDef, 1.25);

    // Secondary wide golden/neon aura ring delayed slightly
    setTimeout(() => {
      const ringGeom = new THREE.RingGeometry(0.8, 1.4, 40);
      ringGeom.rotateX(-Math.PI / 2);

      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xfef08a,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });

      const mesh = new THREE.Mesh(ringGeom, ringMat);
      mesh.position.set(pos.x, 0.05, pos.z);
      this.scene.add(mesh);

      this.shockwaves.push({
        mesh,
        life: 1.0,
        fadeSpeed: 0.95, // Slower, dramatic dissipation
        maxExpansion: 3.2,
        baseOpacity: 0.85,
        baseScale: 1.0
      });
    }, 80);
  }

  /**
   * Triggers a subtle dynamic camera / screen shake on the canvas container
   */
  triggerScreenShake(duration = 350, type = 'mega') {
    const target = document.getElementById('canvas-container') || document.body;
    if (!target) return;

    const className = type === 'super' ? 'screen-shake-super' : 'screen-shake-mega';
    target.classList.remove('screen-shake-mega', 'screen-shake-super');
    void target.offsetWidth; // Force reflow
    target.classList.add(className);

    setTimeout(() => {
      target.classList.remove(className);
    }, duration);
  }

  /**
   * Spawns a discreet, soft circular ripple ring on the pedestal when new deck cards land
   */
  spawnArrivalRing(pos, colorDef) {
    const ringGeom = new THREE.RingGeometry(0.68, 0.84, 36);
    ringGeom.rotateX(-Math.PI / 2);

    const ringMat = new THREE.MeshBasicMaterial({
      color: colorDef.hex,
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const mesh = new THREE.Mesh(ringGeom, ringMat);
    mesh.position.set(pos.x, 0.03, pos.z);
    this.scene.add(mesh);

    this.shockwaves.push({
      mesh,
      life: 1.0,
      fadeSpeed: 2.8, // Quick, smooth fade (~0.35s)
      maxExpansion: 0.28, // Soft subtle expansion (+28%)
      baseOpacity: 0.32,
      baseScale: 1.0
    });
  }

  /**
   * Spawns sparkling faceted 3D jewel gem fragments in Three.js world space
   */
  spawn3DParticles(pos, colorDef, count = 28, isSuper = false) {
    // Sparkling octahedron jewel geometry catches faceted highlights
    const gemGeom = new THREE.OctahedronGeometry(isSuper ? 0.16 : 0.13, 0);

    const mainMat = new THREE.MeshPhysicalMaterial({
      color: colorDef.hex,
      roughness: 0.1,
      metalness: 0.1,
      clearcoat: 1.0,
      emissive: colorDef.emissive,
      emissiveIntensity: isSuper ? 0.7 : 0.4,
      transparent: true,
      opacity: 1
    });

    const goldMat = new THREE.MeshPhysicalMaterial({
      color: 0xfef08a,
      roughness: 0.1,
      metalness: 0.3,
      clearcoat: 1.0,
      emissive: 0xca8a04,
      emissiveIntensity: isSuper ? 0.8 : 0.5,
      transparent: true,
      opacity: 1
    });

    for (let i = 0; i < count; i++) {
      const mat = (i % 2 === 0) ? goldMat.clone() : mainMat.clone();
      const mesh = new THREE.Mesh(gemGeom, mat);
      mesh.position.set(
        pos.x + (Math.random() - 0.5) * (isSuper ? 1.0 : 0.7),
        pos.y + Math.random() * 0.6,
        pos.z + (Math.random() - 0.5) * (isSuper ? 1.0 : 0.7)
      );

      const angle = Math.random() * Math.PI * 2;
      const speedMultiplier = isSuper ? 1.45 : 1.0;
      const speed = (3.2 + Math.random() * 5.0) * speedMultiplier;
      const vx = Math.cos(angle) * speed;
      const vz = Math.sin(angle) * speed;
      const vy = (3.8 + Math.random() * 5.2) * speedMultiplier;

      this.scene.add(mesh);

      this.particles.push({
        mesh,
        vx,
        vy,
        vz,
        rx: (Math.random() - 0.5) * 18,
        ry: (Math.random() - 0.5) * 18,
        life: isSuper ? 1.25 : 1.0,
        baseScale: (Math.random() * 0.4 + 0.8) * (isSuper ? 1.25 : 1.0)
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
   * Animate badge popping in smoothly with bounce
   * @param {THREE.Sprite} badgeSprite The badge sprite to animate
   * @param {number} duration Duration in ms
   */
  animateBadgePopIn(badgeSprite, duration = 240) {
    if (!badgeSprite) return Promise.resolve();
    badgeSprite.visible = true;
    badgeSprite.scale.set(0.05, 0.05, 1);

    return new Promise((resolve) => {
      this.addAnimation({
        duration,
        easing: AnimationSystem.easeOutBack,
        onUpdate: (t) => {
          const s = Math.max(0.05, 1.15 * t);
          badgeSprite.scale.set(s, s, 1);
        },
        onComplete: () => {
          badgeSprite.scale.set(1.15, 1.15, 1);
          resolve();
        }
      });
    });
  }

  /**
   * Constrói o modelo 3D procedural do Foguete
   */
  createRocketMesh() {
    const rocketGroup = new THREE.Group();

    // 1. Fuselagem cilíndrica principal (corpo metálico branco/prata)
    const bodyGeom = new THREE.CylinderGeometry(0.18, 0.2, 0.85, 16);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.25,
      metalness: 0.6
    });
    const bodyMesh = new THREE.Mesh(bodyGeom, bodyMat);
    rocketGroup.add(bodyMesh);

    // 2. Bico ogival aerodinâmico vermelho/coral
    const noseGeom = new THREE.ConeGeometry(0.18, 0.45, 16);
    const noseMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      roughness: 0.3,
      metalness: 0.4
    });
    const noseMesh = new THREE.Mesh(noseGeom, noseMat);
    noseMesh.position.y = 0.65;
    rocketGroup.add(noseMesh);

    // 3. 3 Aletas estabilizadoras na base
    const finGeom = new THREE.BoxGeometry(0.04, 0.28, 0.2);
    const finMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.4
    });
    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3;
      const finMesh = new THREE.Mesh(finGeom, finMat);
      finMesh.position.set(Math.cos(angle) * 0.16, -0.32, Math.sin(angle) * 0.16);
      finMesh.rotation.y = -angle;
      rocketGroup.add(finMesh);
    }

    // 4. Bocal de propulsão com luz incandescente
    const nozzleGeom = new THREE.CylinderGeometry(0.14, 0.1, 0.15, 12);
    const nozzleMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00
    });
    const nozzleMesh = new THREE.Mesh(nozzleGeom, nozzleMat);
    nozzleMesh.position.y = -0.48;
    rocketGroup.add(nozzleMesh);

    // Luz de propulsão acoplada ao bocal
    const thrusterLight = new THREE.PointLight(0xff6600, 2.5, 3.5);
    thrusterLight.position.y = -0.55;
    rocketGroup.add(thrusterLight);

    rocketGroup.scale.set(1.4, 1.4, 1.4);
    return rocketGroup;
  }

  /**
   * Dispara o foguete em voo balístico parabólico com rastro de fumaça/chamas e explosão 3D
   */
  launchRocket3D(startPos, targetPos, options = {}) {
    return new Promise((resolve) => {
      const rocketMesh = this.createRocketMesh();
      this.scene.add(rocketMesh);

      // Ponto de início (se não fornecido, surge do canto inferior direito fora do campo de visão)
      const p0 = startPos ? startPos.clone() : new THREE.Vector3(3.8, 1.2, 4.5);
      const p3 = targetPos.clone();
      p3.y = targetPos.y + 0.15; // Nível da pilha

      // Pontos de controle de Bezier cúbica para arco elevado
      const dist = p0.distanceTo(p3);
      const arcHeight = Math.max(5.5, dist * 0.75);

      const p1 = new THREE.Vector3(
        p0.x * 0.7 + p3.x * 0.1,
        p0.y + arcHeight * 0.9,
        p0.z * 0.7 + p3.z * 0.1
      );
      const p2 = new THREE.Vector3(
        p3.x * 0.85 + p0.x * 0.15,
        p3.y + arcHeight * 1.1,
        p3.z * 0.85 + p0.z * 0.15
      );

      rocketMesh.position.copy(p0);

      const duration = options.duration || 750;
      let lastParticleTime = 0;

      this.addAnimation({
        duration,
        easing: (t) => t * t * (3 - 2 * t), // Smooth ease-in-out
        onUpdate: (t) => {
          // Posição de Bezier Cúbica: B(t) = (1-t)³P0 + 3(1-t)²tP1 + 3(1-t)t²P2 + t³P3
          const u = 1 - t;
          const tt = t * t;
          const uu = u * u;
          const uuu = uu * u;
          const ttt = tt * t;

          const currentX = uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x;
          const currentY = uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y;
          const currentZ = uuu * p0.z + 3 * uu * t * p1.z + 3 * u * tt * p2.z + ttt * p3.z;

          rocketMesh.position.set(currentX, currentY, currentZ);

          // Vetor tangente (velocidade instantânea): B'(t) = 3(1-t)²(P1-P0) + 6(1-t)t(P2-P1) + 3t²(P3-P2)
          const tangentX = 3 * uu * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * tt * (p3.x - p2.x);
          const tangentY = 3 * uu * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * tt * (p3.y - p2.y);
          const tangentZ = 3 * uu * (p1.z - p0.z) + 6 * u * t * (p2.z - p1.z) + 3 * tt * (p3.z - p2.z);

          const dir = new THREE.Vector3(tangentX, tangentY, tangentZ).normalize();
          
          // Alinhar o eixo Y do foguete (bico) na direção do vetor tangente
          const targetRotation = new THREE.Quaternion();
          const up = new THREE.Vector3(0, 1, 0);
          targetRotation.setFromUnitVectors(up, dir);
          rocketMesh.quaternion.copy(targetRotation);

          // Emitir partículas de propulsão / fumaça na traseira do foguete
          const now = performance.now();
          if (now - lastParticleTime > 25) {
            lastParticleTime = now;
            const exhaustPos = rocketMesh.position.clone().add(dir.clone().multiplyScalar(-0.7));
            this.spawnRocketExhaustParticle(exhaustPos, dir);
          }
        },
        onComplete: () => {
          // Remover modelo do foguete
          this.scene.remove(rocketMesh);
          rocketMesh.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
          });

          // Disparar explosão 3D volumétrica no local de impacto
          this.triggerRocketExplosion3D(p3);

          if (options.onImpact) {
            options.onImpact(p3);
          }
          resolve();
        }
      });
    });
  }

  /**
   * Emite partículas volumétricas de fumaça e fogo da propulsão do foguete
   */
  spawnRocketExhaustParticle(pos, forwardDir) {
    const isFlame = Math.random() > 0.4;
    const geom = new THREE.SphereGeometry(isFlame ? 0.08 : 0.12, 6, 6);
    const mat = new THREE.MeshBasicMaterial({
      color: isFlame ? (Math.random() > 0.5 ? 0xff4500 : 0xffbb00) : 0xd1d5db,
      transparent: true,
      opacity: isFlame ? 0.9 : 0.6
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.copy(pos);
    this.scene.add(mesh);

    const spread = 0.6;
    const backVel = forwardDir.clone().multiplyScalar(-1.5);
    const vx = backVel.x + (Math.random() - 0.5) * spread;
    const vy = backVel.y + (Math.random() - 0.5) * spread;
    const vz = backVel.z + (Math.random() - 0.5) * spread;

    this.particles.push({
      mesh,
      vx,
      vy,
      vz,
      rx: Math.random() * 4,
      ry: Math.random() * 4,
      life: isFlame ? 0.25 : 0.45,
      baseScale: 1.0
    });
  }

  /**
   * Dispara o flash, choque, partículas e estilhaços da explosão do Foguete
   */
  triggerRocketExplosion3D(pos) {
    // 1. Flash de luz explosiva PointLight
    const flashLight = new THREE.PointLight(0xff7700, 8.0, 8.0);
    flashLight.position.set(pos.x, pos.y + 0.5, pos.z);
    this.scene.add(flashLight);

    this.addAnimation({
      duration: 350,
      easing: (t) => 1 - t,
      onUpdate: (t) => {
        flashLight.intensity = 8.0 * (1 - t);
      },
      onComplete: () => {
        this.scene.remove(flashLight);
      }
    });

    // 2. Ondas de choque no chão
    this.spawnShockwaveRing(pos, { hex: 0xff3b30 }, 1.8);
    setTimeout(() => {
      this.spawnShockwaveRing(pos, { hex: 0xffaa00 }, 1.3);
    }, 60);

    // 3. Screen shake tátil
    this.triggerScreenShake(420, 'super');

    // 4. Confetes e faíscas estelares
    confetti({
      particleCount: 110,
      spread: 90,
      origin: { y: 0.55 },
      colors: ['#ef4444', '#f97316', '#fbbf24', '#ffffff', '#dc2626']
    });

    // 5. Partículas 3D densas de fogo e estilhaços
    const particleColors = [0xff2200, 0xff7700, 0xffcc00, 0xffffff, 0x333333];
    for (let i = 0; i < 45; i++) {
      const color = particleColors[Math.floor(Math.random() * particleColors.length)];
      const geom = new THREE.BoxGeometry(0.12, 0.12, 0.12);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 });
      const mesh = new THREE.Mesh(geom, mat);

      mesh.position.set(
        pos.x + (Math.random() - 0.5) * 0.4,
        pos.y + Math.random() * 0.5,
        pos.z + (Math.random() - 0.5) * 0.4
      );

      const angle = Math.random() * Math.PI * 2;
      const speed = 4.5 + Math.random() * 6.5;
      const vx = Math.cos(angle) * speed;
      const vz = Math.sin(angle) * speed;
      const vy = 4.0 + Math.random() * 6.0;

      this.scene.add(mesh);

      this.particles.push({
        mesh,
        vx,
        vy,
        vz,
        rx: (Math.random() - 0.5) * 20,
        ry: (Math.random() - 0.5) * 20,
        life: 0.85,
        baseScale: Math.random() * 0.5 + 0.8
      });
    }
  }

  /**
   * Vórtice 3D de sorte com partículas em espiral esmeralda e douradas descendo sobre o deque
   * @param {Array<THREE.Vector3>} deckPositions Posições dos pedestais do deque
   * @param {Object} options Opções de duração e callback
   */
  async launchCloverVortex3D(deckPositions, options = {}) {
    const duration = options.duration || 680;
    const startOrigin = new THREE.Vector3(3.8, 4.5, 4.0); // Origem do booster lateral direito

    return new Promise((resolve) => {
      // 1. Luz esmeralda mágica ambiente
      const cloverLight = new THREE.PointLight(0x10b981, 6.0, 15.0);
      cloverLight.position.copy(startOrigin);
      this.scene.add(cloverLight);

      // 2. Criar partículas do vórtice espiral
      const particleCount = 45;
      const vortexMeshes = [];
      const particleColors = [0x22c55e, 0x10b981, 0x34d399, 0xfbbf24, 0xffea00, 0xffffff];

      for (let i = 0; i < particleCount; i++) {
        const color = particleColors[i % particleColors.length];
        const isStar = i % 3 === 0;
        const geom = isStar ? new THREE.OctahedronGeometry(0.11, 0) : new THREE.SphereGeometry(0.08, 6, 6);
        const mat = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.95
        });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.copy(startOrigin);
        this.scene.add(mesh);

        const targetSlotPos = deckPositions[i % deckPositions.length] || new THREE.Vector3(0, 0, 5.6);
        const phaseOffset = (i / particleCount) * Math.PI * 4;
        const spiralRadius = 1.2 + Math.random() * 0.8;
        const arcHeight = 2.5 + Math.random() * 1.5;

        vortexMeshes.push({
          mesh,
          targetPos: targetSlotPos,
          phaseOffset,
          spiralRadius,
          arcHeight
        });
      }

      this.addAnimation({
        duration,
        easing: (t) => t * t * (3 - 2 * t), // Smoothstep
        onUpdate: (progress) => {
          // Movimentar ponto de luz em direção ao centro do deque
          const centerDeck = new THREE.Vector3(0, 0.8, 5.6);
          cloverLight.position.lerpVectors(startOrigin, centerDeck, progress);
          cloverLight.intensity = 6.0 * (1 - progress * 0.3);

          // Atualizar partículas em rotação espiral parabólica
          vortexMeshes.forEach((item) => {
            const p = progress;
            const currentPos = new THREE.Vector3().lerpVectors(startOrigin, item.targetPos, p);

            // Altura do arco
            currentPos.y += Math.sin(p * Math.PI) * item.arcHeight;

            // Rotação em espiral (vórtice)
            const angle = item.phaseOffset + p * Math.PI * 6;
            const radius = item.spiralRadius * (1 - p * 0.7);
            currentPos.x += Math.cos(angle) * radius;
            currentPos.z += Math.sin(angle) * (radius * 0.6);

            item.mesh.position.copy(currentPos);
            item.mesh.rotation.x += 0.15;
            item.mesh.rotation.y += 0.2;
            item.mesh.scale.setScalar(Math.max(0.2, (1 - p * 0.3) * 1.2));
          });
        },
        onComplete: () => {
          // Remover partículas e luz do vórtice
          this.scene.remove(cloverLight);
          vortexMeshes.forEach((item) => {
            this.scene.remove(item.mesh);
            if (item.mesh.geometry) item.mesh.geometry.dispose();
            if (item.mesh.material) item.mesh.material.dispose();
          });

          // Disparar efeitos de impacto e dispersão nos pedestais
          this.triggerCloverBurst3D(deckPositions);

          if (options.onImpact) {
            options.onImpact();
          }
          resolve();
        }
      });
    });
  }

  /**
   * Impacto e explosão mágica de sorte nos 3 pedestais do deque
   */
  triggerCloverBurst3D(deckPositions) {
    // 1. Ondas de choque esmeralda e douradas em cada slot do deque
    deckPositions.forEach((pos, idx) => {
      setTimeout(() => {
        this.spawnShockwaveRing(pos, { hex: 0x10b981 }, 1.4);
        setTimeout(() => {
          this.spawnShockwaveRing(pos, { hex: 0xfbbf24 }, 1.1);
        }, 50);
      }, idx * 45);
    });

    // 2. Flash de luz PointLight no deque
    const burstLight = new THREE.PointLight(0x22c55e, 5.0, 10.0);
    burstLight.position.set(0, 1.2, 5.6);
    this.scene.add(burstLight);

    this.addAnimation({
      duration: 300,
      easing: (t) => 1 - t,
      onUpdate: (t) => {
        burstLight.intensity = 5.0 * (1 - t);
      },
      onComplete: () => {
        this.scene.remove(burstLight);
      }
    });

    // 3. Chuva de confetes esmeralda e dourados com canvas-confetti
    confetti({
      particleCount: 85,
      spread: 80,
      origin: { y: 0.72 },
      colors: ['#22c55e', '#10b981', '#34d399', '#fbbf24', '#fef08a', '#ffffff']
    });

    // 4. Partículas cintilantes ascendentes de poeira mágica (Fairy motes)
    const particleColors = [0x22c55e, 0x10b981, 0x34d399, 0xfbbf24, 0xffffff];
    for (let i = 0; i < 35; i++) {
      const color = particleColors[Math.floor(Math.random() * particleColors.length)];
      const geom = new THREE.OctahedronGeometry(0.09, 0);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 });
      const mesh = new THREE.Mesh(geom, mat);

      const targetPos = deckPositions[i % deckPositions.length];
      mesh.position.set(
        targetPos.x + (Math.random() - 0.5) * 0.8,
        targetPos.y + Math.random() * 0.4 + 0.1,
        targetPos.z + (Math.random() - 0.5) * 0.8
      );

      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 2.2;
      const vx = Math.cos(angle) * speed;
      const vz = Math.sin(angle) * speed;
      const vy = 2.5 + Math.random() * 3.5;

      this.scene.add(mesh);

      this.particles.push({
        mesh,
        vx,
        vy,
        vz,
        rx: (Math.random() - 0.5) * 12,
        ry: (Math.random() - 0.5) * 12,
        life: 0.75,
        baseScale: Math.random() * 0.4 + 0.8
      });
    }
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

