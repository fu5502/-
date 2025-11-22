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
  BOSS_SCORE_THRESHOLD
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

// --- BGM Sequencer ---
class MusicSequencer {
  ctx: AudioContext;
  nextNoteTime: number = 0;
  tempo: number = 128;
  lookahead: number = 25.0;
  scheduleAheadTime: number = 0.1;
  current16thNote: number = 0;
  isPlaying: boolean = false;
  timerID: number | null = null;

  constructor() {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = window.gameAudioContext || new AudioCtx();
    window.gameAudioContext = this.ctx;
  }

  nextNote() {
    const secondsPerBeat = 60.0 / this.tempo;
    this.nextNoteTime += 0.25 * secondsPerBeat;
    this.current16thNote++;
    if (this.current16thNote === 16) {
      this.current16thNote = 0;
    }
  }

  scheduleNote(beatNumber: number, time: number) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    // Kick Drum (Every beat: 0, 4, 8, 12)
    if (beatNumber % 4 === 0) {
      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
      gain.gain.setValueAtTime(0.7, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
      osc.start(time);
      osc.stop(time + 0.5);
    }

    // Hi-hat (Every off-beat: 2, 6, 10, 14)
    if (beatNumber % 4 === 2) {
       // White noise approximations are hard with just osc, using high square
       const hOsc = this.ctx.createOscillator();
       const hGain = this.ctx.createGain();
       hOsc.type = 'square';
       hOsc.connect(hGain);
       hGain.connect(this.ctx.destination);
       hOsc.frequency.setValueAtTime(800, time); // low noise
       // Randomized slightly
       if (Math.random() > 0.5) hOsc.frequency.setValueAtTime(1200, time);
       
       hGain.gain.setValueAtTime(0.1, time);
       hGain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
       hOsc.start(time);
       hOsc.stop(time + 0.05);
    }

    // Bass Line (Arpeggio)
    // Scale: C Minor (C, D, Eb, F, G, Ab, Bb)
    const root = 65.41; // C2
    const notes = [root, root * 1.2, root * 1.5, root * 2]; // C, Eb, G, C
    if (beatNumber < 16) {
       const noteIdx = Math.floor(beatNumber / 2) % 4;
       const freq = notes[noteIdx];
       
       const bOsc = this.ctx.createOscillator();
       const bGain = this.ctx.createGain();
       bOsc.type = 'sawtooth';
       bOsc.connect(bGain);
       bGain.connect(this.ctx.destination);
       bOsc.frequency.setValueAtTime(freq, time);
       bGain.gain.setValueAtTime(0.15, time);
       bGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
       bOsc.start(time);
       bOsc.stop(time + 0.2);
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

// Singleton for BGM
let bgmSequencer: MusicSequencer | null = null;


// --- SFX System ---
const playSound = (type: 'shoot' | 'explode' | 'powerup' | 'laser' | 'bomb') => {
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
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'square';
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.setValueAtTime(50, now);
        osc2.frequency.linearRampToValueAtTime(20, now + 0.3);
        gain2.gain.setValueAtTime(0.2, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc2.start(now);
        osc2.stop(now + 0.3);
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
    console.error("Audio error", e);
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
      width: 60, // Increased width to match sprite for accurate boundary checks
      height: 50,
      color: COLORS.PLAYER,
      hp: 100,
      maxHp: 100,
      speed: PLAYER_SPEED,
      weaponType: startingWeapon,
      weaponLevel: 1,
      bombs: 2,
      invulnerableTimer: 0,
      markedForDeletion: false
    } as Player,
    bullets: [] as Bullet[],
    enemies: [] as Enemy[],
    particles: [] as Particle[],
    powerUps: [] as PowerUp[],
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
         bgmSequencer = new MusicSequencer();
     }
     if (gameState === GameState.PLAYING) {
         bgmSequencer.start();
     } else {
         bgmSequencer.stop();
     }
     return () => {
         // Cleanup if unmounting completely
     }
  }, [gameState]);

  // --- Input Handling ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        stateRef.current.keys.add(e.key);
        if (window.gameAudioContext?.state === 'suspended') {
            window.gameAudioContext.resume();
        }
    }
    const handleKeyUp = (e: KeyboardEvent) => stateRef.current.keys.delete(e.key);
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
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
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

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
    }

    touchRef.current.startX = e.touches[0].clientX;
    touchRef.current.startY = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    touchRef.current.active = false;
  };

  const triggerBomb = useCallback(() => {
     const state = stateRef.current;
     if (state.player.bombs > 0 && state.player.hp > 0) {
       state.player.bombs--;
       state.cameraShake = 25;
       playSound('bomb');
       state.bullets = state.bullets.filter(b => b.owner === 'player');
       state.enemies.forEach(e => {
         e.hp -= 200;
         createExplosion(state, e.pos.x, e.pos.y, 30, '#f59e0b');
       });
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
     }
  }, []);

  // --- Game Loop Helpers ---

  const createExplosion = (state: any, x: number, y: number, count: number, color: string) => {
    for (let i = 0; i < count/2; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 2 + 0.5;
        state.particles.push({
          id: Math.random().toString(),
          pos: { x, y },
          vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
          life: Math.random() * 0.5 + 0.5,
          maxLife: 1.0,
          scale: Math.random() * 5 + 2,
          color: '#555',
          markedForDeletion: false
        });
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
        markedForDeletion: false
      });
    }
  };

  const spawnPowerUp = (state: any, x: number, y: number) => {
    if (Math.random() > 0.35) return; // Drop rate
    const r = Math.random();
    let type: PowerUp['type'] = 'P_RED';
    
    // Distributed drop rates
    if (r < 0.20) type = 'P_RED';
    else if (r < 0.40) type = 'P_BLUE';
    else if (r < 0.55) type = 'P_PURPLE'; // Added Plasma drop
    else if (r < 0.75) type = 'P_UPGRADE';
    else if (r < 0.90) type = 'HEALTH';
    else type = 'BOMB';

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
        if (state.player.weaponType === WeaponType.LASER) {
            width = 14;
            height = 45;
            color = '#60a5fa';
            damage = 7; 
        } else if (state.player.weaponType === WeaponType.PLASMA) {
            width = 18;
            height = 18;
            color = COLORS.PLAYER_PLASMA;
            damage = 16;
        } else {
            width = 16;
            height = 26;
            color = '#f87171';
            damage = 12;
        }
        // Apply scale (for sub-munitions)
        damage = Math.max(1, damage * damageScale);
    } else {
        // Enemy bullet stats scale slightly with level
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
    // Set player color based on starting weapon
    if (startingWeapon === WeaponType.LASER) state.player.color = '#3b82f6'; // Blue
    else if (startingWeapon === WeaponType.PLASMA) state.player.color = '#c084fc'; // Purple
    else state.player.color = '#ef4444'; // Red
    
    state.score = 0;
    state.bullets = [];
    state.enemies = [];
    state.particles = [];
    state.powerUps = [];
    state.frame = 0;
    state.bossActive = false;
    state.level = 1;
    state.levelTransitionTimer = 0;
    state.nextBossScoreThreshold = BOSS_SCORE_THRESHOLD;
    
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

    // --- Level Transition ---
    if (state.levelTransitionTimer > 0) {
        state.levelTransitionTimer--;
        // During transition, auto-pilot player to center?
        // Just let them fly and collect powerups.
        // Push clouds fast
        state.clouds.forEach(c => c.y += c.speed * 2);
        return; 
    }

    // --- Background Updates ---
    state.clouds.forEach(c => {
        c.y += c.speed;
        if (c.y > CANVAS_HEIGHT + c.height) {
            c.y = -c.height;
            c.x = Math.random() * CANVAS_WIDTH;
        }
    });

    // --- Player Movement ---
    let dx = 0;
    let dy = 0;
    if (state.keys.has('ArrowLeft') || state.keys.has('a')) dx -= player.speed;
    if (state.keys.has('ArrowRight') || state.keys.has('d')) dx += player.speed;
    if (state.keys.has('ArrowUp') || state.keys.has('w')) dy -= player.speed;
    if (state.keys.has('ArrowDown') || state.keys.has('s')) dy += player.speed;

    player.pos.x += dx;
    player.pos.y += dy;
    
    // Boundary Check (Strict)
    const halfW = player.width / 2;
    const halfH = player.height / 2;
    player.pos.x = Math.max(halfW, Math.min(CANVAS_WIDTH - halfW, player.pos.x));
    player.pos.y = Math.max(halfH, Math.min(CANVAS_HEIGHT - halfH, player.pos.y));

    // --- Player Shooting ---
    // INCREASED FIRE RATE (Mod 4 instead of 6)
    if (state.frame % 4 === 0) { 
      const pX = player.pos.x;
      const pY = player.pos.y - 20;
      
      if (player.weaponType === WeaponType.VULCAN) {
        playSound('shoot');
        // Main Spread
        spawnBullet(state, 'player', pX - 8, pY, -Math.PI/2, BULLET_SPEED_PLAYER);
        spawnBullet(state, 'player', pX + 8, pY, -Math.PI/2, BULLET_SPEED_PLAYER);
        
        if (player.weaponLevel >= 2) {
           spawnBullet(state, 'player', pX - 18, pY + 5, -Math.PI/2 - 0.1, BULLET_SPEED_PLAYER);
           spawnBullet(state, 'player', pX + 18, pY + 5, -Math.PI/2 + 0.1, BULLET_SPEED_PLAYER);
        }
        if (player.weaponLevel >= 3) {
           spawnBullet(state, 'player', pX - 28, pY + 10, -Math.PI/2 - 0.25, BULLET_SPEED_PLAYER);
           spawnBullet(state, 'player', pX + 28, pY + 10, -Math.PI/2 + 0.25, BULLET_SPEED_PLAYER);
           // SUB-WEAPON: Homing Missiles (Weak)
           if (state.frame % 8 === 0) {
             spawnBullet(state, 'player', pX - 30, pY + 20, -Math.PI/2 - 0.5, BULLET_SPEED_PLAYER * 0.8, 'homing', 0.5);
             spawnBullet(state, 'player', pX + 30, pY + 20, -Math.PI/2 + 0.5, BULLET_SPEED_PLAYER * 0.8, 'homing', 0.5);
           }
        }
        if (player.weaponLevel >= 4) {
           spawnBullet(state, 'player', pX - 35, pY + 15, -Math.PI/2 - 0.4, BULLET_SPEED_PLAYER);
           spawnBullet(state, 'player', pX + 35, pY + 15, -Math.PI/2 + 0.4, BULLET_SPEED_PLAYER);
           // More homing
           if (state.frame % 8 === 0) {
             spawnBullet(state, 'player', pX - 40, pY + 20, -Math.PI/2 - 0.8, BULLET_SPEED_PLAYER * 0.8, 'homing', 0.5);
             spawnBullet(state, 'player', pX + 40, pY + 20, -Math.PI/2 + 0.8, BULLET_SPEED_PLAYER * 0.8, 'homing', 0.5);
           }
        }

      } else if (player.weaponType === WeaponType.LASER) {
        playSound('laser');
        const speed = BULLET_SPEED_PLAYER * 2;
        // Main Heavy Beam
        spawnBullet(state, 'player', pX, pY - 10, -Math.PI/2, speed, 'beam');
        
        if (player.weaponLevel >= 2) {
            // Side Beams
            spawnBullet(state, 'player', pX - 14, pY + 10, -Math.PI/2, speed, 'beam', 0.7);
            spawnBullet(state, 'player', pX + 14, pY + 10, -Math.PI/2, speed, 'beam', 0.7);
        }
        if (player.weaponLevel >= 3) {
            // SUB-WEAPON: Spread Laser Waves (Weak, Diagonal)
            spawnBullet(state, 'player', pX - 20, pY + 15, -Math.PI/2 - 0.15, speed, 'beam', 0.4);
            spawnBullet(state, 'player', pX + 20, pY + 15, -Math.PI/2 + 0.15, speed, 'beam', 0.4);
        }
        if (player.weaponLevel >= 4) {
             // Wide Coverage
            spawnBullet(state, 'player', pX - 30, pY + 20, -Math.PI/2 - 0.3, speed, 'beam', 0.4);
            spawnBullet(state, 'player', pX + 30, pY + 20, -Math.PI/2 + 0.3, speed, 'beam', 0.4);
        }
      }
    }

    // Plasma has separate slower fire rate logic
    if (player.weaponType === WeaponType.PLASMA && state.frame % 8 === 0) {
       const pX = player.pos.x;
       const pY = player.pos.y - 20;
       playSound('shoot');
       const speed = BULLET_SPEED_PLAYER * 1.1;
       
       // Base Homing
       spawnBullet(state, 'player', pX - 10, pY, -Math.PI/2 - 0.2, speed, 'homing');
       spawnBullet(state, 'player', pX + 10, pY, -Math.PI/2 + 0.2, speed, 'homing');
       
       if (player.weaponLevel >= 2) {
           spawnBullet(state, 'player', pX - 25, pY + 10, -Math.PI/2 - 0.6, speed, 'homing');
           spawnBullet(state, 'player', pX + 25, pY + 10, -Math.PI/2 + 0.6, speed, 'homing');
       }
       if (player.weaponLevel >= 3) {
           spawnBullet(state, 'player', pX - 35, pY + 15, -Math.PI/2 - 1.0, speed, 'homing');
           spawnBullet(state, 'player', pX + 35, pY + 15, -Math.PI/2 + 1.0, speed, 'homing');
           // SUB-WEAPON: Penetrator (Straight, Fast, Non-homing High Damage)
           spawnBullet(state, 'player', pX, pY, -Math.PI/2, speed * 1.5, 'normal', 1.2);
       }
       if (player.weaponLevel >= 4) {
           spawnBullet(state, 'player', pX - 45, pY + 20, -Math.PI/2 - 1.2, speed, 'homing');
           spawnBullet(state, 'player', pX + 45, pY + 20, -Math.PI/2 + 1.2, speed, 'homing');
           // Double Penetrator
           spawnBullet(state, 'player', pX - 8, pY + 5, -Math.PI/2, speed * 1.5, 'normal', 1.2);
           spawnBullet(state, 'player', pX + 8, pY + 5, -Math.PI/2, speed * 1.5, 'normal', 1.2);
       }
    }

    // --- Enemy Spawning ---
    // Spawn rate increases with level
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

       // Difficulty Scaling
       const hpMult = 1 + (state.level - 1) * 0.3;
       
       if (r > 0.9) {
           type = 'bomber';
           hp = 120 * hpMult;
           scoreVal = 400;
           width = 56;
           color = COLORS.ENEMY_BOMBER;
           velY = 1.5;
       } else if (r > 0.75) {
           type = 'tank';
           hp = 100 * hpMult;
           scoreVal = 300;
           width = 48;
           color = COLORS.ENEMY_TANK;
           velY = 1.2;
       } else if (r > 0.55) {
           type = 'interceptor';
           hp = 40 * hpMult;
           scoreVal = 150;
           width = 32;
           color = COLORS.ENEMY_INTERCEPTOR;
           velY = 4.5;
       } else {
           type = 'fighter';
           hp = 25 * hpMult;
       }

       state.enemies.push({
         id: Math.random().toString(),
         pos: { x, y: -50 },
         vel: { x: 0, y: velY },
         width: width,
         height: width,
         hp: hp,
         maxHp: hp,
         type: type,
         color: color,
         scoreValue: scoreVal,
         shootTimer: Math.random() * 60,
         patternOffset: Math.random() * 100,
         markedForDeletion: false
       });
    }

    // Boss Spawning - Threshold increases each loop
    if (!state.bossActive && state.score >= state.nextBossScoreThreshold && state.enemies.length === 0) {
        state.bossActive = true;
        state.enemies.push({
            id: 'BOSS',
            pos: { x: CANVAS_WIDTH / 2, y: -150 },
            vel: { x: 0, y: 1 },
            width: 140,
            height: 120,
            hp: 3000 * (1 + (state.level - 1) * 0.5),
            maxHp: 3000 * (1 + (state.level - 1) * 0.5),
            type: 'boss',
            color: COLORS.ENEMY_BOSS,
            scoreValue: 5000 * state.level,
            shootTimer: 0,
            patternOffset: 0,
            markedForDeletion: false
        });
    }

    // --- Update Enemies ---
    state.enemies.forEach(enemy => {
      if (enemy.type === 'boss') {
          if (enemy.pos.y < 150) enemy.pos.y += enemy.vel.y;
          else {
              enemy.pos.x += Math.sin(state.frame / 60) * 1.5;
              enemy.pos.y += Math.cos(state.frame / 40) * 0.5;
          }
          
          // Boss Patterns - Faster with level
          const rateMult = Math.max(0.5, 1.0 - (state.level * 0.1));
          
          if (state.frame % Math.floor(40 * rateMult) === 0) {
              for(let i=0; i<16; i++) {
                  spawnBullet(state, 'enemy', enemy.pos.x, enemy.pos.y, (Math.PI * 2 / 16) * i + state.frame/50, 5);
              }
              playSound('shoot');
          }
          if (state.frame % Math.floor(90 * rateMult) === 0) {
               const angle = Math.atan2(player.pos.y - enemy.pos.y, player.pos.x - enemy.pos.x);
               spawnBullet(state, 'enemy', enemy.pos.x - 40, enemy.pos.y + 20, angle, 7);
               spawnBullet(state, 'enemy', enemy.pos.x + 40, enemy.pos.y + 20, angle, 7);
               spawnBullet(state, 'enemy', enemy.pos.x, enemy.pos.y + 50, angle, 7);
          }
      } else {
          // Regular Enemy Logic
          enemy.pos.y += enemy.vel.y;
          
          // Shoot logic
          enemy.shootTimer++;
          
          // Logic varies by type...
          if (enemy.type === 'interceptor') {
             const dx = player.pos.x - enemy.pos.x;
             enemy.pos.x += dx * 0.02;
             if (enemy.shootTimer > 40) { 
                 enemy.shootTimer = 0;
                 const angle = Math.atan2(player.pos.y - enemy.pos.y, player.pos.x - enemy.pos.x);
                 spawnBullet(state, 'enemy', enemy.pos.x, enemy.pos.y + 10, angle, BULLET_SPEED_ENEMY * 1.5);
             }
          } else if (enemy.type === 'bomber') {
              if (enemy.shootTimer > 90) {
                  enemy.shootTimer = 0;
                  const baseAngle = Math.PI / 2;
                  spawnBullet(state, 'enemy', enemy.pos.x, enemy.pos.y + 20, baseAngle, BULLET_SPEED_ENEMY);
                  spawnBullet(state, 'enemy', enemy.pos.x, enemy.pos.y + 20, baseAngle - 0.4, BULLET_SPEED_ENEMY);
                  spawnBullet(state, 'enemy', enemy.pos.x, enemy.pos.y + 20, baseAngle + 0.4, BULLET_SPEED_ENEMY);
              }
          } else if (enemy.type === 'fighter') {
             enemy.pos.x += Math.sin((enemy.pos.y + enemy.patternOffset) / 40) * 3;
             if (enemy.shootTimer > 100) {
                 enemy.shootTimer = 0;
                 const angle = Math.atan2(player.pos.y - enemy.pos.y, player.pos.x - enemy.pos.x);
                 spawnBullet(state, 'enemy', enemy.pos.x, enemy.pos.y, angle, BULLET_SPEED_ENEMY);
             }
          } else { // Tank
             if (enemy.shootTimer > 100) {
                enemy.shootTimer = 0;
                const angle = Math.atan2(player.pos.y - enemy.pos.y, player.pos.x - enemy.pos.x);
                spawnBullet(state, 'enemy', enemy.pos.x, enemy.pos.y, angle, BULLET_SPEED_ENEMY);
             }
          }
      }
      if (enemy.pos.y > CANVAS_HEIGHT + 100) enemy.markedForDeletion = true;
    });

    // --- Update Bullets ---
    state.bullets.forEach(bullet => {
      if (bullet.behavior === 'homing' && bullet.owner === 'player') {
          let closest = null;
          let minDst = 400;
          for(const e of state.enemies) {
             if(e.markedForDeletion) continue;
             const d = Math.hypot(e.pos.x - bullet.pos.x, e.pos.y - bullet.pos.y);
             if (d < minDst && e.pos.y > 0 && e.pos.y < CANVAS_HEIGHT) { 
                 minDst = d; 
                 closest = e; 
             }
          }
          if (closest) {
              const angle = Math.atan2(closest.pos.y - bullet.pos.y, closest.pos.x - bullet.pos.x);
              const turnSpeed = 0.15;
              const targetVx = Math.cos(angle) * BULLET_SPEED_PLAYER;
              const targetVy = Math.sin(angle) * BULLET_SPEED_PLAYER;
              bullet.vel.x += (targetVx - bullet.vel.x) * turnSpeed;
              bullet.vel.y += (targetVy - bullet.vel.y) * turnSpeed;
              bullet.angle = Math.atan2(bullet.vel.y, bullet.vel.x);
          }
      }
      bullet.pos.x += bullet.vel.x;
      bullet.pos.y += bullet.vel.y;
      if (
        bullet.pos.x < -50 || bullet.pos.x > CANVAS_WIDTH + 50 || 
        bullet.pos.y < -100 || bullet.pos.y > CANVAS_HEIGHT + 50
      ) {
        bullet.markedForDeletion = true;
      }
    });

    // --- PowerUps ---
    state.powerUps.forEach(p => {
        p.pos.y += p.vel.y;
        const dist = Math.hypot(p.pos.x - player.pos.x, p.pos.y - player.pos.y);
        if (dist < 100) {
            p.pos.x += (player.pos.x - p.pos.x) * 0.05;
            p.pos.y += (player.pos.y - p.pos.y) * 0.05;
        }
        if (dist < p.width + player.width/2) {
            playSound('powerup');
            p.markedForDeletion = true;
            state.score += 100;
            
            if (p.type === 'HEALTH') player.hp = Math.min(player.hp + 30, player.maxHp);
            else if (p.type === 'BOMB') player.bombs++;
            else if (p.type === 'P_UPGRADE') {
                player.weaponLevel = Math.min(player.weaponLevel + 1, 4);
            } else if (p.type === 'P_RED') {
                // Inherit level if switching type
                if (player.weaponType !== WeaponType.VULCAN) {
                    player.weaponType = WeaponType.VULCAN; 
                } else {
                    player.weaponLevel = Math.min(player.weaponLevel + 1, 4);
                }
            } else if (p.type === 'P_BLUE') {
                if (player.weaponType !== WeaponType.LASER) {
                    player.weaponType = WeaponType.LASER;
                } else {
                    player.weaponLevel = Math.min(player.weaponLevel + 1, 4);
                }
            } else if (p.type === 'P_PURPLE') {
                if (player.weaponType !== WeaponType.PLASMA) {
                    player.weaponType = WeaponType.PLASMA;
                } else {
                    player.weaponLevel = Math.min(player.weaponLevel + 1, 4);
                }
            }
        }
        if (p.pos.y > CANVAS_HEIGHT + 50) p.markedForDeletion = true;
    });

    // --- Particles ---
    state.particles.forEach(p => {
       p.life -= 0.03;
       p.pos.x += p.vel.x;
       p.pos.y += p.vel.y;
       if (p.life <= 0) p.markedForDeletion = true;
    });

    // --- Collisions ---
    state.bullets.filter(b => b.owner === 'player').forEach(bullet => {
       state.enemies.forEach(enemy => {
          if (enemy.markedForDeletion || bullet.markedForDeletion) return;
          
          if (Math.abs(bullet.pos.x - enemy.pos.x) < enemy.width/2 + bullet.width/2 && 
              Math.abs(bullet.pos.y - enemy.pos.y) < enemy.height/2 + bullet.height/2) {
                enemy.hp -= bullet.damage;
                bullet.markedForDeletion = true;
                createExplosion(state, bullet.pos.x, bullet.pos.y, 1, bullet.color);

                if (enemy.hp <= 0) {
                    playSound('explode');
                    enemy.markedForDeletion = true;
                    state.score += enemy.scoreValue;
                    createExplosion(state, enemy.pos.x, enemy.pos.y, 15, enemy.color);
                    spawnPowerUp(state, enemy.pos.x, enemy.pos.y);
                    state.cameraShake = 2;
                    
                    if (enemy.type === 'boss') {
                        // INFINITE LOOP LOGIC
                        state.bossActive = false;
                        state.level++;
                        state.nextBossScoreThreshold = state.score + BOSS_SCORE_THRESHOLD * state.level;
                        state.levelTransitionTimer = 180; // 3 seconds pause
                        
                        // Clear enemy bullets
                        state.bullets = state.bullets.filter(b => b.owner === 'player');
                        
                        // Reward
                        player.hp = Math.min(player.hp + 50, player.maxHp);
                    }
                }
          }
       });
    });

    if (player.invulnerableTimer > 0) player.invulnerableTimer--;
    else {
       state.bullets.filter(b => b.owner === 'enemy').forEach(bullet => {
           if (bullet.markedForDeletion) return;
           const dist = Math.hypot(bullet.pos.x - player.pos.x, bullet.pos.y - player.pos.y);
           if (dist < PLAYER_HITBOX + bullet.width/2) {
               bullet.markedForDeletion = true;
               player.hp -= 15;
               player.invulnerableTimer = 60;
               state.cameraShake = 10;
               createExplosion(state, player.pos.x, player.pos.y, 10, COLORS.PLAYER);
               playSound('explode');
               if (player.hp <= 0) {
                   setGameState(GameState.GAME_OVER);
                   playSound('explode');
               }
           }
       });
       state.enemies.forEach(enemy => {
           if (enemy.markedForDeletion) return;
           const dist = Math.hypot(enemy.pos.x - player.pos.x, enemy.pos.y - player.pos.y);
           if (dist < (enemy.width + player.width) / 2.5) {
                player.hp -= 30;
                enemy.hp -= 50;
                player.invulnerableTimer = 60;
                state.cameraShake = 15;
                createExplosion(state, (player.pos.x+enemy.pos.x)/2, (player.pos.y+enemy.pos.y)/2, 20, '#fff');
                playSound('explode');
                if (player.hp <= 0) setGameState(GameState.GAME_OVER);
           }
       });
    }

    state.bullets = state.bullets.filter(b => !b.markedForDeletion);
    state.enemies = state.enemies.filter(e => !e.markedForDeletion);
    state.particles = state.particles.filter(p => !p.markedForDeletion);
    state.powerUps = state.powerUps.filter(p => !p.markedForDeletion);

    if (state.frame % 5 === 0) {
        setScore(state.score);
        setPlayerStats({ 
          hp: player.hp, 
          maxHp: player.maxHp, 
          bombs: player.bombs,
          weaponType: player.weaponType,
          weaponLevel: player.weaponLevel
        });
    }
    if (state.cameraShake > 0) state.cameraShake *= 0.9;
    if (state.cameraShake < 0.5) state.cameraShake = 0;
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

    ctx.save();
    if (cameraShake > 0) {
        const sx = (Math.random() - 0.5) * cameraShake;
        const sy = (Math.random() - 0.5) * cameraShake;
        ctx.translate(sx, sy);
    }

    state.stars.forEach(star => {
        star.y += star.speed * (state.levelTransitionTimer > 0 ? 5 : 1);
        if (star.y > CANVAS_HEIGHT) {
            star.y = 0;
            star.x = Math.random() * CANVAS_WIDTH;
        }
        ctx.globalAlpha = Math.random() * 0.3 + star.brightness * 0.5;
        ctx.fillStyle = COLORS.STAR;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI*2);
        ctx.fill();
    });

    state.clouds.forEach(cloud => {
        ctx.globalAlpha = cloud.alpha;
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.ellipse(cloud.x, cloud.y, cloud.width, cloud.height, 0, 0, Math.PI*2);
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // Render entities...
    state.powerUps.forEach(p => {
        ctx.shadowBlur = 15;
        ctx.shadowColor = p.color;
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(p.pos.x, p.pos.y, 14, 0, Math.PI*2);
        ctx.fill();
        
        let strokeColor = '#fff';
        let label = 'P';
        
        if (p.type === 'P_RED') { strokeColor = COLORS.POWERUP_RED; label = 'R'; }
        else if (p.type === 'P_BLUE') { strokeColor = COLORS.POWERUP_BLUE; label = 'L'; }
        else if (p.type === 'P_PURPLE') { strokeColor = COLORS.POWERUP_PURPLE; label = 'P'; }
        else if (p.type === 'P_UPGRADE') { strokeColor = COLORS.POWERUP_GENERIC; label = 'UP'; }
        else if (p.type === 'BOMB') { strokeColor = COLORS.BOMB; label = 'B'; }
        else { strokeColor = '#22c55e'; label = 'H'; }

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial'; // Slightly smaller font for UP
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, p.pos.x, p.pos.y + 1);
        ctx.shadowBlur = 0;
    });

    state.bullets.forEach(b => {
        ctx.shadowBlur = 8;
        ctx.shadowColor = b.color;
        ctx.fillStyle = b.color;
        if (b.owner === 'player') {
             ctx.save();
             ctx.translate(b.pos.x, b.pos.y);
             ctx.rotate(b.angle || -Math.PI/2);
             if (b.behavior === 'homing') {
                 const pulse = Math.sin(state.frame * 0.15);
                 ctx.shadowBlur = 20 + pulse * 5;
                 ctx.shadowColor = COLORS.PLAYER_PLASMA;
                 const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 8);
                 grad.addColorStop(0, '#ffffff');
                 grad.addColorStop(0.3, '#e9d5ff');
                 grad.addColorStop(1, COLORS.PLAYER_PLASMA);
                 ctx.fillStyle = grad;
                 ctx.beginPath();
                 ctx.arc(0, 0, 7, 0, Math.PI*2);
                 ctx.fill();
                 ctx.lineWidth = 1.5;
                 ctx.strokeStyle = `rgba(233, 213, 255, ${0.6 - pulse * 0.2})`;
                 ctx.beginPath();
                 ctx.arc(0, 0, 10 + pulse * 3, 0, Math.PI*2);
                 ctx.stroke();
             } else if (player.weaponType === WeaponType.LASER && b.behavior === 'beam') {
                ctx.fillStyle = '#fff';
                ctx.fillRect(-b.height/2, -b.width/2, b.height, b.width);
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#3b82f6';
                ctx.globalAlpha = 0.6;
                ctx.fillStyle = '#3b82f6';
                ctx.fillRect(-b.height/2 - 2, -b.width/2 - 2, b.height + 4, b.width + 4);
                ctx.globalAlpha = 1.0;
             } else {
                ctx.fillStyle = '#ffedd5';
                ctx.beginPath();
                ctx.ellipse(0, 0, b.height/2, b.width/2, 0, 0, Math.PI*2);
                ctx.fill();
             }
             ctx.restore();
        } else {
            ctx.beginPath();
            ctx.arc(b.pos.x, b.pos.y, b.width/2, 0, Math.PI*2);
            ctx.fillStyle = '#fff';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(b.pos.x, b.pos.y, b.width/2 + 2, 0, Math.PI*2);
            ctx.fillStyle = b.color;
            ctx.globalAlpha = 0.5;
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
        ctx.shadowBlur = 0;
    });

    // Player
    if (player.invulnerableTimer % 4 < 2) {
        ctx.save();
        ctx.translate(player.pos.x, player.pos.y);
        const thrustLen = Math.random() * 10 + 15;
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.moveTo(-5, 25);
        ctx.lineTo(0, 25 + thrustLen);
        ctx.lineTo(5, 25);
        ctx.fill();
        ctx.fillStyle = '#e5e7eb';
        ctx.beginPath();
        ctx.moveTo(0, -25);
        ctx.lineTo(8, -5);
        ctx.lineTo(12, 10);
        ctx.lineTo(0, 5);
        ctx.lineTo(-12, 10);
        ctx.lineTo(-8, -5);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#1d4ed8';
        ctx.beginPath();
        ctx.moveTo(0, -15);
        ctx.lineTo(3, -5);
        ctx.lineTo(0, -2);
        ctx.lineTo(-3, -5);
        ctx.fill();
        ctx.fillStyle = player.color;
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(28, 15);
        ctx.lineTo(28, 25);
        ctx.lineTo(8, 15);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-8, 0);
        ctx.lineTo(-28, 15);
        ctx.lineTo(-28, 25);
        ctx.lineTo(-8, 15);
        ctx.fill();
        ctx.fillStyle = '#333';
        ctx.fillRect(-10, 15, 4, 8);
        ctx.fillRect(6, 15, 4, 8);
        ctx.restore();
    }

    state.enemies.forEach(e => {
        ctx.save();
        ctx.translate(e.pos.x, e.pos.y);
        ctx.shadowBlur = 0;
        if (e.type === 'boss') {
             ctx.shadowColor = '#a855f7';
             ctx.shadowBlur = 15;
             ctx.fillStyle = '#4b5563';
             ctx.beginPath();
             ctx.moveTo(0, -60);
             ctx.lineTo(40, -40);
             ctx.lineTo(70, 0);
             ctx.lineTo(50, 50);
             ctx.lineTo(20, 60);
             ctx.lineTo(-20, 60);
             ctx.lineTo(-50, 50);
             ctx.lineTo(-70, 0);
             ctx.lineTo(-40, -40);
             ctx.closePath();
             ctx.fill();
             ctx.fillStyle = '#a855f7';
             ctx.beginPath();
             ctx.arc(0, 0, 20, 0, Math.PI*2);
             ctx.fill();
             ctx.fillStyle = '#fff';
             ctx.globalAlpha = 0.5 + Math.sin(state.frame * 0.1) * 0.2;
             ctx.beginPath();
             ctx.arc(0, 0, 15, 0, Math.PI*2);
             ctx.fill();
             ctx.globalAlpha = 1.0;
             ctx.fillStyle = '#111';
             ctx.fillRect(-60, -80, 120, 8);
             ctx.fillStyle = '#d946ef';
             ctx.fillRect(-60, -80, 120 * (e.hp / e.maxHp), 8);
        } else if (e.type === 'tank') {
             ctx.fillStyle = '#166534';
             ctx.fillRect(-24, -24, 48, 48);
             ctx.fillStyle = '#4ade80';
             ctx.fillRect(-20, -20, 40, 5);
             ctx.fillRect(-20, 15, 40, 5);
             ctx.fillStyle = '#052e16';
             ctx.beginPath();
             ctx.arc(0, 0, 12, 0, Math.PI*2);
             ctx.fill();
             ctx.fillStyle = '#86efac';
             ctx.fillRect(-4, -30, 8, 30);
        } else if (e.type === 'interceptor') {
             ctx.fillStyle = COLORS.ENEMY_INTERCEPTOR;
             ctx.shadowColor = COLORS.ENEMY_INTERCEPTOR;
             ctx.shadowBlur = 10;
             ctx.beginPath();
             ctx.moveTo(0, 16);
             ctx.lineTo(12, -16);
             ctx.lineTo(0, -8);
             ctx.lineTo(-12, -16);
             ctx.closePath();
             ctx.fill();
             ctx.fillStyle = '#fff';
             ctx.fillRect(-2, -16, 4, 6);
        } else if (e.type === 'bomber') {
             ctx.fillStyle = COLORS.ENEMY_BOMBER;
             ctx.shadowBlur = 5;
             ctx.beginPath();
             ctx.moveTo(0, 20);
             ctx.lineTo(28, 0);
             ctx.lineTo(28, -10);
             ctx.lineTo(0, -20);
             ctx.lineTo(-28, -10);
             ctx.lineTo(-28, 0);
             ctx.closePath();
             ctx.fill();
             ctx.strokeStyle = '#475569';
             ctx.lineWidth = 2;
             ctx.stroke();
        } else {
             ctx.shadowColor = '#ef4444';
             ctx.shadowBlur = 5;
             ctx.fillStyle = '#991b1b';
             ctx.beginPath();
             ctx.moveTo(0, 18);
             ctx.lineTo(18, -12);
             ctx.lineTo(0, -18);
             ctx.lineTo(-18, -12);
             ctx.closePath();
             ctx.fill();
             ctx.fillStyle = '#fecaca';
             ctx.beginPath();
             ctx.moveTo(0, -5);
             ctx.lineTo(5, -10);
             ctx.lineTo(0, -15);
             ctx.lineTo(-5, -10);
             ctx.fill();
        }
        ctx.restore();
    });

    state.particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.life;
        if (p.id === 'bomb_flash') {
             ctx.fillStyle = '#fff';
             ctx.fillRect(0,0, CANVAS_WIDTH, CANVAS_HEIGHT);
        } else {
             ctx.fillStyle = p.color;
             ctx.beginPath();
             ctx.arc(p.pos.x, p.pos.y, p.scale, 0, Math.PI*2);
             ctx.fill();
        }
        ctx.restore();
    });
    
    // --- HUD: Stage Transition Text ---
    if (state.levelTransitionTimer > 0) {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, CANVAS_HEIGHT/2 - 60, CANVAS_WIDTH, 120);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fbbf24'; // Amber
        ctx.font = 'bold 48px Arial';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#fbbf24';
        ctx.fillText(`STAGE ${state.level - 1} CLEAR`, CANVAS_WIDTH/2, CANVAS_HEIGHT/2 - 20);
        
        ctx.fillStyle = '#fff';
        ctx.font = '24px Arial';
        ctx.shadowBlur = 0;
        ctx.fillText(`APPROACHING STAGE ${state.level}...`, CANVAS_WIDTH/2, CANVAS_HEIGHT/2 + 30);
        ctx.restore();
    }

    ctx.restore();
  };

  const loop = () => {
    update();
    render();
    requestRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    if (gameState === GameState.PLAYING && stateRef.current.player.hp <= 0) {
        // Keep it compatible with the rest of the flow, but reset checks
    }
  }, [gameState]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
        if (e.key === 'b' || e.key === 'B') {
            triggerBomb();
        }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [triggerBomb]);

  // Initialize on new game
  useEffect(() => {
     if (gameState === GameState.PLAYING && stateRef.current.frame === 0) {
         resetGame();
     }
  }, [gameState, startingWeapon]);

  return (
    <div 
      className="relative w-full h-full bg-black flex justify-center overflow-hidden touch-none select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="h-full w-auto object-contain shadow-2xl shadow-blue-900/20"
      />
      
      {/* Mobile Bomb Button */}
      <div className="absolute bottom-8 right-8 z-20 md:hidden">
         <button 
            onPointerDown={(e) => { e.preventDefault(); triggerBomb(); }}
            className="w-20 h-20 bg-red-600/80 backdrop-blur rounded-full border-4 border-red-400 shadow-lg active:scale-95 flex items-center justify-center text-white font-bold tracking-widest text-xl"
         >
           BOMB
         </button>
      </div>
    </div>
  );
};

export default GameCanvas;