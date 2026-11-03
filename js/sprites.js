/* Test Quest – original pixel-art sprites, drawn as tiny SVG images (no image files needed).
   Each sprite is a grid of letters; '.' is transparent. A 1-pixel dark outline is added automatically. */
(function () {
  'use strict';
  const OUT = '#1a1423';
  const P8 = { navy: '#1d2b53', plum: '#7e2553', dgreen: '#008751', brown: '#ab5236', dgrey: '#5f574f', lgrey: '#c2c3c7', white: '#fff1e8',
    red: '#ff004d', orange: '#ffa300', yellow: '#ffec27', green: '#00e436', blue: '#29adff', lav: '#83769c', pink: '#ff77a8', peach: '#ffccaa' };

  const G = {
    hero: { grid: [
      '.....HHHHHH.....',
      '....HHHHHHHH....',
      '....HSSSSSSH....',
      '....SSKSSKSS....',
      '....SSSSSSSS....',
      '.....SSMMSS.....',
      '......SSSS......',
      '...CCCCCCCCCC...',
      '..SCCCCEECCCCS..',
      '..S.CCCCCCCC.S..',
      '....BBBBBBBB....',
      '....PPPPPPPP....',
      '....PPP..PPP....',
      '....PPP..PPP....',
      '...OOOO..OOOO...'],
      pal: { H: P8.brown, S: P8.peach, K: OUT, M: '#c0504d', C: P8.blue, E: P8.yellow, B: P8.brown, P: P8.navy, O: '#3b2a3a' } },
    slime: { grid: [
      '......GGGG......',
      '....GGGGGGGG....',
      '...GGLLGGGGGG...',
      '..GGLGGGGGGGGG..',
      '..GGGGGGGGGGGG..',
      '.GGGWKGGGGWKGGG.',
      '.GGGKKGGGGKKGGG.',
      '.GGGGGGGGGGGGGG.',
      '.GGGGGMMMMGGGGG.',
      'GGGGGGGGGGGGGGGG',
      '.DDDDDDDDDDDDDD.'],
      pal: { G: P8.green, L: '#b8ffc4', W: '#fff', K: OUT, M: OUT, D: P8.dgreen } },
    ghost: { grid: [
      '.....GGGGGG.....',
      '...GGGGGGGGGG...',
      '..GGGGGGGGGGGD..',
      '.GGGGGGGGGGGGGD.',
      '.GGGKKGGGGKKGGD.',
      '.GGGKKGGGGKKGGD.',
      '.GGGGGGGGGGGGGD.',
      '.GGGGGGKKGGGGGD.',
      '.GGGGGKKKKGGGGD.',
      '.GGGGGGKKGGGGGD.',
      '.GGGGGGGGGGGGGD.',
      '.GGGGGGGGGGGGGD.',
      '.GG.GGG..GGG.GD.',
      '.G...G....G...D.'],
      pal: { G: P8.white, D: P8.lgrey, K: OUT } },
    robot: { grid: [
      '.......YY.......',
      '........A.......',
      '....GGGGGGGG....',
      '...GGGGGGGGGG...',
      '...GGRRGGRRGG...',
      '...GGRRGGRRGG...',
      '...GGGGGGGGGG...',
      '...GGKKKKKKGG...',
      '....GGGGGGGG....',
      '..DDDDDDDDDDDD..',
      '.GDDDDYYDDDDDDG.',
      '.GDDDDYYDDDDDDG.',
      '.G.DDDDDDDDDD.G.',
      '...DDD....DDD...',
      '...DDD....DDD...',
      '..KKKK....KKKK..'],
      pal: { G: P8.lgrey, D: P8.lav, R: P8.red, Y: P8.yellow, A: P8.dgrey, K: OUT } },
    dragon: { grid: [
      '..H..........H..',
      '..HH........HH..',
      '...GGGGGGGGGG...',
      '..GGGGGGGGGGGG..',
      '.GGYKGGGGGGYKGG.',
      '.GGKKGGGGGGKKGG.',
      '.GGGGGGGGGGGGGG.',
      '.GGGGGGGGGGGGGG.',
      '..GGGNGGGGNGGG..',
      '..GGGGGGGGGGGG..',
      '..GWGGWGGWGGWG..',
      '...RRRRRRRRRR...',
      '...GWGGWGGWGG...',
      '....GGGGGGGG....',
      '.....LLLLLL.....'],
      pal: { H: P8.white, G: P8.red, Y: P8.yellow, K: OUT, N: P8.plum, W: '#fff', R: P8.plum, L: P8.orange } },
    castle: { grid: [
      '..f.........f..',
      '..ff........ff.',
      '..p.........p..',
      's.s.s.....s.s.s',
      'sssss.s.s.sssss',
      'sssssssssssssss',
      'ssKsssssssssKss',
      'ssKsssssssssKss',
      'shssssssssssssh',
      'shssssDDDsssssh',
      'shsssDDDDDssssh',
      'shsssDDDDDssssh',
      'shsssDDDDDssssh'],
      pal: { f: P8.red, p: P8.dgrey, s: P8.lgrey, h: '#9da1ad', K: OUT, D: '#3b2a3a' } },
    tower: { grid: [
      '....pff..',
      '....pf...',
      '....p....',
      '...rrr...',
      '..rrrrr..',
      '.rrrrrrr.',
      'rrrrrrrrr',
      '.sssssss.',
      '.sssKsss.',
      '.sssKsss.',
      '.sssssss.',
      '.shsssss.',
      '.sKssssh.',
      '.sssssss.',
      '.ssDDDss.',
      '.ssDDDss.'],
      pal: { f: P8.yellow, p: P8.dgrey, r: P8.blue, s: P8.lgrey, h: '#9da1ad', K: OUT, D: '#3b2a3a' } },
    house: { grid: [
      '......rr.....c',
      '.....rrrr....c',
      '....rrrrrr...c',
      '...rrrrrrrr...',
      '..rrrrrrrrrr..',
      '.rrrrrrrrrrrr.',
      'rrrrrrrrrrrrrr',
      '.wwwwwwwwwwww.',
      '.wKKwwwwwwKKw.',
      '.wKKwwDDwwKKw.',
      '.wwwwwDDwwwww.',
      '.wwwwwDDwwwww.'],
      pal: { r: P8.orange, c: P8.dgrey, w: P8.white, K: P8.blue, D: P8.brown } },
    dome: { grid: [
      '.......p.......',
      '......ggg......',
      '.....ddddd.....',
      '....dddddLd....',
      '...ddddddLdd...',
      '...ddddddddd...',
      'sssssssssssssss',
      's.s.s.s.s.s.s.s',
      's.s.s.s.s.s.s.s',
      's.s.s.s.s.s.s.s',
      'sssssssssssssss',
      'hhhhhhhhhhhhhhh'],
      pal: { p: P8.dgrey, g: P8.yellow, d: P8.green, L: '#b8ffc4', s: P8.white, h: P8.lgrey } },
    tree: { grid: [
      '...gggg...',
      '.ggggggggg',
      'gglggggggg',
      'gglggggggg',
      'ggggggggdg',
      '.ggggggdd.',
      '....bb....',
      '....bb....',
      '...bbbb...'],
      pal: { g: P8.dgreen, l: P8.green, d: '#005c3a', b: P8.brown } },
    rock: { grid: [
      '..ggg...',
      '.glggg..',
      'gggggghg',
      'gggghhhh'],
      pal: { g: P8.lgrey, l: '#fff', h: P8.dgrey } },
    flower: { grid: ['.r.', 'ryr', '.r.', '.g.'], pal: { r: P8.pink, y: P8.yellow, g: P8.dgreen } },
    coin: { grid: [
      '..yyyy..',
      '.ywwyyy.',
      'yywyydyd',
      'yyyyydyd',
      'yyyyydyd',
      'yyyyyyyd',
      '.yyyydd.',
      '..dddd..'],
      pal: { y: P8.yellow, w: '#fff', d: P8.orange } },
    heart: { grid: ['.rr.rr.', 'rwrrrrr', 'rrrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'], pal: { r: P8.red, w: '#fff' } },
    heart0: { grid: ['.rr.rr.', 'rrrrrrr', 'rrrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'], pal: { r: P8.dgrey } },
    star: { grid: [
      '....y....',
      '....y....',
      '...yyy...',
      'yyyyyyyyy',
      '.yyyyyyy.',
      '..yyyyy..',
      '..yyyyy..',
      '.yy...yy.',
      '.y.....y.'], pal: { y: P8.yellow } },
    star0: { grid: [
      '....y....',
      '....y....',
      '...yyy...',
      'yyyyyyyyy',
      '.yyyyyyy.',
      '..yyyyy..',
      '..yyyyy..',
      '.yy...yy.',
      '.y.....y.'], pal: { y: P8.dgrey } },
    chest: { grid: [
      '..bbbbbbbbbb..',
      '.bBBBBBBBBBBb.',
      'bBBBBBBBBBBBBb',
      'bbbbbbbbbbbbbb',
      'yyyyyyyyyyyyyy',
      'bBBBByyyyBBBBb',
      'bBBBByKKyBBBBb',
      'bBBBBByyBBBBBb',
      'bBBBBBBBBBBBBb',
      'bbbbbbbbbbbbbb'],
      pal: { b: P8.brown, B: '#d4834f', y: P8.yellow, K: OUT } },
    chestOpen: { grid: [
      '.bbbbbbbbbbbb.',
      'bBBBBBBBBBBBBb',
      'bbbbbbbbbbbbbb',
      'bkyYyyYyyYyykb',
      'byyyyyyyyyyyyb',
      'yyyyyyyyyyyyyy',
      'bBBBByyyyBBBBb',
      'bBBBByKKyBBBBb',
      'bBBBBByyBBBBBb',
      'bBBBBBBBBBBBBb',
      'bbbbbbbbbbbbbb'],
      pal: { b: P8.brown, B: '#d4834f', y: P8.yellow, Y: '#fff', k: '#3b2a3a', K: OUT } },
    trophy: { grid: [
      '..yyyyyyyy..',
      'yyywyyyyyyyy',
      'y.ywyyyyyy.y',
      'y.yyyyyyyy.y',
      '.yyyyyyyyyy.',
      '..yyyyyyyd..',
      '...yyyyyd...',
      '.....yd.....',
      '.....yd.....',
      '....yyyd....',
      '...bbbbbb...',
      '...bbbbbb...'],
      pal: { y: P8.yellow, w: '#fff', d: P8.orange, b: P8.brown } },
    book: { grid: [
      'bbbbb..bbbbb',
      'bwwwwbbwwwwb',
      'bwkkwbbwkkwb',
      'bwwwwbbwwwwb',
      'bwkkwbbwkkwb',
      'bwwwwbbwwwwb',
      'bwkkwbbwkkwb',
      'bwwwwbbwwwwb',
      'bbbbbbbbbbbb'],
      pal: { b: P8.plum, w: P8.white, k: P8.lgrey } },
    sword: { grid: [
      '..........ww',
      '.........wsw',
      '........wsw.',
      '.......wsw..',
      '......wsw...',
      '..y..wsw....',
      '...ywsw.....',
      '....yw......',
      '...b.yy.....',
      '..b...y.....',
      '.b..........',
      'yy..........'],
      pal: { w: '#fff', s: P8.lgrey, y: P8.yellow, b: P8.brown } },
    crown: { grid: [
      'y....yy....y',
      'yy..yyyy..yy',
      'yyy.yyyy.yyy',
      'yyyyyyyyyyyy',
      'yryyyByyyryy',
      'yyyyyyyyyyyy',
      'dddddddddddd'],
      pal: { y: P8.yellow, r: P8.red, B: P8.blue, d: P8.orange } },
    joystick: { grid: [
      '...rr...',
      '..rwrr..',
      '..rrrr..',
      '...kk...',
      '...kk...',
      '...kk...',
      'bbbbbbbb',
      'bRbbbbBb',
      'bbbbbbbb'],
      pal: { r: P8.red, w: '#fff', k: P8.dgrey, b: P8.navy, R: P8.red, B: P8.blue } },
    speaker: { grid: ['...w...', '..ww.w.', 'www...w', 'www...w', '..ww.w.', '...w...'], pal: { w: P8.white } },
    mute: { grid: ['...w...', '..ww...', 'www.r.r', 'www..r.', 'www.r.r', '..ww...', '...w...'], pal: { w: P8.white, r: P8.red } },
  };

  // colour variants
  const AVATARS = [
    { H: P8.brown, C: P8.blue, P: P8.navy },
    { H: '#3b2a3a', C: P8.red, P: P8.dgrey },
    { H: P8.yellow, C: P8.green, P: P8.dgreen },
    { H: '#3b2a3a', C: P8.plum, P: P8.navy, S: '#e8a87c' },
    { H: P8.orange, C: P8.lav, P: P8.plum },
    { H: P8.lgrey, C: P8.orange, P: P8.brown, S: '#e8a87c' },
  ];
  const LEVEL_LOOK = [
    { b: 'castle', v: { f: P8.red } }, { b: 'castle', v: { f: P8.blue, s: P8.peach, h: '#d9a066' } },
    { b: 'tower', v: { r: P8.blue } }, { b: 'tower', v: { r: P8.plum, f: P8.green } },
    { b: 'house', v: { r: P8.orange } }, { b: 'house', v: { r: P8.green, D: P8.plum } },
    { b: 'dome', v: { d: P8.green } }, { b: 'dome', v: { d: P8.blue, L: '#bde4ff' } },
    { b: 'castle', v: { f: P8.yellow, s: '#ffd6a5', h: P8.orange } }, { b: 'tower', v: { r: P8.red, f: P8.blue } },
  ];
  const BOSS_LOOK = [
    { s: 'slime', v: {}, n: 'Slime' }, { s: 'ghost', v: {}, n: 'Ghost' }, { s: 'robot', v: {}, n: 'Robot' }, { s: 'dragon', v: {}, n: 'Dragon' },
    { s: 'slime', v: { G: P8.blue, L: '#bde4ff', D: P8.navy }, n: 'Blue Slime' }, { s: 'ghost', v: { G: P8.pink, D: P8.plum }, n: 'Phantom' },
    { s: 'robot', v: { G: P8.orange, D: P8.brown }, n: 'Golem' }, { s: 'dragon', v: { G: P8.blue, R: P8.navy, L: P8.white }, n: 'Ice Dragon' },
    { s: 'slime', v: { G: P8.red, L: P8.pink, D: P8.plum }, n: 'Fire Slime' }, { s: 'dragon', v: { G: P8.dgreen, L: P8.yellow, R: P8.navy }, n: 'Elder Dragon' },
  ];

  const cache = {};
  function svgFor(name, variant) {
    const key = name + JSON.stringify(variant || {});
    if (cache[key]) return cache[key];
    const g = G[name], pal = Object.assign({}, g.pal, variant || {});
    const w = Math.max(...g.grid.map(r => r.length)) + 2, h = g.grid.length + 2;
    const filled = (x, y) => y >= 0 && y < g.grid.length && x >= 0 && (g.grid[y][x] || '.') !== '.';
    let rects = '';
    // outline
    for (let y = -1; y <= g.grid.length; y++) for (let x = -1; x < w - 1; x++) {
      if (filled(x, y)) continue;
      if (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1)) rects += `<rect x="${x + 1}" y="${y + 1}" width="1" height="1" fill="${OUT}"/>`;
    }
    // pixels, merged into horizontal runs
    g.grid.forEach((row, y) => {
      let x = 0;
      while (x < row.length) {
        const c = row[x]; if (c === '.') { x++; continue; }
        let e = x; while (e + 1 < row.length && row[e + 1] === c) e++;
        rects += `<rect x="${x + 1}" y="${y + 1}" width="${e - x + 1}" height="1" fill="${pal[c] || '#f0f'}"/>`;
        x = e + 1;
      }
    });
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">${rects}</svg>`;
    return (cache[key] = { url: 'data:image/svg+xml,' + encodeURIComponent(svg), w, h });
  }
  // <img> tag; px = size of one pixel on screen
  function spr(name, px, opts) {
    opts = opts || {};
    const s = svgFor(name, opts.v);
    return `<img class="px ${opts.cls || ''}" src="${s.url}" width="${s.w * px}" height="${s.h * px}" alt="${opts.alt || ''}"${opts.id ? ` id="${opts.id}"` : ''} draggable="false">`;
  }
  window.SPR = { spr, P8, AVATARS, LEVEL_LOOK, BOSS_LOOK,
    avatar: (i, px, cls) => spr('hero', px, { v: AVATARS[((i || 0) % AVATARS.length + AVATARS.length) % AVATARS.length], cls }),
    building: (i, px, cls) => spr(LEVEL_LOOK[i % LEVEL_LOOK.length].b, px, { v: LEVEL_LOOK[i % LEVEL_LOOK.length].v, cls }),
    boss: (i, px, cls, id) => spr(BOSS_LOOK[i % BOSS_LOOK.length].s, px, { v: BOSS_LOOK[i % BOSS_LOOK.length].v, cls, id }),
    bossName: (i) => BOSS_LOOK[i % BOSS_LOOK.length].n };
})();
