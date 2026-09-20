/**
 * SoundSystem.js
 * Procedural Web Audio API sound generator for Hexa Sort 3D.
 * Provides ASMR card sliding, snapping, merge cascading, fanfares, and ambient UI clicks.
 */

export class SoundSystem {
  constructor() {
    this.audioCtx = null;
    this.muted = false;
    this.initAudioContext();
  }

  initAudioContext() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
  }

  resume() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  /**
   * Sound when picking up a stack of cards
   */
  playPick() {
    if (this.muted) return;
    this.resume();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(540, now + 0.08);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  /**
   * Sound when placing / snapping a stack onto a board slot
   */
  playSnap() {
    if (this.muted) return;
    this.resume();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // Wood/plastic snap click
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.06);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  /**
   * Crisp ASMR card sliding / merging tick
   * @param {number} pitchStep Sequential step count in the cascade to create ascending musicality
   */
  playCardSlide(pitchStep = 0) {
    if (this.muted) return;
    this.resume();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // Base pitch scales with merge cascade steps
    const baseFreq = 440 * Math.pow(1.05946, Math.min(pitchStep, 16)); // chromatic step

    // High crisp transient
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.05);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(baseFreq * 2, now);
    filter.Q.setValueAtTime(3, now);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  /**
   * Major 10-card stack clear pop / explosion fanfare
   * Scales pitch & harmonics with combo progression and super explosions
   */
  playStackClear(comboCount = 1, isSuperExplosion = false) {
    if (this.muted) return;
    this.resume();
    if (!this.audioCtx) return;

    if (isSuperExplosion || comboCount >= 15) {
      this.playSuperExplosionFanfare(comboCount);
      return;
    }

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // Sparkly chime arpeggio (C Major / pentatonic)
    // For combos 10+, add extra octave clarity and shimmering upper tier
    const isMega = comboCount >= 10;
    const baseNotes = isMega
      ? [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98, 2093.00]
      : [523.25, 659.25, 783.99, 1046.50, 1318.51];
    const pitchScale = Math.min(2.2, 1 + (comboCount - 1) * (isMega ? 0.08 : 0.12));
    const notes = baseNotes.map(n => n * pitchScale);

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = isMega ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.038);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.setValueAtTime(isMega ? 0.18 : 0.15, now + idx * 0.038);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.038 + (isMega ? 0.48 : 0.35));

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.038);
      osc.stop(now + idx * 0.038 + (isMega ? 0.50 : 0.36));
    });

    // Sub-bass warm punch for mega combos (10+)
    if (isMega) {
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(160, now);
      subOsc.frequency.exponentialRampToValueAtTime(55, now + 0.28);

      subGain.gain.setValueAtTime(0.22, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 0.29);
    }
  }

  /**
   * Special triumphant fanfare and sub-bass drop for Super Explosions (15+)
   */
  playSuperExplosionFanfare(comboCount = 15) {
    if (this.muted || !this.audioCtx) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // 1. Deep impact sub-bass rumble
    const bassOsc = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bassOsc.type = 'triangle';
    bassOsc.frequency.setValueAtTime(140, now);
    bassOsc.frequency.exponentialRampToValueAtTime(38, now + 0.45);

    bassGain.gain.setValueAtTime(0.35, now);
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    bassOsc.connect(bassGain);
    bassGain.connect(ctx.destination);
    bassOsc.start(now);
    bassOsc.stop(now + 0.46);

    // 2. Ascending Glorious Fanfare Chord Progression
    const fanfareNotes = [
      { freq: 523.25, time: 0.00 }, // C5
      { freq: 659.25, time: 0.05 }, // E5
      { freq: 783.99, time: 0.10 }, // G5
      { freq: 1046.50, time: 0.15 }, // C6
      { freq: 1318.51, time: 0.20 }, // E6
      { freq: 1567.98, time: 0.25 }, // G6
      { freq: 2093.00, time: 0.30 }  // C7
    ];

    fanfareNotes.forEach(({ freq, time }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + time);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.setValueAtTime(0.22, now + time);
      gain.gain.exponentialRampToValueAtTime(0.001, now + time + 0.65);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + 0.68);
    });

    // 3. Shimmering high glitter sweep
    const shimmerOsc = ctx.createOscillator();
    const shimmerGain = ctx.createGain();
    shimmerOsc.type = 'sine';
    shimmerOsc.frequency.setValueAtTime(1200, now + 0.25);
    shimmerOsc.frequency.exponentialRampToValueAtTime(2800, now + 0.60);

    shimmerGain.gain.setValueAtTime(0.001, now);
    shimmerGain.gain.setValueAtTime(0.12, now + 0.25);
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.70);

    shimmerOsc.connect(shimmerGain);
    shimmerGain.connect(ctx.destination);
    shimmerOsc.start(now + 0.25);
    shimmerOsc.stop(now + 0.72);
  }

  /**
   * Game Over dramatic descending chord
   */
  playGameOver() {
    if (this.muted) return;
    this.resume();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const freqs = [330, 293.66, 261.63, 220];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.setValueAtTime(0.1, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.42);
    });
  }

  /**
   * General UI button click sound
   */
  playClick() {
    if (this.muted) return;
    this.resume();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.03);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.03);
  }

  /**
   * Level up celebratory fanfare (harmonic chord progression)
   */
  playLevelUp() {
    if (this.muted) return;
    this.resume();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // Upward pentatonic arpeggio with celebratory shimmer
    const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.51];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.setValueAtTime(0.14, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.46);
    });
  }

  /**
   * Crisp, tactile card deal arrival whoosh/snap
   * @param {number} step Index of the card slot (0, 1, 2) to give an ascending musical deal
   */
  playDeckDeal(step = 0) {
    if (this.muted) return;
    this.resume();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // Fast whoosh-snap sound
    const baseFreq = 260 * Math.pow(1.18, step);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq * 1.8, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.8, now + 0.07);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.07);
  }

  /**
   * Impactante efeito sonoro elétrico de Raio e Trovão
   */
  playThunder() {
    if (this.muted) return;
    this.resume();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // 1. Estalo elétrico agudo inicial (Lightning crack)
    const crackOsc = ctx.createOscillator();
    const crackGain = ctx.createGain();
    crackOsc.type = 'sawtooth';
    crackOsc.frequency.setValueAtTime(1200, now);
    crackOsc.frequency.exponentialRampToValueAtTime(150, now + 0.12);

    crackGain.gain.setValueAtTime(0.35, now);
    crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    crackOsc.connect(crackGain);
    crackGain.connect(ctx.destination);
    crackOsc.start(now);
    crackOsc.stop(now + 0.15);

    // 2. Estrondo grave de trovão (Thunder rumble)
    const rumbleOsc = ctx.createOscillator();
    const rumbleGain = ctx.createGain();
    rumbleOsc.type = 'triangle';
    rumbleOsc.frequency.setValueAtTime(95, now + 0.04);
    rumbleOsc.frequency.linearRampToValueAtTime(45, now + 0.55);

    rumbleGain.gain.setValueAtTime(0.001, now);
    rumbleGain.gain.setValueAtTime(0.4, now + 0.05);
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    rumbleOsc.connect(rumbleGain);
    rumbleGain.connect(ctx.destination);
    rumbleOsc.start(now + 0.04);
    rumbleOsc.stop(now + 0.65);
  }

  /**
   * Efeito sonoro de embaralhamento / atualização rápida do deque (Re-roll)
   */
  playShuffle() {
    if (this.muted) return;
    this.resume();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // Sequência rápida de 4 cliques suaves de cartas deslizando
    for (let i = 0; i < 4; i++) {
      const t = now + i * 0.045;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(380 + i * 45, t);
      osc.frequency.exponentialRampToValueAtTime(200, t + 0.04);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.05);
    }
  }

  /**
   * Fanfarra brilhante de confirmação de pagamento / compra de power-up
   */
  playPurchaseSuccess() {
    if (this.muted) return;
    this.resume();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 (Acorde Maior brilhante)

    notes.forEach((freq, i) => {
      const t = now + i * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.16, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.36);
    });
  }

  /**
   * Efeito sonoro de propulsão e decolagem do Foguete (Rocket Launch)
   */
  playRocketLaunch() {
    if (this.muted) return;
    this.resume();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // 1. Silvo crescente de turbina / propulsão a jato
    const whooshOsc = ctx.createOscillator();
    const whooshGain = ctx.createGain();
    whooshOsc.type = 'sawtooth';
    whooshOsc.frequency.setValueAtTime(140, now);
    whooshOsc.frequency.exponentialRampToValueAtTime(720, now + 0.55);

    // Filtro passa-baixa dinâmico para dar corpo de ar comprimido
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(2200, now + 0.55);

    whooshGain.gain.setValueAtTime(0.01, now);
    whooshGain.gain.linearRampToValueAtTime(0.25, now + 0.35);
    whooshGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    whooshOsc.connect(filter);
    filter.connect(whooshGain);
    whooshGain.connect(ctx.destination);

    whooshOsc.start(now);
    whooshOsc.stop(now + 0.62);

    // 2. Ruído de combustão / chama de motor
    try {
      const bufferSize = ctx.sampleRate * 0.55;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(600, now);
      noiseFilter.frequency.exponentialRampToValueAtTime(1400, now + 0.55);
      noiseFilter.Q.setValueAtTime(2.0, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.01, now);
      noiseGain.gain.linearRampToValueAtTime(0.18, now + 0.3);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      whiteNoise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      whiteNoise.start(now);
      whiteNoise.stop(now + 0.56);
    } catch (e) {
      // Fallback gracioso se AudioBuffer falhar
    }
  }

  /**
   * Efeito sonoro de impacto e detonação volumétrica do Foguete (Rocket Explosion)
   */
  playRocketExplosion() {
    if (this.muted) return;
    this.resume();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // 1. Punch inicial de impacto sub-grave
    const punchOsc = ctx.createOscillator();
    const punchGain = ctx.createGain();
    punchOsc.type = 'triangle';
    punchOsc.frequency.setValueAtTime(160, now);
    punchOsc.frequency.exponentialRampToValueAtTime(32, now + 0.45);

    punchGain.gain.setValueAtTime(0.45, now);
    punchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);

    punchOsc.connect(punchGain);
    punchGain.connect(ctx.destination);
    punchOsc.start(now);
    punchOsc.stop(now + 0.5);

    // 2. Ruído de explosão / fragmentos reverberantes
    try {
      const bufferSize = ctx.sampleRate * 0.65;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.15));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, now);
      filter.frequency.exponentialRampToValueAtTime(120, now + 0.6);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.35, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + 0.66);
    } catch (e) {}
  }

  /**
   * Efeito sonoro mágico do Trevo da Sorte (Clover Crystal Chime Arpeggio)
   * Síntese de harpa/chime cintilante ascendente com harmônicos cristalinos
   */
  playCloverChime() {
    if (this.muted) return;
    this.resume();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // Escala arpejada mágica (C5, E5, G5, B5, D6, G6)
    const notes = [523.25, 659.25, 783.99, 987.77, 1174.66, 1567.98];

    notes.forEach((freq, i) => {
      const startTime = now + i * 0.065;
      const duration = 0.45;

      // 1. Oscilador Principal (senoide pura de sino de cristal)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.14, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.05);

      // 2. Harmônico cintilante agudo (brilho estelar / fairy dust)
      const harmonicOsc = ctx.createOscillator();
      const harmonicGain = ctx.createGain();
      harmonicOsc.type = 'triangle';
      harmonicOsc.frequency.setValueAtTime(freq * 2.02, startTime);

      harmonicGain.gain.setValueAtTime(0.001, startTime);
      harmonicGain.gain.linearRampToValueAtTime(0.05, startTime + 0.02);
      harmonicGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration * 0.7);

      harmonicOsc.connect(harmonicGain);
      harmonicGain.connect(ctx.destination);

      harmonicOsc.start(startTime);
      harmonicOsc.stop(startTime + duration * 0.75);
    });
  }

  /**
   * Efeito sonoro suave e melancólico de Fim de Partida (Game Over)
   * Síntese de acordes menores descendentes aveludados com filtro passa-baixa
   */
  playGameOver() {
    if (this.muted) return;
    this.resume();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // Progressão descendente menor suave (Eb4 -> C4 -> G3 -> C3)
    const notes = [311.13, 261.63, 196.00, 130.81];

    notes.forEach((freq, i) => {
      const startTime = now + i * 0.16;
      const duration = 0.55;

      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.96, startTime + duration);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, startTime);
      filter.frequency.exponentialRampToValueAtTime(350, startTime + duration);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.18, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.05);
    });
  }

  /**
   * Fanfarra triunfante e estelar de Revive (Segunda Chance / Partida Salva)
   * Arpeggio ascendente brilhante com harmônicos cintilantes e sub-kick de renascimento
   */
  playRevive() {
    if (this.muted) return;
    this.resume();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // 1. Sub-punch inicial de energia (Heartbeat / Spark of life)
    const heartOsc = ctx.createOscillator();
    const heartGain = ctx.createGain();
    heartOsc.type = 'sine';
    heartOsc.frequency.setValueAtTime(80, now);
    heartOsc.frequency.exponentialRampToValueAtTime(220, now + 0.12);

    heartGain.gain.setValueAtTime(0.001, now);
    heartGain.gain.linearRampToValueAtTime(0.25, now + 0.02);
    heartGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    heartOsc.connect(heartGain);
    heartGain.connect(ctx.destination);
    heartOsc.start(now);
    heartOsc.stop(now + 0.22);

    // 2. Acorde arpejado ascendente vitorioso (C4, G4, C5, E5, G5, C6)
    const notes = [261.63, 392.00, 523.25, 659.25, 783.99, 1046.50];

    notes.forEach((freq, i) => {
      const startTime = now + 0.04 + i * 0.055;
      const duration = 0.42;

      // Corpo principal do tom (senoide cristalina)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.18, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration + 0.05);

      // Shimmer estelar de alta frequência
      const shimmer = ctx.createOscillator();
      const shimmerGain = ctx.createGain();
      shimmer.type = 'triangle';
      shimmer.frequency.setValueAtTime(freq * 2, startTime);

      shimmerGain.gain.setValueAtTime(0.001, startTime);
      shimmerGain.gain.linearRampToValueAtTime(0.07, startTime + 0.02);
      shimmerGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration * 0.7);

      shimmer.connect(shimmerGain);
      shimmerGain.connect(ctx.destination);
      shimmer.start(startTime);
      shimmer.stop(startTime + duration * 0.75);
    });
  }
}




