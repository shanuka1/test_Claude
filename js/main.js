window.Game = window.Game || {};

(function (G) {
  const T = G.TILE;
  const VW = 800;
  const DT = 1 / 60;
  const P = G.physics;

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const g = {
    mode: 'title', // title | intro | playing | dying | clear | gameover | victory
    modeT: 0,
    time: 0,
    paused: false,
    levelIndex: 0,
    score: 0,
    coins: 0,
    lives: 3,
    big: false,
    timer: 0,
    lvl: null,
    player: null,
    enemies: [],
    items: [],
    particles: [],
    platforms: [],
    bumps: [],
    camX: 0,
    flagY: 0,
    doorX: 0,
    clear: null,
  };
  G.state = g; // handy for debugging in the console

  function setMode(m) {
    g.mode = m;
    g.modeT = 0;
  }

  // ---------- Level setup ----------
  function newGame() {
    g.score = 0;
    g.coins = 0;
    g.lives = 3;
    g.big = false;
    startLevel(0);
  }

  function startLevel(i) {
    g.levelIndex = i;
    g.paused = false;
    loadLevel(i);
    G.audio.stopMusic();
    setMode('intro');
  }

  function loadLevel(i) {
    const def = G.levels[i];
    const grid = def.grid.map((r) => r.split(''));
    const lvl = { grid, w: grid[0].length, h: grid.length, def };
    g.lvl = lvl;
    g.enemies = [];
    g.items = [];
    g.particles = [];
    g.bumps = [];
    g.platforms = def.platforms.map((p) => new G.Platform(p));
    for (let y = 0; y < lvl.h; y++) {
      for (let x = 0; x < lvl.w; x++) {
        const c = grid[y][x];
        if (c === '@') {
          g.player = new G.Player(x * T + 5, 0, g.big);
          g.player.y = (y + 1) * T - g.player.h;
          grid[y][x] = '.';
        } else if (c === 'w') {
          g.enemies.push(new G.Walker(x * T + 2, (y + 1) * T - 28));
          grid[y][x] = '.';
        } else if (c === 'h') {
          g.enemies.push(new G.Hopper(x * T + 2, (y + 1) * T - 26));
          grid[y][x] = '.';
        }
      }
    }
    g.timer = def.time;
    g.flagY = 3 * T + 8;
    g.doorX = (def.flagCol + 6) * T;
    g.clear = null;
    updateCamera();
  }

  // ---------- Helpers used by entities ----------
  g.addScore = function (n, x, y) {
    g.score += n;
    if (x !== undefined) g.particles.push({ type: 'text', text: String(n), x, y, vx: 0, vy: -70, life: 0.8, gravity: 0 });
  };

  function collectCoin() {
    g.coins++;
    G.audio.sfx('coin');
    if (g.coins >= 100) {
      g.coins -= 100;
      g.lives++;
      G.audio.sfx('oneup');
    }
  }

  g.bumpTile = function (cx, cy) {
    const grid = g.lvl.grid;
    const c = grid[cy][cx];
    const x = cx * T;
    const y = cy * T;
    if (c === '?') {
      grid[cy][cx] = 'U';
      g.bumps.push({ cx, cy, t: 0.15 });
      g.particles.push({ type: 'coin', x: x + T / 2, y: y - 10, vx: 0, vy: -480, life: 0.5, gravity: 1500 });
      collectCoin();
      g.addScore(200, x + T / 2, y - 20);
    } else if (c === 'M') {
      grid[cy][cx] = 'U';
      g.bumps.push({ cx, cy, t: 0.15 });
      g.items.push(new G.PowerUp(cx, cy));
      G.audio.sfx('sprout');
    } else if (c === 'B') {
      if (g.player.big) {
        grid[cy][cx] = '.';
        const color = g.lvl.def.theme === 'cave' ? '#6a5acd' : '#c8642c';
        for (const [vx, vy] of [[-120, -520], [120, -520], [-90, -340], [90, -340]]) {
          g.particles.push({ type: 'brick', x: x + 11, y: y + 11, vx, vy, life: 1.2, gravity: 1500, color });
        }
        g.addScore(50);
        G.audio.sfx('break');
      } else {
        g.bumps.push({ cx, cy, t: 0.15 });
        G.audio.sfx('bump');
      }
    } else {
      G.audio.sfx('bump');
    }
    // Knock out enemies standing on the bumped block
    const above = { x, y: y - T, w: T, h: T };
    for (const e of g.enemies) {
      if (e.harmful && P.overlap(e, above)) {
        e.knockOut();
        g.addScore(100, e.x, e.y);
        G.audio.sfx('stomp');
      }
    }
  };

  g.killPlayer = function () {
    if (g.mode !== 'playing') return;
    setMode('dying');
    g.paused = false;
    g.big = false;
    G.audio.stopMusic();
    G.audio.sfx('die');
    g.player.vx = 0;
    g.player.vy = -650;
  };

  // ---------- Per-mode updates ----------
  function controls() {
    const I = G.input;
    return {
      left: I.down.left,
      right: I.down.right,
      run: I.down.run,
      jump: I.down.jump,
      jumpPressed: I.pressed.jump,
    };
  }

  function updatePlaying(dt) {
    const p = g.player;
    const lvl = g.lvl;

    g.timer -= dt;
    if (g.timer <= 0) {
      g.timer = 0;
      g.killPlayer();
      return;
    }

    for (const pl of g.platforms) pl.update(dt);
    p.update(dt, lvl, controls(), g);
    if (p.y > lvl.h * T + 20) { g.killPlayer(); return; }

    tileInteractions();
    if (g.mode !== 'playing') return;

    // Enemies
    for (const e of g.enemies) {
      if (!e.active) {
        if (e.x < g.camX + VW + 48) e.active = true;
        else continue;
      }
      e.update(dt, lvl, g);
    }
    for (const e of g.enemies) {
      if (!e.harmful || !P.overlap(p, e)) continue;
      if (p.vy > 0 && p.prevBottom <= e.y + 10) {
        e.squish = 0.5;
        p.vy = G.input.down.jump ? -640 : -400;
        g.addScore(100, e.x + e.w / 2, e.y);
        G.audio.sfx('stomp');
      } else {
        p.hurt(g);
        if (g.mode !== 'playing') return;
      }
    }
    g.enemies = g.enemies.filter((e) => !e.remove);

    // Power-ups
    for (const it of g.items) {
      it.update(dt, lvl);
      if (!it.remove && P.overlap(p, it)) {
        it.remove = true;
        if (!p.big) p.setBig(true);
        G.audio.sfx('powerup');
        g.addScore(1000, it.x + it.w / 2, it.y);
      }
    }
    g.items = g.items.filter((it) => !it.remove);

    updateEffects(dt);
    updateCamera();

    // Reached the flag?
    const poleX = lvl.def.flagCol * T + 14;
    if (p.x + p.w >= poleX) startClear();
  }

  function tileInteractions() {
    const p = g.player;
    const lvl = g.lvl;
    const x0 = Math.max(0, Math.floor(p.x / T));
    const x1 = Math.min(lvl.w - 1, Math.floor((p.x + p.w - 0.01) / T));
    const y0 = Math.max(0, Math.floor(p.y / T));
    const y1 = Math.min(lvl.h - 1, Math.floor((p.y + p.h - 0.01) / T));
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const c = lvl.grid[cy][cx];
        if (c === 'o') {
          lvl.grid[cy][cx] = '.';
          collectCoin();
          g.score += 200;
        } else if (c === 'S') {
          const spike = { x: cx * T + 4, y: cy * T + 16, w: T - 8, h: T - 16 };
          if (P.overlap(p, spike)) p.hurt(g);
        }
      }
    }
  }

  function updateEffects(dt) {
    for (const q of g.particles) {
      q.vy += q.gravity * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.life -= dt;
    }
    g.particles = g.particles.filter((q) => q.life > 0);
    for (const b of g.bumps) b.t -= dt;
    g.bumps = g.bumps.filter((b) => b.t > 0);
  }

  function updateCamera() {
    const p = g.player;
    const maxX = g.lvl.w * T - VW;
    g.camX = Math.max(0, Math.min(maxX, p.x + p.w / 2 - VW * 0.4));
  }

  function updateDying(dt) {
    const p = g.player;
    if (g.modeT > 0.5) {
      p.vy += 1800 * dt;
      p.y += p.vy * dt;
    }
    if (g.modeT > 3) {
      g.lives--;
      if (g.lives <= 0) {
        setMode('gameover');
        G.audio.sfx('gameover');
      } else {
        startLevel(g.levelIndex);
      }
    }
  }

  function startClear() {
    const p = g.player;
    const fc = g.lvl.def.flagCol;
    setMode('clear');
    g.clear = { phase: 'slide', t: 0 };
    G.audio.stopMusic();
    G.audio.sfx('clear');
    // Higher on the pole = bigger bonus
    const height = Math.max(0, 12 * T - (p.y + p.h));
    const bonus = Math.max(100, Math.round((height / (9 * T)) * 50) * 100);
    g.addScore(bonus, fc * T - 10, p.y);
    p.x = fc * T + 14 - p.w;
    p.vx = 0;
    p.vy = 0;
    p.facing = 1;
    g.timer = Math.ceil(g.timer);
  }

  function updateClear(dt) {
    const p = g.player;
    const c = g.clear;
    const fc = g.lvl.def.flagCol;
    const base = 12 * T; // top of the flag's base block
    c.t += dt;
    updateEffects(dt);

    if (c.phase === 'slide') {
      p.y = Math.min(p.y + 320 * dt, base - p.h);
      g.flagY = Math.min(g.flagY + 320 * dt, base - 34);
      if (p.y >= base - p.h && g.flagY >= base - 34 && c.t > 0.8) {
        c.phase = 'walk';
        c.t = 0;
        p.x = (fc + 1) * T + 2;
        p.vy = -300;
      }
    } else if (c.phase === 'walk') {
      p.update(dt, g.lvl, { right: true, left: false, run: false, jump: false, jumpPressed: false }, g);
      if (p.x + p.w / 2 >= g.doorX) {
        p.hidden = true;
        c.phase = 'tally';
      }
    } else if (c.phase === 'tally') {
      if (g.timer > 0) {
        const d = Math.min(g.timer, 2);
        g.timer -= d;
        g.score += d * 50;
        if (Math.floor(g.time * 60) % 4 === 0) G.audio.sfx('tick');
      } else {
        c.phase = 'done';
        c.t = 0;
      }
    } else if (c.phase === 'done' && c.t > 1.5) {
      g.big = p.big;
      if (g.levelIndex + 1 < G.levels.length) {
        startLevel(g.levelIndex + 1);
      } else {
        setMode('victory');
        G.audio.sfx('victory');
      }
    }
    updateCamera();
  }

  // ---------- Main loop ----------
  function update(dt) {
    const I = G.input;
    g.time += dt;
    g.modeT += dt;
    if (I.pressed.mute) G.audio.toggleMute();

    switch (g.mode) {
      case 'title':
        if (I.pressed.start || I.pressed.jump) newGame();
        break;
      case 'intro':
        if (g.modeT > 2) {
          setMode('playing');
          G.audio.playMusic(g.levelIndex);
        }
        break;
      case 'playing':
        if (I.pressed.pause) {
          g.paused = !g.paused;
          G.audio.setPaused(g.paused);
        }
        if (!g.paused) updatePlaying(dt);
        break;
      case 'dying':
        updateDying(dt);
        break;
      case 'clear':
        updateClear(dt);
        break;
      case 'gameover':
      case 'victory':
        if (g.modeT > 1.5 && (I.pressed.start || I.pressed.jump)) setMode('title');
        break;
    }
  }

  let last = performance.now();
  let acc = 0;
  function frame(now) {
    acc += Math.min(0.25, (now - last) / 1000);
    last = now;
    while (acc >= DT) {
      update(DT);
      G.input.endFrame();
      acc -= DT;
    }
    G.render.draw(ctx, g);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Test hook: advance the game by n frames, e.g. Game.debug.step(60) in the console.
  G.debug = {
    step(n = 1) {
      for (let i = 0; i < n; i++) {
        update(DT);
        G.input.endFrame();
      }
      G.render.draw(ctx, g);
    },
  };
})(window.Game);
