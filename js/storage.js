(function () {
  var mem = { settings: null, scores: null };
  var ok = true;

  function raw() {
    try {
      var v = localStorage.getItem(NS.C.STORAGE_KEY);
      return v ? JSON.parse(v) : null;
    } catch (e) {
      ok = false;
      return null;
    }
  }

  function save() {
    if (!ok) return;
    try {
      localStorage.setItem(NS.C.STORAGE_KEY, JSON.stringify({ settings: mem.settings, scores: mem.scores }));
    } catch (e) { ok = false; }
  }

  var DEFAULTS = {
    music: 0.55, sfx: 0.8, voice: 0.9,
    reducedMotion: false, screenShake: true,
    playerName: 'ACE',
  };

  NS.store = {
    storageAvailable: function () { return ok; },
    getSettings: function () {
      if (mem.settings) return mem.settings;
      var d = raw();
      mem.settings = (d && d.settings) ? Object.assign({}, DEFAULTS, d.settings) : Object.assign({}, DEFAULTS);
      return mem.settings;
    },
    saveSettings: function (s) {
      mem.settings = Object.assign({}, this.getSettings(), s);
      save();
    },
    getScores: function () {
      if (mem.scores) return mem.scores;
      var d = raw();
      mem.scores = (d && Array.isArray(d.scores)) ? d.scores.slice(0, 10) : [];
      return mem.scores;
    },
    addScore: function (entry) {
      var list = this.getScores();
      list.push(entry);
      list.sort(function (a, b) { return b.score - a.score; });
      mem.scores = list.slice(0, 10);
      save();
      return mem.scores.indexOf(entry);
    },
    clearScores: function () { mem.scores = []; save(); },
  };
})();
