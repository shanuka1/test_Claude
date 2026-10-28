window.Game = window.Game || {};

(function (G) {
  const T = G.TILE;
  const VW = 800;
  const VH = 480;

  const THEMES = {
    meadow: {
      sky: ['#4fb3ff', '#c4ecff'],
      ground: '#a0632e', groundDark: '#7d4a1f', top: '#4caf50', topLight: '#8be07a',
      brick: '#c8642c', mortar: '#7a3a15',
      hard: '#b0855a', hardLight: '#d8ae80', hardDark: '#7d5a38',
      pillar: '#8fa3ad', pillarLight: '#c9d7de', pillarDark: '#5f7480',
      plat: '#8d6e63', platTop: '#c8b4ad',
      house: '#f3e1c7', roof: '#c0392b',
    },
    cave: {
      sky: ['#100b22', '#2e2452'],
      ground: '#454a66', groundDark: '#30344a', top: '#6b7194', topLight: '#959bc0',
      brick: '#6a5acd', mortar: '#3d327f',
      hard: '#5c6386', hardLight: '#8189b0', hardDark: '#3a3f5c',
      pillar: '#2fa7b8', pillarLight: '#8ce8f2', pillarDark: '#1b6d78',
      plat: '#7e57c2', platTop: '#c1a8ea',
      house: '#6d5d8c', roof: '#3b8f9e',
    },
  };

  // Stable pseudo-random number in [0,1) for decoration placement.
  function rnd(i) {
    const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  function rect(ctx, color, x, y, w, h) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), w, h);
  }

  function text(ctx, s, x, y, size, color = '#fff', align = 'center') {
    ctx.font = `bold ${size}px "Courier New", monospace`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillText(s, x + 2, y + 2);
    ctx.fillStyle = color;
    ctx.fillText(s, x, y);
  }

  // ---------- Backgrounds ----------
  function background(ctx, themeName, camX, time) {
    const th = THEMES[themeName];
    const grd = ctx.createLinearGradient(0, 0, 0, VH);
    grd.addColorStop(0, th.sky[0]);
    grd.addColorStop(1, th.sky[1]);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, VW, VH);

    if (themeName === 'meadow') {
      // Far mountains
      layer(camX * 0.15, 420, (x, k) => {
        const h = 140 + rnd(k) * 90;
        ctx.fillStyle = '#9fd3e6';
        tri(ctx, x - 40, 420, x + 170, 420 - h, x + 380, 420);
        ctx.fillStyle = '#e9f7ff';
        tri(ctx, x + 130, 420 - h + 30, x + 170, 420 - h, x + 210, 420 - h + 30);
      });
      // Clouds
      layer(camX * 0.25, 280, (x, k) => {
        const y = 50 + rnd(k + 3) * 90;
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        circle(ctx, x + 40, y, 22);
        circle(ctx, x + 70, y - 12, 28);
        circle(ctx, x + 102, y, 22);
        ctx.fillRect(x + 40, y, 62, 22);
      });
      // Near hills
      layer(camX * 0.5, 330, (x, k) => {
        const r = 90 + rnd(k + 9) * 60;
        ctx.fillStyle = '#5cbf5a';
        circle(ctx, x + 160, 430, r);
        ctx.fillStyle = '#7fd67a';
        circle(ctx, x + 140, 430 - r * 0.45, r * 0.25);
      });
    } else {
      // Stalactites
      layer(camX * 0.3, 90, (x, k) => {
        const h = 40 + rnd(k) * 110;
        ctx.fillStyle = '#1b1538';
        tri(ctx, x, 0, x + 45, h, x + 90, 0);
      });
      // Glowing crystals
      layer(camX * 0.45, 170, (x, k) => {
        const y = 180 + rnd(k + 5) * 200;
        const hue = rnd(k + 2) > 0.5 ? '120,230,255' : '255,140,220';
        const a = 0.35 + 0.25 * Math.sin(time * 2 + k);
        ctx.fillStyle = `rgba(${hue},${a})`;
        ctx.beginPath();
        ctx.moveTo(x + 60, y - 26);
        ctx.lineTo(x + 72, y);
        ctx.lineTo(x + 60, y + 26);
        ctx.lineTo(x + 48, y);
        ctx.fill();
      });
      // Stalagmites
      layer(camX * 0.6, 140, (x, k) => {
        const h = 60 + rnd(k + 11) * 120;
        ctx.fillStyle = '#231c45';
        tri(ctx, x + 20, VH, x + 70, VH - h, x + 120, VH);
      });
    }

    function layer(offset, spacing, draw) {
      const first = Math.floor(offset / spacing) - 1;
      for (let k = first; k < first + Math.ceil(VW / spacing) + 3; k++) {
        draw(k * spacing - offset, k);
      }
    }
  }

  function tri(ctx, x1, y1, x2, y2, x3, y3) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.fill();
  }

  function circle(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---------- Tiles ----------
  function drawTiles(ctx, g, th) {
    const lvl = g.lvl;
    const c0 = Math.max(0, Math.floor(g.camX / T));
    const c1 = Math.min(lvl.w - 1, c0 + Math.ceil(VW / T) + 1);
    for (let cy = 0; cy < lvl.h; cy++) {
      for (let cx = c0; cx <= c1; cx++) {
        const c = lvl.grid[cy][cx];
        if (c === '.') continue;
        const y = cy * T + bumpOffset(g, cx, cy);
        drawTile(ctx, c, cx * T, y, cx, cy, lvl, th, g.time);
      }
    }
  }

  function bumpOffset(g, cx, cy) {
    for (const b of g.bumps) {
      if (b.cx === cx && b.cy === cy) return -Math.sin(Math.PI * (1 - b.t / 0.15)) * 8;
    }
    return 0;
  }

  function drawTile(ctx, c, x, y, cx, cy, lvl, th, time) {
    const solidAbove = G.physics.isSolid(lvl, cx, cy - 1) && cy > 0;
    switch (c) {
      case '#': {
        rect(ctx, th.ground, x, y, T, T);
        rect(ctx, th.groundDark, x + 4 + rnd(cx * 7 + cy) * 18, y + 10 + rnd(cx + cy * 3) * 14, 4, 4);
        rect(ctx, th.groundDark, x + 6 + rnd(cx * 3 + cy * 5) * 18, y + 6 + rnd(cx * 11 + cy) * 18, 3, 3);
        if (!solidAbove) {
          rect(ctx, th.top, x, y, T, 9);
          rect(ctx, th.topLight, x, y, T, 3);
          for (let i = 0; i < 4; i++) rect(ctx, th.top, x + 3 + i * 8, y + 9, 4, 3);
        }
        break;
      }
      case 'B': {
        rect(ctx, th.brick, x, y, T, T);
        ctx.fillStyle = th.mortar;
        for (let r = 0; r < 4; r++) {
          ctx.fillRect(x, y + r * 8 + 6, T, 2);
          const off = r % 2 ? 8 : 0;
          ctx.fillRect(x + off, y + r * 8, 2, 8);
          ctx.fillRect(x + off + 16, y + r * 8, 2, 8);
        }
        break;
      }
      case '?':
      case 'M': {
        const shine = 0.5 + 0.5 * Math.sin(time * 4 + cx);
        rect(ctx, '#a36a00', x, y, T, T);
        rect(ctx, `rgb(246,${170 + shine * 30},${40 + shine * 30})`, x + 2, y + 2, T - 4, T - 4);
        rect(ctx, '#a36a00', x + 4, y + 4, 3, 3);
        rect(ctx, '#a36a00', x + T - 7, y + 4, 3, 3);
        rect(ctx, '#a36a00', x + 4, y + T - 7, 3, 3);
        rect(ctx, '#a36a00', x + T - 7, y + T - 7, 3, 3);
        ctx.font = 'bold 20px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#7a4a00';
        ctx.fillText('?', x + T / 2 + 1, y + T / 2 + 2);
        break;
      }
      case 'U': {
        rect(ctx, '#5d4037', x, y, T, T);
        rect(ctx, '#8d6e63', x + 2, y + 2, T - 4, T - 4);
        rect(ctx, '#5d4037', x + 5, y + 5, 3, 3);
        rect(ctx, '#5d4037', x + T - 8, y + 5, 3, 3);
        rect(ctx, '#5d4037', x + 5, y + T - 8, 3, 3);
        rect(ctx, '#5d4037', x + T - 8, y + T - 8, 3, 3);
        break;
      }
      case 'P': {
        const isRight = lvl.grid[cy][cx - 1] === 'P' && !(lvl.grid[cy][cx - 2] === 'P');
        rect(ctx, th.pillar, x, y, T, T);
        if (!isRight) rect(ctx, th.pillarLight, x + 5, y, 6, T);
        else rect(ctx, th.pillarDark, x + T - 9, y, 6, T);
        const capTop = (lvl.grid[cy - 1] || [])[cx] !== 'P';
        if (capTop) {
          const cx0 = isRight ? x : x - 4;
          rect(ctx, th.pillarDark, cx0, y, T + 4, 12);
          rect(ctx, th.pillar, cx0 + 2, y + 2, T, 8);
          rect(ctx, th.pillarLight, cx0 + 2, y + 2, T, 3);
        }
        break;
      }
      case 'X': {
        rect(ctx, th.hardDark, x, y, T, T);
        rect(ctx, th.hardLight, x, y, T - 4, T - 4);
        rect(ctx, th.hard, x + 4, y + 4, T - 8, T - 8);
        break;
      }
      case 'S': {
        ctx.fillStyle = '#dfe6ee';
        ctx.strokeStyle = '#5b6472';
        ctx.lineWidth = 2;
        for (let i = 0; i < 2; i++) {
          ctx.beginPath();
          ctx.moveTo(x + i * 16 + 1, y + T);
          ctx.lineTo(x + i * 16 + 8, y + T - 18);
          ctx.lineTo(x + i * 16 + 15, y + T);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        break;
      }
      case 'o':
        drawCoin(ctx, x + T / 2, y + T / 2, time + cx * 0.3);
        break;
    }
  }

  function drawCoin(ctx, x, y, t) {
    const w = Math.max(2, 10 * Math.abs(Math.cos(t * 4)));
    ctx.fillStyle = '#c79100';
    ctx.beginPath();
    ctx.ellipse(x, y, w + 1, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd54f';
    ctx.beginPath();
    ctx.ellipse(x, y, w - 1, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    if (w > 5) rect(ctx, '#fff3b0', x - 2, y - 7, 3, 9);
  }

  // ---------- Goal: flagpole and cottage ----------
  function drawGoal(ctx, g, th) {
    const fc = g.lvl.def.flagCol;
    const ground = 13 * T;

    // Cottage
    const hx = (fc + 4) * T;
    const wallH = 2.5 * T;
    rect(ctx, th.house, hx, ground - wallH, 4 * T, wallH);
    ctx.fillStyle = th.roof;
    tri(ctx, hx - 14, ground - wallH, hx + 2 * T, ground - wallH - 1.8 * T, hx + 4 * T + 14, ground - wallH);
    rect(ctx, '#3e2723', hx + 1.5 * T, ground - 1.6 * T, T, 1.6 * T);
    ctx.fillStyle = '#3e2723';
    circle(ctx, hx + 2 * T, ground - 1.6 * T, T / 2);
    rect(ctx, '#ffe082', hx + 0.3 * T, ground - 2 * T, 22, 18);
    rect(ctx, '#ffe082', hx + 3.7 * T - 22, ground - 2 * T, 22, 18);

    // Pole and flag
    const px = fc * T + 14;
    rect(ctx, '#bfc5cc', px, 3 * T, 5, 9 * T);
    rect(ctx, '#f2f4f6', px, 3 * T, 2, 9 * T);
    ctx.fillStyle = '#ffca28';
    circle(ctx, px + 2, 3 * T - 4, 8);
    ctx.fillStyle = '#2ecc71';
    tri(ctx, px, g.flagY, px - 44, g.flagY + 15, px, g.flagY + 30);
    ctx.fillStyle = '#fff';
    circle(ctx, px - 14, g.flagY + 15, 5);
  }

  // ---------- Characters ----------
  function drawHero(ctx, p, time) {
    if (p.hidden) return;
    if (p.inv > 0 && Math.floor(time * 20) % 2 === 0) return;
    const x = Math.round(p.x);
    const y = Math.round(p.y);
    const w = p.w;
    const h = p.h;
    const f = p.facing;
    const headH = p.big ? 20 : 14;
    const legH = p.big ? 14 : 7;
    const bodyH = h - headH - legH;

    // Legs
    let swing = 0;
    if (!p.onGround) swing = 3;
    else if (Math.abs(p.vx) > 10) swing = Math.round(Math.sin(p.anim * 0.06) * 3);
    const legW = p.big ? 8 : 7;
    rect(ctx, '#3b4a8c', x + 3 + swing, y + h - legH, legW, legH - 2);
    rect(ctx, '#3b4a8c', x + w - 3 - legW - swing, y + h - legH, legW, legH - 2);
    rect(ctx, '#5a2e12', x + 2 + swing + (f > 0 ? 1 : -1), y + h - 3, legW + 1, 3);
    rect(ctx, '#5a2e12', x + w - 4 - legW - swing + (f > 0 ? 1 : -1), y + h - 3, legW + 1, 3);

    // Body
    rect(ctx, '#ff7a29', x + 2, y + headH, w - 4, bodyH);
    rect(ctx, '#ffd166', x + 2, y + headH + bodyH - 4, w - 4, 3);
    const armX = f > 0 ? x + w - 6 : x + 1;
    rect(ctx, '#f5c79e', armX, y + headH + bodyH / 2, 5, 5);

    // Head and cap
    rect(ctx, '#f5c79e', x + 3, y + 2, w - 6, headH - 1);
    const capH = Math.round(headH * 0.45);
    rect(ctx, '#2bb3a3', x + 1, y, w - 2, capH);
    rect(ctx, '#1f8f82', x + 1, y + capH - 2, w - 2, 2);
    if (f > 0) rect(ctx, '#2bb3a3', x + w - 4, y + capH - 3, 8, 3);
    else rect(ctx, '#2bb3a3', x - 4, y + capH - 3, 8, 3);

    // Eye
    const ex = f > 0 ? x + w - 9 : x + 6;
    rect(ctx, '#1a1a1a', ex, y + capH + 1, 3, p.big ? 5 : 4);
  }

  function withFlip(ctx, e, draw) {
    if (!e.dead) return draw();
    ctx.save();
    ctx.translate(e.x + e.w / 2, e.y + e.h / 2);
    ctx.scale(1, -1);
    ctx.translate(-(e.x + e.w / 2), -(e.y + e.h / 2));
    draw();
    ctx.restore();
  }

  function drawWalker(ctx, e) {
    const { x, y, w, h } = e;
    if (e.squish > 0) {
      ctx.fillStyle = '#8e44ad';
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h - 5, w / 2 + 2, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      rect(ctx, '#fff', x + 7, y + h - 7, 5, 2);
      rect(ctx, '#fff', x + w - 12, y + h - 7, 5, 2);
      return;
    }
    withFlip(ctx, e, () => {
      const step = Math.sin(e.anim * 10) > 0 ? 2 : 0;
      rect(ctx, '#3d1f4d', x + 2 + step, y + h - 6, 9, 6);
      rect(ctx, '#3d1f4d', x + w - 11 - (2 - step), y + h - 6, 9, 6);
      ctx.fillStyle = '#c39bd3';
      for (let i = 0; i < 3; i++) tri(ctx, x + 5 + i * 7, y + 6, x + 9 + i * 7, y - 2, x + 13 + i * 7, y + 6);
      ctx.fillStyle = '#8e44ad';
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2 + 1, w / 2, h / 2 - 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#b07cc6';
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2 + 6, w / 3, h / 5, 0, 0, Math.PI * 2);
      ctx.fill();
      const d = e.vx < 0 ? -1 : 1;
      rect(ctx, '#fff', x + w / 2 - 9, y + 8, 7, 8);
      rect(ctx, '#fff', x + w / 2 + 2, y + 8, 7, 8);
      rect(ctx, '#111', x + w / 2 - 7 + d * 2, y + 11, 3, 4);
      rect(ctx, '#111', x + w / 2 + 4 + d * 2, y + 11, 3, 4);
      ctx.strokeStyle = '#2b0f38';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + w / 2 - 10, y + 6);
      ctx.lineTo(x + w / 2 - 2, y + 9);
      ctx.moveTo(x + w / 2 + 10, y + 6);
      ctx.lineTo(x + w / 2 + 2, y + 9);
      ctx.stroke();
    });
  }

  function drawHopper(ctx, e) {
    const { x, y, w, h } = e;
    if (e.squish > 0) {
      ctx.fillStyle = '#27ae60';
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h - 4, w / 2 + 4, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    withFlip(ctx, e, () => {
      const stretch = e.onGround ? 1 : 1.15;
      const bh = h * stretch;
      const by = y + h - bh;
      ctx.fillStyle = '#1e8449';
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h - 4, w / 2, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2ecc71';
      ctx.beginPath();
      ctx.ellipse(x + w / 2, by + bh * 0.55, w / 2, bh * 0.5, 0, Math.PI, 0);
      ctx.lineTo(x + w, y + h - 4);
      ctx.lineTo(x, y + h - 4);
      ctx.fill();
      ctx.fillStyle = '#82e0aa';
      circle(ctx, x + 8, by + 10, 3);
      // Eyes on top
      ctx.fillStyle = '#fff';
      circle(ctx, x + 9, by + 4, 5);
      circle(ctx, x + w - 9, by + 4, 5);
      ctx.fillStyle = '#111';
      circle(ctx, x + 9, by + 5, 2);
      circle(ctx, x + w - 9, by + 5, 2);
    });
  }

  function drawPowerUp(ctx, it, time) {
    const cx = it.x + it.w / 2;
    const cy = it.y + it.h / 2 + 2;
    ctx.fillStyle = '#ff9800';
    circle(ctx, cx, cy, 13);
    ctx.fillStyle = '#ffcc33';
    circle(ctx, cx, cy, 10);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    circle(ctx, cx - 4, cy - 4, 3);
    ctx.fillStyle = '#2e7d32';
    ctx.beginPath();
    ctx.ellipse(cx + 5, cy - 12, 7, 3, -0.5 + Math.sin(time * 6) * 0.15, 0, Math.PI * 2);
    ctx.fill();
    rect(ctx, '#5d4037', cx - 1, cy - 16, 2, 5);
  }

  function drawPlatform(ctx, pl, th) {
    rect(ctx, th.plat, pl.x, pl.y, pl.w, pl.h);
    rect(ctx, th.platTop, pl.x, pl.y, pl.w, 4);
    for (let i = 8; i < pl.w; i += 24) rect(ctx, 'rgba(0,0,0,0.3)', pl.x + i, pl.y + 7, 4, 4);
  }

  function drawParticles(ctx, g) {
    for (const p of g.particles) {
      if (p.type === 'coin') drawCoin(ctx, p.x, p.y, g.time * 3);
      else if (p.type === 'brick') rect(ctx, p.color, p.x, p.y, 10, 10);
      else if (p.type === 'text') {
        ctx.globalAlpha = Math.min(1, p.life * 2);
        text(ctx, p.text, p.x, p.y, 14);
        ctx.globalAlpha = 1;
      }
    }
  }

  // ---------- HUD and screens ----------
  function hud(ctx, g) {
    rect(ctx, 'rgba(0,0,0,0.35)', 0, 0, VW, 34);
    text(ctx, 'SCORE ' + String(Math.floor(g.score)).padStart(6, '0'), 20, 18, 18, '#fff', 'left');
    drawCoin(ctx, 262, 17, g.time);
    text(ctx, '×' + String(g.coins).padStart(2, '0'), 280, 18, 18, '#fff', 'left');
    text(ctx, 'LEVEL ' + (g.levelIndex + 1), 400, 18, 18, '#fff', 'center');
    const lowTime = g.timer < 50 && g.mode === 'playing';
    text(ctx, 'TIME ' + Math.ceil(g.timer), 560, 18, 18, lowTime ? '#ff6b6b' : '#fff', 'left');
    text(ctx, '♥ ×' + g.lives, 700, 18, 18, '#ff8a8a', 'left');
    if (G.audio.isMuted()) text(ctx, '♪ off (M)', VW - 12, VH - 16, 12, '#ddd', 'right');
  }

  function titleScreen(ctx, g) {
    const camX = g.time * 40;
    background(ctx, 'meadow', camX, g.time);
    const th = THEMES.meadow;
    for (let x = -((camX) % T); x < VW; x += T) {
      drawTile(ctx, '#', x, 13 * T, 0, 13, { grid: [], w: 1, h: 0 }, th, g.time);
      rect(ctx, th.ground, x, 14 * T, T, T);
    }
    const bob = Math.sin(g.time * 3) * 6;
    text(ctx, "PIP'S LEAP", VW / 2, 130 + bob, 64, '#ffd166');
    text(ctx, 'An original two-level platform adventure', VW / 2, 190, 18);
    drawHero(ctx, { x: VW / 2 - 12, y: 13 * T - 52, w: 24, h: 52, big: true, facing: 1, vx: 0, onGround: true, anim: 0, inv: 0 }, g.time);
    if (Math.floor(g.time * 2) % 2 === 0) text(ctx, 'Press ENTER to start', VW / 2, 270, 24);
    text(ctx, '← → move   SPACE jump   SHIFT run   P pause   M mute', VW / 2, 320, 15, '#e8f6ff');
    text(ctx, 'Stomp grumps, grab sun berries, reach the flag!', VW / 2, 345, 15, '#e8f6ff');
  }

  function introScreen(ctx, g) {
    rect(ctx, '#000', 0, 0, VW, VH);
    const def = G.levels[g.levelIndex];
    text(ctx, 'LEVEL ' + (g.levelIndex + 1), VW / 2, 170, 40, '#ffd166');
    text(ctx, def.name, VW / 2, 220, 26);
    drawHero(ctx, { x: VW / 2 - 50, y: 280, w: 22, h: 28, big: false, facing: 1, vx: 0, onGround: true, anim: 0, inv: 0 }, g.time);
    text(ctx, '× ' + g.lives, VW / 2 + 10, 295, 24, '#fff', 'left');
  }

  function overlay(ctx, alpha) {
    rect(ctx, `rgba(0,0,0,${alpha})`, 0, 0, VW, VH);
  }

  // ---------- Main draw ----------
  function draw(ctx, g) {
    if (g.mode === 'title') return titleScreen(ctx, g);
    if (g.mode === 'intro') return introScreen(ctx, g);
    if (g.mode === 'gameover') {
      rect(ctx, '#000', 0, 0, VW, VH);
      text(ctx, 'GAME OVER', VW / 2, 190, 52, '#ff6b6b');
      text(ctx, 'Score ' + Math.floor(g.score), VW / 2, 250, 24);
      if (g.modeT > 1.5) text(ctx, 'Press ENTER', VW / 2, 310, 20);
      return;
    }

    const th = THEMES[g.lvl.def.theme];
    background(ctx, g.lvl.def.theme, g.camX, g.time);

    ctx.save();
    ctx.translate(-Math.round(g.camX), 0);
    drawGoal(ctx, g, th);
    for (const it of g.items) if (it.rising) drawPowerUp(ctx, it, g.time);
    drawTiles(ctx, g, th);
    for (const pl of g.platforms) drawPlatform(ctx, pl, th);
    for (const it of g.items) if (!it.rising) drawPowerUp(ctx, it, g.time);
    for (const e of g.enemies) {
      if (!e.active) continue;
      if (e.type === 'walker') drawWalker(ctx, e);
      else drawHopper(ctx, e);
    }
    drawHero(ctx, g.player, g.time);
    drawParticles(ctx, g);
    ctx.restore();

    hud(ctx, g);

    if (g.mode === 'clear' && g.clear.phase !== 'slide') {
      text(ctx, 'LEVEL CLEAR!', VW / 2, 150, 44, '#ffd166');
    }
    if (g.paused) {
      overlay(ctx, 0.5);
      text(ctx, 'PAUSED', VW / 2, VH / 2 - 10, 48);
      text(ctx, 'Press P to continue', VW / 2, VH / 2 + 40, 18);
    }
    if (g.mode === 'victory') {
      overlay(ctx, 0.6);
      text(ctx, 'YOU WIN!', VW / 2, 160, 60, '#ffd166');
      text(ctx, 'Pip made it through the Meadow and the Caverns.', VW / 2, 220, 18);
      text(ctx, 'Final score ' + Math.floor(g.score), VW / 2, 265, 28);
      if (g.modeT > 1.5) text(ctx, 'Press ENTER to play again', VW / 2, 330, 20);
    }
  }

  G.render = { draw };
})(window.Game);
