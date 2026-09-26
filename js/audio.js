(function () {
  var ctx = null;
  var master, musicBus, sfxBus, voiceBus;
  var unlocked = false;
  var musicTimer = null;
  var currentTrack = null;
  var currentFileTrack = null;
  var fileTrackSource = null;
  var settings = null;
  var speaking = false;
  var fileBuffers = {};
  var FILE_SFX = ['shoot', 'enemyShoot', 'hit', 'explode', 'bigExplode', 'playerHit', 'dash', 'pickup', 'waveClear', 'bossAlarm', 'uiMove', 'uiSelect', 'freeze', 'nova', 'chain', 'shieldBreak'];

  function preloadFiles() {
    if (!ctx) return;
    FILE_SFX.forEach(function (name) {
      var file = name.replace(/([A-Z])/g, function (c) { return '_' + c.toLowerCase(); });
      fetch('assets/audio/' + file + '.wav')
        .then(function (r) { return r.arrayBuffer(); })
        .then(function (ab) { return ctx.decodeAudioData(ab); })
        .then(function (buf) { fileBuffers[name] = buf; })
        .catch(function () {});
    });
    ['menu', 'game', 'boss'].forEach(function (name) {
      fetch('assets/audio/music_' + name + '.wav')
        .then(function (r) { return r.arrayBuffer(); })
        .then(function (ab) { return ctx.decodeAudioData(ab); })
        .then(function (buf) { fileBuffers['music_' + name] = buf; })
        .catch(function () {});
    });
  }

  function ensureCtx() {
    if (ctx) return true;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.connect(ctx.destination);
      musicBus = ctx.createGain();
      musicBus.connect(master);
      sfxBus = ctx.createGain();
      sfxBus.connect(master);
      voiceBus = ctx.createGain();
      voiceBus.connect(master);
      applyVolumes();
      return true;
    } catch (e) { return false; }
  }

  function applyVolumes() {
    if (!ctx) return;
    var s = settings || NS.store.getSettings();
    musicBus.gain.value = s.music * 0.9;
    sfxBus.gain.value = s.sfx;
    voiceBus.gain.value = s.voice;
  }

  function now() { return ctx.currentTime; }

  function env(g, t0, a, peak, d, sustain) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + a);
    g.gain.exponentialRampToValueAtTime(Math.max(sustain || 0.0001, 0.0001), t0 + a + d);
  }

  function osc(type, freq, t0, dur, gainPeak, dest, freqEnd) {
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur);
    env(g, t0, 0.005, gainPeak, dur);
    o.connect(g); g.connect(dest || sfxBus);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  function noise(t0, dur, gainPeak, filterFreq, dest, q) {
    var len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    var src = ctx.createBufferSource();
    src.buffer = buf;
    var f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = filterFreq || 1200;
    f.Q.value = q || 0.8;
    var g = ctx.createGain();
    env(g, t0, 0.004, gainPeak, dur);
    src.connect(f); f.connect(g); g.connect(dest || sfxBus);
    src.start(t0); src.stop(t0 + dur + 0.05);
  }

  var SFX = {
    shoot: function () { if (!ctx) return; osc('square', 880, now(), 0.09, 0.16, sfxBus, 220); },
    enemyShoot: function () { if (!ctx) return; osc('sawtooth', 320, now(), 0.12, 0.10, sfxBus, 140); },
    hit: function () { if (!ctx) return; noise(now(), 0.08, 0.2, 2400); osc('triangle', 200, now(), 0.08, 0.18, sfxBus, 60); },
    explode: function () {
      if (!ctx) return;
      noise(now(), 0.35, 0.4, 900);
      osc('sine', 160, now(), 0.3, 0.3, sfxBus, 40);
    },
    bigExplode: function () {
      if (!ctx) return;
      noise(now(), 0.7, 0.5, 600);
      osc('sine', 110, now(), 0.6, 0.4, sfxBus, 30);
      osc('sawtooth', 70, now(), 0.5, 0.25, sfxBus, 25);
    },
    playerHit: function () {
      if (!ctx) return;
      noise(now(), 0.25, 0.4, 1500);
      osc('square', 220, now(), 0.25, 0.25, sfxBus, 55);
    },
    dash: function () { if (!ctx) return; noise(now(), 0.18, 0.22, 3000, sfxBus, 2); osc('sine', 300, now(), 0.15, 0.12, sfxBus, 900); },
    pickup: function () {
      if (!ctx) return;
      var t = now();
      osc('sine', 520, t, 0.09, 0.2);
      osc('sine', 660, t + 0.07, 0.09, 0.2);
      osc('sine', 880, t + 0.14, 0.14, 0.22);
    },
    waveClear: function () {
      if (!ctx) return;
      var t = now();
      [523, 659, 784, 1047].forEach(function (f, i) { osc('triangle', f, t + i * 0.09, 0.18, 0.2); });
    },
    bossAlarm: function () {
      if (!ctx) return;
      var t = now();
      for (var i = 0; i < 3; i++) { osc('sawtooth', 180, t + i * 0.28, 0.2, 0.2, sfxBus, 120); osc('sawtooth', 183, t + i * 0.28, 0.2, 0.2, sfxBus, 124); }
    },
    uiMove: function () { if (!ctx) return; osc('sine', 700, now(), 0.05, 0.1); },
    uiSelect: function () { if (!ctx) return; osc('sine', 880, now(), 0.08, 0.15); osc('sine', 1320, now() + 0.05, 0.1, 0.12); },
    freeze: function () { if (!ctx) return; osc('sine', 1400, now(), 0.3, 0.15, sfxBus, 200); },
    nova: function () { if (!ctx) return; noise(now(), 0.5, 0.4, 2500); osc('sine', 90, now(), 0.5, 0.35, sfxBus, 35); },
    chain: function () { if (!ctx) return; osc('sawtooth', 1200, now(), 0.1, 0.12, sfxBus, 300); },
    shieldBreak: function () { if (!ctx) return; noise(now(), 0.3, 0.35, 4000); osc('square', 500, now(), 0.2, 0.15, sfxBus, 100); },
  };

  var TRACKS = {
    menu: { bpm: 92, bass: [0, 0, 7, 5, 0, 0, 7, 10], arp: [0, 3, 7, 12, 7, 3], root: 45 },
    game: { bpm: 118, bass: [0, 0, 3, 0, 5, 0, 7, 5], arp: [0, 3, 7, 10, 12, 10, 7, 3], root: 43 },
    boss: { bpm: 132, bass: [0, 0, 1, 0, 0, 6, 5, 6], arp: [0, 1, 7, 8, 7, 1], root: 41 },
  };

  function midi(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  function scheduleBar(track, barStart) {
    var beat = 60 / track.bpm;
    var bar = beat * 4;
    for (var b = 0; b < 8; b++) {
      var t0 = barStart + b * beat * 0.5;
      var bassNote = track.root + track.bass[b % track.bass.length];
      osc('sawtooth', midi(bassNote - 12), t0, beat * 0.45, 0.16, musicBus);
      osc('square', midi(bassNote - 24), t0, beat * 0.4, 0.10, musicBus);
      var arpNote = track.root + 12 + track.arp[b % track.arp.length];
      osc('triangle', midi(arpNote), t0, beat * 0.3, 0.07, musicBus);
      if (b % 2 === 0) {
        var o = ctx.createOscillator(); var g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = 1800;
        env(g, t0, 0.001, b % 4 === 0 ? 0.12 : 0.05, 0.03);
        o.connect(g); g.connect(musicBus); o.start(t0); o.stop(t0 + 0.06);
      }
    }
    [0, 1, 2, 3].forEach(function (s) {
      var t0 = barStart + s * beat;
      noise(t0, 0.12, s % 2 === 0 ? 0.14 : 0.08, 5000, musicBus);
    });
    return barStart + bar;
  }

  function musicLoop() {
    if (!ctx || !currentTrack) return;
    var track = TRACKS[currentTrack];
    if (!track) return;
    var t = now() + 0.05;
    scheduleBar(track, t);
    musicTimer = setTimeout(musicLoop, (60 / track.bpm) * 4 * 1000 - 40);
  }

  function playBuffer(buf, dest, loop) {
    var src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = !!loop;
    src.connect(dest);
    src.start();
    return src;
  }

  NS.audio = {
    unlock: function () {
      if (!ensureCtx()) return;
      if (ctx.state === 'suspended') ctx.resume();
      unlocked = true;
      preloadFiles();
    },
    isUnlocked: function () { return unlocked; },
    play: function (name) {
      if (!ctx || !unlocked) return;
      if (fileBuffers[name]) {
        playBuffer(fileBuffers[name], sfxBus, false);
        return;
      }
      if (SFX[name]) SFX[name]();
    },
    music: function (name) {
      if (!ctx || !unlocked) return;
      if (fileBuffers['music_' + name]) {
        if (currentFileTrack === name) return;
        if (fileTrackSource) { try { fileTrackSource.stop(); } catch (e) {} fileTrackSource = null; }
        currentFileTrack = name;
        currentTrack = null;
        if (musicTimer) { clearTimeout(musicTimer); musicTimer = null; }
        fileTrackSource = playBuffer(fileBuffers['music_' + name], musicBus, true);
        return;
      }
      currentFileTrack = null;
      if (fileTrackSource) { try { fileTrackSource.stop(); } catch (e) {} fileTrackSource = null; }
      if (currentTrack === name) return;
      currentTrack = name;
      if (musicTimer) { clearTimeout(musicTimer); musicTimer = null; }
      musicLoop();
    },
    stopMusic: function () {
      currentTrack = null;
      currentFileTrack = null;
      if (fileTrackSource) { try { fileTrackSource.stop(); } catch (e) {} fileTrackSource = null; }
      if (musicTimer) { clearTimeout(musicTimer); musicTimer = null; }
    },
    setVolumes: function (s) { settings = s; applyVolumes(); },
    speak: function (text, captionEl) {
      var s = settings || NS.store.getSettings();
      if (s.voice <= 0) return;
      try {
        if (!('speechSynthesis' in window)) return;
        if (speaking) speechSynthesis.cancel();
        speaking = true;
        var u = new SpeechSynthesisUtterance(text);
        u.volume = Math.min(1, s.voice + 0.1);
        u.rate = 1.15;
        u.pitch = 0.9;
        u.onend = function () { speaking = false; };
        u.onerror = function () { speaking = false; };
        speechSynthesis.speak(u);
      } catch (e) { /* speech unavailable — captions still show */ }
    },
    stopSpeak: function () {
      try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) {}
      speaking = false;
    },
  };
})();
