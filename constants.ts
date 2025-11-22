export const CANVAS_WIDTH = 600;
export const CANVAS_HEIGHT = 800;

export const PLAYER_SPEED = 5;
export const PLAYER_SIZE = 24; // Visual radius roughly
export const PLAYER_HITBOX = 6; // Tiny hitbox for bullet hell

export const BULLET_SPEED_PLAYER = 12;
export const BULLET_SPEED_ENEMY = 4;

export const ENEMY_SPAWN_RATE_INITIAL = 60; // Frames
export const BOSS_SCORE_THRESHOLD = 2000;

export const COLORS = {
  PLAYER: '#3b82f6', // Blue-500
  PLAYER_BULLET: '#60a5fa',
  PLAYER_PLASMA: '#c084fc', // Purple-400
  ENEMY_FIGHTER: '#ef4444', // Red-500
  ENEMY_INTERCEPTOR: '#facc15', // Yellow-400
  ENEMY_BOMBER: '#94a3b8', // Slate-400
  ENEMY_TANK: '#22c55e', // Green-500
  ENEMY_BOSS: '#a855f7', // Purple-500
  ENEMY_BULLET: '#fca5a5', // bright red
  POWERUP_RED: '#ef4444',
  POWERUP_BLUE: '#3b82f6',
  POWERUP_PURPLE: '#a855f7', // Purple-500
  POWERUP_GENERIC: '#facc15', // Yellow
  BOMB: '#f59e0b', // Amber
  STAR: '#ffffff',
};

export const KEYS = {
  UP: ['ArrowUp', 'w', 'W'],
  DOWN: ['ArrowDown', 's', 'S'],
  LEFT: ['ArrowLeft', 'a', 'A'],
  RIGHT: ['ArrowRight', 'd', 'D'],
  SHOOT: [' '], // Space
  BOMB: ['b', 'B', 'Shift'],
};