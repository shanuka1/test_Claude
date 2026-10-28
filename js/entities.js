window.Game = window.Game || {};

(function (G) {
  const T = G.TILE;
  const P = G.physics;
  const GRAVITY = 1800;
  const MAX_FALL = 900;

  // ---------- Player (Pip) ----------
  class Player {
    constructor(x, y, big) {
      this.x = x; this.y = y;
      this.w = 22; this.h = 28;
      this.vx = 0; this.vy = 0;
      this.big = false;
      this.facing = 1;
      this.onGround = false;
      this.coyote = 0;     // short grace period to jump after leaving a ledge
      this.jumpBuf = 0;    // remembers a jump press made just before landing
      this.inv = 0;        // invincibility after getting hit
      this.anim = 0;
      this.ride = null;    // moving platform we're standing on
      this.hidden = false;
      this.prevBottom = y + this.h;
      if (big) this.setBig(true);
    }

    setBig(big) {
      const bottom = this.y + this.h;
      const cx = this.x + this.w / 2;
      this.big = big;
      this.w = big ? 24 : 22;
      this.h = big ? 52 : 28;
      this.y = bottom - this.h;
      this.x = cx - this.w / 2;
    }

    // c = controls { left, right, run, jump (held), jumpPressed }
    update(dt, lvl, c, g) {
      this.prevBottom = this.y + this.h;
      if (this.inv > 0) this.inv -= dt;

      // Horizontal movement
      const max = c.run ? 280 : 170;
      const dir = (c.right ? 1 : 0) - (c.left ? 1 : 0);
      if (dir !== 0) {
        this.facing = dir;
        const acc = this.onGround ? 1000 : 650;
        const turning = this.vx * dir < 0;
        this.vx += dir * acc * (turning ? 2 : 1) * dt;
        if (Math.abs(this.vx) > max) {
          this.vx = Math.sign(this.vx) * Math.max(max, Math.abs(this.vx) - acc * 2 * dt);
        }
      } else {
        const f = (this.onGround ? 1200 : 250) * dt;
        this.vx = Math.abs(this.vx) <= f ? 0 : this.vx - Math.sign(this.vx) * f;
      }

      // Jumping
      this.jumpBuf = c.jumpPressed ? 0.12 : Math.max(0, this.jumpBuf - dt);
      this.coyote = this.onGround ? 0.1 : Math.max(0, this.coyote - dt);
      if (this.jumpBuf > 0 && this.coyote > 0) {
        this.vy = -(700 + Math.abs(this.vx) * 0.15);
        this.jumpBuf = 0;
        this.coyote = 0;
        this.onGround = false;
        this.ride = null;
        G.audio.sfx('jump');
      }
      // Let go of jump early for a shorter hop
      if (!c.jump && this.vy < -260) this.vy = -260;
      this.vy = Math.min(this.vy + GRAVITY * dt, MAX_FALL);

      // Carried by a moving platform
      if (this.ride) {
        P.moveX(this, lvl, this.ride.dx);
        if (this.vy >= 0) this.y = this.ride.y - this.h;
      }
      this.ride = null;

      if (P.moveX(this, lvl, this.vx * dt)) this.vx = 0;
      const r = P.moveY(this, lvl, this.vy * dt);
      this.onGround = false;
      if (r.landed) { this.vy = 0; this.onGround = true; }
      if (r.head) { this.vy = 0; g.bumpTile(r.head.cx, r.head.cy); }

      // Land on moving platforms (one-way: only from above)
      if (this.vy >= 0) {
        for (const pl of g.platforms) {
          if (this.x + this.w > pl.x + 2 && this.x < pl.x + pl.w - 2) {
            const bottom = this.y + this.h;
            if (bottom >= pl.y && this.prevBottom <= pl.y + 8) {
              this.y = pl.y - this.h;
              this.vy = 0;
              this.onGround = true;
              this.ride = pl;
              break;
            }
          }
        }
      }

      this.anim += Math.abs(this.vx) * dt;
    }

    hurt(g) {
      if (this.inv > 0 || g.mode !== 'playing') return;
      if (this.big) {
        this.setBig(false);
        this.inv = 2;
        G.audio.sfx('hurt');
      } else {
        g.killPlayer();
      }
    }
  }

  // ---------- Enemies ----------
  class Enemy {
    constructor(x, y, w, h) {
      this.x = x; this.y = y; this.w = w; this.h = h;
      this.vx = -60; this.vy = 0;
      this.active = false;  // wakes up when it scrolls into view
      this.squish = 0;      // >0 while showing the flattened sprite
      this.dead = false;    // knocked off by a bumped block
      this.remove = false;
      this.onGround = false;
      this.anim = 0;
    }

    // Shared handling for squished / knocked-out states. Returns true if handled.
    updateDeath(dt, lvl) {
      if (this.squish > 0) {
        this.squish -= dt;
        if (this.squish <= 0) this.remove = true;
        return true;
      }
      if (this.dead) {
        this.vy += GRAVITY * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        if (this.y > lvl.h * T + 100) this.remove = true;
        return true;
      }
      return false;
    }

    knockOut() {
      this.dead = true;
      this.vy = -420;
      this.vx = 60;
    }

    get harmful() {
      return this.active && !this.dead && this.squish <= 0;
    }
  }

  // Purple grump that patrols back and forth.
  class Walker extends Enemy {
    constructor(x, y) {
      super(x, y, 28, 28);
      this.type = 'walker';
    }
    update(dt, lvl) {
      if (this.updateDeath(dt, lvl)) return;
      this.vy = Math.min(this.vy + GRAVITY * dt, MAX_FALL);
      if (P.moveX(this, lvl, this.vx * dt)) this.vx = -this.vx;
      const r = P.moveY(this, lvl, this.vy * dt);
      if (r.landed || r.head) this.vy = 0;
      if (this.y > lvl.h * T + 64) this.remove = true;
      this.anim += dt;
    }
  }

  // Green slime that waits, then hops toward Pip.
  class Hopper extends Enemy {
    constructor(x, y) {
      super(x, y, 28, 26);
      this.type = 'hopper';
      this.vx = 0;
      this.wait = 0.8 + Math.random() * 0.8;
    }
    update(dt, lvl, g) {
      if (this.updateDeath(dt, lvl)) return;
      this.vy = Math.min(this.vy + GRAVITY * dt, MAX_FALL);
      if (this.onGround) {
        this.vx = 0;
        this.wait -= dt;
        if (this.wait <= 0) {
          const dir = Math.sign(g.player.x - this.x) || -1;
          this.vx = dir * 75;
          this.vy = -560;
          this.onGround = false;
          this.wait = 1.1 + Math.random() * 0.5;
        }
      }
      if (P.moveX(this, lvl, this.vx * dt)) this.vx = -this.vx;
      const r = P.moveY(this, lvl, this.vy * dt);
      this.onGround = r.landed;
      if (r.landed || r.head) this.vy = 0;
      if (this.y > lvl.h * T + 64) this.remove = true;
      this.anim += dt;
    }
  }

  // ---------- Sun Berry power-up ----------
  class PowerUp {
    constructor(cx, cy) {
      this.w = 24; this.h = 24;
      this.x = cx * T + 4;
      this.startY = cy * T + 4;
      this.endY = cy * T - this.h;
      this.y = this.startY;
      this.vx = 90; this.vy = 0;
      this.rising = true;
      this.t = 0;
      this.remove = false;
    }
    update(dt, lvl) {
      if (this.rising) {
        this.t += dt;
        const k = Math.min(1, this.t / 0.6);
        this.y = this.startY + (this.endY - this.startY) * k;
        if (k >= 1) this.rising = false;
        return;
      }
      this.vy = Math.min(this.vy + GRAVITY * dt, MAX_FALL);
      if (P.moveX(this, lvl, this.vx * dt)) this.vx = -this.vx;
      const r = P.moveY(this, lvl, this.vy * dt);
      if (r.landed || r.head) this.vy = 0;
      if (this.y > lvl.h * T + 50) this.remove = true;
    }
  }

  // ---------- Moving platform ----------
  class Platform {
    constructor(p) {
      this.w = (p.len || 3) * T;
      this.h = 14;
      this.baseX = p.x * T;
      this.baseY = p.y * T;
      this.axis = p.axis;
      this.range = p.range * T;
      this.speed = p.speed || 1;
      this.t = p.phase || 0;
      this.x = this.baseX;
      this.y = this.baseY;
      this.dx = 0; this.dy = 0;
      this.place();
      this.dx = 0; this.dy = 0;
    }
    place() {
      const off = (Math.sin(this.t - Math.PI / 2) * 0.5 + 0.5) * this.range;
      const nx = this.axis === 'x' ? this.baseX + off : this.baseX;
      const ny = this.axis === 'y' ? this.baseY + off : this.baseY;
      this.dx = nx - this.x;
      this.dy = ny - this.y;
      this.x = nx;
      this.y = ny;
    }
    update(dt) {
      this.t += dt * this.speed;
      this.place();
    }
  }

  Object.assign(G, { Player, Walker, Hopper, PowerUp, Platform });
})(window.Game);
