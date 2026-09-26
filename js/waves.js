(function () {
  var C = NS.C;

  function entry(type, x, y, delay, params) {
    return { type: type, x: x, y: y, delay: delay || 0, arrive: 1.0, params: params || {} };
  }

  var PATTERNS = {
    marching: function (n) {
      var rows = Math.min(2 + Math.floor(n / 2), 4);
      var cols = Math.min(4 + n, 8);
      var out = [];
      var x0 = 90, y0 = 70, gx = 62, gy = 44;
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          out.push(entry('grunt', x0 + c * gx, y0 + r * gy, (r * cols + c) * 0.09, { speedMult: 1 + n * 0.03 }));
        }
      }
      return out;
    },
    swoopers: function (n) {
      var out = [];
      var count = Math.min(4 + n, 10);
      for (var i = 0; i < count; i++) {
        var side = i % 2 === 0 ? -1 : 1;
        out.push(entry('swooper', side < 0 ? -30 : C.W + 30, 60 + (i % 3) * 50, i * 0.5, { dir: -side, delay: i * 0.4 }));
      }
      return out;
    },
    swarm: function (n) {
      var out = [];
      var count = Math.min(7 + n * 2, 18);
      for (var i = 0; i < count; i++) {
        out.push(entry('swarmer', 60 + Math.random() * (C.W - 120), -20 - Math.random() * 120, i * 0.22, {}));
      }
      return out;
    },
    escort: function (n) {
      var out = [];
      var armored = Math.min(1 + Math.floor(n / 4), 3);
      for (var i = 0; i < armored; i++) {
        out.push(entry('armored', C.W * (0.25 + 0.25 * i), 90, i * 1.2, {}));
      }
      var grunts = Math.min(4 + n, 10);
      for (var g = 0; g < grunts; g++) {
        out.push(entry('grunt', 80 + g * ((C.W - 160) / Math.max(1, grunts - 1)), 170 + (g % 2) * 40, 1 + g * 0.15, {}));
      }
      return out;
    },
    snipers: function (n) {
      var out = [];
      var sn = Math.min(2 + Math.floor(n / 5), 4);
      for (var i = 0; i < sn; i++) {
        out.push(entry('sniper', C.W * (0.2 + 0.6 * (sn === 1 ? 0.5 : i / (sn - 1))), 60, i * 0.9, {}));
      }
      var grunts = Math.min(3 + Math.floor(n / 2), 8);
      for (var g = 0; g < grunts; g++) {
        out.push(entry('grunt', 100 + g * ((C.W - 200) / Math.max(1, grunts - 1)), 150, 1.5 + g * 0.2, {}));
      }
      return out;
    },
    carriers: function (n) {
      var out = [];
      var cv = Math.min(1 + Math.floor(n / 6), 2);
      for (var i = 0; i < cv; i++) {
        out.push(entry('carrier', C.W * (0.3 + 0.4 * i), 80, i * 2, {}));
      }
      for (var g = 0; g < 4; g++) {
        out.push(entry('grunt', 120 + g * 200, 160, 1 + g * 0.3, {}));
      }
      return out;
    },
    orbit: function (n) {
      var out = [];
      var count = Math.min(6 + n, 14);
      var cx = C.W / 2, cy = 170;
      for (var i = 0; i < count; i++) {
        var ang = (i / count) * Math.PI * 2;
        out.push(entry('swarmer', cx + Math.cos(ang) * 190, cy + Math.sin(ang) * 90, i * 0.3, { orbit: { cx: cx, cy: cy, r: 190, dir: i % 2 === 0 ? 1 : -1, speed: 1.1 } }));
      }
      return out;
    },
    pincer: function (n) {
      var out = [];
      var per = Math.min(3 + Math.floor(n / 2), 7);
      for (var i = 0; i < per; i++) {
        out.push(entry('grunt', -30, 90 + i * 46, i * 0.35, { dir: 1, speedMult: 1.2 }));
        out.push(entry('grunt', C.W + 30, 90 + i * 46, i * 0.35, { dir: -1, speedMult: 1.2 }));
      }
      if (n >= 4) out.push(entry('swooper', C.W / 2, -30, 2, { dir: 1, delay: 0 }));
      return out;
    },
  };

  var UNLOCK = [
    { wave: 1, patterns: ['marching'] },
    { wave: 2, patterns: ['marching', 'swoopers'] },
    { wave: 3, patterns: ['marching', 'swoopers', 'swarm'] },
    { wave: 4, patterns: ['marching', 'swoopers', 'swarm', 'pincer'] },
    { wave: 5, patterns: ['marching', 'swoopers', 'swarm', 'pincer', 'escort'] },
    { wave: 6, patterns: ['marching', 'swoopers', 'swarm', 'pincer', 'escort', 'snipers'] },
    { wave: 7, patterns: ['marching', 'swoopers', 'swarm', 'pincer', 'escort', 'snipers', 'carriers'] },
    { wave: 8, patterns: ['marching', 'swoopers', 'swarm', 'pincer', 'escort', 'snipers', 'carriers', 'orbit'] },
  ];

  var BOSS_TYPES = ['sentinel', 'hivemother', 'stalker'];

  function availablePatterns(n) {
    var list = ['marching'];
    for (var i = 0; i < UNLOCK.length; i++) {
      if (n >= UNLOCK[i].wave) list = UNLOCK[i].patterns;
    }
    return list;
  }

  function pickPattern(n, lastKey, pressure) {
    var list = availablePatterns(n).filter(function (p) { return p !== lastKey; });
    if (!list.length) list = ['marching'];
    var key = list[Math.floor(Math.random() * list.length)];
    return key;
  }

  function buildWave(n, lastKey) {
    var isBoss = n % C.BOSS_EVERY === 0;
    var entries = [];
    if (isBoss) {
      var bi = Math.floor(n / C.BOSS_EVERY) - 1;
      var bossType = BOSS_TYPES[bi % BOSS_TYPES.length];
      var remix = bi >= BOSS_TYPES.length;
      entries.push({
        type: 'boss', bossType: bossType, x: C.W / 2, y: -80, delay: 1.2,
        arrive: 2.2, params: { remix: remix, hpMult: 1 + bi * 0.35 },
      });
      var esc = Math.min(2 + bi, 5);
      for (var i = 0; i < esc; i++) {
        entries.push(entry('grunt', 120 + i * ((C.W - 240) / Math.max(1, esc - 1)), 120, 3 + i * 0.8, {}));
      }
      return { entries: entries, isBoss: true, bossType: bossType };
    }
    var key = pickPattern(n, lastKey);
    var main = PATTERNS[key](n);
    entries = entries.concat(main);
    if (n >= 3 && Math.random() < 0.35) {
      var second = pickPattern(n, key);
      var extra = PATTERNS[second](Math.max(1, n - 2));
      extra.forEach(function (e) { e.delay += 2.5; });
      entries = entries.concat(extra);
    }
    return { entries: entries, isBoss: false, pattern: key };
  }

  NS.waves = {
    build: buildWave,
    available: availablePatterns,
    BOSS_TYPES: BOSS_TYPES,
  };
})();
