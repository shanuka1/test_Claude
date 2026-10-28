window.Game = window.Game || {};

(function (G) {
  const T = 32;
  G.TILE = T;

  const SOLID = new Set(['#', 'B', '?', 'M', 'U', 'P', 'X']);

  function tileAt(lvl, cx, cy) {
    if (cx < 0 || cx >= lvl.w) return '#'; // level sides are walls
    if (cy < 0 || cy >= lvl.h) return '.';
    return lvl.grid[cy][cx];
  }

  function isSolid(lvl, cx, cy) {
    return SOLID.has(tileAt(lvl, cx, cy));
  }

  // Move horizontally and stop at walls. Returns true if a wall was hit.
  function moveX(e, lvl, dx) {
    if (!dx) return false;
    e.x += dx;
    const y0 = Math.floor(e.y / T);
    const y1 = Math.floor((e.y + e.h - 0.01) / T);
    if (dx > 0) {
      const cx = Math.floor((e.x + e.w - 0.01) / T);
      for (let cy = y0; cy <= y1; cy++) {
        if (isSolid(lvl, cx, cy)) { e.x = cx * T - e.w; return true; }
      }
    } else {
      const cx = Math.floor(e.x / T);
      for (let cy = y0; cy <= y1; cy++) {
        if (isSolid(lvl, cx, cy)) { e.x = (cx + 1) * T; return true; }
      }
    }
    return false;
  }

  // Move vertically. Reports landing, and which tile the head hit (closest to center).
  function moveY(e, lvl, dy) {
    const res = { landed: false, head: null };
    if (!dy) return res;
    e.y += dy;
    const x0 = Math.floor(e.x / T);
    const x1 = Math.floor((e.x + e.w - 0.01) / T);
    if (dy > 0) {
      const cy = Math.floor((e.y + e.h - 0.01) / T);
      for (let cx = x0; cx <= x1; cx++) {
        if (isSolid(lvl, cx, cy)) { e.y = cy * T - e.h; res.landed = true; break; }
      }
    } else {
      const cy = Math.floor(e.y / T);
      let best = null;
      let bestDist = Infinity;
      for (let cx = x0; cx <= x1; cx++) {
        if (isSolid(lvl, cx, cy)) {
          const d = Math.abs((cx + 0.5) * T - (e.x + e.w / 2));
          if (d < bestDist) { bestDist = d; best = cx; }
        }
      }
      if (best !== null) {
        e.y = (cy + 1) * T;
        res.head = { cx: best, cy };
      }
    }
    return res;
  }

  function overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  G.physics = { tileAt, isSolid, moveX, moveY, overlap };
})(window.Game);
