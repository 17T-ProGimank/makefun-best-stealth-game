// Midnight Archive — guard patrol, vision cones and detection.
// One job: everything a guard does: walk its waypoints (routed around walls
// with a grid search), look with a cone, hear sprinting feet, get suspicious,
// chase, and lose you again.

import {
  TILE, GUARD_RADIUS, GUARD_PATROL_SPEED, GUARD_CHASE_SPEED,
  GUARD_INVESTIGATE_SPEED, GUARD_VIEW_RANGE, GUARD_VIEW_HALF_ANGLE,
  GUARD_HEARING_RADIUS, DETECT_FILL_BASE, SHADOW_VISIBILITY,
  SNEAK_VISIBILITY, SPRINT_VISIBILITY, ALERT_CHASE_SECONDS,
  LOSE_SIGHT_SECONDS,
} from './config.js';
import { tileAt, isSolidTile } from './world.js';

export const GUARD_STATES = { PATROL: 'patrol', SUSPICIOUS: 'suspicious', CHASE: 'chase', SEARCH: 'search' };

// Step along a segment; true when no solid tile blocks the way.
export function hasLineOfSight(level, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i++) {
    const x = x0 + (dx * i) / steps;
    const y = y0 + (dy * i) / steps;
    if (isSolidTile(tileAt(level, Math.floor(x / TILE), Math.floor(y / TILE)))) return false;
  }
  return true;
}

// How far a sight ray travels before it hits a wall or its full range.
export function castSightRay(level, x, y, angle, maxDist) {
  const step = 6;
  for (let d = step; d <= maxDist; d += step) {
    const px = x + Math.cos(angle) * d;
    const py = y + Math.sin(angle) * d;
    if (isSolidTile(tileAt(level, Math.floor(px / TILE), Math.floor(py / TILE)))) return d - step;
  }
  return maxDist;
}

// Breadth-first route across walkable tiles, as a list of pixel centres.
export function findPath(level, sx, sy, tx, ty) {
  const key = (c, r) => c + ',' + r;
  const start = key(sx, sy);
  const goal = key(tx, ty);
  if (isSolidTile(tileAt(level, tx, ty))) return [];
  const prev = new Map([[start, null]]);
  const queue = [start];
  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur === goal) break;
    const [c, r] = cur.split(',').map(Number);
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc;
      const nr = r + dr;
      const nk = key(nc, nr);
      if (prev.has(nk)) continue;
      if (isSolidTile(tileAt(level, nc, nr))) continue;
      prev.set(nk, cur);
      queue.push(nk);
    }
  }
  if (!prev.has(goal)) return [];
  const path = [];
  let cur = goal;
  while (cur !== start) {
    const [c, r] = cur.split(',').map(Number);
    path.unshift({ x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 });
    cur = prev.get(cur);
  }
  return path;
}

export function makeGuard(def, level) {
  const start = def.waypoints[0];
  return {
    x: start[0] * TILE + TILE / 2,
    y: start[1] * TILE + TILE / 2,
    dir: 0,
    waypoints: def.waypoints.map((w) => ({ x: w[0] * TILE + TILE / 2, y: w[1] * TILE + TILE / 2 })),
    wpIndex: 1,
    wait: def.wait || 1,
    waitTimer: 0,
    state: GUARD_STATES.PATROL,
    chaseTimer: 0,
    loseSightTimer: 0,
    searchTimer: 0,
    lastSeen: null,
    investigateTarget: null,
    path: [],
    pathDest: '',
    pathTimer: 0,
    scanAngle: 0,
    alertFlash: 0,
  };
}

// Walk the guard's current route one step; true when the route is done.
function followPath(guard, dt, speed) {
  if (guard.path.length === 0) return true;
  const target = guard.path[0];
  const dx = target.x - guard.x;
  const dy = target.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 3) {
    guard.path.shift();
    return guard.path.length === 0;
  }
  const step = Math.min(dist, speed * dt);
  guard.x += (dx / dist) * step;
  guard.y += (dy / dist) * step;
  guard.dir = Math.atan2(dy, dx);
  return false;
}

// (Re)route to a pixel target when it moved to a new tile.
function routeTo(guard, level, tx, ty) {
  const dest = Math.floor(tx / TILE) + ',' + Math.floor(ty / TILE);
  if (guard.pathDest === dest && guard.path.length > 0) return;
  guard.pathDest = dest;
  guard.path = findPath(
    level,
    Math.floor(guard.x / TILE), Math.floor(guard.y / TILE),
    Math.floor(tx / TILE), Math.floor(ty / TILE),
  );
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// True when this guard can currently see the player, and how fast the
// detection meter should fill (0 when unseen).
export function guardSeesPlayer(guard, level, player, shadows) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > GUARD_VIEW_RANGE) return 0;
  const angleTo = Math.atan2(dy, dx);
  if (Math.abs(angleDiff(angleTo, guard.dir)) > GUARD_VIEW_HALF_ANGLE) return 0;
  if (!hasLineOfSight(level, guard.x, guard.y, player.x, player.y)) return 0;
  let rate = DETECT_FILL_BASE * (1 - (dist / GUARD_VIEW_RANGE) * 0.55);
  const tileKey = Math.floor(player.x / TILE) + ',' + Math.floor(player.y / TILE);
  if (shadows.has(tileKey)) rate *= SHADOW_VISIBILITY;
  if (player.sneaking) rate *= SNEAK_VISIBILITY;
  if (player.sprinting) rate *= SPRINT_VISIBILITY;
  return rate;
}

export function updateGuard(guard, dt, level, player, shadows, events) {
  const seenRate = guardSeesPlayer(guard, level, player, shadows);
  const sees = seenRate > 0;

  if (guard.state === GUARD_STATES.PATROL) {
    if (sees) {
      guard.lastSeen = { x: player.x, y: player.y };
      guard.state = GUARD_STATES.SUSPICIOUS;
      guard.scanAngle = guard.dir;
      guard.path = [];
      guard.pathDest = '';
    } else if (guard.waitTimer > 0) {
      guard.waitTimer -= dt;
      guard.dir += Math.sin(performance.now() / 900 + guard.x) * 0.0006;
    } else {
      const target = guard.waypoints[guard.wpIndex];
      routeTo(guard, level, target.x, target.y);
      if (followPath(guard, dt, GUARD_PATROL_SPEED)) {
        guard.wpIndex = (guard.wpIndex + 1) % guard.waypoints.length;
        guard.waitTimer = guard.wait;
        guard.pathDest = '';
      }
    }
  } else if (guard.state === GUARD_STATES.SUSPICIOUS) {
    if (sees) {
      guard.lastSeen = { x: player.x, y: player.y };
      guard.dir = Math.atan2(player.y - guard.y, player.x - guard.x);
    } else if (guard.investigateTarget) {
      routeTo(guard, level, guard.investigateTarget.x, guard.investigateTarget.y);
      if (followPath(guard, dt, GUARD_INVESTIGATE_SPEED)) {
        guard.investigateTarget = null;
        guard.state = GUARD_STATES.SEARCH;
        guard.searchTimer = 2.2;
      }
    } else {
      guard.dir += dt * 0.9; // glance around while something feels wrong
    }
  } else if (guard.state === GUARD_STATES.CHASE) {
    guard.chaseTimer -= dt;
    guard.pathTimer -= dt;
    if (sees) {
      guard.lastSeen = { x: player.x, y: player.y };
      guard.loseSightTimer = LOSE_SIGHT_SECONDS;
    } else {
      guard.loseSightTimer -= dt;
    }
    if (guard.lastSeen) {
      if (guard.pathTimer <= 0) {
        guard.pathTimer = 0.4;
        guard.pathDest = ''; // re-route to the moving thief
      }
      routeTo(guard, level, guard.lastSeen.x, guard.lastSeen.y);
      followPath(guard, dt, GUARD_CHASE_SPEED);
    }
    if (guard.chaseTimer <= 0 || guard.loseSightTimer <= 0) {
      guard.state = GUARD_STATES.SEARCH;
      guard.searchTimer = 2.5;
      guard.path = [];
      guard.pathDest = '';
    }
  } else if (guard.state === GUARD_STATES.SEARCH) {
    guard.searchTimer -= dt;
    guard.dir += dt * 1.6; // sweep the room looking for you
    if (sees) {
      guard.lastSeen = { x: player.x, y: player.y };
      guard.state = GUARD_STATES.SUSPICIOUS;
    } else if (guard.searchTimer <= 0) {
      guard.state = GUARD_STATES.PATROL;
      guard.waitTimer = 0.4;
      guard.path = [];
      guard.pathDest = '';
    }
  }

  // Sprinting feet are loud: a nearby guard comes to listen.
  if (player.noisePulse && player.noisePulse > 0) {
    const d = Math.hypot(player.x - guard.x, player.y - guard.y);
    if (d < GUARD_HEARING_RADIUS && guard.state === GUARD_STATES.PATROL) {
      guard.state = GUARD_STATES.SUSPICIOUS;
      guard.investigateTarget = { x: player.x, y: player.y };
      events.push({ type: 'heard', guard });
    }
  }

  // Caught: a guard reaches you.
  const touch = Math.hypot(player.x - guard.x, player.y - guard.y);
  if (touch < GUARD_RADIUS + 13) {
    events.push({ type: 'caught', guard });
  }

  return seenRate;
}

export function raiseAlarm(guards, player) {
  for (const guard of guards) {
    if (guard.state !== GUARD_STATES.CHASE) {
      guard.state = GUARD_STATES.CHASE;
      guard.chaseTimer = ALERT_CHASE_SECONDS;
      guard.loseSightTimer = LOSE_SIGHT_SECONDS;
      guard.lastSeen = { x: player.x, y: player.y };
      guard.alertFlash = 1;
      guard.path = [];
      guard.pathDest = '';
      guard.pathTimer = 0;
    }
  }
}

export function calmGuards(guards) {
  for (const guard of guards) {
    guard.state = GUARD_STATES.PATROL;
    guard.investigateTarget = null;
    guard.lastSeen = null;
    guard.path = [];
    guard.pathDest = '';
  }
}
