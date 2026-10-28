window.Game = window.Game || {};

/*
  Tiny chiptune engine built on the Web Audio API.
  All music below is original. Each token is one eighth note:
    "C5" plays a note, "-" holds the previous note, "." is a rest, "|" is just a bar line.
  Drums: k = kick, s = snare, h = hi-hat, . = rest.
*/
(function (G) {
  const SONGS = [
    {
      name: 'Meadow Morning',
      bpm: 150,
      echo: 0.12,
      lead:
        'C5 . E5 G5 A5 G5 E5 . | F5 . A5 F5 E5 . C5 . | D5 . F5 A5 G5 F5 E5 D5 | E5 - - . G4 . . . |' +
        'C5 . E5 G5 C6 . B5 A5 | G5 . E5 . F5 G5 A5 . | G5 F5 E5 D5 C5 . D5 E5 | C5 - - - . . . . |' +
        'A5 . G5 . E5 . C5 . | D5 . E5 F5 E5 . D5 . | G5 . F5 . D5 . B4 . | C5 . D5 E5 D5 . G4 . |' +
        'A4 . C5 . F5 . A5 . | G5 . E5 . C5 . E5 . | F5 . E5 . D5 . G4 B4 | C5 - - - . . . .',
      bass:
        'C3 . G3 . C3 . G3 . | F2 . C3 . F2 . C3 . | D3 . A2 . G2 . B2 . | C3 . G2 . C3 . G2 . |' +
        'C3 . G3 . C3 . G3 . | A2 . E3 . F2 . C3 . | G2 . D3 . G2 . B2 . | C3 . G2 . C3 - - . |' +
        'F2 . C3 . F2 . C3 . | D3 . A2 . D3 . A2 . | G2 . D3 . G2 . D3 . | C3 . G2 . C3 . E3 . |' +
        'F2 . C3 . F2 . C3 . | C3 . G2 . C3 . G2 . | G2 . D3 . G2 . F2 . | C3 . G2 . C3 . . .',
      drums: 'k h s h k k s h',
    },
    {
      name: 'Crystal Echoes',
      bpm: 116,
      echo: 0.35,
      lead:
        'A4 . C5 E5 . D5 C5 . | B4 . G4 . E4 - - . | A4 . C5 E5 . F5 E5 D5 | E5 - - - . . . . |' +
        'F5 . E5 D5 . C5 B4 . | C5 . A4 . E4 - - . | D5 . C5 B4 . G#4 A4 B4 | A4 - - - . . . . |' +
        'E5 . . E5 D5 . C5 . | D5 . . D5 C5 . B4 . | C5 . . C5 B4 . A4 . | B4 - - - G#4 - - . |' +
        'A4 . C5 . E5 . A5 . | G5 . F5 . E5 . D5 . | C5 . B4 . A4 . G#4 . | A4 - - - . . . .',
      bass:
        'A2 . E3 . A2 . E3 . | G2 . D3 . G2 . D3 . | A2 . E3 . A2 . E3 . | E2 . B2 . E2 . B2 . |' +
        'F2 . C3 . F2 . C3 . | A2 . E3 . A2 . E3 . | E2 . B2 . E2 . G#2 . | A2 . E3 . A2 - - . |' +
        'A2 . A2 . A2 . A2 . | G2 . G2 . G2 . G2 . | F2 . F2 . F2 . F2 . | E2 . E2 . E2 . E2 . |' +
        'A2 . E3 . A2 . E3 . | C3 . G2 . C3 . G2 . | F2 . C3 . E2 . B2 . | A2 . E3 . A2 . . .',
      drums: 'k . h . s . h h',
    },
  ];

  const NOTE_INDEX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function freq(name) {
    const m = /^([A-G])(#|b)?(\d)$/.exec(name);
    if (!m) return 440;
    const semis = NOTE_INDEX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    const midi = (Number(m[3]) + 1) * 12 + semis;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // Turn "C5 - . E5" into a lookup of step -> { freq, len }.
  function parseVoice(str) {
    const toks = str.split(/\s+/).filter((t) => t && t !== '|');
    const byStep = new Array(toks.length).fill(null);
    let last = null;
    toks.forEach((t, i) => {
      if (t === '-') { if (last) last.len++; }
      else if (t === '.') { last = null; }
      else { last = { freq: freq(t), len: 1 }; byStep[i] = last; }
    });
    return byStep;
  }

  for (const s of SONGS) {
    s.leadSteps = parseVoice(s.lead);
    s.bassSteps = parseVoice(s.bass);
    s.drumSteps = s.drums.split(/\s+/);
    s.length = s.leadSteps.length;
  }

  let ac = null;
  let master, musicGain, sfxGain, echoSend, noiseBuf;
  let muted = false;
  let song = null;
  let step = 0;
  let nextTime = 0;
  let timer = null;

  function unlock() {
    if (!ac) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      ac = new Ctx();
      master = ac.createGain();
      master.gain.value = muted ? 0 : 0.6;
      master.connect(ac.destination);
      musicGain = ac.createGain();
      musicGain.gain.value = 0.55;
      musicGain.connect(master);
      sfxGain = ac.createGain();
      sfxGain.gain.value = 0.8;
      sfxGain.connect(master);

      // Simple echo for the lead line
      echoSend = ac.createGain();
      const delay = ac.createDelay(1);
      delay.delayTime.value = 0.3;
      const feedback = ac.createGain();
      feedback.gain.value = 0.35;
      echoSend.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(musicGain);

      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    if (ac.state === 'suspended' && !paused) ac.resume();
  }

  // ---------- Instruments ----------
  function tone(f, t, dur, type, vol, dest, slideTo) {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.setValueAtTime(vol, t + Math.max(0.011, dur * 0.6));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(t + dur + 0.02);
    return g;
  }

  function noise(t, dur, vol, filterType, filterFreq, dest) {
    const src = ac.createBufferSource();
    src.buffer = noiseBuf;
    const filter = ac.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = filterFreq;
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(dest);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  function drum(kind, t) {
    if (kind === 'k') tone(150, t, 0.14, 'sine', 0.7, musicGain, 40);
    else if (kind === 's') {
      noise(t, 0.14, 0.35, 'highpass', 1500, musicGain);
      tone(220, t, 0.06, 'triangle', 0.2, musicGain);
    } else if (kind === 'h') noise(t, 0.04, 0.12, 'highpass', 7000, musicGain);
  }

  // ---------- Music sequencer ----------
  function scheduler() {
    if (!song || !ac) return;
    const stepDur = 60 / song.bpm / 2;
    while (nextTime < ac.currentTime + 0.15) {
      const lead = song.leadSteps[step];
      if (lead) {
        const dur = lead.len * stepDur * 0.92;
        const g = tone(lead.freq, nextTime, dur, 'square', 0.13, musicGain);
        if (song.echo) {
          const send = ac.createGain();
          send.gain.value = song.echo;
          g.connect(send);
          send.connect(echoSend);
        }
      }
      const bass = song.bassSteps[step];
      if (bass) tone(bass.freq, nextTime, bass.len * stepDur * 0.9, 'triangle', 0.32, musicGain);
      drum(song.drumSteps[step % song.drumSteps.length], nextTime);

      step = (step + 1) % song.length;
      nextTime += stepDur;
    }
  }

  function playMusic(i) {
    if (!ac) return;
    song = SONGS[i % SONGS.length];
    step = 0;
    nextTime = ac.currentTime + 0.05;
    if (!timer) timer = setInterval(scheduler, 25);
  }

  function stopMusic() {
    song = null;
  }

  // ---------- Sound effects ----------
  function melody(notes, stepDur, type, vol) {
    let t = ac.currentTime + 0.01;
    for (const [n, len] of notes) {
      if (n !== '.') tone(freq(n), t, stepDur * len * 0.95, type, vol, sfxGain);
      t += stepDur * len;
    }
  }

  const SFX = {
    jump: () => tone(260, ac.currentTime, 0.16, 'square', 0.12, sfxGain, 640),
    coin: () => {
      tone(freq('B5'), ac.currentTime, 0.07, 'square', 0.12, sfxGain);
      tone(freq('E6'), ac.currentTime + 0.07, 0.25, 'square', 0.12, sfxGain);
    },
    stomp: () => {
      tone(420, ac.currentTime, 0.12, 'square', 0.15, sfxGain, 110);
      noise(ac.currentTime, 0.08, 0.2, 'lowpass', 1200, sfxGain);
    },
    bump: () => tone(130, ac.currentTime, 0.1, 'triangle', 0.4, sfxGain, 70),
    break: () => {
      noise(ac.currentTime, 0.3, 0.5, 'lowpass', 1400, sfxGain);
      tone(110, ac.currentTime, 0.12, 'triangle', 0.4, sfxGain, 60);
    },
    sprout: () => melody([['C5', 1], ['G5', 1], ['C6', 1], ['E6', 1]], 0.06, 'triangle', 0.25),
    powerup: () => melody([['C5', 1], ['E5', 1], ['G5', 1], ['C6', 1], ['E6', 1], ['G6', 2]], 0.05, 'square', 0.12),
    oneup: () => melody([['C5', 1], ['G5', 1], ['C6', 1], ['E6', 1], ['G6', 2]], 0.08, 'square', 0.12),
    hurt: () => tone(620, ac.currentTime, 0.4, 'square', 0.13, sfxGain, 140),
    die: () => melody([['G5', 1], ['E5', 1], ['C5', 1], ['G4', 1], ['.', 1], ['A4', 1], ['F4', 1], ['D4', 1], ['C4', 3]], 0.12, 'square', 0.13),
    clear: () => melody([['C5', 1], ['E5', 1], ['G5', 1], ['C6', 2], ['.', 1], ['G5', 1], ['A5', 1], ['B5', 1], ['C6', 4]], 0.11, 'square', 0.14),
    gameover: () => melody([['A4', 2], ['E4', 2], ['C4', 2], ['.', 1], ['B3', 1], ['A3', 6]], 0.15, 'triangle', 0.35),
    victory: () => melody([
      ['G4', 1], ['C5', 1], ['E5', 1], ['G5', 2], ['E5', 1], ['G5', 1], ['C6', 3], ['.', 1],
      ['F5', 1], ['A5', 1], ['C6', 1], ['D6', 3], ['.', 1], ['B5', 1], ['D6', 1], ['E6', 6],
    ], 0.12, 'square', 0.14),
    tick: () => tone(1400, ac.currentTime, 0.03, 'square', 0.05, sfxGain),
  };

  function sfx(name) {
    if (!ac || !SFX[name]) return;
    SFX[name]();
  }

  let paused = false;
  function setPaused(p) {
    paused = p;
    if (!ac) return;
    if (p) ac.suspend();
    else ac.resume();
  }

  function toggleMute() {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : 0.6;
  }

  G.audio = {
    unlock,
    playMusic,
    stopMusic,
    sfx,
    setPaused,
    toggleMute,
    isMuted: () => muted,
  };
})(window.Game);
