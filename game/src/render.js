// Midnight Archive — everything drawn on the canvas.
// One job: turn the game state into a readable night scene: floor, walls,
// cover, shadow pools, vision cones, guards, the thief, HUD and screens.

import {
  TILE, COLS, ROWS, PLAY_W, PLAY_H, HUD_H, PALETTE,
  GUARD_VIEW_RANGE, GUARD_VIEW_HALF_ANGLE, SUSPICIOUS_AT,
} from './config.js';
import { castSightRay } from './guards.js';
import { GUARD_STATES } from './guards.js';

function conePolygon(level, guard) {
  const rays = 14;
  const pts = [{ x: guard.x, y: guard.y }];
  for (let i = 0; i <= rays; i++) {
    const a = guard.dir - GUARD_VIEW_HALF_ANGLE + (2 * GUARD_VIEW_HALF_ANGLE * i) / rays;
    const d = castSightRay(level, guard.x, guard.y, a, GUARD_VIEW_RANGE);
    pts.push({ x: guard.x + Math.cos(a) * d, y: guard.y + Math.sin(a) * d });
  }
  return pts;
}

function drawCone(ctx, level, guard) {
  const pts = conePolygon(level, guard);
  let fill = PALETTE.coneCalm;
  let edge = PALETTE.coneCalmEdge;
  if (guard.state === GUARD_STATES.CHASE) { fill = PALETTE.coneAlerted; edge = PALETTE.coneAlertedEdge; }
  else if (guard.state === GUARD_STATES.SUSPICIOUS || guard.state === GUARD_STATES.SEARCH) {
    fill = PALETTE.coneSuspicious; edge = PALETTE.coneSuspiciousEdge;
  }
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawGuard(ctx, guard, time) {
  const bob = Math.sin(time * 6 + guard.x * 0.05) * 1.2;
  // body
  ctx.beginPath();
  ctx.arc(guard.x, guard.y + bob * 0.3, 14, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.guardUniform;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#3d1418';
  ctx.stroke();
  // face + cap brim toward facing
  const fx = Math.cos(guard.dir);
  const fy = Math.sin(guard.dir);
  ctx.beginPath();
  ctx.arc(guard.x + fx * 5, guard.y + fy * 5 + bob * 0.3, 7, 0, Math.PI * 2);
  ctx.fillStyle = '#e8b48a';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(guard.x + fx * 8, guard.y + fy * 8 + bob * 0.3, 6, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.guard;
  ctx.fill();
  // state mark
  const mark = guard.state === GUARD_STATES.CHASE ? '!'
    : guard.state === GUARD_STATES.SUSPICIOUS || guard.state === GUARD_STATES.SEARCH ? '?' : '';
  if (mark) {
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = guard.state === GUARD_STATES.CHASE ? '#ff5a4e' : '#ffb03a';
    ctx.fillText(mark, guard.x, guard.y - 22);
  }
}

function drawPlayer(ctx, player, time) {
  const bob = player.moving ? Math.sin(time * 10) * 1.5 : Math.sin(time * 2) * 0.8;
  // cloak
  ctx.beginPath();
  ctx.arc(player.x, player.y + bob * 0.3, 13, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.playerCloak;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#1d2438';
  ctx.stroke();
  // hood
  ctx.beginPath();
  ctx.arc(player.x + Math.cos(player.dir) * 4, player.y + Math.sin(player.dir) * 4 + bob * 0.3, 7.5, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.player;
  ctx.fill();
  // eyes
  ctx.fillStyle = '#141824';
  ctx.beginPath();
  ctx.arc(player.x + Math.cos(player.dir) * 7 - Math.sin(player.dir) * 2.5, player.y + Math.sin(player.dir) * 7 + Math.cos(player.dir) * 2.5 + bob * 0.3, 1.4, 0, Math.PI * 2);
  ctx.arc(player.x + Math.cos(player.dir) * 7 + Math.sin(player.dir) * 2.5, player.y + Math.sin(player.dir) * 7 - Math.cos(player.dir) * 2.5 + bob * 0.3, 1.4, 0, Math.PI * 2);
  ctx.fill();
  if (player.sneaking) {
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#9fb4d8';
    ctx.fillText('sneaking', player.x, player.y - 20);
  }
  if (player.inShadow) {
    ctx.beginPath();
    ctx.arc(player.x, player.y, 18, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(120, 160, 255, 0.35)';
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

export function drawWorld(ctx, game, time) {
  const { level, walls, shadows, seals, exit } = game;
  ctx.save();
  ctx.translate(0, HUD_H);

  // floor
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const ch = level.map[row][col];
      ctx.fillStyle = (col + row) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
      ctx.fillRect(col * TILE, row * TILE, TILE, TILE);
      if (ch === '~') {
        ctx.fillStyle = PALETTE.shadow;
        ctx.fillRect(col * TILE + 1, row * TILE + 1, TILE - 2, TILE - 2);
      }
    }
  }
  // floor grid
  ctx.strokeStyle = PALETTE.floorLine;
  ctx.lineWidth = 1;
  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath(); ctx.moveTo(c * TILE, 0); ctx.lineTo(c * TILE, PLAY_H); ctx.stroke();
  }
  for (let r = 0; r <= ROWS; r++) {
    ctx.beginPath(); ctx.moveTo(0, r * TILE); ctx.lineTo(PLAY_W, r * TILE); ctx.stroke();
  }

  // lamp pools: warm light where it is safe to be seen moving slowly
  for (const lamp of game.lamps) {
    const glow = ctx.createRadialGradient(lamp.x, lamp.y, 6, lamp.x, lamp.y, 78);
    glow.addColorStop(0, 'rgba(255, 205, 120, 0.20)');
    glow.addColorStop(1, 'rgba(255, 205, 120, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, 78, 0, Math.PI * 2);
    ctx.fill();
  }

  // exit door
  if (exit) {
    const ex = exit.col * TILE;
    const ey = exit.row * TILE;
    const open = game.sealsLeft === 0;
    ctx.fillStyle = open ? PALETTE.exit : PALETTE.exitDark;
    ctx.fillRect(ex + 3, ey + 3, TILE - 6, TILE - 6);
    ctx.strokeStyle = '#d7ffe9';
    ctx.lineWidth = 2;
    ctx.strokeRect(ex + 3, ey + 3, TILE - 6, TILE - 6);
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#062b18';
    ctx.shadowBlur = 4;
    ctx.fillText(open ? 'EXIT' : 'LOCKED', ex + TILE / 2, ey + TILE / 2 + 4);
    ctx.shadowBlur = 0;
    if (open) {
      const pulse = 0.5 + Math.sin(time * 4) * 0.3;
      ctx.strokeStyle = `rgba(57, 217, 138, ${pulse})`;
      ctx.lineWidth = 3;
      ctx.strokeRect(ex + 1, ey + 1, TILE - 2, TILE - 2);
    }
  }

  // seals
  for (const seal of seals) {
    if (seal.taken) continue;
    const sx = seal.col * TILE + TILE / 2;
    const sy = seal.row * TILE + TILE / 2 + Math.sin(time * 3 + seal.col) * 2;
    ctx.beginPath();
    ctx.arc(sx, sy, 11, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.seal;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = PALETTE.sealRing;
    ctx.stroke();
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#4a3200';
    ctx.fillText('§', sx, sy + 4);
  }

  // vision cones (under guards, over floor)
  for (const guard of game.guards) drawCone(ctx, level, guard);

  // crates (cover) and walls, drawn over cones so cover reads at a glance
  for (const key of walls) {
    const [col, row] = key.split(',').map(Number);
    const ch = level.map[row][col];
    const x = col * TILE;
    const y = row * TILE;
    if (ch === 'C') {
      ctx.fillStyle = PALETTE.crate;
      ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
      ctx.fillStyle = PALETTE.crateTop;
      ctx.fillRect(x + 2, y + 2, TILE - 4, 8);
      ctx.strokeStyle = PALETTE.crateEdge;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 2, y + 2, TILE - 4, TILE - 4);
      ctx.beginPath();
      ctx.moveTo(x + 2, y + TILE / 2);
      ctx.lineTo(x + TILE - 2, y + TILE / 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = PALETTE.wall;
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = PALETTE.wallTop;
      ctx.fillRect(x, y, TILE, 7);
      ctx.strokeStyle = PALETTE.wallEdge;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
    }
  }

  // footstep rings
  for (const f of game.player.footsteps) {
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(200, 210, 235, ${Math.max(0, f.a)})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  for (const guard of game.guards) drawGuard(ctx, guard, time);
  drawPlayer(ctx, game.player, time);

  ctx.restore();
}

export function drawHUD(ctx, game) {
  ctx.fillStyle = PALETTE.hudBg;
  ctx.fillRect(0, 0, PLAY_W, HUD_H);
  ctx.fillStyle = '#2c3550';
  ctx.fillRect(0, HUD_H - 2, PLAY_W, 2);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillStyle = PALETTE.hudText;
  ctx.fillText(game.level.name, 14, HUD_H / 2 - 8);
  ctx.font = '12px sans-serif';
  ctx.fillStyle = PALETTE.hudDim;
  ctx.fillText(game.level.hint, 14, HUD_H / 2 + 11);

  // seals
  const sealsTotal = 3;
  for (let i = 0; i < sealsTotal; i++) {
    const x = 560 + i * 26;
    ctx.beginPath();
    ctx.arc(x, HUD_H / 2, 9, 0, Math.PI * 2);
    ctx.fillStyle = i < game.player.seals ? PALETTE.seal : '#3a4157';
    ctx.fill();
    ctx.strokeStyle = i < game.player.seals ? PALETTE.sealRing : '#565e75';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.font = '12px sans-serif';
  ctx.fillStyle = PALETTE.hudDim;
  ctx.fillText('seals', 560 + sealsTotal * 26 + 4, HUD_H / 2);

  // detection meter
  const mx = 700;
  const mw = 150;
  ctx.fillStyle = '#3a4157';
  ctx.fillRect(mx, HUD_H / 2 - 8, mw, 16);
  const det = game.detection;
  ctx.fillStyle = det >= 1 ? PALETTE.danger : det >= SUSPICIOUS_AT ? '#ff9a3c' : PALETTE.ok;
  ctx.fillRect(mx, HUD_H / 2 - 8, mw * Math.min(1, det), 16);
  ctx.strokeStyle = '#565e75';
  ctx.strokeRect(mx, HUD_H / 2 - 8, mw, 16);
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#0e1220';
  if (det > 0.08) ctx.fillText(Math.round(det * 100) + '%', mx + mw / 2, HUD_H / 2 + 0.5);
  ctx.textAlign = 'left';
  ctx.font = '12px sans-serif';
  ctx.fillStyle = PALETTE.hudDim;
  ctx.fillText('seen', mx + mw + 6, HUD_H / 2);

  // alarm state + timer
  const alarm = game.alarm;
  ctx.font = 'bold 13px sans-serif';
  ctx.fillStyle = alarm === 'ALERTED' ? PALETTE.danger : alarm === 'SUSPICIOUS' ? '#ff9a3c' : PALETTE.ok;
  ctx.textAlign = 'right';
  ctx.fillText(alarm, PLAY_W - 14, HUD_H / 2 - 8);
  ctx.font = '12px sans-serif';
  ctx.fillStyle = PALETTE.hudDim;
  ctx.fillText(formatTime(game.elapsed), PLAY_W - 14, HUD_H / 2 + 11);
  ctx.textAlign = 'left';
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m + ':' + String(s).padStart(2, '0');
}

function overlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(8, 11, 22, 0.78)';
  ctx.fillRect(0, 0, PLAY_W, HUD_H + PLAY_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent || PALETTE.hudText;
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText(title, PLAY_W / 2, 250);
  ctx.font = '16px sans-serif';
  ctx.fillStyle = PALETTE.hudText;
  lines.forEach((line, i) => ctx.fillText(line, PLAY_W / 2, 300 + i * 28));
  ctx.textAlign = 'left';
}

export function drawTitle(ctx) {
  overlay(ctx, 'MIDNIGHT ARCHIVE', [
    'A thief. Three nights. One archive that never sleeps.',
    'WASD / arrows — move      Shift — sneak      Space — sprint (loud!)',
    'Collect 3 seals, then reach the green exit unseen.',
    'Hide in shadows, stay out of the yellow cones.',
    '',
    'Click or press Enter to begin Night One',
  ], PALETTE.gold);
}

export function drawLevelClear(ctx, game) {
  overlay(ctx, game.levelIndex >= 2 ? 'THE ARCHIVE IS YOURS' : 'NIGHT CLEAR', [
    game.level.name + ' — all seals taken, exit reached unseen.',
    'Time: ' + formatTime(game.elapsed) + '     Seals: ' + game.player.seals + '/3',
    '',
    game.levelIndex >= 2 ? 'Press Enter for the final tally' : 'Press Enter for the next night',
  ], PALETTE.exit);
}

export function drawCaught(ctx, game) {
  overlay(ctx, 'CAUGHT!', [
    'A guard laid hands on you in ' + game.level.name + '.',
    'The archive keeps its seals — this time.',
    '',
    'Press R to try the night again',
  ], PALETTE.danger);
}

export function drawVictory(ctx, game) {
  overlay(ctx, 'ALL THREE NIGHTS COMPLETE', [
    'Every seal. Every wing. Never once caught.',
    'Total time: ' + formatTime(game.totalTime) + '     Seals: 9/9',
    '',
    'The Midnight Archive is yours. Press R to play again.',
  ], PALETTE.gold);
}
