// Midnight Archive — game state, loop and screenshot scenes.
// One job: own the state machine (title / playing / clear / caught /
// victory), run the update, and set up the four deterministic shot scenes.

import { TILE, HUD_H, DETECT_DRAIN, SUSPICIOUS_AT, ALERTED_AT, ALERT_CHASE_SECONDS } from './config.js';
import { LEVELS, parseLevel, tileCenter } from './world.js';
import { makeGuard, updateGuard, raiseAlarm, calmGuards, GUARD_STATES } from './guards.js';
import { makePlayer, updatePlayer, tryCollectSeal, atExit } from './player.js';
import { makeInput, bindInput } from './input.js';
import {
  makeAudio, resumeAudio, playFootstep, playSeal, playSuspicious,
  playAlarm, playCaught, playLevelClear, playVictory,
} from './audio.js';
import { drawWorld, drawHUD, drawTitle, drawLevelClear, drawCaught, drawVictory } from './render.js';

const STATES = { TITLE: 'title', PLAYING: 'playing', CLEAR: 'clear', CAUGHT: 'caught', VICTORY: 'victory' };

const params = new URLSearchParams(window.location.search);
const SHOT = params.get('shot'); // cover | patrol | alert | victory | null

export function makeGame() {
  return {
    state: STATES.TITLE,
    levelIndex: 0,
    level: LEVELS[0],
    walls: new Set(),
    shadows: new Set(),
    seals: [],
    exit: null,
    guards: [],
    lamps: [],
    player: null,
    detection: 0,
    alarm: 'CALM',
    sealsLeft: 3,
    elapsed: 0,
    totalTime: 0,
    time: 0,
    wasSuspicious: false,
    wasAlerted: false,
  };
}

function loadLevel(game, index) {
  const parsed = parseLevel(index);
  game.levelIndex = index;
  game.level = parsed.level;
  game.walls = parsed.walls;
  game.shadows = parsed.shadows;
  game.seals = parsed.seals;
  game.exit = parsed.exit;
  game.guards = parsed.level.guards.map((def) => makeGuard(def, parsed.level));
  game.player = makePlayer(parsed.spawn);
  game.detection = 0;
  game.alarm = 'CALM';
  game.sealsLeft = 3;
  game.elapsed = 0;
  game.wasSuspicious = false;
  game.wasAlerted = false;
  // lamp pools: fixed warm spots on the floor, pure decoration
  game.lamps = [
    { x: 5 * TILE + 20, y: 2 * TILE + 20 },
    { x: 18 * TILE + 20, y: 7 * TILE + 20 },
    { x: 10 * TILE + 20, y: 12 * TILE + 20 },
  ];
}

function updateGame(game, dt, input, audio) {
  game.time += dt;
  game.elapsed += dt;
  const events = [];

  updatePlayer(game.player, dt, input, game.level, game.shadows);
  if (game.player.justStepped) playFootstep(audio, game.player.sprinting);

  let maxSeen = 0;
  for (const guard of game.guards) {
    const rate = updateGuard(guard, dt, game.level, game.player, game.shadows, events);
    if (rate > maxSeen) maxSeen = rate;
  }

  if (maxSeen > 0) game.detection = Math.min(1, game.detection + maxSeen * dt);
  else game.detection = Math.max(0, game.detection - DETECT_DRAIN * dt);

  const suspicious = game.detection >= SUSPICIOUS_AT && game.detection < ALERTED_AT;
  const alerted = game.detection >= ALERTED_AT;
  game.alarm = alerted ? 'ALERTED' : suspicious ? 'SUSPICIOUS' : 'CALM';

  if (suspicious && !game.wasSuspicious) playSuspicious(audio);
  if (alerted && !game.wasAlerted) {
    playAlarm(audio);
    raiseAlarm(game.guards, game.player);
  }
  game.wasSuspicious = suspicious;
  game.wasAlerted = alerted;

  for (const e of events) {
    if (e.type === 'caught') {
      game.state = STATES.CAUGHT;
      playCaught(audio);
      return;
    }
  }

  const seal = tryCollectSeal(game.player, game.seals);
  if (seal) {
    playSeal(audio);
    game.sealsLeft = game.seals.filter((s) => !s.taken).length;
  }

  if (game.sealsLeft === 0 && atExit(game.player, game.exit)) {
    game.totalTime += game.elapsed;
    if (game.levelIndex >= LEVELS.length - 1) {
      game.state = STATES.VICTORY;
      playVictory(audio);
    } else {
      game.state = STATES.CLEAR;
      playLevelClear(audio);
    }
  }
}

function setupShot(game, shot) {
  if (shot === 'cover') {
    loadLevel(game, 0);
    game.state = STATES.PLAYING;
    // guards mid-patrol, player at the door, everything calm
    game.guards[0].x = 12 * TILE + 20; game.guards[0].y = 2 * TILE + 20; game.guards[0].dir = 0;
    game.guards[1].x = 16 * TILE + 20; game.guards[1].y = 10 * TILE + 20; game.guards[1].dir = Math.PI;
  } else if (shot === 'patrol') {
    loadLevel(game, 0);
    game.state = STATES.PLAYING;
    // thief crouched right behind a guard, whose cone sweeps the open floor
    game.player.x = 6 * TILE + 20; game.player.y = 2 * TILE + 20;
    game.player.sneaking = true;
    game.player.dir = 0;
    game.player.footsteps = [{ x: 5 * TILE + 20, y: 2 * TILE + 20, r: 12, max: 18, a: 0.4 }];
    game.guards[0].x = 8 * TILE + 20; game.guards[0].y = 2 * TILE + 20; game.guards[0].dir = 0;
    game.guards[1].x = 15 * TILE + 20; game.guards[1].y = 11 * TILE + 20; game.guards[1].dir = -Math.PI / 2;
    game.detection = 0.28;
    game.alarm = 'SUSPICIOUS';
  } else if (shot === 'alert') {
    loadLevel(game, 1);
    game.state = STATES.PLAYING;
    // spotted in the open: cone on the thief, alarm up, guard closing in
    game.player.x = 13 * TILE + 20; game.player.y = 7 * TILE + 20;
    game.player.dir = Math.PI;
    game.player.seals = 2;
    game.seals[0].taken = true;
    game.seals[1].taken = true;
    game.sealsLeft = 1;
    game.guards[1].x = 12 * TILE + 20; game.guards[1].y = 7 * TILE + 20;
    game.guards[1].dir = 0;
    game.guards[1].state = GUARD_STATES.CHASE;
    game.guards[1].chaseTimer = ALERT_CHASE_SECONDS;
    game.guards[1].lastSeen = { x: game.player.x, y: game.player.y };
    game.guards[0].x = 8 * TILE + 20; game.guards[0].y = 3 * TILE + 20; game.guards[0].dir = Math.PI / 3;
    game.guards[2].x = 18 * TILE + 20; game.guards[2].y = 12 * TILE + 20; game.guards[2].dir = -Math.PI / 2;
    game.detection = 0.92;
    game.alarm = 'ALERTED';
    game.elapsed = 87;
  } else if (shot === 'victory') {
    loadLevel(game, 2);
    game.state = STATES.VICTORY;
    game.player.seals = 3;
    for (const s of game.seals) s.taken = true;
    game.sealsLeft = 0;
    game.totalTime = 342;
    game.elapsed = 96;
  }
}

function drawGame(ctx, game) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  if (game.state === STATES.TITLE) {
    loadLevelIfNeeded(game);
    drawWorld(ctx, game, game.time);
    drawHUD(ctx, game);
    drawTitle(ctx);
    return;
  }
  drawWorld(ctx, game, game.time);
  drawHUD(ctx, game);
  if (game.state === STATES.CLEAR) drawLevelClear(ctx, game);
  else if (game.state === STATES.CAUGHT) drawCaught(ctx, game);
  else if (game.state === STATES.VICTORY) drawVictory(ctx, game);
}

let titleLevelLoaded = false;
function loadLevelIfNeeded(game) {
  if (!titleLevelLoaded) {
    loadLevel(game, 0);
    titleLevelLoaded = true;
  }
}

function start() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const game = makeGame();
  const input = makeInput();
  const audio = makeAudio();
  bindInput(input, canvas, () => resumeAudio(audio));

  loadLevel(game, 0);

  if (SHOT) {
    setupShot(game, SHOT);
    game.time = 1.7; // settle the bobbing so every shot is stable
    drawGame(ctx, game);
    document.title = 'Midnight Archive — shot ' + SHOT;
    return; // frozen frame: deterministic screenshots
  }

  let last = performance.now();
  let enterPressed = false;
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Enter') enterPressed = true;
    if (e.code === 'KeyR' && (game.state === STATES.CAUGHT || game.state === STATES.VICTORY)) {
      game.totalTime = 0;
      loadLevel(game, 0);
      game.state = STATES.PLAYING;
    }
  });

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    game.time += dt;

    if (game.state === STATES.TITLE) {
      if (enterPressed || input.clicked) {
        game.state = STATES.PLAYING;
        enterPressed = false;
        input.clicked = false;
      }
    } else if (game.state === STATES.PLAYING) {
      updateGame(game, dt, input, audio);
    } else if (game.state === STATES.CLEAR) {
      if (enterPressed) {
        enterPressed = false;
        loadLevel(game, game.levelIndex + 1);
        game.state = STATES.PLAYING;
      }
    } else if (game.state === STATES.CAUGHT) {
      if (enterPressed) {
        enterPressed = false;
        loadLevel(game, game.levelIndex);
        game.state = STATES.PLAYING;
      }
    }
    drawGame(ctx, game);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

start();
