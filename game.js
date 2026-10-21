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
      if (distance < 200) return 'EASY';
      if (distance < 500) return 'NORMAL';
      if (distance < 1000) return 'HARD';
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

      const narrowInterval = distance < 250 ? 5 : distance < 650 ? 4 : 3;
      const extraNarrowPlatform = distance >= 650 && this.platformCount % (distance >= 1200 ? 5 : 7) === 0;
      const isNarrowPlatform = this.platformCount % narrowInterval === 0 || extraNarrowPlatform;
      const stretchInterval = distance < 250 ? 3 : 2;
      const isStretchGap = !isNarrowPlatform && this.platformCount % stretchInterval === 0;

      let gap, width, height;

      if (prev.isNarrow) {
        // A recovery platform remains after each precision landing, gradually shrinking at higher scores.
        gap = Math.floor(this.rng.range(32, 42));
        const recoveryScale = Math.max(0.68, 1 - Math.max(0, distance - 200) / 2500);
        width = Math.floor(this.rng.range(220, 280) * recoveryScale);
      } else if (isNarrowPlatform) {
        // Precision platforms become slightly narrower as the score rises.
        gap = Math.floor(this.rng.range(35, 45));
        const narrowWidth = tier === 'EASY' ? [58, 70] : tier === 'NORMAL' ? [48, 58] : tier === 'HARD' ? [44, 52] : [40, 48];
        width = Math.floor(this.rng.range(narrowWidth[0], narrowWidth[1]));
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
      const expressions = ['sad', 'happy', 'angry', 'surprised'];
      this.faceExpression = expressions[Math.floor(Math.random() * expressions.length)];
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

      // Original square head silhouette.
      ctx.fillStyle = '#111111';
      ctx.fillRect(sx, sy, this.bodyW, this.bodyH);

      this.drawFace(ctx, sx, sy);
      this.drawCrown(ctx, sx, sy);

      ctx.restore();
    }

    drawCrown(ctx, sx, sy) {
      ctx.save();
      ctx.fillStyle = '#f4f4f0';
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 1.5;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(sx + 4, sy + 1);
      ctx.lineTo(sx + 4, sy - 6);
      ctx.lineTo(sx + 9, sy - 3);
      ctx.lineTo(sx + 13, sy - 10);
      ctx.lineTo(sx + 17, sy - 3);
      ctx.lineTo(sx + 22, sy - 6);
      ctx.lineTo(sx + 22, sy + 1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#111111';
      ctx.beginPath();
      ctx.arc(sx + 13, sy - 5, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    drawFace(ctx, sx, sy) {
      const leftEye = [sx + 8, sy + 12];
      const rightEye = [sx + 18, sy + 12];
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';

      const drawOpenEyes = () => {
        for (const [x, y] of [leftEye, rightEye]) {
          ctx.beginPath();
          ctx.ellipse(x, y, 2.5, 3, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      };

      if (this.faceExpression === 'happy') {
        // Closed crescent eyes and an upward smile.
        for (const [x, y] of [leftEye, rightEye]) {
          ctx.beginPath();
          ctx.moveTo(x - 3, y);
          ctx.quadraticCurveTo(x, y - 4, x + 3, y);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(sx + 8, sy + 21);
        ctx.quadraticCurveTo(sx + 13, sy + 29, sx + 18, sy + 21);
        ctx.stroke();
      } else if (this.faceExpression === 'sad') {
        drawOpenEyes();
        // Brows tilt up toward the center; the mouth curves into a frown.
        ctx.beginPath();
        ctx.moveTo(sx + 4, sy + 7);
        ctx.lineTo(sx + 10, sy + 9);
        ctx.moveTo(sx + 16, sy + 9);
        ctx.lineTo(sx + 22, sy + 7);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(sx + 9, sy + 25);
        ctx.quadraticCurveTo(sx + 13, sy + 20, sx + 17, sy + 25);
        ctx.stroke();
      } else if (this.faceExpression === 'angry') {
        drawOpenEyes();
        // Brows angle down toward the center for an angry look.
        ctx.beginPath();
        ctx.moveTo(sx + 4, sy + 9);
        ctx.lineTo(sx + 10, sy + 7);
        ctx.moveTo(sx + 16, sy + 7);
        ctx.lineTo(sx + 22, sy + 9);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(sx + 10, sy + 24);
        ctx.lineTo(sx + 16, sy + 24);
        ctx.stroke();
      } else {
        // Wide eyes and an upright open oval for surprise.
        for (const [x, y] of [leftEye, rightEye]) {
          ctx.beginPath();
          ctx.ellipse(x, y, 3, 4, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.beginPath();
        ctx.ellipse(sx + 13, sy + 23, 3.2, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#111111';
        ctx.beginPath();
        ctx.ellipse(sx + 13, sy + 23, 1.5, 2.7, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    drawLeg(ctx, leg, hipX, hipY, camX) {
      const footX = leg.footX - camX;
      const footY = leg.footY;
      const kneeX = leg.kneeX - camX;
      const kneeY = leg.kneeY;

      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 6;
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
      ctx.fillRect(footX - 6.5, footY - 2.5, 13, 5);
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
      this.pauseBtn = document.getElementById('pauseBtn');
      this.hintEl = document.getElementById('hint');
      this.controlHintEl = document.getElementById('controlHint');

      this.ytAdapter = new YouTubePlayablesAdapter();
      this.audioManager = new AudioManager();
      this.music = new Audio('./assets/ocean-ambience.mp3');
      this.music.loop = true;
      this.music.volume = 0.16;
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
      this.bestRecord = null;

      this.running = false;
      this.paused = false;
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
        this.controlHintEl.textContent = 'HOLD TO STRETCH · RELEASE ON NARROW PLATFORMS';
      }

      // Setup YT Playables integration
      this.ytAdapter.init(
        () => this.pause(),
        () => this.resume(),
        (enabled) => {
          this.audioManager.setMute(!enabled);
          this.music.muted = !enabled;
        }
      );
      this.music.muted = !this.ytAdapter.isAudioEnabled();

      // Load best score from YT SDK or LocalStorage
      const ytScore = await this.ytAdapter.loadScore();
      let storedRecord = null;
      try { storedRecord = JSON.parse(localStorage.getItem('longlegs_best_record') || 'null'); } catch (e) {}
      this.bestRecord = storedRecord && Number.isFinite(storedRecord.score) ? storedRecord : null;
      const localScore = Math.max(Number(localStorage.getItem('longlegs_best') || 0), this.bestRecord?.score || 0);
      this.bestScore = Math.max(ytScore || 0, localScore);
      this.updateScoreUI();

      this.startBtn.addEventListener('click', () => this.start());
      this.audioBtn.addEventListener('click', () => {
        const isMuted = this.audioManager.toggleMute();
        this.music.muted = isMuted;
        this.audioBtn.textContent = `AUDIO: ${isMuted ? 'OFF' : 'ON'}`;
      });
      this.pauseBtn.addEventListener('click', () => this.togglePause());

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
      if (this.paused) {
        this.resume();
        return;
      }
      if (!this.running && !this.gameOver) {
        this.start();
      }
    }

    pause() {
      if (this.gameOver || !this.running) return;
      this.running = false;
      this.paused = true;
      this.audioManager.stopStretchSound();
      this.music.pause();
      this.cardContent.innerHTML = `
        <h1>PAUSED</h1>
        <p class="small">TAKE A BREATHER</p>
        <button class="primary-btn" id="resumeBtn">RESUME</button>
      `;
      this.overlay.classList.remove('hidden');
      document.getElementById('resumeBtn').addEventListener('click', () => this.resume());
      this.pauseBtn.textContent = 'RESUME';
      this.pauseBtn.disabled = false;
    }

    togglePause() {
      if (this.paused) this.resume();
      else this.pause();
    }

    resume() {
      if (!this.gameOver) {
        this.paused = false;
        this.running = true;
        this.overlay.classList.add('hidden');
        this.pauseBtn.textContent = 'PAUSE';
        this.pauseBtn.disabled = false;
        this.music.play().catch(() => {});
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
      this.paused = false;
      this.gameOver = false;
      this.pauseBtn.textContent = 'PAUSE';
      this.pauseBtn.disabled = false;
      document.body.classList.remove('game-over');
      this.overlay.classList.add('hidden');
      this.music.play().catch(() => {});
    }

    triggerGameOver() {
      if (this.gameOver) return;
      this.gameOver = true;
      this.running = false;
      this.paused = false;
      this.pauseBtn.textContent = 'PAUSE';
      this.pauseBtn.disabled = true;
      this.music.pause();
      document.body.classList.add('game-over');
      this.screenShake = 14;

      const finalDistance = Math.floor(this.distance);
      let isNewBest = false;
      if (finalDistance > this.bestScore) {
        this.bestScore = finalDistance;
        this.ytAdapter.sendScore(this.bestScore);
        isNewBest = true;
      }

      this.updateScoreUI();

      this.cardContent.innerHTML = isNewBest ? `
        <h1>YOU<br>WIN!</h1>
        <div class="subtitle">${finalDistance} m</div>
        <p class="small">NEW BEST SCORE · ENTER YOUR NAME</p>
        <form id="recordForm">
          <input class="name-input" id="playerName" name="playerName" maxlength="20" autocomplete="nickname" placeholder="Your name" required>
          <button class="primary-btn" type="submit">SAVE SCORE</button>
        </form>
      ` : `
        <h1>FALL!</h1>
        <div class="subtitle">${finalDistance} m</div>
        <p class="small">BEST ${this.bestScore} m${this.bestRecord?.name ? ` · ${this.escapeHTML(this.bestRecord.name)}` : ''}</p>
        <button class="primary-btn" id="restartBtn">TRY AGAIN</button>
      `;
      this.overlay.classList.remove('hidden');
      if (isNewBest) {
        document.getElementById('recordForm').addEventListener('submit', (event) => {
          event.preventDefault();
          const name = document.getElementById('playerName').value.trim().slice(0, 20);
          if (!name) return;
          this.bestRecord = { name, score: finalDistance, updatedAt: new Date().toISOString() };
          localStorage.setItem('longlegs_best_record', JSON.stringify(this.bestRecord));
          localStorage.setItem('longlegs_best', String(finalDistance));
          this.showSavedRecord(finalDistance);
          this.updateScoreUI();
        });
        document.getElementById('playerName').focus();
      } else {
        document.getElementById('restartBtn').addEventListener('click', () => this.start());
      }
    }

    escapeHTML(value) {
      return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
    }

    showSavedRecord(score) {
      this.cardContent.innerHTML = `
        <h1>SAVED!</h1>
        <div class="subtitle">${score} m</div>
        <p class="small">${this.escapeHTML(this.bestRecord.name)} · BEST SCORE</p>
        <button class="primary-btn" id="restartBtn">TRY AGAIN</button>
      `;
      document.getElementById('restartBtn').addEventListener('click', () => this.start());
    }

    updateScoreUI() {
      this.scoreEl.textContent = `${Math.floor(this.distance)} m`;
      this.bestScoreEl.textContent = `BEST ${this.bestScore} m${this.bestRecord?.name ? ` · ${this.bestRecord.name}` : ''}`;
    }

    update(dt) {
      if (!this.running) return;

      const isStretching = this.inputManager.isStretching;
      const speedMult = 1.0 + Math.min(1.35, this.distance / 1500);

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

      // Give the player a short, readable warning before the next special platform.
      const nextPlatform = this.platformManager.platforms.find((platform) => platform.x + platform.w > this.player.x + this.player.bodyW);
      const warningDistance = nextPlatform ? nextPlatform.x - (this.player.x + this.player.bodyW) : Infinity;
      if (warningDistance < 520 && nextPlatform?.isNarrow) {
        this.hintEl.textContent = 'NARROW PLATFORM AHEAD — RELEASE';
      } else if (warningDistance < 520 && nextPlatform?.isStretchGap) {
        this.hintEl.textContent = this.inputManager.isTouchDevice ? 'WIDE GAP AHEAD — HOLD TO STRETCH' : 'WIDE GAP AHEAD — HOLD SPACE';
      } else {
        this.hintEl.textContent = this.inputManager.isTouchDevice ? 'HOLD TO STRETCH • RELEASE TO SHORTEN' : 'HOLD SPACE TO STRETCH • RELEASE TO SHORTEN';
      }

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

      this.drawSky(this.ctx, performance.now());

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

      const seaY = this.H - 14;
      const waveTime = performance.now();
      this.drawSeaWaves(this.ctx, waveTime, 'back');

      // Draw T-shaped platforms: a wide landing cap with a centered support column.
      for (const pl of this.platformManager.platforms) {
        const sx = pl.x - this.camX;
        if (sx + pl.w < -50 || sx > this.W + 50) continue;

        this.ctx.fillStyle = '#111111';
        const capHeight = Math.min(36, Math.max(18, pl.h * 0.9));
        const stemWidth = Math.min(24, Math.max(14, pl.w * 0.28));
        this.ctx.fillRect(sx, pl.y, pl.w, capHeight);
        this.ctx.fillRect(
          sx + (pl.w - stemWidth) / 2,
          pl.y + capHeight,
          stemWidth,
          Math.max(0, this.H + 4 - pl.y - capHeight)
        );

        // Uniform crisp white top line accent
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(sx, pl.y, pl.w, 3);
      }

      // Layer two and the dark foreground wave pass in front of the supports.
      this.drawSeaWaves(this.ctx, waveTime, 'front');

      // Draw Dust Particles
      this.particleManager.draw(this.ctx, this.camX);

      // Draw Player & Legs
      this.player.draw(this.ctx, this.camX);

      this.ctx.restore();
    }

    drawSeaWaves(ctx, time, segment = 'all') {
      ctx.save();
      const drawWaveLayer = (peakY, troughY, waveLength, speed, phaseOffset, color) => {
        const shift = (time * speed + phaseOffset) % waveLength;
        let x = -waveLength - shift;
        const bottomY = this.H + 4;
        ctx.beginPath();
        ctx.moveTo(x, bottomY);
        ctx.lineTo(x, peakY);
        while (x < this.W + waveLength) {
          ctx.bezierCurveTo(
            x + waveLength * 0.14, peakY + (troughY - peakY) * 0.48,
            x + waveLength * 0.22, troughY,
            x + waveLength * 0.5, troughY
          );
          ctx.bezierCurveTo(
            x + waveLength * 0.78, troughY,
            x + waveLength * 0.86, peakY + (troughY - peakY) * 0.48,
            x + waveLength, peakY
          );
          x += waveLength;
        }
        ctx.lineTo(this.W + waveLength, bottomY);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
      };

      // Layer one sits behind the columns; the second layer sits in front.
      if (segment !== 'front') {
        drawWaveLayer(this.H - 42, this.H - 23, 108, 0.006, 12, '#555555');
      }
      if (segment === 'back') {
        ctx.restore();
        return;
      }
      drawWaveLayer(this.H - 32, this.H - 14, 82, 0.011, 38, '#333333');

      // Repeating peaked crests with rounded troughs, matching the supplied reference.
      // Extend slightly beyond the canvas edge to prevent a light seam below the wave.
      const bottomY = this.H + 4;
      const waveLength = 60;
      const peakY = this.H - 22;
      const troughY = this.H - 5;
      const phaseShift = (time * 0.018) % waveLength;
      ctx.beginPath();
      ctx.moveTo(0, bottomY);
      let x = -waveLength - phaseShift;
      ctx.lineTo(x, peakY);
      while (x < this.W + waveLength) {
        ctx.bezierCurveTo(
          x + waveLength * 0.14, peakY + 8,
          x + waveLength * 0.22, troughY,
          x + waveLength * 0.5, troughY
        );
        ctx.bezierCurveTo(
          x + waveLength * 0.78, troughY,
          x + waveLength * 0.86, peakY + 8,
          x + waveLength, peakY
        );
        x += waveLength;
      }
      ctx.lineTo(this.W, bottomY);
      ctx.closePath();
      ctx.fillStyle = '#111111';
      ctx.fill();
      ctx.restore();
    }

    drawSky(ctx, time) {
      // A warm, quiet sun with slowly breathing rays.
      const sunX = this.W * 0.82;
      const sunY = Math.max(76, this.H * 0.19);
      const pulse = 1 + Math.sin(time * 0.0012) * 0.035;
      ctx.save();
      ctx.strokeStyle = 'rgba(17, 17, 17, 0.14)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 12; i++) {
        const angle = (Math.PI * 2 * i) / 12 + time * 0.00008;
        const inner = 34 * pulse;
        ctx.beginPath();
        ctx.moveTo(sunX + Math.cos(angle) * inner, sunY + Math.sin(angle) * inner);
        ctx.lineTo(sunX + Math.cos(angle) * (inner + 9), sunY + Math.sin(angle) * (inner + 9));
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(17, 17, 17, 0.08)';
      ctx.beginPath();
      ctx.arc(sunX, sunY, 27 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(17, 17, 17, 0.28)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Clouds drift at different speeds to add a little depth without hiding gameplay.
      const cloudCycle = this.W + 220;
      const clouds = [
        { x: 100, y: 0.27, s: 0.82, speed: 0.008 },
        { x: 420, y: 0.13, s: 1.08, speed: 0.012 },
        { x: 760, y: 0.34, s: 0.72, speed: 0.006 },
        { x: 1080, y: 0.23, s: 0.92, speed: 0.01 }
      ];
      for (const cloud of clouds) {
        let x = ((cloud.x - this.camX * 0.18 + time * cloud.speed) % cloudCycle + cloudCycle) % cloudCycle - 100;
        const y = this.H * cloud.y;
        ctx.fillStyle = 'rgba(17, 17, 17, 0.055)';
        ctx.beginPath();
        ctx.ellipse(x, y, 30 * cloud.s, 10 * cloud.s, 0, 0, Math.PI * 2);
        ctx.ellipse(x - 17 * cloud.s, y + 2 * cloud.s, 15 * cloud.s, 8 * cloud.s, 0, 0, Math.PI * 2);
        ctx.ellipse(x + 16 * cloud.s, y + 1 * cloud.s, 19 * cloud.s, 9 * cloud.s, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Small groups of birds flap gently across the distant sky.
      const birdCycle = this.W + 300;
      for (let group = 0; group < 3; group++) {
        const baseX = ((160 + group * 390 - this.camX * 0.32 + time * (0.035 + group * 0.006)) % birdCycle + birdCycle) % birdCycle - 130;
        const baseY = this.H * (0.23 + group * 0.075);
        for (let bird = 0; bird < 3; bird++) {
          const x = baseX + bird * 17;
          const y = baseY + Math.sin(time * 0.0015 + bird + group) * 3 + bird * 4;
          const flap = Math.sin(time * 0.008 + bird * 1.7 + group) * 4;
          ctx.strokeStyle = 'rgba(17, 17, 17, 0.42)';
          ctx.lineWidth = 2;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(x - 6, y + flap);
          ctx.quadraticCurveTo(x - 2, y - 2, x, y);
          ctx.quadraticCurveTo(x + 3, y - 2, x + 7, y + flap);
          ctx.stroke();
        }
      }
      ctx.restore();
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
