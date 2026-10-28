window.Game = window.Game || {};

(function (G) {
  const KEYS = {
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'jump', KeyW: 'jump', Space: 'jump', KeyZ: 'jump',
    ShiftLeft: 'run', ShiftRight: 'run', KeyX: 'run',
    KeyM: 'mute',
    KeyP: 'pause', Escape: 'pause',
    Enter: 'start',
  };

  const down = {};    // held right now
  const pressed = {}; // went down since the last game update

  addEventListener('keydown', (e) => {
    const action = KEYS[e.code];
    if (!action) return;
    e.preventDefault();
    if (!down[action]) pressed[action] = true;
    down[action] = true;
    // Browsers only allow audio after a user gesture.
    if (G.audio) G.audio.unlock();
  });

  addEventListener('keyup', (e) => {
    const action = KEYS[e.code];
    if (!action) return;
    e.preventDefault();
    down[action] = false;
  });

  addEventListener('blur', () => {
    for (const k in down) down[k] = false;
  });

  G.input = {
    down,
    pressed,
    endFrame() {
      for (const k in pressed) pressed[k] = false;
    },
  };
})(window.Game);
