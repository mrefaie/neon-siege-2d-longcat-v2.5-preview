(function () {
  var screens = {};
  var current = 'title';
  var captionTimer = null;
  var lastCaption = '';

  function show(name) {
    Object.keys(screens).forEach(function (k) {
      if (screens[k]) screens[k].classList.toggle('visible', k === name);
    });
    current = name;
  }

  function hideAll() { show(null); }

  function caption(text) {
    var el = document.getElementById('caption');
    if (!el) return;
    if (text === lastCaption) return;
    lastCaption = text;
    el.textContent = text;
    el.classList.add('visible');
    if (captionTimer) clearTimeout(captionTimer);
    captionTimer = setTimeout(function () {
      el.classList.remove('visible');
      lastCaption = '';
    }, 2600);
  }

  var ANNOUNCE = {
    waveStart: function (d) { return d.isBoss ? 'Warning. Boss approaching.' : 'Wave ' + d.n; },
    bossDown: function () { return 'Boss destroyed.'; },
    playerDown: function () { return 'Ship destroyed.'; },
    waveClear: function (d) { return 'Wave ' + d.n + ' clear.'; },
    bossPhase: function (d) { return 'Boss phase ' + d.phase + '.'; },
  };

  function onEvent(W, ev) {
    var fn = ANNOUNCE[ev.name];
    if (fn) {
      var text = fn(ev.data || {});
      caption(text);
      NS.audio.speak(text, document.getElementById('caption'));
    }
    if (ev.name === 'waveClear') caption('Wave ' + ev.data.n + ' clear. Bonus ' + ev.data.bonus + '.');
  }

  function refreshLeaderboard() {
    var el = document.getElementById('lb-list');
    if (!el) return;
    var scores = NS.store.getSettings ? NS.store.getScores() : [];
    if (!scores.length) {
      el.innerHTML = '<div class="lb-empty">No scores yet. Be the first.</div>';
      return;
    }
    el.innerHTML = scores.map(function (s, i) {
      var date = s.date ? new Date(s.date) : null;
      var ds = date ? date.toLocaleDateString() : '';
      var dur = s.duration ? Math.floor(s.duration / 60) + ':' + String(Math.floor(s.duration % 60)).padStart(2, '0') : '';
      return '<div class="lb-row"><span>' + (i + 1) + '.</span><span class="lb-name">' + escapeHtml(s.name || 'ACE') + '</span><span>' + s.score + '</span><span>W' + s.wave + '</span><span>' + dur + '</span><span>' + ds + '</span></div>';
    }).join('');
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function fillSettings() {
    var s = NS.store.getSettings();
    var m = document.getElementById('set-music');
    var v = document.getElementById('set-sfx');
    var vo = document.getElementById('set-voice');
    var rm = document.getElementById('set-reduced');
    var sk = document.getElementById('set-shake');
    if (m) m.value = s.music;
    if (v) v.value = s.sfx;
    if (vo) vo.value = s.voice;
    if (rm) rm.checked = !!s.reducedMotion;
    if (sk) sk.checked = !!s.screenShake;
  }

  function bindSettings() {
    function save() {
      var s = {
        music: parseFloat(document.getElementById('set-music').value),
        sfx: parseFloat(document.getElementById('set-sfx').value),
        voice: parseFloat(document.getElementById('set-voice').value),
        reducedMotion: document.getElementById('set-reduced').checked,
        screenShake: document.getElementById('set-shake').checked,
      };
      NS.store.saveSettings(s);
      NS.audio.setVolumes(s);
      if (s.reducedMotion) { if (NS.world) NS.world.shake = 0; }
    }
    ['set-music', 'set-sfx', 'set-voice', 'set-reduced', 'set-shake'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('input', save);
    });
    var nameEl = document.getElementById('set-name');
    if (nameEl) {
      nameEl.value = NS.store.getSettings().playerName || 'ACE';
      nameEl.addEventListener('input', function () {
        NS.store.saveSettings({ playerName: nameEl.value.slice(0, 12) || 'ACE' });
      });
    }
    var cl = document.getElementById('lb-clear');
    if (cl) cl.addEventListener('click', function () { NS.store.clearScores(); refreshLeaderboard(); });
  }

  function fillGameOver(W) {
    document.getElementById('go-score').textContent = W.score;
    document.getElementById('go-wave').textContent = W.wave.n;
    document.getElementById('go-kills').textContent = W.kills;
    document.getElementById('go-combo').textContent = 'x' + W.stats.maxCombo.toFixed(1);
    document.getElementById('go-powerups').textContent = W.stats.powerupsTaken;
    document.getElementById('go-time').textContent = Math.floor(W.runTime / 60) + ':' + String(Math.floor(W.runTime % 60)).padStart(2, '0');
    var name = NS.store.getSettings().playerName || 'ACE';
    NS.store.addScore({
      name: name, score: W.score, wave: W.wave.n,
      duration: Math.round(W.runTime), date: new Date().toISOString(),
    });
  }

  function init() {
    ['title', 'howto', 'leaderboard', 'settings', 'pause', 'gameover'].forEach(function (n) {
      screens[n] = document.getElementById('screen-' + n);
    });
    var buttons = document.querySelectorAll('[data-screen]');
    buttons.forEach(function (b) {
      b.addEventListener('click', function () {
        NS.audio.unlock();
        NS.audio.play('uiSelect');
        var s = b.getAttribute('data-screen');
        if (s === 'leaderboard') refreshLeaderboard();
        if (s === 'settings') fillSettings();
        show(s);
      });
    });
    bindSettings();
    var playBtn = document.getElementById('btn-play');
    if (playBtn) playBtn.addEventListener('click', function () {
      NS.audio.unlock();
      NS.audio.play('uiSelect');
      NS.ui.startGame();
    });
    document.getElementById('btn-resume').addEventListener('click', function () { NS.ui.resume(); });
    document.getElementById('btn-restart-pause').addEventListener('click', function () { NS.ui.toTitle(); });
    document.getElementById('btn-retry-go').addEventListener('click', function () { NS.ui.startGame(); });
    show('title');
  }

  NS.ui = {
    init: init,
    show: show,
    hideAll: hideAll,
    current: function () { return current; },
    caption: caption,
    onEvent: onEvent,
    fillGameOver: fillGameOver,
    refreshLeaderboard: refreshLeaderboard,
    startGame: function () {},
    resume: function () {},
    toTitle: function () {},
  };
})();
