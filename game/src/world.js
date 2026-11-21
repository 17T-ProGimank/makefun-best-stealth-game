// Midnight Archive — level data and map parsing.
// One job: the three archive wings as tile maps, and turning a map into
// walls, cover, shadow, seals, the exit and the player's start.
//
// Legend: '#' wall, '.' floor, 'C' crate (cover, blocks sight and feet),
// '~' shadow pool (walkable, hides you), 'o' archive seal, 'E' exit,
// 'P' player start. Guards are defined per level below the maps.

export const LEVELS = [
  {
    name: 'Night One — The Reading Room',
    hint: 'Collect 3 seals, then slip out the green door. Stay out of the cones.',
    map: [
      '########################',
      '#......#......#........#',
      '#..CC..#..~~..#...o....#',
      '#......#......#........#',
      '#..P...#......#...C....#',
      '#......................#',
      '#......#......#........#',
      '#..~~..#..CC..#..o....E#',
      '#......#......#........#',
      '#......................#',
      '#......#......#........#',
      '#..C...#..~~..#..C.....#',
      '#..o...#......#........#',
      '#......#......#........#',
      '########################',
    ],
    guards: [
      { tx: 6, ty: 2, waypoints: [[6, 2], [17, 2], [17, 6], [6, 6]], wait: 1.2 },
      { tx: 18, ty: 12, waypoints: [[18, 12], [10, 12], [10, 8], [18, 8]], wait: 1.0 },
    ],
  },
  {
    name: 'Night Two — The Map Vault',
    hint: 'Two more patrols, longer sightlines. Shadows are your friends.',
    map: [
      '########################',
      '#..~~....#......#......#',
      '#........#..CC..#..o...#',
      '#..P.....#......#......#',
      '#......................#',
      '#......#......#........#',
      '#..C...#..~~..#..C..o..#',
      '#......#......#........#',
      '#......................#',
      '#......#......#........#',
      '#..~~..#..C...#...CC...#',
      '#......#......#........#',
      '#..o...#......#....~~..#',
      '#......#......#.......E#',
      '########################',
    ],
    guards: [
      { tx: 4, ty: 1, waypoints: [[4, 1], [20, 1], [20, 5], [4, 5]], wait: 0.9 },
      { tx: 12, ty: 7, waypoints: [[12, 7], [12, 12], [20, 12], [20, 7]], wait: 1.4 },
      { tx: 21, ty: 10, waypoints: [[21, 10], [5, 10], [5, 13], [21, 13]], wait: 0.8 },
    ],
  },
  {
    name: 'Night Three — The Director’s Wing',
    hint: 'Four guards, tight halls. One mistake and the whole wing wakes.',
    map: [
      '########################',
      '#..C....#..~~..#...o...#',
      '#.......#......#.......#',
      '#..P....#..C...#..~~...#',
      '#......................#',
      '#......#......#........#',
      '#..~~..#..CC..#..C..o..#',
      '#......#......#........#',
      '#......................#',
      '#......#......#........#',
      '#..C...#..~~..#..CC....#',
      '#......#......#........#',
      '#..o...#..C...#...~~...#',
      '#......#......#.......E#',
      '########################',
    ],
    guards: [
      { tx: 2, ty: 1, waypoints: [[2, 1], [20, 1], [20, 3], [2, 3]], wait: 0.7 },
      { tx: 12, ty: 6, waypoints: [[12, 6], [19, 6], [20, 9], [12, 9]], wait: 1.1 },
      { tx: 5, ty: 11, waypoints: [[5, 11], [15, 11], [15, 13], [5, 13]], wait: 1.0 },
      { tx: 21, ty: 7, waypoints: [[21, 7], [21, 12], [16, 12], [16, 7]], wait: 0.9 },
    ],
  },
];

export function tileAt(level, col, row) {
  if (col < 0 || row < 0 || col >= 24 || row >= 15) return '#';
  return level.map[row][col];
}

export function isSolidTile(ch) {
  return ch === '#' || ch === 'C';
}

export function parseLevel(levelIndex) {
  const level = LEVELS[levelIndex];
  const walls = new Set();
  const crates = [];
  const shadows = new Set();
  const seals = [];
  let exit = null;
  let spawn = null;
  for (let row = 0; row < 15; row++) {
    for (let col = 0; col < 24; col++) {
      const ch = level.map[row][col];
      const key = col + ',' + row;
      if (ch === '#') walls.add(key);
      else if (ch === 'C') { walls.add(key); crates.push({ col, row }); }
      else if (ch === '~') shadows.add(key);
      else if (ch === 'o') seals.push({ col, row, taken: false });
      else if (ch === 'E') exit = { col, row };
      else if (ch === 'P') spawn = { col, row };
    }
  }
  return { level, walls, crates, shadows, seals, exit, spawn };
}

export function tileCenter(col, row) {
  return { x: col * 40 + 20, y: row * 40 + 20 };
}
