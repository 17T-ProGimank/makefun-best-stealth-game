// Midnight Archive — shared tuning constants and palette.
// One job: every number and colour the other modules agree on.

export const TILE = 40;
export const COLS = 24;
export const ROWS = 15;
export const PLAY_W = COLS * TILE; // 960
export const PLAY_H = ROWS * TILE; // 600
export const HUD_H = 46;
export const CANVAS_W = PLAY_W;
export const CANVAS_H = HUD_H + PLAY_H; // 646

export const PLAYER_RADIUS = 13;
export const PLAYER_WALK_SPEED = 150; // px per second
export const PLAYER_SNEAK_SPEED = 82;
export const PLAYER_SPRINT_SPEED = 215;

export const GUARD_RADIUS = 14;
export const GUARD_PATROL_SPEED = 62;
export const GUARD_CHASE_SPEED = 138;
export const GUARD_INVESTIGATE_SPEED = 95;
export const GUARD_VIEW_RANGE = 215;
export const GUARD_VIEW_HALF_ANGLE = 0.61; // ~35 degrees each side
export const GUARD_HEARING_RADIUS = 118;

export const DETECT_FILL_BASE = 1.05; // per second at point blank, full light
export const DETECT_DRAIN = 0.22; // per second while unseen
export const SUSPICIOUS_AT = 0.35;
export const ALERTED_AT = 1.0;
export const SHADOW_VISIBILITY = 0.38; // detection multiplier in shadow
export const SNEAK_VISIBILITY = 0.55;
export const SPRINT_VISIBILITY = 1.25;
export const ALERT_CHASE_SECONDS = 6;
export const LOSE_SIGHT_SECONDS = 3;

export const PALETTE = {
  floorA: '#202839',
  floorB: '#1c2334',
  floorLine: '#262f45',
  wall: '#454f68',
  wallTop: '#5d6a8c',
  wallEdge: '#2c3449',
  crate: '#7a5a2e',
  crateTop: '#9c783d',
  crateEdge: '#4a3517',
  shadow: '#0a0f1e',
  seal: '#ffd34d',
  sealRing: '#ffedb0',
  exit: '#39d98a',
  exitDark: '#0f7a44',
  player: '#e8e4d8',
  playerCloak: '#3d4a6b',
  guard: '#c94f4f',
  guardUniform: '#7a2e35',
  coneCalm: 'rgba(255, 214, 90, 0.30)',
  coneCalmEdge: 'rgba(255, 214, 90, 0.75)',
  coneSuspicious: 'rgba(255, 150, 60, 0.34)',
  coneSuspiciousEdge: 'rgba(255, 150, 60, 0.8)',
  coneAlerted: 'rgba(255, 70, 60, 0.38)',
  coneAlertedEdge: 'rgba(255, 70, 60, 0.9)',
  hudBg: '#12172a',
  hudText: '#e8e4d8',
  hudDim: '#8b94ad',
  danger: '#ff5a4e',
  ok: '#39d98a',
  gold: '#ffd34d',
};
