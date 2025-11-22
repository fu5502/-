
export enum GameState {
  MENU,
  PLAYING,
  GAME_OVER,
  VICTORY
}

export enum WeaponType {
  VULCAN, // Spread red
  LASER,  // Focused blue
  PLASMA  // Homing purple
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  pos: Vector2;
  vel: Vector2;
  width: number;
  height: number;
  color: string;
  markedForDeletion: boolean;
}

export interface Player extends Entity {
  hp: number;
  maxHp: number;
  speed: number;
  weaponType: WeaponType;
  weaponLevel: number;
  bombs: number;
  invulnerableTimer: number;
  lastHitFrame: number; // For regeneration logic
  hyperModeTimer: number; // New: Duration of rapid fire mode
  weaponVariant: number;  // New: Slight variation in bullet spread
}

export interface Enemy extends Entity {
  hp: number;
  maxHp: number;
  type: 'fighter' | 'tank' | 'boss' | 'interceptor' | 'bomber';
  scoreValue: number;
  shootTimer: number;
  patternOffset: number;
  attackPattern?: 'straight' | 'aimed' | 'spread' | 'spiral';
}

export interface Bullet extends Entity {
  owner: 'player' | 'enemy';
  damage: number;
  angle?: number;
  behavior?: 'normal' | 'homing' | 'beam' | 'mine' | 'backfire'; // Added mine/backfire for variety
}

export interface Particle extends Entity {
  life: number;
  maxLife: number;
  scale: number;
  type?: 'particle' | 'shockwave';
  subtype?: 'debris';
  rotation?: number;
  rotationSpeed?: number;
}

export interface PowerUp extends Entity {
  type: 'P_RED' | 'P_BLUE' | 'P_PURPLE' | 'P_UPGRADE' | 'BOMB' | 'HEALTH' | 'SCORE_GOLD' | 'SCORE_SILVER' | 'INVINCIBILITY';
}

export interface LeaderboardEntry {
  id?: number;
  name: string;
  score: number;
  date: string;
}

export interface GameContextData {
  score: number;
  highScore: number;
  gameState: GameState;
  setGameState: (state: GameState) => void;
}
