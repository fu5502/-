import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  GameState, 
  Player, 
  Bullet, 
  Enemy, 
  Particle, 
  PowerUp, 
  WeaponType,
  Vector2 
} from '../types';
import { 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  COLORS, 
  KEYS, 
  PLAYER_SPEED, 
  PLAYER_HITBOX,
  BULLET_SPEED_PLAYER,
  BULLET_SPEED_ENEMY,
  BOSS_SCORE_THRESHOLD,
  REGEN_DELAY_FRAMES,
  SPAWN_INVULNERABILITY_FRAMES,
  MAX_WEAPON_LEVEL
} from '../constants';

// Global Audio Context declaration
declare global {
  interface Window {
    gameAudioContext?: AudioContext;
  }
}

interface GameCanvasProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  score: number;
  setScore: (score: number) => void;
  setPlayerStats: (stats: { hp: number; maxHp: number; bombs: number; weaponType: WeaponType; weaponLevel: number }) => void;
  startingWeapon: WeaponType;
}

// --- BGM Sequencer (Arcade FM Style) ---
class MusicSequencer {
  ctx: AudioContext;
  nextNoteTime: number = 0;
  tempo: number = 135; // Slightly faster standard arcade tempo
  lookahead: number = 25.0;
  scheduleAheadTime: number = 0.1;
  current16thNote: number = 0;
  isPlaying: boolean = false;
  timerID: number | null = null;
  currentLevel: number = 1;

  constructor() {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = window.gameAudioContext || new AudioCtx();
    window.gameAudioContext = this.ctx;
  }

  setLevel(level: number) {
      this.currentLevel = level;
      this.tempo = 135 + Math.min(20, (level - 1) * 2); 
  }

  nextNote() {
    const secondsPerBeat = 60.0 / this.tempo;
    this.nextNoteTime += 0.25 * secondsPerBeat; // 16th notes
    this.current16thNote++;
    if (this.current16thNote === 16) {
      this.current16thNote = 0;
    }
  }

  // FM Synth Lead
  playLead(time: number, freq: number, decay: number = 0.1) {
      const osc = this.ctx.createOscillator();
      const mod = this.ctx.createOscillator();
      const modGain = this.ctx.createGain();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      mod.type = 'sine';
      
      osc.frequency.setValueAtTime(freq, time);
      mod.frequency.setValueAtTime(freq * 2, time); 
      
      modGain.gain.setValueAtTime(freq * 0.5, time); 
      modGain.gain.exponentialRampToValueAtTime(0.01, time + decay);

      gain.gain.setValueAtTime(0.1, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + decay);

      mod.connect(modGain);
      modGain.connect(osc.frequency);
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(time);
      mod.start(time);
      osc.stop(time + decay);
      mod.stop(time + decay);
  }

  // Punchy Bass
  playBass(time: number, freq: number) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, time);
      filter.frequency.exponentialRampToValueAtTime(100, time + 0.2);

      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0.3, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.25);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(time);
      osc.stop(time + 0.25);
  }

  playDrum(time: number, type: 'kick' | 'snare' | 'hat') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      if (type === 'kick') {
          osc.frequency.setValueAtTime(150, time);
          osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
          gain.gain.setValueAtTime(0.8, time);
          gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(time);
          osc.stop(time + 0.5);
      } else if (type === 'snare') {
          const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.1, this.ctx.sampleRate);
          const output = noiseBuffer.getChannelData(0);
          for (let i = 0; i < noiseBuffer.length; i++) {
              output[i] = Math.random() * 2 - 1;
          }
          const noise = this.ctx.createBufferSource();
          noise.buffer = noiseBuffer;
          const noiseFilter = this.ctx.createBiquadFilter();
          noiseFilter.type = 'highpass';
          noiseFilter.frequency.value = 1000;
          noise.connect(noiseFilter);
          noiseFilter.connect(gain);
          gain.connect(this.ctx.destination);
          gain.gain.setValueAtTime(0.4, time);
          gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
          noise.start(time);
      } else if (type === 'hat') {
          const noiseFilter = this.ctx.createBiquadFilter();
          noiseFilter.type = 'highpass';
          noiseFilter.frequency.value = 5000;
          osc.type = 'square';
          osc.frequency.setValueAtTime(8000, time);
          osc.connect(noiseFilter);
          noiseFilter.connect(gain);
          gain.connect(this.ctx.destination);
          gain.gain.setValueAtTime(0.1, time);
          gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
          osc.start(time);
          osc.stop(time + 0.05);
      }
  }

  scheduleNote(beatNumber: number, time: number) {
    const musicStage = (this.currentLevel - 1) % 3; 
    const root = 65.41; 
    const scale = [1, 1.2, 1.33, 1.5, 1.78, 2]; 

    // Drums
    if (beatNumber % 4 === 0) this.playDrum(time, 'kick');
    if (beatNumber % 8 === 4) this.playDrum(time, 'snare');
    if (beatNumber % 2 !== 0) this.playDrum(time, 'hat');

    // Themes
    if (musicStage === 0) { // Heroic
        if (beatNumber % 2 === 0) {
            let note = root;
            if (beatNumber >= 8 && beatNumber < 12) note = root * 1.33;
            if (beatNumber >= 12) note = root * 1.5;
            this.playBass(time, note);
        }
        if ([0, 3, 6, 8, 10, 12, 14].includes(beatNumber)) {
             let note = root * 4; 
             if (beatNumber < 8) note *= scale[beatNumber % 3]; 
             else note *= scale[(beatNumber + 1) % 3];
             this.playLead(time, note, 0.15);
        }
    } else if (musicStage === 1) { // Industrial
        if ([0, 3, 6, 8, 10, 11, 14].includes(beatNumber)) {
             let note = root * 0.75; 
             if (beatNumber > 8) note = root * 0.75 * 1.06; 
             this.playBass(time, note);
        }
        if (beatNumber === 0 || beatNumber === 6 || beatNumber === 12) {
             this.playLead(time, root * 4 * 1.2, 0.3);
        }
    } else { // Trance
        const bRoot = root * 1.0; 
        const bassSeq = [1, 1, 1.5, 1, 1, 1, 1.2, 1.2]; 
        const idx = Math.floor(beatNumber / 2) % 8;
        this.playBass(time, bRoot * bassSeq[idx]);

        const lRoot = root * 8;
        const arp = [1, 1.2, 1.5, 2];
        const note = lRoot * arp[beatNumber % 4];
        this.playLead(time, note, 0.08);
    }
  }

  scheduler() {
    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleNote(this.current16thNote, this.nextNoteTime);
      this.nextNote();
    }
    if (this.isPlaying) {
      this.timerID = window.setTimeout(() => this.scheduler(), this.lookahead);
    }
  }

  start() {
    if (this.isPlaying) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.isPlaying = true;
    this.current16thNote = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.scheduler();
  }

  stop() {
    this.isPlaying = false;
    if (this.timerID) clearTimeout(this.timerID);
  }
}

let bgmSequencer: MusicSequencer | null = null;


// --- SFX System ---
const playSound = (type: 'shoot' | 'explode' | 'powerup' | 'laser' | 'bomb' | 'coin' | 'invincible') => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    if (!window.gameAudioContext) window.gameAudioContext = new AudioContext();
    const ctx = window.gameAudioContext;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;

    switch (type) {
      case 'shoot':
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      case 'laser':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.linearRampToValueAtTime(600, now + 0.15);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      case 'explode':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(10, now + 0.4);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
        break;
      case 'powerup':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.linearRampToValueAtTime(1000, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      case 'invincible':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.linearRampToValueAtTime(1200, now + 0.1);
        osc.frequency.linearRampToValueAtTime(600, now + 0.2);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
      case 'coin':
        osc.type = 'square';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.setValueAtTime(1800, now + 0.05);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      case 'bomb':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(10, now + 1.5);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        osc.start(now);
        osc.stop(now + 1.5);
        break;
    }
  } catch (e) {
    // Silently fail if audio not available
  }
};

const GameCanvas: React.FC<GameCanvasProps> = ({ 
  gameState, 
  setGameState, 
  setScore, 
  setPlayerStats,
  startingWeapon
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  // Mutable game state
  const stateRef = useRef({
    player: {
      id: 'p1',
      pos: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 100 },
      vel: { x: 0, y: 0 },
      width: 60,
      height: 50,
      color: COLORS.PLAYER,
      hp: 100,
      maxHp: 100,
      speed: PLAYER_SPEED,
      weaponType: startingWeapon,
      weaponLevel: 1,
      bombs: 2,
      invulnerableTimer: 0,
      lastHitFrame: 0,
      markedForDeletion: false,
      hyperModeTimer: 0,
      weaponVariant: 0
    } as Player,
    bullets: [] as Bullet[],
    enemies: [] as Enemy[],
    particles: [] as Particle[],
    powerUps: [] as PowerUp[],
    bombSquad: [] as { x: number, y: number, speed: number }[], // Visual Bomb Effect
    stars: [] as { x: number; y: number; size: number; speed: number; brightness: number }[],
    clouds: [] as { x: number; y: number; width: number; height: number; speed: number; alpha: number }[],
    keys: new Set<string>(), 
    frame: 0,
    score: 0,
    bossActive: false,
    cameraShake: 0,
    level: 1,
    levelTransitionTimer: 0,
    nextBossScoreThreshold: BOSS_SCORE_THRESHOLD
  });

  // --- Audio Initialization ---
  useEffect(() => {
     if (!bgmSequencer) {
         try {
           bgmSequencer = new MusicSequencer();
         } catch (e) { console.log("Audio init deferred"); }
     }
     if (gameState === GameState.PLAYING && bgmSequencer) {
         bgmSequencer.start();
     } else if (bgmSequencer) {
         bgmSequencer.stop();
     }
  }, [gameState]);

  // --- Input Handling ---
  const triggerBomb = useCallback(() => {
     const state = stateRef.current;
     if (state.player.bombs > 0 && state.player.hp > 0) {
       state.player.bombs--;
       state.cameraShake = 25;
       playSound('bomb');
       
       // Visual: Full Screen Flash
       state.particles.push({
         id: 'bomb_flash',
         pos: { x: CANVAS_WIDTH/2, y: CANVAS_HEIGHT/2 },
         vel: { x: 0, y: 0 },
         life: 1,
         maxLife: 1,
         scale: 500,
         color: '#fff',
         markedForDeletion: false,
         width: 0, height: 0
       });

       // Visual: Bomb Squad (7 planes)
       const squadCount = 7;
       const spacing = CANVAS_WIDTH / (squadCount + 1);
       for (let i = 0; i < squadCount; i++) {
           state.bombSquad.push({
               x: spacing * (i + 1),
               y: CANVAS_HEIGHT + 100 + (Math.abs(i - 3) * 20), // V formation
               speed: 15
           });
       }

       // Logic: Damage Enemies & Clear Bullets
       state.bullets = state.bullets.filter(b => b.owner === 'player'); // Keep player bullets
       state.enemies.forEach(e => {
         e.hp -= 200;
         createExplosion(state, e.pos.x, e.pos.y, 30, COLORS.BOMB);
       });
     }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (KEYS.UP.includes(e.code) || KEYS.DOWN.includes(e.code) || 
            KEYS.LEFT.includes(e.code) || KEYS.RIGHT.includes(e.code)) {
             // e.preventDefault(); 
        }
        
        if (e.code === 'Space') {
            // e.preventDefault(); // Prevent scrolling with space if needed, though css overflow:hidden handles most
        }
        
        stateRef.current.keys.add(e.code);
        
        if (window.gameAudioContext?.state === 'suspended') {
            window.gameAudioContext.resume();
        }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
        stateRef.current.keys.delete(e.code);
    };
    
    const handleAction = (e: KeyboardEvent) => {
        if (KEYS.BOMB.includes(e.code) && gameState === GameState.PLAYING) {
            triggerBomb();
        }
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('keydown', handleAction);
    
    // Initialize Background
    const state = stateRef.current;
    if (state.stars.length === 0) {
        for(let i=0; i<120; i++) {
            state.stars.push({
                x: Math.random() * CANVAS_WIDTH,
                y: Math.random() * CANVAS_HEIGHT,
                size: Math.random() * 1.5 + 0.5,
                speed: Math.random() * 4 + 0.5,
                brightness: Math.random()
            });
        }
        for(let i=0; i<15; i++) {
            state.clouds.push({
                x: Math.random() * CANVAS_WIDTH,
                y: Math.random() * CANVAS_HEIGHT,
                width: Math.random() * 100 + 50,
                height: Math.random() * 80 + 40,
                speed: Math.random() * 2 + 5,
                alpha: Math.random() * 0.1 + 0.05
            });
        }
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('keydown', handleAction);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState, triggerBomb]);

  // --- Touch Controls for Mobile ---
  const touchRef = useRef<{ startX: number; startY: number; active: boolean }>({ startX: 0, startY: 0, active: false });

  const handleTouchStart = (e: React.TouchEvent) => {
    touchRef.current.active = true;
    touchRef.current.startX = e.touches[0].clientX;
    touchRef.current.startY = e.touches[0].clientY;
    if (!window.gameAudioContext) window.gameAudioContext = new AudioContext();
    if (window.gameAudioContext.state === 'suspended') window.gameAudioContext.resume();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchRef.current.active) return;
    const dx = e.touches[0].clientX - touchRef.current.startX;
    const dy = e.touches[0].clientY - touchRef.current.startY;
    
    const state = stateRef.current;
    if (gameState === GameState.PLAYING) {
       state.player.pos.x += dx * 1.5;
       state.player.pos.y += dy * 1.5;
       
       // Clamp touch movement
       const halfW = state.player.width / 2;
       const halfH = state.player.height / 2;
       state.player.pos.x = Math.max(halfW, Math.min(CANVAS_WIDTH - halfW, state.player.pos.x));
       state.player.pos.y = Math.max(halfH, Math.min(CANVAS_HEIGHT - halfH, state.player.pos.y));
    }

    touchRef.current.startX = e.touches[0].clientX;
    touchRef.current.startY = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    touchRef.current.active = false;
  };

  // --- Game Loop Helpers ---

  const createExplosion = (state: any, x: number, y: number, count: number, color: string) => {
    if (count > 5) {
       state.particles.push({
           id: 'shockwave_'+Math.random(),
           pos: {x, y},
           vel: {x:0, y:0},
           life: 1.0,
           maxLife: 1.0,
           scale: 1, 
           color: COLORS.SHOCKWAVE,
           markedForDeletion: false,
           type: 'shockwave',
           width: 0, height: 0
       });
       createDebris(state, x, y, count, color);
    }

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      state.particles.push({
        id: Math.random().toString(),
        pos: { x, y },
        vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        life: Math.random() * 0.5 + 0.3,
        maxLife: 1.0,
        scale: Math.random() * 4 + 2,
        color: color,
        markedForDeletion: false,
        type: 'particle',
        width: 0, height: 0
      });
    }
  };
  
  const createDebris = (state: any, x: number, y: number, count: number, color: string) => {
      for (let i = 0; i < count / 2; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 8 + 2;
          state.particles.push({
            id: 'debris_'+Math.random(),
            pos: { x, y },
            vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
            life: Math.random() * 1.0 + 0.5,
            maxLife: 1.5,
            scale: Math.random() * 5 + 3, 
            color: color,
            markedForDeletion: false,
            type: 'particle',
            subtype: 'debris',
            rotation: Math.random() * Math.PI,
            rotationSpeed: (Math.random() - 0.5) * 0.5,
            width: 0, height: 0
          });
      }
  };

  const spawnPowerUp = (state: any, x: number, y: number) => {
    if (Math.random() > 0.25) return; // Increased from 0.20
    const r = Math.random();
    let type: PowerUp['type'] = 'SCORE_SILVER';
    
    // Adjusted distributions to favor Ammo (P_RED/BLUE/PURPLE) more
    if (r < 0.20) type = 'SCORE_SILVER';
    else if (r < 0.35) type = 'SCORE_GOLD';
    else if (r < 0.50) type = 'P_RED';    // Increased
    else if (r < 0.65) type = 'P_BLUE';   // Increased
    else if (r < 0.80) type = 'P_PURPLE'; // Increased
    else if (r < 0.85) type = 'P_UPGRADE'; 
    else if (r < 0.88) type = 'BOMB';      
    else if (r < 0.92) type = 'HEALTH';    
    else if (r < 0.94) type = 'INVINCIBILITY'; 
    else return;

    state.powerUps.push({
      id: Math.random().toString(),
      pos: { x, y },
      vel: { x: Math.sin(state.frame) * 1, y: 2 },
      width: 24,
      height: 24,
      type,
      color: '#fff',
      markedForDeletion: false
    });
  };

  const spawnBullet = (state: any, owner: 'player'|'enemy', x: number, y: number, angle: number, speed: number, behavior: Bullet['behavior'] = 'normal', damageScale: number = 1.0) => {
    const isPlayer = owner === 'player';
    let width = 10;
    let height = 10;
    let color = COLORS.ENEMY_BULLET;
    let damage = 10;

    if (isPlayer) {
        const isHyper = state.player.hyperModeTimer > 0;
        if (state.player.weaponType === WeaponType.LASER) {
            width = 14;
            height = 45;
            color = isHyper ? '#ffffff' : '#60a5fa';
            damage = 7; 
        } else if (state.player.weaponType === WeaponType.PLASMA) {
            width = 18;
            height = 18;
            color = isHyper ? '#f0abfc' : COLORS.PLAYER_PLASMA;
            damage = 16;
        } else {
            width = 16;
            height = 26;
            color = isHyper ? '#fecaca' : '#f87171';
            damage = 12;
        }
        damage = Math.max(1, damage * damageScale * (isHyper ? 1.2 : 1.0));
    } else {
        damage = 10 + (state.level * 2);
    }

    state.bullets.push({
      id: Math.random().toString(),
      owner,
      pos: { x, y },
      vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
      width,
      height,
      color,
      damage,
      angle,
      behavior,
      markedForDeletion: false
    });
  };

  const resetGame = () => {
    const state = stateRef.current;
    state.player.hp = 100;
    state.player.bombs = 2;
    state.player.pos = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 100 };
    state.player.weaponLevel = 1; 
    state.player.weaponType = startingWeapon;
    state.player.invulnerableTimer = SPAWN_INVULNERABILITY_FRAMES; 
    state.player.lastHitFrame = 0;
    state.player.hyperModeTimer = 0;
    state.player.weaponVariant = 0;

    if (startingWeapon === WeaponType.LASER) state.player.color = '#3b82f6';
    else if (startingWeapon === WeaponType.PLASMA) state.player.color = '#c084fc';
    else state.player.color = '#ef4444';
    
    state.score = 0;
    state.bullets = [];
    state.enemies = [];
    state.particles = [];
    state.powerUps = [];
    state.bombSquad = [];
    state.frame = 0;
    state.bossActive = false;
    state.level = 1;
    state.levelTransitionTimer = 0;
    state.nextBossScoreThreshold = BOSS_SCORE_THRESHOLD;
    
    if (bgmSequencer) bgmSequencer.setLevel(1);

    setScore(0);
    setPlayerStats({ 
        hp: 100, 
        maxHp: 100, 
        bombs: 2,
        weaponType: startingWeapon,
        weaponLevel: 1
    });
  };

  // --- Main Loop ---
  const update = () => {
    const state = stateRef.current;
    const { player } = state;

    if (gameState !== GameState.PLAYING) return;

    state.frame++;
    if (player.hyperModeTimer > 0) player.hyperModeTimer--;
    
    if (bgmSequencer && bgmSequencer.currentLevel !== state.level) {
        bgmSequencer.setLevel(state.level);
    }

    // Regen Logic
    if (state.frame - player.lastHitFrame > REGEN_DELAY_FRAMES && player.hp < player.maxHp && player.hp > 0) {
        // 2 seconds = 120 frames. Recover 0.8 HP per 2 seconds.
        if (state.frame % 120 === 0) {  
            player.hp = Math.min(player.maxHp, player.hp + 0.8);
            // Regen visual effect
            state.particles.push({
                id: 'regen_'+Math.random(),
                pos: { x: player.pos.x + (Math.random()-0.5)*40, y: player.pos.y + (Math.random()-0.5)*40 },
                vel: { x: 0, y: -1 },
                life: 0.5, maxLife: 0.5, scale: 3, color: '#4ade80', markedForDeletion: false, type: 'particle',
                width: 0, height: 0
            });
        }
    }

    // Level Transition
    if (state.levelTransitionTimer > 0) {
        state.levelTransitionTimer--;
        state.clouds.forEach(c => c.y += c.speed * 2);
    }

    // Background
    state.stars.forEach((star, i) => {
        let speedMult = i < 40 ? 0.5 : i < 80 ? 1.0 : 2.0;
        star.y += star.speed * speedMult;
        if (star.y > CANVAS_HEIGHT) {
            star.y = 0;
            star.x = Math.random() * CANVAS_WIDTH;
        }
    });
    state.clouds.forEach(c => {
        c.y += c.speed;
        if (c.y > CANVAS_HEIGHT + c.height) {
            c.y = -c.height;
            c.x = Math.random() * CANVAS_WIDTH;
        }
    });

    // Bomb Squad Logic
    for (let i = state.bombSquad.length - 1; i >= 0; i--) {
        const plane = state.bombSquad[i];
        plane.y -= plane.speed;
        // Trail particles
        if (state.frame % 2 === 0) {
            state.particles.push({
                id: Math.random().toString(),
                pos: { x: plane.x, y: plane.y + 20 },
                vel: { x: 0, y: Math.random()*2 },
                life: 0.5, maxLife: 0.5, scale: 4, color: '#fb923c', markedForDeletion: false, type: 'particle',
                width: 0, height: 0
            });
        }
        if (plane.y < -100) state.bombSquad.splice(i, 1);
    }

    // Player Movement
    let dx = 0;
    let dy = 0;
    if (state.keys.has('ArrowLeft') || state.keys.has('KeyA')) dx -= player.speed;
    if (state.keys.has('ArrowRight') || state.keys.has('KeyD')) dx += player.speed;
    if (state.keys.has('ArrowUp') || state.keys.has('KeyW')) dy -= player.speed;
    if (state.keys.has('ArrowDown') || state.keys.has('KeyS')) dy += player.speed;

    player.pos.x += dx;
    player.pos.y += dy;
    
    const halfW = player.width / 2;
    const halfH = player.height / 2;
    player.pos.x = Math.max(halfW, Math.min(CANVAS_WIDTH - halfW, player.pos.x));
    player.pos.y = Math.max(halfH, Math.min(CANVAS_HEIGHT - halfH, player.pos.y));

    // Shooting
    const fireRate = player.hyperModeTimer > 0 ? 2 : 4;
    if (state.frame % fireRate === 0) { 
      const pX = player.pos.x;
      const pY = player.pos.y - 20;
      const variant = player.weaponVariant * 0.05;
      
      if (player.weaponType === WeaponType.VULCAN) {
        playSound('shoot');
        const isGatling = player.weaponLevel >= 8 && state.frame % 2 === 0;
        spawnBullet(state, 'player', pX - 8, pY, -Math.PI/2 + variant, BULLET_SPEED_PLAYER);
        spawnBullet(state, 'player', pX + 8, pY, -Math.PI/2 - variant, BULLET_SPEED_PLAYER);
        if (isGatling) spawnBullet(state, 'player', pX, pY - 10, -Math.PI/2, BULLET_SPEED_PLAYER * 1.2);
        if (player.weaponLevel >= 2) {
           spawnBullet(state, 'player', pX - 18, pY + 5, -Math.PI/2 - 0.1 - variant, BULLET_SPEED_PLAYER);
           spawnBullet(state, 'player', pX + 18, pY + 5, -Math.PI/2 + 0.1 + variant, BULLET_SPEED_PLAYER);
        }
        if (player.weaponLevel >= 3) {
           spawnBullet(state, 'player', pX - 28, pY + 10, -Math.PI/2 - 0.25, BULLET_SPEED_PLAYER);
           spawnBullet(state, 'player', pX + 28, pY + 10, -Math.PI/2 + 0.25, BULLET_SPEED_PLAYER);
        }
        if (player.weaponLevel >= 4 && state.frame % 8 === 0) {
             spawnBullet(state, 'player', pX - 40, pY + 20, -Math.PI/2 - 0.8, BULLET_SPEED_PLAYER * 0.8, 'homing', 0.5);
             spawnBullet(state, 'player', pX + 40, pY + 20, -Math.PI/2 + 0.8, BULLET_SPEED_PLAYER * 0.8, 'homing', 0.5);
        }
        if (player.weaponLevel >= 5 && state.frame % 12 === 0) {
             spawnBullet(state, 'player', pX, pY + 40, Math.PI/2, BULLET_SPEED_PLAYER * 0.8, 'normal', 0.8);
        }
        if (player.weaponLevel >= 6 && state.frame % 20 === 0) {
             for(let i=0; i<8; i++) spawnBullet(state, 'player', pX, pY, Math.PI*2/8 * i + variant, BULLET_SPEED_PLAYER * 0.7, 'normal', 0.4);
        }
      } else if (player.weaponType === WeaponType.LASER) {
        playSound('laser');
        const speed = BULLET_SPEED_PLAYER * 2;
        const beamScale = player.weaponLevel >= 8 ? 2.5 : 1.0; 
        spawnBullet(state, 'player', pX, pY - 10, -Math.PI/2, speed, 'beam', 1.0 * beamScale);
        if (player.weaponLevel >= 2) {
            spawnBullet(state, 'player', pX - 14, pY + 10, -Math.PI/2 - variant*0.5, speed, 'beam', 0.7);
            spawnBullet(state, 'player', pX + 14, pY + 10, -Math.PI/2 + variant*0.5, speed, 'beam', 0.7);
        }
        if (player.weaponLevel >= 3) {
            spawnBullet(state, 'player', pX - 20, pY + 15, -Math.PI/2 - 0.15, speed, 'beam', 0.4);
            spawnBullet(state, 'player', pX + 20, pY + 15, -Math.PI/2 + 0.15, speed, 'beam', 0.4);
        }
        if (player.weaponLevel >= 5 && state.frame % 6 === 0) {
            spawnBullet(state, 'player', pX - 10, pY + 20, -Math.PI/2 - 2.5, speed, 'beam', 0.5);
            spawnBullet(state, 'player', pX + 10, pY + 20, -Math.PI/2 + 2.5, speed, 'beam', 0.5);
        }
        if (player.weaponLevel >= 7) { 
            spawnBullet(state, 'player', pX - 45, pY, -Math.PI/2, speed, 'beam', 0.6);
            spawnBullet(state, 'player', pX + 45, pY, -Math.PI/2, speed, 'beam', 0.6);
        }
      }
    }

    if (player.weaponType === WeaponType.PLASMA && state.frame % 8 === 0) {
       const pX = player.pos.x;
       const pY = player.pos.y - 20;
       playSound('shoot');
       const speed = BULLET_SPEED_PLAYER * 1.1;
       spawnBullet(state, 'player', pX - 10, pY, -Math.PI/2 - 0.2, speed, 'homing');
       spawnBullet(state, 'player', pX + 10, pY, -Math.PI/2 + 0.2, speed, 'homing');
       if (player.weaponLevel >= 2) {
           spawnBullet(state, 'player', pX - 25, pY + 10, -Math.PI/2 - 0.6, speed, 'homing');
           spawnBullet(state, 'player', pX + 25, pY + 10, -Math.PI/2 + 0.6, speed, 'homing');
       }
       if (player.weaponLevel >= 3) spawnBullet(state, 'player', pX, pY, -Math.PI/2, speed * 1.5, 'normal', 1.2);
       if (player.weaponLevel >= 5 && state.frame % 32 === 0) {
           spawnBullet(state, 'player', pX - 60, pY, -Math.PI/2, speed * 0.5, 'mine', 1.5);
           spawnBullet(state, 'player', pX + 60, pY, -Math.PI/2, speed * 0.5, 'mine', 1.5);
       }
       if (player.weaponLevel >= 8 && state.frame % 64 === 0) {
           spawnBullet(state, 'player', pX, pY - 30, -Math.PI/2, speed * 0.4, 'homing', 3.0); 
       }
    }

    // Enemy Spawning
    const spawnRate = Math.max(15, 50 - (state.level * 5));
    if (!state.bossActive && state.frame % spawnRate === 0) {
       const x = Math.random() * (CANVAS_WIDTH - 60) + 30;
       const r = Math.random();
       let type: Enemy['type'] = 'fighter';
       let hp = 25;
       let scoreVal = 100;
       let width = 36;
       let color = COLORS.ENEMY_FIGHTER;
       let velY = 3;
       const hpMult = 1 + (state.level - 1) * 0.3;
       
       if (r > 0.9) {
           type = 'bomber'; hp = 120 * hpMult; scoreVal = 400; width = 56; color = COLORS.ENEMY_BOMBER; velY = 1.5;
       } else if (r > 0.75) {
           type = 'tank'; hp = 100 * hpMult; scoreVal = 300; width = 48; color = COLORS.ENEMY_TANK; velY = 1.2;
       } else if (r > 0.55) {
           type = 'interceptor'; hp = 40 * hpMult; scoreVal = 150; width = 32; color = COLORS.ENEMY_INTERCEPTOR; velY = 4.5;
       }
       
       let attackPattern: Enemy['attackPattern'] = 'straight';
       if (type === 'interceptor') attackPattern = 'aimed';
       if (type === 'bomber') attackPattern = 'spread';

       state.enemies.push({
         id: Math.random().toString(),
         pos: { x, y: -50 },
         vel: { x: 0, y: 1 },
         width, height: width, hp, maxHp: hp,
         type: type, 
         color, scoreValue: scoreVal, shootTimer: Math.random()*60, patternOffset: Math.random()*100, markedForDeletion: false,
         attackPattern
       });
    }

    if (!state.bossActive && state.score >= state.nextBossScoreThreshold && state.enemies.length === 0) {
        state.bossActive = true;
        state.enemies.push({
            id: 'BOSS',
            pos: { x: CANVAS_WIDTH / 2, y: -150 },
            vel: { x: 0, y: 1 },
            width: 140, height: 120, hp: 3000 * (1 + (state.level - 1) * 0.5), maxHp: 3000 * (1 + (state.level - 1) * 0.5),
            type: 'boss', color: COLORS.ENEMY_BOSS, scoreValue: 5000 * state.level, shootTimer: 0, patternOffset: 0, markedForDeletion: false,
            attackPattern: 'spiral'
        });
    }

    // Update Enemies (Optimized: Reverse Loop)
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const enemy = state.enemies[i];
      if (enemy.type === 'boss') {
          if (enemy.pos.y < 150) enemy.pos.y += enemy.vel.y;
          else {
              enemy.pos.x += Math.sin(state.frame / 60) * 1.5;
              enemy.pos.y += Math.cos(state.frame / 40) * 0.5;
          }
          const rateMult = Math.max(0.5, 1.0 - (state.level * 0.1));
          const isFrenzy = enemy.hp < enemy.maxHp * 0.3;
          const fireRate = isFrenzy ? 20 : 40;
          if (state.frame % Math.floor(fireRate * rateMult) === 0) {
              const count = isFrenzy ? 24 : 16;
              for(let j=0; j<count; j++) {
                  spawnBullet(state, 'enemy', enemy.pos.x, enemy.pos.y, (Math.PI * 2 / count) * j + state.frame/30, 5);
              }
              playSound('shoot');
          }
      } else {
          enemy.pos.y += enemy.vel.y;
          enemy.shootTimer++;
          if (enemy.attackPattern === 'aimed' && enemy.shootTimer > 60) {
               const angle = Math.atan2(player.pos.y - enemy.pos.y, player.pos.x - enemy.pos.x);
               spawnBullet(state, 'enemy', enemy.pos.x, enemy.pos.y, angle, BULLET_SPEED_ENEMY * 1.5);
               enemy.shootTimer = 0;
          } else if (enemy.attackPattern === 'spread' && enemy.shootTimer > 120) {
               const angle = Math.atan2(player.pos.y - enemy.pos.y, player.pos.x - enemy.pos.x);
               spawnBullet(state, 'enemy', enemy.pos.x, enemy.pos.y, angle, BULLET_SPEED_ENEMY);
               spawnBullet(state, 'enemy', enemy.pos.x, enemy.pos.y, angle - 0.3, BULLET_SPEED_ENEMY);
               spawnBullet(state, 'enemy', enemy.pos.x, enemy.pos.y, angle + 0.3, BULLET_SPEED_ENEMY);
               enemy.shootTimer = 0;
          } else if (enemy.attackPattern === 'straight' && enemy.shootTimer > 100) {
               spawnBullet(state, 'enemy', enemy.pos.x, enemy.pos.y, Math.PI/2, BULLET_SPEED_ENEMY);
               enemy.shootTimer = 0;
          }
      }
      if (enemy.hp <= 0) {
          playSound('explode');
          state.score += enemy.scoreValue;
          createExplosion(state, enemy.pos.x, enemy.pos.y, 15, enemy.color);
          
          // Boss Loot Logic
          if (enemy.type === 'boss') {
             // Drop specific weapon based on level cycle
             const lootType = state.level % 3 === 1 ? 'P_RED' : state.level % 3 === 2 ? 'P_BLUE' : 'P_PURPLE';
             state.powerUps.push({
                id: Math.random().toString(), pos: { x: enemy.pos.x, y: enemy.pos.y }, vel: { x: 0, y: 2 },
                width: 24, height: 24, type: lootType, color: '#fff', markedForDeletion: false
             });
             // Extra gold
             for(let k=0; k<5; k++) {
                state.powerUps.push({
                    id: Math.random().toString(), pos: { x: enemy.pos.x + (Math.random()-0.5)*40, y: enemy.pos.y + (Math.random()-0.5)*40 }, vel: { x: (Math.random()-0.5)*2, y: 2 + Math.random() },
                    width: 24, height: 24, type: 'SCORE_GOLD', color: '#fff', markedForDeletion: false
                 });
             }

             state.bossActive = false;
             state.level++;
             state.nextBossScoreThreshold = state.score + BOSS_SCORE_THRESHOLD * state.level;
             state.levelTransitionTimer = 180; 
             state.bullets = state.bullets.filter((b: Bullet) => b.owner === 'player');
             player.hp = Math.min(player.hp + 50, player.maxHp);
          } else {
             spawnPowerUp(state, enemy.pos.x, enemy.pos.y);
          }

          state.cameraShake = 2;
          state.enemies.splice(i, 1);
          continue;
      }
      if (enemy.pos.y > CANVAS_HEIGHT + 100) {
          state.enemies.splice(i, 1);
      }
    }

    // Update Bullets (Optimized: Reverse Loop)
    for (let i = state.bullets.length - 1; i >= 0; i--) {
      const bullet = state.bullets[i];
      if ((bullet.behavior === 'homing' || bullet.behavior === 'mine') && bullet.owner === 'player') {
          let closest = null;
          let minDst = 500;
          for(const e of state.enemies) {
             const d = Math.hypot(e.pos.x - bullet.pos.x, e.pos.y - bullet.pos.y);
             if (d < minDst && e.pos.y > 0 && e.pos.y < CANVAS_HEIGHT) { minDst = d; closest = e; }
          }
          if (closest) {
              const angle = Math.atan2(closest.pos.y - bullet.pos.y, closest.pos.x - bullet.pos.x);
              const turnSpeed = bullet.behavior === 'mine' ? 0.05 : 0.15; 
              const speed = bullet.behavior === 'mine' ? BULLET_SPEED_PLAYER * 0.6 : BULLET_SPEED_PLAYER;
              bullet.vel.x += (Math.cos(angle) * speed - bullet.vel.x) * turnSpeed;
              bullet.vel.y += (Math.sin(angle) * speed - bullet.vel.y) * turnSpeed;
              bullet.angle = Math.atan2(bullet.vel.y, bullet.vel.x);
          }
      }
      bullet.pos.x += bullet.vel.x;
      bullet.pos.y += bullet.vel.y;
      if (bullet.pos.x < -50 || bullet.pos.x > CANVAS_WIDTH + 50 || bullet.pos.y < -100 || bullet.pos.y > CANVAS_HEIGHT + 50) {
        state.bullets.splice(i, 1);
        continue;
      }
      if (bullet.markedForDeletion) {
        state.bullets.splice(i, 1);
      }
    }

    // PowerUps (Optimized: Reverse Loop)
    for (let i = state.powerUps.length - 1; i >= 0; i--) {
        const p = state.powerUps[i];
        p.pos.y += p.vel.y;
        const dist = Math.hypot(p.pos.x - player.pos.x, p.pos.y - player.pos.y);
        if (dist < 100) { p.pos.x += (player.pos.x - p.pos.x) * 0.05; p.pos.y += (player.pos.y - p.pos.y) * 0.05; }
        if (dist < p.width + player.width/2) {
            if (p.type === 'SCORE_GOLD') {
                state.score += Math.floor(Math.random() * 800) + 200;
                playSound('coin');
            } else if (p.type === 'SCORE_SILVER') {
                state.score += Math.floor(Math.random() * 450) + 50; 
                playSound('coin');
            } else if (p.type === 'INVINCIBILITY') {
                playSound('invincible');
                player.invulnerableTimer = 300; 
                player.lastHitFrame = 0; 
                state.score += 500;
                createExplosion(state, player.pos.x, player.pos.y, 10, COLORS.POWERUP_INVINCIBILITY);
            } else {
                playSound('powerup');
                state.score += 100;
                if (p.type === 'HEALTH') player.hp = Math.min(player.hp + 15, player.maxHp); // Nerfed from 30 to 15
                else if (p.type === 'BOMB') player.bombs++;
                else if (p.type === 'P_UPGRADE') player.weaponLevel = Math.min(player.weaponLevel + 1, MAX_WEAPON_LEVEL);
                else {
                    const isSameWeaponType = (p.type === 'P_RED' && player.weaponType === WeaponType.VULCAN) ||
                                             (p.type === 'P_BLUE' && player.weaponType === WeaponType.LASER) ||
                                             (p.type === 'P_PURPLE' && player.weaponType === WeaponType.PLASMA);
                    
                    if (!isSameWeaponType) {
                        player.weaponType = p.type === 'P_RED' ? WeaponType.VULCAN : p.type === 'P_BLUE' ? WeaponType.LASER : WeaponType.PLASMA;
                    } else {
                        if (player.weaponLevel >= MAX_WEAPON_LEVEL) {
                            player.hyperModeTimer = 600; 
                            playSound('powerup');
                        } else {
                            const levels = Math.random() < 0.2 ? 2 : 1;
                            player.weaponLevel = Math.min(player.weaponLevel + levels, MAX_WEAPON_LEVEL);
                        }
                        player.weaponVariant = (player.weaponVariant + 1) % 3;
                    }
                }
            }
            state.powerUps.splice(i, 1);
            continue;
        }
        if (p.pos.y > CANVAS_HEIGHT + 50) state.powerUps.splice(i, 1);
    }

    // Particles (Optimized: Reverse Loop)
    for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        if (p.type === 'shockwave') {
            p.scale += 5;
            p.life -= 0.04;
        } else if (p.subtype === 'debris') {
             p.life -= 0.01;
             p.pos.x += p.vel.x;
             p.pos.y += p.vel.y;
             p.rotation! += p.rotationSpeed!;
        } else {
            p.life -= 0.02; 
            p.pos.x += p.vel.x;
            p.pos.y += p.vel.y;
        }
        if (p.life <= 0) state.particles.splice(i, 1);
    }

    // Collisions (Player Bullets -> Enemies)
    state.bullets.forEach(bullet => {
        if (bullet.owner !== 'player' || bullet.markedForDeletion) return;
        state.enemies.forEach(enemy => {
           if (Math.abs(bullet.pos.x - enemy.pos.x) < enemy.width/2 + bullet.width/2 && 
               Math.abs(bullet.pos.y - enemy.pos.y) < enemy.height/2 + bullet.height/2) {
                 let damage = bullet.damage;
                 let isCrit = false;
                 if (enemy.type === 'boss') {
                      const distToCenter = Math.hypot(bullet.pos.x - enemy.pos.x, bullet.pos.y - enemy.pos.y);
                      // Weak Point Logic (Center Core)
                      if (distToCenter < 25) { 
                          damage *= 2.5; // Critical Hit Multiplier
                          isCrit = true; 
                          // Critical Hit Visuals
                          state.particles.push({
                                id: 'crit_'+Math.random(),
                                pos: { x: bullet.pos.x, y: bullet.pos.y },
                                vel: { x: 0, y: 0 },
                                life: 0.15, maxLife: 0.15, scale: 30, color: '#fff', 
                                markedForDeletion: false, type: 'particle', width: 0, height: 0
                          });
                      }
                 }
                 enemy.hp -= damage;
                 if (bullet.behavior !== 'beam' && bullet.behavior !== 'mine') bullet.markedForDeletion = true; 
                 createExplosion(state, bullet.pos.x, bullet.pos.y, 1, isCrit ? '#fbbf24' : bullet.color);
           }
        });
    });

    // Collisions (Enemies/EnemyBullets -> Player)
    if (player.invulnerableTimer > 0) player.invulnerableTimer--;
    else {
       state.bullets.forEach(bullet => {
           if (bullet.owner !== 'enemy' || bullet.markedForDeletion) return;
           if (Math.hypot(bullet.pos.x - player.pos.x, bullet.pos.y - player.pos.y) < PLAYER_HITBOX + bullet.width/2) {
               bullet.markedForDeletion = true;
               player.hp -= 15;
               player.invulnerableTimer = 60;
               player.lastHitFrame = state.frame; 
               state.cameraShake = 10;
               createExplosion(state, player.pos.x, player.pos.y, 10, COLORS.PLAYER);
               playSound('explode');
               if (player.hp <= 0) setGameState(GameState.GAME_OVER);
           }
       });
       state.enemies.forEach(enemy => {
           if (Math.hypot(enemy.pos.x - player.pos.x, enemy.pos.y - player.pos.y) < (enemy.width + player.width) / 2.5) {
                player.hp -= 30;
                enemy.hp -= 50;
                player.invulnerableTimer = 60;
                player.lastHitFrame = state.frame; 
                state.cameraShake = 15;
                createExplosion(state, (player.pos.x+enemy.pos.x)/2, (player.pos.y+enemy.pos.y)/2, 20, '#fff');
                playSound('explode');
                if (player.hp <= 0) setGameState(GameState.GAME_OVER);
           }
       });
    }

    if (state.frame % 5 === 0) {
        setScore(state.score);
        setPlayerStats({ hp: player.hp, maxHp: player.maxHp, bombs: player.bombs, weaponType: player.weaponType, weaponLevel: player.weaponLevel });
    }
    if (state.cameraShake > 0) state.cameraShake *= 0.9;
  };

  // --- Rendering ---
  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const state = stateRef.current;
    const { player, cameraShake } = state;

    ctx.fillStyle = '#02040a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    if (cameraShake > 0) {
        ctx.translate((Math.random()-0.5)*cameraShake, (Math.random()-0.5)*cameraShake);
    }

    state.stars.forEach(star => {
        ctx.globalAlpha = Math.random() * 0.3 + star.brightness * 0.5;
        ctx.fillStyle = COLORS.STAR;
        ctx.beginPath(); ctx.arc(star.x, star.y, star.size, 0, Math.PI*2); ctx.fill();
    });
    state.clouds.forEach(c => {
         ctx.fillStyle = '#1e3a8a';
         ctx.globalAlpha = c.alpha;
         ctx.fillRect(c.x, c.y, c.width, c.height);
    });
    ctx.globalAlpha = 1.0;

    // Render Bomb Squad
    state.bombSquad.forEach(plane => {
        ctx.save();
        ctx.translate(plane.x, plane.y);
        // Draw shadow
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(10, 20); ctx.lineTo(-10, 20); ctx.fill();
        
        // Draw Plane
        ctx.fillStyle = '#94a3b8'; // Slate-400
        ctx.beginPath(); 
        ctx.moveTo(0, -20); 
        ctx.lineTo(15, 15); 
        ctx.lineTo(0, 5); 
        ctx.lineTo(-15, 15); 
        ctx.fill();
        
        // Engine Glow
        ctx.fillStyle = '#f97316'; // Orange
        ctx.beginPath(); ctx.arc(-8, 15, 2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(8, 15, 2, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    });

    state.powerUps.forEach(p => {
        if (p.type === 'SCORE_GOLD' || p.type === 'SCORE_SILVER') {
             ctx.save(); ctx.translate(p.pos.x, p.pos.y); 
             const scaleX = Math.cos(state.frame * 0.1);
             ctx.scale(scaleX, 1);
             const color = p.type === 'SCORE_GOLD' ? COLORS.SCORE_GOLD : COLORS.SCORE_SILVER;
             ctx.shadowBlur = 15; ctx.shadowColor = color;
             ctx.fillStyle = color;
             ctx.beginPath(); ctx.arc(0,0, 12, 0, Math.PI*2); ctx.fill();
             ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
             ctx.fillStyle = '#fff'; 
             ctx.font = 'bold 16px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
             ctx.fillText('$', 0, 1);
             ctx.restore();
        } else if (p.type === 'INVINCIBILITY') {
             ctx.save(); ctx.translate(p.pos.x, p.pos.y);
             ctx.shadowBlur = 20; ctx.shadowColor = COLORS.POWERUP_INVINCIBILITY;
             ctx.fillStyle = '#222';
             ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI*2); ctx.fill();
             ctx.strokeStyle = COLORS.POWERUP_INVINCIBILITY; ctx.lineWidth = 3; ctx.stroke();
             ctx.fillStyle = '#fff'; ctx.font = 'bold 16px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
             ctx.fillText('S', 0, 0); 
             ctx.beginPath(); ctx.arc(0, 0, 18 + Math.sin(state.frame * 0.2) * 2, 0, Math.PI*2); 
             ctx.strokeStyle = `rgba(34, 211, 238, ${0.5 + Math.sin(state.frame * 0.2)*0.3})`;
             ctx.stroke();
             ctx.restore();
        } else {
            ctx.shadowBlur = 15; ctx.shadowColor = p.color; ctx.fillStyle = '#222';
            ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, 14, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = p.type.includes('RED')?COLORS.POWERUP_RED:p.type.includes('BLUE')?COLORS.POWERUP_BLUE:p.type.includes('PURPLE')?COLORS.POWERUP_PURPLE:p.type.includes('BOMB')?COLORS.BOMB:'#22c55e';
            ctx.lineWidth = 3; ctx.stroke();
            ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(p.type === 'P_UPGRADE' ? 'UP' : p.type[0].replace('P_',''), p.pos.x, p.pos.y);
            ctx.shadowBlur = 0;
        }
    });

    state.bullets.forEach(b => {
        ctx.shadowBlur = 8; ctx.shadowColor = b.color; ctx.fillStyle = b.color;
        if (b.owner === 'player') {
             ctx.save(); ctx.translate(b.pos.x, b.pos.y); ctx.rotate(b.angle || -Math.PI/2);
             if (b.behavior === 'homing' || b.behavior === 'mine') {
                 ctx.shadowBlur = 15;
                 ctx.fillStyle = COLORS.PLAYER_PLASMA;
                 ctx.beginPath(); ctx.arc(0, 0, b.behavior === 'mine' ? 9 : 7, 0, Math.PI*2); ctx.fill();
                 ctx.strokeStyle = COLORS.PLAYER_PLASMA; ctx.lineWidth = 1;
                 ctx.beginPath(); ctx.arc(0, 0, 10 + Math.sin(state.frame*0.5)*2, 0, Math.PI*2); ctx.stroke();
             } else if (b.behavior === 'beam') {
                ctx.fillRect(-b.height/2, -b.width/2, b.height, b.width);
             } else {
                ctx.beginPath(); ctx.ellipse(0, 0, b.height/2, b.width/2, 0, 0, Math.PI*2); ctx.fill();
             }
             ctx.restore();
        } else {
            ctx.beginPath(); ctx.arc(b.pos.x, b.pos.y, b.width/2, 0, Math.PI*2); ctx.fillStyle = '#fff'; ctx.fill();
            ctx.beginPath(); ctx.arc(b.pos.x, b.pos.y, b.width/2 + 2, 0, Math.PI*2); ctx.fillStyle = b.color; ctx.globalAlpha = 0.5; ctx.fill(); ctx.globalAlpha = 1.0;
        }
        ctx.shadowBlur = 0;
    });

    const isShieldActive = player.invulnerableTimer > 60; 
    
    if (isShieldActive || Math.floor(player.invulnerableTimer / 4) % 2 === 0) {
        ctx.save(); ctx.translate(player.pos.x, player.pos.y);
        ctx.fillStyle = player.color;
        
        // HYPER MODE AURA
        if (player.hyperModeTimer > 0) {
             ctx.shadowBlur = 20 + Math.sin(state.frame*0.5)*10;
             ctx.shadowColor = '#fbbf24';
             ctx.strokeStyle = `rgba(251, 191, 36, ${0.5 + Math.sin(state.frame*0.5)*0.5})`;
             ctx.lineWidth = 4;
             ctx.beginPath(); ctx.arc(0,0, 45, 0, Math.PI*2); ctx.stroke();
        }

        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.ellipse(0, 40, 20, 10, 0, 0, Math.PI*2); ctx.fill();

        ctx.fillStyle = player.color;
        ctx.beginPath(); 
        ctx.moveTo(0, -25); 
        ctx.lineTo(8, -10); ctx.lineTo(15, 20); ctx.lineTo(0, 15); ctx.lineTo(-15, 20); ctx.lineTo(-8, -10); 
        ctx.fill();
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(25, 15); ctx.lineTo(25, 25); ctx.lineTo(5, 20); ctx.fill();
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-25, 15); ctx.lineTo(-25, 25); ctx.lineTo(-5, 20); ctx.fill();

        if (isShieldActive) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = COLORS.POWERUP_INVINCIBILITY;
            ctx.strokeStyle = COLORS.POWERUP_INVINCIBILITY;
            ctx.lineWidth = 3;
            ctx.globalAlpha = 0.6 + Math.sin(state.frame * 0.2) * 0.3;
            ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI * 2); ctx.stroke();
            ctx.globalAlpha = 0.2;
            ctx.fillStyle = COLORS.POWERUP_INVINCIBILITY;
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }

        if (state.frame - player.lastHitFrame > REGEN_DELAY_FRAMES && player.hp < player.maxHp) {
            ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2; ctx.globalAlpha = 0.5 + Math.sin(state.frame*0.2)*0.3;
            ctx.beginPath(); ctx.arc(0, 0, 35, 0, Math.PI*2); ctx.stroke();
            // Green cross
            ctx.fillStyle = '#4ade80';
            if (state.frame % 60 < 30) {
                ctx.fillRect(-5, -20, 10, 40);
                ctx.fillRect(-20, -5, 40, 10);
            }
        }
        ctx.restore();
    }

    state.enemies.forEach(e => {
        ctx.save(); ctx.translate(e.pos.x, e.pos.y);
        ctx.fillStyle = e.color;
        ctx.shadowColor = e.color;
        
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.ellipse(0, 40, e.width/2, e.height/4, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = e.color;

        if (e.type === 'boss') {
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(0, -60);
            ctx.lineTo(40, -20); ctx.lineTo(60, 20); ctx.lineTo(30, 50); ctx.lineTo(-30, 50); ctx.lineTo(-60, 20); ctx.lineTo(-40, -20);
            ctx.closePath();
            ctx.fill();
            
            // Render Weak Point (Pulsing Core)
            const pulse = Math.sin(state.frame * 0.2) * 0.5 + 0.5; 
            // Outer ring target
            ctx.strokeStyle = `rgba(255, 50, 50, ${0.5 + pulse * 0.5})`;
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(0, 0, 20 + pulse * 5, 0, Math.PI*2); ctx.stroke();
            
            // Inner Core
            ctx.fillStyle = `rgba(255, ${200 + pulse * 55}, ${200 + pulse * 55}, 1)`;
            ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI*2); ctx.fill();
            
            // Core glow
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#f87171';
            ctx.fillStyle = '#ef4444';
            ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.fill();

        } else if (e.type === 'fighter') {
            ctx.beginPath();
            ctx.moveTo(0, 15); ctx.lineTo(15, -15); ctx.lineTo(0, -5); ctx.lineTo(-15, -15);
            ctx.closePath();
            ctx.fill();
        } else if (e.type === 'interceptor') {
            ctx.beginPath();
            ctx.moveTo(0, 20); ctx.lineTo(10, -20); ctx.lineTo(0, -10); ctx.lineTo(-10, -20);
            ctx.closePath();
            ctx.fill();
        } else if (e.type === 'bomber') {
            ctx.beginPath();
            ctx.moveTo(0, 10); ctx.lineTo(25, -10); ctx.lineTo(0, -5); ctx.lineTo(-25, -10);
            ctx.closePath();
            ctx.fill();
        } else if (e.type === 'tank') {
            ctx.fillRect(-20, -20, 40, 40);
            ctx.fillStyle = '#000'; ctx.fillRect(-5, 0, 10, 25); 
        }
        ctx.shadowBlur = 0;
        ctx.restore();
    });

    state.particles.forEach(p => {
        ctx.save(); ctx.translate(p.pos.x, p.pos.y);
        ctx.globalAlpha = Math.max(0, p.life);
        
        if (p.id === 'bomb_flash') { 
            ctx.fillStyle = '#fff'; 
            ctx.resetTransform(); 
            ctx.fillRect(0,0, CANVAS_WIDTH, CANVAS_HEIGHT); 
        } else if (p.type === 'shockwave') {
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(0, 0, p.scale, 0, Math.PI*2); ctx.stroke();
        } else if (p.subtype === 'debris') {
            ctx.rotate(p.rotation || 0);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.scale, -p.scale, p.scale*2, p.scale*2);
        } else { 
            ctx.fillStyle = p.color; 
            ctx.beginPath(); ctx.arc(0, 0, p.scale, 0, Math.PI*2); ctx.fill(); 
        }
        ctx.restore();
    });
    
    if (state.player.invulnerableTimer > 55 && !isShieldActive && player.hp > 0) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    if (state.levelTransitionTimer > 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, CANVAS_HEIGHT/2-50, CANVAS_WIDTH, 100);
        ctx.fillStyle = '#fbbf24'; 
        ctx.font = 'bold 48px "Microsoft YaHei", sans-serif'; 
        ctx.textAlign = 'center'; 
        ctx.fillText(`第 ${state.level} 关`, CANVAS_WIDTH/2, CANVAS_HEIGHT/2 + 10);
    }

    // Reset transform
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  };

  const loop = () => { update(); render(); requestRef.current = requestAnimationFrame(loop); };
  useEffect(() => { requestRef.current = requestAnimationFrame(loop); return () => cancelAnimationFrame(requestRef.current); }, [gameState]);

  useEffect(() => {
     // FIXED: Removed '&& stateRef.current.frame === 0' to ensure reset happens on restart
     if (gameState === GameState.PLAYING) {
         resetGame();
     }
  }, [gameState, startingWeapon]);

  return (
    <div 
      className="relative w-full h-full bg-black flex justify-center overflow-hidden touch-none select-none"
      onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
    >
      <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="h-full w-auto object-contain shadow-2xl" />
      <div className="absolute bottom-8 right-8 z-20 md:hidden">
         <button onPointerDown={(e) => { e.preventDefault(); triggerBomb(); }} className="w-20 h-20 bg-red-600/80 rounded-full border-4 border-red-400 text-white font-bold text-xl">BOMB</button>
      </div>
    </div>
  );
};

export default GameCanvas;