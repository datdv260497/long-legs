(() => {
  'use strict';

  // ==========================================
  // 1. YOUTUBE PLAYABLES ADAPTER
  // ==========================================
  class YouTubePlayablesAdapter {
    constructor() {
      this.isPlayablesEnv = typeof window.ytgame !== 'undefined' && window.ytgame?.IN_PLAYABLES_ENV === true;
      this.onPauseCb = null;
      this.onResumeCb = null;
      this.onAudioChangeCb = null;
    }

    isPlayables() {
      return this.isPlayablesEnv;
    }

    init(onPause, onResume, onAudioChange) {
      this.onPauseCb = onPause;
      this.onResumeCb = onResume;
      this.onAudioChangeCb = onAudioChange;

      if (typeof window.ytgame !== 'undefined' && window.ytgame?.system) {
        try {
          window.ytgame.system.onPause(() => this.onPauseCb?.());
          window.ytgame.system.onResume(() => this.onResumeCb?.());
          window.ytgame.system.onAudioEnabledChange((enabled) => this.onAudioChangeCb?.(enabled));
        } catch (e) {
          console.warn('YT Playables SDK init error:', e);
        }
      }
    }

    notifyFirstFrameReady() {
      if (typeof window.ytgame !== 'undefined' && window.ytgame?.game?.firstFrameReady) {
        try { window.ytgame.game.firstFrameReady(); } catch (e) {}
      }
    }

    notifyGameReady() {
      if (typeof window.ytgame !== 'undefined' && window.ytgame?.game?.gameReady) {
        try { window.ytgame.game.gameReady(); } catch (e) {}
      }
    }

    isAudioEnabled() {
      if (typeof window.ytgame !== 'undefined' && window.ytgame?.system?.isAudioEnabled) {
        try { return window.ytgame.system.isAudioEnabled(); } catch (e) {}
      }
      return true;
    }

    async sendScore(score) {
      if (typeof window.ytgame !== 'undefined' && window.ytgame?.game?.sendScore) {
        try {
          await window.ytgame.game.sendScore({ score });
          return true;
        } catch (e) {
          console.warn('sendScore error:', e);
        }
      }
      return false;
    }

    async loadScore() {
      if (typeof window.ytgame !== 'undefined' && window.ytgame?.game?.loadScore) {
        try {
          const res = await window.ytgame.game.loadScore();
          if (res && typeof res.score === 'number') {
            return res.score;
          }
        } catch (e) {
          console.warn('loadScore error:', e);
        }
      }
      return null;
    }
  }

  // ==========================================
  // 2. AUDIO MANAGER (Web Audio API Synthesizer)
  // ==========================================
  class AudioManager {
    constructor() {
      this.ctx = null;
      this.isMuted = false;
      this.stretchOsc = null;
      this.stretchGain = null;
      this.isStretchingSoundPlaying = false;
    }

    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    setMute(muted) {
      this.isMuted = muted;
      if (muted && this.stretchGain) {
        this.stretchGain.gain.setValueAtTime(0, this.ctx.currentTime);
      }
    }

    toggleMute() {
      this.setMute(!this.isMuted);
      return this.isMuted;
    }

    playStep(pitchMod = 1.0) {
      if (this.isMuted || !this.ctx) return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140 * pitchMod, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.05);

        gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
      } catch (e) {}
    }

    playLanding() {
      if (this.isMuted || !this.ctx) return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(90, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(20, this.ctx.currentTime + 0.09);

        gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.09);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.09);
      } catch (e) {}
    }

    playFall() {
      if (this.isMuted || !this.ctx) return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.45);

        gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.45);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.45);
      } catch (e) {}
    }

    setStretchSound(isStretching, legRatio = 0.5) {
      if (this.isMuted || !this.ctx) return;
      try {
        if (isStretching) {
          if (!this.stretchOsc) {
            this.stretchOsc = this.ctx.createOscillator();
            this.stretchGain = this.ctx.createGain();
            this.stretchOsc.type = 'sine';
            this.stretchOsc.frequency.setValueAtTime(110, this.ctx.currentTime);
            this.stretchGain.gain.setValueAtTime(0, this.ctx.currentTime);
            this.stretchOsc.connect(this.stretchGain);
            this.stretchGain.connect(this.ctx.destination);
            this.stretchOsc.start();
          }
          const targetFreq = 110 + legRatio * 180;
          this.stretchOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.05);
          this.stretchGain.gain.setTargetAtTime(0.12, this.ctx.currentTime, 0.05);
        } else if (this.stretchGain) {
          this.stretchGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
        }
      } catch (e) {}
    }

    stopStretchSound() {
      if (this.stretchGain && this.ctx) {
        try {
          this.stretchGain.gain.setValueAtTime(0, this.ctx.currentTime);
        } catch (e) {}
      }
    }
  }

  // ==========================================
  // 3. INPUT MANAGER
  // ==========================================
  class InputManager {
    constructor(onActionTrigger) {
      this.isStretching = false;
      this.onActionTrigger = onActionTrigger;
      this.isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
      this.setupListeners();
    }

    setupListeners() {
      window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
          e.preventDefault();
          if (!this.isStretching) {
            this.isStretching = true;
            this.onActionTrigger?.();
          }
        }
      });

      window.addEventListener('keyup', (e) => {
        if (e.code === 'Space') {
          e.preventDefault();
          this.isStretching = false;
        }
      });

      window.addEventListener('pointerdown', (e) => {
        // Prevent triggering on audio button or UI buttons
        if (e.target.closest('#audioBtn') || e.target.closest('button')) return;
        e.preventDefault();
        if (!this.isStretching) {
          this.isStretching = true;
          this.onActionTrigger?.();
        }
      });

      const releaseStretch = () => { this.isStretching = false; };
      window.addEventListener('pointerup', releaseStretch);
      window.addEventListener('pointercancel', releaseStretch);
      window.addEventListener('blur', releaseStretch);
    }
  }

  // ==========================================
  // 4. SEEDED PRNG FOR LEVEL GENERATION
  // ==========================================
  class SeededRandom {
    constructor(seed = 1234567) {
      this.seed = seed;
    }
    next() {
      this.seed = (this.seed * 9301 + 49297) % 233280;
      return this.seed / 233280;
    }
    range(min, max) {
      return min + this.next() * (max - min);
    }
  }

  // ==========================================
  // 5. PLATFORM MANAGER & RHYTHMIC GAP GENERATION
  // ==========================================
  class PlatformManager {
    constructor() {
      this.platforms = [];
      this.rng = new SeededRandom(Date.now());
      this.groundY = 0;
      this.platformCount = 0;
    }

    reset(screenHeight, initialX = -120) {
      this.platforms = [];
      this.groundY = Math.floor(screenHeight * 0.72);
      this.rng = new SeededRandom(Math.floor(Math.random() * 1000000));
      this.platformCount = 0;

      // Extended initial onboarding platform (520px wide) so player can practice walking & stretching safely
      const startWidth = 520;
      const startHeight = 50;
      this.platforms.push({
        x: initialX,
        y: this.groundY - startHeight,
        w: startWidth,
        h: startHeight
      });

      let currentX = initialX + startWidth;
      for (let i = 0; i < 15; i++) {
        currentX = this.generateNextPlatform(currentX, 0);
      }
    }

    getDifficultyTier(distance) {
      if (distance < 300) return 'EASY';
      if (distance < 800) return 'NORMAL';
      if (distance < 1500) return 'HARD';
      return 'EXTREME';
    }

    generateNextPlatform(currentX, distance) {
      this.platformCount++;
      const tier = this.getDifficultyTier(distance);
      const prev = this.platforms[this.platforms.length - 1];

      // Rhythmic platform sequence:
      // 1. STRETCH GAP (Wide gap: 80-110px -> REQUIRES HOLDING SPACE)
      // 2. NARROW PRECISION PLATFORM (Narrow width: 58-70px in EASY -> REQUIRES RELEASING SPACE)
      // 3. RECOVERY LANDING PLATFORM (Extra wide: 220-280px after narrow platforms)

      const isNarrowPlatform = (this.platformCount % 4 === 0) || (tier !== 'EASY' && this.platformCount % 5 === 0);
      const isStretchGap = !isNarrowPlatform && ((this.platformCount % 3 === 0) || (tier !== 'EASY' && this.platformCount % 2 === 0));

      let gap, width, height;

      if (prev.isNarrow) {
        // Recovery Platform immediately after a narrow platform (Platform #5!)
        // Small gap (32-42px), extra wide landing platform (220-280px)
        gap = Math.floor(this.rng.range(32, 42));
        width = Math.floor(this.rng.range(220, 280));
      } else if (isNarrowPlatform) {
        // NARROW PRECISION PLATFORM: Small gap (35-45px), Narrow width (58-70px in EASY)
        // Holding SPACE causes giant 170px stride to OVERSTEP this narrow platform into the gap!
        // Releasing SPACE shortens stride to 44px, allowing clean landing!
        gap = Math.floor(this.rng.range(35, 45));
        width = (tier === 'EASY') ? Math.floor(this.rng.range(58, 70)) : Math.floor(this.rng.range(42, 55));
      } else if (isStretchGap) {
        // Wide Gap requiring MAX_LEG_LENGTH stretch (80px to 175px)
        switch (tier) {
          case 'EASY':
            gap = Math.floor(this.rng.range(80, 105));
            width = Math.floor(this.rng.range(200, 270)); // Extra wide safe landing platform
            break;
          case 'NORMAL':
            gap = Math.floor(this.rng.range(105, 135));
            width = Math.floor(this.rng.range(150, 210));
            break;
          case 'HARD':
            gap = Math.floor(this.rng.range(125, 155));
            width = Math.floor(this.rng.range(120, 170));
            break;
          case 'EXTREME':
          default:
            gap = Math.floor(this.rng.range(145, 175));
            width = Math.floor(this.rng.range(90, 140));
            break;
        }
      } else {
        // Standard Walk Platform
        gap = Math.floor(this.rng.range(35, 50));
        switch (tier) {
          case 'EASY':
            width = Math.floor(this.rng.range(170, 240));
            break;
          case 'NORMAL':
            width = Math.floor(this.rng.range(120, 180));
            break;
          case 'HARD':
            width = Math.floor(this.rng.range(90, 140));
            break;
          case 'EXTREME':
          default:
            width = Math.floor(this.rng.range(75, 120));
            break;
        }
      }

      // Height is constant (50) in EASY mode to prevent early vertical stumbling!
      height = (tier === 'EASY') ? 50 : Math.floor(this.rng.range(25, 80));

      const newX = prev.x + prev.w + gap;
      const newY = this.groundY - height;

      const newPlatform = {
        x: newX,
        y: newY,
        w: width,
        h: height,
        isStretchGap: isStretchGap,
        isNarrow: isNarrowPlatform
      };

      this.platforms.push(newPlatform);
      return newX + width;
    }

    update(playerX, screenWidth, distance) {
      const lastP = this.platforms[this.platforms.length - 1];
      if (lastP.x + lastP.w < playerX + screenWidth * 2) {
        this.generateNextPlatform(lastP.x + lastP.w, distance);
      }

      // Clean up past platforms
      while (this.platforms.length > 0 && this.platforms[0].x + this.platforms[0].w < playerX - screenWidth) {
        this.platforms.shift();
      }
    }
  }

  // ==========================================
  // 6. LEG & PLAYER SYSTEM (2-Segment IK Physics)
  // ==========================================
  const MIN_LEG_LENGTH = 45;
  const MAX_LEG_LENGTH = 150;

  class Leg {
    constructor(isLeft) {
      this.isLeft = isLeft;
      this.footX = 0;
      this.footY = 0;
      this.startX = 0;
      this.startY = 0;
      this.targetX = 0;
      this.targetY = 0;
      this.kneeX = 0;
      this.kneeY = 0;
      this.state = 'STANCE'; // 'STANCE' or 'SWING'
      this.swingProgress = 1.0;
    }

    startSwing(startX, startY, targetX, targetY) {
      this.state = 'SWING';
      this.swingProgress = 0;
      this.startX = startX;
      this.startY = startY;
      this.targetX = targetX;
      this.targetY = targetY;
    }

    update(dt, hipX, hipY, legLength, swingSpeed, stretchRatio, audioManager, spawnDustCb) {
      if (this.state === 'SWING') {
        this.swingProgress += dt * swingSpeed;
        if (this.swingProgress >= 1.0) {
          this.swingProgress = 1.0;
          this.state = 'STANCE';
          this.footX = this.targetX;
          this.footY = this.targetY;
          audioManager.playStep(1.0 + (this.isLeft ? 0.08 : -0.08));
          spawnDustCb?.(this.footX, this.footY);
        } else {
          const p = this.swingProgress;
          const easeP = Math.sin(p * Math.PI * 0.5);
          this.footX = this.startX + (this.targetX - this.startX) * easeP;
          const arcHeight = (18 + stretchRatio * 20) * Math.sin(p * Math.PI);
          this.footY = this.startY + (this.targetY - this.startY) * p - arcHeight;
        }
      }
      // In STANCE mode: footX and footY remain locked at world planted coordinate!
      this.updateIK(hipX, hipY, legLength);
    }

    updateIK(hipX, hipY, legLength) {
      const l1 = legLength * 0.52; // Upper leg
      const l2 = legLength * 0.48; // Lower leg

      const dx = this.footX - hipX;
      const dy = this.footY - hipY;
      const dist = Math.max(1, Math.min(l1 + l2 - 0.1, Math.hypot(dx, dy)));

      const angleToFoot = Math.atan2(dy, dx);
      const cosKnee = Math.max(-1, Math.min(1, (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist)));
      const alpha = Math.acos(cosKnee);

      // Bend direction: knees flex outwards slightly to look funny/natural
      const bendDir = this.isLeft ? -1 : 1;
      const kneeAngle = angleToFoot + alpha * bendDir * 0.45;

      this.kneeX = hipX + Math.cos(kneeAngle) * l1;
      this.kneeY = hipY + Math.sin(kneeAngle) * l1;
    }
  }

  class Player {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = 90;
      this.y = 0;
      this.vx = 0;
      this.vy = 0;
      this.bodyW = 26;
      this.bodyH = 32;
      this.legLength = MIN_LEG_LENGTH;
      this.targetLegLength = MIN_LEG_LENGTH;

      this.leftLeg = new Leg(true);
      this.rightLeg = new Leg(false);

      this.bodyRotation = 0;
      this.bodyWobble = 0;
      this.isFalling = false;
      this.fallRotation = 0;
      this.onGround = true;
    }

    initPosition(platformY) {
      this.y = platformY - this.bodyH - MIN_LEG_LENGTH;
      const hipX = this.x + this.bodyW / 2;
      const hipY = this.y + this.bodyH - 2;

      this.leftLeg.footX = hipX - 10;
      this.leftLeg.footY = platformY;
      this.leftLeg.state = 'STANCE';
      this.leftLeg.swingProgress = 1.0;

      this.rightLeg.footX = hipX + 10;
      this.rightLeg.footY = platformY;
      this.rightLeg.state = 'STANCE';
      this.rightLeg.swingProgress = 1.0;
    }

    update(dt, isStretching, speedMult, platforms, audioManager, spawnDustCb) {
      if (this.isFalling) {
        this.vy += 0.0016 * dt * dt;
        this.y += this.vy;
        this.fallRotation += 0.08;
        return;
      }

      // 1. Smooth Leg Length Interpolation
      this.targetLegLength = isStretching ? MAX_LEG_LENGTH : MIN_LEG_LENGTH;
      this.legLength += (this.targetLegLength - this.legLength) * Math.min(1, dt * 0.012);

      const stretchRatio = (this.legLength - MIN_LEG_LENGTH) / (MAX_LEG_LENGTH - MIN_LEG_LENGTH);

      // Audio hum for stretching
      audioManager.setStretchSound(isStretching, stretchRatio);

      // 2. Speed vs Leg Length Tradeoff
      // Short legs: fast (3.2px/frame) | Long legs: slower (2.05px/frame)
      const baseSpeed = 3.2 - stretchRatio * 1.15;
      const forwardMove = baseSpeed * speedMult * (dt / 16.6);
      this.x += forwardMove;

      const hipX = this.x + this.bodyW / 2;
      const hipY = this.y + this.bodyH - 2;

      // 3. Physical Stepping Trigger Logic
      // Stride distance scales up to 170px when legLength = 150
      const strideDistance = 44 + stretchRatio * 126;
      const swingSpeed = (0.008 + stretchRatio * 0.004) * speedMult;

      // Update both legs
      this.leftLeg.update(dt, hipX, hipY, this.legLength, swingSpeed, stretchRatio, audioManager, spawnDustCb);
      this.rightLeg.update(dt, hipX, hipY, this.legLength, swingSpeed, stretchRatio, audioManager, spawnDustCb);

      // Trigger a step if both legs are in STANCE and body has advanced past trailing foot
      if (this.leftLeg.state === 'STANCE' && this.rightLeg.state === 'STANCE') {
        const trailingLeg = (this.leftLeg.footX < this.rightLeg.footX) ? this.leftLeg : this.rightLeg;

        if (hipX - trailingLeg.footX > strideDistance * 0.32) {
          const targetFootX = hipX + strideDistance * 0.72;
          let targetFootY = hipY + this.legLength; // default if gap

          // Find platform beneath target step position (or ahead up to 0.85 stride)
          // For narrow precision platforms (w <= 55), holding SPACE creates a giant 170px stride
          // that causes targetFootX to overshoot past pl.x + pl.w into the gap behind it!
          for (const pl of platforms) {
            const margin = (pl.w <= 55) ? 2 : 12;
            if (targetFootX >= pl.x - margin && targetFootX <= pl.x + pl.w - margin) {
              if (Math.abs((hipY + this.legLength) - pl.y) < 65) {
                targetFootY = pl.y;
                break;
              }
            }
          }
          trailingLeg.startSwing(trailingLeg.footX, trailingLeg.footY, targetFootX, targetFootY);
        }
      }

      // 4. Body Support & Height Balance
      let activeSupportY = null;
      const legs = [this.leftLeg, this.rightLeg];

      for (const leg of legs) {
        for (const pl of platforms) {
          const margin = (pl.w <= 55) ? 2 : 8;
          if (leg.footX >= pl.x - margin && leg.footX <= pl.x + pl.w + margin && Math.abs(leg.footY - pl.y) <= 16) {
            if (activeSupportY === null || pl.y < activeSupportY) {
              activeSupportY = pl.y;
            }
            break;
          }
        }
      }

      if (activeSupportY !== null) {
        const targetBodyY = activeSupportY - this.bodyH - this.legLength + 4;
        this.y += (targetBodyY - this.y) * Math.min(1, dt * 0.02);
        this.onGround = true;
      } else {
        // Fall if neither foot has valid platform support
        const centerUnderPl = platforms.find(pl => this.x + this.bodyW / 2 >= pl.x - 10 && this.x + this.bodyW / 2 <= pl.x + pl.w + 10);
        if (!centerUnderPl || this.y > centerUnderPl.y + 40) {
          this.isFalling = true;
          this.vy = 2.5;
          audioManager.stopStretchSound();
          audioManager.playFall();
          return;
        }
      }

      // 5. Balance & Wobble
      const footSpread = (this.rightLeg.footX - this.leftLeg.footX);
      const centerOffset = (this.leftLeg.footX + this.rightLeg.footX) / 2 - hipX;
      this.bodyWobble = Math.sin(performance.now() * 0.006) * (0.04 + stretchRatio * 0.08);
      this.bodyRotation = (centerOffset * 0.002) + (footSpread * 0.0004) + this.bodyWobble;
    }

    draw(ctx, camX) {
      const sx = this.x - camX;
      const sy = this.y;
      const hipX = sx + this.bodyW / 2;
      const hipY = sy + this.bodyH - 2;

      ctx.save();

      if (this.isFalling) {
        ctx.translate(sx + this.bodyW / 2, sy + this.bodyH / 2);
        ctx.rotate(this.fallRotation);
        ctx.translate(-(sx + this.bodyW / 2), -(sy + this.bodyH / 2));
      } else {
        ctx.translate(sx + this.bodyW / 2, sy + this.bodyH / 2);
        ctx.rotate(this.bodyRotation);
        ctx.translate(-(sx + this.bodyW / 2), -(sy + this.bodyH / 2));
      }

      // Draw Legs first (Behind body)
      this.drawLeg(ctx, this.leftLeg, hipX, hipY, camX);
      this.drawLeg(ctx, this.rightLeg, hipX, hipY, camX);

      // Body (Black rectangle)
      ctx.fillStyle = '#111111';
      ctx.fillRect(sx, sy, this.bodyW, this.bodyH);

      // White eyes (funny minimalist look)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(sx + 6, sy + 8, 4, 4);
      ctx.fillRect(sx + 16, sy + 8, 4, 4);

      ctx.restore();
    }

    drawLeg(ctx, leg, hipX, hipY, camX) {
      const footX = leg.footX - camX;
      const footY = leg.footY;
      const kneeX = leg.kneeX - camX;
      const kneeY = leg.kneeY;

      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 8;
      ctx.lineCap = 'square';
      ctx.lineJoin = 'miter';

      // 2-segment leg drawing
      ctx.beginPath();
      ctx.moveTo(hipX, hipY);
      ctx.lineTo(kneeX, kneeY);
      ctx.lineTo(footX, footY);
      ctx.stroke();

      // Foot square pad
      ctx.fillStyle = '#111111';
      ctx.fillRect(footX - 8, footY - 3, 16, 6);
    }
  }

  // ==========================================
  // 7. PARTICLES & VISUAL POLISH
  // ==========================================
  class ParticleManager {
    constructor() {
      this.particles = [];
    }

    spawnDust(x, y) {
      for (let i = 0; i < 4; i++) {
        this.particles.push({
          x: x + (Math.random() - 0.5) * 12,
          y: y - 2,
          vx: (Math.random() - 0.5) * 1.5,
          vy: -Math.random() * 1.2 - 0.5,
          size: Math.random() * 3 + 2,
          alpha: 1.0,
          life: 1.0
        });
      }
    }

    update(dt) {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= dt * 0.003;
        if (p.alpha <= 0) {
          this.particles.splice(i, 1);
        }
      }
    }

    draw(ctx, camX) {
      for (const p of this.particles) {
        ctx.fillStyle = `rgba(17, 17, 17, ${Math.max(0, p.alpha)})`;
        ctx.fillRect(p.x - camX, p.y, p.size, p.size);
      }
    }
  }

  // ==========================================
  // 8. MAIN GAME CONTROLLER
  // ==========================================
  class Game {
    constructor() {
      this.canvas = document.getElementById('game');
      this.ctx = this.canvas.getContext('2d');
      this.scoreEl = document.getElementById('score');
      this.bestScoreEl = document.getElementById('bestScore');
      this.overlay = document.getElementById('overlay');
      this.cardContent = document.getElementById('cardContent');
      this.startBtn = document.getElementById('startBtn');
      this.audioBtn = document.getElementById('audioBtn');
      this.hintEl = document.getElementById('hint');
      this.controlHintEl = document.getElementById('controlHint');

      this.ytAdapter = new YouTubePlayablesAdapter();
      this.audioManager = new AudioManager();
      this.inputManager = new InputManager(() => this.onInputTrigger());
      this.platformManager = new PlatformManager();
      this.player = new Player();
      this.particleManager = new ParticleManager();

      this.W = window.innerWidth;
      this.H = window.innerHeight;
      this.DPR = Math.min(window.devicePixelRatio || 1, 2);
      this.camX = 0;
      this.distance = 0;
      this.bestScore = 0;

      this.running = false;
      this.gameOver = false;
      this.lastTime = 0;
      this.screenShake = 0;

      this.init();
    }

    async init() {
      this.resize();
      window.addEventListener('resize', () => this.resize());

      // Detect mobile for touch controls hint
      if (this.inputManager.isTouchDevice) {
        this.hintEl.textContent = 'HOLD TO STRETCH';
        this.controlHintEl.textContent = 'HOLD ANYWHERE TO MAKE YOUR STEPS WIDER';
      }

      // Setup YT Playables integration
      this.ytAdapter.init(
        () => this.pause(),
        () => this.resume(),
        (enabled) => this.audioManager.setMute(!enabled)
      );

      // Load best score from YT SDK or LocalStorage
      const ytScore = await this.ytAdapter.loadScore();
      const localScore = Number(localStorage.getItem('longlegs_best') || 0);
      this.bestScore = Math.max(ytScore || 0, localScore);
      this.updateScoreUI();

      this.startBtn.addEventListener('click', () => this.start());
      this.audioBtn.addEventListener('click', () => {
        const isMuted = this.audioManager.toggleMute();
        this.audioBtn.textContent = `AUDIO: ${isMuted ? 'OFF' : 'ON'}`;
      });

      this.ytAdapter.notifyFirstFrameReady();
      this.ytAdapter.notifyGameReady();

      requestAnimationFrame((t) => this.loop(t));
    }

    resize() {
      this.W = window.innerWidth;
      this.H = window.innerHeight;
      this.DPR = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = this.W * this.DPR;
      this.canvas.height = this.H * this.DPR;
      this.ctx.setTransform(this.DPR, 0, 0, this.DPR, 0, 0);
    }

    onInputTrigger() {
      this.audioManager.init();
      if (!this.running && !this.gameOver) {
        this.start();
      }
    }

    pause() {
      this.running = false;
      this.audioManager.stopStretchSound();
    }

    resume() {
      if (!this.gameOver) {
        this.running = true;
      }
    }

    start() {
      this.audioManager.init();
      this.platformManager.reset(this.H);
      this.player.reset();
      this.player.initPosition(this.platformManager.platforms[0].y);

      this.distance = 0;
      this.camX = 0;
      this.running = true;
      this.gameOver = false;
      this.overlay.classList.add('hidden');
    }

    triggerGameOver() {
      if (this.gameOver) return;
      this.gameOver = true;
      this.running = false;
      this.screenShake = 14;

      const finalDistance = Math.floor(this.distance);
      let isNewBest = false;
      if (finalDistance > this.bestScore) {
        this.bestScore = finalDistance;
        this.ytAdapter.sendScore(this.bestScore);
        localStorage.setItem('longlegs_best', this.bestScore);
        isNewBest = true;
      }

      this.updateScoreUI();

      this.cardContent.innerHTML = `
        <h1>FALL!</h1>
        <div class="subtitle">${finalDistance} m</div>
        <p class="small">${isNewBest ? '★ NEW BEST SCORE! ★' : `BEST ${this.bestScore} m`}</p>
        <button class="primary-btn" id="restartBtn">TRY AGAIN</button>
      `;
      this.overlay.classList.remove('hidden');
      document.getElementById('restartBtn').addEventListener('click', () => this.start());
    }

    updateScoreUI() {
      this.scoreEl.textContent = `${Math.floor(this.distance)} m`;
      this.bestScoreEl.textContent = `BEST ${this.bestScore} m`;
    }

    update(dt) {
      if (!this.running) return;

      const isStretching = this.inputManager.isStretching;
      const speedMult = 1.0 + Math.min(1.2, this.distance / 2000);

      this.player.update(
        dt,
        isStretching,
        speedMult,
        this.platformManager.platforms,
        this.audioManager,
        (x, y) => this.particleManager.spawnDust(x, y)
      );

      if (this.player.isFalling && this.player.y > this.H + 100) {
        this.triggerGameOver();
        return;
      }

      // Update distance score based on player X position
      this.distance = Math.max(0, (this.player.x - 90) * 0.05);
      this.updateScoreUI();

      // Platform generation update
      this.platformManager.update(this.player.x, this.W, this.distance);

      // Particle update
      this.particleManager.update(dt);

      // Smooth Camera tracking (player kept ~32% from left side)
      const targetCamX = this.player.x - this.W * 0.32;
      this.camX += (targetCamX - this.camX) * Math.min(1, dt * 0.008);

      // Screen Shake decay
      if (this.screenShake > 0) {
        this.screenShake -= dt * 0.03;
      }
    }

    draw() {
      this.ctx.clearRect(0, 0, this.W, this.H);

      // Background (#f4f4f0)
      this.ctx.fillStyle = '#f4f4f0';
      this.ctx.fillRect(0, 0, this.W, this.H);

      this.ctx.save();
      if (this.screenShake > 0) {
        const rx = (Math.random() - 0.5) * this.screenShake;
        const ry = (Math.random() - 0.5) * this.screenShake;
        this.ctx.translate(rx, ry);
      }

      // Minimalist subtle grid
      this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.04)';
      this.ctx.lineWidth = 1;
      const gridSize = 36;
      const offsetX = -this.camX % gridSize;
      for (let x = offsetX; x < this.W; x += gridSize) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, this.H);
        this.ctx.stroke();
      }
      for (let y = 0; y < this.H; y += gridSize) {
        this.ctx.beginPath();
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(this.W, y);
        this.ctx.stroke();
      }

      // Draw Platforms (All platforms identical in shape & style: solid black with crisp white top line)
      for (const pl of this.platformManager.platforms) {
        const sx = pl.x - this.camX;
        if (sx + pl.w < -50 || sx > this.W + 50) continue;

        this.ctx.fillStyle = '#111111';
        this.ctx.fillRect(sx, pl.y, pl.w, this.H - pl.y);

        // Uniform crisp white top line accent
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(sx, pl.y, pl.w, 3);
      }

      // Draw Dust Particles
      this.particleManager.draw(this.ctx, this.camX);

      // Draw Player & Legs
      this.player.draw(this.ctx, this.camX);

      this.ctx.restore();
    }

    loop(timestamp) {
      const dt = Math.min(32, timestamp - this.lastTime || 16.6);
      this.lastTime = timestamp;

      this.update(dt);
      this.draw();

      requestAnimationFrame((t) => this.loop(t));
    }
  }

  // Launch Game instance when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new Game());
  } else {
    new Game();
  }
})();
