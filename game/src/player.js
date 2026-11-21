// Midnight Archive — the thief: movement, sneak/sprint, noise, seals.
// One job: where the player is, how fast they move, and what they pick up.

import {
  TILE, PLAYER_RADIUS, PLAYER_WALK_SPEED, PLAYER_SNEAK_SPEED,
  PLAYER_SPRINT_SPEED,
} from './config.js';
import { tileAt, isSolidTile } from './world.js';

export function makePlayer(spawn) {
  return {
    x: spawn.col * TILE + TILE / 2,
    y: spawn.row * TILE + TILE / 2,
    dir: 0,
    moving: false,
    sneaking: false,
    sprinting: false,
    noisePulse: 0,
    noiseTimer: 0,
    stepTimer: 0,
    justStepped: false,
    footsteps: [], // expanding rings, drawn by render.js
    seals: 0,
    inShadow: false,
  };
}

function blocked(level, x, y) {
  const r = PLAYER_RADIUS - 1;
  const points = [
    [x - r, y - r], [x + r, y - r], [x - r, y + r], [x + r, y + r],
    [x, y - r], [x, y + r], [x - r, y], [x + r, y],
  ];
  for (const [px, py] of points) {
    if (isSolidTile(tileAt(level, Math.floor(px / TILE), Math.floor(py / TILE)))) return true;
  }
  return false;
}

export function updatePlayer(player, dt, input, level, shadows) {
  let mx = 0;
  let my = 0;
  if (input.left) mx -= 1;
  if (input.right) mx += 1;
  if (input.up) my -= 1;
  if (input.down) my += 1;
  const len = Math.hypot(mx, my);
  player.moving = len > 0;
  player.sneaking = input.sneak && !input.sprint;
  player.sprinting = input.sprint && len > 0 && !input.sneak;

  const speed = player.sneaking
    ? PLAYER_SNEAK_SPEED
    : player.sprinting
      ? PLAYER_SPRINT_SPEED
      : PLAYER_WALK_SPEED;

  if (len > 0) {
    const nx = player.x + (mx / len) * speed * dt;
    const ny = player.y + (my / len) * speed * dt;
    player.dir = Math.atan2(my, mx);
    if (!blocked(level, nx, player.y)) player.x = nx;
    if (!blocked(level, player.x, ny)) player.y = ny;
  }

  // Footstep rings: slow and faint while sneaking, loud while sprinting.
  player.stepTimer -= dt;
  player.justStepped = false;
  if (player.moving && player.stepTimer <= 0) {
    player.stepTimer = player.sprinting ? 0.22 : player.sneaking ? 0.62 : 0.38;
    player.justStepped = true;
    player.footsteps.push({ x: player.x, y: player.y, r: 4, max: player.sprinting ? 34 : 18, a: 0.5 });
  }
  for (const f of player.footsteps) { f.r += dt * 46; f.a -= dt * 0.9; }
  player.footsteps = player.footsteps.filter((f) => f.a > 0 && f.r < f.max);

  // Sprinting feet are heard: pulse a noise event twice a second.
  player.noisePulse = 0;
  if (player.sprinting && player.moving) {
    player.noiseTimer -= dt;
    if (player.noiseTimer <= 0) {
      player.noiseTimer = 0.5;
      player.noisePulse = 1;
    }
  }

  const tileKey = Math.floor(player.x / TILE) + ',' + Math.floor(player.y / TILE);
  player.inShadow = shadows.has(tileKey);
  return player;
}

// Returns the seal just collected, or null.
export function tryCollectSeal(player, seals) {
  for (const seal of seals) {
    if (seal.taken) continue;
    const sx = seal.col * TILE + TILE / 2;
    const sy = seal.row * TILE + TILE / 2;
    if (Math.hypot(player.x - sx, player.y - sy) < 26) {
      seal.taken = true;
      player.seals += 1;
      return seal;
    }
  }
  return null;
}

export function atExit(player, exit) {
  if (!exit) return false;
  const ex = exit.col * TILE + TILE / 2;
  const ey = exit.row * TILE + TILE / 2;
  return Math.hypot(player.x - ex, player.y - ey) < 28;
}
