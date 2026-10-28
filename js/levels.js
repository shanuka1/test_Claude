window.Game = window.Game || {};

/*
  Tile legend
    .  empty          #  ground         B  brick (big Pip breaks it)
    ?  coin block     M  power-up block U  used block
    P  pillar         X  hard block     S  spikes
    o  coin           w  walker enemy   h  hopper enemy
    @  player start
  Rows are 0 (top) to 14 (bottom). Ground surface is row 13.
*/
(function (G) {
  const ROWS = 15;

  function builder(width) {
    const g = [];
    for (let r = 0; r < ROWS; r++) g.push(new Array(width).fill('.'));
    const b = {
      set(x, y, c) {
        if (x >= 0 && x < width && y >= 0 && y < ROWS) g[y][x] = c;
        return b;
      },
      fill(x1, y1, x2, y2, c) {
        for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) b.set(x, y, c);
        return b;
      },
      ground(x1, x2) { return b.fill(x1, 13, x2, ROWS - 1, '#'); },
      row(x, y, s) {
        for (let i = 0; i < s.length; i++) if (s[i] !== ' ') b.set(x + i, y, s[i]);
        return b;
      },
      pillar(x, h) { return b.fill(x, 13 - h, x + 1, 12, 'P'); },
      stairsUp(x, h) {
        for (let i = 0; i < h; i++) b.fill(x + i, 12 - i, x + i, 12, 'X');
        return b;
      },
      stairsDown(x, h) {
        for (let i = 0; i < h; i++) b.fill(x + i, 12 - (h - 1 - i), x + i, 12, 'X');
        return b;
      },
      done() { return g.map((r) => r.join('')); },
    };
    return b;
  }

  // ---------- Level 1: Meadow ----------
  function meadow() {
    const b = builder(200);
    b.ground(0, 45).ground(49, 68).ground(72, 81).ground(84, 110).ground(115, 199);
    b.set(3, 12, '@');

    b.row(10, 9, 'B?M?B').set(12, 5, '?');
    b.set(17, 12, 'w').set(23, 12, 'w');

    b.pillar(26, 2).pillar(34, 3).pillar(42, 4);
    b.row(29, 9, 'ooo').set(30, 12, 'w');
    b.row(37, 8, 'ooo').set(37, 12, 'w').set(40, 12, 'w');

    b.row(46, 9, 'ooo'); // over the first gap

    b.row(52, 10, 'BBBB');
    b.row(55, 7, 'BBBBBBBB').row(56, 6, 'oooooo').set(59, 6, 'w');
    b.set(62, 12, 'w').set(65, 12, 'w');

    b.row(69, 9, 'ooo'); // over the second gap
    b.row(73, 9, '? ? ?').set(75, 5, '?').set(76, 12, 'w');
    b.stairsUp(78, 4).stairsDown(84, 4);

    b.row(89, 10, 'oooo');
    b.set(92, 12, 'w').set(94, 12, 'w').set(96, 12, 'w');
    b.pillar(99, 3);
    b.row(103, 9, 'BB?BB').row(104, 5, 'ooo').set(107, 12, 'w');

    b.row(111, 9, 'oooo'); // over the wide gap

    b.row(119, 9, 'B??B').set(121, 12, 'w').set(124, 12, 'w');
    b.row(127, 8, 'XXX').row(127, 7, 'ooo');
    b.set(131, 12, 'w').set(133, 12, 'w');
    b.pillar(137, 2).pillar(144, 3).set(141, 12, 'w');
    b.row(150, 9, '?B?B?').set(152, 5, '?');
    b.set(155, 12, 'w').set(157, 12, 'w').set(160, 12, 'w');
    b.row(163, 10, 'oooo');

    b.stairsUp(170, 8).fill(178, 5, 178, 12, 'X');
    b.set(186, 12, 'X'); // flag base

    return {
      name: 'Meadow',
      theme: 'meadow',
      time: 300,
      flagCol: 186,
      grid: b.done(),
      platforms: [],
    };
  }

  // ---------- Level 2: Caverns ----------
  function caverns() {
    const W = 210;
    const b = builder(W);
    b.fill(0, 0, W - 1, 0, '#'); // ceiling
    b.ground(0, 30).ground(35, 60).ground(69, 100).ground(111, 150).ground(157, W - 1);
    b.set(2, 12, '@');

    b.row(8, 9, 'B?B?B').row(9, 5, 'ooo');
    b.set(14, 12, 'w').set(20, 12, 'h');
    b.row(23, 10, 'oooo').row(24, 12, 'SS');
    b.row(31, 10, 'oooo'); // over the first gap

    b.pillar(38, 3).pillar(46, 4);
    b.set(42, 12, 'h').set(50, 12, 'w').set(52, 12, 'w');
    b.row(54, 9, 'BBMBB');

    b.row(62, 7, 'ooooo'); // over the moving-platform gap

    b.row(74, 12, 'SSS');
    b.set(80, 12, 'h').set(84, 12, 'w').set(86, 12, 'h');
    b.row(82, 8, '?B?B?');
    b.stairsUp(92, 3).set(97, 12, 'w');

    b.row(102, 5, 'ooo').row(106, 7, 'ooo');

    b.row(116, 10, 'XXXX').row(116, 9, 'oooo');
    b.row(121, 12, 'SSSS');
    b.set(127, 12, 'h').set(129, 12, 'w').set(131, 12, 'w').set(135, 12, 'h');
    b.row(134, 8, 'B?B?B?B');
    b.row(138, 6, 'ooooooo');
    b.row(140, 12, 'SSS').set(146, 12, 'w');

    b.row(152, 7, 'ooo');

    b.set(160, 12, 'w').set(163, 12, 'w').set(168, 12, 'h');
    b.row(164, 9, '?M?');
    b.stairsUp(175, 8).fill(183, 5, 183, 12, 'X');
    b.set(196, 12, 'X'); // flag base

    return {
      name: 'Crystal Caverns',
      theme: 'cave',
      time: 300,
      flagCol: 196,
      grid: b.done(),
      // x, y in tiles; range in tiles; len = width in tiles
      platforms: [
        { x: 61, y: 10, axis: 'x', range: 4, len: 3, speed: 1.2 },
        { x: 101, y: 7, axis: 'y', range: 4, len: 3, speed: 1.1 },
        { x: 105, y: 9, axis: 'x', range: 3, len: 3, speed: 1.4, phase: 1.5 },
        { x: 151, y: 10, axis: 'x', range: 3, len: 3, speed: 1.3 },
      ],
    };
  }

  G.levels = [meadow(), caverns()];
})(window.Game);
